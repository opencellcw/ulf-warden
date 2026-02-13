import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '../utils/env-helper';
import { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './interface';
import { log } from '../logger';
import { redisCache } from '../core/redis-cache';
import { langfuse } from '../observability/langfuse';

/**
 * Claude API Provider
 * Wraps Anthropic SDK to match LLMProvider interface
 */
export class ClaudeProvider implements LLMProvider {
  name = 'claude';
  private client: Anthropic;
  private model: string;
  private useGateway: boolean = false;
  private gatewayUrl?: string;

  constructor(apiKey?: string, model?: string) {
    // Check if Cloudflare AI Gateway is configured
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const gatewaySlug = process.env.CLOUDFLARE_GATEWAY_SLUG;

    if (accountId && gatewaySlug) {
      this.useGateway = true;
      this.gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${gatewaySlug}/anthropic`;

      log.info('[Claude] Cloudflare AI Gateway enabled', {
        accountId: accountId.substring(0, 8) + '...',
        gatewaySlug
      });

      this.client = new Anthropic({
        apiKey: apiKey || getEnv('ANTHROPIC_API_KEY', ''),
        baseURL: this.gatewayUrl
      });
    } else {
      log.info('[Claude] Using direct Anthropic API');
      this.client = new Anthropic({
        apiKey: apiKey || getEnv('ANTHROPIC_API_KEY', '')
      });
    }

    this.model = model || process.env.CLAUDE_MODEL || 'claude-opus-4-20250514';
  }

  async isAvailable(): Promise<boolean> {
    // Check if API key is configured
    return !!getEnv('ANTHROPIC_API_KEY', '');
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Check cache first (unless explicitly disabled)
      if (options?.skipCache !== true) {
        const cached = await redisCache.getCachedLLMResponse(
          'claude',
          this.model,
          messages,
          undefined
        );

        if (cached) {
          const cacheTime = Date.now() - startTime;
          log.info('[Claude] ⚡ Cache hit!', {
            model: this.model,
            cacheTime: `${cacheTime}ms`,
            savings: 'API call saved'
          });
          return cached;
        }
      }

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
        maxTokens: options?.maxTokens || 4096,
        viaGateway: this.useGateway
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
        outputTokens: response.usage.output_tokens,
        viaGateway: this.useGateway
      });

      const llmResponse: LLMResponse = {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      };

      // Cache the response (unless disabled or temperature > 0.3)
      if (options?.skipCache !== true && (options?.temperature || 0) <= 0.3) {
        await redisCache.cacheLLMResponse(
          'claude',
          this.model,
          messages,
          undefined,
          llmResponse,
          86400 // 24 hours
        );
      }

      // Track with Langfuse (observability)
      if (langfuse.isEnabled()) {
        const cost = this.calculateCost(
          response.usage.input_tokens,
          response.usage.output_tokens
        );

        langfuse.trackGeneration({
          userId: (options as any)?.userId || 'unknown',
          botName: (options as any)?.botName,
          provider: 'claude',
          model: this.model,
          messages,
          response: llmResponse,
          latency: processingTime,
          cost,
          metadata: {
            viaGateway: this.useGateway,
            cached: false,
          },
        }).catch(err => {
          log.error('[Claude] Langfuse tracking failed', { error: err.message });
        });
      }

      return llmResponse;
    } catch (error: any) {
      log.error('[Claude] Generation failed', {
        error: error.message,
        viaGateway: this.useGateway
      });

      // If Gateway failed and we were using it, try falling back to direct API
      if (this.useGateway) {
        log.warn('[Claude] Gateway failed, attempting fallback to direct API');
        try {
          const fallbackClient = new Anthropic({
            apiKey: getEnv('ANTHROPIC_API_KEY', '')
          });

          const anthropicMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            }));

          const systemMessages = messages
            .filter(m => m.role === 'system')
            .map(m => m.content)
            .join('\n\n');

          const systemPrompt = options?.systemPrompt || systemMessages || undefined;

          const response = await fallbackClient.messages.create({
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

          log.info('[Claude] Fallback successful', {
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
        } catch (fallbackError: any) {
          log.error('[Claude] Fallback also failed', { error: fallbackError.message });
          throw fallbackError;
        }
      }

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
        maxTokens: options?.maxTokens || 4096,
        viaGateway: this.useGateway
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
        outputTokens: response.usage.output_tokens,
        viaGateway: this.useGateway
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
      log.error('[Claude] Tool generation failed', {
        error: error.message,
        viaGateway: this.useGateway
      });

      // If Gateway failed and we were using it, try falling back to direct API
      if (this.useGateway) {
        log.warn('[Claude] Gateway failed on tool call, attempting fallback to direct API');
        try {
          const fallbackClient = new Anthropic({
            apiKey: getEnv('ANTHROPIC_API_KEY', '')
          });

          const anthropicMessages = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content
            }));

          const systemMessages = messages
            .filter(m => m.role === 'system')
            .map(m => m.content)
            .join('\n\n');

          const systemPrompt = options?.systemPrompt || systemMessages || undefined;

          const response = await fallbackClient.messages.create({
            model: this.model,
            max_tokens: options?.maxTokens || 4096,
            temperature: options?.temperature,
            system: systemPrompt,
            messages: anthropicMessages,
            tools
          });

          const content = JSON.stringify(response.content);
          const processingTime = Date.now() - startTime;

          log.info('[Claude] Fallback successful (tools)', {
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
        } catch (fallbackError: any) {
          log.error('[Claude] Fallback also failed (tools)', { error: fallbackError.message });
          throw fallbackError;
        }
      }

      throw error;
    }
  }

  /**
   * Calculate cost based on token usage
   * Pricing as of Feb 2025:
   * - Opus 4: $15/Mtok input, $75/Mtok output
   * - Sonnet 4: $3/Mtok input, $15/Mtok output
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    // Determine pricing based on model
    let inputCostPerMtok = 3; // Sonnet default
    let outputCostPerMtok = 15;

    if (this.model.includes('opus')) {
      inputCostPerMtok = 15;
      outputCostPerMtok = 75;
    } else if (this.model.includes('haiku')) {
      inputCostPerMtok = 0.25;
      outputCostPerMtok = 1.25;
    }

    const inputCost = (inputTokens / 1_000_000) * inputCostPerMtok;
    const outputCost = (outputTokens / 1_000_000) * outputCostPerMtok;

    return inputCost + outputCost;
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
