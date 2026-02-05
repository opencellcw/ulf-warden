/**
 * Enhanced Tool Registry Examples
 *
 * Shows how to create tools with versioning, dependencies, and validation
 */

import { z } from 'zod';
import {
  EnhancedToolRegistry,
  EnhancedToolHandler,
  EnhancedToolMetadata,
} from '../src/core/tool-registry-enhanced';

// Create registry instance
const registry = new EnhancedToolRegistry('1.0.0');

// ===== Example 1: Simple Tool with Versioning =====

const calculatorTool: EnhancedToolHandler = {
  metadata: {
    name: 'calculator',
    version: '1.0.0',
    description: 'Performs basic arithmetic operations',
    category: 'utilities',
    enabled: true,

    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),

    outputSchema: z.object({
      result: z.number(),
    }),

    examples: [
      {
        input: { operation: 'add', a: 5, b: 3 },
        output: { result: 8 },
        description: 'Addition example',
      },
      {
        input: { operation: 'multiply', a: 4, b: 7 },
        output: { result: 28 },
        description: 'Multiplication example',
      },
    ],

    tags: ['math', 'calculator', 'arithmetic'],

    security: {
      idempotent: true,
      requiresApproval: false,
      riskLevel: 'low',
    },

    author: 'System',
    license: 'MIT',
    createdAt: new Date('2026-01-01'),
  },

  execute: async (input, context) => {
    const { operation, a, b } = input;

    let result: number;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        result = a / b;
        break;
    }

    return { result };
  },
};

// ===== Example 2: Tool with Dependencies =====

const advancedCalculatorTool: EnhancedToolHandler = {
  metadata: {
    name: 'advanced_calculator',
    version: '2.0.0',
    description: 'Advanced calculator with scientific functions',
    category: 'utilities',
    enabled: true,

    dependencies: [
      {
        name: 'calculator',
        version: '^1.0.0', // Requires calculator v1.x.x
        optional: false,
      },
    ],

    inputSchema: z.object({
      operation: z.enum(['power', 'sqrt', 'log', 'sin', 'cos']),
      value: z.number(),
      exponent: z.number().optional(),
    }),

    outputSchema: z.object({
      result: z.number(),
    }),

    tags: ['math', 'scientific', 'advanced'],

    security: {
      idempotent: true,
      requiresApproval: false,
      riskLevel: 'low',
    },
  },

  execute: async (input, context) => {
    const { operation, value, exponent } = input;

    let result: number;
    switch (operation) {
      case 'power':
        if (exponent === undefined) throw new Error('Exponent required for power operation');
        result = Math.pow(value, exponent);
        break;
      case 'sqrt':
        result = Math.sqrt(value);
        break;
      case 'log':
        result = Math.log(value);
        break;
      case 'sin':
        result = Math.sin(value);
        break;
      case 'cos':
        result = Math.cos(value);
        break;
    }

    return { result };
  },
};

// ===== Example 3: Deprecated Tool =====

const oldApiTool: EnhancedToolHandler = {
  metadata: {
    name: 'old_api_client',
    version: '1.5.0',
    description: 'Legacy API client (deprecated)',
    category: 'api',
    enabled: true,
    deprecated: true,
    deprecationMessage: 'This tool will be removed in version 3.0.0',
    replacedBy: 'new_api_client',

    inputSchema: z.object({
      endpoint: z.string(),
      method: z.enum(['GET', 'POST']),
    }),

    security: {
      idempotent: false,
      requiresApproval: true,
      riskLevel: 'medium',
    },
  },

  execute: async (input, context) => {
    console.warn('⚠️  Using deprecated tool: old_api_client');
    return { message: 'Please migrate to new_api_client' };
  },
};

// ===== Example 4: Tool with Version History =====

const dataProcessorTool: EnhancedToolHandler = {
  metadata: {
    name: 'data_processor',
    version: '2.1.0',
    description: 'Process and transform data',
    category: 'data',
    enabled: true,

    versionHistory: [
      {
        version: '1.0.0',
        deprecated: true,
        deprecationMessage: 'Migrated to v2.x for better performance',
      },
      {
        version: '2.0.0',
        minEngineVersion: '0.9.0',
      },
      {
        version: '2.1.0',
        minEngineVersion: '1.0.0',
      },
    ],

    inputSchema: z.object({
      data: z.array(z.any()),
      operation: z.enum(['filter', 'map', 'reduce']),
      predicate: z.string().optional(),
    }),

    outputSchema: z.object({
      processed: z.array(z.any()),
      count: z.number(),
    }),

    tags: ['data', 'processing', 'transform'],

    security: {
      idempotent: true,
      requiresApproval: false,
      riskLevel: 'low',
    },

    documentation: 'https://docs.example.com/data-processor',
  },

  execute: async (input, context) => {
    const { data, operation } = input;

    let processed: any[];
    switch (operation) {
      case 'filter':
        processed = data.filter(item => item !== null);
        break;
      case 'map':
        processed = data.map(item => ({ value: item }));
        break;
      case 'reduce':
        processed = [data.reduce((acc, val) => acc + val, 0)];
        break;
      default:
        processed = data;
    }

    return {
      processed,
      count: processed.length,
    };
  },
};

// ===== Example 5: Tool with Permissions =====

const adminTool: EnhancedToolHandler = {
  metadata: {
    name: 'admin_panel',
    version: '1.0.0',
    description: 'Administrative operations',
    category: 'admin',
    enabled: true,

    inputSchema: z.object({
      action: z.enum(['reset', 'backup', 'restore']),
      confirm: z.boolean(),
    }),

    security: {
      idempotent: false,
      requiresApproval: true,
      riskLevel: 'critical',
      permissions: ['admin', 'superuser'],
    },

    tags: ['admin', 'dangerous'],
  },

  execute: async (input, context) => {
    const { action, confirm } = input;

    if (!confirm) {
      throw new Error('Action not confirmed');
    }

    return { message: `${action} completed successfully` };
  },
};

// ===== Run Examples =====

async function runExamples() {
  console.log('========================================');
  console.log('  Enhanced Tool Registry Examples');
  console.log('========================================\n');

  // Register all tools
  console.log('1. Registering tools...\n');

  const results = [
    registry.register(calculatorTool),
    registry.register(advancedCalculatorTool),
    registry.register(oldApiTool),
    registry.register(dataProcessorTool),
    registry.register(adminTool),
  ];

  results.forEach((result, i) => {
    console.log(`Tool ${i + 1}:`, result.success ? '✅' : '❌', result.message);
    if (result.warnings && result.warnings.length > 0) {
      console.log('  Warnings:', result.warnings);
    }
    if (result.errors && result.errors.length > 0) {
      console.log('  Errors:', result.errors);
    }
  });

  console.log('\n2. Registry Statistics:\n');
  const stats = registry.getStatistics();
  console.log(JSON.stringify(stats, null, 2));

  console.log('\n3. Getting Tools:\n');

  // Get specific tool
  const calc = registry.getTool('calculator');
  console.log('Calculator tool:', calc?.metadata.name, calc?.metadata.version);

  // Get all versions
  const versions = registry.getToolVersions('calculator');
  console.log('Calculator versions:', versions);

  // Get tools by category
  const utilityTools = registry.getToolsByCategory('utilities');
  console.log('Utility tools:', utilityTools.map(t => `${t.metadata.name}@${t.metadata.version}`));

  // Get deprecated tools
  const deprecated = registry.getDeprecatedTools();
  console.log('Deprecated tools:', deprecated.map(t => t.metadata.name));

  console.log('\n4. Executing Tools:\n');

  try {
    // Execute calculator
    const result1 = await registry.execute('calculator', {
      operation: 'add',
      a: 10,
      b: 5,
    }, {
      userId: 'user123',
      userRequest: 'Calculate 10 + 5',
    });
    console.log('Calculator result:', result1);

    // Execute with validation error
    try {
      await registry.execute('calculator', {
        operation: 'add',
        a: 'invalid', // Wrong type
        b: 5,
      }, {
        userId: 'user123',
        userRequest: 'Invalid input',
      });
    } catch (error: any) {
      console.log('Validation error (expected):', error.message.substring(0, 50) + '...');
    }

    // Execute deprecated tool (should show warning)
    const result2 = await registry.execute('old_api_client', {
      endpoint: '/test',
      method: 'GET',
    }, {
      userId: 'user123',
      userRequest: 'Use old API',
    });
    console.log('Deprecated tool result:', result2);

  } catch (error: any) {
    console.error('Execution error:', error.message);
  }

  console.log('\n5. Tool Definitions for Claude API:\n');
  const definitions = registry.getEnabledToolDefinitions();
  console.log(`Generated ${definitions.length} tool definitions`);
  console.log('Example:', JSON.stringify(definitions[0], null, 2));

  console.log('\n6. Export Registry:\n');
  const exported = registry.exportRegistry();
  console.log('Exported registry has', exported.tools.length, 'tools');

  console.log('\n✅ All examples completed!');
}

// Run if called directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export { registry, calculatorTool, advancedCalculatorTool };
