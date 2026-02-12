/**
 * Decision Intelligence Analyzer
 * 
 * Engine que coordena múltiplos AIs para analisar decisões
 */

import { getRouter } from '../llm/router';
import { LLMMessage, ModelStrategy } from '../llm/interface';
import { log } from '../logger';
import {
  DecisionRequest,
  AgentPerspective,
  DecisionAnalysis,
  DecisionConsensus,
} from './types';
import {
  AGENT_PROMPTS,
  AGENT_NAMES,
  fillPrompt,
} from './prompts';

export class DecisionAnalyzer {
  private router = getRouter();
  
  /**
   * Analisa uma decisão usando múltiplos agentes
   */
  async analyze(request: DecisionRequest): Promise<DecisionAnalysis> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    log.info('[DecisionAnalyzer] Starting analysis', {
      requestId,
      question: request.question,
      alternativesCount: request.alternatives?.length || 0,
    });
    
    try {
      // Executar análise de todos os agentes em paralelo
      const perspectives = await Promise.all([
        this.getAgentPerspective('analyst', request),
        this.getAgentPerspective('creative', request),
        this.getAgentPerspective('skeptic', request),
        this.getAgentPerspective('pragmatist', request),
        this.getAgentPerspective('ethicist', request),
      ]);
      
      // Calcular consenso
      const consensus = this.calculateConsensus(perspectives, request.alternatives || []);
      
      const analysis: DecisionAnalysis = {
        requestId,
        question: request.question,
        alternatives: request.alternatives || [],
        perspectives,
        consensus,
        timestamp: new Date(),
        analysisTimeMs: Date.now() - startTime,
      };
      
      log.info('[DecisionAnalyzer] Analysis complete', {
        requestId,
        timeMs: analysis.analysisTimeMs,
        recommendation: consensus.recommendation,
        confidence: consensus.confidenceScore,
      });
      
      return analysis;
    } catch (error) {
      log.error('[DecisionAnalyzer] Analysis failed', { requestId, error });
      throw error;
    }
  }
  
  /**
   * Obtém perspectiva de um agente específico
   */
  private async getAgentPerspective(
    agentType: keyof typeof AGENT_PROMPTS,
    request: DecisionRequest
  ): Promise<AgentPerspective> {
    const prompt = fillPrompt(AGENT_PROMPTS[agentType], {
      question: request.question,
      alternatives: request.alternatives,
      context: request.context,
    });
    
    const messages: LLMMessage[] = [
      {
        role: 'user',
        content: prompt,
      },
    ];
    
    try {
      // Router uses Smart Router strategy automatically (from LLM_STRATEGY env var)
      const response = await this.router.generate(messages);
      
      const parsed = this.parseAgentResponse(response.content, agentType);
      
      return {
        agentName: AGENT_NAMES[agentType],
        agentType,
        ...parsed,
      };
    } catch (error) {
      log.error(`[DecisionAnalyzer] Agent ${agentType} failed`, { error });
      
      // Retornar perspectiva de fallback
      return {
        agentName: AGENT_NAMES[agentType],
        agentType,
        recommendation: 'Unable to analyze',
        confidence: 0,
        reasoning: `Analysis failed: ${error}`,
        pros: [],
        cons: [],
        risks: ['Analysis error occurred'],
        opportunities: [],
        keyQuestions: [],
        timeframe: 'Unknown',
      };
    }
  }
  
  /**
   * Parse resposta do agente (formato livre -> estruturado)
   */
  private parseAgentResponse(
    response: string,
    agentType: string
  ): Omit<AgentPerspective, 'agentName' | 'agentType'> {
    // Extrair campos usando regex
    const extractField = (label: string): string => {
      const regex = new RegExp(`${label}:\\s*(.+?)(?=\\n[A-Z]+:|$)`, 'is');
      const match = response.match(regex);
      return match ? match[1].trim() : '';
    };
    
    const extractList = (label: string): string[] => {
      const content = extractField(label);
      if (!content) return [];
      
      // Tentar parsear como lista
      const lines = content.split('\n')
        .map(line => line.trim())
        .filter(line => line && (line.startsWith('-') || line.startsWith('•') || /^\d+\./.test(line)));
      
      if (lines.length > 0) {
        return lines.map(line => line.replace(/^[-•\d.]\s*/, '').trim());
      }
      
      // Se não houver lista, retornar como item único
      return [content];
    };
    
    const extractNumber = (label: string): number => {
      const value = extractField(label);
      const num = parseInt(value, 10);
      return isNaN(num) ? 50 : Math.max(0, Math.min(100, num));
    };
    
    return {
      recommendation: extractField('RECOMMENDATION') || 'No recommendation provided',
      confidence: extractNumber('CONFIDENCE'),
      reasoning: extractField('REASONING') || response,
      pros: extractList('PROS'),
      cons: extractList('CONS'),
      risks: extractList('RISKS'),
      opportunities: extractList('OPPORTUNITIES'),
      keyQuestions: extractList('KEY QUESTIONS'),
      timeframe: extractField('TIMEFRAME') || 'Unknown',
      estimatedImpact: extractField('IMPACT') || 'Unknown',
    };
  }
  
  /**
   * Calcula consenso entre as perspectivas
   */
  private calculateConsensus(
    perspectives: AgentPerspective[],
    alternatives: string[]
  ): DecisionConsensus {
    // Contar votos
    const votes = new Map<string, number>();
    let totalConfidence = 0;
    
    for (const p of perspectives) {
      const rec = p.recommendation.toLowerCase();
      votes.set(rec, (votes.get(rec) || 0) + 1);
      totalConfidence += p.confidence;
    }
    
    // Encontrar recomendação majoritária
    let majorityVote = '';
    let maxVotes = 0;
    for (const [rec, count] of votes.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        majorityVote = rec;
      }
    }
    
    // Calcular métricas
    const confidenceScore = Math.round(totalConfidence / perspectives.length);
    const agreementLevel = Math.round((maxVotes / perspectives.length) * 100);
    const unanimity = maxVotes === perspectives.length;
    const splitVote = maxVotes <= Math.ceil(perspectives.length / 2);
    
    // Identificar dissidentes
    const dissent = perspectives
      .filter(p => p.recommendation.toLowerCase() !== majorityVote.toLowerCase())
      .map(p => p.agentName);
    
    // Agregar insights
    const allPros = perspectives.flatMap(p => p.pros);
    const allCons = perspectives.flatMap(p => p.cons);
    const allRisks = perspectives.flatMap(p => p.risks);
    const allQuestions = perspectives.flatMap(p => p.keyQuestions);
    
    // Top items (por frequência/importância)
    const topPros = this.getTopItems(allPros, 5);
    const topCons = this.getTopItems(allCons, 5);
    const topRisks = this.getTopItems(allRisks, 5);
    const criticalQuestions = this.getTopItems(allQuestions, 5);
    
    // Alternativas sugeridas que não estavam na lista original
    const alternativeSuggestions = perspectives
      .map(p => p.recommendation)
      .filter(rec => {
        const recLower = rec.toLowerCase();
        return !alternatives.some(alt => recLower.includes(alt.toLowerCase())) &&
               !['unable to analyze', 'no recommendation'].some(skip => recLower.includes(skip));
      })
      .filter((rec, i, arr) => arr.indexOf(rec) === i); // unique
    
    // Determinar recomendação final
    let recommendation = majorityVote;
    if (splitVote) {
      recommendation = `Split decision: Consider multiple perspectives. Majority: ${majorityVote}`;
    } else if (unanimity) {
      recommendation = `Unanimous: ${majorityVote}`;
    }
    
    return {
      recommendation,
      confidenceScore,
      agreementLevel,
      majorityVote,
      splitVote,
      topPros,
      topCons,
      topRisks,
      criticalQuestions,
      unanimity,
      dissent,
      alternativeSuggestions,
    };
  }
  
  /**
   * Obtém top N items mais mencionados
   */
  private getTopItems(items: string[], topN: number): string[] {
    if (items.length === 0) return [];
    
    // Contar frequência (simplificado - apenas pega os primeiros N únicos)
    const unique = items.filter((item, i, arr) => {
      // Remove duplicatas aproximadas (mesmas palavras-chave)
      const normalized = item.toLowerCase().replace(/[^\w\s]/g, '');
      return arr.findIndex(x => 
        x.toLowerCase().replace(/[^\w\s]/g, '') === normalized
      ) === i;
    });
    
    return unique.slice(0, topN);
  }
  
  /**
   * Gera ID único para request
   */
  private generateRequestId(): string {
    return `dec_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

/**
 * Instância singleton
 */
let analyzerInstance: DecisionAnalyzer | null = null;

export function getDecisionAnalyzer(): DecisionAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new DecisionAnalyzer();
  }
  return analyzerInstance;
}
