import OpenAI from 'openai';
import { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './interface';
import { log } from '../logger';
import { redisCache } from '../core/redis-cache';
import { langfuse } from '../observability/langfuse';

/**
 * OpenAI Provider
 * Supports GPT-4, GPT-4 Turbo, GPT-3.5, o1, o3
 */

export class OpenAIProvider implements LLMProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    const apiKey = config?.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config?.model || process.env.OPENAI_MODEL || 'gpt-4-turbo';
    
    this.client = new OpenAI({ apiKey });
    
    if (!apiKey) {
      log.warn('[OpenAI] API key not configured');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (options?.skipCache !== true) {
        const cached = await redisCache.getCachedLLMResponse(
          'openai',
          this.model,
          messages,
          undefined
        );

        if (cached) {
          const cacheTime = Date.now() - startTime;
          log.info('[OpenAI] ⚡ Cache hit!', {
            model: this.model,
            cacheTime: `${cacheTime}ms`
          });
          return cached;
        }
      }

      // Convert messages
      const openaiMessages = this.convertMessages(messages, options?.systemPrompt);

      log.debug('[OpenAI] Generating response', {
        messageCount: openaiMessages.length,
        model: this.model
      });

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages as any,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature !== undefined ? options.temperature : 0.7
      });

      const content = completion.choices[0]?.message?.content || '';
      const processingTime = Date.now() - startTime;

      log.info('[OpenAI] Generated response', {
        model: this.model,
        processingTime: `${processingTime}ms`,
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0
      });

      const llmResponse: LLMResponse = {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0
        }
      };

      // Cache
      if (options?.skipCache !== true && (options?.temperature || 0) <= 0.3) {
        await redisCache.cacheLLMResponse(
          'openai',
          this.model,
          messages,
          undefined,
          llmResponse,
          86400
        );
      }

      // Track with Langfuse
      if (langfuse.isEnabled()) {
        const cost = this.calculateCost(
          completion.usage?.prompt_tokens || 0,
          completion.usage?.completion_tokens || 0
        );

        langfuse.trackGeneration({
          userId: options?.userId || 'unknown',
          botName: options?.botName,
          provider: 'openai',
          model: this.model,
          messages,
          response: llmResponse,
          latency: processingTime,
          cost,
          metadata: { cached: false },
        }).catch(err => {
          log.error('[OpenAI] Langfuse tracking failed', { error: err.message });
        });
      }

      return llmResponse;
    } catch (error: any) {
      log.error('[OpenAI] Generation failed', { error: error.message });
      throw error;
    }
  }

  async generateWithTools(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const openaiMessages = this.convertMessages(messages, options?.systemPrompt);
      const openaiTools = this.convertTools(tools);

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages as any,
        tools: openaiTools,
        tool_choice: 'auto',
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature !== undefined ? options.temperature : 0.7
      });

      const message = completion.choices[0]?.message;
      const content = JSON.stringify({
        content: message?.content || null,
        tool_calls: message?.tool_calls || null
      });

      const processingTime = Date.now() - startTime;

      log.info('[OpenAI] Generated response with tools', {
        model: this.model,
        processingTime: `${processingTime}ms`,
        hasToolCalls: !!message?.tool_calls
      });

      return {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0
        }
      };
    } catch (error: any) {
      log.error('[OpenAI] Tool generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Stream response
   */
  async *streamResponse(
    messages: LLMMessage[],
    options?: LLMOptions
  ): AsyncGenerator<{ content: string; done: boolean; usage?: any }, void, unknown> {
    try {
      const openaiMessages = this.convertMessages(messages, options?.systemPrompt);

      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages as any,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature !== undefined ? options.temperature : 0.7,
        stream: true
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        
        if (delta) {
          yield { content: delta, done: false };
        }
      }

      yield { content: '', done: true };
    } catch (error: any) {
      log.error('[OpenAI] Stream failed', { error: error.message });
      throw error;
    }
  }

  private convertMessages(messages: LLMMessage[], systemPrompt?: string): any[] {
    const result: any[] = [];

    if (systemPrompt) {
      result.push({
        role: 'system',
        content: systemPrompt
      });
    }

    const systemMessages = messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n\n');

    if (systemMessages && !systemPrompt) {
      result.push({
        role: 'system',
        content: systemMessages
      });
    }

    messages
      .filter(m => m.role !== 'system')
      .forEach(msg => {
        result.push({
          role: msg.role,
          content: msg.content
        });
      });

    return result;
  }

  private convertTools(tools: any[]): any[] {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema || tool.parameters
      }
    }));
  }

  /**
   * Calculate cost
   * GPT-4 Turbo: $10 input, $30 output per Mtok
   * GPT-4: $30 input, $60 output per Mtok
   * GPT-3.5: $0.50 input, $1.50 output per Mtok
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    let inputCostPerMtok = 10;
    let outputCostPerMtok = 30;

    if (this.model.includes('gpt-3.5')) {
      inputCostPerMtok = 0.50;
      outputCostPerMtok = 1.50;
    } else if (this.model.includes('gpt-4') && !this.model.includes('turbo')) {
      inputCostPerMtok = 30;
      outputCostPerMtok = 60;
    }

    const inputCost = (inputTokens / 1_000_000) * inputCostPerMtok;
    const outputCost = (outputTokens / 1_000_000) * outputCostPerMtok;

    return inputCost + outputCost;
  }

  getModel(): string {
    return this.model;
  }
}

let openaiProvider: OpenAIProvider | null = null;

export function getOpenAIProvider(): OpenAIProvider {
  if (!openaiProvider) {
    openaiProvider = new OpenAIProvider();
  }
  return openaiProvider;
}
