"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolCompat = exports.ToolCompatLayer = void 0;
const tool_registry_1 = require("./tool-registry");
const tools_1 = require("../tools");
const definitions_1 = require("../tools/definitions");
const logger_1 = require("../logger");
const feature_flags_1 = require("./feature-flags");
/**
 * Compatibility layer between old and new tool systems
 *
 * This allows gradual migration from switch-based execution
 * to registry-based execution without breaking existing code.
 */
class ToolCompatLayer {
    /**
     * Execute a tool using either new registry or legacy executor
     */
    async execute(toolName, input, userId, userRequest) {
        // Check if tool registry feature is enabled
        if (!feature_flags_1.featureFlags.isEnabled(feature_flags_1.Feature.TOOL_REGISTRY)) {
            logger_1.log.debug('[ToolCompat] Using legacy executor (feature disabled)', { toolName });
            return await (0, tools_1.executeTool)(toolName, input, userId, userRequest);
        }
        // Try new registry first
        const registeredTool = tool_registry_1.toolRegistry.getTool(toolName);
        if (registeredTool) {
            logger_1.log.debug('[ToolCompat] Using new tool registry', { toolName });
            const context = { userId, userRequest };
            return await tool_registry_1.toolRegistry.execute(toolName, input, context);
        }
        // Fall back to legacy executor
        logger_1.log.debug('[ToolCompat] Falling back to legacy executor', { toolName });
        return await (0, tools_1.executeTool)(toolName, input, userId, userRequest);
    }
    /**
     * Check if tool is available in either system
     */
    isToolAvailable(toolName) {
        // Check new registry
        if (tool_registry_1.toolRegistry.getTool(toolName)) {
            return true;
        }
        // Check legacy system (tool exists in TOOLS array)
        return definitions_1.TOOLS.some(t => t.name === toolName);
    }
    /**
     * Get tool definition for Claude API
     */
    getToolDefinition(toolName) {
        // Try new registry first
        const registeredTool = tool_registry_1.toolRegistry.getTool(toolName);
        if (registeredTool) {
            return {
                name: registeredTool.metadata.name,
                description: registeredTool.metadata.description,
                input_schema: this.convertZodToJsonSchema(registeredTool.metadata.inputSchema)
            };
        }
        // Fall back to legacy definitions
        return definitions_1.TOOLS.find((t) => t.name === toolName);
    }
    /**
     * Get all available tool definitions (merged from both systems)
     */
    getAllToolDefinitions() {
        const definitions = [];
        const seen = new Set();
        // Get tools from new registry first (takes precedence)
        if (feature_flags_1.featureFlags.isEnabled(feature_flags_1.Feature.TOOL_REGISTRY)) {
            const newTools = tool_registry_1.toolRegistry.getEnabledToolDefinitions();
            for (const tool of newTools) {
                definitions.push(tool);
                seen.add(tool.name);
            }
        }
        // Add legacy tools that haven't been migrated yet
        for (const tool of definitions_1.TOOLS) {
            if (!seen.has(tool.name)) {
                definitions.push(tool);
            }
        }
        return definitions;
    }
    /**
     * Get migration status for all tools
     */
    getMigrationStatus() {
        const allTools = definitions_1.TOOLS.map(t => t.name);
        const migratedTools = tool_registry_1.toolRegistry.getAllTools().map(t => t.metadata.name);
        const tools = allTools.map(name => {
            const isMigrated = migratedTools.includes(name);
            const registeredTool = tool_registry_1.toolRegistry.getTool(name);
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
    convertZodToJsonSchema(schema) {
        if (!schema) {
            return {
                type: 'object',
                properties: {},
                required: []
            };
        }
        // Basic conversion - for now return permissive schema
        // TODO: Enhance with proper Zod to JSON Schema conversion
        return {
            type: 'object',
            properties: {},
            required: []
        };
    }
}
exports.ToolCompatLayer = ToolCompatLayer;
// Singleton instance
exports.toolCompat = new ToolCompatLayer();
