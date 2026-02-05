/**
 * Enhanced Tool Registry Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import {
  EnhancedToolRegistry,
  EnhancedToolHandler,
} from '../../src/core/tool-registry-enhanced';

describe('Enhanced Tool Registry', () => {
  let registry: EnhancedToolRegistry;

  const createTestTool = (name: string, version: string, deps?: any[]): EnhancedToolHandler => ({
    metadata: {
      name,
      version,
      description: `Test tool ${name}`,
      category: 'test',
      enabled: true,
      dependencies: deps,
      inputSchema: z.object({ value: z.number() }),
      outputSchema: z.object({ result: z.number() }),
      security: {
        idempotent: true,
        requiresApproval: false,
        riskLevel: 'low',
      },
    },
    execute: async (input) => ({ result: input.value * 2 }),
  });

  beforeEach(() => {
    registry = new EnhancedToolRegistry('1.0.0');
  });

  describe('Tool Registration', () => {
    it('should register a tool successfully', () => {
      const tool = createTestTool('test_tool', '1.0.0');
      const result = registry.register(tool);

      assert.strictEqual(result.success, true);
      assert.ok(result.message.includes('registered successfully'));
    });

    it('should reject invalid version format', () => {
      const tool = createTestTool('test_tool', 'invalid-version');
      const result = registry.register(tool);

      assert.strictEqual(result.success, false);
      assert.ok(result.errors!.length > 0);
      assert.ok(result.errors![0].includes('Invalid version format'));
    });

    it('should register multiple versions of same tool', () => {
      const tool1 = createTestTool('test_tool', '1.0.0');
      const tool2 = createTestTool('test_tool', '2.0.0');

      registry.register(tool1);
      registry.register(tool2);

      const versions = registry.getToolVersions('test_tool');
      assert.strictEqual(versions.length, 2);
      assert.ok(versions.includes('1.0.0'));
      assert.ok(versions.includes('2.0.0'));
    });

    it('should warn when overwriting existing version', () => {
      const tool1 = createTestTool('test_tool', '1.0.0');
      const tool2 = createTestTool('test_tool', '1.0.0');

      registry.register(tool1);
      const result = registry.register(tool2);

      assert.strictEqual(result.success, true);
      assert.ok(result.warnings!.length > 0);
      assert.ok(result.warnings![0].includes('already registered'));
    });
  });

  describe('Dependency Resolution', () => {
    it('should allow tool with satisfied dependencies', () => {
      const baseTool = createTestTool('base_tool', '1.0.0');
      const depTool = createTestTool('dep_tool', '1.0.0', [
        { name: 'base_tool', version: '^1.0.0', optional: false },
      ]);

      registry.register(baseTool);
      const result = registry.register(depTool);

      assert.strictEqual(result.success, true);
    });

    it('should reject tool with missing required dependency', () => {
      const tool = createTestTool('dep_tool', '1.0.0', [
        { name: 'missing_tool', version: '^1.0.0', optional: false },
      ]);

      const result = registry.register(tool);

      assert.strictEqual(result.success, false);
      assert.ok(result.errors!.some(e => e.includes('Required dependency')));
    });

    it('should warn about missing optional dependency', () => {
      const tool = createTestTool('dep_tool', '1.0.0', [
        { name: 'missing_tool', version: '^1.0.0', optional: true },
      ]);

      const result = registry.register(tool);

      assert.strictEqual(result.success, true);
      assert.ok(result.warnings!.some(w => w.includes('Optional dependency')));
    });

    it('should check version compatibility', () => {
      const baseTool = createTestTool('base_tool', '1.0.0');
      const depTool = createTestTool('dep_tool', '1.0.0', [
        { name: 'base_tool', version: '^2.0.0', optional: false }, // Requires v2
      ]);

      registry.register(baseTool);
      const result = registry.register(depTool);

      assert.strictEqual(result.success, false);
      assert.ok(result.errors!.some(e => e.includes('version') && e.includes('not satisfied')));
    });
  });

  describe('Version Selection', () => {
    it('should get latest version by default', () => {
      registry.register(createTestTool('test_tool', '1.0.0'));
      registry.register(createTestTool('test_tool', '2.0.0'));
      registry.register(createTestTool('test_tool', '1.5.0'));

      const tool = registry.getTool('test_tool');

      assert.ok(tool);
      assert.strictEqual(tool.metadata.version, '2.0.0');
    });

    it('should get specific version when requested', () => {
      registry.register(createTestTool('test_tool', '1.0.0'));
      registry.register(createTestTool('test_tool', '2.0.0'));

      const tool = registry.getTool('test_tool', '1.0.0');

      assert.ok(tool);
      assert.strictEqual(tool.metadata.version, '1.0.0');
    });

    it('should skip deprecated versions for latest', () => {
      const tool1 = createTestTool('test_tool', '1.0.0');
      tool1.metadata.deprecated = true;

      const tool2 = createTestTool('test_tool', '2.0.0');

      registry.register(tool1);
      registry.register(tool2);

      const latest = registry.getTool('test_tool');

      assert.ok(latest);
      assert.strictEqual(latest.metadata.version, '2.0.0');
    });

    it('should list all versions sorted', () => {
      registry.register(createTestTool('test_tool', '2.0.0'));
      registry.register(createTestTool('test_tool', '1.0.0'));
      registry.register(createTestTool('test_tool', '1.5.0'));

      const versions = registry.getToolVersions('test_tool');

      assert.deepStrictEqual(versions, ['2.0.0', '1.5.0', '1.0.0']);
    });
  });

  describe('Tool Execution', () => {
    it('should execute tool successfully', async () => {
      const tool = createTestTool('test_tool', '1.0.0');
      registry.register(tool);

      const result = await registry.execute(
        'test_tool',
        { value: 5 },
        { userId: 'user123', userRequest: 'test' }
      );

      assert.deepStrictEqual(result, { result: 10 });
    });

    it('should execute specific version', async () => {
      const tool1 = createTestTool('test_tool', '1.0.0');
      const tool2 = {
        ...createTestTool('test_tool', '2.0.0'),
        execute: async (input: any) => ({ result: input.value * 3 }),
      };

      registry.register(tool1);
      registry.register(tool2);

      const result = await registry.execute(
        'test_tool',
        { value: 5 },
        { userId: 'user123', userRequest: 'test' },
        '2.0.0'
      );

      assert.deepStrictEqual(result, { result: 15 });
    });

    it('should validate input schema', async () => {
      const tool = createTestTool('test_tool', '1.0.0');
      registry.register(tool);

      await assert.rejects(
        async () => {
          await registry.execute(
            'test_tool',
            { value: 'invalid' }, // Wrong type
            { userId: 'user123', userRequest: 'test' }
          );
        },
        /Invalid input/
      );
    });

    it('should throw on disabled tool', async () => {
      const tool = createTestTool('test_tool', '1.0.0');
      tool.metadata.enabled = false;
      registry.register(tool);

      await assert.rejects(
        async () => {
          await registry.execute(
            'test_tool',
            { value: 5 },
            { userId: 'user123', userRequest: 'test' }
          );
        },
        /Tool is disabled/
      );
    });

    it('should throw on missing tool', async () => {
      await assert.rejects(
        async () => {
          await registry.execute(
            'missing_tool',
            { value: 5 },
            { userId: 'user123', userRequest: 'test' }
          );
        },
        /Tool not found/
      );
    });
  });

  describe('Deprecation Handling', () => {
    it('should warn about deprecated tool', () => {
      const tool = createTestTool('test_tool', '1.0.0');
      tool.metadata.deprecated = true;
      tool.metadata.deprecationMessage = 'Use v2 instead';

      const result = registry.register(tool);

      assert.strictEqual(result.success, true);
      assert.ok(result.warnings!.some(w => w.includes('deprecated')));
    });

    it('should get deprecated tools list', () => {
      const tool1 = createTestTool('tool1', '1.0.0');
      tool1.metadata.deprecated = true;

      const tool2 = createTestTool('tool2', '1.0.0');

      registry.register(tool1);
      registry.register(tool2);

      const deprecated = registry.getDeprecatedTools();

      assert.strictEqual(deprecated.length, 1);
      assert.strictEqual(deprecated[0].metadata.name, 'tool1');
    });
  });

  describe('Filtering and Querying', () => {
    beforeEach(() => {
      const tool1 = createTestTool('tool1', '1.0.0');
      tool1.metadata.category = 'math';
      tool1.metadata.tags = ['calculator', 'basic'];

      const tool2 = createTestTool('tool2', '1.0.0');
      tool2.metadata.category = 'data';
      tool2.metadata.tags = ['processor', 'advanced'];

      const tool3 = createTestTool('tool3', '1.0.0');
      tool3.metadata.category = 'math';
      tool3.metadata.tags = ['calculator', 'advanced'];

      registry.register(tool1);
      registry.register(tool2);
      registry.register(tool3);
    });

    it('should get tools by category', () => {
      const mathTools = registry.getToolsByCategory('math');

      assert.strictEqual(mathTools.length, 2);
      assert.ok(mathTools.every(t => t.metadata.category === 'math'));
    });

    it('should get tools by tag', () => {
      const calculators = registry.getToolsByTag('calculator');

      assert.strictEqual(calculators.length, 2);
      assert.ok(calculators.every(t => t.metadata.tags?.includes('calculator')));
    });

    it('should get all tools', () => {
      const allTools = registry.getAllTools();

      assert.strictEqual(allTools.length, 3);
    });
  });

  describe('Tool Definitions Export', () => {
    it('should export enabled tool definitions', () => {
      const tool1 = createTestTool('tool1', '1.0.0');
      tool1.metadata.enabled = true;

      const tool2 = createTestTool('tool2', '1.0.0');
      tool2.metadata.enabled = false;

      registry.register(tool1);
      registry.register(tool2);

      const definitions = registry.getEnabledToolDefinitions();

      assert.strictEqual(definitions.length, 1);
      assert.strictEqual(definitions[0].name, 'tool1');
      assert.ok(definitions[0].input_schema);
    });

    it('should exclude deprecated tools from definitions', () => {
      const tool1 = createTestTool('tool1', '1.0.0');
      tool1.metadata.deprecated = true;

      const tool2 = createTestTool('tool2', '1.0.0');

      registry.register(tool1);
      registry.register(tool2);

      const definitions = registry.getEnabledToolDefinitions();

      assert.strictEqual(definitions.length, 1);
      assert.strictEqual(definitions[0].name, 'tool2');
    });
  });

  describe('Registry Statistics', () => {
    it('should provide accurate statistics', () => {
      registry.register(createTestTool('tool1', '1.0.0'));
      registry.register(createTestTool('tool1', '2.0.0'));
      registry.register(createTestTool('tool2', '1.0.0'));

      const stats = registry.getStatistics();

      assert.strictEqual(stats.totalTools, 2);
      assert.strictEqual(stats.totalVersions, 3);
    });

    it('should count deprecated tools', () => {
      const tool1 = createTestTool('tool1', '1.0.0');
      tool1.metadata.deprecated = true;

      registry.register(tool1);
      registry.register(createTestTool('tool2', '1.0.0'));

      const stats = registry.getStatistics();

      assert.strictEqual(stats.deprecatedTools, 1);
    });

    it('should categorize by risk level', () => {
      const tool1 = createTestTool('tool1', '1.0.0');
      tool1.metadata.security.riskLevel = 'high';

      const tool2 = createTestTool('tool2', '1.0.0');
      tool2.metadata.security.riskLevel = 'low';

      registry.register(tool1);
      registry.register(tool2);

      const stats = registry.getStatistics();

      assert.strictEqual(stats.riskLevels.high, 1);
      assert.strictEqual(stats.riskLevels.low, 1);
    });
  });

  describe('Tool Enable/Disable', () => {
    it('should enable/disable specific version', () => {
      registry.register(createTestTool('test_tool', '1.0.0'));
      registry.register(createTestTool('test_tool', '2.0.0'));

      registry.setToolEnabled('test_tool', false, '1.0.0');

      const tool1 = registry.getTool('test_tool', '1.0.0');
      const tool2 = registry.getTool('test_tool', '2.0.0');

      assert.strictEqual(tool1?.metadata.enabled, false);
      assert.strictEqual(tool2?.metadata.enabled, true);
    });

    it('should enable/disable all versions', () => {
      registry.register(createTestTool('test_tool', '1.0.0'));
      registry.register(createTestTool('test_tool', '2.0.0'));

      registry.setToolEnabled('test_tool', false);

      const tool1 = registry.getTool('test_tool', '1.0.0');
      const tool2 = registry.getTool('test_tool', '2.0.0');

      assert.strictEqual(tool1?.metadata.enabled, false);
      assert.strictEqual(tool2?.metadata.enabled, false);
    });
  });

  describe('Registry Export', () => {
    it('should export registry as JSON', () => {
      registry.register(createTestTool('tool1', '1.0.0'));
      registry.register(createTestTool('tool2', '1.0.0'));

      const exported = registry.exportRegistry();

      assert.ok(exported.engineVersion);
      assert.strictEqual(exported.toolCount, 2);
      assert.ok(Array.isArray(exported.tools));
      assert.ok(exported.statistics);
    });

    it('should include all versions in export', () => {
      registry.register(createTestTool('test_tool', '1.0.0'));
      registry.register(createTestTool('test_tool', '2.0.0'));

      const exported = registry.exportRegistry();
      const tool = exported.tools.find((t: any) => t.name === 'test_tool');

      assert.strictEqual(tool.versions.length, 2);
    });
  });
});
