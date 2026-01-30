"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelStrategy = exports.TaskType = void 0;
exports.toLLMMessage = toLLMMessage;
exports.toLLMMessages = toLLMMessages;
/**
 * Convert Anthropic MessageParam to unified LLMMessage
 */
function toLLMMessage(message) {
    if (typeof message === 'string') {
        return { role: 'user', content: message };
    }
    let content = '';
    if (typeof message.content === 'string') {
        content = message.content;
    }
    else if (Array.isArray(message.content)) {
        content = message.content
            .map(block => {
            if (typeof block === 'string')
                return block;
            // Handle text blocks
            if (typeof block === 'object' && block !== null) {
                if ('text' in block)
                    return block.text;
                if ('type' in block && block.type === 'text' && 'text' in block) {
                    return block.text;
                }
            }
            return '';
        })
            .join('\n');
    }
    return {
        role: message.role,
        content
    };
}
/**
 * Convert array of MessageParam to LLMMessage[]
 */
function toLLMMessages(messages) {
    return messages.map(toLLMMessage);
}
/**
 * Task types for routing decisions
 */
var TaskType;
(function (TaskType) {
    // Complex tasks - use Claude API
    TaskType["TOOL_USE"] = "tool_use";
    TaskType["CODE_GENERATION"] = "code_generation";
    TaskType["COMPLEX_REASONING"] = "complex_reasoning";
    // Simple tasks - can use local model
    TaskType["SIMPLE_CHAT"] = "simple_chat";
    TaskType["TEXT_CLASSIFICATION"] = "text_classification";
    TaskType["SUMMARIZATION"] = "summarization";
    TaskType["TRANSLATION"] = "translation";
    // Fallback
    TaskType["UNKNOWN"] = "unknown";
})(TaskType || (exports.TaskType = TaskType = {}));
/**
 * Model selection strategy
 */
var ModelStrategy;
(function (ModelStrategy) {
    ModelStrategy["CLAUDE_ONLY"] = "claude_only";
    ModelStrategy["LOCAL_ONLY"] = "local_only";
    ModelStrategy["HYBRID"] = "hybrid";
    ModelStrategy["LOCAL_FALLBACK"] = "local_fallback"; // Try local first, fallback to Claude
})(ModelStrategy || (exports.ModelStrategy = ModelStrategy = {}));
