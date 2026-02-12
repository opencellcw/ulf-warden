# ⚙️ Temporal Integration - Complete Guide

**Setup time:** 1-2 horas  
**ROI:** $12,000/year (reduced errors + faster debugging + automatic retries)  
**Free tier:** Unlimited local, cloud free tier available

---

## 🎯 What is Temporal?

Temporal is a **workflow orchestration platform** that provides:
- 🔄 **Durable execution** (survives restarts/crashes)
- 🔁 **Automatic retries** (configurable backoff)
- ↩️ **Rollback support** (compensating transactions)
- 🐛 **Visual debugging** (Web UI)
- 💾 **State management** (workflow state persisted)

**Use cases:**
- Bot deployment (multi-step with rollback)
- Data processing (batch jobs)
- Integration flows (API orchestration)
- Scheduled tasks (cron-like)

---

## 🚀 Quick Setup - Local (10 minutes)

### Option 1: Docker (Recommended)

```bash
# Start Temporal server
./scripts/setup-temporal-local.sh

# Output:
# 🚀 Starting Temporal server...
# ✅ Server ready!
# 📊 Web UI: http://localhost:8233
# 🔌 gRPC: localhost:7233
```

**What this does:**
- Pulls Temporal Docker image
- Starts server on localhost:7233
- Opens Web UI in browser

### Option 2: Manual Docker

```bash
docker run -d \
  --name temporal-dev-server \
  -p 7233:7233 \
  -p 8233:8233 \
  temporalio/auto-setup:latest
```

### Configure OpenCell

Add to `.env`:
```bash
TEMPORAL_ENABLED=true
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=opencell-tasks
```

### Start Worker

```bash
# Worker executes workflows
npx tsx src/workflows/worker.ts

# Output:
# 🚀 Starting Temporal worker...
# ✅ Worker created
# ⚡ Worker running! Waiting for tasks...
```

**Keep this running!** Worker polls for tasks.

---

## 🌐 Cloud Setup (30 minutes)

### Step 1: Create Account

1. **Sign up:** https://cloud.temporal.io
2. **Create namespace:**
   - Dashboard → Namespaces → Create
   - Name: `opencell-prod`
   - Region: `us-east-1`

### Step 2: Get Credentials

```bash
# Install Temporal CLI
brew install temporal

# Login
temporal cloud login

# Get namespace details
temporal cloud namespace describe opencell-prod
```

### Step 3: Configure OpenCell

Add to `.env`:
```bash
TEMPORAL_ENABLED=true
TEMPORAL_ADDRESS=opencell-prod.tmprl.cloud:7233
TEMPORAL_NAMESPACE=opencell-prod
TEMPORAL_TASK_QUEUE=opencell-tasks

# Optional: TLS certificates
TEMPORAL_TLS_CERT_PATH=/path/to/cert.pem
TEMPORAL_TLS_KEY_PATH=/path/to/key.pem
```

### Step 4: Start Worker (Cloud)

```bash
# Same command, different server
npx tsx src/workflows/worker.ts

# Output:
# 📡 Connecting to Temporal...
#    Address: opencell-prod.tmprl.cloud:7233
# ✅ Worker created
# ⚡ Worker running!
```

---

## 📚 Usage Examples

### 1. Bot Deployment Workflow

**Start workflow:**
```typescript
import { getTemporal } from './src/workflows/temporal-client';

const temporal = await getTemporal();

const handle = await temporal.startWorkflow('botDeploymentWorkflow', {
  workflowId: `deploy-${botName}-${Date.now()}`,
  taskQueue: 'opencell-tasks',
  args: [{
    botName: 'my-bot',
    botType: 'discord',
    config: { token: 'xxx' },
    owner: 'user-123',
  }],
});

console.log('Workflow started:', handle.workflowId);
```

**Monitor progress:**
```typescript
// Query current status
const status = await temporal.queryWorkflow(
  handle.workflowId,
  'status'
);

console.log(`${status.step}: ${status.progress}%`);
// Output: Deploying to platform: 60%
```

**Get result:**
```typescript
const result = await temporal.getWorkflowResult(handle.workflowId);

if (result.success) {
  console.log('Bot deployed!', result.botId);
} else {
  console.error('Deployment failed:', result.error);
}
```

---

### 2. Workflow Lifecycle

```typescript
// Start
const handle = await temporal.startWorkflow('myWorkflow', options);

// Pause
await temporal.signalWorkflow(handle.workflowId, 'pause');

// Resume
await temporal.signalWorkflow(handle.workflowId, 'resume');

// Cancel
await temporal.cancelWorkflow(handle.workflowId);

// Get details
const details = await temporal.describeWorkflow(handle.workflowId);
console.log(`Status: ${details.status}`);
console.log(`Runtime: ${details.executionTime}ms`);
```

---

### 3. Custom Workflow

**Define workflow:**
```typescript
// src/workflows/definitions/my-workflow.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from '../activities';

const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',
    maximumAttempts: 3,
  },
});

export async function myWorkflow(input: any): Promise<any> {
  // Step 1
  const result1 = await myActivity(input.step1);
  
  // Step 2 (conditional)
  if (result1.success) {
    const result2 = await myActivity(input.step2);
    return { success: true, result: result2 };
  }
  
  return { success: false, error: result1.error };
}
```

**Define activity:**
```typescript
// src/workflows/activities/index.ts
export async function myActivity(input: any): Promise<any> {
  // Actual implementation (can fail, timeout, retry)
  const result = await someAPICall(input);
  return result;
}
```

---

## 🔍 Web UI

Access: **http://localhost:8233** (or cloud URL)

**Features:**
- 📊 **Workflows list** - All running/completed workflows
- 🔍 **Search** - Find by workflow ID, type, status
- 📈 **Timeline** - Visual execution history
- 🐛 **Debug** - Step through workflow execution
- 📄 **Event history** - Complete audit trail
- 🔄 **Retry** - Manually retry failed workflows

**Example search:**
```
WorkflowType = "botDeploymentWorkflow" AND Status = "Failed"
```

---

## 🔄 Retry Logic

### Automatic Retries

```typescript
const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: {
    initialInterval: '1s',      // Wait 1s before first retry
    backoffCoefficient: 2,       // Double each time (1s, 2s, 4s, 8s)
    maximumInterval: '1 minute', // Cap at 1 minute
    maximumAttempts: 5,          // Try up to 5 times
  },
});

// Activity will auto-retry on failure!
const result = await myActivity(input);
```

**Retry sequence:**
1. Attempt 1: Fails
2. Wait 1s
3. Attempt 2: Fails
4. Wait 2s
5. Attempt 3: Fails
6. Wait 4s
7. Attempt 4: Success! ✅

---

### Manual Retry

```typescript
try {
  await myActivity(input);
} catch (error) {
  // Custom retry logic
  if (error.code === 'RATE_LIMIT') {
    await sleep('10 minutes');
    await myActivity(input); // Retry after delay
  } else {
    throw error; // Give up
  }
}
```

---

## ↩️ Rollback (Compensating Transactions)

**Saga pattern example:**
```typescript
export async function deploymentWorkflow(input: any) {
  let deployed = false;
  let dbCreated = false;

  try {
    // Step 1: Create DB record
    const botId = await createBotRecord(input);
    dbCreated = true;
    
    // Step 2: Deploy to platform
    await deployToDiscord(botId, input.config);
    deployed = true;
    
    // Step 3: Health check
    await runHealthCheck(botId);
    
    return { success: true, botId };
    
  } catch (error) {
    // Rollback (in reverse order)
    if (deployed) {
      await rollbackDiscordBot(botId);
    }
    if (dbCreated) {
      await rollbackBotRecord(botId);
    }
    
    return { success: false, error: error.message };
  }
}
```

**Benefits:**
- Automatic cleanup on failure
- Consistent state
- No manual intervention needed

---

## 📊 Monitoring & Metrics

### Built-in Metrics

Temporal tracks automatically:
- **Workflow count** (running, completed, failed)
- **Activity count** (pending, completed, failed)
- **Latency** (P50, P95, P99)
- **Task queue length**

**Access:** Web UI → Metrics tab

### Custom Metrics (Optional)

```typescript
// In activity
export async function myActivity(input: any) {
  const startTime = Date.now();
  
  try {
    const result = await doWork(input);
    
    // Log success
    telemetry.track('activity_success', {
      duration: Date.now() - startTime,
      input: input.type,
    });
    
    return result;
  } catch (error) {
    // Log failure
    telemetry.track('activity_failure', {
      duration: Date.now() - startTime,
      error: error.message,
    });
    
    throw error;
  }
}
```

---

## 💰 Cost Optimization

### 1. Local Development (Free!)

```bash
# Run Temporal locally
./scripts/setup-temporal-local.sh

# No cloud costs
# Perfect for dev/testing
```

### 2. Cloud (Pay-as-you-go)

**Pricing:**
- Free tier: 1M actions/month
- After: $25 per 1M actions

**What's an action?**
- Start workflow: 1 action
- Activity execution: 1 action
- Signal: 1 action
- Query: 1 action (free!)

**Example (1000 bot deployments/month):**
```
1000 workflows × 10 activities each = 10,000 actions
Cost: $0.25/month 💰
```

### 3. Batch Operations

```typescript
// BAD: Start 100 workflows
for (let i = 0; i < 100; i++) {
  await temporal.startWorkflow('process', { item: i });
}
// Cost: 100 actions

// GOOD: One workflow, process batch
await temporal.startWorkflow('processBatch', {
  items: Array.from({length: 100}, (_, i) => i)
});
// Cost: 1 action + 1 activity = 2 actions
// Savings: 98 actions = 98% cheaper! 💰
```

---

## 🛡️ Best Practices

### 1. Idempotent Activities

**Activities should be safe to retry:**
```typescript
// BAD
export async function sendEmail(to: string, subject: string) {
  await emailAPI.send(to, subject);
  // If this fails after sending, retry will send duplicate!
}

// GOOD
export async function sendEmail(to: string, subject: string, idempotencyKey: string) {
  await emailAPI.send(to, subject, { idempotencyKey });
  // Email API deduplicates by key
}
```

### 2. Timeouts

```typescript
// Always set timeouts!
const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes', // Activity must complete in 5 min
  scheduleToCloseTimeout: '10 minutes', // Total time including retries
  scheduleToStartTimeout: '1 minute', // Max time waiting in queue
});
```

### 3. Deterministic Workflows

**Workflows must be deterministic (no randomness):**
```typescript
// BAD
export async function myWorkflow() {
  const random = Math.random(); // Non-deterministic!
  if (random > 0.5) {
    await activity1();
  }
}

// GOOD
export async function myWorkflow(seed: number) {
  const seededRandom = deterministicRandom(seed);
  if (seededRandom > 0.5) {
    await activity1();
  }
}
```

---

## 🐛 Troubleshooting

### "Worker not connecting"

**Check 1: Server running**
```bash
curl http://localhost:8233
# Should return HTML (Web UI)

docker ps | grep temporal
# Should show running container
```

**Check 2: Address correct**
```bash
grep TEMPORAL_ADDRESS .env
# Should match server (localhost:7233 or cloud URL)
```

**Check 3: Restart worker**
```bash
# Kill existing worker
pkill -f "tsx.*worker.ts"

# Start fresh
npx tsx src/workflows/worker.ts
```

---

### "Workflow not starting"

**Check 1: Worker running**
```bash
ps aux | grep worker
# Should show running worker process
```

**Check 2: Task queue matches**
```typescript
// In client
taskQueue: 'opencell-tasks'

// In worker
taskQueue: process.env.TEMPORAL_TASK_QUEUE || 'opencell-tasks'

// Must match!
```

**Check 3: Check Web UI**
- Go to http://localhost:8233
- Workflows tab
- Search for your workflow ID
- Check status/error

---

### "Activity timeout"

**Increase timeout:**
```typescript
const { myActivity } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes', // Was: 5 minutes
});
```

**Or make activity faster:**
```typescript
export async function myActivity(input: any) {
  // Add caching
  const cached = await cache.get(input.key);
  if (cached) return cached;
  
  // Do expensive work
  const result = await expensiveOperation(input);
  
  // Cache result
  await cache.set(input.key, result, 3600);
  
  return result;
}
```

---

## 📈 ROI Calculation

### Before Temporal (manual workflows)

**Problem:**
- Bot deployment: 10 steps, manual
- Failure at step 7 → Manual rollback (1 hour)
- No retry logic → Manual re-run
- No history → Hard to debug
- Happens 50 times/year

**Cost:**
```
50 failures × 1 hour each = 50 hours/year
50 hours × $100/hour = $5,000/year
```

### After Temporal

**Solution:**
- Automatic retry (no manual intervention)
- Automatic rollback (saga pattern)
- Full history (easy debugging)
- Visual UI (faster troubleshooting)

**Savings:**
```
90% fewer manual interventions = 45 hours saved
45 hours × $100/hour = $4,500/year

Faster debugging = 2 hours/month = 24 hours/year
24 hours × $100/hour = $2,400/year

Fewer errors = Better reliability = Happier users
Estimated value: $5,000/year

Total: $11,900/year ≈ $12,000/year 💰
```

**Cloud cost:** $25/month = $300/year  
**Net ROI:** $12,000 - $300 = **$11,700/year** 🎉

---

## 🎯 Next Steps

### Week 1: Setup & Test
1. ✅ Start Temporal locally
2. ✅ Start worker
3. ✅ Run test workflow
4. ✅ Check Web UI

### Week 2: Production Workflows
1. Deploy first real workflow
2. Monitor execution
3. Handle failures
4. Measure reliability improvement

### Week 3: Scale Up
1. Deploy to cloud (if needed)
2. Add more workflows
3. Optimize for cost
4. Set up alerts

---

## 📚 Resources

- [Temporal Docs](https://docs.temporal.io)
- [Node.js SDK](https://docs.temporal.io/dev-guide/sdks/typescript)
- [Workflow Patterns](https://docs.temporal.io/encyclopedia/workflow-patterns)
- [Best Practices](https://docs.temporal.io/best-practices)

---

**Congratulations!** You now have:
- 🧠 Infinite memory (Pinecone)
- ⚙️ Durable workflows (Temporal)
- 📊 Complete observability (Langfuse)
- 🔄 24/7 automation (n8n)
- 💰 Cost optimization (Redis)
- 🗄️ Scalable backend (Supabase)

**Total ROI:** $37,400/year! 🎉💰🚀

---

**Questions?** Check `DOCS_INDEX.md` or open an issue.
