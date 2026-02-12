/**
 * RoundTable Multi-Agent System
 * 
 * Deliberative decision-making with multiple specialized agents.
 * Based on "RoundTable: Investigating Group Decision-Making in Multi-Agent Collaboration"
 * 
 * Usage:
 *   import { getRoundTableOrchestrator, DEFAULT_PERSONAS } from './roundtable';
 *   
 *   const orchestrator = getRoundTableOrchestrator(llmProvider);
 *   const result = await orchestrator.run({
 *     topic: "Should we use MongoDB or PostgreSQL?",
 *     maxRounds: 3,
 *     votingRule: 'majority',
 *     agents: DEFAULT_PERSONAS,
 *     userId: 'user123'
 *   });
 */

export * from './types';
export * from './personas';
export * from './core';
export * from './phases/message-phase';
export * from './phases/proposal-phase';
export * from './phases/voting-phase';

export { RoundTableOrchestrator, getRoundTableOrchestrator } from './core';
export { 
  DEFAULT_PERSONAS, 
  FULL_PERSONAS, 
  COMPACT_PERSONAS,
  suggestTeam,
  getPersona,
  getPersonas
} from './personas';
