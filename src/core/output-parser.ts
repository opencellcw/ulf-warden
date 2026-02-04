import { z } from 'zod';
import { log } from '../logger';

/**
 * Tool call schema matching Claude's tool use format
 */
export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.record(z.unknown())
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

/**
 * Agent response schema
 */
export const AgentResponseSchema = z.object({
  text: z.string().optional(),
  toolCalls: z.array(ToolCallSchema).optional(),
  stopReason: z.enum(['end_turn', 'tool_use', 'max_tokens', 'stop_sequence'])
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

/**
 * Parses and validates LLM output with comprehensive error handling
 */
export class OutputParser {
  /**
   * Parse Claude API response into structured format
   */
  static parseClaudeResponse(response: any): AgentResponse {
    try {
      const toolCalls: ToolCall[] = [];

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
      const textBlocks = response.content?.filter((b: any) => b.type === 'text') || [];
      const text = textBlocks.map((b: any) => b.text).join('\n').trim();

      const parsed: AgentResponse = {
        text: text || undefined,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        stopReason: response.stop_reason || 'end_turn'
      };

      // Validate with Zod
      return AgentResponseSchema.parse(parsed);
    } catch (error) {
      log.error('[OutputParser] Failed to parse LLM output', { error, response });
      throw new Error(`Failed to parse LLM output: ${error}`);
    }
  }

  /**
   * Validate tool input against schema
   */
  static validateToolInput(toolName: string, input: any, schema?: z.ZodSchema): boolean {
    if (!schema) {
      return true; // No schema means no validation required
    }

    try {
      schema.parse(input);
      return true;
    } catch (error) {
      log.warn('[OutputParser] Tool input validation failed', { toolName, error });
      return false;
    }
  }

  /**
   * Parse and validate JSON with fallback
   */
  static parseJSON<T>(text: string, schema: z.ZodSchema<T>): T | null {
    try {
      const parsed = JSON.parse(text);
      return schema.parse(parsed);
    } catch (error) {
      log.debug('[OutputParser] JSON parsing failed', { error, text: text.slice(0, 100) });
      return null;
    }
  }

  /**
   * Extract structured data from natural language using LLM
   */
  static async extractStructured<T>(
    llm: any,
    text: string,
    schema: z.ZodSchema<T>,
    prompt: string
  ): Promise<T> {
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

/**
 * Schemas for common tool outputs
 */
export const ToolOutputSchemas = {
  fileContent: z.object({
    path: z.string(),
    content: z.string(),
    size: z.number(),
    modified: z.string()
  }),

  processInfo: z.object({
    pid: z.number(),
    name: z.string(),
    status: z.enum(['running', 'stopped', 'error']),
    uptime: z.number()
  }),

  searchResult: z.object({
    query: z.string(),
    results: z.array(z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string()
    })),
    totalResults: z.number()
  })
};
