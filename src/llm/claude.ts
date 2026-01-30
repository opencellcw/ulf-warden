import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './interface';
import { log } from '../logger';

/**
 * Claude API Provider
 * Wraps Anthropic SDK to match LLMProvider interface
 */
export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private client: Anthropic;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY
    });
    this.model = model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  }

  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Convert LLMMessage to Anthropic format
      const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

      // Extract system messages
      const systemMessages = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');

      const systemPrompt = options?.systemPrompt || systemMessages || undefined;

      log.debug('[Claude] Generating response', {
        messageCount: anthropicMessages.length,
        maxTokens: options?.maxTokens || 4096
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        system: systemPrompt,
        messages: anthropicMessages
      });

      const content = response.content
        .filter(block => block.type === 'text')
        .map(block => (block as any).text)
        .join('\n\n');

      const processingTime = Date.now() - startTime;

      log.info('[Claude] Generated response', {
        model: this.model,
        processingTime: `${processingTime}ms`,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      });

      return {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error: any) {
      log.error('[Claude] Generation failed', { error: error.message });
      throw error;
    }
  }

  async generateWithTools(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Convert LLMMessage to Anthropic format
      const anthropicMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        }));

      // Extract system messages
      const systemMessages = messages
        .filter(m => m.role === 'system')
        .map(m => m.content)
        .join('\n\n');

      const systemPrompt = options?.systemPrompt || systemMessages || undefined;

      log.debug('[Claude] Generating response with tools', {
        messageCount: anthropicMessages.length,
        toolCount: tools.length,
        maxTokens: options?.maxTokens || 4096
      });

      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature,
        system: systemPrompt,
        messages: anthropicMessages,
        tools
      });

      // For tool use, return the full response including tool calls
      // The agent loop will handle tool execution
      const content = JSON.stringify(response.content);

      const processingTime = Date.now() - startTime;

      log.info('[Claude] Generated response with tools', {
        model: this.model,
        stopReason: response.stop_reason,
        processingTime: `${processingTime}ms`,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      });

      return {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };
    } catch (error: any) {
      log.error('[Claude] Tool generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get the underlying Anthropic client for direct API access
   */
  getClient(): Anthropic {
    return this.client;
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.model;
  }
}

// Singleton instance
let claudeProvider: ClaudeProvider | null = null;

export function getClaudeProvider(): ClaudeProvider {
  if (!claudeProvider) {
    claudeProvider = new ClaudeProvider();
  }
  return claudeProvider;
}
