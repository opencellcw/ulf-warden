/**
 * Bot Factory - Unified Export
 */

export * from './types';
export * from './executor';
export * from './bot-runtime';
export * from './tools';
export * from './deployer';
export * from './pi-awareness-prompt';
export * from './pi-skills-loader';

// Initialize skills on import
import { initializePiSkills } from './pi-skills-loader';

// Auto-initialize skills (async, non-blocking)
initializePiSkills().catch(err => {
  console.warn('[Bot Factory] Failed to initialize Pi skills:', err.message);
});
