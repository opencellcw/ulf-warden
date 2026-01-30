"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeProvider = void 0;
exports.getClaudeProvider = getClaudeProvider;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_1 = require("../logger");
/**
 * Claude API Provider
 * Wraps Anthropic SDK to match LLMProvider interface
 */
class ClaudeProvider {
    name = 'claude';
    client;
    model;
    constructor(apiKey, model) {
        this.client = new sdk_1.default({
            apiKey: apiKey || process.env.ANTHROPIC_API_KEY
        });
        this.model = model || process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
    }
    async isAvailable() {
        // Check if API key is configured
        return !!process.env.ANTHROPIC_API_KEY;
    }
    async generate(messages, options) {
        const startTime = Date.now();
        try {
            // Convert LLMMessage to Anthropic format
            const anthropicMessages = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                role: m.role,
                content: m.content
            }));
            // Extract system messages
            const systemMessages = messages
                .filter(m => m.role === 'system')
                .map(m => m.content)
                .join('\n\n');
            const systemPrompt = options?.systemPrompt || systemMessages || undefined;
            logger_1.log.debug('[Claude] Generating response', {
                messageCount: anthropicMessages.length,
                maxTokens: options?.maxTokens || 4096
            });
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: options?.maxTokens || 4096,
                temperature: options?.temperature,
                system: systemPrompt,
                messages: anthropicMessages
            });
            const content = response.content
                .filter(block => block.type === 'text')
                .map(block => block.text)
                .join('\n\n');
            const processingTime = Date.now() - startTime;
            logger_1.log.info('[Claude] Generated response', {
                model: this.model,
                processingTime: `${processingTime}ms`,
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens
            });
            return {
                content,
                model: this.model,
                processingTime,
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens
                }
            };
        }
        catch (error) {
            logger_1.log.error('[Claude] Generation failed', { error: error.message });
            throw error;
        }
    }
    async generateWithTools(messages, tools, options) {
        const startTime = Date.now();
        try {
            // Convert LLMMessage to Anthropic format
            const anthropicMessages = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                role: m.role,
                content: m.content
            }));
            // Extract system messages
            const systemMessages = messages
                .filter(m => m.role === 'system')
                .map(m => m.content)
                .join('\n\n');
            const systemPrompt = options?.systemPrompt || systemMessages || undefined;
            logger_1.log.debug('[Claude] Generating response with tools', {
                messageCount: anthropicMessages.length,
                toolCount: tools.length,
                maxTokens: options?.maxTokens || 4096
            });
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: options?.maxTokens || 4096,
                temperature: options?.temperature,
                system: systemPrompt,
                messages: anthropicMessages,
                tools
            });
            // For tool use, return the full response including tool calls
            // The agent loop will handle tool execution
            const content = JSON.stringify(response.content);
            const processingTime = Date.now() - startTime;
            logger_1.log.info('[Claude] Generated response with tools', {
                model: this.model,
                stopReason: response.stop_reason,
                processingTime: `${processingTime}ms`,
                inputTokens: response.usage.input_tokens,
                outputTokens: response.usage.output_tokens
            });
            return {
                content,
                model: this.model,
                processingTime,
                usage: {
                    inputTokens: response.usage.input_tokens,
                    outputTokens: response.usage.output_tokens
                }
            };
        }
        catch (error) {
            logger_1.log.error('[Claude] Tool generation failed', { error: error.message });
            throw error;
        }
    }
    /**
     * Get the underlying Anthropic client for direct API access
     */
    getClient() {
        return this.client;
    }
    /**
     * Get current model name
     */
    getModel() {
        return this.model;
    }
}
exports.ClaudeProvider = ClaudeProvider;
// Singleton instance
let claudeProvider = null;
function getClaudeProvider() {
    if (!claudeProvider) {
        claudeProvider = new ClaudeProvider();
    }
    return claudeProvider;
}
