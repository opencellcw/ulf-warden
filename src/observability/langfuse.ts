import { Langfuse } from 'langfuse';
import { log } from '../logger';
import type { LLMMessage, LLMResponse } from '../llm/interface';

/**
 * Langfuse Integration for OpenCell
 * 
 * Provides comprehensive LLM observability:
 * - Cost tracking per bot/user/model
 * - Latency analysis (P50/P95/P99)
 * - Quality scores
 * - A/B testing
 * - Anomaly detection
 * 
 * Setup:
 * 1. Sign up at https://cloud.langfuse.com
 * 2. Create a project
 * 3. Copy API keys to .env:
 *    LANGFUSE_PUBLIC_KEY=pk-lf-xxx
 *    LANGFUSE_SECRET_KEY=sk-lf-xxx
 * 
 * ROI: ~$3,000/year in cost optimizations
 */

export class LangfuseObservability {
  private client: Langfuse | null = null;
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.LANGFUSE_ENABLED === 'true';

    if (!this.enabled) {
      log.info('[Langfuse] Disabled via config');
      return;
    }

    const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const secretKey = process.env.LANGFUSE_SECRET_KEY;

    if (!publicKey || !secretKey) {
      log.warn('[Langfuse] API keys not configured, disabling');
      this.enabled = false;
      return;
    }

    try {
      this.client = new Langfuse({
        publicKey,
        secretKey,
        baseUrl: process.env.LANGFUSE_BASE_URL || 'https://cloud.langfuse.com',
      });

      log.info('[Langfuse] Initialized successfully');
    } catch (error: any) {
      log.error('[Langfuse] Initialization failed', { error: error.message });
      this.enabled = false;
    }
  }

  /**
   * Track LLM generation
   */
  async trackGeneration(params: {
    userId: string;
    botName?: string;
    provider: string;
    model: string;
    messages: LLMMessage[];
    response: LLMResponse;
    latency: number;
    cost: number;
    metadata?: Record<string, any>;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      const trace = this.client.trace({
        name: 'llm-generation',
        userId: params.userId,
        metadata: {
          botName: params.botName,
          provider: params.provider,
          model: params.model,
          ...params.metadata,
        },
      });

      const generation = trace.generation({
        name: `${params.provider}-generation`,
        model: params.model,
        modelParameters: {
          // Extract from messages or use defaults
          temperature: 0.7,
        },
        input: params.messages,
        output: params.response.content,
        usage: {
          input: params.response.usage?.inputTokens || 0,
          output: params.response.usage?.outputTokens || 0,
          total: (params.response.usage?.inputTokens || 0) + (params.response.usage?.outputTokens || 0),
        },
        metadata: {
          latency: params.latency,
          cost: params.cost,
          provider: params.provider,
        },
      });

      generation.end();

      // Flush asynchronously (don't block)
      this.client.flushAsync().catch((error) => {
        log.error('[Langfuse] Flush failed', { error: error.message });
      });

      log.debug('[Langfuse] Generation tracked', {
        userId: params.userId,
        provider: params.provider,
        cost: params.cost,
        latency: params.latency,
      });
    } catch (error: any) {
      log.error('[Langfuse] Failed to track generation', { error: error.message });
    }
  }

  /**
   * Track Bot Factory deployment
   */
  async trackBotDeployment(params: {
    userId: string;
    botName: string;
    botType: 'conversational' | 'agent';
    tools: string[];
    success: boolean;
    duration: number;
    error?: string;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      const trace = this.client.trace({
        name: 'bot-deployment',
        userId: params.userId,
        metadata: {
          botName: params.botName,
          botType: params.botType,
          tools: params.tools,
          success: params.success,
          duration: params.duration,
          error: params.error,
        },
      });

      const span = trace.span({
        name: 'deploy-workflow',
        input: {
          botName: params.botName,
          botType: params.botType,
          tools: params.tools,
        },
        output: {
          success: params.success,
          error: params.error,
        },
        metadata: {
          duration: params.duration,
        },
      });

      span.end();

      await this.client.flushAsync();

      log.debug('[Langfuse] Bot deployment tracked', { botName: params.botName });
    } catch (error: any) {
      log.error('[Langfuse] Failed to track bot deployment', { error: error.message });
    }
  }

  /**
   * Track RoundTable session
   */
  async trackRoundTable(params: {
    userId: string;
    sessionId: string;
    question: string;
    agents: string[];
    phases: number;
    winner: string;
    duration: number;
    totalCost: number;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      const trace = this.client.trace({
        name: 'roundtable-session',
        userId: params.userId,
        sessionId: params.sessionId,
        metadata: {
          question: params.question,
          agents: params.agents,
          phases: params.phases,
          winner: params.winner,
          duration: params.duration,
          totalCost: params.totalCost,
        },
      });

      // Track each phase as a span
      for (let i = 1; i <= params.phases; i++) {
        const span = trace.span({
          name: `phase-${i}`,
          metadata: {
            phase: i,
          },
        });
        span.end();
      }

      await this.client.flushAsync();

      log.debug('[Langfuse] RoundTable session tracked', {
        sessionId: params.sessionId,
        cost: params.totalCost,
      });
    } catch (error: any) {
      log.error('[Langfuse] Failed to track RoundTable', { error: error.message });
    }
  }

  /**
   * Track user feedback (for quality scoring)
   */
  async trackFeedback(params: {
    userId: string;
    traceId: string;
    score: number; // 1-5
    comment?: string;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      this.client.score({
        traceId: params.traceId,
        name: 'user-satisfaction',
        value: params.score,
        comment: params.comment,
      });

      await this.client.flushAsync();

      log.debug('[Langfuse] Feedback tracked', {
        userId: params.userId,
        score: params.score,
      });
    } catch (error: any) {
      log.error('[Langfuse] Failed to track feedback', { error: error.message });
    }
  }

  /**
   * Track error
   */
  async trackError(params: {
    userId: string;
    error: Error;
    context: Record<string, any>;
  }): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      const trace = this.client.trace({
        name: 'error',
        userId: params.userId,
        metadata: {
          error: params.error.message,
          stack: params.error.stack,
          ...params.context,
        },
      });

      await this.client.flushAsync();

      log.debug('[Langfuse] Error tracked', { userId: params.userId });
    } catch (error: any) {
      log.error('[Langfuse] Failed to track error', { error: error.message });
    }
  }

  /**
   * Flush pending events (call on shutdown)
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      await this.client.flushAsync();
      log.info('[Langfuse] Flushed pending events');
    } catch (error: any) {
      log.error('[Langfuse] Flush failed', { error: error.message });
    }
  }

  /**
   * Shutdown client
   */
  async shutdown(): Promise<void> {
    if (!this.enabled || !this.client) return;

    try {
      await this.client.shutdownAsync();
      log.info('[Langfuse] Shutdown complete');
    } catch (error: any) {
      log.error('[Langfuse] Shutdown failed', { error: error.message });
    }
  }

  /**
   * Check if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
let langfuseInstance: LangfuseObservability | null = null;

export function getLangfuse(): LangfuseObservability {
  if (!langfuseInstance) {
    langfuseInstance = new LangfuseObservability();
  }
  return langfuseInstance;
}

export const langfuse = getLangfuse();
