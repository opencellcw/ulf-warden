/**
 * Enhanced Tool Registry with Versioning, Dependencies & Validation
 *
 * Features:
 * - Semantic versioning (semver) for tools
 * - Dependency resolution between tools
 * - JSON Schema validation
 * - Tool compatibility checks
 * - Deprecation warnings
 * - Enhanced auto-discovery
 */

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import * as semver from 'semver';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { log } from '../logger';

// System version (for compatibility checks)
export const SYSTEM_VERSION = '1.0.0';

export interface ToolVersion {
  current: string; // Semantic version (e.g., "1.2.3")
  deprecated?: boolean;
  deprecationMessage?: string;
  minimumSystemVersion?: string; // Minimum required system version
  maximumSystemVersion?: string; // Maximum compatible system version
}

export interface ToolDependency {
  toolName: string;
  versionRange: string; // Semver range (e.g., "^1.0.0", ">=2.0.0 <3.0.0")
  optional?: boolean;
}

export interface ToolMetadata {
  name: string;
  description: string;
  category: string;
  version: ToolVersion;
  dependencies?: ToolDependency[];
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;
  examples?: Array<{ input: any; output: any; description?: string }>;
  tags?: string[];
  enabled: boolean;
  security: {
    idempotent: boolean;
    requiresApproval: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    permissions?: string[]; // Required permissions
  };
  performance?: {
    estimatedDuration?: number; // ms
    maxConcurrent?: number; // Max concurrent executions
  };
  author?: string;
  license?: string;
  repository?: string;
}

export interface ToolContext {
  userId: string;
  userRequest: string;
  sessionId?: string;
  permissions?: string[];
}

export interface ToolHandler {
  metadata: ToolMetadata;
  execute: (input: any, context: ToolContext) => Promise<any>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class EnhancedToolRegistry {
  private tools: Map<string, ToolHandler> = new Map();
  private toolGraph: Map<string, Set<string>> = new Map(); // Dependency graph
  private initialized: boolean = false;
  private systemVersion: string = SYSTEM_VERSION;

  /**
   * Register a tool with validation
   */
  register(handler: ToolHandler): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Validate tool metadata
    const metadataValidation = this.validateToolMetadata(handler.metadata);
    result.errors.push(...metadataValidation.errors);
    result.warnings.push(...metadataValidation.warnings);

    if (metadataValidation.errors.length > 0) {
      result.valid = false;
      log.error('[ToolRegistry] Invalid tool metadata', {
        name: handler.metadata.name,
        errors: result.errors
      });
      return result;
    }

    // Check if tool already registered
    if (this.tools.has(handler.metadata.name)) {
      const existing = this.tools.get(handler.metadata.name)!;
      const newVersion = handler.metadata.version.current;
      const oldVersion = existing.metadata.version.current;

      // Check version compatibility
      if (semver.gt(newVersion, oldVersion)) {
        result.warnings.push(`Upgrading tool ${handler.metadata.name} from ${oldVersion} to ${newVersion}`);
      } else if (semver.lt(newVersion, oldVersion)) {
        result.warnings.push(`Downgrading tool ${handler.metadata.name} from ${oldVersion} to ${newVersion}`);
      } else {
        result.warnings.push(`Overwriting tool ${handler.metadata.name} at same version ${newVersion}`);
      }
    }

    // Check system compatibility
    const compatCheck = this.checkSystemCompatibility(handler.metadata.version);
    if (!compatCheck.compatible) {
      result.errors.push(compatCheck.reason!);
      result.valid = false;
      return result;
    }

    // Check deprecation
    if (handler.metadata.version.deprecated) {
      result.warnings.push(
        `Tool ${handler.metadata.name} is deprecated: ${handler.metadata.version.deprecationMessage || 'No reason provided'}`
      );
    }

    // Register tool
    this.tools.set(handler.metadata.name, handler);

    // Build dependency graph
    this.updateDependencyGraph(handler.metadata);

    log.info('[ToolRegistry] Tool registered', {
      name: handler.metadata.name,
      version: handler.metadata.version.current,
      category: handler.metadata.category,
      dependencies: handler.metadata.dependencies?.length || 0,
      deprecated: handler.metadata.version.deprecated
    });

    return result;
  }

  /**
   * Validate tool metadata structure
   */
  private validateToolMetadata(metadata: ToolMetadata): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Required fields
    if (!metadata.name) {
      result.errors.push('Tool name is required');
    }

    if (!metadata.description) {
      result.errors.push('Tool description is required');
    }

    if (!metadata.version?.current) {
      result.errors.push('Tool version is required');
    } else {
      // Validate semver
      if (!semver.valid(metadata.version.current)) {
        result.errors.push(`Invalid semantic version: ${metadata.version.current}`);
      }
    }

    // Validate version constraints
    if (metadata.version?.minimumSystemVersion && !semver.valid(metadata.version.minimumSystemVersion)) {
      result.errors.push(`Invalid minimum system version: ${metadata.version.minimumSystemVersion}`);
    }

    if (metadata.version?.maximumSystemVersion && !semver.valid(metadata.version.maximumSystemVersion)) {
      result.errors.push(`Invalid maximum system version: ${metadata.version.maximumSystemVersion}`);
    }

    // Validate dependencies
    if (metadata.dependencies) {
      for (const dep of metadata.dependencies) {
        if (!dep.toolName) {
          result.errors.push('Dependency must have toolName');
        }

        if (!dep.versionRange) {
          result.errors.push(`Dependency ${dep.toolName} must have versionRange`);
        } else {
          // Validate semver range
          if (!semver.validRange(dep.versionRange)) {
            result.errors.push(`Invalid version range for ${dep.toolName}: ${dep.versionRange}`);
          }
        }
      }
    }

    // Warn about missing schemas
    if (!metadata.inputSchema) {
      result.warnings.push('No input schema provided - validation will be skipped');
    }

    if (!metadata.outputSchema) {
      result.warnings.push('No output schema provided - validation will be skipped');
    }

    result.valid = result.errors.length === 0;
    return result;
  }

  /**
   * Check if tool is compatible with current system version
   */
  private checkSystemCompatibility(version: ToolVersion): { compatible: boolean; reason?: string } {
    // Check minimum version
    if (version.minimumSystemVersion) {
      if (semver.lt(this.systemVersion, version.minimumSystemVersion)) {
        return {
          compatible: false,
          reason: `Tool requires system version >=${version.minimumSystemVersion}, current: ${this.systemVersion}`
        };
      }
    }

    // Check maximum version
    if (version.maximumSystemVersion) {
      if (semver.gt(this.systemVersion, version.maximumSystemVersion)) {
        return {
          compatible: false,
          reason: `Tool requires system version <=${version.maximumSystemVersion}, current: ${this.systemVersion}`
        };
      }
    }

    return { compatible: true };
  }

  /**
   * Update dependency graph
   */
  private updateDependencyGraph(metadata: ToolMetadata): void {
    const deps = new Set<string>();

    if (metadata.dependencies) {
      for (const dep of metadata.dependencies) {
        deps.add(dep.toolName);
      }
    }

    this.toolGraph.set(metadata.name, deps);
  }

  /**
   * Resolve tool dependencies
   */
  resolveDependencies(toolName: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    const tool = this.tools.get(toolName);
    if (!tool) {
      result.errors.push(`Tool not found: ${toolName}`);
      result.valid = false;
      return result;
    }

    if (!tool.metadata.dependencies || tool.metadata.dependencies.length === 0) {
      return result; // No dependencies
    }

    // Check each dependency
    for (const dep of tool.metadata.dependencies) {
      const depTool = this.tools.get(dep.toolName);

      if (!depTool) {
        if (dep.optional) {
          result.warnings.push(`Optional dependency not found: ${dep.toolName}`);
        } else {
          result.errors.push(`Required dependency not found: ${dep.toolName}`);
          result.valid = false;
        }
        continue;
      }

      // Check version compatibility
      const depVersion = depTool.metadata.version.current;
      if (!semver.satisfies(depVersion, dep.versionRange)) {
        result.errors.push(
          `Dependency ${dep.toolName} version ${depVersion} does not satisfy range ${dep.versionRange}`
        );
        result.valid = false;
      }

      // Check if dependency is deprecated
      if (depTool.metadata.version.deprecated) {
        result.warnings.push(
          `Dependency ${dep.toolName} is deprecated: ${depTool.metadata.version.deprecationMessage}`
        );
      }

      // Check if dependency is enabled
      if (!depTool.metadata.enabled) {
        result.errors.push(`Dependency ${dep.toolName} is disabled`);
        result.valid = false;
      }
    }

    // Check for circular dependencies
    const circular = this.detectCircularDependencies(toolName);
    if (circular.length > 0) {
      result.errors.push(`Circular dependency detected: ${circular.join(' -> ')}`);
      result.valid = false;
    }

    return result;
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(toolName: string, visited: Set<string> = new Set(), path: string[] = []): string[] {
    if (path.includes(toolName)) {
      return [...path, toolName]; // Circular dependency found
    }

    if (visited.has(toolName)) {
      return []; // Already checked
    }

    visited.add(toolName);
    path.push(toolName);

    const deps = this.toolGraph.get(toolName);
    if (deps) {
      for (const dep of deps) {
        const circular = this.detectCircularDependencies(dep, visited, [...path]);
        if (circular.length > 0) {
          return circular;
        }
      }
    }

    return [];
  }

  /**
   * Auto-discover and load tools from filesystem
   */
  async autoDiscover(toolsDir: string): Promise<void> {
    try {
      log.info('[ToolRegistry] Starting enhanced auto-discovery', { toolsDir });

      const files = await this.discoverFiles(toolsDir);
      let discovered = 0;
      let failed = 0;

      for (const file of files) {
        const result = await this.loadTool(file);
        if (result.success) {
          discovered++;
        } else {
          failed++;
        }
      }

      this.initialized = true;
      log.info('[ToolRegistry] Auto-discovery complete', {
        totalTools: this.tools.size,
        discovered,
        failed
      });
    } catch (error) {
      log.error('[ToolRegistry] Auto-discovery failed', { error, toolsDir });
      throw error;
    }
  }

  /**
   * Recursively discover tool files
   */
  private async discoverFiles(dir: string, files: string[] = []): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules, dist, test directories
        if (!['node_modules', 'dist', 'test', 'tests', '__tests__'].includes(entry.name)) {
          await this.discoverFiles(fullPath, files);
        }
      } else if (entry.isFile()) {
        // Look for .ts and .js files
        if ((entry.name.endsWith('.ts') || entry.name.endsWith('.js')) &&
            !entry.name.endsWith('.test.ts') &&
            !entry.name.endsWith('.test.js') &&
            !entry.name.endsWith('.spec.ts') &&
            !entry.name.endsWith('.spec.js') &&
            !['index.ts', 'index.js', 'definitions.ts', 'definitions.js'].includes(entry.name)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  /**
   * Load a single tool file
   */
  private async loadTool(filePath: string): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const module = await import(filePath);

      // Look for exported handler
      if (module.toolHandler && typeof module.toolHandler === 'object') {
        // Validate handler structure
        if (!module.toolHandler.metadata || !module.toolHandler.execute) {
          log.warn('[ToolRegistry] Invalid tool handler structure', { filePath });
          return { success: false, errors: ['Invalid handler structure'] };
        }

        const result = this.register(module.toolHandler);
        if (!result.valid) {
          log.error('[ToolRegistry] Tool registration failed', {
            filePath,
            errors: result.errors
          });
          return { success: false, errors: result.errors };
        }

        // Log warnings
        if (result.warnings.length > 0) {
          log.warn('[ToolRegistry] Tool registered with warnings', {
            filePath,
            warnings: result.warnings
          });
        }

        return { success: true };
      } else {
        log.debug('[ToolRegistry] No tool handler found', { filePath });
        return { success: false, errors: ['No tool handler exported'] };
      }
    } catch (error) {
      log.warn('[ToolRegistry] Failed to load tool', { filePath, error });
      return { success: false, errors: [String(error)] };
    }
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolHandler | undefined {
    return this.tools.get(name);
  }

  /**
   * Get tool with version
   */
  getToolWithVersion(name: string, versionRange?: string): ToolHandler | undefined {
    const tool = this.tools.get(name);

    if (!tool) {
      return undefined;
    }

    if (versionRange) {
      const toolVersion = tool.metadata.version.current;
      if (!semver.satisfies(toolVersion, versionRange)) {
        return undefined;
      }
    }

    return tool;
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
   * Get enabled tools for Claude API
   */
  getEnabledToolDefinitions(): any[] {
    return this.getAllTools()
      .filter(t => t.metadata.enabled && !t.metadata.version.deprecated)
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

    try {
      // Use zod-to-json-schema library for proper conversion
      return zodToJsonSchema(schema, { target: 'openApi3' });
    } catch (error) {
      log.error('[ToolRegistry] Failed to convert Zod schema to JSON Schema', { error });
      return {
        type: 'object',
        properties: {},
        required: []
      };
    }
  }

  /**
   * Execute a tool with validation and dependency checks
   */
  async execute(name: string, input: any, context: ToolContext): Promise<any> {
    const tool = this.getTool(name);

    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    if (!tool.metadata.enabled) {
      throw new Error(`Tool is disabled: ${name}`);
    }

    // Check deprecation
    if (tool.metadata.version.deprecated) {
      log.warn('[ToolRegistry] Executing deprecated tool', {
        name,
        message: tool.metadata.version.deprecationMessage
      });
    }

    // Check dependencies
    const depCheck = this.resolveDependencies(name);
    if (!depCheck.valid) {
      throw new Error(`Dependency check failed for ${name}: ${depCheck.errors.join(', ')}`);
    }

    // Check permissions
    if (tool.metadata.security.permissions && context.permissions) {
      const hasPermissions = tool.metadata.security.permissions.every(p =>
        context.permissions?.includes(p)
      );

      if (!hasPermissions) {
        throw new Error(`Insufficient permissions for tool ${name}`);
      }
    }

    // Validate input
    if (tool.metadata.inputSchema) {
      try {
        tool.metadata.inputSchema.parse(input);
      } catch (error) {
        log.error('[ToolRegistry] Invalid input', { name, error });
        throw new Error(`Invalid input for tool ${name}: ${error}`);
      }
    }

    // Execute
    log.debug('[ToolRegistry] Executing tool', {
      name,
      version: tool.metadata.version.current,
      userId: context.userId
    });

    const startTime = Date.now();
    const result = await tool.execute(input, context);
    const duration = Date.now() - startTime;

    log.debug('[ToolRegistry] Tool execution complete', {
      name,
      duration
    });

    // Validate output
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
    deprecatedTools: number;
    byCategory: Record<string, number>;
    byRiskLevel: Record<string, number>;
    byVersion: Record<string, number>;
  } {
    const tools = this.getAllTools();

    const byCategory: Record<string, number> = {};
    const byRiskLevel: Record<string, number> = {};
    const byVersion: Record<string, number> = {};
    let deprecatedCount = 0;

    for (const tool of tools) {
      byCategory[tool.metadata.category] = (byCategory[tool.metadata.category] || 0) + 1;
      byRiskLevel[tool.metadata.security.riskLevel] = (byRiskLevel[tool.metadata.security.riskLevel] || 0) + 1;

      const majorVersion = semver.major(tool.metadata.version.current);
      byVersion[`v${majorVersion}`] = (byVersion[`v${majorVersion}`] || 0) + 1;

      if (tool.metadata.version.deprecated) {
        deprecatedCount++;
      }
    }

    return {
      totalTools: tools.length,
      enabledTools: tools.filter(t => t.metadata.enabled).length,
      deprecatedTools: deprecatedCount,
      byCategory,
      byRiskLevel,
      byVersion
    };
  }

  /**
   * Set tool enabled/disabled status
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
   * Mark tool as deprecated
   */
  deprecateTool(name: string, message?: string): void {
    const tool = this.getTool(name);
    if (tool) {
      tool.metadata.version.deprecated = true;
      tool.metadata.version.deprecationMessage = message || 'This tool is deprecated';
      log.warn('[ToolRegistry] Tool deprecated', { name, message });
    } else {
      log.warn('[ToolRegistry] Tool not found', { name });
    }
  }

  /**
   * Check if registry is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Singleton instance
export const enhancedToolRegistry = new EnhancedToolRegistry();
