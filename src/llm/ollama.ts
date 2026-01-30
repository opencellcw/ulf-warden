import { LLMProvider, LLMMessage, LLMResponse, LLMOptions } from './interface';
import { log } from '../logger';
import axios from 'axios';

/**
 * Ollama Provider for Uncensored Models
 *
 * Supports any Ollama model including uncensored variants:
 * - wizard-vicuna-uncensored
 * - dolphin-mistral
 * - llama3-uncensored
 * - neural-chat-uncensored
 *
 * Install Ollama: curl -fsSL https://ollama.com/install.sh | sh
 * Pull model: ollama pull wizard-vicuna-uncensored:7b
 */
export class OllamaProvider implements LLMProvider {
  name = 'ollama';
  private baseUrl: string;
  private modelName: string;

  constructor(baseUrl?: string, modelName?: string) {
    this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.modelName = modelName || process.env.OLLAMA_MODEL || 'wizard-vicuna-uncensored:7b';
  }

  async isAvailable(): Promise<boolean> {
    // Check if Ollama is enabled
    const enabled = process.env.OLLAMA_ENABLED === 'true';
    if (!enabled) {
      log.info('[Ollama] Ollama is disabled via config');
      return false;
    }

    try {
      // Check if Ollama server is running
      const response = await axios.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });

      // Check if our model is available
      const models = response.data.models || [];
      const hasModel = models.some((m: any) => m.name.includes(this.modelName.split(':')[0]));

      if (!hasModel) {
        log.warn('[Ollama] Model not found', {
          model: this.modelName,
          available: models.map((m: any) => m.name)
        });
        return false;
      }

      log.info('[Ollama] Provider available', { model: this.modelName });
      return true;
    } catch (error: any) {
      log.warn('[Ollama] Server not available', { error: error.message });
      return false;
    }
  }

  async generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const startTime = Date.now();

    try {
      // Format prompt
      const prompt = this.formatPrompt(messages, options?.systemPrompt);

      log.debug('[Ollama] Generating response', {
        model: this.modelName,
        promptLength: prompt.length
      });

      // Call Ollama API
      const response = await axios.post(
        `${this.baseUrl}/api/generate`,
        {
          model: this.modelName,
          prompt,
          stream: false,
          options: {
            temperature: options?.temperature || 0.7,
            num_predict: options?.maxTokens || 512,
            top_p: 0.9,
            repeat_penalty: 1.1
          }
        },
        { timeout: 120000 } // 2 minute timeout for larger models
      );

      const content = response.data.response;
      const processingTime = Date.now() - startTime;

      log.info('[Ollama] Generated response', {
        model: this.modelName,
        outputLength: content.length,
        processingTime: `${processingTime}ms`
      });

      return {
        content: content.trim(),
        model: this.modelName,
        processingTime,
        usage: {
          inputTokens: this.estimateTokens(prompt),
          outputTokens: this.estimateTokens(content)
        }
      };
    } catch (error: any) {
      log.error('[Ollama] Generation failed', {
        error: error.message,
        model: this.modelName
      });
      throw error;
    }
  }

  private formatPrompt(messages: LLMMessage[], systemPrompt?: string): string {
    const parts: string[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      parts.push(`System: ${systemPrompt}\n`);
    }

    // Add conversation history
    for (const msg of messages) {
      if (msg.role === 'system' && !systemPrompt) {
        parts.push(`System: ${msg.content}\n`);
      } else if (msg.role === 'user') {
        parts.push(`User: ${msg.content}\n`);
      } else if (msg.role === 'assistant') {
        parts.push(`Assistant: ${msg.content}\n`);
      }
    }

    // Add prompt for assistant response
    parts.push('Assistant:');

    return parts.join('\n');
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  async generateWithTools(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse> {
    throw new Error('Ollama models do not support native tool use. Use Claude API for tool-based tasks.');
  }

  /**
   * Get list of available models
   */
  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return response.data.models.map((m: any) => m.name);
    } catch (error: any) {
      log.error('[Ollama] Failed to get models', { error: error.message });
      return [];
    }
  }

  /**
   * Pull a new model (async operation)
   */
  async pullModel(modelName: string): Promise<void> {
    log.info('[Ollama] Pulling model...', { model: modelName });

    try {
      await axios.post(`${this.baseUrl}/api/pull`,
        { name: modelName },
        { timeout: 600000 } // 10 minute timeout for download
      );
      log.info('[Ollama] Model pulled successfully', { model: modelName });
    } catch (error: any) {
      log.error('[Ollama] Failed to pull model', { error: error.message });
      throw error;
    }
  }

  /**
   * Get model info
   */
  getModelInfo(): { name: string; type: string; capabilities: string[] } {
    return {
      name: this.modelName,
      type: 'ollama-uncensored',
      capabilities: ['chat', 'uncensored', 'creative']
    };
  }
}

// Singleton instance
let ollamaProvider: OllamaProvider | null = null;

export function getOllamaProvider(): OllamaProvider {
  if (!ollamaProvider) {
    ollamaProvider = new OllamaProvider();
  }
  return ollamaProvider;
}
