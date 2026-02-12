import { Ollama } from 'ollama';
import { Provider } from '../core/provider-manager';

interface ChatOptions {
  model?: string;
  history?: Array<{ role: string; content: string }>;
}

export class OllamaProvider implements Provider {
  private ollama: Ollama;
  
  constructor() {
    this.ollama = new Ollama({
      host: process.env.OLLAMA_HOST || 'http://localhost:11434'
    });
  }
  
  async chat(message: string, options: ChatOptions = {}): Promise<string> {
    const model = options.model || 'llama3';
    
    // Build messages array
    const messages = [
      ...(options.history || []),
      { role: 'user', content: message }
    ];
    
    try {
      const response = await this.ollama.chat({
        model,
        messages,
        stream: false
      });
      
      return response.message.content;
    } catch (err: any) {
      if (err.message?.includes('model not found')) {
        throw new Error(`Model "${model}" not found. Available: ${(await this.listModels()).join(', ')}\n\nDownload with: ollama pull ${model}`);
      }
      
      if (err.code === 'ECONNREFUSED') {
        throw new Error('Could not connect to Ollama. Is it running?\n\nStart with: ollama serve');
      }
      
      throw err;
    }
  }
  
  async listModels(): Promise<string[]> {
    try {
      const response = await this.ollama.list();
      return response.models.map((m: any) => m.name);
    } catch (err) {
      return [];
    }
  }
  
  async pullModel(model: string): Promise<void> {
    await this.ollama.pull({
      model,
      stream: false
    });
  }
  
  async deleteModel(model: string): Promise<void> {
    await this.ollama.delete({ model });
  }
}
