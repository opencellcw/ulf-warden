import { Config } from './config';
import { OllamaProvider } from '../providers/ollama';
import { ClaudeProvider } from '../providers/claude';
import { MoonshotProvider } from '../providers/moonshot';
import { OpenAIProvider } from '../providers/openai';
import { GeminiProvider } from '../providers/gemini';
import keytar from 'keytar';

const SERVICE_NAME = 'opencell-agent';

export interface Provider {
  chat(message: string, options?: any): Promise<string>;
  listModels?(): Promise<string[]>;
}

export interface ProviderInfo {
  name: string;
  description: string;
  cost: string;
  unlocked: boolean;
  requiresKey: boolean;
}

export class ProviderManager {
  private config: Config;
  private providers: Map<string, Provider>;
  
  constructor(config: Config) {
    this.config = config;
    this.providers = new Map();
  }
  
  async getProvider(name: string): Promise<Provider> {
    // Check cache
    if (this.providers.has(name)) {
      return this.providers.get(name)!;
    }
    
    // Create provider
    let provider: Provider;
    
    switch (name.toLowerCase()) {
      case 'ollama':
        provider = new OllamaProvider();
        break;
        
      case 'claude':
        const claudeKey = await this.getApiKey('claude');
        if (!claudeKey) {
          throw new Error('Claude API key not found. Run: ocell unlock claude');
        }
        provider = new ClaudeProvider(claudeKey);
        break;
        
      case 'moonshot':
        const moonshotKey = await this.getApiKey('moonshot');
        if (!moonshotKey) {
          throw new Error('Moonshot API key not found. Run: ocell unlock moonshot');
        }
        provider = new MoonshotProvider(moonshotKey);
        break;
        
      case 'openai':
        const openaiKey = await this.getApiKey('openai');
        if (!openaiKey) {
          throw new Error('OpenAI API key not found. Run: ocell unlock openai');
        }
        provider = new OpenAIProvider(openaiKey);
        break;
        
      case 'gemini':
        const geminiKey = await this.getApiKey('gemini');
        if (!geminiKey) {
          throw new Error('Gemini API key not found. Run: ocell unlock gemini');
        }
        provider = new GeminiProvider(geminiKey);
        break;
        
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
    
    // Cache it
    this.providers.set(name, provider);
    
    return provider;
  }
  
  async setApiKey(provider: string, apiKey: string): Promise<void> {
    await keytar.setPassword(SERVICE_NAME, provider, apiKey);
  }
  
  async getApiKey(provider: string): Promise<string | null> {
    return await keytar.getPassword(SERVICE_NAME, provider);
  }
  
  async deleteApiKey(provider: string): Promise<boolean> {
    return await keytar.deletePassword(SERVICE_NAME, provider);
  }
  
  async isUnlocked(provider: string): Promise<boolean> {
    if (provider === 'ollama') return true; // Always available
    
    const key = await this.getApiKey(provider);
    return !!key;
  }
  
  async listProviders(): Promise<ProviderInfo[]> {
    const providers: ProviderInfo[] = [
      {
        name: 'ollama',
        description: 'Local LLM runtime (llama3, mistral, codellama)',
        cost: '$0 (free, runs locally)',
        unlocked: true,
        requiresKey: false
      },
      {
        name: 'claude',
        description: 'Anthropic Claude (Opus 4, Sonnet)',
        cost: '$15/Mtok (~$60/month for 100 chats/day)',
        unlocked: await this.isUnlocked('claude'),
        requiresKey: true
      },
      {
        name: 'moonshot',
        description: 'Moonshot Kimi (Chinese, very cheap)',
        cost: '$0.50/Mtok (~$3/month for 100 chats/day)',
        unlocked: await this.isUnlocked('moonshot'),
        requiresKey: true
      },
      {
        name: 'openai',
        description: 'OpenAI GPT-4',
        cost: '$10/Mtok (~$30/month for 100 chats/day)',
        unlocked: await this.isUnlocked('openai'),
        requiresKey: true
      },
      {
        name: 'gemini',
        description: 'Google Gemini 2.5',
        cost: '$1.25/Mtok (~$12/month for 100 chats/day)',
        unlocked: await this.isUnlocked('gemini'),
        requiresKey: true
      }
    ];
    
    return providers;
  }
}
