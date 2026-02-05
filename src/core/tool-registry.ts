import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { log } from '../logger';

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  examples?: Array<{ input: any; output: any }>;
  tags?: string[];
  enabled: boolean;
  security: {
    idempotent: boolean;
    requiresApproval: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
}

export interface ToolContext {
  userId: string;
  userRequest: string;
  sessionId?: string;
}

export interface ToolHandler {
  metadata: ToolMetadata;
  execute: (input: any, context: ToolContext) => Promise<any>;
}

export class ToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();
  private initialized: boolean = false;

  /**
   * Register a tool manually
   */
  register(handler: ToolHandler): void {
    if (this.tools.has(handler.metadata.name)) {
      log.warn('[ToolRegistry] Tool already registered, overwriting', {
        name: handler.metadata.name
      });
    }

    this.tools.set(handler.metadata.name, handler);
    log.info('[ToolRegistry] Tool registered', {
      name: handler.metadata.name,
      category: handler.metadata.category,
      riskLevel: handler.metadata.security.riskLevel
    });
  }

  /**
   * Auto-discover and load tools from filesystem
   */
  async autoDiscover(toolsDir: string): Promise<void> {
    try {
      log.info('[ToolRegistry] Starting auto-discovery', { toolsDir });

      const files = await fs.readdir(toolsDir);
      let discovered = 0;

      for (const file of files) {
        if (!file.endsWith('.ts') && !file.endsWith('.js')) {
          continue;
        }

        // Skip utility files
        if (file === 'index.ts' || file === 'index.js' ||
            file === 'definitions.ts' || file === 'definitions.js' ||
            file === 'executor.ts' || file === 'executor.js') {
          continue;
        }

        const filePath = path.join(toolsDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isDirectory()) {
          // Recursively load subdirectories
          await this.autoDiscover(filePath);
        } else {
          const loaded = await this.loadTool(filePath);
          if (loaded) discovered++;
        }
      }

      this.initialized = true;
      log.info('[ToolRegistry] Auto-discovery complete', {
        totalTools: this.tools.size,
        discovered
      });
    } catch (error) {
      log.error('[ToolRegistry] Auto-discovery failed', { error, toolsDir });
      throw error;
    }
  }

  /**
   * Load a single tool file
   */
  private async loadTool(filePath: string): Promise<boolean> {
    try {
      const module = await import(filePath);

      // Look for exported handler
      if (module.toolHandler && typeof module.toolHandler === 'object') {
        // Validate handler structure
        if (!module.toolHandler.metadata || !module.toolHandler.execute) {
          log.warn('[ToolRegistry] Invalid tool handler structure', { filePath });
          return false;
        }

        this.register(module.toolHandler);
        return true;
      } else {
        log.debug('[ToolRegistry] No tool handler found', { filePath });
        return false;
      }
    } catch (error) {
      log.warn('[ToolRegistry] Failed to load tool', { filePath, error });
      return false;
    }
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolHandler[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): ToolHandler[] {
    return this.getAllTools().filter(t => t.metadata.category === category);
  }

  /**
   * Get tools by tag
   */
  getToolsByTag(tag: string): ToolHandler[] {
    return this.getAllTools().filter(t =>
      t.metadata.tags?.includes(tag)
    );
  }

  /**
   * Get tools by risk level
   */
  getToolsByRiskLevel(riskLevel: string): ToolHandler[] {
    return this.getAllTools().filter(t =>
      t.metadata.security.riskLevel === riskLevel
    );
  }

  /**
   * Get enabled tools for Claude API
   */
  getEnabledToolDefinitions(): any[] {
    return this.getAllTools()
      .filter(t => t.metadata.enabled)
      .map(t => ({
        name: t.metadata.name,
        description: t.metadata.description,
        input_schema: this.convertZodToJsonSchema(t.metadata.inputSchema)
      }));
  }

  /**
   * Convert Zod schema to JSON Schema for Claude API
   */
  private convertZodToJsonSchema(schema?: z.ZodSchema): any {
    if (!schema) {
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }

    // Use zod-to-json-schema for proper conversion
    try {
      // Cast to any to avoid TypeScript infinite depth issues
      const jsonSchema: any = zodToJsonSchema(schema as any, {
        name: undefined,
        target: 'openApi3',
        $refStrategy: 'none'
      });

      // Remove $schema field as Claude API doesn't need it
      const { $schema, ...cleanSchema } = jsonSchema;

      return cleanSchema;
    } catch (error) {
      log.error('[ToolRegistry] Failed to convert Zod schema to JSON Schema', {
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

  /**
   * Enable/disable a tool
   */
  setToolEnabled(name: string, enabled: boolean): void {
    const tool = this.getTool(name);
    if (tool) {
      tool.metadata.enabled = enabled;
      log.info('[ToolRegistry] Tool status changed', { name, enabled });
    } else {
      log.warn('[ToolRegistry] Tool not found', { name });
    }
  }

  /**
   * Execute a tool with context
   */
  async execute(name: string, input: any, context: ToolContext): Promise<any> {
    const tool = this.getTool(name);

    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    if (!tool.metadata.enabled) {
      throw new Error(`Tool is disabled: ${name}`);
    }

    // Validate input if schema provided
    if (tool.metadata.inputSchema) {
      try {
        tool.metadata.inputSchema.parse(input);
      } catch (error) {
        log.error('[ToolRegistry] Invalid input', { name, error });
        throw new Error(`Invalid input for tool ${name}: ${error}`);
      }
    }

    // Execute
    log.debug('[ToolRegistry] Executing tool', { name, userId: context.userId });
    const result = await tool.execute(input, context);

    // Validate output if schema provided
    if (tool.metadata.outputSchema) {
      try {
        tool.metadata.outputSchema.parse(result);
      } catch (error) {
        log.warn('[ToolRegistry] Tool output validation failed', { name, error });
      }
    }

    return result;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    totalTools: number;
    enabledTools: number;
    byCategory: Record<string, number>;
    byRiskLevel: Record<string, number>;
  } {
    const tools = this.getAllTools();

    const byCategory: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};

    for (const tool of tools) {
      // Count by category
      byCategory[tool.metadata.category] = (byCategory[tool.metadata.category] || 0) + 1;

      // Count by risk level
      const risk = tool.metadata.security.riskLevel;
      byRiskLevel[risk] = (byRiskLevel[risk] || 0) + 1;
    }

    return {
      totalTools: tools.length,
      enabledTools: tools.filter(t => t.metadata.enabled).length,
      byCategory,
      byRiskLevel
    };
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
