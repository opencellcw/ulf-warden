import { log } from '../logger';
import {
  FeedbackData,
  REACTION_SCORES,
  POSITIVE_FOLLOWUP_WORDS,
  NEGATIVE_FOLLOWUP_WORDS,
  EVOLUTION_RULES
} from './types';

/**
 * Feedback Analyzer
 *
 * Analyzes feedback signals (reactions, follow-ups, corrections)
 * and calculates satisfaction scores
 */
export class FeedbackAnalyzer {
  /**
   * Calculate satisfaction score for an interaction
   */
  calculateSatisfaction(feedback: Partial<FeedbackData>): number {
    let score = 0.5; // Base neutral

    const weights = EVOLUTION_RULES.feedbackWeights;

    // Analyze reaction
    if (feedback.reaction) {
      const reactionScore = REACTION_SCORES[feedback.reaction] || 0;
      score += reactionScore * weights.reactionWeight;
    }

    // Analyze follow-up message
    if (feedback.followUp) {
      const followUpScore = this.analyzeFollowUp(feedback.followUp);
      score += followUpScore * weights.followUpWeight;
    }

    // Clamp to [0, 1]
    score = Math.max(0, Math.min(1, score));

    log.debug('[FeedbackAnalyzer] Satisfaction calculated', {
      reaction: feedback.reaction,
      hasFollowUp: !!feedback.followUp,
      score
    });

    return score;
  }

  /**
   * Analyze follow-up message sentiment
   */
  private analyzeFollowUp(followUp: string): number {
    const lowerText = followUp.toLowerCase();

    // Check for positive indicators
    const positiveCount = POSITIVE_FOLLOWUP_WORDS.filter(word =>
      lowerText.includes(word)
    ).length;

    // Check for negative indicators
    const negativeCount = NEGATIVE_FOLLOWUP_WORDS.filter(word =>
      lowerText.includes(word)
    ).length;

    if (positiveCount > negativeCount) {
      return 0.3; // Positive follow-up
    } else if (negativeCount > positiveCount) {
      return -0.3; // Negative follow-up
    }

    return 0; // Neutral
  }

  /**
   * Detect if follow-up is a correction
   */
  isCorrection(followUp: string): boolean {
    const correctionPhrases = [
      'na verdade',
      'actually',
      'não é',
      'not exactly',
      'melhor seria',
      'better would be',
      'correto é',
      'correct is',
      'errado',
      'wrong',
      'incorreto',
      'incorrect'
    ];

    const lowerText = followUp.toLowerCase();

    return correctionPhrases.some(phrase => lowerText.includes(phrase));
  }

  /**
   * Extract correction pattern
   */
  extractCorrectionPattern(originalResponse: string, correction: string): {
    type: string;
    description: string;
  } {
    const lowerCorrection = correction.toLowerCase();

    // Detect pattern type
    if (lowerCorrection.includes('tom') || lowerCorrection.includes('tone')) {
      return {
        type: 'tone',
        description: 'Tone adjustment needed'
      };
    }

    if (lowerCorrection.includes('técnico') || lowerCorrection.includes('technical')) {
      return {
        type: 'technical',
        description: 'Technical accuracy issue'
      };
    }

    if (lowerCorrection.includes('muito longo') || lowerCorrection.includes('too long')) {
      return {
        type: 'length',
        description: 'Response too verbose'
      };
    }

    if (lowerCorrection.includes('muito curto') || lowerCorrection.includes('too short')) {
      return {
        type: 'length',
        description: 'Response too brief'
      };
    }

    if (lowerCorrection.includes('contexto') || lowerCorrection.includes('context')) {
      return {
        type: 'context',
        description: 'Missing context understanding'
      };
    }

    return {
      type: 'general',
      description: 'General correction'
    };
  }

  /**
   * Extract topic from user input
   */
  extractTopic(userInput: string): string {
    const lowerInput = userInput.toLowerCase();

    // Define topic keywords
    const topics: Record<string, string[]> = {
      'código': ['código', 'code', 'programming', 'função', 'function', 'class'],
      'backend': ['api', 'backend', 'servidor', 'server', 'database', 'banco'],
      'frontend': ['frontend', 'react', 'vue', 'html', 'css', 'ui', 'interface'],
      'deploy': ['deploy', 'deployment', 'render', 'docker', 'container'],
      'debug': ['bug', 'erro', 'error', 'debug', 'problema', 'issue'],
      'documentação': ['docs', 'documentação', 'documentation', 'readme'],
      'git': ['git', 'github', 'commit', 'push', 'pull', 'branch'],
      'config': ['config', 'configuração', 'setup', 'install', 'dependências'],
      'multimodal': ['imagem', 'image', 'vídeo', 'video', 'áudio', 'audio'],
      'conversa': ['conversa', 'chat', 'pergunta', 'question']
    };

    // Find matching topic
    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some(keyword => lowerInput.includes(keyword))) {
        return topic;
      }
    }

    return 'geral';
  }

  /**
   * Analyze response time (if available)
   */
  analyzeResponseTime(responseTimeMs: number): {
    acceptable: boolean;
    feedback: string;
  } {
    if (responseTimeMs < 2000) {
      return {
        acceptable: true,
        feedback: 'Excellent response time'
      };
    }

    if (responseTimeMs < 5000) {
      return {
        acceptable: true,
        feedback: 'Good response time'
      };
    }

    if (responseTimeMs < 10000) {
      return {
        acceptable: true,
        feedback: 'Acceptable response time'
      };
    }

    return {
      acceptable: false,
      feedback: 'Response time too slow'
    };
  }

  /**
   * Analyze response length appropriateness
   */
  analyzeResponseLength(response: string, userInput: string): {
    appropriate: boolean;
    feedback: string;
  } {
    const responseLength = response.length;
    const inputLength = userInput.length;

    // Simple question shouldn't have very long answer
    if (inputLength < 50 && responseLength > 1000) {
      return {
        appropriate: false,
        feedback: 'Response too verbose for simple question'
      };
    }

    // Complex question needs detailed answer
    if (inputLength > 200 && responseLength < 100) {
      return {
        appropriate: false,
        feedback: 'Response too brief for complex question'
      };
    }

    return {
      appropriate: true,
      feedback: 'Response length appropriate'
    };
  }

  /**
   * Generate actionable feedback summary
   */
  generateFeedbackSummary(feedbacks: FeedbackData[]): {
    overallSatisfaction: number;
    trends: string[];
    recommendations: string[];
  } {
    if (feedbacks.length === 0) {
      return {
        overallSatisfaction: 0.5,
        trends: [],
        recommendations: []
      };
    }

    const avgSatisfaction = feedbacks.reduce((sum, f) => sum + f.satisfactionScore, 0) / feedbacks.length;

    const trends: string[] = [];
    const recommendations: string[] = [];

    // Trend: satisfaction over time
    const recent = feedbacks.slice(0, Math.floor(feedbacks.length / 2));
    const older = feedbacks.slice(Math.floor(feedbacks.length / 2));

    const recentAvg = recent.reduce((sum, f) => sum + f.satisfactionScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, f) => sum + f.satisfactionScore, 0) / older.length;

    if (recentAvg > olderAvg + 0.1) {
      trends.push('📈 Satisfaction improving over time');
    } else if (recentAvg < olderAvg - 0.1) {
      trends.push('📉 Satisfaction declining - needs attention');
      recommendations.push('Review recent changes and feedback patterns');
    }

    // Trend: common negative reactions
    const negativeReactions = feedbacks
      .filter(f => f.reaction && (REACTION_SCORES[f.reaction] || 0) < 0)
      .map(f => f.reaction);

    if (negativeReactions.length > feedbacks.length * 0.2) {
      trends.push('⚠️ High rate of negative reactions');
      recommendations.push('Analyze common patterns in negative feedback');
    }

    // Trend: corrections
    const corrections = feedbacks.filter(f => f.followUp && this.isCorrection(f.followUp));

    if (corrections.length > feedbacks.length * 0.15) {
      trends.push('🔧 Frequent corrections needed');
      recommendations.push('Improve accuracy or clarify uncertainties');
    }

    return {
      overallSatisfaction: avgSatisfaction,
      trends,
      recommendations
    };
  }
}

// Export singleton
let feedbackAnalyzerInstance: FeedbackAnalyzer | null = null;

export function getFeedbackAnalyzer(): FeedbackAnalyzer {
  if (!feedbackAnalyzerInstance) {
    feedbackAnalyzerInstance = new FeedbackAnalyzer();
  }
  return feedbackAnalyzerInstance;
}
