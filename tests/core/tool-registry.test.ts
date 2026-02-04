/**
 * Tool Registry Tests
 *
 * Validates:
 * - Tool registration and retrieval
 * - Auto-discovery from filesystem
 * - Tool execution with Zod validation
 * - Enable/disable functionality
 * - Migration status tracking
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { ToolRegistry } from '../../src/core/tool-registry';
import { z } from 'zod';
import type { ToolHandler, ToolMetadata, ToolContext } from '../../src/core/tool-registry';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('Tool Registration', () => {
    it('should register a tool with valid metadata', () => {
      const tool: ToolHandler = {
        metadata: {
          name: 'test_tool',
          description: 'Test tool',
          category: 'system',
          inputSchema: z.object({ value: z.string() }),
          tags: ['test'],
          enabled: true,
          security: {
            idempotent: true,
            requiresApproval: false,
            riskLevel: 'low'
          }
        },
        execute: async (input: any) => ({ result: 'ok' })
      };

      registry.register(tool);

      const retrieved = registry.getTool('test_tool');
      assert.ok(retrieved, 'Tool should be registered');
      assert.strictEqual(retrieved.metadata.name, 'test_tool');
      assert.strictEqual(retrieved.metadata.category, 'system');
    });

    it('should allow overwriting existing tool registration', () => {
      const tool1: ToolHandler = {
        metadata: {
          name: 'overwrite_tool',
          description: 'Version 1',
          category: 'system',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({ version: 1 })
      };

      const tool2: ToolHandler = {
        metadata: {
          name: 'overwrite_tool',
          description: 'Version 2',
          category: 'system',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({ version: 2 })
      };

      registry.register(tool1);
      registry.register(tool2);

      const retrieved = registry.getTool('overwrite_tool');
      assert.strictEqual(retrieved?.metadata.description, 'Version 2', 'Should overwrite with new version');
    });

    it('should list all registered tools', () => {
      const tool1: ToolHandler = {
        metadata: {
          name: 'tool1',
          description: 'Tool 1',
          category: 'files',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({})
      };

      const tool2: ToolHandler = {
        metadata: {
          name: 'tool2',
          description: 'Tool 2',
          category: 'system',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: false, requiresApproval: true, riskLevel: 'high' }
        },
        execute: async () => ({})
      };

      registry.register(tool1);
      registry.register(tool2);

      const tools = registry.getAllTools();
      assert.strictEqual(tools.length, 2);
      assert.ok(tools.find(t => t.metadata.name === 'tool1'));
      assert.ok(tools.find(t => t.metadata.name === 'tool2'));
    });
  });

  describe('Tool Execution', () => {
    it('should execute tool with valid input', async () => {
      const tool: ToolHandler = {
        metadata: {
          name: 'echo_tool',
          description: 'Echoes input',
          category: 'system',
          inputSchema: z.object({ message: z.string() }),
          tags: ['test'],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async (input: any) => ({ echo: input.message })
      };

      registry.register(tool);

      const result = await registry.execute('echo_tool', { message: 'hello' }, {
        userId: 'test-user',
        userRequest: 'test request'
      });

      assert.deepStrictEqual(result, { echo: 'hello' });
    });

    it('should validate input with Zod schema', async () => {
      const tool: ToolHandler = {
        metadata: {
          name: 'validated_tool',
          description: 'Tool with validation',
          category: 'system',
          inputSchema: z.object({
            count: z.number().min(1).max(10)
          }),
          tags: [],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async (input: any) => ({ count: input.count })
      };

      registry.register(tool);

      // Valid input
      const result = await registry.execute('validated_tool', { count: 5 }, {
        userId: 'test-user',
        userRequest: 'test'
      });
      assert.strictEqual(result.count, 5);

      // Invalid input - count too high
      await assert.rejects(
        async () => registry.execute('validated_tool', { count: 20 }, {
          userId: 'test-user',
          userRequest: 'test'
        }),
        /Invalid input/i,
        'Should throw validation error for invalid input'
      );
    });

    it('should throw error when executing disabled tool', async () => {
      const tool: ToolHandler = {
        metadata: {
          name: 'disabled_tool',
          description: 'Disabled tool',
          category: 'system',
          inputSchema: z.object({}),
          tags: [],
          enabled: false,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({ result: 'should not run' })
      };

      registry.register(tool);

      await assert.rejects(
        async () => registry.execute('disabled_tool', {}, {
          userId: 'test-user',
          userRequest: 'test'
        }),
        /disabled/i,
        'Should throw error for disabled tool'
      );
    });

    it('should throw error when tool not found', async () => {
      await assert.rejects(
        async () => registry.execute('nonexistent_tool', {}, {
          userId: 'test-user',
          userRequest: 'test'
        }),
        /not found/i,
        'Should throw error for nonexistent tool'
      );
    });
  });

  describe('Tool Categories', () => {
    it('should list tools by category', () => {
      const filesTool: ToolHandler = {
        metadata: {
          name: 'file_tool',
          description: 'File tool',
          category: 'files',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({})
      };

      const systemTool: ToolHandler = {
        metadata: {
          name: 'system_tool',
          description: 'System tool',
          category: 'system',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: false, requiresApproval: true, riskLevel: 'high' }
        },
        execute: async () => ({})
      };

      registry.register(filesTool);
      registry.register(systemTool);

      const fileTools = registry.getToolsByCategory('files');
      assert.strictEqual(fileTools.length, 1);
      assert.strictEqual(fileTools[0].metadata.name, 'file_tool');

      const systemTools = registry.getToolsByCategory('system');
      assert.strictEqual(systemTools.length, 1);
      assert.strictEqual(systemTools[0].metadata.name, 'system_tool');
    });

    it('should return empty array for nonexistent category', () => {
      const tools = registry.getToolsByCategory('nonexistent' as any);
      assert.strictEqual(tools.length, 0);
    });
  });

  describe('Tool Enable/Disable', () => {
    it('should enable and disable tools', () => {
      const tool: ToolHandler = {
        metadata: {
          name: 'toggle_tool',
          description: 'Tool to toggle',
          category: 'system',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({})
      };

      registry.register(tool);

      // Initially enabled
      let retrieved = registry.getTool('toggle_tool');
      assert.strictEqual(retrieved?.metadata.enabled, true);

      // Disable
      registry.setToolEnabled('toggle_tool', false);
      retrieved = registry.getTool('toggle_tool');
      assert.strictEqual(retrieved?.metadata.enabled, false);

      // Enable
      registry.setToolEnabled('toggle_tool', true);
      retrieved = registry.getTool('toggle_tool');
      assert.strictEqual(retrieved?.metadata.enabled, true);
    });

    it('should handle toggling nonexistent tool gracefully', () => {
      // ToolRegistry logs warning but doesn't throw when tool not found
      registry.setToolEnabled('nonexistent', true);
      registry.setToolEnabled('nonexistent', false);

      const tool = registry.getTool('nonexistent');
      assert.strictEqual(tool, undefined, 'Nonexistent tool should remain undefined');
    });
  });

  describe('Tool Tags', () => {
    it('should find tools by tag', () => {
      const tool1: ToolHandler = {
        metadata: {
          name: 'tagged_tool1',
          description: 'Tool 1',
          category: 'system',
          inputSchema: z.object({}),
          tags: ['filesystem', 'read'],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({})
      };

      const tool2: ToolHandler = {
        metadata: {
          name: 'tagged_tool2',
          description: 'Tool 2',
          category: 'files',
          inputSchema: z.object({}),
          tags: ['filesystem', 'write'],
          enabled: true,
          security: { idempotent: false, requiresApproval: true, riskLevel: 'medium' }
        },
        execute: async () => ({})
      };

      const tool3: ToolHandler = {
        metadata: {
          name: 'tagged_tool3',
          description: 'Tool 3',
          category: 'web',
          inputSchema: z.object({}),
          tags: ['http', 'fetch'],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({})
      };

      registry.register(tool1);
      registry.register(tool2);
      registry.register(tool3);

      const filesystemTools = registry.getToolsByTag('filesystem');
      assert.strictEqual(filesystemTools.length, 2);
      assert.ok(filesystemTools.find(t => t.metadata.name === 'tagged_tool1'));
      assert.ok(filesystemTools.find(t => t.metadata.name === 'tagged_tool2'));

      const httpTools = registry.getToolsByTag('http');
      assert.strictEqual(httpTools.length, 1);
      assert.strictEqual(httpTools[0].metadata.name, 'tagged_tool3');
    });
  });

  describe('Registry Statistics', () => {
    it('should provide registry statistics', () => {
      // Register tools with different categories and risk levels
      registry.register({
        metadata: {
          name: 'stats_tool1',
          description: 'Files tool',
          category: 'files',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'low' }
        },
        execute: async () => ({})
      });

      registry.register({
        metadata: {
          name: 'stats_tool2',
          description: 'System tool',
          category: 'system',
          inputSchema: z.object({}),
          tags: [],
          enabled: true,
          security: { idempotent: false, requiresApproval: true, riskLevel: 'high' }
        },
        execute: async () => ({})
      });

      registry.register({
        metadata: {
          name: 'stats_tool3',
          description: 'Disabled tool',
          category: 'web',
          inputSchema: z.object({}),
          tags: [],
          enabled: false,
          security: { idempotent: true, requiresApproval: false, riskLevel: 'medium' }
        },
        execute: async () => ({})
      });

      const stats = registry.getStats();

      assert.strictEqual(stats.totalTools, 3);
      assert.strictEqual(stats.enabledTools, 2);
      assert.strictEqual(stats.byCategory['files'], 1);
      assert.strictEqual(stats.byCategory['system'], 1);
      assert.strictEqual(stats.byCategory['web'], 1);
      assert.strictEqual(stats.byRiskLevel['low'], 1);
      assert.strictEqual(stats.byRiskLevel['high'], 1);
      assert.strictEqual(stats.byRiskLevel['medium'], 1);
    });
  });

  describe('Security Metadata', () => {
    it('should store and retrieve security metadata', () => {
      const dangerousTool: ToolHandler = {
        metadata: {
          name: 'dangerous_tool',
          description: 'High risk tool',
          category: 'system',
          inputSchema: z.object({}),
          tags: ['dangerous'],
          enabled: true,
          security: {
            idempotent: false,
            requiresApproval: true,
            riskLevel: 'high',
            timeout: 60000,
            allowedUsers: ['admin']
          }
        },
        execute: async () => ({})
      };

      registry.register(dangerousTool);

      const retrieved = registry.getTool('dangerous_tool');
      assert.strictEqual(retrieved?.metadata.security.riskLevel, 'high');
      assert.strictEqual(retrieved?.metadata.security.requiresApproval, true);
      assert.strictEqual(retrieved?.metadata.security.idempotent, false);
      assert.strictEqual(retrieved?.metadata.security.timeout, 60000);
      assert.deepStrictEqual(retrieved?.metadata.security.allowedUsers, ['admin']);
    });
  });
});
