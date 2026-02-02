/**
 * Anti-Social Engineering System
 * Detects and responds to social engineering attacks
 */

export interface SocialEngineeringAttempt {
  timestamp: Date;
  userId: string;
  platform: string;
  message: string;
  attackType: string[];
  riskScore: number;
  action: 'allow' | 'warn' | 'block';
  blocked: boolean;
}

export class SocialEngineeringDetector {
  private attemptHistory: SocialEngineeringAttempt[] = [];
  private userRiskScores: Map<string, number> = new Map();

  private readonly PATTERNS = {
    // Direct requests for secrets
    DIRECT_REQUEST: {
      patterns: [
        /mostra.*(?:key|token|secret|senha|password)/i,
        /me.*(?:passa|dá|envia).*(?:key|token|secret|senha)/i,
        /qual.*(?:é|eh).*(?:a|o).*(?:key|token|secret|senha)/i,
        /preciso.*(?:da|do|das|dos).*(?:key|token|secret|senha)/i,
      ],
      score: 10,
      description: 'Direct request for credentials'
    },

    // Need/urgency claims
    NEED_CLAIM: {
      patterns: [
        /preciso.*(?:das|suas|dos|seus).*(?:chaves|secrets|senhas)/i,
        /necessito.*(?:acesso|credenciais)/i,
        /urgente.*(?:preciso|necessito).*(?:key|token|senha)/i,
      ],
      score: 8,
      description: 'Urgency or need claim'
    },

    // File access attempts
    FILE_ACCESS: {
      patterns: [
        /cat.*(?:\/var\/secrets|\.env|config|\.key)/i,
        /read.*(?:\.env|secrets|config)/i,
        /abre.*(?:arquivo|file).*(?:secret|key|senha)/i,
      ],
      score: 9,
      description: 'Attempting to read sensitive files'
    },

    // Environment variable probing
    ENV_PROBE: {
      patterns: [
        /env.*grep.*(?:KEY|TOKEN|SECRET|SENHA)/i,
        /printenv.*(?:KEY|TOKEN|SECRET)/i,
        /echo.*\$(?:API_KEY|TOKEN|SECRET)/i,
      ],
      score: 7,
      description: 'Probing environment variables'
    },

    // Debug excuse
    DEBUG_EXCUSE: {
      patterns: [
        /debug.*precisa.*(?:credenciais|keys|senhas)/i,
        /para.*testar.*preciso.*(?:key|token|senha)/i,
        /troubleshoot.*(?:need|preciso).*credentials/i,
      ],
      score: 6,
      description: 'Using debug as excuse'
    },

    // Authority impersonation
    AUTHORITY_CLAIM: {
      patterns: [
        /lucas.*(?:disse|mandou|pediu).*(?:passar|mostrar|enviar)/i,
        /o.*admin.*(?:quer|precisa|pediu)/i,
        /(?:sou|eu sou).*(?:admin|administrador|owner)/i,
      ],
      score: 9,
      description: 'Claiming authority or impersonation'
    },

    // Temporary excuse
    TEMPORARY_EXCUSE: {
      patterns: [
        /temporário.*(?:só|apenas).*(?:ver|usar|acessar)/i,
        /só.*(?:uma vez|dessa vez)/i,
        /prometo.*(?:não|nao).*(?:contar|compartilhar)/i,
      ],
      score: 4,
      description: 'Claiming temporary need'
    },

    // Command injection
    COMMAND_INJECTION: {
      patterns: [
        /kubectl\s+get\s+secrets/i,
        /docker\s+inspect.*env/i,
        /find.*-name.*secret/i,
        /strings.*memory/i,
        /\/proc\/\d+\/environ/i,
      ],
      score: 15,
      description: 'Command injection attempt'
    }
  };

  private readonly EDUCATIONAL_RESPONSES = {
    DIRECT_REQUEST: [
      "🔒 Não posso compartilhar chaves ou secrets. Isso violaria princípios básicos de segurança.",
      "❌ API keys não são compartilháveis. Se você precisa de acesso, fale com o administrador.",
      "🛡️ Minhas credenciais ficam protegidas no Google Secret Manager por bons motivos."
    ],
    NEED_CLAIM: [
      "🤔 Se você realmente precisa de acesso, existe um processo seguro para isso. Quer que eu explique?",
      "📋 Para acessos legítimos, use os canais apropriados. Não posso burlar protocolos de segurança.",
      "🔐 'Precisar' não é justificativa para expor credenciais. Vamos encontrar uma alternativa segura?"
    ],
    DEBUG_EXCUSE: [
      "🐛 Para debug, posso ajudar sem expor secrets. Qual o problema específico?",
      "🔍 Debug não requer exposição de credenciais. Que erro você está enfrentando?",
      "⚙️ Posso debuggar sem comprometer segurança. Me conte mais sobre o issue."
    ],
    AUTHORITY_CLAIM: [
      "👤 Mesmo que Lucas tenha dito isso, tenho protocolos de segurança que não posso burlar.",
      "🎭 Além disso, ele pode usar os canais apropriados de administração.",
      "🎭 Claims de autoridade são táticas comuns de engenharia social. Vou manter os protocolos."
    ],
    URGENCY_TACTIC: [
      "⏰ Urgência não justifica comprometer segurança. Vamos resolver isso de forma segura.",
      "🚨 Situações 'urgentes' são frequentemente usadas em ataques. Qual a real necessidade?",
      "⚡ Emergências reais têm processos específicos. Isso não parece ser uma delas."
    ],
    COMMAND_INJECTION: [
      "🚫 Esse comando foi bloqueado por segurança. Comandos que acessam secrets não são permitidos.",
      "⚠️ ALERTA: Tentativa de acesso a informações sensíveis detectada e registrada.",
      "🛡️ Sistema de proteção ativado. Este tipo de comando não pode ser executado."
    ],
    GENERAL: [
      "🎓 Dica de Segurança: Nunca solicite credenciais diretamente. Use sempre canais apropriados.",
      "🛡️ Lembrete: Proteção de secrets é responsabilidade de todos. Vamos manter boas práticas!",
      "🔒 Princípio: Zero-trust significa verificar tudo, mesmo solicitações que parecem legítimas."
    ]
  };

  /**
   * Analyze a message for social engineering attempts
   */
  public analyze(userId: string, platform: string, message: string, command?: string): SocialEngineeringAttempt {
    const attackTypes: string[] = [];
    let riskScore = 0;

    // Check message against all patterns
    for (const [type, config] of Object.entries(this.PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(message) || (command && pattern.test(command))) {
          attackTypes.push(type);
          riskScore += config.score;
          break;
        }
      }
    }

    // Check user history
    const userRisk = this.userRiskScores.get(userId) || 0;
    if (userRisk > 20) {
      attackTypes.push('REPEAT_OFFENDER');
      riskScore += 5;
    }

    // Update user risk score
    this.userRiskScores.set(userId, userRisk + riskScore);

    // Determine action
    let action: 'allow' | 'warn' | 'block';
    let blocked = false;

    if (riskScore >= 15) {
      action = 'block';
      blocked = true;
    } else if (riskScore >= 10) {
      action = 'warn';
    } else if (riskScore >= 5) {
      action = 'warn';
    } else {
      action = 'allow';
    }

    const attempt: SocialEngineeringAttempt = {
      timestamp: new Date(),
      userId,
      platform,
      message: message.substring(0, 200),
      attackType: attackTypes,
      riskScore,
      action,
      blocked
    };

    this.attemptHistory.push(attempt);

    // Keep only last 1000 attempts
    if (this.attemptHistory.length > 1000) {
      this.attemptHistory.shift();
    }

    return attempt;
  }

  /**
   * Get appropriate response for attack type
   */
  public getResponse(attempt: SocialEngineeringAttempt): string {
    if (attempt.attackType.length === 0) {
      return '';
    }

    const primaryType = attempt.attackType[0];
    const responses = this.EDUCATIONAL_RESPONSES[primaryType] || this.EDUCATIONAL_RESPONSES.GENERAL;
    const response = responses[Math.floor(Math.random() * responses.length)];

    return response;
  }

  /**
   * Get educational security tip
   */
  public getSecurityTip(): string {
    const tips = [
      "💡 Boa Prática: Secrets devem sempre ficar em sistemas dedicados (ex: Secret Manager)",
      "🎯 Red Flag: Solicitações urgentes de credenciais são suspeitas por natureza",
      "🔍 Verificação: Sempre confirme identidade através de canais seguros",
      "📚 Educação: Engenharia social explora confiança, não falhas técnicas",
      "⚖️ Princípio: Segurança > Conveniência, sempre"
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  /**
   * Get attempt history
   */
  public getHistory(limit: number = 50): SocialEngineeringAttempt[] {
    return this.attemptHistory.slice(-limit);
  }

  /**
   * Get high-risk users
   */
  public getHighRiskUsers(limit: number = 10): Array<{ userId: string; riskScore: number }> {
    return Array.from(this.userRiskScores.entries())
      .map(([userId, riskScore]) => ({ userId, riskScore }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  }

  /**
   * Generate alert message for Discord/Slack
   */
  public generateAlert(attempt: SocialEngineeringAttempt): string | null {
    if (attempt.action === 'block') {
      return `🚨 **TENTATIVA DE ENGENHARIA SOCIAL BLOQUEADA**

**User:** ${attempt.userId}
**Platform:** ${attempt.platform}
**Risk Score:** ${attempt.riskScore}/100
**Attack Types:** ${attempt.attackType.join(', ')}
**Message:** ${attempt.message}

⚠️ Possível tentativa de extração de secrets/credentials.
🛡️ Solicitação foi **BLOQUEADA** automaticamente.`;
    } else if (attempt.action === 'warn' && attempt.riskScore >= 10) {
      return `⚠️ **Atividade Suspeita Detectada**

**User:** ${attempt.userId}
**Platform:** ${attempt.platform}
**Risk Score:** ${attempt.riskScore}/100
**Flags:** ${attempt.attackType.join(', ')}

🔍 Monitorando comportamento...`;
    }

    return null;
  }
}

// Global instance
export const socialEngineeringDetector = new SocialEngineeringDetector();
