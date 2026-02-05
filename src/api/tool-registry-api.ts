/**
 * Tool Registry API Endpoints
 *
 * RESTful API for managing tools in the registry
 */

import { Router, Request, Response } from 'express';
import { enhancedToolRegistry } from '../core/tool-registry-enhanced';
import { log } from '../logger';

export const toolRegistryRouter = Router();

/**
 * GET /tools
 * List all tools
 */
toolRegistryRouter.get('/tools', async (req: Request, res: Response) => {
  try {
    const { category, tag, enabled, deprecated } = req.query;

    let tools = enhancedToolRegistry.getAllTools();

    // Filter by category
    if (category && typeof category === 'string') {
      tools = tools.filter(t => t.metadata.category === category);
    }

    // Filter by tag
    if (tag && typeof tag === 'string') {
      tools = tools.filter(t => t.metadata.tags?.includes(tag));
    }

    // Filter by enabled status
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      tools = tools.filter(t => t.metadata.enabled === isEnabled);
    }

    // Filter by deprecated status
    if (deprecated !== undefined) {
      const isDeprecated = deprecated === 'true';
      tools = tools.filter(t => t.metadata.version.deprecated === isDeprecated);
    }

    // Return tool metadata only (not the execute function)
    const toolData = tools.map(t => ({
      name: t.metadata.name,
      description: t.metadata.description,
      category: t.metadata.category,
      version: t.metadata.version,
      dependencies: t.metadata.dependencies,
      tags: t.metadata.tags,
      enabled: t.metadata.enabled,
      security: t.metadata.security,
      performance: t.metadata.performance,
      author: t.metadata.author,
      license: t.metadata.license,
      repository: t.metadata.repository,
    }));

    res.json({
      success: true,
      count: toolData.length,
      tools: toolData,
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error listing tools', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list tools',
    });
  }
});

/**
 * GET /tools/:name
 * Get a specific tool by name
 */
toolRegistryRouter.get('/tools/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { version } = req.query;

    let tool;
    if (version && typeof version === 'string') {
      tool = enhancedToolRegistry.getToolWithVersion(name, version);
    } else {
      tool = enhancedToolRegistry.getTool(name);
    }

    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found',
      });
    }

    // Check dependencies
    const depCheck = enhancedToolRegistry.resolveDependencies(name);

    res.json({
      success: true,
      tool: {
        name: tool.metadata.name,
        description: tool.metadata.description,
        category: tool.metadata.category,
        version: tool.metadata.version,
        dependencies: tool.metadata.dependencies,
        dependencyStatus: {
          valid: depCheck.valid,
          errors: depCheck.errors,
          warnings: depCheck.warnings,
        },
        tags: tool.metadata.tags,
        enabled: tool.metadata.enabled,
        security: tool.metadata.security,
        performance: tool.metadata.performance,
        examples: tool.metadata.examples,
        author: tool.metadata.author,
        license: tool.metadata.license,
        repository: tool.metadata.repository,
      },
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error getting tool', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get tool',
    });
  }
});

/**
 * GET /tools/:name/dependencies
 * Check dependencies for a tool
 */
toolRegistryRouter.get('/tools/:name/dependencies', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const tool = enhancedToolRegistry.getTool(name);
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found',
      });
    }

    const depCheck = enhancedToolRegistry.resolveDependencies(name);

    res.json({
      success: true,
      tool: name,
      dependencies: tool.metadata.dependencies || [],
      resolution: {
        valid: depCheck.valid,
        errors: depCheck.errors,
        warnings: depCheck.warnings,
      },
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error checking dependencies', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to check dependencies',
    });
  }
});

/**
 * POST /tools/:name/enable
 * Enable a tool
 */
toolRegistryRouter.post('/tools/:name/enable', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const tool = enhancedToolRegistry.getTool(name);
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found',
      });
    }

    enhancedToolRegistry.setToolEnabled(name, true);

    res.json({
      success: true,
      message: `Tool ${name} enabled`,
      tool: {
        name: tool.metadata.name,
        enabled: true,
      },
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error enabling tool', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to enable tool',
    });
  }
});

/**
 * POST /tools/:name/disable
 * Disable a tool
 */
toolRegistryRouter.post('/tools/:name/disable', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    const tool = enhancedToolRegistry.getTool(name);
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found',
      });
    }

    enhancedToolRegistry.setToolEnabled(name, false);

    res.json({
      success: true,
      message: `Tool ${name} disabled`,
      tool: {
        name: tool.metadata.name,
        enabled: false,
      },
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error disabling tool', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to disable tool',
    });
  }
});

/**
 * POST /tools/:name/deprecate
 * Mark tool as deprecated
 */
toolRegistryRouter.post('/tools/:name/deprecate', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { message } = req.body;

    const tool = enhancedToolRegistry.getTool(name);
    if (!tool) {
      return res.status(404).json({
        success: false,
        error: 'Tool not found',
      });
    }

    enhancedToolRegistry.deprecateTool(name, message);

    res.json({
      success: true,
      message: `Tool ${name} marked as deprecated`,
      tool: {
        name: tool.metadata.name,
        deprecated: true,
        deprecationMessage: message,
      },
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error deprecating tool', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to deprecate tool',
    });
  }
});

/**
 * GET /tools/stats
 * Get registry statistics
 */
toolRegistryRouter.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = enhancedToolRegistry.getStats();

    res.json({
      success: true,
      stats: {
        totalTools: stats.totalTools,
        enabledTools: stats.enabledTools,
        deprecatedTools: stats.deprecatedTools,
        byCategory: stats.byCategory,
        byRiskLevel: stats.byRiskLevel,
        byVersion: stats.byVersion,
      },
      registryStatus: {
        initialized: enhancedToolRegistry.isInitialized(),
      },
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error getting stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get stats',
    });
  }
});

/**
 * GET /tools/definitions
 * Get tool definitions for Claude API
 */
toolRegistryRouter.get('/definitions', async (req: Request, res: Response) => {
  try {
    const definitions = enhancedToolRegistry.getEnabledToolDefinitions();

    res.json({
      success: true,
      count: definitions.length,
      definitions,
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error getting definitions', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get definitions',
    });
  }
});

/**
 * GET /tools/categories
 * List all tool categories
 */
toolRegistryRouter.get('/categories', async (req: Request, res: Response) => {
  try {
    const stats = enhancedToolRegistry.getStats();
    const categories = Object.keys(stats.byCategory).map(category => ({
      name: category,
      count: stats.byCategory[category],
    }));

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error listing categories', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list categories',
    });
  }
});

/**
 * GET /tools/tags
 * List all tool tags
 */
toolRegistryRouter.get('/tags', async (req: Request, res: Response) => {
  try {
    const allTools = enhancedToolRegistry.getAllTools();
    const tagCounts: Record<string, number> = {};

    allTools.forEach(tool => {
      tool.metadata.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const tags = Object.keys(tagCounts).map(tag => ({
      name: tag,
      count: tagCounts[tag],
    }));

    res.json({
      success: true,
      count: tags.length,
      tags,
    });
  } catch (error) {
    log.error('[ToolRegistryAPI] Error listing tags', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to list tags',
    });
  }
});

/**
 * POST /tools/:name/execute
 * Execute a tool (for testing/admin purposes)
 */
toolRegistryRouter.post('/tools/:name/execute', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { input, context } = req.body;

    if (!context || !context.userId) {
      return res.status(400).json({
        success: false,
        error: 'Context with userId is required',
      });
    }

    const result = await enhancedToolRegistry.execute(name, input, context);

    res.json({
      success: true,
      tool: name,
      result,
    });
  } catch (error: any) {
    log.error('[ToolRegistryAPI] Tool execution error', { error });
    res.status(400).json({
      success: false,
      error: error.message || 'Tool execution failed',
    });
  }
});

export default toolRegistryRouter;
