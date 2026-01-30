"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvolutionEngine = void 0;
exports.getEvolutionEngine = getEvolutionEngine;
const logger_1 = require("../logger");
const learning_db_1 = require("./learning-db");
const feedback_analyzer_1 = require("./feedback-analyzer");
const pattern_recognition_1 = require("./pattern-recognition");
const types_1 = require("./types");
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
class EvolutionEngine {
    db = (0, learning_db_1.getLearningDatabase)();
    feedbackAnalyzer = (0, feedback_analyzer_1.getFeedbackAnalyzer)();
    patternRecognition = (0, pattern_recognition_1.getPatternRecognition)();
    app;
    evolutionChannel;
    learningCycleInterval = null;
    constructor(app) {
        this.app = app;
        this.evolutionChannel = process.env.SLACK_EVOLUTION_CHANNEL || 'ulf-evolution';
        logger_1.log.info('[EvolutionEngine] Initialized', {
            evolutionChannel: this.evolutionChannel
        });
    }
    /**
     * Analyze a single interaction
     */
    async analyzeInteraction(feedback) {
        try {
            // Calculate satisfaction score
            const satisfactionScore = this.feedbackAnalyzer.calculateSatisfaction(feedback);
            // Create complete feedback data
            const completeFeedback = {
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
            logger_1.log.info('[EvolutionEngine] Interaction analyzed', {
                messageId: completeFeedback.messageId,
                satisfaction: satisfactionScore
            });
            // Check if should trigger learning cycle
            if (await this.shouldTriggerLearningCycle()) {
                await this.triggerLearningCycle();
            }
        }
        catch (error) {
            logger_1.log.error('[EvolutionEngine] Failed to analyze interaction', {
                error: error.message
            });
        }
    }
    /**
     * Check if should trigger learning cycle
     */
    async shouldTriggerLearningCycle() {
        // Get recent unprocessed interactions
        const recent = this.db.getRecentInteractions(7);
        const unprocessed = recent.filter(i => !i.processed);
        return unprocessed.length >= types_1.EVOLUTION_RULES.learningTriggers.minInteractionsForPattern;
    }
    /**
     * Trigger learning cycle
     */
    async triggerLearningCycle() {
        try {
            logger_1.log.info('[EvolutionEngine] Starting learning cycle');
            // Get recent interactions
            const interactions = this.db.getRecentInteractions(7);
            const unprocessed = interactions.filter(i => !i.processed);
            if (unprocessed.length === 0) {
                logger_1.log.info('[EvolutionEngine] No unprocessed interactions');
                return;
            }
            // Identify patterns
            const patterns = await this.patternRecognition.identifyPatterns(unprocessed);
            if (patterns.length === 0) {
                logger_1.log.info('[EvolutionEngine] No significant patterns found');
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
            logger_1.log.info('[EvolutionEngine] Learning cycle complete', {
                patternsFound: patterns.length,
                insightsGenerated: insights.length,
                recommendations: recommendations.length
            });
        }
        catch (error) {
            logger_1.log.error('[EvolutionEngine] Learning cycle failed', {
                error: error.message
            });
        }
    }
    /**
     * Propose improvements via Slack
     */
    async proposeImprovements(insights, recommendations) {
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
            logger_1.log.info('[EvolutionEngine] Improvements proposed', {
                insightsCount: insights.length,
                recommendationsCount: recommendations.length
            });
        }
        catch (error) {
            logger_1.log.error('[EvolutionEngine] Failed to propose improvements', {
                error: error.message
            });
        }
    }
    /**
     * Apply approved improvement
     */
    async applyImprovement(insightId, approvedBy) {
        try {
            const insights = this.db.getPendingInsights();
            const insight = insights.find(i => i.id === insightId);
            if (!insight) {
                logger_1.log.warn('[EvolutionEngine] Insight not found', { insightId });
                return;
            }
            // Create evolution change
            const change = {
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
            logger_1.log.info('[EvolutionEngine] Improvement applied', {
                insightId,
                approvedBy
            });
            // Notify via Slack
            await this.app.client.chat.postMessage({
                channel: this.evolutionChannel,
                text: `✅ Melhoria aplicada!\n\n**Insight:** ${insight.content}\n**Aprovado por:** <@${approvedBy}>`
            });
        }
        catch (error) {
            logger_1.log.error('[EvolutionEngine] Failed to apply improvement', {
                error: error.message
            });
        }
    }
    /**
     * Start automatic learning cycles
     */
    startAutomaticLearning(intervalHours = 24) {
        if (this.learningCycleInterval) {
            clearInterval(this.learningCycleInterval);
        }
        this.learningCycleInterval = setInterval(() => {
            logger_1.log.info('[EvolutionEngine] Automatic learning cycle triggered');
            this.triggerLearningCycle();
        }, intervalHours * 60 * 60 * 1000);
        logger_1.log.info('[EvolutionEngine] Automatic learning started', {
            intervalHours
        });
    }
    /**
     * Stop automatic learning
     */
    stopAutomaticLearning() {
        if (this.learningCycleInterval) {
            clearInterval(this.learningCycleInterval);
            this.learningCycleInterval = null;
            logger_1.log.info('[EvolutionEngine] Automatic learning stopped');
        }
    }
    /**
     * Get trend emoji
     */
    getTrendEmoji(trend) {
        switch (trend) {
            case 'improving': return '📈';
            case 'declining': return '📉';
            default: return '➡️';
        }
    }
    /**
     * Shutdown gracefully
     */
    async shutdown() {
        logger_1.log.info('[EvolutionEngine] Shutting down');
        this.stopAutomaticLearning();
    }
}
exports.EvolutionEngine = EvolutionEngine;
// Export singleton (will be initialized with app)
let evolutionEngineInstance = null;
function getEvolutionEngine(app) {
    if (!evolutionEngineInstance && app) {
        evolutionEngineInstance = new EvolutionEngine(app);
    }
    if (!evolutionEngineInstance) {
        throw new Error('EvolutionEngine not initialized. Call with app parameter first.');
    }
    return evolutionEngineInstance;
}
