/**
 * Enhanced Tool Registry with Versioning, Dependencies, and Validation
 *
 * Features:
 * - Semantic versioning (semver)
 * - Dependency resolution
 * - JSON Schema validation
 * - Auto-discovery
 * - Deprecation warnings
 * - Compatibility checks
 * - Tool registry API
 */

import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import semver from 'semver';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { log } from '../logger';

export interface ToolVersion {
  version: string; // Semver format: 1.0.0
  deprecated?: boolean;
  deprecationMessage?: string;
  replacedBy?: string; // Tool name that replaces this one
  minEngineVersion?: string; // Min system version required
  maxEngineVersion?: string; // Max system version supported
}

export interface ToolDependency {
  name: string;
  version: string; // Semver range: ^1.0.0, >=2.0.0, etc
  optional?: boolean;
}

export interface EnhancedToolMetadata {
  // Basic info
  name: string;
  description: string;
  category: string;

  // Versioning
  version: string; // Current version (semver)
  versionHistory?: ToolVersion[]; // Previous versions

  // Dependencies
  dependencies?: ToolDependency[];

  // Schemas
  inputSchema?: z.ZodSchema;
  outputSchema?: z.ZodSchema;

  // Documentation
  examples?: Array<{ input: any; output: any; description?: string }>;
  tags?: string[];
  documentation?: string; // URL or markdown

  // Status
  enabled: boolean;
  deprecated?: boolean;
  deprecationMessage?: string;

  // Security
  security: {
    idempotent: boolean;
    requiresApproval: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    permissions?: string[]; // Required permissions
  };

  // Metadata
  author?: string;
  license?: string;
  repository?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ToolContext {
  userId: string;
  userRequest: string;
  sessionId?: string;
}

export interface EnhancedToolHandler {
  metadata: EnhancedToolMetadata;
  execute: (input: any, context: ToolContext) => Promise<any>;
}

export interface ToolRegistrationResult {
  success: boolean;
  message: string;
  warnings?: string[];
  errors?: string[];
}

export interface ToolCompatibilityCheck {
  compatible: boolean;
  issues: string[];
  warnings: string[];
}

/**
 * Enhanced Tool Registry
 */
export class EnhancedToolRegistry {
  private tools: Map<string, Map<string, EnhancedToolHandler>> = new Map(); // name -> version -> handler
  private initialized: boolean = false;
  private engineVersion: string = '1.0.0'; // System version

  constructor(engineVersion?: string) {
    if (engineVersion) {
      this.engineVersion = engineVersion;
    }
  }

  /**
   * Register a tool with version checking
   */
  register(handler: EnhancedToolHandler): ToolRegistrationResult {
    const { name, version } = handler.metadata;
    const result: ToolRegistrationResult = {
      success: false,
      message: '',
      warnings: [],
      errors: [],
    };

    // Validate version format
    if (!semver.valid(version)) {
      result.errors!.push(`Invalid version format: ${version}. Must be semver (e.g., 1.0.0)`);
      result.message = 'Registration failed: Invalid version';
      return result;
    }

    // Check dependencies
    const depCheck = this.checkDependencies(handler.metadata);
    if (!depCheck.compatible && depCheck.issues.length > 0) {
      result.errors!.push(...depCheck.issues);
      result.message = 'Registration failed: Dependency issues';
      return result;
    }
    result.warnings!.push(...depCheck.warnings);

    // Check engine version compatibility
    const engineCheck = this.checkEngineCompatibility(handler.metadata);
    if (!engineCheck.compatible) {
      result.errors!.push(...engineCheck.issues);
      result.message = 'Registration failed: Engine incompatibility';
      return result;
    }
    result.warnings!.push(...engineCheck.warnings);

    // Register tool
    if (!this.tools.has(name)) {
      this.tools.set(name, new Map());
    }

    const versionMap = this.tools.get(name)!;

    if (versionMap.has(version)) {
      result.warnings!.push(`Tool ${name}@${version} already registered, overwriting`);
      log.warn('[ToolRegistry] Overwriting existing tool version', { name, version });
    }

    versionMap.set(version, handler);
    result.success = true;
    result.message = `Tool ${name}@${version} registered successfully`;

    // Deprecation warning
    if (handler.metadata.deprecated) {
      result.warnings!.push(
        `Tool ${name}@${version} is deprecated. ${handler.metadata.deprecationMessage || ''}`
      );
    }

    log.info('[ToolRegistry] Tool registered', {
      name,
      version,
      category: handler.metadata.category,
      riskLevel: handler.metadata.security.riskLevel,
      deprecated: handler.metadata.deprecated,
    });

    return result;
  }

  /**
   * Check tool dependencies
   */
  private checkDependencies(metadata: EnhancedToolMetadata): ToolCompatibilityCheck {
    const result: ToolCompatibilityCheck = {
      compatible: true,
      issues: [],
      warnings: [],
    };

    if (!metadata.dependencies || metadata.dependencies.length === 0) {
      return result;
    }

    for (const dep of metadata.dependencies) {
      const depTool = this.tools.get(dep.name);

      if (!depTool) {
        if (dep.optional) {
          result.warnings.push(`Optional dependency ${dep.name} not found`);
        } else {
          result.compatible = false;
          result.issues.push(`Required dependency ${dep.name} not found`);
        }
        continue;
      }

      // Check version compatibility
      const versions = Array.from(depTool.keys());
      const compatibleVersion = versions.find(v => semver.satisfies(v, dep.version));

      if (!compatibleVersion) {
        if (dep.optional) {
          result.warnings.push(
            `Optional dependency ${dep.name} version ${dep.version} not found. Available: ${versions.join(', ')}`
          );
        } else {
          result.compatible = false;
          result.issues.push(
            `Dependency ${dep.name} version ${dep.version} not satisfied. Available: ${versions.join(', ')}`
          );
        }
      }
    }

    return result;
  }

  /**
   * Check engine version compatibility
   */
  private checkEngineCompatibility(metadata: EnhancedToolMetadata): ToolCompatibilityCheck {
    const result: ToolCompatibilityCheck = {
      compatible: true,
      issues: [],
      warnings: [],
    };

    if (metadata.versionHistory) {
      const latestVersion = metadata.versionHistory[metadata.versionHistory.length - 1];

      if (latestVersion.minEngineVersion &&
          !semver.satisfies(this.engineVersion, `>=${latestVersion.minEngineVersion}`)) {
        result.compatible = false;
        result.issues.push(
          `Tool requires engine version >=${latestVersion.minEngineVersion}, but current is ${this.engineVersion}`
        );
      }

      if (latestVersion.maxEngineVersion &&
          !semver.satisfies(this.engineVersion, `<=${latestVersion.maxEngineVersion}`)) {
        result.compatible = false;
        result.issues.push(
          `Tool requires engine version <=${latestVersion.maxEngineVersion}, but current is ${this.engineVersion}`
        );
      }
    }

    return result;
  }

  /**
   * Get tool by name (latest version by default)
   */
  getTool(name: string, version?: string): EnhancedToolHandler | undefined {
    const versionMap = this.tools.get(name);
    if (!versionMap) return undefined;

    if (version) {
      return versionMap.get(version);
    }

    // Get latest non-deprecated version
    const versions = Array.from(versionMap.keys())
      .filter(v => !versionMap.get(v)!.metadata.deprecated)
      .sort(semver.rcompare);

    if (versions.length === 0) {
      // All versions deprecated, get the latest one
      const allVersions = Array.from(versionMap.keys()).sort(semver.rcompare);
      return versionMap.get(allVersions[0]);
    }

    return versionMap.get(versions[0]);
  }

  /**
   * Get all versions of a tool
   */
  getToolVersions(name: string): string[] {
    const versionMap = this.tools.get(name);
    if (!versionMap) return [];
    return Array.from(versionMap.keys()).sort(semver.rcompare);
  }

  /**
   * Get all tools (latest version of each)
   */
  getAllTools(): EnhancedToolHandler[] {
    const tools: EnhancedToolHandler[] = [];
    for (const name of this.tools.keys()) {
      const tool = this.getTool(name);
      if (tool) tools.push(tool);
    }
    return tools;
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): EnhancedToolHandler[] {
    return this.getAllTools().filter(t => t.metadata.category === category);
  }

  /**
   * Get tools by tag
   */
  getToolsByTag(tag: string): EnhancedToolHandler[] {
    return this.getAllTools().filter(t => t.metadata.tags?.includes(tag));
  }

  /**
   * Get deprecated tools
   */
  getDeprecatedTools(): EnhancedToolHandler[] {
    return this.getAllTools().filter(t => t.metadata.deprecated);
  }

  /**
   * Get enabled tool definitions for Claude API
   */
  getEnabledToolDefinitions(): any[] {
    return this.getAllTools()
      .filter(t => t.metadata.enabled && !t.metadata.deprecated)
      .map(t => ({
        name: t.metadata.name,
        description: t.metadata.description,
        input_schema: this.convertZodToJsonSchema(t.metadata.inputSchema),
      }));
  }

  /**
   * Convert Zod schema to JSON Schema using zod-to-json-schema
   */
  private convertZodToJsonSchema(schema?: z.ZodSchema): any {
    if (!schema) {
      return {
        type: 'object',
        properties: {},
        required: [],
      };
    }

    try {
      return zodToJsonSchema(schema, { $refStrategy: 'none' });
    } catch (error) {
      log.warn('[ToolRegistry] Failed to convert Zod schema to JSON Schema', { error });
      return {
        type: 'object',
        properties: {},
        required: [],
      };
    }
  }

  /**
   * Execute a tool with version selection
   */
  async execute(
    name: string,
    input: any,
    context: ToolContext,
    version?: string
  ): Promise<any> {
    const tool = this.getTool(name, version);

    if (!tool) {
      throw new Error(
        version
          ? `Tool not found: ${name}@${version}`
          : `Tool not found: ${name}`
      );
    }

    if (!tool.metadata.enabled) {
      throw new Error(`Tool is disabled: ${name}@${tool.metadata.version}`);
    }

    // Deprecation warning
    if (tool.metadata.deprecated) {
      log.warn('[ToolRegistry] Using deprecated tool', {
        name,
        version: tool.metadata.version,
        message: tool.metadata.deprecationMessage,
        replacedBy: tool.metadata.replacedBy,
      });
    }

    // Validate input
    if (tool.metadata.inputSchema) {
      try {
        tool.metadata.inputSchema.parse(input);
      } catch (error: any) {
        log.error('[ToolRegistry] Invalid input', { name, error: error.message });
        throw new Error(`Invalid input for tool ${name}: ${error.message}`);
      }
    }

    // Execute
    log.debug('[ToolRegistry] Executing tool', {
      name,
      version: tool.metadata.version,
      userId: context.userId,
    });

    const result = await tool.execute(input, context);

    // Validate output
    if (tool.metadata.outputSchema) {
      try {
        tool.metadata.outputSchema.parse(result);
      } catch (error: any) {
        log.warn('[ToolRegistry] Tool output validation failed', {
          name,
          version: tool.metadata.version,
          error: error.message,
        });
      }
    }

    return result;
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalTools: number;
    totalVersions: number;
    enabledTools: number;
    deprecatedTools: number;
    categories: Record<string, number>;
    riskLevels: Record<string, number>;
  } {
    const allTools = this.getAllTools();
    let totalVersions = 0;

    for (const versionMap of this.tools.values()) {
      totalVersions += versionMap.size;
    }

    const categories: Record<string, number> = {};
    const riskLevels: Record<string, number> = {};

    allTools.forEach(tool => {
      categories[tool.metadata.category] = (categories[tool.metadata.category] || 0) + 1;
      riskLevels[tool.metadata.security.riskLevel] =
        (riskLevels[tool.metadata.security.riskLevel] || 0) + 1;
    });

    return {
      totalTools: allTools.length,
      totalVersions,
      enabledTools: allTools.filter(t => t.metadata.enabled).length,
      deprecatedTools: allTools.filter(t => t.metadata.deprecated).length,
      categories,
      riskLevels,
    };
  }

  /**
   * Enable/disable a tool
   */
  setToolEnabled(name: string, enabled: boolean, version?: string): void {
    if (version) {
      const versionMap = this.tools.get(name);
      const tool = versionMap?.get(version);
      if (tool) {
        tool.metadata.enabled = enabled;
        log.info('[ToolRegistry] Tool status changed', { name, version, enabled });
      }
    } else {
      // Enable/disable all versions
      const versionMap = this.tools.get(name);
      if (versionMap) {
        for (const tool of versionMap.values()) {
          tool.metadata.enabled = enabled;
        }
        log.info('[ToolRegistry] All versions status changed', { name, enabled });
      }
    }
  }

  /**
   * Auto-discover tools from filesystem
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
          await this.autoDiscover(filePath);
        } else {
          const loaded = await this.loadTool(filePath);
          if (loaded) discovered++;
        }
      }

      this.initialized = true;
      log.info('[ToolRegistry] Auto-discovery complete', {
        totalTools: this.tools.size,
        discovered,
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

      if (module.toolHandler && typeof module.toolHandler === 'object') {
        if (!module.toolHandler.metadata || !module.toolHandler.execute) {
          log.warn('[ToolRegistry] Invalid tool handler structure', { filePath });
          return false;
        }

        const result = this.register(module.toolHandler);

        if (!result.success) {
          log.warn('[ToolRegistry] Tool registration failed', {
            filePath,
            errors: result.errors,
          });
          return false;
        }

        if (result.warnings && result.warnings.length > 0) {
          log.warn('[ToolRegistry] Tool registered with warnings', {
            filePath,
            warnings: result.warnings,
          });
        }

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
   * Export tool registry as JSON
   */
  exportRegistry(): any {
    const tools: any[] = [];

    for (const [name, versionMap] of this.tools.entries()) {
      const versions: any[] = [];

      for (const [version, handler] of versionMap.entries()) {
        versions.push({
          version,
          metadata: {
            ...handler.metadata,
            inputSchema: undefined, // Don't serialize Zod schemas
            outputSchema: undefined,
          },
        });
      }

      tools.push({ name, versions });
    }

    return {
      engineVersion: this.engineVersion,
      toolCount: tools.length,
      tools,
      statistics: this.getStatistics(),
    };
  }
}

// Singleton instance
export const enhancedToolRegistry = new EnhancedToolRegistry();
