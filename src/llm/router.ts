import { LLMProvider, LLMMessage, LLMResponse, LLMOptions, TaskType, ModelStrategy } from './interface';
import { getClaudeProvider } from './claude';
import { getLocalProvider } from './local';
import { getOllamaProvider } from './ollama';
import { getMoonshotProvider } from './moonshot-provider';
import { log } from '../logger';
import { config } from '../config';

/**
 * Intelligent router between Claude API, Moonshot AI, local model, and Ollama
 *
 * Routing strategies:
 * 1. CLAUDE_ONLY - Always use Claude (default)
 * 2. MOONSHOT_ONLY - Always use Moonshot AI (Kimi)
 * 3. LOCAL_ONLY - Always use local model (or Ollama if enabled)
 * 4. HYBRID - Route based on task complexity
 * 5. LOCAL_FALLBACK - Try local/Ollama first, fallback to Claude/Moonshot
 */
export class LLMRouter {
  private claudeProvider: LLMProvider;
  private moonshotProvider: LLMProvider;
  private localProvider: LLMProvider;
  private ollamaProvider: LLMProvider;
  private strategy: ModelStrategy;
  private primaryProvider: 'claude' | 'moonshot'; // NEW: Choose primary provider
  private localAvailable: boolean = false;
  private ollamaAvailable: boolean = false;
  private moonshotAvailable: boolean = false;

  constructor() {
    this.claudeProvider = getClaudeProvider();
    this.moonshotProvider = getMoonshotProvider();
    this.localProvider = getLocalProvider();
    this.ollamaProvider = getOllamaProvider();

    // Get primary provider from env (claude or moonshot)
    this.primaryProvider = (process.env.LLM_PROVIDER || 'claude') as 'claude' | 'moonshot';

    // Get strategy from config
    const strategyStr = process.env.LLM_STRATEGY || config.get('LLM_STRATEGY', 'claude_only');
    this.strategy = this.parseStrategy(strategyStr);

    // Check availability
    this.checkLocalAvailability();
    this.checkOllamaAvailability();
    this.checkMoonshotAvailability();

    log.info('[Router] Initialized', {
      primaryProvider: this.primaryProvider,
      strategy: this.strategy
    });
  }

  private async checkOllamaAvailability(): Promise<void> {
    this.ollamaAvailable = await this.ollamaProvider.isAvailable();
    log.info('[Router] Ollama availability checked', {
      available: this.ollamaAvailable
    });
  }

  private async checkMoonshotAvailability(): Promise<void> {
    this.moonshotAvailable = await this.moonshotProvider.isAvailable();
    log.info('[Router] Moonshot availability checked', {
      available: this.moonshotAvailable
    });
  }

  private parseStrategy(str: string): ModelStrategy {
    switch (str.toLowerCase()) {
      case 'moonshot_only':
      case 'local_only':
        return ModelStrategy.LOCAL_ONLY; // Repurpose for non-Claude providers
      case 'hybrid':
        return ModelStrategy.HYBRID;
      case 'local_fallback':
        return ModelStrategy.LOCAL_FALLBACK;
      default:
        return ModelStrategy.CLAUDE_ONLY; // Will use primary provider (claude or moonshot)
    }
  }

  private async checkLocalAvailability(): Promise<void> {
    this.localAvailable = await this.localProvider.isAvailable();
    log.info('[Router] Local model availability checked', {
      available: this.localAvailable
    });
  }

  /**
   * Classify task type based on messages and options
   */
  private classifyTask(messages: LLMMessage[], options?: LLMOptions): TaskType {
    // If tools are present, it's a tool use task
    if (options?.tools && options.tools.length > 0) {
      return TaskType.TOOL_USE;
    }

    // Get the last user message
    const lastUserMessage = messages
      .filter(m => m.role === 'user')
      .pop();

    if (!lastUserMessage) {
      return TaskType.UNKNOWN;
    }

    const content = lastUserMessage.content.toLowerCase();

    // Code generation patterns
    const codePatterns = [
      'write code', 'create a function', 'implement', 'debug',
      'sobe', 'criar', 'instala', 'deploy', 'roda', 'executa',
      'create', 'install', 'run', 'execute', 'start', 'setup'
    ];
    if (codePatterns.some(p => content.includes(p))) {
      return TaskType.CODE_GENERATION;
    }

    // Complex reasoning patterns
    const reasoningPatterns = [
      'explain', 'analyze', 'compare', 'why', 'how',
      'what is the difference', 'pros and cons'
    ];
    if (reasoningPatterns.some(p => content.includes(p))) {
      return TaskType.COMPLEX_REASONING;
    }

    // Simple chat patterns
    const chatPatterns = [
      'hi', 'hello', 'hey', 'oi', 'olá',
      'thanks', 'thank you', 'obrigado'
    ];
    if (chatPatterns.some(p => content.includes(p))) {
      return TaskType.SIMPLE_CHAT;
    }

    // Summarization patterns
    if (content.includes('summarize') || content.includes('resumo')) {
      return TaskType.SUMMARIZATION;
    }

    // Translation patterns
    if (content.includes('translate') || content.includes('traduz')) {
      return TaskType.TRANSLATION;
    }

    // Default to simple chat if message is short
    if (content.length < 200) {
      return TaskType.SIMPLE_CHAT;
    }

    return TaskType.UNKNOWN;
  }

  /**
   * Determine which provider to use based on strategy and task
   */
  private selectProvider(taskType: TaskType, hasTools: boolean): LLMProvider {
    log.debug('[Router] Selecting provider', {
      strategy: this.strategy,
      taskType,
      hasTools,
      primaryProvider: this.primaryProvider,
      localAvailable: this.localAvailable,
      moonshotAvailable: this.moonshotAvailable
    });

    // Get the primary provider (Claude or Moonshot)
    const primaryProvider = this.getPrimaryProvider();

    // If tools are required, use primary provider (Claude or Moonshot both support tools)
    if (hasTools) {
      log.info(`[Router] Using ${primaryProvider.name} (tools required)`);
      return primaryProvider;
    }

    switch (this.strategy) {
      case ModelStrategy.CLAUDE_ONLY:
        log.info(`[Router] Using ${primaryProvider.name} (strategy: primary_only)`);
        return primaryProvider;

      case ModelStrategy.LOCAL_ONLY:
        // Prefer Moonshot if set as primary and available
        if (this.primaryProvider === 'moonshot' && this.moonshotAvailable) {
          log.info('[Router] Using Moonshot (strategy: local_only)');
          return this.moonshotProvider;
        }
        // Prefer Ollama if available, then transformers.js
        if (this.ollamaAvailable) {
          log.info('[Router] Using Ollama (strategy: local_only)');
          return this.ollamaProvider;
        }
        if (this.localAvailable) {
          log.info('[Router] Using local model (strategy: local_only)');
          return this.localProvider;
        }
        log.warn(`[Router] No local model available, falling back to ${primaryProvider.name}`);
        return primaryProvider;

      case ModelStrategy.HYBRID:
        return this.selectProviderHybrid(taskType);

      case ModelStrategy.LOCAL_FALLBACK:
        // Prefer Ollama, then transformers.js, then primary provider
        if (this.ollamaAvailable) {
          log.info('[Router] Using Ollama (strategy: local_fallback)');
          return this.ollamaProvider;
        }
        if (this.localAvailable) {
          log.info('[Router] Using local model (strategy: local_fallback)');
          return this.localProvider;
        }
        log.info(`[Router] Using ${primaryProvider.name} (no local model available)`);
        return primaryProvider;

      default:
        return primaryProvider;
    }
  }

  /**
   * Get primary provider based on configuration
   */
  private getPrimaryProvider(): LLMProvider {
    if (this.primaryProvider === 'moonshot' && this.moonshotAvailable) {
      return this.moonshotProvider;
    }
    // Fallback to Claude if Moonshot not available
    if (this.primaryProvider === 'moonshot' && !this.moonshotAvailable) {
      log.warn('[Router] Moonshot not available, falling back to Claude');
    }
    return this.claudeProvider;
  }

  /**
   * Hybrid strategy: route based on task complexity
   * Priority: Ollama > Local (transformers.js) > Primary Provider (Claude/Moonshot)
   */
  private selectProviderHybrid(taskType: TaskType): LLMProvider {
    const primaryProvider = this.getPrimaryProvider();
    
    // Simple tasks can use local model if available
    const simpleTasksForLocal = [
      TaskType.SIMPLE_CHAT,
      TaskType.TEXT_CLASSIFICATION,
      TaskType.SUMMARIZATION
    ];

    if (simpleTasksForLocal.includes(taskType)) {
      // Prefer Ollama for simple tasks (better quality + uncensored)
      if (this.ollamaAvailable) {
        log.info('[Router] Using Ollama (hybrid: simple task)', { taskType });
        return this.ollamaProvider;
      }
      // Fallback to transformers.js
      if (this.localAvailable) {
        log.info('[Router] Using local model (hybrid: simple task)', { taskType });
        return this.localProvider;
      }
    }

    // Complex tasks use primary provider (Claude or Moonshot)
    log.info(`[Router] Using ${primaryProvider.name} (hybrid: complex task)`, { taskType });
    return primaryProvider;
  }

  /**
   * Generate response with intelligent routing
   */
  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    // Classify task
    const taskType = this.classifyTask(messages, options);
    const hasTools = !!(options?.tools && options.tools.length > 0);

    // Select provider
    const provider = this.selectProvider(taskType, hasTools);

    try {
      // Generate with selected provider
      const response = await provider.generate(messages, options);

      const totalTime = Date.now() - startTime;
      log.info('[Router] Generation complete', {
        provider: provider.name,
        taskType,
        totalTime: `${totalTime}ms`
      });

      return response;
    } catch (error: any) {
      log.error('[Router] Generation failed with primary provider', {
        provider: provider.name,
        error: error.message
      });

      // Fallback logic
      if (this.strategy === ModelStrategy.LOCAL_FALLBACK && provider.name === 'local-llm') {
        log.warn('[Router] Falling back to Claude after local failure');
        return await this.claudeProvider.generate(messages, options);
      }

      throw error;
    }
  }

  /**
   * Generate with tools (uses primary provider: Claude or Moonshot)
   */
  async generateWithTools(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse> {
    const primaryProvider = this.getPrimaryProvider();
    log.info(`[Router] Using ${primaryProvider.name} for tool-based generation`);
    
    if (primaryProvider.generateWithTools) {
      return await primaryProvider.generateWithTools(messages, tools, options);
    } else {
      // Fallback: use generate with tools in options
      return await primaryProvider.generate(messages, { ...options, tools });
    }
  }

  /**
   * Get current strategy
   */
  getStrategy(): ModelStrategy {
    return this.strategy;
  }

  /**
   * Set strategy dynamically
   */
  setStrategy(strategy: ModelStrategy): void {
    this.strategy = strategy;
    log.info('[Router] Strategy changed', { strategy });
  }

  /**
   * Get status of all providers
   */
  async getStatus(): Promise<{
    primaryProvider: 'claude' | 'moonshot';
    claude: { available: boolean; model: string };
    moonshot: { available: boolean; model: string };
    local: { available: boolean; model?: string };
    ollama: { available: boolean; model?: string };
    strategy: ModelStrategy;
  }> {
    const claudeAvailable = await this.claudeProvider.isAvailable();

    // Refresh availability
    await this.checkLocalAvailability();
    await this.checkOllamaAvailability();
    await this.checkMoonshotAvailability();

    return {
      primaryProvider: this.primaryProvider,
      claude: {
        available: claudeAvailable,
        model: (this.claudeProvider as any).getModel()
      },
      moonshot: {
        available: this.moonshotAvailable,
        model: (this.moonshotProvider as any).getModel()
      },
      local: {
        available: this.localAvailable,
        model: this.localAvailable ? (this.localProvider as any).getModelInfo().name : undefined
      },
      ollama: {
        available: this.ollamaAvailable,
        model: this.ollamaAvailable ? (this.ollamaProvider as any).getModelInfo().name : undefined
      },
      strategy: this.strategy
    };
  }

  /**
   * Get the Claude provider for direct access (backward compatibility)
   */
  getClaudeProvider(): LLMProvider {
    return this.claudeProvider;
  }

  /**
   * Get the Moonshot provider for direct access
   */
  getMoonshotProvider(): LLMProvider {
    return this.moonshotProvider;
  }

  /**
   * Get the local provider for direct access
   */
  getLocalProvider(): LLMProvider {
    return this.localProvider;
  }

  /**
   * Get the Ollama provider for direct access
   */
  getOllamaProvider(): LLMProvider {
    return this.ollamaProvider;
  }

  /**
   * Get the active primary provider
   */
  getActivePrimaryProvider(): LLMProvider {
    return this.getPrimaryProvider();
  }
}

// Singleton instance
let router: LLMRouter | null = null;

export function getRouter(): LLMRouter {
  if (!router) {
    router = new LLMRouter();
  }
  return router;
}
