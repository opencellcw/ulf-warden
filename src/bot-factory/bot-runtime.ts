import { LLMProvider, LLMMessage } from '../llm/interface';
import { ClaudeProvider } from '../llm/claude';
import { PiProvider, createPiProvider } from '../llm/pi-provider';
import { BotConfig, BotTool } from './types';
import { log } from '../logger';
import { formatPersonaResponse, getPersonaTag, getPersonaHeader } from './persona-formatter';
import { getAgentOps } from '../observability';

/**
 * Bot Runtime Manager
 * Handles bot message processing and provider selection
 */
export class BotRuntime {
  private provider: LLMProvider;
  private config: BotConfig;
  private agentOps = getAgentOps();
  private currentSessionId: string = '';

  constructor(config: BotConfig) {
    this.config = config;

    // Choose provider based on bot type
    if (config.type === 'agent') {
      log.info('[BotRuntime] Initializing agent bot with Pi', {
        botId: config.name,
        allowedTools: config.allowedTools
      });

      this.provider = createPiProvider(
        this.getModelName(config.model),
        config.allowedTools || [],
        config.name
      );
    } else {
      log.info('[BotRuntime] Initializing conversational bot with Claude API', {
        botId: config.name,
        model: config.model
      });

      this.provider = new ClaudeProvider(
        undefined,
        this.getModelName(config.model)
      );
    }
  }

  /**
   * Start AgentOps session
   */
  async startSession(userId?: string, platform?: 'discord' | 'slack' | 'telegram' | 'whatsapp'): Promise<void> {
    if (this.agentOps.isEnabled()) {
      this.currentSessionId = await this.agentOps.startSession({
        botName: this.config.name,
        botType: this.config.type,
        userId,
        platform
      });
    }
  }

  /**
   * End AgentOps session
   */
  async endSession(success: boolean = true): Promise<void> {
    if (this.agentOps.isEnabled() && this.currentSessionId) {
      await this.agentOps.endSession(this.currentSessionId, { success });
      this.currentSessionId = '';
    }
  }

  /**
   * Process a message and generate response
   */
  async processMessage(
    userMessage: string,
    conversationHistory: LLMMessage[] = [],
    options?: {
      includePersonaHeader?: boolean; // Whether to add persona badge header
      useEmbed?: boolean; // Whether response will use Discord embed
    }
  ): Promise<string> {
    const startTime = Date.now();
    const includeHeader = options?.includePersonaHeader ?? true; // Default: true
    const useEmbed = options?.useEmbed ?? false;

    try {
      // Build message array
      const messages: LLMMessage[] = [
        { role: 'system', content: this.config.personality },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      log.debug('[BotRuntime] Processing message', {
        botId: this.config.name,
        type: this.config.type,
        messageCount: messages.length,
        includeHeader
      });

      // Generate response using appropriate provider
      const response = await this.provider.generate(messages);

      const processingTime = Date.now() - startTime;

      // Track with AgentOps
      if (this.agentOps.isEnabled() && this.currentSessionId) {
        await this.agentOps.trackToolExecution(this.currentSessionId, {
          tool: 'message_processing',
          args: { messageLength: userMessage.length },
          result: { responseLength: response.content.length },
          duration: processingTime,
          timestamp: Date.now()
        });

        // Track cost if available
        if (response.usage) {
          const cost = this.estimateCost(
            response.usage.inputTokens || 0,
            response.usage.outputTokens || 0
          );
          
          await this.agentOps.trackCost(this.currentSessionId, {
            provider: this.config.type === 'agent' ? 'claude' : 'claude',
            model: this.getModelName(this.config.model),
            inputTokens: response.usage.inputTokens || 0,
            outputTokens: response.usage.outputTokens || 0,
            cost,
            timestamp: Date.now()
          });
        }
      }

      log.info('[BotRuntime] Message processed', {
        botId: this.config.name,
        type: this.config.type,
        processingTime: `${processingTime}ms`,
        responseLength: response.content.length
      });

      // Format response with persona header if enabled
      if (includeHeader) {
        const botName = this.config.name.replace('bot-', ''); // Remove 'bot-' prefix if present
        return formatPersonaResponse(botName, this.config, response.content, useEmbed);
      }

      return response.content;
    } catch (error: any) {
      log.error('[BotRuntime] Message processing failed', {
        botId: this.config.name,
        error: error.message
      });

      // Track error with AgentOps
      if (this.agentOps.isEnabled() && this.currentSessionId) {
        await this.agentOps.trackError(this.currentSessionId, {
          error: error.message,
          stack: error.stack,
          context: { botId: this.config.name, type: this.config.type },
          timestamp: Date.now()
        });
      }

      // Return user-friendly error with persona tag
      const botName = this.config.name.replace('bot-', '');
      const personaTag = getPersonaTag(botName, this.config);
      
      if (this.config.type === 'agent') {
        return `${personaTag}\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Agent error: ${error.message}\n\nThe bot may need permissions or the tool may be unavailable.`;
      } else {
        return `${personaTag}\n━━━━━━━━━━━━━━━━━━━━━━\n⚠️ Error: ${error.message}\n\nPlease try again later.`;
      }
    }
  }

  /**
   * Estimate cost based on token usage and model
   */
  private estimateCost(inputTokens: number, outputTokens: number): number {
    const model = this.getModelName(this.config.model);
    
    // Cost per million tokens (USD)
    const costs: Record<string, { input: number; output: number }> = {
      'claude-opus-4-20250514': { input: 15, output: 75 },
      'claude-sonnet-4-20250514': { input: 3, output: 15 },
      'claude-haiku-4-20250514': { input: 0.25, output: 1.25 }
    };

    const modelCost = costs[model] || costs['claude-sonnet-4-20250514'];
    
    return (
      (inputTokens / 1_000_000) * modelCost.input +
      (outputTokens / 1_000_000) * modelCost.output
    );
  }

  /**
   * Validate tool usage for agent bots
   */
  canUseTool(tool: BotTool): boolean {
    if (this.config.type !== 'agent') {
      return false;
    }

    return this.config.allowedTools?.includes(tool) ?? false;
  }

  /**
   * Get bot configuration
   */
  getConfig(): BotConfig {
    return this.config;
  }

  /**
   * Get provider type
   */
  getProviderType(): 'claude' | 'pi' {
    return this.config.type === 'agent' ? 'pi' : 'claude';
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.provider instanceof PiProvider) {
      await this.provider.cleanup();
    }
  }

  /**
   * Convert model shortname to full model identifier
   */
  private getModelName(model: 'sonnet' | 'opus' | 'haiku'): string {
    const modelMap = {
      sonnet: 'claude-opus-4-20250514',
      opus: 'claude-opus-4-20250514',
      haiku: 'claude-3-5-haiku-20241022'
    };

    return modelMap[model];
  }
}

/**
 * Bot Runtime Registry
 * Keeps track of active bot runtimes
 */
class BotRuntimeRegistry {
  private runtimes: Map<string, BotRuntime> = new Map();

  /**
   * Get or create runtime for a bot
   */
  async getRuntime(botId: string, config: BotConfig): Promise<BotRuntime> {
    if (!this.runtimes.has(botId)) {
      const runtime = new BotRuntime(config);
      this.runtimes.set(botId, runtime);
      log.info('[BotRuntimeRegistry] Created new runtime', { botId, type: config.type });
    }

    return this.runtimes.get(botId)!;
  }

  /**
   * Remove runtime (cleanup on bot deletion)
   */
  async removeRuntime(botId: string): Promise<void> {
    const runtime = this.runtimes.get(botId);
    if (runtime) {
      await runtime.cleanup();
      this.runtimes.delete(botId);
      log.info('[BotRuntimeRegistry] Removed runtime', { botId });
    }
  }

  /**
   * Get all active runtimes
   */
  getActiveRuntimes(): string[] {
    return Array.from(this.runtimes.keys());
  }

  /**
   * Cleanup all runtimes
   */
  async cleanupAll(): Promise<void> {
    log.info('[BotRuntimeRegistry] Cleaning up all runtimes', {
      count: this.runtimes.size
    });

    for (const [botId, runtime] of this.runtimes.entries()) {
      await runtime.cleanup();
    }

    this.runtimes.clear();
  }
}

// Singleton instance
export const botRuntimeRegistry = new BotRuntimeRegistry();
