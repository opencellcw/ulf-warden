import { MessageParam } from '@anthropic-ai/sdk/resources/messages';

/**
 * Unified interface for LLM providers
 * Both Claude API and local models implement this interface
 */

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
  processingTime?: number;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  tools?: any[];
}

export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generate(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse>;
  generateWithTools?(messages: LLMMessage[], tools: any[], options?: LLMOptions): Promise<LLMResponse>;
}

/**
 * Convert Anthropic MessageParam to unified LLMMessage
 */
export function toLLMMessage(message: MessageParam): LLMMessage {
  if (typeof message === 'string') {
    return { role: 'user', content: message };
  }

  let content = '';
  if (typeof message.content === 'string') {
    content = message.content;
  } else if (Array.isArray(message.content)) {
    content = message.content
      .map(block => {
        if (typeof block === 'string') return block;
        // Handle text blocks
        if (typeof block === 'object' && block !== null) {
          if ('text' in block) return (block as any).text;
          if ('type' in block && (block as any).type === 'text' && 'text' in block) {
            return (block as any).text;
          }
        }
        return '';
      })
      .join('\n');
  }

  return {
    role: message.role as 'user' | 'assistant' | 'system',
    content
  };
}

/**
 * Convert array of MessageParam to LLMMessage[]
 */
export function toLLMMessages(messages: MessageParam[]): LLMMessage[] {
  return messages.map(toLLMMessage);
}

/**
 * Task types for routing decisions
 */
export enum TaskType {
  // Complex tasks - use Claude API
  TOOL_USE = 'tool_use',
  CODE_GENERATION = 'code_generation',
  COMPLEX_REASONING = 'complex_reasoning',

  // Simple tasks - can use local model
  SIMPLE_CHAT = 'simple_chat',
  TEXT_CLASSIFICATION = 'text_classification',
  SUMMARIZATION = 'summarization',
  TRANSLATION = 'translation',

  // Fallback
  UNKNOWN = 'unknown'
}

/**
 * Model selection strategy
 */
export enum ModelStrategy {
  CLAUDE_ONLY = 'claude_only',       // Always use Claude API
  LOCAL_ONLY = 'local_only',         // Always use local model
  HYBRID = 'hybrid',                 // Route based on task type
  LOCAL_FALLBACK = 'local_fallback'  // Try local first, fallback to Claude
}
