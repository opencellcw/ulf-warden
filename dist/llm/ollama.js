"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OllamaProvider = void 0;
exports.getOllamaProvider = getOllamaProvider;
const logger_1 = require("../logger");
const axios_1 = __importDefault(require("axios"));
/**
 * Ollama Provider for Uncensored Models
 *
 * Supports any Ollama model including uncensored variants:
 * - wizard-vicuna-uncensored
 * - dolphin-mistral
 * - llama3-uncensored
 * - neural-chat-uncensored
 *
 * Install Ollama: curl -fsSL https://ollama.com/install.sh | sh
 * Pull model: ollama pull wizard-vicuna-uncensored:7b
 */
class OllamaProvider {
    name = 'ollama';
    baseUrl;
    modelName;
    constructor(baseUrl, modelName) {
        this.baseUrl = baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        this.modelName = modelName || process.env.OLLAMA_MODEL || 'wizard-vicuna-uncensored:7b';
    }
    async isAvailable() {
        // Check if Ollama is enabled
        const enabled = process.env.OLLAMA_ENABLED === 'true';
        if (!enabled) {
            logger_1.log.info('[Ollama] Ollama is disabled via config');
            return false;
        }
        try {
            // Check if Ollama server is running
            const response = await axios_1.default.get(`${this.baseUrl}/api/tags`, { timeout: 3000 });
            // Check if our model is available
            const models = response.data.models || [];
            const hasModel = models.some((m) => m.name.includes(this.modelName.split(':')[0]));
            if (!hasModel) {
                logger_1.log.warn('[Ollama] Model not found', {
                    model: this.modelName,
                    available: models.map((m) => m.name)
                });
                return false;
            }
            logger_1.log.info('[Ollama] Provider available', { model: this.modelName });
            return true;
        }
        catch (error) {
            logger_1.log.warn('[Ollama] Server not available', { error: error.message });
            return false;
        }
    }
    async generate(messages, options) {
        const startTime = Date.now();
        try {
            // Format prompt
            const prompt = this.formatPrompt(messages, options?.systemPrompt);
            logger_1.log.debug('[Ollama] Generating response', {
                model: this.modelName,
                promptLength: prompt.length
            });
            // Call Ollama API
            const response = await axios_1.default.post(`${this.baseUrl}/api/generate`, {
                model: this.modelName,
                prompt,
                stream: false,
                options: {
                    temperature: options?.temperature || 0.7,
                    num_predict: options?.maxTokens || 512,
                    top_p: 0.9,
                    repeat_penalty: 1.1
                }
            }, { timeout: 120000 } // 2 minute timeout for larger models
            );
            const content = response.data.response;
            const processingTime = Date.now() - startTime;
            logger_1.log.info('[Ollama] Generated response', {
                model: this.modelName,
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
            logger_1.log.error('[Ollama] Generation failed', {
                error: error.message,
                model: this.modelName
            });
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
        return Math.ceil(text.length / 4);
    }
    async generateWithTools(messages, tools, options) {
        throw new Error('Ollama models do not support native tool use. Use Claude API for tool-based tasks.');
    }
    /**
     * Get list of available models
     */
    async getAvailableModels() {
        try {
            const response = await axios_1.default.get(`${this.baseUrl}/api/tags`);
            return response.data.models.map((m) => m.name);
        }
        catch (error) {
            logger_1.log.error('[Ollama] Failed to get models', { error: error.message });
            return [];
        }
    }
    /**
     * Pull a new model (async operation)
     */
    async pullModel(modelName) {
        logger_1.log.info('[Ollama] Pulling model...', { model: modelName });
        try {
            await axios_1.default.post(`${this.baseUrl}/api/pull`, { name: modelName }, { timeout: 600000 } // 10 minute timeout for download
            );
            logger_1.log.info('[Ollama] Model pulled successfully', { model: modelName });
        }
        catch (error) {
            logger_1.log.error('[Ollama] Failed to pull model', { error: error.message });
            throw error;
        }
    }
    /**
     * Get model info
     */
    getModelInfo() {
        return {
            name: this.modelName,
            type: 'ollama-uncensored',
            capabilities: ['chat', 'uncensored', 'creative']
        };
    }
}
exports.OllamaProvider = OllamaProvider;
// Singleton instance
let ollamaProvider = null;
function getOllamaProvider() {
    if (!ollamaProvider) {
        ollamaProvider = new OllamaProvider();
    }
    return ollamaProvider;
}
