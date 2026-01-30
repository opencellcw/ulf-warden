"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatternRecognition = void 0;
exports.getPatternRecognition = getPatternRecognition;
const logger_1 = require("../logger");
const types_1 = require("./types");
const feedback_analyzer_1 = require("./feedback-analyzer");
/**
 * Pattern Recognition
 *
 * Identifies patterns in feedback data and generates insights
 */
class PatternRecognition {
    feedbackAnalyzer = (0, feedback_analyzer_1.getFeedbackAnalyzer)();
    /**
     * Identify patterns from interactions
     */
    async identifyPatterns(interactions) {
        if (interactions.length < types_1.EVOLUTION_RULES.learningTriggers.minInteractionsForPattern) {
            logger_1.log.info('[PatternRecognition] Not enough interactions', {
                count: interactions.length,
                required: types_1.EVOLUTION_RULES.learningTriggers.minInteractionsForPattern
            });
            return [];
        }
        const patterns = [];
        // Pattern 1: Low satisfaction by topic
        patterns.push(...this.identifyLowSatisfactionTopics(interactions));
        // Pattern 2: High satisfaction patterns
        patterns.push(...this.identifyHighSatisfactionPatterns(interactions));
        // Pattern 3: Common corrections
        patterns.push(...this.identifyCommonCorrections(interactions));
        // Pattern 4: Tone feedback
        patterns.push(...this.identifyToneFeedback(interactions));
        logger_1.log.info('[PatternRecognition] Patterns identified', {
            total: patterns.length,
            actionable: patterns.filter(p => p.actionable).length
        });
        return patterns;
    }
    /**
     * Identify topics with consistently low satisfaction
     */
    identifyLowSatisfactionTopics(interactions) {
        const patterns = [];
        const topicScores = {};
        // Group by topic
        for (const interaction of interactions) {
            const topic = this.feedbackAnalyzer.extractTopic(interaction.userInput);
            if (!topicScores[topic]) {
                topicScores[topic] = [];
            }
            topicScores[topic].push(interaction.satisfactionScore);
        }
        // Find low satisfaction topics
        for (const [topic, scores] of Object.entries(topicScores)) {
            if (scores.length < 3)
                continue; // Need at least 3 samples
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avgScore < types_1.EVOLUTION_RULES.learningTriggers.satisfactionThresholdLow) {
                const examples = interactions.filter(i => this.feedbackAnalyzer.extractTopic(i.userInput) === topic).slice(0, 3);
                patterns.push({
                    type: 'low_satisfaction',
                    topic,
                    avgScore,
                    sampleCount: scores.length,
                    examples,
                    actionable: true
                });
            }
        }
        return patterns;
    }
    /**
     * Identify patterns that lead to high satisfaction
     */
    identifyHighSatisfactionPatterns(interactions) {
        const patterns = [];
        const highSatisfactionInteractions = interactions.filter(i => i.satisfactionScore >= types_1.EVOLUTION_RULES.learningTriggers.satisfactionThresholdHigh);
        if (highSatisfactionInteractions.length >= 5) {
            // Analyze what makes these interactions successful
            const topics = highSatisfactionInteractions.map(i => this.feedbackAnalyzer.extractTopic(i.userInput));
            const topicCounts = {};
            for (const topic of topics) {
                topicCounts[topic] = (topicCounts[topic] || 0) + 1;
            }
            // Find most successful topic
            const bestTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0];
            if (bestTopic) {
                patterns.push({
                    type: 'high_satisfaction',
                    topic: bestTopic[0],
                    avgScore: highSatisfactionInteractions
                        .filter(i => this.feedbackAnalyzer.extractTopic(i.userInput) === bestTopic[0])
                        .reduce((sum, i) => sum + i.satisfactionScore, 0) / bestTopic[1],
                    sampleCount: bestTopic[1],
                    examples: highSatisfactionInteractions
                        .filter(i => this.feedbackAnalyzer.extractTopic(i.userInput) === bestTopic[0])
                        .slice(0, 3),
                    actionable: true
                });
            }
        }
        return patterns;
    }
    /**
     * Identify common correction patterns
     */
    identifyCommonCorrections(interactions) {
        const patterns = [];
        const corrections = interactions.filter(i => i.followUp && this.feedbackAnalyzer.isCorrection(i.followUp));
        if (corrections.length >= types_1.EVOLUTION_RULES.learningTriggers.correctionFrequencyAlert) {
            // Extract correction patterns
            const correctionPatterns = {};
            for (const correction of corrections) {
                const pattern = this.feedbackAnalyzer.extractCorrectionPattern(correction.ulfResponse, correction.followUp);
                if (!correctionPatterns[pattern.type]) {
                    correctionPatterns[pattern.type] = [];
                }
                correctionPatterns[pattern.type].push(correction);
            }
            // Create patterns for frequent correction types
            for (const [type, examples] of Object.entries(correctionPatterns)) {
                if (examples.length >= 2) {
                    patterns.push({
                        type: 'correction',
                        topic: type,
                        sampleCount: examples.length,
                        examples: examples.slice(0, 3),
                        actionable: true
                    });
                }
            }
        }
        return patterns;
    }
    /**
     * Identify tone-related feedback
     */
    identifyToneFeedback(interactions) {
        const patterns = [];
        const toneRelatedKeywords = [
            'tom', 'tone', 'formal', 'casual', 'técnico', 'technical',
            'simples', 'simple', 'complexo', 'complex'
        ];
        const toneFeedback = interactions.filter(i => i.followUp && toneRelatedKeywords.some(kw => i.followUp.toLowerCase().includes(kw)));
        if (toneFeedback.length >= 2) {
            patterns.push({
                type: 'tone',
                sampleCount: toneFeedback.length,
                examples: toneFeedback.slice(0, 3),
                actionable: true
            });
        }
        return patterns;
    }
    /**
     * Generate learning insights from patterns
     */
    async generateInsights(patterns) {
        const insights = [];
        for (const pattern of patterns) {
            if (!pattern.actionable)
                continue;
            let insight = null;
            switch (pattern.type) {
                case 'low_satisfaction':
                    insight = {
                        insightType: 'topic',
                        content: `Baixa satisfação em "${pattern.topic}" (score: ${pattern.avgScore?.toFixed(2)}). ` +
                            `Revisar abordagem para este tópico.`,
                        confidenceScore: pattern.sampleCount >= 5 ? 0.8 : 0.6,
                        applied: false,
                        createdAt: new Date().toISOString(),
                        metadata: {
                            topic: pattern.topic,
                            avgScore: pattern.avgScore,
                            sampleCount: pattern.sampleCount
                        }
                    };
                    break;
                case 'high_satisfaction':
                    insight = {
                        insightType: 'pattern',
                        content: `Alta satisfação em "${pattern.topic}" (score: ${pattern.avgScore?.toFixed(2)}). ` +
                            `Replicar esta abordagem para outros tópicos.`,
                        confidenceScore: 0.9,
                        applied: false,
                        createdAt: new Date().toISOString(),
                        metadata: {
                            topic: pattern.topic,
                            avgScore: pattern.avgScore,
                            sampleCount: pattern.sampleCount
                        }
                    };
                    break;
                case 'correction':
                    insight = {
                        insightType: 'correction',
                        content: `Correções frequentes sobre "${pattern.topic}". ` +
                            `Ajustar comportamento para reduzir erros.`,
                        confidenceScore: 0.85,
                        applied: false,
                        createdAt: new Date().toISOString(),
                        metadata: {
                            correctionType: pattern.topic,
                            sampleCount: pattern.sampleCount
                        }
                    };
                    break;
                case 'tone':
                    insight = {
                        insightType: 'tone',
                        content: `Feedback sobre tom de resposta. ` +
                            `Ajustar nível de formalidade/casualidade.`,
                        confidenceScore: 0.7,
                        applied: false,
                        createdAt: new Date().toISOString(),
                        metadata: {
                            sampleCount: pattern.sampleCount
                        }
                    };
                    break;
            }
            if (insight) {
                insights.push(insight);
            }
        }
        logger_1.log.info('[PatternRecognition] Insights generated', {
            count: insights.length
        });
        return insights;
    }
    /**
     * Recommend specific improvements based on patterns
     */
    recommendImprovements(patterns) {
        const recommendations = [];
        for (const pattern of patterns) {
            switch (pattern.type) {
                case 'low_satisfaction':
                    recommendations.push(`📚 Estudar mais sobre "${pattern.topic}" para melhorar respostas`);
                    recommendations.push(`🔍 Buscar exemplos de boas respostas sobre "${pattern.topic}"`);
                    break;
                case 'correction':
                    if (pattern.topic === 'tone') {
                        recommendations.push('🎭 Ajustar tom das respostas (mais casual/formal)');
                    }
                    else if (pattern.topic === 'length') {
                        recommendations.push('📏 Ajustar tamanho das respostas (mais conciso/detalhado)');
                    }
                    else if (pattern.topic === 'technical') {
                        recommendations.push('🔧 Melhorar precisão técnica das respostas');
                    }
                    break;
                case 'high_satisfaction':
                    recommendations.push(`✨ Replicar abordagem de "${pattern.topic}" para outros tópicos`);
                    break;
            }
        }
        return [...new Set(recommendations)]; // Remove duplicates
    }
}
exports.PatternRecognition = PatternRecognition;
// Export singleton
let patternRecognitionInstance = null;
function getPatternRecognition() {
    if (!patternRecognitionInstance) {
        patternRecognitionInstance = new PatternRecognition();
    }
    return patternRecognitionInstance;
}
