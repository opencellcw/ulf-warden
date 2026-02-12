/**
 * URL Manager - Gerenciador Inteligente de URLs
 * 
 * Este módulo garante que o bot SEMPRE use URLs públicas via Cloudflare Tunnel.
 * NUNCA permite o uso de localhost, IPs internos ou URLs que serão bloqueadas
 * pelo firewall do GCP.
 * 
 * IMPORTANTE: Estamos atrás de um firewall que só permite conexões OUTBOUND.
 * Qualquer link que enviamos para serviços externos (Discord, Slack, etc) DEVE
 * usar o Cloudflare Tunnel, caso contrário será bloqueado.
 */

import * as os from 'os';

export interface URLManagerConfig {
  publicUrl: string;
  webhookUrl?: string;
  n8nUrl?: string;
  agentOpsUrl?: string;
  langfuseUrl?: string;
  dashboardUrl?: string;
  apiUrl?: string;
}

export class URLManager {
  private config: URLManagerConfig;
  private readonly blockedPatterns = [
    /^https?:\/\/localhost/i,
    /^https?:\/\/127\.\d+\.\d+\.\d+/i,
    /^https?:\/\/10\.\d+\.\d+\.\d+/i,
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+/i,
    /^https?:\/\/192\.168\.\d+\.\d+/i,
    /^http:\/\//i, // Força HTTPS
  ];

  constructor(config: URLManagerConfig) {
    this.config = config;
    this.validateConfig();
    this.logInitialization();
  }

  /**
   * Valida a configuração inicial
   */
  private validateConfig(): void {
    if (!this.config.publicUrl) {
      throw new Error(
        '❌ PUBLIC_URL não configurado! Bot DEVE ter URL pública do Cloudflare Tunnel.\n' +
        'Configure: PUBLIC_URL=https://TUNNEL-ID.cfargotunnel.com'
      );
    }

    if (this.isBlockedUrl(this.config.publicUrl)) {
      throw new Error(
        `❌ PUBLIC_URL inválido: ${this.config.publicUrl}\n` +
        'Deve ser uma URL pública via Cloudflare Tunnel, não localhost ou IP interno!'
      );
    }
  }

  /**
   * Loga inicialização com informações de firewall
   */
  private logInitialization(): void {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                                                            ║');
    console.log('║         🌐 URL Manager - Consciência de Firewall 🌐       ║');
    console.log('║                                                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log('🔒 FIREWALL STATUS:');
    console.log('   - Estamos atrás do firewall GCP');
    console.log('   - Apenas conexões OUTBOUND permitidas');
    console.log('   - INBOUND bloqueado (exceto via Cloudflare Tunnel)');
    console.log('');
    
    console.log('🌐 URL PÚBLICA (via Cloudflare Tunnel):');
    console.log(`   ${this.config.publicUrl}`);
    console.log('');
    
    console.log('✅ URLS CONFIGURADAS:');
    console.log(`   Webhook:   ${this.config.webhookUrl || this.config.publicUrl + '/webhook'}`);
    console.log(`   Dashboard: ${this.config.dashboardUrl || this.config.publicUrl + '/dashboard'}`);
    console.log(`   API:       ${this.config.apiUrl || this.config.publicUrl + '/api'}`);
    
    if (this.config.n8nUrl) {
      console.log(`   n8n:       ${this.config.n8nUrl}`);
    }
    if (this.config.agentOpsUrl) {
      console.log(`   AgentOps:  ${this.config.agentOpsUrl}`);
    }
    if (this.config.langfuseUrl) {
      console.log(`   Langfuse:  ${this.config.langfuseUrl}`);
    }
    console.log('');
    
    console.log('⚠️  AVISO:');
    console.log('   Qualquer URL localhost/IP interno será REJEITADA!');
    console.log('   Use APENAS as URLs acima para links externos!');
    console.log('');
  }

  /**
   * Verifica se uma URL é bloqueada (localhost, IP interno, etc)
   */
  private isBlockedUrl(url: string): boolean {
    return this.blockedPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Obtém URL pública garantida (SEMPRE via tunnel)
   */
  public getPublicUrl(): string {
    return this.config.publicUrl;
  }

  /**
   * Obtém URL de webhook (SEMPRE via tunnel)
   */
  public getWebhookUrl(path?: string): string {
    const base = this.config.webhookUrl || `${this.config.publicUrl}/webhook`;
    return path ? `${base}${path}` : base;
  }

  /**
   * Obtém URL de dashboard (SEMPRE via tunnel)
   */
  public getDashboardUrl(path?: string): string {
    const base = this.config.dashboardUrl || `${this.config.publicUrl}/dashboard`;
    return path ? `${base}${path}` : base;
  }

  /**
   * Obtém URL de API (SEMPRE via tunnel)
   */
  public getApiUrl(path?: string): string {
    const base = this.config.apiUrl || `${this.config.publicUrl}/api`;
    return path ? `${base}${path}` : base;
  }

  /**
   * Obtém URL do n8n (SEMPRE via tunnel)
   */
  public getN8nUrl(path?: string): string {
    if (!this.config.n8nUrl) {
      throw new Error('N8N_URL não configurado!');
    }
    return path ? `${this.config.n8nUrl}${path}` : this.config.n8nUrl;
  }

  /**
   * Obtém URL do AgentOps (SEMPRE via tunnel)
   */
  public getAgentOpsUrl(path?: string): string {
    if (!this.config.agentOpsUrl) {
      throw new Error('AGENTOPS_URL não configurado!');
    }
    return path ? `${this.config.agentOpsUrl}${path}` : this.config.agentOpsUrl;
  }

  /**
   * Obtém URL do Langfuse (SEMPRE via tunnel)
   */
  public getLangfuseUrl(path?: string): string {
    if (!this.config.langfuseUrl) {
      throw new Error('LANGFUSE_URL não configurado!');
    }
    return path ? `${this.config.langfuseUrl}${path}` : this.config.langfuseUrl;
  }

  /**
   * Valida e converte qualquer URL para uso público
   * 
   * Se a URL for interna (localhost, IP privado), REJEITA!
   * Se for externa, valida e retorna.
   * 
   * NUNCA permite URLs que serão bloqueadas pelo firewall!
   */
  public validateAndConvertUrl(url: string, context: string = 'unknown'): string {
    if (this.isBlockedUrl(url)) {
      const error = `
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║              ❌ URL BLOQUEADA DETECTADA! ❌               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

⚠️  TENTATIVA DE USO DE URL BLOQUEADA:
    Contexto: ${context}
    URL:      ${url}

🔒 MOTIVO:
    Esta URL é localhost ou IP interno e será BLOQUEADA pelo
    firewall do GCP. Apenas conexões OUTBOUND são permitidas.

✅ SOLUÇÃO:
    Use as URLs públicas via Cloudflare Tunnel:
    
    getPublicUrl()     -> ${this.config.publicUrl}
    getWebhookUrl()    -> ${this.getWebhookUrl()}
    getDashboardUrl()  -> ${this.getDashboardUrl()}
    getApiUrl()        -> ${this.getApiUrl()}

💡 EXEMPLOS:
    ❌ ERRADO:  http://localhost:3000/webhook
    ✅ CERTO:   ${this.getWebhookUrl()}
    
    ❌ ERRADO:  http://10.100.5.10:3000/dashboard
    ✅ CERTO:   ${this.getDashboardUrl()}

🚫 URLs BLOQUEADAS:
    - localhost
    - 127.x.x.x
    - 10.x.x.x (rede privada)
    - 172.16.x.x - 172.31.x.x (rede privada)
    - 192.168.x.x (rede privada)
    - http:// (sem HTTPS)
`;
      
      console.error(error);
      throw new Error(`URL bloqueada detectada: ${url} (contexto: ${context})`);
    }

    return url;
  }

  /**
   * Helper para criar URL com parâmetros
   */
  public buildUrl(base: string, path?: string, params?: Record<string, string>): string {
    let url = base;
    
    if (path) {
      url = `${url}${path.startsWith('/') ? path : '/' + path}`;
    }
    
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url = `${url}?${queryString}`;
    }
    
    return this.validateAndConvertUrl(url, 'buildUrl');
  }

  /**
   * Obtém informações do ambiente (para debugging)
   */
  public getEnvironmentInfo(): {
    hostname: string;
    platform: string;
    inKubernetes: boolean;
    publicUrl: string;
    firewallMode: string;
  } {
    return {
      hostname: os.hostname(),
      platform: os.platform(),
      inKubernetes: !!process.env.KUBERNETES_SERVICE_HOST,
      publicUrl: this.config.publicUrl,
      firewallMode: 'outbound-only (GCP firewall)',
    };
  }
}

/**
 * Cria instância do URLManager a partir das variáveis de ambiente
 */
export function createURLManager(): URLManager {
  const config: URLManagerConfig = {
    publicUrl: process.env.PUBLIC_URL || '',
    webhookUrl: process.env.WEBHOOK_URL,
    n8nUrl: process.env.N8N_WEBHOOK_URL,
    agentOpsUrl: process.env.AGENTOPS_BASE_URL,
    langfuseUrl: process.env.LANGFUSE_BASE_URL,
    dashboardUrl: process.env.DASHBOARD_URL,
    apiUrl: process.env.API_BASE_URL,
  };

  return new URLManager(config);
}

/**
 * Instância global (singleton)
 */
let globalURLManager: URLManager | null = null;

export function getURLManager(): URLManager {
  if (!globalURLManager) {
    globalURLManager = createURLManager();
  }
  return globalURLManager;
}
