/**
 * LLM Module - Dual-model architecture with intelligent routing
 *
 * Supports:
 * - Claude API (primary, full-featured)
 * - Local models (secondary, lightweight tasks)
 *
 * Usage:
 *   import { getRouter } from './llm';
 *   const router = getRouter();
 *   const response = await router.generate(messages, options);
 */

export * from './interface';
export * from './claude';
export * from './local';
export * from './router';

export { getRouter } from './router';
export { getClaudeProvider } from './claude';
export { getLocalProvider } from './local';
