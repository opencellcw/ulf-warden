"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chat = chat;
const workspace_1 = require("./workspace");
const llm_1 = require("./llm");
const logger_1 = require("./logger");
// Router will intelligently choose between Claude and local model
const router = (0, llm_1.getRouter)();
async function chat(options) {
    const { userId, userMessage, history } = options;
    try {
        const systemPrompt = workspace_1.workspace.getSystemPrompt();
        // Build message history
        const messages = [
            ...history,
            {
                role: 'user',
                content: userMessage,
            },
        ];
        logger_1.log.info('[Chat] Processing message', {
            userId,
            preview: userMessage.substring(0, 50)
        });
        // Convert to LLM format
        const llmMessages = (0, llm_1.toLLMMessages)(messages);
        // Use router for intelligent model selection
        const response = await router.generate(llmMessages, {
            maxTokens: 4096,
            systemPrompt,
            temperature: 0.7
        });
        logger_1.log.info('[Chat] Response generated', {
            userId,
            model: response.model,
            preview: response.content.substring(0, 50),
            processingTime: response.processingTime
        });
        return response.content;
    }
    catch (error) {
        logger_1.log.error('[Chat] Error generating response', { error });
        throw error;
    }
}
