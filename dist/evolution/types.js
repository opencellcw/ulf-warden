"use strict";
/**
 * Evolution System Types
 *
 * Self-improvement and learning types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVOLUTION_RULES = exports.NEGATIVE_FOLLOWUP_WORDS = exports.POSITIVE_FOLLOWUP_WORDS = exports.REACTION_SCORES = void 0;
exports.REACTION_SCORES = {
    // Positive reactions
    '+1': 0.4,
    'thumbsup': 0.4,
    'heart': 0.5,
    'fire': 0.5,
    'star': 0.5,
    'white_check_mark': 0.4,
    'rocket': 0.5,
    'clap': 0.4,
    'raised_hands': 0.4,
    '100': 0.5,
    // Negative reactions
    '-1': -0.4,
    'thumbsdown': -0.4,
    'thinking_face': -0.2,
    'confused': -0.3,
    'x': -0.5,
    'warning': -0.3,
    'question': -0.2
};
exports.POSITIVE_FOLLOWUP_WORDS = [
    'obrigado', 'obrigada', 'thanks', 'thank you',
    'perfeito', 'perfect', 'exato', 'exactly',
    'ótimo', 'great', 'excelente', 'excellent',
    'funcionou', 'worked', 'resolveu', 'solved',
    'ajudou', 'helped', 'útil', 'useful'
];
exports.NEGATIVE_FOLLOWUP_WORDS = [
    'não', 'nao', 'no', 'errado', 'wrong',
    'incorreto', 'incorrect', 'melhor seria', 'better would be',
    'na verdade', 'actually', 'mas', 'but',
    'porém', 'however', 'não funcionou', 'didnt work',
    'não ajudou', 'didnt help'
];
exports.EVOLUTION_RULES = {
    learningTriggers: {
        minInteractionsForPattern: 5,
        satisfactionThresholdLow: 0.3,
        satisfactionThresholdHigh: 0.8,
        correctionFrequencyAlert: 3 // per week
    },
    autoImprovements: {
        enabled: true,
        requireApproval: true,
        backupBeforeChange: true,
        rollbackOnNegativeFeedback: true
    },
    feedbackWeights: {
        reactionWeight: 0.4,
        followUpWeight: 0.3,
        correctionWeight: 0.8,
        manualFeedbackWeight: 1.0
    }
};
