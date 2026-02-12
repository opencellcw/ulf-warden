import axios from 'axios';
import { Provider } from '../core/provider-manager';

export class GeminiProvider implements Provider {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async chat(message: string, options: any = {}): Promise<string> {
    const model = options.model || 'gemini-2.5-flash';
    
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`,
      {
        contents: [{
          parts: [{ text: message }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
    return response.data.candidates[0].content.parts[0].text;
  }
}
