# Enhanced Tool Registry

Comprehensive tool management system with versioning, dependency resolution, and validation.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Quick Start](#quick-start)
- [Tool Versioning](#tool-versioning)
- [Dependencies](#dependencies)
- [Validation](#validation)
- [Deprecation](#deprecation)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)

## Overview

The Enhanced Tool Registry provides enterprise-grade tool management with:

- **Semantic Versioning** - Full semver support for tools
- **Dependency Resolution** - Tools can depend on other tools
- **Schema Validation** - Automatic input/output validation with Zod
- **Deprecation Management** - Mark tools as deprecated with migration paths
- **Compatibility Checking** - Ensure engine and dependency compatibility
- **Auto-Discovery** - Automatically load tools from filesystem
- **Statistics & Monitoring** - Track tool usage and health

## Features

### ✅ Core Features

- [x] Semantic versioning (1.0.0, 2.1.3, etc.)
- [x] Multiple versions of same tool
- [x] Dependency resolution with version ranges
- [x] JSON Schema generation from Zod
- [x] Input/output validation
- [x] Tool deprecation warnings
- [x] Engine compatibility checks
- [x] Auto-discovery from filesystem
- [x] Tool enable/disable
- [x] Category and tag filtering
- [x] Security metadata
- [x] Registry export/import

### ✅ Improvements over Basic Registry

| Feature | Basic | Enhanced |
|---------|-------|----------|
| Versioning | ❌ | ✅ Semver |
| Dependencies | ❌ | ✅ With ranges |
| Validation | Basic | ✅ Zod → JSON Schema |
| Deprecation | ❌ | ✅ Full support |
| Multiple Versions | ❌ | ✅ Side-by-side |
| Compatibility Check | ❌ | ✅ Automatic |

## Quick Start

### 1. Create a Tool

```typescript
import { z } from 'zod';
import { EnhancedToolHandler } from './src/core/tool-registry-enhanced';

const calculatorTool: EnhancedToolHandler = {
  metadata: {
    name: 'calculator',
    version: '1.0.0',
    description: 'Performs arithmetic operations',
    category: 'utilities',
    enabled: true,

    // Input validation
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide']),
      a: z.number(),
      b: z.number(),
    }),

    // Output validation
    outputSchema: z.object({
      result: z.number(),
    }),

    // Documentation
    examples: [{
      input: { operation: 'add', a: 5, b: 3 },
      output: { result: 8 },
    }],

    tags: ['math', 'calculator'],

    security: {
      idempotent: true,
      requiresApproval: false,
      riskLevel: 'low',
    },
  },

  execute: async (input, context) => {
    const { operation, a, b } = input;

    let result: number;
    switch (operation) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide':
        if (b === 0) throw new Error('Division by zero');
        result = a / b;
        break;
    }

    return { result };
  },
};
```

### 2. Register Tool

```typescript
import { enhancedToolRegistry } from './src/core/tool-registry-enhanced';

const result = enhancedToolRegistry.register(calculatorTool);

if (result.success) {
  console.log('✅', result.message);
} else {
  console.error('❌', result.errors);
}
```

### 3. Execute Tool

```typescript
const result = await enhancedToolRegistry.execute(
  'calculator',
  { operation: 'add', a: 10, b: 5 },
  { userId: 'user123', userRequest: 'Calculate 10 + 5' }
);

console.log(result); // { result: 15 }
```

## Tool Versioning

### Semantic Versioning

Tools follow semver (MAJOR.MINOR.PATCH):

```typescript
{
  name: 'my_tool',
  version: '2.1.3', // MAJOR.MINOR.PATCH
}
```

### Multiple Versions

Register multiple versions side-by-side:

```typescript
// Register v1
registry.register({
  metadata: { name: 'my_tool', version: '1.0.0', ... },
  execute: async (input) => { /* v1 logic */ },
});

// Register v2 (breaking changes)
registry.register({
  metadata: { name: 'my_tool', version: '2.0.0', ... },
  execute: async (input) => { /* v2 logic */ },
});
```

### Version Selection

```typescript
// Get latest version
const tool = registry.getTool('my_tool');

// Get specific version
const toolV1 = registry.getTool('my_tool', '1.0.0');

// Execute specific version
await registry.execute('my_tool', input, context, '1.0.0');
```

### Version History

Track tool evolution:

```typescript
{
  name: 'data_processor',
  version: '2.1.0',
  versionHistory: [
    {
      version: '1.0.0',
      deprecated: true,
      deprecationMessage: 'Migrated to v2.x for performance',
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
}
```

## Dependencies

### Declaring Dependencies

Tools can depend on other tools:

```typescript
{
  name: 'advanced_calculator',
  version: '2.0.0',
  dependencies: [
    {
      name: 'calculator',
      version: '^1.0.0', // Semver range
      optional: false,
    },
    {
      name: 'logger',
      version: '>=2.0.0',
      optional: true, // Won't block registration
    },
  ],
}
```

### Version Ranges

Supported semver ranges:

| Range | Meaning | Example Matches |
|-------|---------|-----------------|
| `^1.0.0` | Compatible with 1.x.x | 1.0.0, 1.5.2, 1.9.9 |
| `~1.2.3` | Patch-level changes | 1.2.3, 1.2.4, 1.2.9 |
| `>=1.0.0` | Greater or equal | 1.0.0, 2.0.0, 3.5.1 |
| `1.x` | Any 1.x version | 1.0.0, 1.9.9 |
| `*` | Any version | 0.0.1, 99.99.99 |

### Dependency Resolution

Registry automatically checks:

```typescript
const result = registry.register(toolWithDeps);

if (!result.success) {
  console.log('Dependency issues:', result.errors);
  // ["Required dependency 'calculator' not found"]
  // ["Dependency 'logger' version ^2.0.0 not satisfied"]
}
```

## Validation

### Input Validation

Automatic validation with Zod:

```typescript
{
  inputSchema: z.object({
    email: z.string().email(),
    age: z.number().min(0).max(150),
    preferences: z.object({
      theme: z.enum(['light', 'dark']),
      notifications: z.boolean(),
    }),
  }),
}
```

### Output Validation

Validate tool responses:

```typescript
{
  outputSchema: z.object({
    success: z.boolean(),
    data: z.any(),
    timestamp: z.string(),
  }),
}
```

### JSON Schema Generation

Zod schemas are automatically converted to JSON Schema for Claude API:

```typescript
const definitions = registry.getEnabledToolDefinitions();

// Output:
// [{
//   name: 'my_tool',
//   description: '...',
//   input_schema: {
//     type: 'object',
//     properties: { ... },
//     required: [ ... ],
//   }
// }]
```

## Deprecation

### Mark Tool as Deprecated

```typescript
{
  name: 'old_api',
  version: '1.5.0',
  deprecated: true,
  deprecationMessage: 'This API will be removed in v3.0.0',
  replacedBy: 'new_api', // Migration path
}
```

### Deprecation Warnings

Automatic warnings when using deprecated tools:

```typescript
const result = await registry.execute('old_api', input, context);

// Logs warning:
// [WARN] Using deprecated tool: old_api@1.5.0
//        This API will be removed in v3.0.0
//        Replaced by: new_api
```

### Get Deprecated Tools

```typescript
const deprecated = registry.getDeprecatedTools();

deprecated.forEach(tool => {
  console.log(`${tool.metadata.name}: ${tool.metadata.deprecationMessage}`);
  console.log(`  → Migrate to: ${tool.metadata.replacedBy}`);
});
```

## API Reference

### Registry Methods

#### `register(handler: EnhancedToolHandler): ToolRegistrationResult`

Register a new tool.

```typescript
const result = registry.register(myTool);

if (result.success) {
  console.log(result.message);
} else {
  console.error('Errors:', result.errors);
  console.warn('Warnings:', result.warnings);
}
```

#### `getTool(name: string, version?: string): EnhancedToolHandler | undefined`

Get a tool by name (latest version by default).

```typescript
const tool = registry.getTool('calculator');
const toolV1 = registry.getTool('calculator', '1.0.0');
```

#### `execute(name, input, context, version?): Promise<any>`

Execute a tool with validation.

```typescript
const result = await registry.execute(
  'calculator',
  { operation: 'add', a: 5, b: 3 },
  { userId: 'user123', userRequest: 'Calculate' },
  '1.0.0' // Optional version
);
```

#### `getAllTools(): EnhancedToolHandler[]`

Get all tools (latest version of each).

```typescript
const allTools = registry.getAllTools();
```

#### `getToolVersions(name: string): string[]`

Get all versions of a tool.

```typescript
const versions = registry.getToolVersions('calculator');
// ['2.0.0', '1.5.0', '1.0.0']
```

#### `getToolsByCategory(category: string): EnhancedToolHandler[]`

Filter tools by category.

```typescript
const mathTools = registry.getToolsByCategory('math');
```

#### `getToolsByTag(tag: string): EnhancedToolHandler[]`

Filter tools by tag.

```typescript
const calculators = registry.getToolsByTag('calculator');
```

#### `getDeprecatedTools(): EnhancedToolHandler[]`

Get all deprecated tools.

```typescript
const deprecated = registry.getDeprecatedTools();
```

#### `setToolEnabled(name: string, enabled: boolean, version?: string): void`

Enable/disable tool(s).

```typescript
// Disable specific version
registry.setToolEnabled('old_tool', false, '1.0.0');

// Disable all versions
registry.setToolEnabled('old_tool', false);
```

#### `getStatistics(): RegistryStatistics`

Get registry statistics.

```typescript
const stats = registry.getStatistics();

// {
//   totalTools: 10,
//   totalVersions: 15,
//   enabledTools: 8,
//   deprecatedTools: 2,
//   categories: { math: 3, data: 2, ... },
//   riskLevels: { low: 7, medium: 2, high: 1 },
// }
```

#### `autoDiscover(toolsDir: string): Promise<void>`

Auto-discover tools from directory.

```typescript
await registry.autoDiscover('./src/tools');
```

#### `exportRegistry(): any`

Export registry as JSON.

```typescript
const exported = registry.exportRegistry();
console.log(JSON.stringify(exported, null, 2));
```

## Best Practices

### 1. Use Semantic Versioning

```typescript
// ✅ Good - follows semver
version: '1.0.0' // Initial release
version: '1.1.0' // New feature (backward compatible)
version: '2.0.0' // Breaking change

// ❌ Bad - not semver
version: 'latest'
version: 'v1'
version: '1'
```

### 2. Document Breaking Changes

```typescript
{
  version: '2.0.0',
  versionHistory: [{
    version: '1.0.0',
    deprecated: true,
    deprecationMessage: 'API changed in v2.0.0. See migration guide.',
  }],
}
```

### 3. Validate All Inputs

```typescript
// ✅ Good - comprehensive validation
inputSchema: z.object({
  email: z.string().email(),
  age: z.number().min(18).max(120),
  role: z.enum(['user', 'admin']),
})

// ❌ Bad - no validation
inputSchema: z.object({
  data: z.any(),
})
```

### 4. Use Dependency Ranges

```typescript
// ✅ Good - flexible
dependencies: [
  { name: 'base_tool', version: '^1.0.0' }, // 1.x.x
]

// ❌ Bad - too strict
dependencies: [
  { name: 'base_tool', version: '1.0.0' }, // Only exact version
]
```

### 5. Mark Optional Dependencies

```typescript
dependencies: [
  { name: 'logger', version: '^2.0.0', optional: true },
  { name: 'cache', version: '^1.0.0', optional: false },
]
```

### 6. Provide Migration Paths

```typescript
{
  deprecated: true,
  deprecationMessage: 'Use new_api instead. Migration guide: https://docs.example.com/migration',
  replacedBy: 'new_api',
}
```

### 7. Set Appropriate Risk Levels

```typescript
security: {
  idempotent: false,
  requiresApproval: true,
  riskLevel: 'critical', // For destructive operations
  permissions: ['admin'],
}
```

## Examples

See complete examples in:
- `/examples/tool-registry-examples.ts` - 5 comprehensive examples
- `/tests/core/tool-registry-enhanced.test.ts` - 31 test cases

## Migration from Basic Registry

### Before (Basic Registry)

```typescript
import { toolRegistry } from './src/core/tool-registry';

toolRegistry.register({
  metadata: {
    name: 'my_tool',
    description: 'Does something',
    category: 'utilities',
    enabled: true,
    security: { ... },
  },
  execute: async (input, context) => { ... },
});
```

### After (Enhanced Registry)

```typescript
import { enhancedToolRegistry } from './src/core/tool-registry-enhanced';

enhancedToolRegistry.register({
  metadata: {
    name: 'my_tool',
    version: '1.0.0', // ← Add version
    description: 'Does something',
    category: 'utilities',
    enabled: true,

    // ← Add schemas
    inputSchema: z.object({ ... }),
    outputSchema: z.object({ ... }),

    // ← Add metadata
    tags: ['utility', 'common'],
    examples: [{ input: {}, output: {} }],

    security: { ... },
  },
  execute: async (input, context) => { ... },
});
```

## Troubleshooting

### Dependency Not Found

```
Error: Required dependency 'base_tool' not found
```

**Solution:** Register dependencies before dependent tools.

### Version Incompatibility

```
Error: Dependency 'logger' version ^2.0.0 not satisfied
```

**Solution:** Register compatible version or adjust version range.

### Invalid Input

```
Error: Invalid input for tool calculator: Expected number, received string
```

**Solution:** Fix input or update inputSchema.

## References

- [Semantic Versioning Spec](https://semver.org/)
- [Zod Documentation](https://zod.dev/)
- [JSON Schema Spec](https://json-schema.org/)
