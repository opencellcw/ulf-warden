# Parallel Workflow Execution System

Comprehensive guide to implementing parallel execution in OpenCellCW workflows with worker pools, resource management, and multiple wait strategies.

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Quick Start](#quick-start)
5. [Worker Pools](#worker-pools)
6. [Parallel Groups](#parallel-groups)
7. [Wait Strategies](#wait-strategies)
8. [Usage Examples](#usage-examples)
9. [Advanced Topics](#advanced-topics)
10. [API Reference](#api-reference)
11. [Best Practices](#best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Parallel execution allows workflows to run multiple steps concurrently, dramatically improving performance for I/O-bound operations and independent tasks.

### What is Parallel Execution?

Parallel execution enables:
- **Concurrent step execution** - Run multiple workflow steps simultaneously
- **Resource management** - Control CPU and memory usage with worker pools
- **Flexible wait strategies** - Wait for all, any, or first completion
- **Performance optimization** - Reduce workflow duration by 50-90% for parallelizable tasks

### Why Use Parallel Execution?

- **Faster workflows**: Execute independent steps concurrently instead of sequentially
- **Better resource utilization**: Maximize CPU and I/O throughput
- **Flexible control**: Fine-grained control over concurrency and timeouts
- **Reliability**: Built-in error handling and retry strategies
- **Scalability**: Handle high-throughput scenarios without resource exhaustion

### Common Use Cases

- Fetching data from multiple APIs simultaneously
- Processing multiple files or database records in parallel
- Running multiple analysis steps concurrently
- Sending notifications to multiple channels
- Fan-out/fan-in patterns for data aggregation
- Batch processing with controlled concurrency

---

## Features

### Worker Pool

Manages concurrent execution with resource limits:

**Capabilities:**
- Configurable concurrency limits (maxConcurrent)
- Queue management for pending tasks
- Per-task and global timeouts
- Statistics tracking (completed, failed, timeout)
- Utilization rate monitoring
- Automatic resource cleanup

**When to use:**
- Control system resource usage
- Prevent overwhelming external APIs
- Manage database connection pools
- Rate-limit operations

### Parallel Groups

Group multiple steps for parallel execution:

**Capabilities:**
- Execute specific workflow steps in parallel
- Configure wait strategies per group
- Set concurrency limits per group
- Group-level timeout configuration
- Error handling options (continueOnError)
- Result aggregation

**When to use:**
- Fetch data from multiple sources
- Process independent operations
- Fan-out patterns
- Batch operations

### Wait Strategies

Four strategies for different use cases:

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| **all** | Wait for all to complete, fail if any fails | Critical operations where all must succeed |
| **any** | Wait for first success, fail if all fail | Redundant data sources, fallback patterns |
| **allSettled** | Wait for all, don't throw on errors | Best-effort operations, optional enrichments |
| **race** | Return first completed (success or error) | Fastest response wins, timeout racing |

### Resource Management

Prevent resource exhaustion:
- **maxConcurrent**: Limit active workers
- **queueSize**: Control pending task backlog
- **timeout**: Prevent hanging operations
- **Batch execution**: Process large sets in controlled chunks

---

## Architecture

### System Components

```
┌─────────────────────────────────────────┐
│         WorkflowManager                 │
│  ┌─────────────────────────────────┐   │
│  │  ParallelExecutionManager       │   │
│  │  ┌─────────────────────────┐    │   │
│  │  │     WorkerPool          │    │   │
│  │  │  - maxConcurrent: 10    │    │   │
│  │  │  - queue: Task[]        │    │   │
│  │  │  - activeWorkers: 5     │    │   │
│  │  └─────────────────────────┘    │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘

Workflow:
  steps:
    - parallelGroup:
        steps: [A, B, C, D]
        waitStrategy: all
        maxConcurrent: 2

Execution Timeline:
t0: Start A, B (2 concurrent)
t1: A completes, start C
t2: B completes, start D
t3: C completes
t4: D completes → Group done
```

### Execution Flow

```
1. WorkflowManager.execute(workflow, context)
   │
   ├─ Initialize ParallelExecutionManager (if parallelConfig)
   │
   └─ For each step:
      │
      ├─ If step.parallelGroup:
      │  │
      │  ├─ ParallelExecutionManager.executeGroup()
      │  │  │
      │  │  ├─ Create WorkerTask for each step
      │  │  │
      │  │  ├─ If maxConcurrent < total:
      │  │  │  └─ Execute in batches
      │  │  │
      │  │  ├─ Else:
      │  │  │  └─ Execute all at once
      │  │  │
      │  │  ├─ Apply waitStrategy:
      │  │  │  ├─ all: Promise.all()
      │  │  │  ├─ any: Promise.any()
      │  │  │  ├─ allSettled: Promise.allSettled()
      │  │  │  └─ race: Promise.race()
      │  │  │
      │  │  └─ Collect results and errors
      │  │
      │  └─ Return ParallelExecutionResult
      │
      └─ Else: Execute step normally
```

### Integration with Workflow Manager

Parallel execution integrates seamlessly:

```typescript
// workflow-manager.ts
import { ParallelExecutionManager } from './workflow-parallel';

export class WorkflowManager {
  private parallelManager: ParallelExecutionManager | null = null;

  async execute(workflow: WorkflowDefinition, context) {
    // Initialize parallel manager if configured
    if (workflow.parallelConfig) {
      this.parallelManager = new ParallelExecutionManager(
        workflow.parallelConfig
      );
    }

    // Execute steps...
    for (const step of workflow.steps) {
      if (step.parallelGroup && this.parallelManager) {
        // Execute parallel group
        const result = await this.parallelManager.executeGroup(
          step.parallelGroup,
          (stepId) => this.executeStep(stepId, workflow, context),
          context
        );
        // Handle results...
      } else {
        // Regular step execution
        await this.executeStep(step.id, workflow, context);
      }
    }
  }
}
```

---

## Quick Start

### 1. Basic Parallel Group

Execute multiple steps in parallel:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Parallel Data Fetch',
  description: 'Fetch data from multiple sources concurrently',

  steps: [
    {
      id: 'parallel_fetch',
      parallelGroup: {
        id: 'fetch_all',
        steps: ['fetch_users', 'fetch_products', 'fetch_orders'],
        waitStrategy: 'all', // Wait for all to complete
      },
    },
    {
      id: 'fetch_users',
      toolName: 'database_query',
      input: { query: 'SELECT * FROM users' },
    },
    {
      id: 'fetch_products',
      toolName: 'database_query',
      input: { query: 'SELECT * FROM products' },
    },
    {
      id: 'fetch_orders',
      toolName: 'database_query',
      input: { query: 'SELECT * FROM orders' },
    },
  ],
};
```

**Result**: All three queries run concurrently instead of sequentially.

### 2. With Concurrency Limit

Limit concurrent execution:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Rate-Limited Processing',
  description: 'Process items with API rate limits',

  // Global worker pool configuration
  parallelConfig: {
    maxConcurrent: 5,  // Max 5 concurrent operations
    timeout: 30000,    // 30 second timeout per task
  },

  steps: [
    {
      id: 'process_batch',
      parallelGroup: {
        id: 'batch_processing',
        steps: ['item1', 'item2', 'item3', 'item4', 'item5',
                'item6', 'item7', 'item8', 'item9', 'item10'],
        maxConcurrent: 3,  // Process 3 at a time
        waitStrategy: 'all',
      },
    },
    // ... item steps ...
  ],
};
```

**Result**: 10 items processed 3 at a time, preventing API rate limit issues.

### 3. With Error Handling

Handle failures gracefully:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Best-Effort Enrichment',
  description: 'Enrich data from multiple optional sources',

  steps: [
    {
      id: 'fetch_core_data',
      toolName: 'database_query',
      input: { query: 'SELECT * FROM users WHERE id = ?' },
    },
    {
      id: 'enrich_data',
      dependsOn: ['fetch_core_data'],
      parallelGroup: {
        id: 'optional_enrichments',
        steps: ['fetch_social', 'fetch_credit', 'fetch_demographics'],
        waitStrategy: 'allSettled',  // Don't fail on errors
        continueOnError: true,       // Continue workflow even if all fail
        timeout: 5000,               // 5 second timeout per enrichment
      },
    },
    // ... enrichment steps ...
  ],
};
```

**Result**: Core data is always returned, enrichments added if available.

---

## Worker Pools

### Configuration

Configure the global worker pool:

```typescript
interface WorkerPoolConfig {
  maxConcurrent?: number;  // Max concurrent workers (default: 10)
  queueSize?: number;      // Max queue size (default: unlimited)
  timeout?: number;        // Default timeout per task in ms
}

const workflow: WorkflowDefinition = {
  name: 'My Workflow',
  parallelConfig: {
    maxConcurrent: 8,
    queueSize: 100,
    timeout: 20000,
  },
  steps: [/*...*/],
};
```

### How Worker Pools Work

```
┌─────────────────────────────────────┐
│         Worker Pool                 │
│  maxConcurrent: 3                   │
├─────────────────────────────────────┤
│  Active Workers:                    │
│  [Worker 1] ──> Task A (running)    │
│  [Worker 2] ──> Task B (running)    │
│  [Worker 3] ──> Task C (running)    │
├─────────────────────────────────────┤
│  Queue:                             │
│  Task D (waiting)                   │
│  Task E (waiting)                   │
│  Task F (waiting)                   │
└─────────────────────────────────────┘

When Worker 1 completes Task A:
→ Task D moves from queue to Worker 1
→ Queue: [E, F]
```

### Worker Pool Statistics

Track performance:

```typescript
const manager = new ParallelExecutionManager(config);

// Execute workflow...
await manager.executeGroup(group, executor, context);

// Get statistics
const stats = manager.getStats();
console.log(stats);
// {
//   tasksCompleted: 120,
//   tasksFailed: 5,
//   tasksTimedOut: 2,
//   totalWaitTime: 1500,
//   activeWorkers: 3,
//   queueLength: 7,
//   averageWaitTime: 12.5
// }

// Get current status
const status = manager.getStatus();
console.log(status);
// {
//   activeWorkers: 3,
//   maxConcurrent: 10,
//   queueLength: 7,
//   utilizationRate: 30  // 30% utilization
// }
```

### Resource Management

Prevent resource exhaustion:

```typescript
// Problem: 1000 API calls at once overwhelms system
const badWorkflow = {
  steps: [{
    parallelGroup: {
      steps: array1000Items,  // All 1000 at once!
      waitStrategy: 'all'
    }
  }]
};

// Solution: Limit concurrency
const goodWorkflow = {
  parallelConfig: {
    maxConcurrent: 10  // Only 10 at a time
  },
  steps: [{
    parallelGroup: {
      steps: array1000Items,  // Processed 10 at a time
      maxConcurrent: 10,
      waitStrategy: 'all'
    }
  }]
};
```

---

## Parallel Groups

### Parallel Group Interface

```typescript
interface ParallelGroup {
  id: string;                    // Unique group identifier
  steps: string[];               // Step IDs to execute in parallel
  waitStrategy?: WaitStrategy;   // Wait strategy (default: 'all')
  maxConcurrent?: number;        // Concurrency limit (default: unlimited)
  continueOnError?: boolean;     // Continue if steps fail (default: false)
  timeout?: number;              // Group timeout in ms
}
```

### Basic Parallel Group

```typescript
{
  id: 'my_parallel_step',
  parallelGroup: {
    id: 'fetch_data',
    steps: ['step_a', 'step_b', 'step_c'],
  }
}
```

### With Wait Strategy

```typescript
{
  id: 'parallel_with_strategy',
  parallelGroup: {
    id: 'optional_operations',
    steps: ['op1', 'op2', 'op3'],
    waitStrategy: 'allSettled',  // Don't fail on errors
  }
}
```

### With Concurrency Limit

```typescript
{
  id: 'rate_limited_parallel',
  parallelGroup: {
    id: 'api_calls',
    steps: ['api1', 'api2', 'api3', 'api4', 'api5'],
    maxConcurrent: 2,  // Only 2 concurrent API calls
    timeout: 10000,     // 10 second timeout
  }
}
```

### With Error Handling

```typescript
{
  id: 'resilient_parallel',
  parallelGroup: {
    id: 'best_effort',
    steps: ['critical', 'optional1', 'optional2'],
    waitStrategy: 'allSettled',
    continueOnError: true,  // Continue workflow even if all fail
  }
}
```

### Execution Result

```typescript
interface ParallelExecutionResult {
  groupId: string;              // Group identifier
  completedSteps: string[];     // Successfully completed steps
  failedSteps: string[];        // Failed steps
  skippedSteps: string[];       // Skipped steps
  duration: number;             // Total duration in ms
  success: boolean;             // Overall success
  results: Map<string, any>;    // Step results
  errors: Map<string, Error>;   // Step errors
}

// Access results
const result = await parallelManager.executeGroup(...);
console.log(`Completed ${result.completedSteps.length} of ${group.steps.length} steps`);
console.log(`Duration: ${result.duration}ms`);
```

---

## Wait Strategies

### Overview

| Strategy | Promise Method | Behavior | Fail Condition |
|----------|---------------|----------|----------------|
| all | Promise.all() | Wait for all, fail fast | Any step fails |
| any | Promise.any() | Return first success | All steps fail |
| allSettled | Promise.allSettled() | Wait for all, no throw | Never fails |
| race | Promise.race() | Return first completed | First is error |

### 'all' Strategy

**Use case**: Critical operations where all must succeed

```typescript
{
  parallelGroup: {
    id: 'critical_ops',
    steps: ['validate_input', 'check_permissions', 'verify_quota'],
    waitStrategy: 'all',  // All must succeed
  }
}
```

**Behavior**:
- ✅ All 3 complete successfully → Success
- ❌ Any 1 fails → Entire group fails immediately

**Timeline**:
```
t0: Start validate, check, verify
t1: validate completes ✓
t2: check FAILS ✗
    → Stop immediately, group fails
t3: verify still running (will be terminated)
```

### 'any' Strategy

**Use case**: Redundant data sources, fallback patterns

```typescript
{
  parallelGroup: {
    id: 'redundant_fetch',
    steps: ['primary_api', 'secondary_api', 'cache'],
    waitStrategy: 'any',  // First success wins
  }
}
```

**Behavior**:
- ✅ Any 1 succeeds → Success (return that result)
- ❌ All fail → Group fails

**Timeline**:
```
t0: Start primary, secondary, cache
t1: primary fails ✗
t2: cache succeeds ✓
    → Return immediately with cache result
t3: secondary still running (will complete but result ignored)
```

### 'allSettled' Strategy

**Use case**: Best-effort operations, optional enrichments

```typescript
{
  parallelGroup: {
    id: 'optional_enrichments',
    steps: ['social_data', 'credit_score', 'demographics'],
    waitStrategy: 'allSettled',  // Wait for all, no throw
    continueOnError: true,
  }
}
```

**Behavior**:
- Always waits for all to complete
- Never throws errors
- Returns mix of successes and failures

**Timeline**:
```
t0: Start all 3
t1: social succeeds ✓
t2: credit fails ✗
t3: demographics succeeds ✓
    → Group succeeds with 2/3 results
```

### 'race' Strategy

**Use case**: Fastest response wins, timeout racing

```typescript
{
  parallelGroup: {
    id: 'race_for_speed',
    steps: ['fast_unreliable', 'slow_reliable', 'timeout_guard'],
    waitStrategy: 'race',  // First completed (success or error)
  }
}
```

**Behavior**:
- Returns first completed (success or failure)
- Useful for racing against timeouts

**Timeline**:
```
t0: Start all 3
t1: fast_unreliable completes ✓
    → Return immediately
t2: slow_reliable still running
t3: timeout_guard still running
```

### Strategy Comparison Example

Same workflow with different strategies:

```typescript
const steps = ['fetch_a', 'fetch_b', 'fetch_c'];

// Scenario: A succeeds in 1s, B fails at 2s, C succeeds in 3s

// Strategy: 'all'
// Result: Fails at 2s when B fails
// Returns: Error

// Strategy: 'any'
// Result: Succeeds at 1s when A succeeds
// Returns: A's result

// Strategy: 'allSettled'
// Result: Succeeds at 3s after all complete
// Returns: {A: success, B: error, C: success}

// Strategy: 'race'
// Result: Completes at 1s when A finishes
// Returns: A's result
```

---

## Usage Examples

### Example 1: Data Aggregation

Fetch data from multiple sources and aggregate:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Multi-Source Data Aggregation',
  description: 'Fetch and combine data from APIs, DB, and cache',

  steps: [
    // Parallel fetch from all sources
    {
      id: 'fetch_all_sources',
      parallelGroup: {
        id: 'data_sources',
        steps: ['fetch_api', 'fetch_db', 'fetch_cache'],
        waitStrategy: 'all',
        timeout: 10000,
      },
    },

    // API fetch
    {
      id: 'fetch_api',
      toolName: 'http_request',
      input: {
        url: 'https://api.example.com/data',
        method: 'GET',
      },
    },

    // Database fetch
    {
      id: 'fetch_db',
      toolName: 'database_query',
      input: {
        query: 'SELECT * FROM data WHERE active = true',
      },
    },

    // Cache fetch
    {
      id: 'fetch_cache',
      toolName: 'cache_get',
      input: {
        key: 'aggregated_data',
      },
    },

    // Aggregate results
    {
      id: 'aggregate',
      dependsOn: ['fetch_all_sources'],
      toolName: 'aggregate_data',
      input: (ctx) => ({
        apiData: ctx.results.get('fetch_api'),
        dbData: ctx.results.get('fetch_db'),
        cacheData: ctx.results.get('fetch_cache'),
      }),
    },
  ],
};
```

### Example 2: Fan-Out Processing

Process multiple items in parallel:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Batch User Notification',
  description: 'Send notifications to multiple users',

  parallelConfig: {
    maxConcurrent: 5,  // Max 5 concurrent notifications
  },

  steps: [
    // Fetch users to notify
    {
      id: 'fetch_users',
      toolName: 'database_query',
      input: {
        query: 'SELECT id FROM users WHERE notify = true',
      },
    },

    // Create notification steps dynamically
    {
      id: 'notify_all_users',
      dependsOn: ['fetch_users'],
      parallelGroup: {
        id: 'notifications',
        // Generated step IDs based on user list
        steps: (ctx) => {
          const users = ctx.results.get('fetch_users');
          return users.map((u: any) => `notify_${u.id}`);
        },
        maxConcurrent: 5,
        waitStrategy: 'allSettled',  // Best effort
        continueOnError: true,
      },
    },

    // Notification steps (created dynamically)
    // ... notify_user1, notify_user2, etc ...
  ],
};
```

### Example 3: Redundant API Calls

Use multiple APIs with fallback:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Weather Data with Fallback',
  description: 'Fetch weather from multiple providers',

  steps: [
    // Try multiple weather APIs
    {
      id: 'fetch_weather',
      parallelGroup: {
        id: 'weather_providers',
        steps: ['weather_api1', 'weather_api2', 'weather_api3'],
        waitStrategy: 'any',  // First success wins
        timeout: 5000,
      },
    },

    {
      id: 'weather_api1',
      toolName: 'http_request',
      input: {
        url: 'https://api.weather1.com/current',
      },
    },

    {
      id: 'weather_api2',
      toolName: 'http_request',
      input: {
        url: 'https://api.weather2.com/data',
      },
    },

    {
      id: 'weather_api3',
      toolName: 'http_request',
      input: {
        url: 'https://api.weather3.com/weather',
      },
    },

    // Use whichever API responded first
    {
      id: 'format_weather',
      dependsOn: ['fetch_weather'],
      toolName: 'format_data',
      input: (ctx) => ({
        data: ctx.results.get('fetch_weather'),
      }),
    },
  ],
};
```

### Example 4: Nested Parallel Groups

Parallel execution at multiple levels:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Complex Data Pipeline',
  description: 'Multi-level parallel processing',

  steps: [
    // Level 1: Fetch sources in parallel
    {
      id: 'fetch_sources',
      parallelGroup: {
        id: 'sources',
        steps: ['fetch_source_a', 'fetch_source_b'],
        waitStrategy: 'all',
      },
    },

    {
      id: 'fetch_source_a',
      toolName: 'http_request',
      input: { url: 'https://api.a.com/data' },
    },

    {
      id: 'fetch_source_b',
      toolName: 'http_request',
      input: { url: 'https://api.b.com/data' },
    },

    // Level 2: Process each source in parallel
    {
      id: 'process_a',
      dependsOn: ['fetch_source_a'],
      parallelGroup: {
        id: 'processing_a',
        steps: ['validate_a', 'enrich_a', 'transform_a'],
        waitStrategy: 'all',
      },
    },

    {
      id: 'process_b',
      dependsOn: ['fetch_source_b'],
      parallelGroup: {
        id: 'processing_b',
        steps: ['validate_b', 'enrich_b', 'transform_b'],
        waitStrategy: 'all',
      },
    },

    // ... processing steps ...

    // Level 3: Combine results
    {
      id: 'combine',
      dependsOn: ['process_a', 'process_b'],
      toolName: 'merge_data',
      input: (ctx) => ({
        a: ctx.results.get('transform_a'),
        b: ctx.results.get('transform_b'),
      }),
    },
  ],
};
```

### Example 5: Rate-Limited Batch Processing

Process large batch with API rate limits:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Rate-Limited API Batch',
  description: 'Process 1000 items respecting API limits',

  parallelConfig: {
    maxConcurrent: 10,  // Max 10 concurrent requests
  },

  steps: [
    // Fetch batch of items
    {
      id: 'fetch_batch',
      toolName: 'database_query',
      input: {
        query: 'SELECT id FROM items LIMIT 1000',
      },
    },

    // Process in controlled batches
    {
      id: 'process_batch',
      dependsOn: ['fetch_batch'],
      parallelGroup: {
        id: 'batch_processing',
        steps: (ctx) => {
          const items = ctx.results.get('fetch_batch');
          return items.map((item: any) => `process_${item.id}`);
        },
        maxConcurrent: 10,    // Only 10 at a time
        waitStrategy: 'allSettled',
        continueOnError: true, // Don't stop on single failures
        timeout: 30000,        // 30s per item
      },
    },

    // Summary report
    {
      id: 'generate_report',
      dependsOn: ['process_batch'],
      toolName: 'create_report',
      input: (ctx) => {
        const result = ctx.results.get('process_batch');
        return {
          total: 1000,
          completed: result.completedSteps.length,
          failed: result.failedSteps.length,
          duration: result.duration,
        };
      },
    },
  ],
};
```

---

## Advanced Topics

### Dynamic Parallel Groups

Generate parallel steps at runtime:

```typescript
{
  id: 'dynamic_parallel',
  parallelGroup: {
    id: 'dynamic_processing',
    // Generate steps based on previous results
    steps: (ctx) => {
      const items = ctx.results.get('fetch_items');
      return items.map((item: any) => `process_${item.id}`);
    },
    maxConcurrent: 5,
    waitStrategy: 'allSettled',
  }
}
```

### Timeout Strategies

Multiple timeout levels:

```typescript
const workflow: WorkflowDefinition = {
  name: 'Multi-Level Timeouts',

  // Global timeout
  maxDuration: 300000,  // 5 minutes for entire workflow

  // Worker pool timeout
  parallelConfig: {
    timeout: 30000,  // 30 seconds default per task
  },

  steps: [{
    id: 'parallel_with_timeout',
    parallelGroup: {
      id: 'ops',
      steps: ['fast_op', 'slow_op'],
      timeout: 10000,  // 10 seconds for this group
    },
  }],
};
```

### Error Aggregation

Collect all errors from parallel execution:

```typescript
const result = await parallelManager.executeGroup(
  group,
  executor,
  context
);

// Check for partial failures
if (result.failedSteps.length > 0) {
  console.log('Some steps failed:');
  result.failedSteps.forEach(stepId => {
    const error = result.errors.get(stepId);
    console.log(`  ${stepId}: ${error.message}`);
  });

  // Decide whether to continue or fail workflow
  if (result.failedSteps.length > result.completedSteps.length) {
    throw new Error('Majority of parallel steps failed');
  }
}
```

### Batch Processing Patterns

Process large datasets efficiently:

```typescript
// Pattern 1: Fixed batch size
async function processBatches(items: any[], batchSize: number) {
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    await parallelManager.executeGroup({
      id: `batch_${i}`,
      steps: batch.map(item => `item_${item.id}`),
      maxConcurrent: batchSize,
      waitStrategy: 'allSettled',
    }, executor, context);
  }
}

// Pattern 2: Adaptive batch size based on performance
async function processAdaptive(items: any[]) {
  let batchSize = 10;

  for (let i = 0; i < items.length; i += batchSize) {
    const start = Date.now();
    const batch = items.slice(i, i + batchSize);

    const result = await parallelManager.executeGroup({
      id: `batch_${i}`,
      steps: batch.map(item => `item_${item.id}`),
      maxConcurrent: batchSize,
      waitStrategy: 'allSettled',
    }, executor, context);

    const duration = Date.now() - start;

    // Adjust batch size based on performance
    if (duration < 5000) {
      batchSize = Math.min(batchSize + 5, 50);
    } else if (duration > 15000) {
      batchSize = Math.max(batchSize - 5, 5);
    }
  }
}
```

### Circuit Breaker Pattern

Prevent cascading failures:

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  async execute(fn: () => Promise<any>) {
    if (this.state === 'open') {
      // Check if we should try again
      if (Date.now() - this.lastFailTime > 60000) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      // Reset on success
      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failures = 0;
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();

      // Open circuit after 5 failures
      if (this.failures >= 5) {
        this.state = 'open';
      }

      throw error;
    }
  }
}
```

### Performance Monitoring

Track and optimize parallel execution:

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, {
    executions: number;
    totalDuration: number;
    failures: number;
  }>();

  track(groupId: string, result: ParallelExecutionResult) {
    const existing = this.metrics.get(groupId) || {
      executions: 0,
      totalDuration: 0,
      failures: 0,
    };

    this.metrics.set(groupId, {
      executions: existing.executions + 1,
      totalDuration: existing.totalDuration + result.duration,
      failures: existing.failures + (result.success ? 0 : 1),
    });
  }

  getReport() {
    const report: any = {};

    this.metrics.forEach((metrics, groupId) => {
      report[groupId] = {
        averageDuration: metrics.totalDuration / metrics.executions,
        failureRate: (metrics.failures / metrics.executions) * 100,
        executions: metrics.executions,
      };
    });

    return report;
  }
}
```

---

## API Reference

### WorkerPool

```typescript
class WorkerPool {
  constructor(config: WorkerPoolConfig);

  /**
   * Execute a single task
   */
  execute<T>(task: WorkerTask<T>): Promise<T>;

  /**
   * Execute multiple tasks in parallel
   */
  executeMany<T>(tasks: WorkerTask<T>[]): Promise<T[]>;

  /**
   * Execute with specific wait strategy
   */
  executeWithStrategy<T>(
    tasks: WorkerTask<T>[],
    strategy: WaitStrategy
  ): Promise<{ results: (T | Error)[]; success: boolean }>;

  /**
   * Get statistics
   */
  getStats(): {
    tasksCompleted: number;
    tasksFailed: number;
    tasksTimedOut: number;
    totalWaitTime: number;
    activeWorkers: number;
    queueLength: number;
    averageWaitTime: number;
  };

  /**
   * Get current status
   */
  getStatus(): {
    activeWorkers: number;
    maxConcurrent: number;
    queueLength: number;
    utilizationRate: number;
  };
}
```

### ParallelExecutionManager

```typescript
class ParallelExecutionManager {
  constructor(config: WorkerPoolConfig);

  /**
   * Execute a parallel group
   */
  executeGroup(
    group: ParallelGroup,
    stepExecutor: (stepId: string) => Promise<any>,
    context: WorkflowContext
  ): Promise<ParallelExecutionResult>;

  /**
   * Get worker pool statistics
   */
  getStats(): ReturnType<WorkerPool['getStats']>;

  /**
   * Get current status
   */
  getStatus(): ReturnType<WorkerPool['getStatus']>;
}
```

### Interfaces

```typescript
interface WorkerPoolConfig {
  maxConcurrent?: number;  // Max concurrent workers (default: 10)
  queueSize?: number;      // Max queue size (default: unlimited)
  timeout?: number;        // Default timeout per task in ms
}

interface ParallelGroup {
  id: string;                    // Unique identifier
  steps: string[];               // Step IDs to execute
  waitStrategy?: WaitStrategy;   // Default: 'all'
  maxConcurrent?: number;        // Concurrency limit
  continueOnError?: boolean;     // Continue on failures
  timeout?: number;              // Group timeout in ms
}

interface ParallelExecutionResult {
  groupId: string;              // Group identifier
  completedSteps: string[];     // Successful steps
  failedSteps: string[];        // Failed steps
  skippedSteps: string[];       // Skipped steps
  duration: number;             // Duration in ms
  success: boolean;             // Overall success
  results: Map<string, any>;    // Step results
  errors: Map<string, Error>;   // Step errors
}

type WaitStrategy = 'all' | 'any' | 'allSettled' | 'race';
```

---

## Best Practices

### DO:

1. **Use appropriate wait strategies**
   ```typescript
   // Critical operations
   waitStrategy: 'all'

   // Optional operations
   waitStrategy: 'allSettled'

   // Redundant sources
   waitStrategy: 'any'
   ```

2. **Set concurrency limits**
   ```typescript
   // Prevent overwhelming external systems
   maxConcurrent: 5
   ```

3. **Configure timeouts**
   ```typescript
   // Prevent hanging operations
   timeout: 30000  // 30 seconds
   ```

4. **Handle errors gracefully**
   ```typescript
   continueOnError: true  // For best-effort operations
   ```

5. **Monitor performance**
   ```typescript
   const stats = manager.getStats();
   if (stats.failureRate > 0.1) {
     // Alert or reduce concurrency
   }
   ```

### DON'T:

1. **Don't skip concurrency limits**
   ```typescript
   // ❌ Bad: No limit, might overwhelm system
   parallelGroup: {
     steps: array1000Items,
   }

   // ✅ Good: Controlled concurrency
   parallelGroup: {
     steps: array1000Items,
     maxConcurrent: 10,
   }
   ```

2. **Don't ignore errors in critical paths**
   ```typescript
   // ❌ Bad: Silently continue on auth failure
   parallelGroup: {
     steps: ['authenticate', 'fetch_data'],
     continueOnError: true,
   }

   // ✅ Good: Fail fast on critical errors
   parallelGroup: {
     steps: ['authenticate', 'fetch_data'],
     waitStrategy: 'all',
   }
   ```

3. **Don't use parallel execution for sequential dependencies**
   ```typescript
   // ❌ Bad: Step B depends on Step A
   parallelGroup: {
     steps: ['fetch_user', 'update_user'],  // update needs fetch result
   }

   // ✅ Good: Use dependsOn for sequential operations
   steps: [
     { id: 'fetch_user', ... },
     { id: 'update_user', dependsOn: ['fetch_user'], ... },
   ]
   ```

4. **Don't forget timeouts**
   ```typescript
   // ❌ Bad: Could hang forever
   parallelGroup: {
     steps: ['external_api_call'],
   }

   // ✅ Good: Set reasonable timeout
   parallelGroup: {
     steps: ['external_api_call'],
     timeout: 10000,
   }
   ```

5. **Don't mix independent and dependent steps in same parallel group**
   ```typescript
   // ❌ Bad: C depends on A, shouldn't be in same parallel group
   parallelGroup: {
     steps: ['step_a', 'step_b', 'step_c'],  // C needs A's result
   }

   // ✅ Good: Separate dependent operations
   steps: [
     { id: 'parallel_1', parallelGroup: { steps: ['step_a', 'step_b'] } },
     { id: 'step_c', dependsOn: ['step_a'], ... },
   ]
   ```

### Optimization Tips

1. **Batch similar operations**
   ```typescript
   // Instead of 1000 individual steps, batch them
   parallelGroup: {
     steps: ['batch_1', 'batch_2', 'batch_3'],  // Each processes 333 items
     maxConcurrent: 3,
   }
   ```

2. **Use appropriate wait strategies**
   ```typescript
   // Use 'any' for redundancy (fastest wins)
   // Use 'allSettled' for best-effort
   // Use 'all' only when all must succeed
   ```

3. **Monitor and tune concurrency**
   ```typescript
   // Start conservative, increase based on metrics
   let maxConcurrent = 5;

   const stats = manager.getStats();
   if (stats.utilizationRate < 50) {
     maxConcurrent += 5;  // Increase if underutilized
   }
   ```

4. **Use proper error handling**
   ```typescript
   try {
     const result = await manager.executeGroup(...);
     // Handle partial failures
     if (result.failedSteps.length > 0) {
       // Log, retry, or continue based on requirements
     }
   } catch (error) {
     // Handle complete failure
   }
   ```

---

## Troubleshooting

### Issue: Parallel execution slower than expected

**Symptoms:**
- Parallel execution doesn't improve performance
- Duration similar to sequential execution

**Possible causes:**
- Concurrency limit too low
- Operations are CPU-bound, not I/O-bound
- Overhead from worker pool management

**Solutions:**
```typescript
// Check concurrency limit
console.log(manager.getStatus());
// If utilizationRate is low, increase maxConcurrent

// Verify operations are I/O-bound (suitable for parallelization)
// CPU-bound operations may not benefit from parallel execution

// For very fast operations, overhead might exceed benefit
// Consider batching or sequential execution instead
```

### Issue: Resource exhaustion / Out of memory

**Symptoms:**
- System becomes slow or unresponsive
- Out of memory errors
- Connection pool exhausted

**Possible causes:**
- No concurrency limit set
- Too high maxConcurrent value
- Memory leaks in step execution

**Solutions:**
```typescript
// Set appropriate concurrency limit
parallelConfig: {
  maxConcurrent: 10,  // Start conservative
}

// Monitor resource usage
const stats = manager.getStats();
console.log(`Active workers: ${stats.activeWorkers}`);
console.log(`Queue length: ${stats.queueLength}`);

// Implement backpressure
if (stats.queueLength > 100) {
  // Pause adding new tasks
}
```

### Issue: Timeouts occurring frequently

**Symptoms:**
- Many tasks timing out
- Lower than expected completion rate

**Possible causes:**
- Timeout too short for operation
- External service slow/overloaded
- Network issues

**Solutions:**
```typescript
// Increase timeout for slow operations
parallelGroup: {
  steps: ['slow_operation'],
  timeout: 60000,  // 60 seconds
}

// Check if external service is healthy
// Add retry logic for transient failures

// Use adaptive timeout based on historical data
const avgDuration = getAverageDuration('operation');
const timeout = avgDuration * 2 + 5000;  // 2x average + 5s buffer
```

### Issue: Partial failures not handled correctly

**Symptoms:**
- Workflow fails despite some steps succeeding
- Expected data missing

**Possible causes:**
- Wrong wait strategy
- Missing error handling
- Not checking result.success

**Solutions:**
```typescript
// Use allSettled for best-effort operations
parallelGroup: {
  steps: ['optional1', 'optional2'],
  waitStrategy: 'allSettled',
  continueOnError: true,
}

// Check execution result
const result = await manager.executeGroup(...);
if (result.completedSteps.length > 0) {
  // Process successful results
  result.completedSteps.forEach(stepId => {
    const stepResult = result.results.get(stepId);
    // Use stepResult
  });
}

// Log failures
result.failedSteps.forEach(stepId => {
  const error = result.errors.get(stepId);
  console.error(`Step ${stepId} failed:`, error);
});
```

### Issue: Steps executing in wrong order

**Symptoms:**
- Step B executes before Step A completes
- Data dependencies broken

**Possible causes:**
- Missing dependsOn declarations
- Parallel execution of dependent steps

**Solutions:**
```typescript
// ❌ Wrong: B needs A's result but they're parallel
parallelGroup: {
  steps: ['step_a', 'step_b'],
}

// ✅ Correct: Use dependsOn for sequential operations
steps: [
  { id: 'step_a', ... },
  { id: 'step_b', dependsOn: ['step_a'], ... },
]

// ✅ Correct: If A and B are independent, parallel is ok
parallelGroup: {
  steps: ['independent_a', 'independent_b'],
}
```

### Debugging Tips

1. **Enable detailed logging**
   ```typescript
   // Logs are automatically generated
   // Check logs for:
   // - [WorkerPool] messages
   // - [ParallelExecution] messages
   ```

2. **Check statistics**
   ```typescript
   const stats = manager.getStats();
   console.log('Completed:', stats.tasksCompleted);
   console.log('Failed:', stats.tasksFailed);
   console.log('Timed out:', stats.tasksTimedOut);
   console.log('Average wait:', stats.averageWaitTime);
   ```

3. **Inspect execution result**
   ```typescript
   const result = await manager.executeGroup(...);
   console.log('Duration:', result.duration);
   console.log('Completed:', result.completedSteps);
   console.log('Failed:', result.failedSteps);
   console.log('Success:', result.success);
   ```

4. **Test with small batches first**
   ```typescript
   // Start with small maxConcurrent
   // Increase gradually while monitoring
   maxConcurrent: 2  // Start small
   // → 5
   // → 10
   // → 20
   ```

---

## Summary

Parallel Workflow Execution provides powerful, flexible concurrent execution with:

- **Worker Pools**: Resource-managed concurrent execution
- **Parallel Groups**: Group steps for parallel execution
- **Wait Strategies**: Four strategies (all, any, allSettled, race)
- **Resource Management**: Prevent exhaustion with limits
- **Error Handling**: Graceful degradation and error recovery
- **Performance**: Dramatically reduce workflow duration

**Key Takeaways:**
- Use parallel execution for I/O-bound, independent operations
- Set appropriate concurrency limits to prevent resource exhaustion
- Choose wait strategies based on requirements (all vs best-effort)
- Monitor statistics and tune performance
- Handle errors gracefully with appropriate strategies

For complete examples, see:
- `examples/workflows/parallel-example.yaml` - YAML examples
- `examples/workflows/advanced-parallel.ts` - Advanced TypeScript patterns
- `tests/core/workflow-parallel.test.ts` - Comprehensive test suite
