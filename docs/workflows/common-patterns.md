# Common Workflow Patterns

Comprehensive guide to common workflow patterns and best practices for building robust automated workflows.

## Table of Contents

- [Overview](#overview)
- [Workflow Examples](#workflow-examples)
- [Design Patterns](#design-patterns)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)

## Overview

This guide provides production-ready workflow examples for common use cases, along with best practices and design patterns.

## Workflow Examples

### 1. Code Review Workflow

**Use Case:** Automated code review for pull requests

**Features:**
- Static analysis (linting)
- Test coverage validation
- Code style checking
- Security vulnerability scanning
- Automated PR comments

**Pattern:** Parallel validation with aggregated reporting

```typescript
import { codeReviewWorkflow } from '../examples/workflow-examples';

const result = await workflowManager.execute(codeReviewWorkflow, {
  userId: 'developer1',
  userRequest: '123', // PR number
});
```

**Key Techniques:**
- Parallel execution of independent checks
- Conditional step execution (only comment if issues found)
- Dynamic input generation from previous step results
- Error aggregation

**Timeline:**
```
fetch_changes (2s)
    ├── static_analysis (10s)
    ├── check_coverage (5s)
    ├── style_check (3s)
    └── security_scan (15s)
            ↓
    generate_report (2s)
            ↓
    post_comment (1s)

Total: ~20s (vs ~38s sequential)
```

---

### 2. Testing Workflow

**Use Case:** Comprehensive test suite execution

**Features:**
- Unit, integration, and E2E tests
- Parallel test execution
- Coverage thresholds
- Result aggregation
- Automatic cleanup

**Pattern:** Multi-stage testing with coverage validation

```typescript
import { testingWorkflow } from '../examples/workflow-examples';

const result = await workflowManager.execute(testingWorkflow, {
  userId: 'ci-system',
  userRequest: 'Run full test suite',
});
```

**Key Techniques:**
- Environment setup/teardown
- Parallel test suite execution
- Coverage merging from multiple sources
- Threshold validation with fail-fast
- Guaranteed cleanup on error

**Timeline:**
```
setup_environment (5s)
    ├── run_unit_tests (30s)
    ├── run_integration_tests (45s)
    └── run_e2e_tests (60s)
            ↓
    merge_coverage (2s)
            ↓
    check_thresholds (1s)
            ↓
    [generate_html_report + upload_results] (5s)
            ↓
    cleanup (2s)

Total: ~70s (vs ~150s sequential)
```

---

### 3. Documentation Generation Workflow

**Use Case:** Automated documentation generation and deployment

**Features:**
- API documentation extraction
- Tutorial generation from examples
- Link validation
- Image optimization
- Automated deployment
- CDN cache invalidation

**Pattern:** Extract-Transform-Deploy with validation

```typescript
import { documentationWorkflow } from '../examples/workflow-examples';

const result = await workflowManager.execute(documentationWorkflow, {
  userId: 'docs-bot',
  userRequest: 'Generate and deploy docs',
});
```

**Key Techniques:**
- Codebase analysis
- Parallel extraction (API + examples)
- Link validation before deployment
- Asset optimization
- Multi-stage deployment

**Deployment Safety:**
1. Build locally first
2. Validate all links
3. Optimize assets
4. Deploy to staging (optional)
5. Deploy to production
6. Invalidate CDN cache
7. Notify team

---

### 4. Analytics/Reporting Workflow

**Use Case:** Scheduled analytics reports with distribution

**Features:**
- Multi-source data collection
- KPI calculation
- Chart generation
- PDF report creation
- Email and Slack distribution
- Cloud storage archival

**Pattern:** Collect-Aggregate-Visualize-Distribute

```typescript
import { analyticsWorkflow } from '../examples/workflow-examples';

const result = await workflowManager.execute(analyticsWorkflow, {
  userId: 'analytics-system',
  userRequest: 'Generate weekly report',
});
```

**Key Techniques:**
- Parallel data collection from multiple sources
- Data aggregation and normalization
- KPI calculations
- Visualization generation
- Multi-channel distribution

**Data Flow:**
```
collect_metrics
    ├── query_database (DB metrics)
    ├── fetch_api_stats (API metrics)
    └── fetch_user_engagement (User metrics)
            ↓
    aggregate_data
            ↓
    ├── calculate_kpis
    └── generate_charts
            ↓
    create_summary
            ↓
    generate_pdf
            ↓
    ├── upload_report (S3)
    ├── email_stakeholders
    └── post_to_slack
```

---

### 5. Backup Workflow

**Use Case:** Comprehensive system backup with verification

**Features:**
- Multi-source backup (DB, Redis, files)
- Compression and encryption
- Multi-location upload (S3 + GCS)
- Integrity verification
- Retention policy enforcement
- Automatic cleanup

**Pattern:** Collect-Compress-Encrypt-Distribute-Verify

```typescript
import { backupWorkflow } from '../examples/workflow-examples';

const result = await workflowManager.execute(backupWorkflow, {
  userId: 'backup-system',
  userRequest: 'Run daily backup',
});
```

**Key Techniques:**
- Parallel backup of independent sources
- Compression for storage efficiency
- Encryption for security
- Multi-region redundancy
- Checksum verification
- Retention policy automation

**Security Considerations:**
1. Encrypt before upload
2. Use separate encryption keys per environment
3. Store keys in secure vault
4. Verify checksums after upload
5. Test restore procedures regularly

**Backup Timeline:**
```
prepare_backup_dir (0.1s)
    ├── backup_database (60s)
    ├── backup_redis (5s)
    ├── backup_uploads (120s)
    └── backup_configs (1s)
            ↓
    compress_backup (30s)
            ↓
    encrypt_backup (20s)
            ↓
    calculate_checksum (5s)
            ↓
    ├── upload_to_s3 (90s)
    └── upload_to_gcs (90s)
            ↓
    ├── verify_s3_upload (1s)
    └── verify_gcs_upload (1s)
            ↓
    ├── cleanup_local (2s)
    ├── cleanup_old_backups (10s)
    └── log_backup (1s)
            ↓
    notify_success (1s)

Total: ~320s (with parallel uploads)
```

---

## Design Patterns

### Pattern 1: Fan-Out/Fan-In

Execute multiple steps in parallel, then aggregate results.

```typescript
{
  id: 'fetch_data',
  toolName: 'data_source',
},
{
  id: 'process_1',
  toolName: 'processor_a',
  dependsOn: ['fetch_data'],
  parallel: true,
},
{
  id: 'process_2',
  toolName: 'processor_b',
  dependsOn: ['fetch_data'],
  parallel: true,
},
{
  id: 'aggregate',
  toolName: 'aggregator',
  dependsOn: ['process_1', 'process_2'],
}
```

**Benefits:**
- Reduced total execution time
- Better resource utilization
- Isolated failures

**When to Use:**
- Independent processing tasks
- Multiple data sources
- Parallel validation checks

---

### Pattern 2: Pipeline

Sequential processing with each step building on previous results.

```typescript
{
  id: 'extract',
  toolName: 'extractor',
},
{
  id: 'transform',
  toolName: 'transformer',
  dependsOn: ['extract'],
},
{
  id: 'load',
  toolName: 'loader',
  dependsOn: ['transform'],
}
```

**Benefits:**
- Clear data flow
- Easy to debug
- Predictable execution

**When to Use:**
- ETL processes
- Data transformations
- Sequential validations

---

### Pattern 3: Conditional Branch

Execute different steps based on conditions.

```typescript
{
  id: 'check_environment',
  toolName: 'env_detector',
},
{
  id: 'deploy_production',
  toolName: 'prod_deployer',
  dependsOn: ['check_environment'],
  condition: (ctx) => ctx.results.get('check_environment')?.env === 'production',
},
{
  id: 'deploy_staging',
  toolName: 'staging_deployer',
  dependsOn: ['check_environment'],
  condition: (ctx) => ctx.results.get('check_environment')?.env === 'staging',
}
```

**Benefits:**
- Dynamic workflow execution
- Environment-specific logic
- Reduced unnecessary work

**When to Use:**
- Multi-environment deployments
- Feature flags
- A/B testing workflows

---

### Pattern 4: Retry with Fallback

Attempt primary action, fallback to secondary on failure.

```typescript
{
  id: 'primary_upload',
  toolName: 's3_upload',
  onError: 'continue',
},
{
  id: 'fallback_upload',
  toolName: 'gcs_upload',
  dependsOn: ['primary_upload'],
  condition: (ctx) => ctx.errors.has('primary_upload'),
}
```

**Benefits:**
- Improved reliability
- Automatic failover
- Reduced manual intervention

**When to Use:**
- Multi-cloud deployments
- External API calls
- Network operations

---

### Pattern 5: Cleanup Guarantee

Always execute cleanup, even on error.

```typescript
{
  id: 'allocate_resources',
  toolName: 'resource_allocator',
},
{
  id: 'main_work',
  toolName: 'worker',
  dependsOn: ['allocate_resources'],
},
{
  id: 'cleanup',
  toolName: 'resource_cleanup',
  dependsOn: ['main_work'],
  onError: 'continue', // Always cleanup
}
```

**Benefits:**
- No resource leaks
- Consistent cleanup
- Cost optimization

**When to Use:**
- Temporary resources
- Database connections
- File system operations

---

## Best Practices

### 1. Keep Steps Focused

```typescript
// ❌ Bad - step does too much
{
  id: 'process_everything',
  toolName: 'mega_processor',
  input: { doEverything: true }
}

// ✅ Good - focused steps
{
  id: 'validate',
  toolName: 'validator',
},
{
  id: 'transform',
  toolName: 'transformer',
  dependsOn: ['validate'],
},
{
  id: 'save',
  toolName: 'saver',
  dependsOn: ['transform'],
}
```

### 2. Use Dynamic Inputs

```typescript
// ❌ Bad - hardcoded
{
  id: 'process',
  input: { data: [1, 2, 3] }
}

// ✅ Good - dynamic
{
  id: 'process',
  input: (context) => ({
    data: context.results.get('fetch')?.items
  }),
  dependsOn: ['fetch'],
}
```

### 3. Handle Errors Explicitly

```typescript
// ❌ Bad - no error handling
{
  id: 'critical_step',
  toolName: 'important_tool',
}

// ✅ Good - explicit error handling
{
  id: 'critical_step',
  toolName: 'important_tool',
  onError: 'fail', // Fail fast for critical steps
}

// ✅ Also good - for optional steps
{
  id: 'optional_step',
  toolName: 'nice_to_have',
  onError: 'continue', // Don't block workflow
}
```

### 4. Set Timeouts

```typescript
// ✅ Always set workflow timeout
const workflow: WorkflowDefinition = {
  name: 'my_workflow',
  steps: [...],
  maxDuration: 10 * 60 * 1000, // 10 minutes
};
```

### 5. Add Context to Inputs

```typescript
// ✅ Include context for debugging
{
  id: 'send_email',
  input: (context) => ({
    to: 'user@example.com',
    subject: 'Report Ready',
    body: '...',
    metadata: {
      workflowName: 'analytics_report',
      userId: context.userId,
      timestamp: Date.now(),
    },
  }),
}
```

---

## Performance Optimization

### 1. Parallel Execution

```typescript
// Identify independent steps and mark as parallel
{
  id: 'task_a',
  toolName: 'tool_a',
  dependsOn: ['setup'],
  parallel: true,  // ← Enable parallel execution
},
{
  id: 'task_b',
  toolName: 'tool_b',
  dependsOn: ['setup'],
  parallel: true,  // ← Runs alongside task_a
}
```

**Impact:** 2-5x faster for I/O-bound workflows

### 2. Early Exit

```typescript
// Skip unnecessary work with conditions
{
  id: 'expensive_analysis',
  toolName: 'analyzer',
  condition: (ctx) => {
    // Only run if changes detected
    return ctx.results.get('check_changes')?.hasChanges === true;
  },
}
```

### 3. Caching

```typescript
{
  id: 'fetch_data',
  toolName: 'data_fetcher',
  input: {
    useCache: true,
    cacheTTL: 3600, // 1 hour
  },
}
```

### 4. Batch Operations

```typescript
// Process multiple items in batch
{
  id: 'send_notifications',
  toolName: 'batch_notifier',
  input: (ctx) => ({
    recipients: ctx.results.get('get_users')?.users,
    batchSize: 100, // Send 100 at a time
  }),
}
```

---

## Error Handling

### Error Strategies

| Strategy | When to Use | Example |
|----------|-------------|---------|
| `fail` | Critical steps | Database migrations |
| `continue` | Optional steps | Sending notifications |
| `retry` | Transient failures | API calls, network operations |

### Example: Robust Error Handling

```typescript
{
  id: 'api_call',
  toolName: 'external_api',
  onError: 'retry',
  input: {
    retries: 3,
    backoff: 'exponential',
  },
},
{
  id: 'fallback',
  toolName: 'fallback_api',
  dependsOn: ['api_call'],
  condition: (ctx) => ctx.errors.has('api_call'),
},
{
  id: 'notify_failure',
  toolName: 'alerter',
  dependsOn: ['fallback'],
  condition: (ctx) => ctx.errors.has('fallback'),
}
```

---

## Testing Workflows

### Unit Test Example

```typescript
import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Code Review Workflow', () => {
  it('should execute all steps in correct order', async () => {
    const result = await workflowManager.execute(codeReviewWorkflow, {
      userId: 'test',
      userRequest: 'test-pr',
    });

    assert.ok(result);
    assert.ok(result.has('generate_report'));
  });

  it('should skip comment if no issues', async () => {
    // Mock results with no issues
    const result = await workflowManager.execute(codeReviewWorkflow, {
      userId: 'test',
      userRequest: 'clean-pr',
    });

    assert.strictEqual(result.has('post_comment'), false);
  });
});
```

---

## Monitoring

### Key Metrics to Track

1. **Workflow Duration**
   - Total execution time
   - Per-step duration
   - Bottleneck identification

2. **Success Rate**
   - Completion rate
   - Failure rate by step
   - Error patterns

3. **Resource Usage**
   - Parallel execution efficiency
   - Memory consumption
   - API rate limits

4. **Business Metrics**
   - Documents generated
   - Tests passed
   - Backups completed

---

## References

- [Workflow Manager Documentation](../architecture/workflow-system.md)
- [Tool Registry](../architecture/tool-registry.md)
- [Parallel Execution](../architecture/parallel-execution.md)
- [Example Implementations](../../examples/workflow-examples.ts)
