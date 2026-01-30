"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalLLMProvider = void 0;
exports.getLocalProvider = getLocalProvider;
const transformers_1 = require("@xenova/transformers");
const logger_1 = require("../logger");
const path_1 = __importDefault(require("path"));
// Configure transformers.js
transformers_1.env.allowLocalModels = true;
transformers_1.env.allowRemoteModels = true;
transformers_1.env.useBrowserCache = false;
transformers_1.env.cacheDir = process.env.MODEL_CACHE_DIR || path_1.default.join(process.cwd(), '.cache', 'models');
/**
 * Local LLM Provider using transformers.js
 *
 * Supports lightweight models for CPU inference:
 * - Xenova/Phi-2 (2.7B params, ~5GB)
 * - Xenova/TinyLlama-1.1B-Chat-v1.0 (1.1B params, ~2GB)
 * - Xenova/LaMini-Flan-T5-783M (783M params, ~1.5GB)
 */
class LocalLLMProvider {
    name = 'local-llm';
    generator = null;
    modelName;
    initialized = false;
    initializationError = null;
    constructor(modelName) {
        // Default to a small, efficient model
        this.modelName = modelName || process.env.LOCAL_MODEL_NAME || 'Xenova/LaMini-Flan-T5-783M';
    }
    async isAvailable() {
        // If already initialized successfully
        if (this.initialized && this.generator) {
            return true;
        }
        // If initialization failed before
        if (this.initializationError) {
            return false;
        }
        // Check if local model is enabled
        const enabled = process.env.LOCAL_LLM_ENABLED === 'true';
        if (!enabled) {
            logger_1.log.info('[LocalLLM] Local LLM is disabled via config');
            return false;
        }
        // Try to initialize
        try {
            await this.initialize();
            return true;
        }
        catch (error) {
            logger_1.log.warn('[LocalLLM] Local model not available', { error });
            return false;
        }
    }
    async initialize() {
        if (this.initialized)
            return;
        try {
            logger_1.log.info('[LocalLLM] Initializing local model...', { model: this.modelName });
            const startTime = Date.now();
            // Create text-generation pipeline
            this.generator = await (0, transformers_1.pipeline)('text2text-generation', this.modelName, {
                revision: 'main'
            });
            const initTime = Date.now() - startTime;
            this.initialized = true;
            logger_1.log.info('[LocalLLM] Model initialized successfully', {
                model: this.modelName,
                initTime: `${initTime}ms`
            });
        }
        catch (error) {
            this.initializationError = error;
            logger_1.log.error('[LocalLLM] Failed to initialize model', {
                model: this.modelName,
                error: error.message
            });
            throw error;
        }
    }
    async generate(messages, options) {
        const startTime = Date.now();
        // Ensure model is initialized
        if (!this.initialized) {
            await this.initialize();
        }
        if (!this.generator) {
            throw new Error('Local model not initialized');
        }
        try {
            // Format messages into a prompt
            const prompt = this.formatPrompt(messages, options?.systemPrompt);
            logger_1.log.debug('[LocalLLM] Generating response', {
                promptLength: prompt.length,
                maxTokens: options?.maxTokens || 512
            });
            // Generate response
            const result = await this.generator(prompt, {
                max_new_tokens: options?.maxTokens || 512,
                temperature: options?.temperature || 0.7,
                do_sample: true,
                top_p: 0.9,
                repetition_penalty: 1.2
            });
            const content = Array.isArray(result) ? result[0].generated_text : result.generated_text;
            const processingTime = Date.now() - startTime;
            logger_1.log.info('[LocalLLM] Generated response', {
                outputLength: content.length,
                processingTime: `${processingTime}ms`
            });
            return {
                content: content.trim(),
                model: this.modelName,
                processingTime,
                usage: {
                    inputTokens: this.estimateTokens(prompt),
                    outputTokens: this.estimateTokens(content)
                }
            };
        }
        catch (error) {
            logger_1.log.error('[LocalLLM] Generation failed', { error: error.message });
            throw error;
        }
    }
    formatPrompt(messages, systemPrompt) {
        const parts = [];
        // Add system prompt if provided
        if (systemPrompt) {
            parts.push(`System: ${systemPrompt}\n`);
        }
        // Add conversation history
        for (const msg of messages) {
            if (msg.role === 'system' && !systemPrompt) {
                parts.push(`System: ${msg.content}\n`);
            }
            else if (msg.role === 'user') {
                parts.push(`User: ${msg.content}\n`);
            }
            else if (msg.role === 'assistant') {
                parts.push(`Assistant: ${msg.content}\n`);
            }
        }
        // Add prompt for assistant response
        parts.push('Assistant:');
        return parts.join('\n');
    }
    estimateTokens(text) {
        // Rough estimation: ~4 characters per token
        return Math.ceil(text.length / 4);
    }
    /**
     * Local models don't support tool use
     */
    async generateWithTools(messages, tools, options) {
        throw new Error('Local model does not support tool use. Use Claude API for tool-based tasks.');
    }
    /**
     * Get model information
     */
    getModelInfo() {
        const modelInfo = {
            'Xenova/LaMini-Flan-T5-783M': {
                size: '~1.5GB',
                capabilities: ['chat', 'summarization', 'q&a']
            },
            'Xenova/TinyLlama-1.1B-Chat-v1.0': {
                size: '~2GB',
                capabilities: ['chat', 'instruction-following']
            },
            'Xenova/Phi-2': {
                size: '~5GB',
                capabilities: ['chat', 'reasoning', 'code']
            }
        };
        const info = modelInfo[this.modelName] || {
            size: 'unknown',
            capabilities: ['chat']
        };
        return {
            name: this.modelName,
            ...info
        };
    }
    /**
     * Clear model from memory
     */
    async unload() {
        if (this.generator) {
            this.generator = null;
            this.initialized = false;
            logger_1.log.info('[LocalLLM] Model unloaded from memory');
        }
    }
}
exports.LocalLLMProvider = LocalLLMProvider;
// Singleton instance
let localProvider = null;
function getLocalProvider() {
    if (!localProvider) {
        localProvider = new LocalLLMProvider();
    }
    return localProvider;
}
