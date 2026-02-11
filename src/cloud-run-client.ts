import axios, { AxiosInstance } from 'axios';

/**
 * Cliente para invocar agentes especializados no Cloud Run
 *
 * Benefícios:
 * - Agentes especializados rodam serverless (scale-to-zero)
 * - Paga apenas quando usado
 * - Isolamento de recursos (não afeta bot principal)
 * - Fácil adicionar novos agentes
 */

export interface CloudRunAgentConfig {
  name: string;
  url: string;
  timeout?: number; // em ms
}

export class CloudRunClient {
  private agents: Map<string, AxiosInstance> = new Map();

  constructor(configs: CloudRunAgentConfig[]) {
    for (const config of configs) {
      const client = axios.create({
        baseURL: config.url,
        timeout: config.timeout || 120000, // 2 minutos padrão
        headers: {
          'Content-Type': 'application/json'
        }
      });

      this.agents.set(config.name, client);
    }
  }

  /**
   * Gera uma imagem usando o image-gen agent
   */
  async generateImage(params: {
    prompt: string;
    userId: string;
    style?: 'realistic' | 'anime';
  }): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
    prompt?: string;
    style?: string;
    timestamp?: string;
  }> {
    const agent = this.agents.get('image-gen');
    if (!agent) {
      throw new Error('image-gen agent not configured');
    }

    try {
      console.log(`[CloudRunClient] Calling image-gen: "${params.prompt}"`);
      const response = await agent.post('/generate', params);
      return response.data;
    } catch (error: any) {
      console.error('[CloudRunClient] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Melhora qualidade de uma imagem
   */
  async enhanceImage(params: {
    imageUrl: string;
    userId: string;
  }): Promise<{
    success: boolean;
    enhancedUrl?: string;
    originalUrl?: string;
    error?: string;
    timestamp?: string;
  }> {
    const agent = this.agents.get('image-gen');
    if (!agent) {
      throw new Error('image-gen agent not configured');
    }

    try {
      console.log(`[CloudRunClient] Calling enhance for user ${params.userId}`);
      const response = await agent.post('/enhance', params);
      return response.data;
    } catch (error: any) {
      console.error('[CloudRunClient] Error:', error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Health check de um agente específico
   */
  async healthCheck(agentName: string): Promise<{
    service: string;
    status: string;
    version?: string;
  }> {
    const agent = this.agents.get(agentName);
    if (!agent) {
      throw new Error(`Agent ${agentName} not configured`);
    }

    const response = await agent.get('/');
    return response.data;
  }

  /**
   * Lista todos os agentes configurados
   */
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }
}

/**
 * Singleton instance
 */
let cloudRunClient: CloudRunClient | null = null;

export function initCloudRunClient(configs: CloudRunAgentConfig[]): void {
  cloudRunClient = new CloudRunClient(configs);
  console.log(`[CloudRun] Initialized with agents: ${configs.map(c => c.name).join(', ')}`);
}

export function getCloudRunClient(): CloudRunClient {
  if (!cloudRunClient) {
    throw new Error('CloudRunClient not initialized. Call initCloudRunClient first.');
  }
  return cloudRunClient;
}
