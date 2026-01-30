import { LLMProvider, LLMMessage, LLMResponse, LLMOptions, TaskType, ModelStrategy } from './interface';
import { getClaudeProvider } from './claude';
import { getLocalProvider } from './local';
import { getOllamaProvider } from './ollama';
import { log } from '../logger';
import { config } from '../config';

/**
 * Intelligent router between Claude API, local model, and Ollama
 *
 * Routing strategies:
 * 1. CLAUDE_ONLY - Always use Claude (default)
 * 2. LOCAL_ONLY - Always use local model (or Ollama if enabled)
 * 3. HYBRID - Route based on task complexity
 * 4. LOCAL_FALLBACK - Try local/Ollama first, fallback to Claude
 */
export class LLMRouter {
  private claudeProvider: LLMProvider;
  private localProvider: LLMProvider;
  private ollamaProvider: LLMProvider;
  private strategy: ModelStrategy;
  private localAvailable: boolean = false;
  private ollamaAvailable: boolean = false;

  constructor() {
    this.claudeProvider = getClaudeProvider();
    this.localProvider = getLocalProvider();
    this.ollamaProvider = getOllamaProvider();

    // Get strategy from config
    const strategyStr = process.env.LLM_STRATEGY || config.get('LLM_STRATEGY', 'claude_only');
    this.strategy = this.parseStrategy(strategyStr);

    // Check availability
    this.checkLocalAvailability();
    this.checkOllamaAvailability();
  }

  private async checkOllamaAvailability(): Promise<void> {
    this.ollamaAvailable = await this.ollamaProvider.isAvailable();
    log.info('[Router] Ollama availability checked', {
      available: this.ollamaAvailable
    });
  }

  private parseStrategy(str: string): ModelStrategy {
    switch (str.toLowerCase()) {
      case 'local_only':
        return ModelStrategy.LOCAL_ONLY;
      case 'hybrid':
        return ModelStrategy.HYBRID;
      case 'local_fallback':
        return ModelStrategy.LOCAL_FALLBACK;
      default:
        return ModelStrategy.CLAUDE_ONLY;
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
      localAvailable: this.localAvailable
    });

    // If tools are required, must use Claude
    if (hasTools) {
      log.info('[Router] Using Claude (tools required)');
      return this.claudeProvider;
    }

    switch (this.strategy) {
      case ModelStrategy.CLAUDE_ONLY:
        log.info('[Router] Using Claude (strategy: claude_only)');
        return this.claudeProvider;

      case ModelStrategy.LOCAL_ONLY:
        // Prefer Ollama if available, then transformers.js
        if (this.ollamaAvailable) {
          log.info('[Router] Using Ollama (strategy: local_only)');
          return this.ollamaProvider;
        }
        if (this.localAvailable) {
          log.info('[Router] Using local model (strategy: local_only)');
          return this.localProvider;
        }
        log.warn('[Router] No local model available, falling back to Claude');
        return this.claudeProvider;

      case ModelStrategy.HYBRID:
        return this.selectProviderHybrid(taskType);

      case ModelStrategy.LOCAL_FALLBACK:
        // Prefer Ollama, then transformers.js, then Claude
        if (this.ollamaAvailable) {
          log.info('[Router] Using Ollama (strategy: local_fallback)');
          return this.ollamaProvider;
        }
        if (this.localAvailable) {
          log.info('[Router] Using local model (strategy: local_fallback)');
          return this.localProvider;
        }
        log.info('[Router] Using Claude (no local model available)');
        return this.claudeProvider;

      default:
        return this.claudeProvider;
    }
  }

  /**
   * Hybrid strategy: route based on task complexity
   * Priority: Ollama > Local (transformers.js) > Claude
   */
  private selectProviderHybrid(taskType: TaskType): LLMProvider {
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

    // Complex tasks use Claude
    log.info('[Router] Using Claude (hybrid: complex task)', { taskType });
    return this.claudeProvider;
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
   * Generate with tools (always uses Claude)
   */
  async generateWithTools(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse> {
    log.info('[Router] Using Claude for tool-based generation');
    return await this.claudeProvider.generateWithTools!(messages, tools, options);
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
    claude: { available: boolean; model: string };
    local: { available: boolean; model?: string };
    ollama: { available: boolean; model?: string };
    strategy: ModelStrategy;
  }> {
    const claudeAvailable = await this.claudeProvider.isAvailable();

    // Refresh availability
    await this.checkLocalAvailability();
    await this.checkOllamaAvailability();

    return {
      claude: {
        available: claudeAvailable,
        model: (this.claudeProvider as any).getModel()
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
}

// Singleton instance
let router: LLMRouter | null = null;

export function getRouter(): LLMRouter {
  if (!router) {
    router = new LLMRouter();
  }
  return router;
}
