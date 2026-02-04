"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolRegistry = exports.ToolRegistry = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../logger");
class ToolRegistry {
    tools = new Map();
    initialized = false;
    /**
     * Register a tool manually
     */
    register(handler) {
        if (this.tools.has(handler.metadata.name)) {
            logger_1.log.warn('[ToolRegistry] Tool already registered, overwriting', {
                name: handler.metadata.name
            });
        }
        this.tools.set(handler.metadata.name, handler);
        logger_1.log.info('[ToolRegistry] Tool registered', {
            name: handler.metadata.name,
            category: handler.metadata.category,
            riskLevel: handler.metadata.security.riskLevel
        });
    }
    /**
     * Auto-discover and load tools from filesystem
     */
    async autoDiscover(toolsDir) {
        try {
            logger_1.log.info('[ToolRegistry] Starting auto-discovery', { toolsDir });
            const files = await promises_1.default.readdir(toolsDir);
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
                const filePath = path_1.default.join(toolsDir, file);
                const stat = await promises_1.default.stat(filePath);
                if (stat.isDirectory()) {
                    // Recursively load subdirectories
                    await this.autoDiscover(filePath);
                }
                else {
                    const loaded = await this.loadTool(filePath);
                    if (loaded)
                        discovered++;
                }
            }
            this.initialized = true;
            logger_1.log.info('[ToolRegistry] Auto-discovery complete', {
                totalTools: this.tools.size,
                discovered
            });
        }
        catch (error) {
            logger_1.log.error('[ToolRegistry] Auto-discovery failed', { error, toolsDir });
            throw error;
        }
    }
    /**
     * Load a single tool file
     */
    async loadTool(filePath) {
        try {
            const module = await Promise.resolve(`${filePath}`).then(s => __importStar(require(s)));
            // Look for exported handler
            if (module.toolHandler && typeof module.toolHandler === 'object') {
                // Validate handler structure
                if (!module.toolHandler.metadata || !module.toolHandler.execute) {
                    logger_1.log.warn('[ToolRegistry] Invalid tool handler structure', { filePath });
                    return false;
                }
                this.register(module.toolHandler);
                return true;
            }
            else {
                logger_1.log.debug('[ToolRegistry] No tool handler found', { filePath });
                return false;
            }
        }
        catch (error) {
            logger_1.log.warn('[ToolRegistry] Failed to load tool', { filePath, error });
            return false;
        }
    }
    /**
     * Get a tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * Get all registered tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get tools by category
     */
    getToolsByCategory(category) {
        return this.getAllTools().filter(t => t.metadata.category === category);
    }
    /**
     * Get tools by tag
     */
    getToolsByTag(tag) {
        return this.getAllTools().filter(t => t.metadata.tags?.includes(tag));
    }
    /**
     * Get tools by risk level
     */
    getToolsByRiskLevel(riskLevel) {
        return this.getAllTools().filter(t => t.metadata.security.riskLevel === riskLevel);
    }
    /**
     * Get enabled tools for Claude API
     */
    getEnabledToolDefinitions() {
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
    convertZodToJsonSchema(schema) {
        if (!schema) {
            return {
                type: 'object',
                properties: {},
                required: []
            };
        }
        // Basic conversion - can be enhanced with zod-to-json-schema library
        // For now, return a permissive schema
        return {
            type: 'object',
            properties: {},
            required: []
        };
    }
    /**
     * Enable/disable a tool
     */
    setToolEnabled(name, enabled) {
        const tool = this.getTool(name);
        if (tool) {
            tool.metadata.enabled = enabled;
            logger_1.log.info('[ToolRegistry] Tool status changed', { name, enabled });
        }
        else {
            logger_1.log.warn('[ToolRegistry] Tool not found', { name });
        }
    }
    /**
     * Execute a tool with context
     */
    async execute(name, input, context) {
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
            }
            catch (error) {
                logger_1.log.error('[ToolRegistry] Invalid input', { name, error });
                throw new Error(`Invalid input for tool ${name}: ${error}`);
            }
        }
        // Execute
        logger_1.log.debug('[ToolRegistry] Executing tool', { name, userId: context.userId });
        const result = await tool.execute(input, context);
        // Validate output if schema provided
        if (tool.metadata.outputSchema) {
            try {
                tool.metadata.outputSchema.parse(result);
            }
            catch (error) {
                logger_1.log.warn('[ToolRegistry] Tool output validation failed', { name, error });
            }
        }
        return result;
    }
    /**
     * Get registry statistics
     */
    getStats() {
        const tools = this.getAllTools();
        const byCategory = {};
        const byRiskLevel = {};
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
    isInitialized() {
        return this.initialized;
    }
}
exports.ToolRegistry = ToolRegistry;
// Singleton instance
exports.toolRegistry = new ToolRegistry();
