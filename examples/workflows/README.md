# Example Workflows

This directory contains practical workflow examples demonstrating the Workflow Manager capabilities.

## 📚 Available Workflows

### 1. **Deploy Application** (`deploy-app.ts`)
Complete deployment pipeline with testing, building, and deployment steps.

**Steps:** Test → Build → Package → Deploy → Health Check → Notify
**Duration:** ~5 minutes
**Use Case:** Automated application deployment

```typescript
import { deployAppWorkflow } from './examples/workflows/deploy-app';
await workflowManager.execute(deployAppWorkflow, { userId, userRequest });
```

---

### 2. **CI/CD Pipeline** (`ci-cd-pipeline.ts`)
Full continuous integration and deployment pipeline with quality checks.

**Steps:** Lint + Type Check → Unit Tests + Integration Tests → Security Scan → Build → Docker → Push → Deploy → Smoke Tests
**Duration:** ~10 minutes
**Parallel Steps:** 5 quality checks run in parallel
**Use Case:** Automated testing and deployment

```typescript
import { cicdPipeline } from './examples/workflows/ci-cd-pipeline';
await workflowManager.execute(cicdPipeline, { userId, userRequest });
```

---

### 3. **Bot Creation** (`bot-creation.ts`)
Automated Discord bot provisioning and configuration.

**Steps:** Validate Config → Create Directory → Generate Config → Register → Deploy → Test → Monitor
**Duration:** ~1 minute
**Use Case:** Rapid bot deployment and setup

```typescript
import { botCreationWorkflow } from './examples/workflows/bot-creation';
await workflowManager.execute(botCreationWorkflow, { userId, userRequest });
```

**Config Format:**
```json
{
  "name": "bot-name",
  "token": "MTI...xyz",
  "appId": "1234567890",
  "guildId": "0987654321",
  "prefix": "!",
  "features": ["commands", "events"]
}
```

---

### 4. **Data Processing** (`data-processing.ts`)
ETL pipeline for data extraction, transformation, and loading.

**Steps:** Read Sources (parallel) → Validate → Merge → Clean → Transform (parallel) → Validate Output → Quality Checks → Write Output → Generate Report
**Duration:** 1-5 minutes
**Parallel Steps:** 9 steps run in parallel
**Use Case:** Batch data processing

```typescript
import { dataProcessingWorkflow } from './examples/workflows/data-processing';
await workflowManager.execute(dataProcessingWorkflow, { userId, userRequest });
```

---

## 🚀 Quick Start

### 1. Basic Usage

```typescript
import { workflowManager } from './src/core/workflow-manager';
import { deployAppWorkflow } from './examples/workflows/deploy-app';

// Execute workflow
const result = await workflowManager.execute(deployAppWorkflow, {
  userId: 'user-123',
  userRequest: 'Deploy to production'
});

console.log('Workflow result:', result);
```

### 2. Custom Workflow

```typescript
import { WorkflowDefinition } from './src/core/workflow-manager';

const myWorkflow: WorkflowDefinition = {
  name: 'my_workflow',
  description: 'Custom workflow',
  maxDuration: 60000, // 1 minute

  steps: [
    {
      id: 'step1',
      toolName: 'read_file',
      input: { path: './README.md' },
      onError: 'fail'
    },
    {
      id: 'step2',
      toolName: 'write_file',
      input: (ctx) => ({
        path: './output.txt',
        content: `Processed: ${ctx.results.get('step1').length} bytes`
      }),
      dependsOn: ['step1'],
      onError: 'fail'
    }
  ]
};

await workflowManager.execute(myWorkflow, { userId, userRequest });
```

---

## 🎯 Workflow Features

### Dependency Management
```typescript
{
  id: 'deploy',
  toolName: 'web_fetch',
  dependsOn: ['test', 'build'], // Wait for test and build to complete
  // ...
}
```

### Parallel Execution
```typescript
{
  id: 'unit_tests',
  toolName: 'execute_shell',
  parallel: true, // Run in parallel with other parallel steps
  // ...
}
```

### Error Handling
```typescript
{
  id: 'notify',
  toolName: 'web_fetch',
  onError: 'continue', // Options: 'fail', 'continue', 'retry'
  retryConfig: {
    maxAttempts: 3,
    delayMs: 5000
  }
}
```

### Conditional Steps
```typescript
{
  id: 'deploy_prod',
  toolName: 'web_fetch',
  condition: (ctx) => process.env.NODE_ENV === 'production',
  // Only runs if condition is true
}
```

### Dynamic Input
```typescript
{
  id: 'process',
  toolName: 'execute_shell',
  input: (ctx) => ({
    command: `echo "Result: ${ctx.results.get('previous_step').value}"`
  }),
  dependsOn: ['previous_step']
}
```

---

## 📊 Workflow Validation

Before executing, validate your workflow:

```typescript
const validation = workflowManager.validateWorkflow(myWorkflow);

if (!validation.valid) {
  console.error('Workflow validation failed:', validation.errors);
} else {
  console.log('✅ Workflow is valid');
}
```

**Common Validation Errors:**
- Duplicate step IDs
- Circular dependencies
- Non-existent dependencies
- Excessive depth (>20 levels)

---

## 🔍 Monitoring & Debugging

### Enable Telemetry
```bash
export TELEMETRY_ENABLED=true
```

### View Workflow Logs
```typescript
// Logs show:
// - Step execution order
// - Parallel step execution
// - Error handling
// - Duration and performance
```

### Cost Tracking
```typescript
// With telemetry enabled:
const stats = telemetry.getCostStats();
console.log('Total cost:', stats.totalCost);
console.log('Cost by tool:', stats.byTool);
```

---

## 🧪 Testing Workflows

```typescript
import { workflowManager } from './src/core/workflow-manager';

describe('My Workflow', () => {
  it('should execute successfully', async () => {
    const result = await workflowManager.execute(myWorkflow, {
      userId: 'test-user',
      userRequest: 'test'
    });

    expect(result).toBeDefined();
    expect(result.final_step).toBeDefined();
  });

  it('should validate correctly', () => {
    const validation = workflowManager.validateWorkflow(myWorkflow);
    expect(validation.valid).toBe(true);
  });
});
```

---

## 💡 Best Practices

### 1. **Use Descriptive Step IDs**
```typescript
// ❌ Bad
{ id: 'step1', ... }

// ✅ Good
{ id: 'run_unit_tests', ... }
```

### 2. **Set Appropriate Timeouts**
```typescript
{
  name: 'quick_workflow',
  maxDuration: 60000, // 1 minute for fast workflows
  // ...
}
```

### 3. **Handle Errors Gracefully**
```typescript
{
  id: 'optional_notification',
  onError: 'continue', // Don't fail entire workflow
}

{
  id: 'critical_deploy',
  onError: 'fail', // Stop immediately on failure
}
```

### 4. **Use Parallel Execution**
```typescript
// Independent steps should run in parallel
{
  id: 'lint',
  parallel: true
},
{
  id: 'test',
  parallel: true
}
// Both run simultaneously!
```

### 5. **Validate Before Execution**
```typescript
const validation = workflowManager.validateWorkflow(workflow);
if (validation.valid) {
  await workflowManager.execute(workflow, context);
} else {
  console.error('Invalid workflow:', validation.errors);
}
```

---

## 📖 Additional Resources

- **Architecture:** `docs/architecture/hybrid-strategy.md`
- **Integration Status:** `docs/integration-status.md`
- **Tool Registry:** `src/core/tool-registry.ts`
- **Workflow Manager:** `src/core/workflow-manager.ts`

---

## 🤝 Contributing

To add a new workflow:

1. Create `{workflow-name}.ts` in this directory
2. Follow the existing workflow structure
3. Add usage examples and documentation
4. Test thoroughly
5. Update this README

---

**Need Help?**
- Check `docs/guides/building-workflows.md` (coming soon)
- Review existing workflows for patterns
- Test with `workflowManager.validateWorkflow()` first
