"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolOutputSchemas = exports.OutputParser = exports.AgentResponseSchema = exports.ToolCallSchema = void 0;
const zod_1 = require("zod");
const logger_1 = require("../logger");
/**
 * Tool call schema matching Claude's tool use format
 */
exports.ToolCallSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    input: zod_1.z.record(zod_1.z.unknown())
});
/**
 * Agent response schema
 */
exports.AgentResponseSchema = zod_1.z.object({
    text: zod_1.z.string().optional(),
    toolCalls: zod_1.z.array(exports.ToolCallSchema).optional(),
    stopReason: zod_1.z.enum(['end_turn', 'tool_use', 'max_tokens', 'stop_sequence'])
});
/**
 * Parses and validates LLM output with comprehensive error handling
 */
class OutputParser {
    /**
     * Parse Claude API response into structured format
     */
    static parseClaudeResponse(response) {
        try {
            const toolCalls = [];
            // Extract tool uses from content blocks
            if (response.content) {
                for (const block of response.content) {
                    if (block.type === 'tool_use') {
                        toolCalls.push({
                            id: block.id,
                            name: block.name,
                            input: block.input
                        });
                    }
                }
            }
            // Extract text content
            const textBlocks = response.content?.filter((b) => b.type === 'text') || [];
            const text = textBlocks.map((b) => b.text).join('\n').trim();
            const parsed = {
                text: text || undefined,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                stopReason: response.stop_reason || 'end_turn'
            };
            // Validate with Zod
            return exports.AgentResponseSchema.parse(parsed);
        }
        catch (error) {
            logger_1.log.error('[OutputParser] Failed to parse LLM output', { error, response });
            throw new Error(`Failed to parse LLM output: ${error}`);
        }
    }
    /**
     * Validate tool input against schema
     */
    static validateToolInput(toolName, input, schema) {
        if (!schema) {
            return true; // No schema means no validation required
        }
        try {
            schema.parse(input);
            return true;
        }
        catch (error) {
            logger_1.log.warn('[OutputParser] Tool input validation failed', { toolName, error });
            return false;
        }
    }
    /**
     * Parse and validate JSON with fallback
     */
    static parseJSON(text, schema) {
        try {
            const parsed = JSON.parse(text);
            return schema.parse(parsed);
        }
        catch (error) {
            logger_1.log.debug('[OutputParser] JSON parsing failed', { error, text: text.slice(0, 100) });
            return null;
        }
    }
    /**
     * Extract structured data from natural language using LLM
     */
    static async extractStructured(llm, text, schema, prompt) {
        const response = await llm.chat([
            {
                role: 'user',
                content: `${prompt}\n\nText: ${text}\n\nRespond with valid JSON only.`
            }
        ]);
        const extracted = this.parseJSON(response.text, schema);
        if (!extracted) {
            throw new Error('Failed to extract structured data');
        }
        return extracted;
    }
}
exports.OutputParser = OutputParser;
/**
 * Schemas for common tool outputs
 */
exports.ToolOutputSchemas = {
    fileContent: zod_1.z.object({
        path: zod_1.z.string(),
        content: zod_1.z.string(),
        size: zod_1.z.number(),
        modified: zod_1.z.string()
    }),
    processInfo: zod_1.z.object({
        pid: zod_1.z.number(),
        name: zod_1.z.string(),
        status: zod_1.z.enum(['running', 'stopped', 'error']),
        uptime: zod_1.z.number()
    }),
    searchResult: zod_1.z.object({
        query: zod_1.z.string(),
        results: zod_1.z.array(zod_1.z.object({
            title: zod_1.z.string(),
            url: zod_1.z.string(),
            snippet: zod_1.z.string()
        })),
        totalResults: zod_1.z.number()
    })
};
