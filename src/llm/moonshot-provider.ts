import { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './interface';
import { log } from '../logger';
import { redisCache } from '../core/redis-cache';
import { langfuse } from '../observability/langfuse';

/**
 * Moonshot AI (Kimi) Provider
 * Implements OpenAI-compatible API with 2M token context window
 * https://platform.moonshot.cn/docs/api-reference
 */

interface MoonshotConfig {
  apiKey: string;
  model?: string;
  baseURL?: string;
}

interface MoonshotMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: MoonshotToolCall[];
}

interface MoonshotTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

interface MoonshotToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface MoonshotCompletionChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: 'function';
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Moonshot AI Provider
 */
export class MoonshotProvider implements LLMProvider {
  name = 'moonshot';
  private apiKey: string;
  private model: string;
  private baseURL: string;

  constructor(config?: MoonshotConfig) {
    this.apiKey = config?.apiKey || process.env.MOONSHOT_API_KEY || '';
    this.model = config?.model || process.env.MOONSHOT_MODEL || 'kimi-k2.5';
    this.baseURL = config?.baseURL || process.env.MOONSHOT_BASE_URL || 'https://api.moonshot.ai/v1';

    if (!this.apiKey) {
      log.warn('[Moonshot] API key not configured');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Check cache first (unless explicitly disabled)
      if (options?.skipCache !== true) {
        const cached = await redisCache.getCachedLLMResponse(
          'moonshot',
          this.model,
          messages,
          undefined
        );

        if (cached) {
          const cacheTime = Date.now() - startTime;
          log.info('[Moonshot] ⚡ Cache hit!', {
            model: this.model,
            cacheTime: `${cacheTime}ms`,
            savings: 'API call saved'
          });
          return cached;
        }
      }

      // Convert messages to Moonshot format
      const moonshotMessages = this.convertMessages(messages, options?.systemPrompt);

      log.debug('[Moonshot] Generating response', {
        messageCount: moonshotMessages.length,
        model: this.model,
        maxTokens: options?.maxTokens || 4096
      });

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: moonshotMessages,
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature !== undefined ? options.temperature : 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Moonshot API error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();

      const content = data.choices?.[0]?.message?.content || '';
      const processingTime = Date.now() - startTime;

      log.info('[Moonshot] Generated response', {
        model: this.model,
        processingTime: `${processingTime}ms`,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      });

      const llmResponse: LLMResponse = {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0
        }
      };

      // Cache the response (unless disabled or temperature > 0.3)
      if (options?.skipCache !== true && (options?.temperature || 0) <= 0.3) {
        await redisCache.cacheLLMResponse(
          'moonshot',
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
          data.usage?.prompt_tokens || 0,
          data.usage?.completion_tokens || 0
        );

        langfuse.trackGeneration({
          userId: (options as any)?.userId || 'unknown',
          botName: (options as any)?.botName,
          provider: 'moonshot',
          model: this.model,
          messages,
          response: llmResponse,
          latency: processingTime,
          cost,
          metadata: {
            cached: false,
          },
        }).catch(err => {
          log.error('[Moonshot] Langfuse tracking failed', { error: err.message });
        });
      }

      return llmResponse;
    } catch (error: any) {
      log.error('[Moonshot] Generation failed', {
        error: error.message
      });
      throw error;
    }
  }

  async generateWithTools(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Convert messages and tools to Moonshot format
      const moonshotMessages = this.convertMessages(messages, options?.systemPrompt);
      const moonshotTools = this.convertTools(tools);

      log.debug('[Moonshot] Generating response with tools', {
        messageCount: moonshotMessages.length,
        toolCount: moonshotTools.length,
        model: this.model
      });

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: moonshotMessages,
          tools: moonshotTools,
          tool_choice: 'auto',
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature !== undefined ? options.temperature : 0.7,
          stream: false
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Moonshot API error (${response.status}): ${errorText}`);
      }

      const data: any = await response.json();

      // For tool use, return the full response including tool calls
      const message = data.choices?.[0]?.message;
      const content = JSON.stringify({
        content: message?.content || null,
        tool_calls: message?.tool_calls || null
      });

      const processingTime = Date.now() - startTime;

      log.info('[Moonshot] Generated response with tools', {
        model: this.model,
        finishReason: data.choices?.[0]?.finish_reason,
        processingTime: `${processingTime}ms`,
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
        hasToolCalls: !!message?.tool_calls
      });

      return {
        content,
        model: this.model,
        processingTime,
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0
        }
      };
    } catch (error: any) {
      log.error('[Moonshot] Tool generation failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Stream response (for real-time chat)
   */
  async *streamResponse(
    messages: LLMMessage[],
    options?: LLMOptions & { tools?: any[] }
  ): AsyncGenerator<{ content: string; done: boolean; usage?: any }, void, unknown> {
    try {
      const moonshotMessages = this.convertMessages(messages, options?.systemPrompt);
      const requestBody: any = {
        model: this.model,
        messages: moonshotMessages,
        max_tokens: options?.maxTokens || 4096,
        temperature: options?.temperature !== undefined ? options.temperature : 0.7,
        stream: true
      };

      // Add tools if provided
      if (options?.tools && options.tools.length > 0) {
        requestBody.tools = this.convertTools(options.tools);
        requestBody.tool_choice = 'auto';
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Moonshot API error (${response.status}): ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          log.info('[Moonshot] Stream complete', {
            totalContentLength: fullContent.length
          });
          yield { content: '', done: true };
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim() || line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6); // Remove 'data: ' prefix
              const chunk: MoonshotCompletionChunk = JSON.parse(jsonStr);

              const delta = chunk.choices[0]?.delta;
              
              if (delta?.content) {
                fullContent += delta.content;
                yield { 
                  content: delta.content, 
                  done: false,
                  usage: chunk.usage 
                };
              }

              // Handle tool calls (for agent mode)
              if (delta?.tool_calls) {
                log.debug('[Moonshot] Tool call detected in stream', {
                  toolCalls: delta.tool_calls
                });
              }
            } catch (e) {
              log.warn('[Moonshot] Failed to parse SSE chunk', { line });
            }
          }
        }
      }
    } catch (error: any) {
      log.error('[Moonshot] Stream failed', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Convert LLMMessage[] to Moonshot format
   */
  private convertMessages(messages: LLMMessage[], systemPrompt?: string): MoonshotMessage[] {
    const result: MoonshotMessage[] = [];

    // Add system prompt first
    if (systemPrompt) {
      result.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // Add system messages from history
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

    // Add conversation messages
    messages
      .filter(m => m.role !== 'system')
      .forEach(msg => {
        result.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });

    return result;
  }

  /**
   * Convert Anthropic tool schema to Moonshot/OpenAI format
   */
  private convertTools(tools: any[]): MoonshotTool[] {
    return tools.map(tool => {
      // Anthropic format: { name, description, input_schema }
      // Moonshot format: { type: "function", function: { name, description, parameters } }
      return {
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema || tool.parameters
        }
      };
    });
  }

  /**
   * Calculate cost based on token usage
   * Moonshot pricing (as of Feb 2025):
   * - Input: $0.50/Mtok
   * - Output: $0.50/Mtok
   */
  private calculateCost(inputTokens: number, outputTokens: number): number {
    const inputCostPerMtok = 0.50;
    const outputCostPerMtok = 0.50;

    const inputCost = (inputTokens / 1_000_000) * inputCostPerMtok;
    const outputCost = (outputTokens / 1_000_000) * outputCostPerMtok;

    return inputCost + outputCost;
  }

  /**
   * Get current model name
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Count tokens (rough estimation)
   */
  countTokens(text: string): number {
    // Rough estimation: ~4 characters per token for Chinese/English mix
    return Math.ceil(text.length / 4);
  }
}

/**
 * Singleton instance
 */
let moonshotProvider: MoonshotProvider | null = null;

export function getMoonshotProvider(): MoonshotProvider {
  if (!moonshotProvider) {
    moonshotProvider = new MoonshotProvider();
  }
  return moonshotProvider;
}
