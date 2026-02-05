# Workflow Quick Reference

Fast reference guide for building workflows.

## Basic Workflow Structure

```typescript
import { WorkflowDefinition } from '../src/core/workflow-manager';

const myWorkflow: WorkflowDefinition = {
  name: 'workflow_name',
  description: 'What this workflow does',
  steps: [
    // Your steps here
  ],
  maxDuration: 10 * 60 * 1000, // 10 minutes
};
```

## Step Anatomy

```typescript
{
  id: 'unique_step_id',           // Required: unique identifier
  toolName: 'tool_name',          // Tool to execute
  input: { /* ... */ },           // Static input
  input: (ctx) => ({ /* ... */ }),// Dynamic input
  dependsOn: ['step1', 'step2'],  // Dependencies
  parallel: true,                 // Run in parallel
  condition: (ctx) => true,       // Conditional execution
  onError: 'fail',                // Error handling: fail | continue | retry
}
```

## Common Patterns

### Sequential Steps

```typescript
steps: [
  { id: 'step1', toolName: 'tool1' },
  { id: 'step2', toolName: 'tool2', dependsOn: ['step1'] },
  { id: 'step3', toolName: 'tool3', dependsOn: ['step2'] },
]
```

### Parallel Steps

```typescript
steps: [
  { id: 'setup', toolName: 'setup' },
  { id: 'task1', toolName: 'tool1', dependsOn: ['setup'], parallel: true },
  { id: 'task2', toolName: 'tool2', dependsOn: ['setup'], parallel: true },
  { id: 'task3', toolName: 'tool3', dependsOn: ['setup'], parallel: true },
  { id: 'aggregate', toolName: 'agg', dependsOn: ['task1', 'task2', 'task3'] },
]
```

### Conditional Steps

```typescript
{
  id: 'conditional_step',
  toolName: 'my_tool',
  condition: (context) => {
    return context.results.get('previous_step')?.shouldRun === true;
  },
}
```

### Dynamic Input

```typescript
{
  id: 'dynamic_step',
  toolName: 'processor',
  input: (context) => ({
    data: context.results.get('fetch_step')?.data,
    userId: context.userId,
  }),
  dependsOn: ['fetch_step'],
}
```

### Error Handling

```typescript
// Fail workflow on error (default)
{ id: 'critical', toolName: 'db_migration', onError: 'fail' }

// Continue workflow on error
{ id: 'optional', toolName: 'send_email', onError: 'continue' }

// Retry on error
{ id: 'api_call', toolName: 'external_api', onError: 'retry' }
```

### Cleanup Step

```typescript
{
  id: 'cleanup',
  toolName: 'cleanup_resources',
  dependsOn: ['main_task'],
  onError: 'continue', // Always cleanup
}
```

## Workflow Context

```typescript
interface WorkflowContext {
  userId: string;              // User who triggered workflow
  userRequest?: string;        // Optional request data
  results: Map<string, any>;   // Step results: stepId -> result
  errors: Map<string, Error>;  // Step errors: stepId -> error
  startTime: number;           // Workflow start timestamp
}
```

### Accessing Context

```typescript
{
  id: 'my_step',
  input: (context) => {
    // Get previous step result
    const data = context.results.get('previous_step');

    // Check if step had error
    const hadError = context.errors.has('previous_step');

    // Get user info
    const userId = context.userId;

    // Calculate elapsed time
    const elapsed = Date.now() - context.startTime;

    return { data, userId, elapsed };
  },
}
```

## Execution

```typescript
import { WorkflowManager } from '../src/core/workflow-manager';

const manager = new WorkflowManager();

const result = await manager.execute(myWorkflow, {
  userId: 'user123',
  userRequest: 'optional data',
});
```

## Real-World Examples

### API Request with Retry and Fallback

```typescript
steps: [
  {
    id: 'primary_api',
    toolName: 'api_call',
    input: { url: 'https://primary.api.com' },
    onError: 'continue',
  },
  {
    id: 'fallback_api',
    toolName: 'api_call',
    input: { url: 'https://backup.api.com' },
    condition: (ctx) => ctx.errors.has('primary_api'),
  },
]
```

### Data Processing Pipeline

```typescript
steps: [
  { id: 'extract', toolName: 'data_extractor' },
  {
    id: 'validate',
    toolName: 'validator',
    input: (ctx) => ({ data: ctx.results.get('extract') }),
    dependsOn: ['extract'],
  },
  {
    id: 'transform',
    toolName: 'transformer',
    input: (ctx) => ({ data: ctx.results.get('validate') }),
    dependsOn: ['validate'],
  },
  {
    id: 'load',
    toolName: 'loader',
    input: (ctx) => ({ data: ctx.results.get('transform') }),
    dependsOn: ['transform'],
  },
]
```

### Parallel Validation

```typescript
steps: [
  { id: 'fetch', toolName: 'data_fetcher' },
  { id: 'check_schema', toolName: 'schema_validator', dependsOn: ['fetch'], parallel: true },
  { id: 'check_rules', toolName: 'rules_validator', dependsOn: ['fetch'], parallel: true },
  { id: 'check_security', toolName: 'security_checker', dependsOn: ['fetch'], parallel: true },
  {
    id: 'aggregate',
    toolName: 'result_aggregator',
    input: (ctx) => ({
      schema: ctx.results.get('check_schema'),
      rules: ctx.results.get('check_rules'),
      security: ctx.results.get('check_security'),
    }),
    dependsOn: ['check_schema', 'check_rules', 'check_security'],
  },
]
```

### Deployment with Rollback

```typescript
steps: [
  { id: 'backup', toolName: 'create_backup' },
  {
    id: 'deploy',
    toolName: 'deployer',
    dependsOn: ['backup'],
    onError: 'continue',
  },
  {
    id: 'smoke_test',
    toolName: 'smoke_tester',
    dependsOn: ['deploy'],
    onError: 'continue',
  },
  {
    id: 'rollback',
    toolName: 'restore_backup',
    dependsOn: ['smoke_test'],
    condition: (ctx) => ctx.errors.has('smoke_test'),
  },
]
```

## Performance Tips

### ✅ DO

- Use `parallel: true` for independent steps
- Set appropriate `maxDuration`
- Use dynamic inputs with `(context) => ({ ... })`
- Handle errors explicitly with `onError`
- Keep steps focused (single responsibility)

### ❌ DON'T

- Don't create circular dependencies
- Don't use hardcoded data when dynamic input is needed
- Don't ignore errors without explicit handling
- Don't create monolithic steps
- Don't skip timeout configuration

## Debugging

### Check Step Results

```typescript
const result = await manager.execute(workflow, context);

// Check what steps executed
console.log('Executed steps:', Array.from(result.results.keys()));

// Check step output
console.log('Step result:', result.results.get('my_step'));

// Check errors
console.log('Errors:', Array.from(result.errors.entries()));
```

### Log Step Execution

Add logging in input functions:

```typescript
{
  id: 'debug_step',
  input: (context) => {
    console.log('[debug_step] Previous results:',
      Array.from(context.results.entries()));
    return { /* actual input */ };
  },
}
```

## Common Issues

### Circular Dependency

```typescript
// ❌ BAD
{ id: 'a', dependsOn: ['b'] },
{ id: 'b', dependsOn: ['a'] }, // Circular!

// ✅ GOOD
{ id: 'a', dependsOn: [] },
{ id: 'b', dependsOn: ['a'] },
```

### Missing Dependencies

```typescript
// ❌ BAD
{ id: 'step2', dependsOn: ['step1'] },
// step1 doesn't exist!

// ✅ GOOD
{ id: 'step1', toolName: 'tool1' },
{ id: 'step2', toolName: 'tool2', dependsOn: ['step1'] },
```

### Timeout Too Short

```typescript
// ❌ BAD - likely to timeout
{
  name: 'long_workflow',
  steps: [/* 20 steps */],
  maxDuration: 10000, // 10 seconds
}

// ✅ GOOD
{
  name: 'long_workflow',
  steps: [/* 20 steps */],
  maxDuration: 5 * 60 * 1000, // 5 minutes
}
```

## Cheat Sheet

| Task | Pattern |
|------|---------|
| Run steps in order | Use `dependsOn: ['prev_step']` |
| Run steps in parallel | Add `parallel: true` |
| Skip step conditionally | Use `condition: (ctx) => boolean` |
| Get previous result | `context.results.get('step_id')` |
| Check for errors | `context.errors.has('step_id')` |
| Always run cleanup | Use `onError: 'continue'` |
| Fail fast | Use `onError: 'fail'` |
| Retry on failure | Use `onError: 'retry'` |
| Dynamic input | Use `input: (ctx) => ({ ... })` |
| Set timeout | Use `maxDuration: ms` |

## Examples

See full examples in:
- `/examples/workflow-examples.ts` - 5 complete workflows
- `/docs/workflows/common-patterns.md` - Detailed patterns guide

## Need Help?

1. Check [Common Patterns Guide](./common-patterns.md)
2. Review [Workflow Manager Docs](../architecture/workflow-system.md)
3. Look at [Example Workflows](../../examples/workflow-examples.ts)
