/**
 * AgentOps Integration
 * 
 * Provides observability, cost tracking, and session management for OpenCell bots
 * using AgentOps (https://github.com/AgentOps-AI/agentops)
 */

import { log } from '../logger';

interface AgentOpsConfig {
  apiKey?: string;
  endpoint?: string;
  enabled: boolean;
  tags?: string[];
}

interface SessionOptions {
  botName: string;
  botType: 'conversational' | 'agent';
  userId?: string;
  platform?: 'discord' | 'slack' | 'telegram' | 'whatsapp';
  tags?: string[];
}

interface ToolExecutionEvent {
  tool: string;
  args: any;
  result?: any;
  error?: string;
  duration: number;
  timestamp: number;
}

interface CostEvent {
  provider: 'claude' | 'moonshot' | 'openai';
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
}

interface ErrorEvent {
  error: string;
  stack?: string;
  context?: any;
  timestamp: number;
}

/**
 * AgentOps Client for OpenCell
 */
class AgentOpsClient {
  private config: AgentOpsConfig;
  private sessions: Map<string, any> = new Map();
  private agentops: any = null;

  constructor() {
    this.config = {
      apiKey: process.env.AGENTOPS_API_KEY,
      endpoint: process.env.AGENTOPS_ENDPOINT || 'https://api.agentops.ai',
      enabled: process.env.AGENTOPS_ENABLED === 'true',
      tags: process.env.AGENTOPS_TAGS?.split(',') || ['opencell']
    };

    if (this.config.enabled) {
      this.initialize();
    } else {
      log.info('[AgentOps] Disabled - Set AGENTOPS_ENABLED=true to enable');
    }
  }

  private async initialize() {
    try {
      // Dynamic import to avoid errors if not configured
      const agentopsModule = await import('agentops');
      const AgentOpsConstructor = (agentopsModule as any).default || agentopsModule;
      
      this.agentops = new AgentOpsConstructor({
        apiKey: this.config.apiKey,
        endpoint: this.config.endpoint,
        tags: this.config.tags
      });

      if (this.agentops.init) {
        await this.agentops.init();
      }

      log.info('[AgentOps] Initialized successfully', {
        endpoint: this.config.endpoint,
        tags: this.config.tags
      });
    } catch (error: any) {
      log.error('[AgentOps] Initialization failed', {
        error: error.message
      });
      this.config.enabled = false;
    }
  }

  /**
   * Start a new session for a bot
   */
  async startSession(options: SessionOptions): Promise<string> {
    if (!this.config.enabled || !this.agentops) {
      return '';
    }

    try {
      const sessionId = `${options.botName}-${Date.now()}`;
      
      const session = await this.agentops.startSession({
        session_id: sessionId,
        tags: [
          ...this.config.tags!,
          options.botType,
          options.platform || 'unknown',
          ...(options.tags || [])
        ],
        metadata: {
          botName: options.botName,
          botType: options.botType,
          platform: options.platform,
          userId: options.userId,
          startTime: new Date().toISOString()
        }
      });

      this.sessions.set(sessionId, session);

      log.debug('[AgentOps] Session started', {
        sessionId,
        botName: options.botName
      });

      return sessionId;
    } catch (error: any) {
      log.error('[AgentOps] Failed to start session', {
        error: error.message,
        botName: options.botName
      });
      return '';
    }
  }

  /**
   * Track tool execution
   */
  async trackToolExecution(sessionId: string, event: ToolExecutionEvent): Promise<void> {
    if (!this.config.enabled || !this.agentops) {
      return;
    }

    try {
      await this.agentops.record({
        session_id: sessionId,
        event_type: 'tool_execution',
        timestamp: event.timestamp,
        data: {
          tool: event.tool,
          args: event.args,
          result: event.result,
          error: event.error,
          duration_ms: event.duration,
          success: !event.error
        }
      });

      log.debug('[AgentOps] Tool execution tracked', {
        sessionId,
        tool: event.tool,
        duration: event.duration
      });
    } catch (error: any) {
      log.error('[AgentOps] Failed to track tool execution', {
        error: error.message
      });
    }
  }

  /**
   * Track LLM call cost
   */
  async trackCost(sessionId: string, event: CostEvent): Promise<void> {
    if (!this.config.enabled || !this.agentops) {
      return;
    }

    try {
      await this.agentops.record({
        session_id: sessionId,
        event_type: 'llm_call',
        timestamp: event.timestamp,
        data: {
          provider: event.provider,
          model: event.model,
          input_tokens: event.inputTokens,
          output_tokens: event.outputTokens,
          total_tokens: event.inputTokens + event.outputTokens,
          cost_usd: event.cost
        }
      });

      log.debug('[AgentOps] Cost tracked', {
        sessionId,
        provider: event.provider,
        cost: event.cost
      });
    } catch (error: any) {
      log.error('[AgentOps] Failed to track cost', {
        error: error.message
      });
    }
  }

  /**
   * Track error
   */
  async trackError(sessionId: string, event: ErrorEvent): Promise<void> {
    if (!this.config.enabled || !this.agentops) {
      return;
    }

    try {
      await this.agentops.record({
        session_id: sessionId,
        event_type: 'error',
        timestamp: event.timestamp,
        data: {
          error: event.error,
          stack: event.stack,
          context: event.context
        }
      });

      log.debug('[AgentOps] Error tracked', {
        sessionId,
        error: event.error
      });
    } catch (error: any) {
      log.error('[AgentOps] Failed to track error', {
        error: error.message
      });
    }
  }

  /**
   * Track custom event
   */
  async trackEvent(
    sessionId: string, 
    eventType: string, 
    data: any
  ): Promise<void> {
    if (!this.config.enabled || !this.agentops) {
      return;
    }

    try {
      await this.agentops.record({
        session_id: sessionId,
        event_type: eventType,
        timestamp: Date.now(),
        data
      });

      log.debug('[AgentOps] Custom event tracked', {
        sessionId,
        eventType
      });
    } catch (error: any) {
      log.error('[AgentOps] Failed to track event', {
        error: error.message
      });
    }
  }

  /**
   * End session
   */
  async endSession(
    sessionId: string, 
    options?: { success?: boolean; metadata?: any }
  ): Promise<void> {
    if (!this.config.enabled || !this.agentops || !sessionId) {
      return;
    }

    try {
      await this.agentops.endSession({
        session_id: sessionId,
        end_state: options?.success !== false ? 'Success' : 'Fail',
        metadata: {
          ...options?.metadata,
          endTime: new Date().toISOString()
        }
      });

      this.sessions.delete(sessionId);

      log.debug('[AgentOps] Session ended', {
        sessionId,
        success: options?.success !== false
      });
    } catch (error: any) {
      log.error('[AgentOps] Failed to end session', {
        error: error.message
      });
    }
  }

  /**
   * Get session status
   */
  getSession(sessionId: string): any {
    return this.sessions.get(sessionId);
  }

  /**
   * Check if AgentOps is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }
}

// Singleton instance
let agentOpsInstance: AgentOpsClient | null = null;

/**
 * Get AgentOps client instance
 */
export function getAgentOps(): AgentOpsClient {
  if (!agentOpsInstance) {
    agentOpsInstance = new AgentOpsClient();
  }
  return agentOpsInstance;
}

// Export types
export type {
  AgentOpsConfig,
  SessionOptions,
  ToolExecutionEvent,
  CostEvent,
  ErrorEvent
};
