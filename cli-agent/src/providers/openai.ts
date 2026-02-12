import axios from 'axios';
import { Provider } from '../core/provider-manager';

export class OpenAIProvider implements Provider {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async chat(message: string, options: any = {}): Promise<string> {
    const model = options.model || 'gpt-4';
    
    const messages = [
      ...(options.history || []),
      { role: 'user', content: message }
    ];
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model, messages },
      {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.choices[0].message.content;
  }
}
