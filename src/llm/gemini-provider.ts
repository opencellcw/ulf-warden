import { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './interface';
import { log } from '../logger';
import { redisCache } from '../core/redis-cache';
import { langfuse } from '../observability/langfuse';

/**
 * Google Gemini Provider
 * Supports Gemini 2.5 Pro, Flash, Ultra
 * Uses OpenAI-compatible API via Google AI Studio
 */

export class GeminiProvider implements LLMProvider {
  name = 'gemini';
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config?: { apiKey?: string; model?: string }) {
    this.apiKey = config?.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = config?.model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.baseURL = 'https://generativelanguage.googleapis.com/v1beta';

    if (!this.apiKey) {
      log.warn('[Gemini] API key not configured');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Check cache
      if (options?.skipCache !== true) {
        const cached = await redisCache.getCachedLLMResponse(
          'gemini',
          this.model,
          messages,
          undefined
        );

        if (cached) {
          const cacheTime = Date.now() - startTime;
          log.info('[Gemini] ⚡ Cache hit!', {
            model: this.model,
            cacheTime: `${cacheTime}ms`
          });
          return cached;
        }
      }

      // Convert messages to Gemini format
      const geminiMessages = this.convertMessages(messages, options?.systemPrompt);

      log.debug('[Gemini] Generating response', {
        messageCount: geminiMessages.length,
        model: this.model
      });

      const response = await fetch(
        `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: geminiMessages,
            generationConfig: {
              maxOutputTokens: options?.maxTokens || 8192,
              temperature: options?.temperature !== undefined ? options.temperature : 0.7
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();

      const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const processingTime = Date.now() - startTime;

      // Estimate tokens (Gemini doesn't always return usage)
      const inputTokens = this.estimateTokens(
        messages.map(m => m.content).join(' ')
      );
      const outputTokens = this.estimateTokens(content);

      log.info('[Gemini] Generated response', {
        model: this.model,
        processingTime: `${processingTime}ms`,
        inputTokens,
        outputTokens
      });

      const llmResponse: LLMResponse = {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens,
          outputTokens
        }
      };

      // Cache
      if (options?.skipCache !== true && (options?.temperature || 0) <= 0.3) {
        await redisCache.cacheLLMResponse(
          'gemini',
          this.model,
          messages,
          undefined,
          llmResponse,
          86400
        );
      }

      // Track with Langfuse
      if (langfuse.isEnabled()) {
        const cost = this.calculateCost(inputTokens, outputTokens);

        langfuse.trackGeneration({
          userId: options?.userId || 'unknown',
          botName: options?.botName,
          provider: 'gemini',
          model: this.model,
          messages,
          response: llmResponse,
          latency: processingTime,
          cost,
          metadata: { cached: false },
        }).catch(err => {
          log.error('[Gemini] Langfuse tracking failed', { error: err.message });
        });
      }

      return llmResponse;
    } catch (error: any) {
      log.error('[Gemini] Generation failed', { error: error.message });
      throw error;
    }
  }

  async generateWithTools(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      const geminiMessages = this.convertMessages(messages, options?.systemPrompt);
      const geminiTools = this.convertTools(tools);

      const response = await fetch(
        `${this.baseURL}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: geminiMessages,
            tools: geminiTools,
            generationConfig: {
              maxOutputTokens: options?.maxTokens || 8192,
              temperature: options?.temperature !== undefined ? options.temperature : 0.7
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();
      const candidate = data.candidates?.[0];
      
      const content = JSON.stringify({
        content: candidate?.content?.parts?.[0]?.text || null,
        tool_calls: candidate?.content?.parts?.filter((p: any) => p.functionCall) || null
      });

      const processingTime = Date.now() - startTime;

      log.info('[Gemini] Generated response with tools', {
        model: this.model,
        processingTime: `${processingTime}ms`,
        hasToolCalls: !!candidate?.content?.parts?.some((p: any) => p.functionCall)
      });

      return {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: this.estimateTokens(messages.map(m => m.content).join(' ')),
          outputTokens: this.estimateTokens(content)
        }
      };
    } catch (error: any) {
      log.error('[Gemini] Tool generation failed', { error: error.message });
      throw error;
    }
  }

  private convertMessages(messages: LLMMessage[], systemPrompt?: string): any[] {
    const result: any[] = [];

    let systemContent = systemPrompt || '';
    
    const systemMessages = messages
      .filter(m => m.role === 'system')
      .map(m => m.content)
      .join('\n\n');
    
    if (systemMessages) {
      systemContent = systemContent 
        ? `${systemContent}\n\n${systemMessages}`
        : systemMessages;
    }

    let firstUserMessage = true;

    messages
      .filter(m => m.role !== 'system')
      .forEach(msg => {
        const role = msg.role === 'assistant' ? 'model' : 'user';
        let content = msg.content;

        if (role === 'user' && firstUserMessage && systemContent) {
          content = `${systemContent}\n\n${content}`;
          firstUserMessage = false;
        }

        result.push({
          role,
          parts: [{ text: content }]
        });
      });

    return result;
  }

  private convertTools(tools: any[]): any[] {
    return [{
      functionDeclarations: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.input_schema || tool.parameters
      }))
    }];
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    let inputCostPerMtok = 0.075;
    let outputCostPerMtok = 0.30;

    if (this.model.includes('pro')) {
      inputCostPerMtok = 1.25;
      outputCostPerMtok = 5.00;
    }

    const inputCost = (inputTokens / 1_000_000) * inputCostPerMtok;
    const outputCost = (outputTokens / 1_000_000) * outputCostPerMtok;

    return inputCost + outputCost;
  }

  getModel(): string {
    return this.model;
  }
}

let geminiProvider: GeminiProvider | null = null;

export function getGeminiProvider(): GeminiProvider {
  if (!geminiProvider) {
    geminiProvider = new GeminiProvider();
  }
  return geminiProvider;
}
