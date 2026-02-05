# MIGRATION UTILITIES & TESTING FRAMEWORK
## Tools to Safely Migrate to Hybrid Architecture

**Date:** 2026-02-04
**Version:** 1.0

---

## TABLE OF CONTENTS

1. [Tool Migration Script](#tool-migration-script)
2. [Compatibility Layer](#compatibility-layer)
3. [Feature Flags](#feature-flags)
4. [Testing Harness](#testing-harness)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Rollback Automation](#rollback-automation)

---

## TOOL MIGRATION SCRIPT

### Auto-Convert Existing Tools to New Pattern

**File:** `/scripts/migrate-tool.ts` (NEW)

```typescript
#!/usr/bin/env ts-node

import fs from 'fs/promises';
import path from 'path';

interface MigrationConfig {
  toolFile: string; // Path to existing tool file
  outputFile: string; // Path for new tool file
  metadata: {
    category: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    idempotent: boolean;
    requiresApproval: boolean;
  };
}

/**
 * Migrate a tool from old pattern to new pattern
 */
async function migrateTool(config: MigrationConfig): Promise<void> {
  console.log(`Migrating tool: ${config.toolFile}`);

  // Read existing tool file
  const content = await fs.readFile(config.toolFile, 'utf-8');

  // Extract function name and implementation
  const functionMatch = content.match(/export\s+async\s+function\s+(\w+)\s*\([^)]*\)/);
  if (!functionMatch) {
    throw new Error('Could not find exported function');
  }

  const functionName = functionMatch[1];
  const toolName = functionName.replace(/^execute/, '').replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

  // Generate new tool file with metadata
  const newContent = `
import { z } from 'zod';
import { ToolHandler } from '../../core/tool-registry';

// TODO: Define your input schema
const ${functionName}InputSchema = z.object({
  // Add your input fields here
  // Example: command: z.string()
});

// TODO: Define your output schema (optional)
const ${functionName}OutputSchema = z.object({
  // Add your output fields here
  // Example: result: z.string()
});

${content}

// Export tool handler for auto-discovery
export const toolHandler: ToolHandler = {
  metadata: {
    name: '${toolName}',
    description: 'TODO: Add description', // TODO: Update this
    category: '${config.metadata.category}',
    inputSchema: ${functionName}InputSchema,
    outputSchema: ${functionName}OutputSchema,
    tags: ['${config.metadata.category}'], // TODO: Add more tags
    enabled: true,
    security: {
      idempotent: ${config.metadata.idempotent},
      requiresApproval: ${config.metadata.requiresApproval},
      riskLevel: '${config.metadata.riskLevel}'
    }
  },
  execute: ${functionName}
};
`.trim();

  // Write new tool file
  await fs.writeFile(config.outputFile, newContent, 'utf-8');

  console.log(`✅ Migrated to: ${config.outputFile}`);
  console.log(`⚠️  Please review and update TODOs in the file`);
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('Usage: ts-node migrate-tool.ts <tool-file>');
    console.log('Example: ts-node migrate-tool.ts src/tools/execute-shell.ts');
    process.exit(1);
  }

  const toolFile = args[0];

  migrateTool({
    toolFile,
    outputFile: toolFile.replace('.ts', '.new.ts'),
    metadata: {
      category: 'system', // Default, user should update
      riskLevel: 'medium',
      idempotent: false,
      requiresApproval: false
    }
  }).catch(console.error);
}

export { migrateTool };
```

### Batch Migration Script

**File:** `/scripts/migrate-all-tools.ts` (NEW)

```typescript
#!/usr/bin/env ts-node

import fs from 'fs/promises';
import path from 'path';
import { migrateTool } from './migrate-tool';

const TOOL_METADATA: Record<string, any> = {
  'execute-shell.ts': {
    category: 'system',
    riskLevel: 'high',
    idempotent: false,
    requiresApproval: true
  },
  'write-file.ts': {
    category: 'files',
    riskLevel: 'medium',
    idempotent: true,
    requiresApproval: false
  },
  'read-file.ts': {
    category: 'files',
    riskLevel: 'low',
    idempotent: true,
    requiresApproval: false
  },
  'web-fetch.ts': {
    category: 'web',
    riskLevel: 'medium',
    idempotent: true,
    requiresApproval: false
  }
  // Add more tools here
};

async function migrateAllTools(toolsDir: string): Promise<void> {
  const files = await fs.readdir(toolsDir);

  for (const file of files) {
    if (!file.endsWith('.ts') || file.endsWith('.new.ts')) {
      continue;
    }

    const metadata = TOOL_METADATA[file];
    if (!metadata) {
      console.log(`⚠️  Skipping ${file}: no metadata defined`);
      continue;
    }

    const toolFile = path.join(toolsDir, file);
    const outputFile = toolFile.replace('.ts', '.new.ts');

    try {
      await migrateTool({ toolFile, outputFile, metadata });
    } catch (error) {
      console.error(`❌ Failed to migrate ${file}:`, error);
    }
  }
}

// Run
migrateAllTools('src/tools/system').catch(console.error);
```

---

## COMPATIBILITY LAYER

### Allows Old and New Patterns to Coexist

**File:** `/src/core/tool-compat.ts` (NEW)

```typescript
import { toolRegistry, ToolContext, ToolHandler } from './tool-registry';
import { executeTool as legacyExecuteTool } from '../tools/executor';
import logger from '../logger';

/**
 * Compatibility layer between old and new tool systems
 */
export class ToolCompatLayer {
  /**
   * Execute a tool using either new registry or legacy executor
   */
  async execute(
    toolName: string,
    input: any,
    userId: string,
    userRequest: string
  ): Promise<any> {
    // Try new registry first
    const registeredTool = toolRegistry.getTool(toolName);

    if (registeredTool) {
      logger.debug('Using new tool registry', { toolName });

      const context: ToolContext = { userId, userRequest };
      return await toolRegistry.execute(toolName, input, context);
    }

    // Fall back to legacy executor
    logger.debug('Falling back to legacy executor', { toolName });
    return await legacyExecuteTool(toolName, input, userId, userRequest);
  }

  /**
   * Check if tool is available in either system
   */
  isToolAvailable(toolName: string): boolean {
    // Check new registry
    if (toolRegistry.getTool(toolName)) {
      return true;
    }

    // Check legacy system (simple check)
    // In reality, you'd check the switch statement in executor.ts
    return true; // Assume available in legacy
  }

  /**
   * Get tool definition for Claude API
   */
  getToolDefinition(toolName: string): any {
    const registeredTool = toolRegistry.getTool(toolName);

    if (registeredTool) {
      return {
        name: registeredTool.metadata.name,
        description: registeredTool.metadata.description,
        input_schema: registeredTool.metadata.inputSchema
      };
    }

    // Fall back to legacy definitions
    const { TOOLS } = require('../tools/definitions');
    return TOOLS.find((t: any) => t.name === toolName);
  }

  /**
   * Get all available tool definitions
   */
  getAllToolDefinitions(): any[] {
    const newTools = toolRegistry.getEnabledToolDefinitions();

    // Get legacy tools that haven't been migrated yet
    const { TOOLS } = require('../tools/definitions');
    const migratedNames = new Set(newTools.map(t => t.name));
    const legacyTools = TOOLS.filter((t: any) => !migratedNames.has(t.name));

    return [...newTools, ...legacyTools];
  }
}

export const toolCompat = new ToolCompatLayer();
```

### Integration with Agent

**File:** `/src/agent.ts` (MODIFIED)

```typescript
import { toolCompat } from './core/tool-compat';

export async function runAgent(/* ... */) {
  // ... existing code ...

  // Get tools for Claude API
  const tools = toolCompat.getAllToolDefinitions();

  const response = await llm.chat(messages, tools);

  // ... execute tools ...
  const result = await toolCompat.execute(
    toolCall.name,
    toolCall.input,
    userId,
    userRequest
  );
}
```

---

## FEATURE FLAGS

### Runtime Toggle for New Features

**File:** `/src/core/feature-flags.ts` (NEW)

```typescript
import { DatabaseManager } from '../persistence/database';
import logger from '../logger';

export enum Feature {
  OUTPUT_PARSER = 'output_parser',
  RETRY_ENGINE = 'retry_engine',
  TOOL_REGISTRY = 'tool_registry',
  WORKFLOW_MANAGER = 'workflow_manager',
  TELEMETRY = 'telemetry'
}

export class FeatureFlags {
  private flags: Map<Feature, boolean> = new Map();
  private db: DatabaseManager;

  constructor() {
    this.db = DatabaseManager.getInstance();
    this.loadFromDatabase();
  }

  /**
   * Load feature flags from database
   */
  private async loadFromDatabase(): Promise<void> {
    try {
      const rows = await this.db.query(
        'SELECT key, value FROM config WHERE key LIKE "feature_%"'
      );

      for (const row of rows) {
        const featureName = row.key.replace('feature_', '');
        const feature = featureName as Feature;
        this.flags.set(feature, row.value === 'true');
      }

      logger.info('Feature flags loaded', {
        flags: Object.fromEntries(this.flags)
      });
    } catch (error) {
      logger.warn('Failed to load feature flags, using defaults', { error });
      this.setDefaults();
    }
  }

  /**
   * Set default feature flags
   */
  private setDefaults(): void {
    this.flags.set(Feature.OUTPUT_PARSER, true); // Stable
    this.flags.set(Feature.RETRY_ENGINE, true); // Stable
    this.flags.set(Feature.TOOL_REGISTRY, false); // Experimental
    this.flags.set(Feature.WORKFLOW_MANAGER, false); // Experimental
    this.flags.set(Feature.TELEMETRY, false); // Experimental
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(feature: Feature): boolean {
    return this.flags.get(feature) || false;
  }

  /**
   * Enable a feature
   */
  async enable(feature: Feature): Promise<void> {
    this.flags.set(feature, true);
    await this.db.query(
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
      [`feature_${feature}`, 'true']
    );
    logger.info('Feature enabled', { feature });
  }

  /**
   * Disable a feature
   */
  async disable(feature: Feature): Promise<void> {
    this.flags.set(feature, false);
    await this.db.query(
      'INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)',
      [`feature_${feature}`, 'false']
    );
    logger.info('Feature disabled', { feature });
  }

  /**
   * Get all feature flags
   */
  getAll(): Record<Feature, boolean> {
    return Object.fromEntries(this.flags);
  }
}

export const featureFlags = new FeatureFlags();
```

### Usage in Code

```typescript
import { featureFlags, Feature } from './core/feature-flags';

// In agent.ts
if (featureFlags.isEnabled(Feature.OUTPUT_PARSER)) {
  const response = OutputParser.parseClaudeResponse(rawResponse);
} else {
  // Use legacy parsing
  const response = parseResponseLegacy(rawResponse);
}

// In tool executor
if (featureFlags.isEnabled(Feature.RETRY_ENGINE)) {
  result = await retryEngine.executeWithRetry(toolName, fn);
} else {
  result = await fn();
}
```

### CLI Tool to Manage Flags

**File:** `/scripts/feature-flags.ts` (NEW)

```typescript
#!/usr/bin/env ts-node

import { featureFlags, Feature } from '../src/core/feature-flags';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'list':
      console.log('Feature Flags:');
      const flags = featureFlags.getAll();
      for (const [feature, enabled] of Object.entries(flags)) {
        console.log(`  ${feature}: ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      }
      break;

    case 'enable':
      const featureToEnable = args[1] as Feature;
      await featureFlags.enable(featureToEnable);
      console.log(`✅ Enabled: ${featureToEnable}`);
      break;

    case 'disable':
      const featureToDisable = args[1] as Feature;
      await featureFlags.disable(featureToDisable);
      console.log(`❌ Disabled: ${featureToDisable}`);
      break;

    default:
      console.log('Usage: ts-node feature-flags.ts <list|enable|disable> [feature]');
      console.log('Features:', Object.values(Feature).join(', '));
  }
}

main().catch(console.error);
```

---

## TESTING HARNESS

### Comprehensive Test Suite

**File:** `/tests/integration/hybrid-migration.test.ts` (NEW)

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { toolRegistry } from '../../src/core/tool-registry';
import { retryEngine } from '../../src/core/retry-engine';
import { workflowManager } from '../../src/core/workflow-manager';
import { toolCompat } from '../../src/core/tool-compat';
import { featureFlags, Feature } from '../../src/core/feature-flags';

describe('Hybrid Migration Integration Tests', () => {
  beforeAll(async () => {
    // Initialize test environment
    await toolRegistry.autoDiscover('src/tools');
  });

  describe('Tool Compatibility Layer', () => {
    it('should execute new tools via registry', async () => {
      const result = await toolCompat.execute(
        'read_file',
        { path: '/tmp/test.txt' },
        'test-user',
        'Read test file'
      );

      expect(result).toBeDefined();
    });

    it('should fall back to legacy executor for unmigrated tools', async () => {
      // Assuming 'some_legacy_tool' is not migrated yet
      const result = await toolCompat.execute(
        'some_legacy_tool',
        { input: 'test' },
        'test-user',
        'Test legacy tool'
      );

      expect(result).toBeDefined();
    });

    it('should return all tool definitions', () => {
      const tools = toolCompat.getAllToolDefinitions();

      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every(t => t.name && t.description)).toBe(true);
    });
  });

  describe('Feature Flags', () => {
    it('should toggle features at runtime', async () => {
      await featureFlags.enable(Feature.RETRY_ENGINE);
      expect(featureFlags.isEnabled(Feature.RETRY_ENGINE)).toBe(true);

      await featureFlags.disable(Feature.RETRY_ENGINE);
      expect(featureFlags.isEnabled(Feature.RETRY_ENGINE)).toBe(false);
    });

    it('should persist flags across restarts', async () => {
      await featureFlags.enable(Feature.TOOL_REGISTRY);

      // Simulate restart by creating new instance
      const newFlags = new FeatureFlags();
      expect(newFlags.isEnabled(Feature.TOOL_REGISTRY)).toBe(true);
    });
  });

  describe('Retry Engine', () => {
    it('should retry on transient failures', async () => {
      let attempts = 0;

      const result = await retryEngine.executeWithRetry(
        'test_tool',
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new Error('ECONNRESET');
          }
          return 'success';
        }
      );

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should not retry non-idempotent operations', async () => {
      retryEngine.registerPolicy('non_idempotent_test', {
        maxAttempts: 3,
        idempotent: false
      });

      let attempts = 0;

      await expect(
        retryEngine.executeWithRetry('non_idempotent_test', async () => {
          attempts++;
          throw new Error('ECONNRESET');
        })
      ).rejects.toThrow();

      expect(attempts).toBe(1); // Should not retry
    });
  });

  describe('Workflow Manager', () => {
    it('should execute simple workflow', async () => {
      const workflow = {
        name: 'test-workflow',
        description: 'Test workflow',
        steps: [
          {
            id: 'step1',
            toolName: 'read_file',
            input: { path: '/tmp/test.txt' }
          },
          {
            id: 'step2',
            toolName: 'write_file',
            input: (ctx: any) => ({
              path: '/tmp/output.txt',
              content: ctx.results.get('step1')
            }),
            dependsOn: ['step1']
          }
        ]
      };

      const result = await workflowManager.execute(workflow, {
        userId: 'test-user',
        userRequest: 'Test workflow'
      });

      expect(result).toBeDefined();
    });

    it('should handle workflow errors gracefully', async () => {
      const workflow = {
        name: 'failing-workflow',
        description: 'Workflow that fails',
        steps: [
          {
            id: 'step1',
            toolName: 'failing_tool',
            input: {},
            onError: 'fail'
          }
        ]
      };

      await expect(
        workflowManager.execute(workflow, {
          userId: 'test-user',
          userRequest: 'Test error handling'
        })
      ).rejects.toThrow();
    });

    it('should execute parallel steps concurrently', async () => {
      const startTime = Date.now();

      const workflow = {
        name: 'parallel-workflow',
        description: 'Workflow with parallel steps',
        steps: [
          {
            id: 'step1',
            toolName: 'slow_tool',
            input: { delay: 1000 },
            parallel: true
          },
          {
            id: 'step2',
            toolName: 'slow_tool',
            input: { delay: 1000 },
            parallel: true
          }
        ]
      };

      await workflowManager.execute(workflow, {
        userId: 'test-user',
        userRequest: 'Test parallel execution'
      });

      const duration = Date.now() - startTime;

      // Should take ~1s (parallel), not ~2s (sequential)
      expect(duration).toBeLessThan(1500);
    });
  });

  describe('Performance Regression Tests', () => {
    it('should maintain performance within 10% of baseline', async () => {
      const iterations = 100;

      // Baseline: Legacy executor
      const legacyStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await toolCompat.execute(
          'read_file',
          { path: '/tmp/test.txt' },
          'test-user',
          'Perf test'
        );
      }
      const legacyDuration = Date.now() - legacyStart;

      // Enable new features
      await featureFlags.enable(Feature.TOOL_REGISTRY);
      await featureFlags.enable(Feature.RETRY_ENGINE);

      // Hybrid: New system
      const hybridStart = Date.now();
      for (let i = 0; i < iterations; i++) {
        await toolCompat.execute(
          'read_file',
          { path: '/tmp/test.txt' },
          'test-user',
          'Perf test'
        );
      }
      const hybridDuration = Date.now() - hybridStart;

      const overhead = (hybridDuration - legacyDuration) / legacyDuration;

      console.log('Performance:', {
        legacy: legacyDuration,
        hybrid: hybridDuration,
        overhead: `${(overhead * 100).toFixed(2)}%`
      });

      expect(overhead).toBeLessThan(0.10); // Less than 10% overhead
    });
  });
});
```

### Security Regression Tests

**File:** `/tests/security/hybrid-security.test.ts` (NEW)

```typescript
import { describe, it, expect } from '@jest/globals';
import { toolCompat } from '../../src/core/tool-compat';
import { retryEngine } from '../../src/core/retry-engine';
import { workflowManager } from '../../src/core/workflow-manager';

describe('Security Regression Tests', () => {
  describe('Command Injection Protection', () => {
    it('should block shell injection in tool inputs', async () => {
      await expect(
        toolCompat.execute(
          'execute_shell',
          { command: 'ls; rm -rf /' },
          'test-user',
          'Malicious request'
        )
      ).rejects.toThrow();
    });

    it('should sanitize path traversal attempts', async () => {
      await expect(
        toolCompat.execute(
          'read_file',
          { path: '../../../etc/passwd' },
          'test-user',
          'Path traversal attempt'
        )
      ).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce retry limits', async () => {
      let attempts = 0;

      await expect(
        retryEngine.executeWithRetry('test_tool', async () => {
          attempts++;
          throw new Error('ECONNRESET');
        })
      ).rejects.toThrow();

      expect(attempts).toBeLessThanOrEqual(3); // Max retries
    });

    it('should enforce workflow timeout', async () => {
      const workflow = {
        name: 'infinite-workflow',
        description: 'Workflow that times out',
        maxDuration: 1000, // 1 second
        steps: [
          {
            id: 'step1',
            toolName: 'slow_tool',
            input: { delay: 5000 } // 5 seconds
          }
        ]
      };

      await expect(
        workflowManager.execute(workflow, {
          userId: 'test-user',
          userRequest: 'Timeout test'
        })
      ).rejects.toThrow(/timeout/i);
    });
  });

  describe('PII Protection', () => {
    it('should scrub PII from telemetry', () => {
      const { telemetry } = require('../../src/core/telemetry');

      const data = {
        email: 'test@example.com',
        phone: '555-123-4567',
        message: 'Contact me at test@example.com'
      };

      const scrubbed = telemetry['scrubPII'](data);

      expect(scrubbed.email).toBe('[REDACTED]');
      expect(scrubbed.phone).toBe('[REDACTED]');
      expect(scrubbed.message).not.toContain('test@example.com');
    });
  });
});
```

---

## MONITORING & ALERTS

### Health Check Endpoint

**File:** `/src/routes/health.ts` (NEW)

```typescript
import express from 'express';
import { toolRegistry } from '../core/tool-registry';
import { featureFlags } from '../core/feature-flags';
import { DatabaseManager } from '../persistence/database';

const router = express.Router();

router.get('/health', async (req, res) => {
  const checks = {
    database: false,
    toolRegistry: false,
    featureFlags: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check database
    const db = DatabaseManager.getInstance();
    await db.query('SELECT 1');
    checks.database = true;

    // Check tool registry
    const tools = toolRegistry.getAllTools();
    checks.toolRegistry = tools.length > 0;

    // Check feature flags
    const flags = featureFlags.getAll();
    checks.featureFlags = Object.keys(flags).length > 0;

    const healthy = Object.values(checks).every(c => c === true);

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'healthy' : 'degraded',
      checks
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      checks,
      error: (error as Error).message
    });
  }
});

router.get('/health/tools', (req, res) => {
  const tools = toolRegistry.getAllTools();

  res.json({
    total: tools.length,
    enabled: tools.filter(t => t.metadata.enabled).length,
    byCategory: tools.reduce((acc, t) => {
      acc[t.metadata.category] = (acc[t.metadata.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byRiskLevel: tools.reduce((acc, t) => {
      acc[t.metadata.security.riskLevel] = (acc[t.metadata.security.riskLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  });
});

router.get('/health/features', (req, res) => {
  res.json(featureFlags.getAll());
});

export default router;
```

### Prometheus Metrics

**File:** `/src/core/metrics.ts` (NEW)

```typescript
import promClient from 'prom-client';

// Create registry
const register = new promClient.Registry();

// Default metrics (memory, CPU, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics
export const toolExecutionDuration = new promClient.Histogram({
  name: 'tool_execution_duration_seconds',
  help: 'Duration of tool executions',
  labelNames: ['tool_name', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10]
});

export const toolExecutionCount = new promClient.Counter({
  name: 'tool_execution_total',
  help: 'Total number of tool executions',
  labelNames: ['tool_name', 'status']
});

export const retryCount = new promClient.Counter({
  name: 'retry_attempts_total',
  help: 'Total number of retry attempts',
  labelNames: ['tool_name', 'attempt']
});

export const workflowDuration = new promClient.Histogram({
  name: 'workflow_duration_seconds',
  help: 'Duration of workflow executions',
  labelNames: ['workflow_name', 'status'],
  buckets: [1, 5, 10, 30, 60, 300]
});

register.registerMetric(toolExecutionDuration);
register.registerMetric(toolExecutionCount);
register.registerMetric(retryCount);
register.registerMetric(workflowDuration);

export { register };
```

### Metrics Endpoint

```typescript
import express from 'express';
import { register } from '../core/metrics';

const router = express.Router();

router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;
```

---

## ROLLBACK AUTOMATION

### Automated Rollback Script

**File:** `/scripts/rollback.sh` (NEW)

```bash
#!/bin/bash

set -e

PHASE=$1

if [ -z "$PHASE" ]; then
  echo "Usage: ./rollback.sh <phase>"
  echo "Phases: 1, 2, 3"
  exit 1
fi

echo "🔄 Rolling back Phase $PHASE..."

case $PHASE in
  1)
    echo "Disabling Phase 1 features..."
    ts-node scripts/feature-flags.ts disable output_parser
    ts-node scripts/feature-flags.ts disable retry_engine

    echo "Reverting code changes..."
    git revert --no-commit HEAD~2..HEAD  # Revert last 2 commits
    git commit -m "Rollback Phase 1"

    echo "Restarting service..."
    kubectl rollout restart deployment/opencell -n production
    ;;

  2)
    echo "Disabling Phase 2 features..."
    ts-node scripts/feature-flags.ts disable tool_registry
    ts-node scripts/feature-flags.ts disable workflow_manager

    echo "Reverting code changes..."
    git revert --no-commit HEAD~5..HEAD
    git commit -m "Rollback Phase 2"

    echo "Restarting service..."
    kubectl rollout restart deployment/opencell -n production
    ;;

  3)
    echo "Disabling Phase 3 features..."
    ts-node scripts/feature-flags.ts disable telemetry

    echo "No code rollback needed, feature flag disabled"

    echo "Restarting service..."
    kubectl rollout restart deployment/opencell -n production
    ;;

  *)
    echo "Invalid phase: $PHASE"
    exit 1
    ;;
esac

echo "✅ Rollback complete!"
echo "📊 Checking service health..."
sleep 10

kubectl get pods -n production | grep opencell
curl -s http://localhost:3000/health | jq .
```

### Canary Deployment Script

**File:** `/scripts/canary-deploy.sh` (NEW)

```bash
#!/bin/bash

set -e

VERSION=$1
CANARY_PERCENT=${2:-10}  # Default 10%

if [ -z "$VERSION" ]; then
  echo "Usage: ./canary-deploy.sh <version> [canary-percent]"
  exit 1
fi

echo "🚀 Deploying canary: $VERSION ($CANARY_PERCENT%)"

# Create canary deployment
kubectl apply -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: opencell-canary
  namespace: production
spec:
  replicas: 1
  selector:
    matchLabels:
      app: opencell
      version: canary
  template:
    metadata:
      labels:
        app: opencell
        version: canary
    spec:
      containers:
      - name: opencell
        image: gcr.io/project/opencell:$VERSION
        env:
        - name: CANARY
          value: "true"
        - name: FEATURE_OUTPUT_PARSER
          value: "true"
        - name: FEATURE_RETRY_ENGINE
          value: "true"
EOF

# Update traffic split
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: opencell
  namespace: production
spec:
  hosts:
  - opencell.svc.cluster.local
  http:
  - match:
    - headers:
        x-canary:
          exact: "true"
    route:
    - destination:
        host: opencell.svc.cluster.local
        subset: canary
  - route:
    - destination:
        host: opencell.svc.cluster.local
        subset: stable
      weight: $((100 - CANARY_PERCENT))
    - destination:
        host: opencell.svc.cluster.local
        subset: canary
      weight: $CANARY_PERCENT
EOF

echo "✅ Canary deployed!"
echo "📊 Monitor metrics at: http://localhost:9090"
echo "🔍 Check logs: kubectl logs -f deployment/opencell-canary -n production"
```

---

## SUMMARY

This migration utilities package provides:

1. **Tool Migration Scripts** - Automate conversion of 40+ tools
2. **Compatibility Layer** - Old and new systems coexist
3. **Feature Flags** - Runtime toggles with persistence
4. **Testing Harness** - Comprehensive test suite
5. **Monitoring** - Health checks, metrics, alerts
6. **Rollback Automation** - One-command rollback per phase

### Quick Start

```bash
# 1. Migrate a tool
ts-node scripts/migrate-tool.ts src/tools/execute-shell.ts

# 2. Enable feature flag
ts-node scripts/feature-flags.ts enable output_parser

# 3. Run tests
npm test tests/integration/hybrid-migration.test.ts

# 4. Deploy canary
./scripts/canary-deploy.sh v2.0.0 10

# 5. Monitor health
curl http://localhost:3000/health

# 6. Rollback if needed
./scripts/rollback.sh 1
```

### Success Criteria

- ✅ Zero downtime during migration
- ✅ Instant rollback capability
- ✅ Full test coverage
- ✅ Comprehensive monitoring
- ✅ Automated safety checks

Ready to start Phase 1 implementation!
