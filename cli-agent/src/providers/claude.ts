import Anthropic from '@anthropic-ai/sdk';
import { Provider } from '../core/provider-manager';

interface ChatOptions {
  model?: string;
  history?: Array<{ role: string; content: string }>;
}

export class ClaudeProvider implements Provider {
  private client: Anthropic;
  
  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }
  
  async chat(message: string, options: ChatOptions = {}): Promise<string> {
    const model = options.model || 'claude-opus-4-20250514';
    
    // Convert history to Anthropic format
    const messages = [
      ...(options.history || []).map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      })),
      { role: 'user' as const, content: message }
    ];
    
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        messages
      });
      
      const content = response.content[0];
      if (content.type === 'text') {
        return content.text;
      }
      
      return 'No text response received';
    } catch (err: any) {
      if (err.status === 401) {
        throw new Error('Invalid API key. Check your Claude API key.');
      }
      throw err;
    }
  }
  
  async listModels(): Promise<string[]> {
    return [
      'claude-opus-4-20250514',
      'claude-sonnet-3-7-20250219',
      'claude-3-5-sonnet-20241022'
    ];
  }
}
