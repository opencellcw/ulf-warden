import axios from 'axios';
import { Provider } from '../core/provider-manager';

interface ChatOptions {
  model?: string;
  history?: Array<{ role: string; content: string }>;
}

export class MoonshotProvider implements Provider {
  private apiKey: string;
  private baseURL = 'https://api.moonshot.cn/v1';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async chat(message: string, options: ChatOptions = {}): Promise<string> {
    const model = options.model || 'moonshot-v1-8k';
    
    const messages = [
      ...(options.history || []),
      { role: 'user', content: message }
    ];
    
    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model,
          messages,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.choices[0].message.content;
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new Error('Invalid Moonshot API key');
      }
      throw err;
    }
  }
}
