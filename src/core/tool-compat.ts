import { toolRegistry, ToolContext } from './tool-registry';
import { executeTool as legacyExecuteTool } from '../tools';
import { TOOLS } from '../tools/definitions';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { log } from '../logger';
import { featureFlags, Feature } from './feature-flags';

/**
 * Compatibility layer between old and new tool systems
 *
 * This allows gradual migration from switch-based execution
 * to registry-based execution without breaking existing code.
 */
export class ToolCompatLayer {
  /**
   * Execute a tool using either new registry or legacy executor
   */
  async execute(
    toolName: string,
    input: any,
    userId: string,
    userRequest: string
  ): Promise<any> {
    // Check if tool registry feature is enabled
    if (!featureFlags.isEnabled(Feature.TOOL_REGISTRY)) {
      log.debug('[ToolCompat] Using legacy executor (feature disabled)', { toolName });
      return await legacyExecuteTool(toolName, input, userId, userRequest);
    }

    // Try new registry first
    const registeredTool = toolRegistry.getTool(toolName);

    if (registeredTool) {
      log.debug('[ToolCompat] Using new tool registry', { toolName });

      const context: ToolContext = { userId, userRequest };
      return await toolRegistry.execute(toolName, input, context);
    }

    // Fall back to legacy executor
    log.debug('[ToolCompat] Falling back to legacy executor', { toolName });
    return await legacyExecuteTool(toolName, input, userId, userRequest);
  }

  /**
   * Check if tool is available in either system
   */
  isToolAvailable(toolName: string): boolean {
    // Check new registry
    if (toolRegistry.getTool(toolName)) {
      return true;
    }

    // Check legacy system (tool exists in TOOLS array)
    return TOOLS.some(t => t.name === toolName);
  }

  /**
   * Get tool definition for Claude API
   */
  getToolDefinition(toolName: string): any {
    // Try new registry first
    const registeredTool = toolRegistry.getTool(toolName);

    if (registeredTool) {
      return {
        name: registeredTool.metadata.name,
        description: registeredTool.metadata.description,
        input_schema: this.convertZodToJsonSchema(registeredTool.metadata.inputSchema)
      };
    }

    // Fall back to legacy definitions
    return TOOLS.find((t: any) => t.name === toolName);
  }

  /**
   * Get all available tool definitions (merged from both systems)
   */
  getAllToolDefinitions(): any[] {
    const definitions: any[] = [];
    const seen = new Set<string>();

    // Get tools from new registry first (takes precedence)
    if (featureFlags.isEnabled(Feature.TOOL_REGISTRY)) {
      const newTools = toolRegistry.getEnabledToolDefinitions();
      for (const tool of newTools) {
        definitions.push(tool);
        seen.add(tool.name);
      }
    }

    // Add legacy tools that haven't been migrated yet
    for (const tool of TOOLS) {
      if (!seen.has(tool.name)) {
        definitions.push(tool);
      }
    }

    return definitions;
  }

  /**
   * Get migration status for all tools
   */
  getMigrationStatus(): {
    total: number;
    migrated: number;
    remaining: number;
    tools: Array<{
      name: string;
      migrated: boolean;
      category?: string;
      riskLevel?: string;
    }>;
  } {
    const allTools = TOOLS.map(t => t.name);
    const migratedTools = toolRegistry.getAllTools().map(t => t.metadata.name);

    const tools = allTools.map(name => {
      const isMigrated = migratedTools.includes(name);
      const registeredTool = toolRegistry.getTool(name);

      return {
        name,
        migrated: isMigrated,
        category: registeredTool?.metadata.category,
        riskLevel: registeredTool?.metadata.security.riskLevel
      };
    });

    return {
      total: allTools.length,
      migrated: migratedTools.length,
      remaining: allTools.length - migratedTools.length,
      tools
    };
  }

  /**
   * Helper: Convert Zod schema to JSON Schema
   */
  private convertZodToJsonSchema(schema?: any): any {
    if (!schema) {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    // Use zod-to-json-schema for proper conversion
    try {
      const jsonSchema = zodToJsonSchema(schema, {
        name: undefined, // Don't include $schema or definitions
        target: 'openApi3', // OpenAPI 3.0 compatible format
        $refStrategy: 'none' // Inline all references
      });

      // Remove $schema field as Claude API doesn't need it
      const { $schema, ...cleanSchema } = jsonSchema as any;

      return cleanSchema;
    } catch (error) {
      log.error('[ToolCompat] Failed to convert Zod schema to JSON Schema', {
        error: error instanceof Error ? error.message : String(error)
      });

      // Fallback to permissive schema
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }
  }
}

// Singleton instance
export const toolCompat = new ToolCompatLayer();
