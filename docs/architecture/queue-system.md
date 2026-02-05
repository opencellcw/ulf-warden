# Queue System with BullMQ

Comprehensive job queue system for async task processing, scheduling, and workflow orchestration.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Features](#features)
- [Queue Types](#queue-types)
- [Job Priorities](#job-priorities)
- [Job Scheduling](#job-scheduling)
- [Retry Logic](#retry-logic)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## Overview

The queue system is built on **BullMQ**, a modern Redis-based queue library with:

- **Job queues** with priorities and scheduling
- **Worker pools** with concurrency control
- **Retry logic** with exponential backoff
- **Dead letter queue** for failed jobs
- **Rate limiting** per queue
- **Job events** for monitoring
- **Cron-based scheduling**
- **Integration with Prometheus metrics**

## Quick Start

### 1. Basic Queue Usage

```typescript
import { queueManager, JobPriority } from './src/core/queue';
import { Job } from 'bullmq';

// Create a queue
const queue = queueManager.getQueue({
  name: 'my_queue',
  workerConcurrency: 5,
});

// Register a processor
queueManager.registerProcessor('my_queue', async (job: Job) => {
  console.log(`Processing job ${job.id}`);

  // Do work
  const result = await processData(job.data.payload);

  return {
    success: true,
    data: result,
    duration: Date.now() - job.timestamp,
  };
});

// Start worker
const worker = queueManager.startWorker({
  name: 'my_queue',
  workerConcurrency: 5,
});

// Add job
const job = await queueManager.addJob('my_queue', {
  type: 'process_data',
  payload: { data: [1, 2, 3] },
  userId: 'user123',
});

console.log(`Job queued: ${job.id}`);
```

### 2. Using Predefined Queues

```typescript
import {
  queueService,
  queueWorkflow,
  queueLLMRequest,
  queueNotification,
} from './src/core/queue-types';

// Initialize all predefined queues
await queueService.initialize();

// Queue a workflow
const jobId = await queueWorkflow(
  'user_onboarding',
  { userId: 'user123' },
  { priority: JobPriority.HIGH }
);

// Queue an LLM request
await queueLLMRequest(
  'gpt-4',
  'Summarize this document...',
  { priority: JobPriority.HIGH }
);

// Queue a notification
await queueNotification(
  'user123',
  'Your workflow is complete!',
  { channel: 'email' }
);

// Shutdown when done
await queueService.shutdown();
```

## Features

### Job Priorities

Five priority levels for job ordering:

```typescript
export enum JobPriority {
  CRITICAL = 1,  // Urgent, process immediately
  HIGH = 2,      // Important, process soon
  NORMAL = 3,    // Default priority
  LOW = 4,       // Can wait
  BACKGROUND = 5, // Process when idle
}

// Add job with priority
await queueManager.addJob(
  'my_queue',
  { type: 'urgent_task', payload: {} },
  { priority: JobPriority.CRITICAL }
);
```

### Job Scheduling

#### Delayed Jobs

```typescript
// Run in 5 minutes
await queueManager.addJob(
  'notifications',
  { type: 'reminder', payload: { message: '...' } },
  {
    schedule: {
      delay: 5 * 60 * 1000, // 5 minutes in ms
    },
  }
);
```

#### Recurring Jobs (Cron)

```typescript
import { scheduleRecurringJob, QueueName } from './queue-types';

// Run every day at 9 AM
await scheduleRecurringJob(
  QueueName.EMAIL,
  {
    type: 'daily_digest',
    payload: {},
  },
  '0 9 * * *' // Cron format
);

// Run every 5 minutes
await scheduleRecurringJob(
  QueueName.CACHE_WARMUP,
  {
    type: 'warmup_cache',
    payload: {},
  },
  '*/5 * * * *'
);
```

### Retry Logic

Automatic retry with exponential backoff:

```typescript
const queue = queueManager.getQueue({
  name: 'my_queue',
  defaultJobOptions: {
    attempts: 5, // Retry up to 5 times
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second
    },
  },
});

// Backoff delays: 1s, 2s, 4s, 8s, 16s
```

Custom retry logic:

```typescript
queueManager.registerProcessor('my_queue', async (job) => {
  try {
    const result = await riskyOperation();
    return { success: true, data: result, duration: 0 };
  } catch (error) {
    // Decide whether to retry
    if (error.code === 'RATE_LIMIT') {
      // Retry with longer delay
      throw new Error('Rate limited, retry later');
    } else if (error.code === 'PERMANENT_ERROR') {
      // Don't retry, mark as failed
      return { success: false, error: error.message, duration: 0 };
    } else {
      // Normal retry
      throw error;
    }
  }
});
```

### Rate Limiting

Limit job processing rate per queue:

```typescript
const queue = queueManager.getQueue({
  name: 'api_calls',
  workerConcurrency: 5,
  rateLimiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // Per second
  },
});
```

### Concurrency Control

Control how many jobs run simultaneously:

```typescript
// Process 10 jobs at once
const worker = queueManager.startWorker({
  name: 'my_queue',
  workerConcurrency: 10,
});
```

## Queue Types

Predefined queues for common use cases:

| Queue Name | Concurrency | Use Case | Rate Limit |
|------------|-------------|----------|------------|
| `WORKFLOW` | 5 | Workflow execution | None |
| `TOOL_EXECUTION` | 10 | Tool calls | 100/sec |
| `LLM_REQUESTS` | 3 | LLM API calls | 10/sec |
| `NOTIFICATIONS` | 20 | User notifications | None |
| `WEBHOOKS` | 10 | Webhook calls | None |
| `EMAIL` | 5 | Email sending | None |
| `DATA_PROCESSING` | 3 | Heavy processing | None |
| `CACHE_WARMUP` | 2 | Cache warming | None |
| `DEAD_LETTER` | 1 | Failed jobs | None |

### Usage

```typescript
import { QueueName, queueService } from './queue-types';

// Initialize all queues
await queueService.initialize();

// Add job to specific queue
await queueManager.addJob(QueueName.LLM_REQUESTS, {
  type: 'gpt4_request',
  payload: { prompt: '...' },
});
```

## Monitoring

### Queue Metrics

```typescript
const metrics = await queueManager.getQueueMetrics('my_queue');

console.log(metrics);
// {
//   queueName: 'my_queue',
//   waiting: 10,     // Jobs waiting to be processed
//   active: 5,       // Jobs currently processing
//   completed: 100,  // Total completed
//   failed: 2,       // Total failed
//   delayed: 3,      // Scheduled for later
//   paused: 0,       // Queue paused?
//   total: 18        // Total pending (waiting + active + delayed)
// }
```

### Job Status

```typescript
const status = await queueManager.getJobStatus('my_queue', jobId);

console.log(status);
// {
//   id: '123',
//   name: 'process_data',
//   data: { ... },
//   state: 'completed', // waiting, active, completed, failed, delayed
//   progress: 100,
//   attemptsMade: 1,
//   processedOn: 1234567890,
//   finishedOn: 1234567890,
//   returnvalue: { success: true, ... },
//   failedReason: null
// }
```

### Prometheus Integration

Metrics are automatically exported:

- `opencell_tool_execution_total{tool_name="queue_my_queue", status="success"}`
- `opencell_tool_execution_total{tool_name="queue_my_queue", status="error"}`
- `opencell_tool_error_total{tool_name="queue_my_queue", error_type="timeout"}`

## Queue Operations

### Pause/Resume

```typescript
// Pause queue (stop processing new jobs)
await queueManager.pauseQueue('my_queue');

// Resume queue
await queueManager.resumeQueue('my_queue');
```

### Drain Queue

```typescript
// Remove all waiting jobs
await queueManager.drainQueue('my_queue');
```

### Clean Old Jobs

```typescript
// Remove completed jobs older than 1 hour
await queueManager.cleanQueue(
  'my_queue',
  3600000, // 1 hour in ms
  1000     // Max jobs to clean
);
```

### Retry Failed Jobs

```typescript
// Retry all failed jobs
const retried = await queueManager.retryFailedJobs('my_queue');
console.log(`Retried ${retried} failed jobs`);
```

### Remove Job

```typescript
// Remove specific job
await queueManager.removeJob('my_queue', jobId);
```

## Best Practices

### 1. Idempotent Processors

Make job processors idempotent (safe to run multiple times):

```typescript
queueManager.registerProcessor('my_queue', async (job) => {
  // Check if already processed
  const existing = await db.findById(job.data.payload.id);
  if (existing && existing.processed) {
    return { success: true, data: existing, duration: 0 };
  }

  // Process
  const result = await processData(job.data.payload);

  // Mark as processed
  await db.update(job.data.payload.id, { processed: true });

  return { success: true, data: result, duration: 0 };
});
```

### 2. Job Data Size

Keep job data small (<100KB):

```typescript
// ❌ Bad - large data in job
await queueManager.addJob('my_queue', {
  type: 'process',
  payload: {
    largeDataset: [...1000000 items...], // Too large!
  },
});

// ✅ Good - reference to data
await queueManager.addJob('my_queue', {
  type: 'process',
  payload: {
    datasetId: 'dataset_123', // Small reference
  },
});

// Processor fetches data
queueManager.registerProcessor('my_queue', async (job) => {
  const dataset = await db.getDataset(job.data.payload.datasetId);
  // Process dataset...
});
```

### 3. Error Handling

Return structured errors:

```typescript
queueManager.registerProcessor('my_queue', async (job) => {
  try {
    const result = await processJob(job);

    return {
      success: true,
      data: result,
      duration: Date.now() - job.timestamp,
    };
  } catch (error) {
    // Log error
    log.error('[Queue] Job failed', {
      jobId: job.id,
      error: error.message,
    });

    // Return structured error (don't throw if you want to mark as complete)
    return {
      success: false,
      error: error.message,
      duration: Date.now() - job.timestamp,
    };

    // Or throw to trigger retry
    // throw error;
  }
});
```

### 4. Progress Updates

Report progress for long-running jobs:

```typescript
queueManager.registerProcessor('my_queue', async (job) => {
  const total = job.data.payload.items.length;

  for (let i = 0; i < total; i++) {
    await processItem(job.data.payload.items[i]);

    // Update progress
    await job.updateProgress((i + 1) / total * 100);
  }

  return { success: true, data: {}, duration: 0 };
});
```

### 5. Job Naming

Use descriptive job types:

```typescript
// ❌ Bad
await queueManager.addJob('my_queue', {
  type: 'job1',
  payload: {},
});

// ✅ Good
await queueManager.addJob('my_queue', {
  type: 'send_welcome_email',
  payload: { userId: '123' },
});
```

### 6. Queue Cleanup

Clean up old completed jobs regularly:

```typescript
// Run cleanup every hour
setInterval(async () => {
  await queueManager.cleanQueue(
    'my_queue',
    3600000, // Remove jobs older than 1 hour
    1000     // Max 1000 jobs per cleanup
  );
}, 3600000);
```

### 7. Monitor Queue Depth

Alert on queue backup:

```typescript
setInterval(async () => {
  const metrics = await queueManager.getQueueMetrics('my_queue');

  if (metrics.waiting > 1000) {
    alert('Queue backup detected!', { waiting: metrics.waiting });
  }

  if (metrics.failed > 100) {
    alert('High failure rate!', { failed: metrics.failed });
  }
}, 60000); // Check every minute
```

## Troubleshooting

### Jobs Not Processing

1. **Check worker is started**:
   ```typescript
   queueManager.startWorker({ name: 'my_queue' });
   ```

2. **Check Redis connection**:
   ```bash
   redis-cli ping
   ```

3. **Check queue is not paused**:
   ```typescript
   const metrics = await queueManager.getQueueMetrics('my_queue');
   console.log('Paused:', metrics.paused);
   ```

### High Failure Rate

1. **Check processor errors**:
   ```typescript
   const metrics = await queueManager.getQueueMetrics('my_queue');
   console.log('Failed:', metrics.failed);
   ```

2. **Retry failed jobs**:
   ```typescript
   await queueManager.retryFailedJobs('my_queue');
   ```

3. **Check dead letter queue**:
   ```typescript
   const dlqMetrics = await queueManager.getQueueMetrics(QueueName.DEAD_LETTER);
   ```

### Memory Issues

1. **Reduce job data size**
2. **Clean old jobs more frequently**
3. **Reduce `removeOnComplete` and `removeOnFail` options**
4. **Increase worker concurrency to process faster**

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Redis Documentation](https://redis.io/docs/)
- [Cron Expression Guide](https://crontab.guru/)

