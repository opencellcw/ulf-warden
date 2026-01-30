import { App } from '@slack/bolt';
import { log } from '../logger';
import { getLearningDatabase } from './learning-db';
import { getFeedbackAnalyzer } from './feedback-analyzer';
import { getPatternRecognition } from './pattern-recognition';
import { FeedbackData, EvolutionChange, EVOLUTION_RULES } from './types';

/**
 * Evolution Engine
 *
 * Orchestrates the self-improvement cycle:
 * 1. Collect feedback
 * 2. Analyze patterns
 * 3. Generate insights
 * 4. Propose improvements
 * 5. Apply approved changes
 */
export class EvolutionEngine {
  private db = getLearningDatabase();
  private feedbackAnalyzer = getFeedbackAnalyzer();
  private patternRecognition = getPatternRecognition();
  private app: App;
  private evolutionChannel: string;
  private learningCycleInterval: NodeJS.Timeout | null = null;

  constructor(app: App) {
    this.app = app;
    this.evolutionChannel = process.env.SLACK_EVOLUTION_CHANNEL || 'ulf-evolution';

    log.info('[EvolutionEngine] Initialized', {
      evolutionChannel: this.evolutionChannel
    });
  }

  /**
   * Analyze a single interaction
   */
  async analyzeInteraction(feedback: Partial<FeedbackData>): Promise<void> {
    try {
      // Calculate satisfaction score
      const satisfactionScore = this.feedbackAnalyzer.calculateSatisfaction(feedback);

      // Create complete feedback data
      const completeFeedback: FeedbackData = {
        messageId: feedback.messageId || '',
        userId: feedback.userId || '',
        userInput: feedback.userInput || '',
        ulfResponse: feedback.ulfResponse || '',
        reaction: feedback.reaction,
        followUp: feedback.followUp,
        timestamp: feedback.timestamp || new Date().toISOString(),
        satisfactionScore,
        processed: false
      };

      // Store interaction
      this.db.storeInteraction(completeFeedback);

      log.info('[EvolutionEngine] Interaction analyzed', {
        messageId: completeFeedback.messageId,
        satisfaction: satisfactionScore
      });

      // Check if should trigger learning cycle
      if (await this.shouldTriggerLearningCycle()) {
        await this.triggerLearningCycle();
      }
    } catch (error: any) {
      log.error('[EvolutionEngine] Failed to analyze interaction', {
        error: error.message
      });
    }
  }

  /**
   * Check if should trigger learning cycle
   */
  private async shouldTriggerLearningCycle(): Promise<boolean> {
    // Get recent unprocessed interactions
    const recent = this.db.getRecentInteractions(7);
    const unprocessed = recent.filter(i => !i.processed);

    return unprocessed.length >= EVOLUTION_RULES.learningTriggers.minInteractionsForPattern;
  }

  /**
   * Trigger learning cycle
   */
  async triggerLearningCycle(): Promise<void> {
    try {
      log.info('[EvolutionEngine] Starting learning cycle');

      // Get recent interactions
      const interactions = this.db.getRecentInteractions(7);
      const unprocessed = interactions.filter(i => !i.processed);

      if (unprocessed.length === 0) {
        log.info('[EvolutionEngine] No unprocessed interactions');
        return;
      }

      // Identify patterns
      const patterns = await this.patternRecognition.identifyPatterns(unprocessed);

      if (patterns.length === 0) {
        log.info('[EvolutionEngine] No significant patterns found');
        return;
      }

      // Generate insights
      const insights = await this.patternRecognition.generateInsights(patterns);

      // Store insights (batch operation for 10x performance)
      if (insights.length > 0) {
        this.db.storeInsightsBatch(insights);
      }

      // Generate recommendations
      const recommendations = this.patternRecognition.recommendImprovements(patterns);

      // Propose improvements via Slack
      await this.proposeImprovements(insights, recommendations);

      // Mark interactions as processed
      this.db.markInteractionsProcessed(unprocessed.map(i => i.messageId));

      log.info('[EvolutionEngine] Learning cycle complete', {
        patternsFound: patterns.length,
        insightsGenerated: insights.length,
        recommendations: recommendations.length
      });
    } catch (error: any) {
      log.error('[EvolutionEngine] Learning cycle failed', {
        error: error.message
      });
    }
  }

  /**
   * Propose improvements via Slack
   */
  private async proposeImprovements(
    insights: any[],
    recommendations: string[]
  ): Promise<void> {
    try {
      const stats = this.db.getEvolutionStats(7);

      let message = '🧬 **ANÁLISE DE AUTO-EVOLUÇÃO**\n\n';

      // Add stats
      message += '📊 **Estatísticas (últimos 7 dias):**\n';
      message += `• Satisfação média: ${(stats.avgSatisfaction * 100).toFixed(1)}%\n`;
      message += `• Total de interações: ${stats.totalInteractions}\n`;
      message += `• Correções recebidas: ${stats.correctionsCount}\n`;
      message += `• Novos aprendizados: ${stats.newLearnings}\n`;
      message += `• Tendência: ${this.getTrendEmoji(stats.trendDirection)} ${stats.trendDirection}\n\n`;

      // Add insights
      if (insights.length > 0) {
        message += '💡 **Insights identificados:**\n';
        insights.slice(0, 5).forEach((insight, i) => {
          message += `${i + 1}. ${insight.content} (confiança: ${(insight.confidenceScore * 100).toFixed(0)}%)\n`;
        });
        message += '\n';
      }

      // Add recommendations
      if (recommendations.length > 0) {
        message += '🎯 **Recomendações:**\n';
        recommendations.slice(0, 5).forEach(rec => {
          message += `${rec}\n`;
        });
        message += '\n';
      }

      message += '_Use `/ulf-evolution` para ver dashboard completo_\n';
      message += '_Use `/ulf-approve-improvements` para aplicar melhorias_';

      await this.app.client.chat.postMessage({
        channel: this.evolutionChannel,
        text: message,
        unfurl_links: false,
        unfurl_media: false
      });

      log.info('[EvolutionEngine] Improvements proposed', {
        insightsCount: insights.length,
        recommendationsCount: recommendations.length
      });
    } catch (error: any) {
      log.error('[EvolutionEngine] Failed to propose improvements', {
        error: error.message
      });
    }
  }

  /**
   * Apply approved improvement
   */
  async applyImprovement(
    insightId: number,
    approvedBy: string
  ): Promise<void> {
    try {
      const insights = this.db.getPendingInsights();
      const insight = insights.find(i => i.id === insightId);

      if (!insight) {
        log.warn('[EvolutionEngine] Insight not found', { insightId });
        return;
      }

      // Create evolution change
      const change: EvolutionChange = {
        changeType: insight.insightType === 'tone' ? 'tone' :
                    insight.insightType === 'topic' ? 'knowledge' :
                    'behavior',
        newValue: insight.content,
        reason: `Applied from insight #${insightId}`,
        approvedBy,
        timestamp: new Date().toISOString(),
        rollbackable: true
      };

      // Log change
      this.db.logEvolutionChange(change);

      // Mark insight as applied
      this.db.markInsightApplied(insightId);

      log.info('[EvolutionEngine] Improvement applied', {
        insightId,
        approvedBy
      });

      // Notify via Slack
      await this.app.client.chat.postMessage({
        channel: this.evolutionChannel,
        text: `✅ Melhoria aplicada!\n\n**Insight:** ${insight.content}\n**Aprovado por:** <@${approvedBy}>`
      });
    } catch (error: any) {
      log.error('[EvolutionEngine] Failed to apply improvement', {
        error: error.message
      });
    }
  }

  /**
   * Start automatic learning cycles
   */
  startAutomaticLearning(intervalHours: number = 24): void {
    if (this.learningCycleInterval) {
      clearInterval(this.learningCycleInterval);
    }

    this.learningCycleInterval = setInterval(() => {
      log.info('[EvolutionEngine] Automatic learning cycle triggered');
      this.triggerLearningCycle();
    }, intervalHours * 60 * 60 * 1000);

    log.info('[EvolutionEngine] Automatic learning started', {
      intervalHours
    });
  }

  /**
   * Stop automatic learning
   */
  stopAutomaticLearning(): void {
    if (this.learningCycleInterval) {
      clearInterval(this.learningCycleInterval);
      this.learningCycleInterval = null;
      log.info('[EvolutionEngine] Automatic learning stopped');
    }
  }

  /**
   * Get trend emoji
   */
  private getTrendEmoji(trend: string): string {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    log.info('[EvolutionEngine] Shutting down');
    this.stopAutomaticLearning();
  }
}

// Export singleton (will be initialized with app)
let evolutionEngineInstance: EvolutionEngine | null = null;

export function getEvolutionEngine(app?: App): EvolutionEngine {
  if (!evolutionEngineInstance && app) {
    evolutionEngineInstance = new EvolutionEngine(app);
  }

  if (!evolutionEngineInstance) {
    throw new Error('EvolutionEngine not initialized. Call with app parameter first.');
  }

  return evolutionEngineInstance;
}
