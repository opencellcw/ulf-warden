/**
 * Decision Intelligence System Types
 * 
 * Sistema para análise multi-perspectiva de decisões importantes
 * usando consenso de múltiplos LLMs (GPT-4, Claude, Gemini)
 */

export interface DecisionRequest {
  question: string;
  context?: string;
  alternatives?: string[];
  userId: string;
  channelId: string;
  platform: 'discord' | 'slack' | 'telegram';
  urgency?: 'low' | 'medium' | 'high';
  category?: DecisionCategory;
}

export enum DecisionCategory {
  TECHNICAL = 'technical',      // Decisões de arquitetura, tecnologia
  BUSINESS = 'business',         // Estratégia, produto, mercado
  PERSONAL = 'personal',         // Carreira, investimentos pessoais
  OPERATIONAL = 'operational',   // Processos, ferramentas, workflows
  STRATEGIC = 'strategic',       // Direção da empresa, visão de longo prazo
  FINANCIAL = 'financial',       // Investimentos, orçamento, custos
  HIRING = 'hiring',            // Contratações, equipe
  OTHER = 'other'
}

export interface AgentPerspective {
  agentName: string;
  agentType: 'analyst' | 'creative' | 'skeptic' | 'pragmatist' | 'ethicist';
  recommendation: string;        // "Option A", "Option B", "Neither", "Both", "Alternative"
  confidence: number;            // 0-100
  reasoning: string;
  pros: string[];
  cons: string[];
  risks: string[];
  opportunities: string[];
  keyQuestions: string[];        // Perguntas que devem ser respondidas antes
  timeframe: string;             // "Immediate", "1-3 months", "Long-term"
  estimatedCost?: string;        // Se aplicável
  estimatedImpact?: string;      // "Low", "Medium", "High", "Critical"
}

export interface DecisionAnalysis {
  requestId: string;
  question: string;
  alternatives: string[];
  perspectives: AgentPerspective[];
  consensus: DecisionConsensus;
  timestamp: Date;
  analysisTimeMs: number;
}

export interface DecisionConsensus {
  recommendation: string;        // Recomendação final
  confidenceScore: number;       // 0-100 (quão confiantes estão)
  agreementLevel: number;        // 0-100 (quão unânimes estão)
  majorityVote: string;          // O que a maioria escolheu
  splitVote: boolean;            // true se houve empate ou discordância forte
  
  // Análise agregada
  topPros: string[];             // Top 3-5 prós identificados
  topCons: string[];             // Top 3-5 contras identificados
  topRisks: string[];            // Top 3-5 riscos identificados
  criticalQuestions: string[];   // Perguntas que DEVEM ser respondidas
  
  // Metadata
  unanimity: boolean;            // true se TODOS concordaram
  dissent: string[];             // Agentes que discordaram (se houver)
  alternativeSuggestions: string[]; // Alternativas propostas que não estavam na lista
}

export interface DecisionHistory {
  decisionId: string;
  userId: string;
  question: string;
  alternatives: string[];
  recommendation: string;
  confidence: number;
  agreement: number;
  timestamp: Date;
  implemented?: boolean;         // User marcou como implementado?
  outcome?: 'success' | 'failure' | 'mixed' | 'pending';
  notes?: string;
}

export interface DecisionStats {
  totalDecisions: number;
  byCategory: Record<DecisionCategory, number>;
  byOutcome: {
    success: number;
    failure: number;
    mixed: number;
    pending: number;
  };
  averageConfidence: number;
  averageAgreement: number;
  mostCommonCategory: DecisionCategory;
}
