# Enhanced Tool Registry System Documentation

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Tool Metadata Structure](#tool-metadata-structure)
6. [Semantic Versioning](#semantic-versioning)
7. [Creating Tools](#creating-tools)
8. [Dependency Resolution](#dependency-resolution)
9. [System Compatibility](#system-compatibility)
10. [Deprecation](#deprecation)
11. [API Endpoints](#api-endpoints)
12. [Auto-Discovery](#auto-discovery)
13. [Validation](#validation)
14. [Security](#security)
15. [Performance](#performance)
16. [API Reference](#api-reference)
17. [Best Practices](#best-practices)
18. [Troubleshooting](#troubleshooting)
19. [Migration Guide](#migration-guide)
20. [Roadmap](#roadmap)

---

## Overview

The Enhanced Tool Registry is a sophisticated tool management system that enables OpenCellCW to organize, validate, and execute tools with advanced features including:

- **Semantic versioning** for tool lifecycle management
- **Dependency resolution** with circular dependency detection
- **JSON Schema validation** for inputs and outputs
- **System compatibility checks** (min/max system versions)
- **Deprecation tracking** with migration paths
- **Automatic filesystem discovery** of tool implementations
- **Risk-based security model** with permission checking
- **Performance metrics** tracking and concurrent execution limits

The registry acts as a single source of truth for all tools, providing metadata management, validation, and execution orchestration. It replaces the older switch-based execution model while maintaining backward compatibility through a compatibility layer.

---

## Features

### 1. Semantic Versioning (semver)

Tools follow semantic versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Breaking API changes
- **MINOR**: Backward-compatible feature additions
- **PATCH**: Bug fixes and improvements

Version ranges supported: `^1.0.0`, `~2.1.0`, `>=1.0.0 <2.0.0`, `1.x`, `*`

### 2. Dependency Resolution

Tools can declare dependencies on other tools with version constraints:
- Required vs. optional dependencies
- Automatic version satisfaction checking
- Circular dependency detection
- Dependency status validation (enabled/disabled)

### 3. JSON Schema Validation

- Input validation using Zod schemas
- Output validation against declared schemas
- Automatic conversion of Zod to JSON Schema for API compatibility
- Validation errors prevent tool execution

### 4. Compatibility Checks

- Minimum system version (`minimumSystemVersion`)
- Maximum system version (`maximumSystemVersion`)
- System version: `1.0.0`
- Prevents incompatible tools from loading

### 5. Deprecation Management

- Mark tools as deprecated
- Custom deprecation messages
- Warnings logged during execution
- Guides for migration to replacement tools

### 6. Auto-Discovery

- Automatic filesystem scanning of tool directories
- Recursive subdirectory traversal
- Intelligent file filtering (excludes test, node_modules, dist)
- Handler validation during load

### 7. API Endpoints

RESTful endpoints for:
- Tool registration and management
- Dependency resolution queries
- Execution with validation
- Statistics and diagnostics

### 8. Performance Optimization

- Estimated execution duration tracking
- Concurrent execution limits per tool
- Execution timing metrics
- Resource constraint enforcement

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Enhanced Tool Registry                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
         ┌──────▼──────┐  ┌──▼────┐  ┌────▼──────┐
         │ Tool Loader │  │ Validator│  │ Executor │
         └──────┬──────┘  └──┬─────┘  └────┬──────┘
                │            │            │
         ┌──────▼────────────▼─────────────▼──────┐
         │        Tool Metadata Map               │
         │  name -> ToolHandler                   │
         └──────────────────────────────────────┘
                │
         ┌──────▼─────────────────────────────┐
         │    Dependency Graph                │
         │  name -> Set<dependencies>         │
         └────────────────────────────────────┘
                │
         ┌──────▼────────────────────────────────┐
         │  Security & Validation Rules          │
         │  - Permissions checking               │
         │  - Input/output validation            │
         │  - Risk level assessment              │
         │  - Approval requirements              │
         └───────────────────────────────────────┘
```

### Key Components

1. **Tool Storage Map**: Name-based lookup of tool handlers
2. **Dependency Graph**: Tracks relationships between tools
3. **Validation Engine**: Verifies metadata, inputs, and outputs
4. **Execution Engine**: Manages tool execution with security checks
5. **Auto-Discovery Engine**: Scans filesystem for tools

---

## Quick Start

### Installation

The Enhanced Tool Registry is built into the core system. Import it:

```typescript
import { enhancedToolRegistry, ToolHandler, ToolMetadata } from './src/core/tool-registry-enhanced';
```

### Basic Usage

Register and execute a tool:

```typescript
import { z } from 'zod';
import { enhancedToolRegistry, ToolHandler } from './src/core/tool-registry-enhanced';

// Create tool metadata
const metadata: ToolMetadata = {
  name: 'my-tool',
  description: 'A simple demonstration tool',
  category: 'utilities',
  version: { current: '1.0.0' },
  enabled: true,
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  security: {
    idempotent: true,
    requiresApproval: false,
    riskLevel: 'low'
  }
};

// Create handler
const handler: ToolHandler = {
  metadata,
  execute: async (input: any, context: any) => {
    return { result: `Processed: ${input.message}` };
  }
};

// Register
const result = enhancedToolRegistry.register(handler);
console.log('Registration valid:', result.valid);

// Execute
const output = await enhancedToolRegistry.execute(
  'my-tool',
  { message: 'hello' },
  { userId: 'user123', userRequest: 'test' }
);
```

### Auto-Discovery

Automatically discover and load tools from a directory:

```typescript
// Scan tools directory and register all found tools
await enhancedToolRegistry.autoDiscover('./src/tools');

// Tools are now available
const stats = enhancedToolRegistry.getStats();
console.log(`Loaded ${stats.totalTools} tools`);
```

---

## Tool Metadata Structure

Complete breakdown of the `ToolMetadata` interface:

```typescript
interface ToolMetadata {
  // Required: Tool identification
  name: string;                           // Unique identifier (lowercase, kebab-case)
  description: string;                    // 1-2 sentence description
  category: string;                       // Logical grouping (e.g., 'database', 'api')

  // Required: Versioning
  version: {
    current: string;                      // Semantic version (e.g., "1.2.3")
    deprecated?: boolean;                 // Mark as no longer maintained
    deprecationMessage?: string;          // Reason and migration guidance
    minimumSystemVersion?: string;        // Min required system version
    maximumSystemVersion?: string;        // Max compatible system version
  };

  // Optional: Dependencies
  dependencies?: Array<{
    toolName: string;                     // Name of required/optional tool
    versionRange: string;                 // Semver range constraint
    optional?: boolean;                   // If true, failure is non-fatal
  }>;

  // Optional: Validation schemas
  inputSchema?: z.ZodSchema;              // Zod schema for input validation
  outputSchema?: z.ZodSchema;             // Zod schema for output validation

  // Optional: Examples
  examples?: Array<{
    input: any;                           // Example input object
    output: any;                          // Expected output
    description?: string;                 // Scenario description
  }>;

  // Optional: Organization
  tags?: string[];                        // Free-form categorization
  author?: string;                        // Tool author
  license?: string;                       // License (e.g., 'MIT', 'Apache-2.0')
  repository?: string;                    // Source code repository URL

  // Required: Behavior flags
  enabled: boolean;                       // Whether tool is active

  // Required: Security configuration
  security: {
    idempotent: boolean;                  // Safe to retry without side effects
    requiresApproval: boolean;            // Human approval needed before execution
    riskLevel: 'low'|'medium'|'high'|'critical'; // Impact severity
    permissions?: string[];               // Required user permissions
  };

  // Optional: Performance constraints
  performance?: {
    estimatedDuration?: number;           // Expected execution time (ms)
    maxConcurrent?: number;               // Max parallel executions
  };
}
```

### Detailed Field Descriptions

#### name
- Format: lowercase, kebab-case, alphanumeric with hyphens
- Examples: `fetch-user-data`, `process-image`, `validate-email`
- Must be unique across the registry

#### category
- Logical grouping for organization and discovery
- Examples: `database`, `api`, `file-system`, `ai-models`, `messaging`
- Used for querying tools by category

#### version.current
- Semantic version format: MAJOR.MINOR.PATCH
- Must be valid semver string
- Example: `1.2.3`, `0.1.0`, `2.0.0-beta.1`

#### dependencies
- Optional array of dependency objects
- Each specifies a tool this one requires
- Version ranges follow npm semver syntax
- Example:
  ```typescript
  dependencies: [
    { toolName: 'database-client', versionRange: '^2.0.0', optional: false },
    { toolName: 'cache-service', versionRange: '>=1.5.0', optional: true }
  ]
  ```

#### security.riskLevel
- `low`: Non-destructive reads, safe operations
- `medium`: Modifies data, requires basic validation
- `high`: Destructive operations, requires approval
- `critical`: System-level, security-sensitive operations

#### tags
- Free-form string array for advanced filtering
- Examples: `['async', 'database', 'slow']`
- Enables discovering related tools

---

## Semantic Versioning

### Version Format

All tool versions follow semantic versioning (semver):

```
MAJOR.MINOR.PATCH[-prerelease][+build]

Examples:
1.0.0         - Initial release
1.1.0         - Added features
1.1.1         - Bug fix
2.0.0         - Breaking changes
1.0.0-alpha   - Pre-release
1.0.0+build.1 - Build metadata
```

### Compatibility Rules

- **MAJOR** version changes are breaking: `^1.0.0` will NOT match `2.0.0`
- **MINOR** and PATCH are backward compatible
- Dependency ranges must be explicitly specified

### Version Range Syntax

| Syntax | Meaning | Examples Match |
|--------|---------|-----------------|
| `1.2.3` | Exact version | Only 1.2.3 |
| `*` or `x` | Any version | 1.0.0, 2.5.3, etc. |
| `^1.2.3` | Compatible with 1.2.3 | 1.2.3, 1.3.0, 1.9.9 (NOT 2.0.0) |
| `~1.2.3` | Approximately 1.2.3 | 1.2.3, 1.2.9 (NOT 1.3.0) |
| `>=1.2.3` | Greater than or equal | 1.2.3, 1.3.0, 2.0.0, etc. |
| `<2.0.0` | Less than | 1.9.9, 1.0.0 |
| `>=1.0.0 <2.0.0` | Range | 1.0.0 through 1.9.9 |

### Validation

All versions are validated using the `semver` package:

```typescript
import * as semver from 'semver';

semver.valid('1.2.3')              // true
semver.validRange('^1.0.0')        // true
semver.satisfies('1.5.0', '^1.0.0') // true
semver.gt('2.0.0', '1.9.9')        // true
```

---

## Creating Tools

### Example 1: Basic Tool

```typescript
import { z } from 'zod';
import { ToolHandler, ToolMetadata } from '../core/tool-registry-enhanced';

const metadata: ToolMetadata = {
  name: 'greet-user',
  description: 'Greets a user by name',
  category: 'utilities',
  version: { current: '1.0.0' },
  enabled: true,
  inputSchema: z.object({
    name: z.string().min(1, 'Name required'),
    formal: z.boolean().optional()
  }),
  outputSchema: z.object({
    greeting: z.string(),
    timestamp: z.number()
  }),
  security: {
    idempotent: true,
    requiresApproval: false,
    riskLevel: 'low'
  }
};

export const toolHandler: ToolHandler = {
  metadata,
  execute: async (input: any) => {
    const greeting = input.formal
      ? `Good day, ${input.name}`
      : `Hello, ${input.name}!`;

    return {
      greeting,
      timestamp: Date.now()
    };
  }
};
```

### Example 2: Tool with Dependencies

```typescript
import { z } from 'zod';
import { ToolHandler, ToolMetadata } from '../core/tool-registry-enhanced';

const metadata: ToolMetadata = {
  name: 'send-notification',
  description: 'Sends a notification via email or SMS',
  category: 'messaging',
  version: { current: '1.1.0' },
  enabled: true,
  dependencies: [
    {
      toolName: 'email-service',
      versionRange: '^2.0.0',
      optional: false
    },
    {
      toolName: 'sms-service',
      versionRange: '^1.5.0',
      optional: true
    }
  ],
  inputSchema: z.object({
    recipient: z.string().email(),
    message: z.string(),
    method: z.enum(['email', 'sms', 'both'])
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string()
  }),
  security: {
    idempotent: false,
    requiresApproval: true,
    riskLevel: 'medium',
    permissions: ['send:notifications']
  },
  tags: ['async', 'external-dependency']
};

export const toolHandler: ToolHandler = {
  metadata,
  execute: async (input: any, context: any) => {
    // Tool implementation
    return {
      success: true,
      messageId: `msg-${Date.now()}`
    };
  }
};
```

### Example 3: Tool with Validation Schemas

```typescript
import { z } from 'zod';
import { ToolHandler, ToolMetadata } from '../core/tool-registry-enhanced';

const metadata: ToolMetadata = {
  name: 'process-user-data',
  description: 'Validates and processes user information',
  category: 'data-processing',
  version: { current: '2.1.3' },
  minimumSystemVersion: '1.0.0',
  enabled: true,
  inputSchema: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    age: z.number().int().min(0).max(150),
    preferences: z.object({
      newsletter: z.boolean(),
      notifications: z.boolean()
    }),
    tags: z.array(z.string()).optional()
  }),
  outputSchema: z.object({
    userId: z.string(),
    processed: z.boolean(),
    warnings: z.array(z.string()),
    data: z.object({
      email: z.string(),
      age: z.number(),
      preferences: z.object({
        newsletter: z.boolean(),
        notifications: z.boolean()
      })
    })
  }),
  examples: [
    {
      input: {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'user@example.com',
        age: 30,
        preferences: { newsletter: true, notifications: false },
        tags: ['vip', 'early-adopter']
      },
      output: {
        userId: '550e8400-e29b-41d4-a716-446655440000',
        processed: true,
        warnings: [],
        data: {
          email: 'user@example.com',
          age: 30,
          preferences: { newsletter: true, notifications: false }
        }
      },
      description: 'Valid user data processing'
    }
  ],
  security: {
    idempotent: true,
    requiresApproval: false,
    riskLevel: 'low',
    permissions: ['read:users', 'write:users']
  },
  performance: {
    estimatedDuration: 100,
    maxConcurrent: 50
  },
  author: 'Platform Team',
  license: 'MIT'
};

export const toolHandler: ToolHandler = {
  metadata,
  execute: async (input: any, context: any) => {
    // Normalize email
    const email = input.email.toLowerCase();

    // Validation happens automatically before execution
    return {
      userId: input.id,
      processed: true,
      warnings: input.age > 120 ? ['Age seems unusually high'] : [],
      data: {
        email,
        age: input.age,
        preferences: input.preferences
      }
    };
  }
};
```

---

## Dependency Resolution

### How It Works

When a tool is registered, the registry builds a dependency graph. When a tool is executed:

1. All dependencies are checked for existence
2. Version constraints are validated
3. Circular dependencies are detected and blocked
4. Optional dependencies log warnings if missing
5. Required dependencies block execution if missing

### Required vs. Optional Dependencies

```typescript
const metadata: ToolMetadata = {
  name: 'multi-step-processor',
  dependencies: [
    // Required: execution fails if missing or wrong version
    {
      toolName: 'database',
      versionRange: '^3.0.0',
      optional: false
    },
    // Optional: execution continues with warning
    {
      toolName: 'cache-layer',
      versionRange: '>=2.0.0',
      optional: true
    }
  ]
  // ... rest of metadata
};
```

### Version Constraint Examples

```typescript
dependencies: [
  // Exact version only
  { toolName: 'critical-lib', versionRange: '1.0.0' },

  // Compatible with major version
  { toolName: 'database', versionRange: '^2.0.0' },  // 2.x.x

  // Approximate version
  { toolName: 'logger', versionRange: '~1.5.0' },   // 1.5.x

  // Version ranges
  { toolName: 'api-client', versionRange: '>=1.0.0 <2.0.0' },

  // Any version
  { toolName: 'utility', versionRange: '*' }
]
```

### Circular Dependency Detection

The registry detects and prevents circular dependencies:

```typescript
// Example: Tool A -> B -> C -> A (CIRCULAR - BLOCKED)
// A depends on B
// B depends on C
// C depends on A  ← Detected and prevented

const depCheck = enhancedToolRegistry.resolveDependencies('tool-a');
if (!depCheck.valid) {
  console.error('Circular dependency:', depCheck.errors);
}
```

### Dependency Resolution API

```typescript
// Check if all dependencies are satisfied
const result = enhancedToolRegistry.resolveDependencies('my-tool');

if (!result.valid) {
  console.error('Dependency errors:', result.errors);
  // Errors: ["Required dependency not found: ...", ...]
} else {
  console.log('All dependencies satisfied');
}

if (result.warnings.length > 0) {
  console.warn('Dependency warnings:', result.warnings);
  // Warnings: ["Optional dependency not found: ...", ...]
}
```

---

## System Compatibility

### Minimum and Maximum System Versions

Tools can declare compatibility windows:

```typescript
const metadata: ToolMetadata = {
  name: 'legacy-tool',
  version: {
    current: '1.0.0',
    minimumSystemVersion: '0.9.0',  // Requires system >= 0.9.0
    maximumSystemVersion: '1.5.0'   // Requires system <= 1.5.0
  }
  // ... rest of metadata
};
```

### Compatibility Checks During Registration

```typescript
const result = enhancedToolRegistry.register(handler);

if (!result.valid) {
  // Could be incompatible with current system version
  console.error('Registration failed:', result.errors);
  // Error: "Tool requires system version >=2.0.0, current: 1.0.0"
}
```

### Current System Version

The current system version is: **1.0.0**

```typescript
import { SYSTEM_VERSION } from '../core/tool-registry-enhanced';

console.log('System version:', SYSTEM_VERSION); // "1.0.0"
```

### Upgrading System Version

When the system is upgraded, tools with incompatible versions will be rejected at registration time. This ensures:

- Tools requiring newer features fail early with clear errors
- Deprecated tools won't run on systems past their max version
- Version constraints guide upgrade planning

---

## Deprecation

### Marking Tools as Deprecated

Use the deprecation API to retire old tools:

```typescript
// Set deprecation at registration time
const metadata: ToolMetadata = {
  name: 'old-api-client',
  version: {
    current: '1.0.0',
    deprecated: true,
    deprecationMessage: 'Use new-api-client v2.0.0 instead. Migration guide: docs/migration/old-to-new-api.md'
  }
  // ... rest of metadata
};

// Or deprecate after registration
enhancedToolRegistry.deprecateTool(
  'old-api-client',
  'Use new-api-client v2.0.0 instead'
);
```

### Effects of Deprecation

1. **Registration**: Warning logged but tool is registered
2. **Execution**: Warning logged but tool still runs
3. **API**: Excluded from `getEnabledToolDefinitions()` for Claude
4. **Dependencies**: Tools depending on deprecated tools get warnings
5. **Logging**: All deprecation messages are tracked

### Migration Paths

Deprecation messages should include migration guidance:

```typescript
deprecationMessage: `
This tool is deprecated as of v1.5.0.
Migrate to 'new-tool-name' which provides the same functionality with better performance.

Migration steps:
1. Update tool references in configuration from 'old-tool' to 'new-tool-name'
2. Adjust input parameters to match new schema (see docs/migration/old-to-new.md)
3. Run tests to verify output compatibility

Removal date: 2026-08-01
Support until: 2026-06-01
`
```

### Querying Deprecation Status

```typescript
const stats = enhancedToolRegistry.getStats();
console.log(`Deprecated tools: ${stats.deprecatedTools}`);

// Get specific tool's deprecation status
const tool = enhancedToolRegistry.getTool('old-api-client');
if (tool?.metadata.version.deprecated) {
  console.log('Message:', tool.metadata.version.deprecationMessage);
}
```

---

## API Endpoints

### Tool Management Endpoints

#### GET /api/tools
List all registered tools with metadata.

**Response:**
```json
{
  "tools": [
    {
      "name": "my-tool",
      "description": "...",
      "version": "1.0.0",
      "category": "utilities",
      "enabled": true,
      "deprecated": false,
      "riskLevel": "low"
    }
  ],
  "total": 42
}
```

#### GET /api/tools/:name
Get detailed metadata for a specific tool.

**Response:**
```json
{
  "name": "my-tool",
  "description": "...",
  "version": {
    "current": "1.0.0",
    "deprecated": false,
    "minimumSystemVersion": "1.0.0"
  },
  "category": "utilities",
  "dependencies": [
    {
      "toolName": "other-tool",
      "versionRange": "^1.0.0",
      "optional": false
    }
  ],
  "security": {
    "riskLevel": "low",
    "idempotent": true,
    "requiresApproval": false,
    "permissions": []
  },
  "performance": {
    "estimatedDuration": 100,
    "maxConcurrent": 50
  },
  "enabled": true
}
```

#### POST /api/tools/:name/execute
Execute a tool with input and context.

**Request:**
```json
{
  "input": { "message": "hello" },
  "context": {
    "userId": "user123",
    "userRequest": "test request",
    "permissions": ["execute:tools"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "result": { "output": "processed" },
  "executionTime": 145,
  "warnings": []
}
```

#### GET /api/tools/:name/dependencies
Resolve and validate dependencies for a tool.

**Response:**
```json
{
  "valid": true,
  "errors": [],
  "warnings": ["Optional dependency not found: cache-service"],
  "dependencies": [
    {
      "name": "database",
      "version": "2.1.0",
      "satisfied": true
    }
  ]
}
```

#### GET /api/tools/category/:category
List all tools in a category.

**Response:**
```json
{
  "category": "database",
  "tools": [
    { "name": "database-client", "version": "1.0.0" },
    { "name": "migration-runner", "version": "2.1.0" }
  ]
}
```

#### GET /api/tools/tag/:tag
List all tools with a specific tag.

**Response:**
```json
{
  "tag": "async",
  "tools": [
    { "name": "message-queue", "version": "1.0.0" },
    { "name": "event-emitter", "version": "1.5.0" }
  ]
}
```

#### GET /api/registry/stats
Get registry statistics and health.

**Response:**
```json
{
  "totalTools": 42,
  "enabledTools": 38,
  "deprecatedTools": 2,
  "byCategory": {
    "database": 8,
    "api": 12,
    "messaging": 6,
    "utilities": 16
  },
  "byRiskLevel": {
    "low": 30,
    "medium": 8,
    "high": 3,
    "critical": 1
  },
  "byVersion": {
    "v1": 25,
    "v2": 15,
    "v3": 2
  }
}
```

#### POST /api/tools/:name/enable
Enable a disabled tool.

**Response:**
```json
{
  "success": true,
  "message": "Tool 'my-tool' enabled"
}
```

#### POST /api/tools/:name/disable
Disable an enabled tool.

**Response:**
```json
{
  "success": true,
  "message": "Tool 'my-tool' disabled"
}
```

#### POST /api/tools/:name/deprecate
Mark a tool as deprecated.

**Request:**
```json
{
  "message": "Use new-tool instead"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Tool 'old-tool' deprecated"
}
```

---

## Auto-Discovery

### How It Works

The auto-discovery system scans directories for tool implementations:

```typescript
// Scan and auto-discover all tools
await enhancedToolRegistry.autoDiscover('./src/tools');
```

### File Structure

Tools are discovered by:
- **Recursive scanning** starting from the provided directory
- **File matching** on `.ts` and `.js` extensions
- **Handler detection** looking for exported `toolHandler` object
- **Validation** ensuring proper structure before registration

Expected structure:

```
src/tools/
├── database/
│   ├── fetch-user.ts        ← Exported toolHandler
│   ├── update-user.ts       ← Exported toolHandler
│   └── delete-user.ts       ← Exported toolHandler
├── api/
│   ├── call-external-api.ts ← Exported toolHandler
│   └── webhook-handler.ts   ← Exported toolHandler
├── messaging/
│   ├── send-email.ts        ← Exported toolHandler
│   └── send-sms.ts          ← Exported toolHandler
├── index.ts                 ← Skipped (utility file)
├── definitions.ts           ← Skipped (utility file)
└── tests/
    └── tools.test.ts        ← Skipped (test file)
```

### Exclusion Rules

Auto-discovery **skips**:

- Directories: `node_modules`, `dist`, `test`, `tests`, `__tests__`
- Files: `index.ts`, `index.js`, `definitions.ts`, `definitions.js`
- Files: `*.test.ts`, `*.test.js`, `*.spec.ts`, `*.spec.js`

### Handler Detection

A file must export a `toolHandler` object:

```typescript
// ✓ DISCOVERED
export const toolHandler: ToolHandler = {
  metadata: { /* ... */ },
  execute: async (input, context) => { /* ... */ }
};

// ✗ NOT DISCOVERED
export function myTool() { /* ... */ }

// ✗ NOT DISCOVERED
const toolHandler = { /* invalid structure */ };
```

### Discovery Results

```typescript
const discovery = await enhancedToolRegistry.autoDiscover('./src/tools');

const stats = enhancedToolRegistry.getStats();
console.log(`Discovered: ${stats.totalTools} tools`);
console.log(`Enabled: ${stats.enabledTools}`);
console.log(`By category:`, stats.byCategory);
```

---

## Validation

### Input Validation

Tools with `inputSchema` validate inputs before execution:

```typescript
const metadata: ToolMetadata = {
  inputSchema: z.object({
    email: z.string().email('Invalid email'),
    age: z.number().int().min(0),
    tags: z.array(z.string()).optional()
  })
  // ...
};

// Valid input - execution proceeds
await registry.execute('tool', {
  email: 'user@example.com',
  age: 30,
  tags: ['tag1']
});

// Invalid input - throws error
await registry.execute('tool', {
  email: 'not-an-email',  // ✗ Invalid
  age: 30
});
// Error: Invalid input for tool my-tool: email is not a valid email
```

### Output Validation

Tools with `outputSchema` validate outputs:

```typescript
const metadata: ToolMetadata = {
  outputSchema: z.object({
    success: z.boolean(),
    userId: z.string().uuid(),
    data: z.any().optional()
  })
  // ...
};

// If tool returns invalid output, warning is logged
// but execution doesn't fail (output already returned)
```

### Schema Conversion

Zod schemas are converted to JSON Schema for API compatibility:

```typescript
import { zodToJsonSchema } from 'zod-to-json-schema';

const inputSchema = z.object({
  name: z.string().min(1),
  age: z.number().int().positive()
});

// Automatically converted for API definitions
const jsonSchema = zodToJsonSchema(inputSchema, { target: 'openApi3' });
// Result: Valid JSON Schema for OpenAPI/Claude API
```

### Validation Rules

Apply common validation patterns:

```typescript
z.object({
  // Required fields
  id: z.string(),

  // Email validation
  email: z.string().email('Must be valid email'),

  // Number constraints
  age: z.number().int().min(0).max(150),

  // String constraints
  name: z.string().min(1).max(100),

  // Enums
  status: z.enum(['active', 'inactive', 'pending']),

  // Arrays
  tags: z.array(z.string()),

  // Nested objects
  address: z.object({
    street: z.string(),
    city: z.string(),
    zip: z.string().regex(/^\d{5}$/)
  }),

  // Optional fields
  notes: z.string().optional(),

  // Union types
  contact: z.union([
    z.object({ type: z.literal('email'), value: z.string().email() }),
    z.object({ type: z.literal('phone'), value: z.string() })
  ]),

  // Default values
  retries: z.number().default(3),

  // Refined validation
  password: z.string()
    .min(8, 'Password must be 8+ characters')
    .refine(
      (pwd) => /[A-Z]/.test(pwd),
      'Must include uppercase letter'
    )
})
```

---

## Security

### Risk Levels

Tools are classified by impact:

| Level | Characteristics | Examples |
|-------|-----------------|----------|
| **low** | Read-only, non-destructive | Data fetch, reporting, validation |
| **medium** | Writes non-critical data | User preferences, logs, cache |
| **high** | Destructive operations | Delete records, disable features |
| **critical** | System-level, security-sensitive | Permission changes, key rotation |

### Permissions

Tools can require specific user permissions:

```typescript
const metadata: ToolMetadata = {
  security: {
    riskLevel: 'high',
    permissions: ['delete:users', 'write:logs'],
    requiresApproval: true
  }
  // ...
};

// Execution checks permissions
const context = {
  userId: 'admin123',
  permissions: ['delete:users', 'write:logs', 'read:system']
};

// ✓ Succeeds - has all required permissions
await registry.execute('delete-user', input, context);

// ✗ Fails - missing 'write:logs'
const limitedContext = {
  userId: 'user123',
  permissions: ['delete:users']
};
// Error: Insufficient permissions for tool
```

### Approval Requirements

High-risk tools can require human approval:

```typescript
const metadata: ToolMetadata = {
  security: {
    riskLevel: 'critical',
    requiresApproval: true
  }
  // ...
};

// Before execution, system logs the requirement
if (tool.metadata.security.requiresApproval) {
  // Send approval request to admin
  // Wait for approval before executing
}
```

### Idempotency

Mark tools as idempotent if safe to retry:

```typescript
const metadata: ToolMetadata = {
  security: {
    idempotent: true  // Safe to retry
  }
  // ...
};
```

Idempotent tools:
- Can be retried on failure without side effects
- Safe for automatic retry logic
- Produce same output for same input

Non-idempotent tools:
- May have side effects on retry
- Require careful error handling
- Should include transactional guarantees

---

## Performance

### Execution Timing

Tools are timed during execution:

```typescript
const startTime = Date.now();
const result = await tool.execute(input, context);
const duration = Date.now() - startTime;

log.debug('Tool execution', { name, duration });
```

### Performance Hints

Provide estimated duration for planning:

```typescript
const metadata: ToolMetadata = {
  performance: {
    estimatedDuration: 500,  // ~500ms expected
    maxConcurrent: 10        // Max 10 concurrent runs
  }
  // ...
};
```

### Concurrent Execution Limits

Track and enforce concurrent execution limits:

```typescript
// Track concurrent executions
const concurrent = new Map<string, number>();

// Before execution
const count = concurrent.get(toolName) || 0;
if (count >= maxConcurrent) {
  throw new Error(`Tool ${toolName} is at max concurrent limit`);
}

// Increment count
concurrent.set(toolName, count + 1);

// Execute...

// Decrement count
concurrent.set(toolName, count - 1);
```

### Performance Best Practices

1. **Cache results** when possible
2. **Use streaming** for large payloads
3. **Set realistic `maxConcurrent`** based on resource limits
4. **Log `estimatedDuration`** for capacity planning
5. **Implement timeouts** for long-running operations

---

## API Reference

### Core Methods

#### register(handler: ToolHandler): ValidationResult

Register a tool with the registry.

```typescript
const result = registry.register({
  metadata: { /* ... */ },
  execute: async (input, context) => { /* ... */ }
});

if (!result.valid) {
  console.error('Registration failed:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Warnings:', result.warnings);
}
```

**Returns:**
- `valid`: boolean - Registration succeeded
- `errors`: string[] - Validation errors
- `warnings`: string[] - Non-fatal warnings

#### getTool(name: string): ToolHandler | undefined

Get a tool by name.

```typescript
const tool = registry.getTool('my-tool');
if (!tool) {
  console.error('Tool not found');
}
```

#### getToolWithVersion(name: string, versionRange?: string): ToolHandler | undefined

Get a tool matching a version range.

```typescript
const tool = registry.getToolWithVersion('my-tool', '^1.0.0');
// Returns tool only if version satisfies ^1.0.0
```

#### getAllTools(): ToolHandler[]

Get all registered tools.

```typescript
const tools = registry.getAllTools();
console.log(`Total tools: ${tools.length}`);
```

#### getToolsByCategory(category: string): ToolHandler[]

Get tools in a category.

```typescript
const dbTools = registry.getToolsByCategory('database');
```

#### getToolsByTag(tag: string): ToolHandler[]

Get tools with a tag.

```typescript
const asyncTools = registry.getToolsByTag('async');
```

#### resolveDependencies(toolName: string): ValidationResult

Check if dependencies are satisfied.

```typescript
const result = registry.resolveDependencies('my-tool');
if (!result.valid) {
  console.error('Missing dependencies:', result.errors);
}
```

#### async execute(name: string, input: any, context: ToolContext): Promise<any>

Execute a tool with validation and dependency checks.

```typescript
try {
  const result = await registry.execute('my-tool', input, context);
  console.log('Result:', result);
} catch (error) {
  console.error('Execution failed:', error.message);
}
```

#### getEnabledToolDefinitions(): any[]

Get tool definitions for Claude API.

```typescript
const definitions = registry.getEnabledToolDefinitions();
// For Claude API tools parameter
```

#### getStats(): object

Get registry statistics.

```typescript
const stats = registry.getStats();
console.log(`Tools: ${stats.totalTools}`);
console.log(`By category:`, stats.byCategory);
```

#### setToolEnabled(name: string, enabled: boolean): void

Enable/disable a tool.

```typescript
registry.setToolEnabled('my-tool', false);  // Disable
registry.setToolEnabled('my-tool', true);   // Enable
```

#### deprecateTool(name: string, message?: string): void

Mark a tool as deprecated.

```typescript
registry.deprecateTool('old-tool', 'Use new-tool instead');
```

#### async autoDiscover(toolsDir: string): Promise<void>

Auto-discover tools from filesystem.

```typescript
await registry.autoDiscover('./src/tools');
```

#### isInitialized(): boolean

Check if registry is initialized.

```typescript
if (registry.isInitialized()) {
  console.log('Registry is ready');
}
```

---

## Best Practices

### DO

- **Use kebab-case** for tool names: `fetch-user-data` ✓
- **Provide input/output schemas** for all tools
- **Include examples** in metadata
- **Use semantic versioning** correctly
- **Mark non-idempotent tools** appropriately
- **Set realistic `maxConcurrent`** limits
- **Include deprecation guidance** when retiring tools
- **Document breaking changes** in version history
- **Use categories** to organize tools
- **Add descriptive tags** for discovery

### DON'T

- **Avoid UPPERCASE** in tool names: `FETCH_USER_DATA` ✗
- **Don't skip validation schemas** - they catch bugs early
- **Don't use arbitrary versions** - follow semver strictly
- **Don't create circular dependencies** - registry detects them
- **Don't hardcode system versions** - use configurable constants
- **Avoid marketing hyperbole** in descriptions
- **Don't put sensitive data** in tool metadata
- **Avoid extremely long names** - keep under 50 chars
- **Don't reuse tool names** - unique per registry
- **Don't omit security configuration** - always specify risk level

### Code Organization

```
src/tools/
├── database/
│   ├── index.ts           (exports all database tools)
│   ├── fetch-user.ts      (single tool file)
│   ├── update-user.ts
│   └── delete-user.ts
├── api/
│   ├── index.ts
│   └── external-call.ts
└── utilities/
    ├── index.ts
    └── format-date.ts
```

### Testing Tools

```typescript
import { enhancedToolRegistry } from '../src/core/tool-registry-enhanced';

describe('MyTool', () => {
  it('should execute with valid input', async () => {
    const tool = enhancedToolRegistry.getTool('my-tool');
    expect(tool).toBeDefined();

    const result = await enhancedToolRegistry.execute(
      'my-tool',
      { /* valid input */ },
      { userId: 'test', userRequest: 'test' }
    );

    expect(result).toMatchObject({ /* expected output */ });
  });

  it('should reject invalid input', async () => {
    expect(async () => {
      await enhancedToolRegistry.execute(
        'my-tool',
        { /* invalid input */ },
        { userId: 'test', userRequest: 'test' }
      );
    }).rejects.toThrow('Invalid input');
  });
});
```

---

## Troubleshooting

### Tool Not Found

**Problem:** `Tool not found: my-tool`

**Solutions:**
1. Verify tool is registered: `registry.getAllTools().map(t => t.metadata.name)`
2. Check tool name spelling and case (must match exactly)
3. If using auto-discovery, verify file is in correct location
4. Ensure exported object is named `toolHandler`

### Invalid Input

**Problem:** `Invalid input for tool my-tool: ...`

**Solutions:**
1. Check input schema requirements in tool metadata
2. Verify all required fields are present
3. Check field types match schema (string vs number, etc.)
4. Use example inputs from tool metadata as reference
5. Review validation error message for specific issues

### Dependency Not Found

**Problem:** `Required dependency not found: other-tool`

**Solutions:**
1. Verify dependency tool is registered: `registry.getTool('other-tool')`
2. Check tool name spelling in dependencies array
3. If optional, consider making it truly optional in code
4. Ensure dependency tool version satisfies range

### Circular Dependency

**Problem:** `Circular dependency detected: A -> B -> C -> A`

**Solutions:**
1. Review tool dependency declarations
2. Remove circular reference (A shouldn't depend on C, or C shouldn't depend on A)
3. Consider extracting shared logic to separate utility tool
4. Document dependency flow to prevent future issues

### Version Incompatibility

**Problem:** `Tool requires system version >=2.0.0, current: 1.0.0`

**Solutions:**
1. Upgrade system version if supported
2. Use tool version that supports current system
3. Check tool's minimum/maximum system version constraints
4. Review tool's version history for compatible versions

### Permission Denied

**Problem:** `Insufficient permissions for tool my-tool`

**Solutions:**
1. Check required permissions in tool metadata
2. Verify user context includes all required permissions
3. Grant user the necessary permissions
4. Audit if tool truly needs those permissions

### Auto-Discovery Issues

**Problem:** Tools not discovered

**Solutions:**
1. Verify directory path is correct and exists
2. Check file extensions are `.ts` or `.js`
3. Ensure files aren't in excluded directories (node_modules, dist, test)
4. Verify files export `toolHandler` object
5. Check logs for specific discovery errors

### Deprecation Not Showing

**Problem:** Deprecated tool still appearing in enabled tools

**Solutions:**
1. Deprecated tools are still executable (by design)
2. They're excluded from `getEnabledToolDefinitions()` for Claude API
3. Check deprecation flag: `tool.metadata.version.deprecated`
4. Review deprecation message: `tool.metadata.version.deprecationMessage`

---

## Migration Guide

### From Legacy Tool System

The legacy tool system used switch-based execution. To migrate:

#### Step 1: Enable Feature Flag

```typescript
// src/core/feature-flags.ts
featureFlags.enable(Feature.TOOL_REGISTRY);
```

#### Step 2: Create Tool Handler

Convert legacy tool definition to new handler format:

```typescript
// LEGACY: src/tools/definitions.ts
export const TOOLS = [
  {
    name: 'my-tool',
    description: 'Does something',
    inputSchema: { /* ... */ },
    execute: async (input, userId) => { /* ... */ }
  }
];

// NEW: src/tools/my-tool.ts
import { ToolHandler } from '../core/tool-registry-enhanced';

export const toolHandler: ToolHandler = {
  metadata: {
    name: 'my-tool',
    description: 'Does something',
    category: 'utilities',
    version: { current: '1.0.0' },
    enabled: true,
    inputSchema: z.object({ /* ... */ }),
    security: {
      idempotent: true,
      requiresApproval: false,
      riskLevel: 'low'
    }
  },
  execute: async (input, context) => {
    // Same logic as before
    return await legacyExecute(input, context.userId);
  }
};
```

#### Step 3: Auto-discover Tools

```typescript
// src/index.ts or initialization code
await enhancedToolRegistry.autoDiscover('./src/tools');
```

#### Step 4: Update Execution Code

```typescript
// OLD
const result = await executeTool('my-tool', input, userId, request);

// NEW
const result = await enhancedToolRegistry.execute(
  'my-tool',
  input,
  { userId, userRequest: request }
);
```

#### Step 5: Test Thoroughly

Run all tests to ensure functionality is preserved:

```bash
npm test
npm run integration-test
```

#### Step 6: Disable Legacy System

Once all tools are migrated:

```typescript
// src/core/feature-flags.ts
featureFlags.disable(Feature.LEGACY_EXECUTOR);
```

### Gradual Migration

The compatibility layer (`ToolCompatLayer`) allows gradual migration:

```typescript
import { toolCompat } from '../core/tool-compat';

// Automatically uses new registry if tool exists
// Falls back to legacy executor otherwise
const result = await toolCompat.execute(
  'my-tool',
  input,
  userId,
  userRequest
);
```

Check migration status:

```typescript
const status = toolCompat.getMigrationStatus();
console.log(`Migrated: ${status.migrated}/${status.total}`);
console.log(`Remaining: ${status.remaining}`);
status.tools.forEach(t => {
  console.log(`${t.name}: ${t.migrated ? 'MIGRATED' : 'TODO'}`);
});
```

---

## Roadmap

### Current Version: 1.0.0

- Semantic versioning
- Dependency resolution
- Auto-discovery
- Validation framework
- Security model
- Performance tracking

### Planned Enhancements

#### v1.1.0 (Q2 2026)
- Tool versioning with multiple versions active simultaneously
- Conditional tool dependencies (environment-based)
- Performance profiling dashboard
- Batch tool execution with transaction support

#### v1.2.0 (Q3 2026)
- Tool composition/pipelines (tools that call other tools)
- Dynamic tool loading and hot-reloading
- Tool marketplace (sharing and discovery)
- Advanced metrics and tracing integration

#### v2.0.0 (Q4 2026)
- Distributed tool registry (multi-node synchronization)
- Tool versioning rollback support
- Canary deployment for new tool versions
- Machine learning-based tool recommendation

### Known Limitations

- No support for tool versioning (multiple versions active)
- Limited tool composition capabilities
- No built-in tool marketplace or sharing
- Single-node registry (no distribution)
- Basic metrics (no distributed tracing)

### Contributing

To request features or report issues:

1. Create issue in GitHub with enhancement label
2. Include use case and examples
3. Reference relevant documentation
4. Contribute PRs following code style guide

---

## Summary

The Enhanced Tool Registry provides a production-ready solution for managing tools with:

- Strong typing and validation
- Dependency management with circular detection
- Version compatibility checking
- Security-first design with permissions
- Performance optimization
- Backward compatibility

Start with the Quick Start section, refer to code examples, and consult troubleshooting when issues arise. For complex scenarios, review the Advanced Topics section and API Reference.

For questions, issues, or contributions, reach out to the Platform Team.
