/**
 * LLM Module - Multi-model architecture with intelligent routing
 *
 * Supports:
 * - Claude API (Anthropic)
 * - Moonshot AI (Kimi K2.5)
 * - Local models (transformers.js)
 * - Ollama (self-hosted)
 *
 * Usage:
 *   import { getRouter } from './llm';
 *   const router = getRouter();
 *   const response = await router.generate(messages, options);
 */

export * from './interface';
export * from './claude';
export * from './moonshot-provider';
export * from './local';
export * from './router';

export { getRouter } from './router';
export { getClaudeProvider } from './claude';
export { getMoonshotProvider } from './moonshot-provider';
export { getLocalProvider } from './local';
