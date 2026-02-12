/**
 * Decision Intelligence System
 * 
 * Sistema de análise multi-perspectiva para decisões importantes
 * usando consenso de múltiplos LLMs (GPT-4, Claude, Gemini)
 */

export * from './types';
export * from './analyzer';
export * from './storage';
export * from './prompts';
export { 
  handleDecisionCommand, 
  isDecisionCommand,
  handleDecisionHistoryCommand,
  isDecisionHistoryCommand 
} from './discord-handler';

// Re-exports convenientes
export { getDecisionAnalyzer } from './analyzer';
export { getDecisionStorage } from './storage';
