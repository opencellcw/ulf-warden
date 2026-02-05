/**
 * Queue System Examples
 *
 * Shows how to use the BullMQ-based queue system
 */

import {
  queueManager,
  QueueConfig,
  JobPriority,
  JobData,
  JobResult,
} from '../src/core/queue';
import {
  QueueName,
  queueService,
  queueWorkflow,
  queueToolExecution,
  queueLLMRequest,
  queueNotification,
  scheduleRecurringJob,
} from '../src/core/queue-types';
import { Job } from 'bullmq';

// ===== Example 1: Simple Queue =====

async function simpleQueueExample() {
  console.log('=== Example 1: Simple Queue ===\n');

  // Create a queue
  const queue = queueManager.getQueue({
    name: 'simple_queue',
  });

  // Register a processor
  queueManager.registerProcessor('simple_queue', async (job: Job<JobData>) => {
    console.log(`Processing job ${job.id}: ${job.data.type}`);

    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 100));

    return {
      success: true,
      data: { result: 'Job completed!' },
      duration: 100,
    };
  });

  // Start worker
  const worker = queueManager.startWorker({
    name: 'simple_queue',
    workerConcurrency: 2,
  });

  // Add jobs
  await queueManager.addJob('simple_queue', {
    type: 'process_data',
    payload: { data: [1, 2, 3] },
  });

  // Wait and cleanup
  await new Promise((resolve) => setTimeout(resolve, 500));
  await worker.close();
  await queueManager.close('simple_queue');

  console.log('Simple queue example complete!\n');
}

// ===== Example 2: Priority Queue =====

async function priorityQueueExample() {
  console.log('=== Example 2: Priority Queue ===\n');

  const queue = queueManager.getQueue({
    name: 'priority_queue',
  });

  queueManager.registerProcessor('priority_queue', async (job: Job<JobData>) => {
    console.log(`[Priority ${job.opts.priority}] Processing: ${job.data.type}`);
    await new Promise((resolve) => setTimeout(resolve, 50));

    return {
      success: true,
      data: {},
      duration: 50,
    };
  });

  const worker = queueManager.startWorker({
    name: 'priority_queue',
    workerConcurrency: 1,
  });

  // Add jobs with different priorities
  await queueManager.addJob(
    'priority_queue',
    { type: 'low_priority_task', payload: {} },
    { priority: JobPriority.LOW }
  );

  await queueManager.addJob(
    'priority_queue',
    { type: 'critical_task', payload: {} },
    { priority: JobPriority.CRITICAL }
  );

  await queueManager.addJob(
    'priority_queue',
    { type: 'normal_task', payload: {} },
    { priority: JobPriority.NORMAL }
  );

  await new Promise((resolve) => setTimeout(resolve, 500));
  await worker.close();
  await queueManager.close('priority_queue');

  console.log('Priority queue example complete!\n');
}

// ===== Example 3: Delayed Jobs =====

async function delayedJobsExample() {
  console.log('=== Example 3: Delayed Jobs ===\n');

  const queue = queueManager.getQueue({
    name: 'delayed_queue',
  });

  queueManager.registerProcessor('delayed_queue', async (job: Job<JobData>) => {
    console.log(`Processing delayed job: ${job.data.type} at ${new Date().toISOString()}`);

    return {
      success: true,
      data: {},
      duration: 0,
    };
  });

  const worker = queueManager.startWorker({
    name: 'delayed_queue',
  });

  // Add job with 2 second delay
  await queueManager.addJob(
    'delayed_queue',
    {
      type: 'delayed_notification',
      payload: { message: 'This will be sent in 2 seconds' },
    },
    {
      schedule: {
        delay: 2000, // 2 seconds
      },
    }
  );

  console.log(`Job scheduled for ${new Date(Date.now() + 2000).toISOString()}`);

  await new Promise((resolve) => setTimeout(resolve, 3000));
  await worker.close();
  await queueManager.close('delayed_queue');

  console.log('Delayed jobs example complete!\n');
}

// ===== Example 4: Recurring Jobs (Cron) =====

async function recurringJobsExample() {
  console.log('=== Example 4: Recurring Jobs ===\n');

  const queue = queueManager.getQueue({
    name: 'recurring_queue',
  });

  queueManager.registerProcessor('recurring_queue', async (job: Job<JobData>) => {
    console.log(`Running recurring job at ${new Date().toISOString()}`);

    return {
      success: true,
      data: {},
      duration: 0,
    };
  });

  const worker = queueManager.startWorker({
    name: 'recurring_queue',
  });

  // Schedule job to run every 5 seconds
  await scheduleRecurringJob(
    QueueName.NOTIFICATIONS as any,
    {
      type: 'daily_report',
      payload: {},
    },
    '*/5 * * * * *' // Every 5 seconds (cron format)
  );

  console.log('Recurring job scheduled (every 5 seconds)');
  console.log('Waiting 15 seconds to see it run...');

  await new Promise((resolve) => setTimeout(resolve, 15000));
  await worker.close();
  await queueManager.close('recurring_queue');

  console.log('Recurring jobs example complete!\n');
}

// ===== Example 5: Queue Monitoring =====

async function monitoringExample() {
  console.log('=== Example 5: Queue Monitoring ===\n');

  const queue = queueManager.getQueue({
    name: 'monitor_queue',
  });

  queueManager.registerProcessor('monitor_queue', async (job: Job<JobData>) => {
    // Simulate random success/failure
    if (Math.random() > 0.7) {
      throw new Error('Simulated failure');
    }

    return {
      success: true,
      data: {},
      duration: 50,
    };
  });

  const worker = queueManager.startWorker({
    name: 'monitor_queue',
  });

  // Add multiple jobs
  for (let i = 0; i < 10; i++) {
    await queueManager.addJob('monitor_queue', {
      type: `job_${i}`,
      payload: {},
    });
  }

  // Wait for processing
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Get metrics
  const metrics = await queueManager.getQueueMetrics('monitor_queue');

  console.log('Queue Metrics:');
  console.log(`  Waiting: ${metrics.waiting}`);
  console.log(`  Active: ${metrics.active}`);
  console.log(`  Completed: ${metrics.completed}`);
  console.log(`  Failed: ${metrics.failed}`);
  console.log(`  Total: ${metrics.total}`);

  await worker.close();
  await queueManager.close('monitor_queue');

  console.log('\nMonitoring example complete!\n');
}

// ===== Example 6: Helper Functions =====

async function helperFunctionsExample() {
  console.log('=== Example 6: Helper Functions ===\n');

  // Initialize queue service (starts all predefined queues)
  // await queueService.initialize();

  // Queue a workflow
  const workflowJobId = await queueWorkflow(
    'user_onboarding',
    { userId: 'user123', email: 'user@example.com' },
    { priority: JobPriority.HIGH }
  );
  console.log(`Queued workflow: ${workflowJobId}`);

  // Queue tool execution
  const toolJobId = await queueToolExecution(
    'send_email',
    { to: 'user@example.com', subject: 'Welcome!' },
    { priority: JobPriority.NORMAL }
  );
  console.log(`Queued tool execution: ${toolJobId}`);

  // Queue LLM request
  const llmJobId = await queueLLMRequest(
    'gpt-4',
    'What is the meaning of life?',
    { priority: JobPriority.HIGH }
  );
  console.log(`Queued LLM request: ${llmJobId}`);

  // Queue notification
  const notificationJobId = await queueNotification(
    'user123',
    'Your task is complete!',
    { priority: JobPriority.NORMAL, channel: 'email' }
  );
  console.log(`Queued notification: ${notificationJobId}`);

  // Get job status
  await new Promise((resolve) => setTimeout(resolve, 500));

  const workflowStatus = await queueManager.getJobStatus(QueueName.WORKFLOW, workflowJobId);
  console.log(`\nWorkflow job status: ${workflowStatus?.state}`);

  // Cleanup
  // await queueService.shutdown();

  console.log('\nHelper functions example complete!\n');
}

// ===== Example 7: Error Handling and Retries =====

async function errorHandlingExample() {
  console.log('=== Example 7: Error Handling and Retries ===\n');

  const queue = queueManager.getQueue({
    name: 'retry_queue',
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    },
  });

  let attemptCount = 0;

  queueManager.registerProcessor('retry_queue', async (job: Job<JobData>) => {
    attemptCount++;
    console.log(`Attempt ${attemptCount} for job ${job.id}`);

    // Fail first 2 attempts
    if (attemptCount < 3) {
      throw new Error('Simulated failure');
    }

    console.log('Job succeeded!');

    return {
      success: true,
      data: { attempts: attemptCount },
      duration: 0,
    };
  });

  const worker = queueManager.startWorker({
    name: 'retry_queue',
  });

  await queueManager.addJob('retry_queue', {
    type: 'flaky_job',
    payload: {},
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));
  await worker.close();
  await queueManager.close('retry_queue');

  console.log('\nError handling example complete!\n');
}

// ===== Run All Examples =====

async function runAllExamples() {
  try {
    await simpleQueueExample();
    await priorityQueueExample();
    await delayedJobsExample();
    // await recurringJobsExample(); // Skip - takes 15 seconds
    await monitoringExample();
    await helperFunctionsExample();
    await errorHandlingExample();

    console.log('All examples completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples();
}

/**
 * Integration with Express:
 *
 * import express from 'express';
 * import { queueManager, JobPriority } from './queue';
 *
 * const app = express();
 *
 * // Add job endpoint
 * app.post('/api/jobs', async (req, res) => {
 *   const job = await queueManager.addJob('my_queue', {
 *     type: 'process_request',
 *     payload: req.body,
 *     userId: req.userId,
 *   }, {
 *     priority: JobPriority.NORMAL
 *   });
 *
 *   res.json({ jobId: job.id, status: 'queued' });
 * });
 *
 * // Get job status endpoint
 * app.get('/api/jobs/:jobId', async (req, res) => {
 *   const status = await queueManager.getJobStatus('my_queue', req.params.jobId);
 *   res.json(status);
 * });
 *
 * // Queue metrics endpoint
 * app.get('/api/queue/metrics', async (req, res) => {
 *   const metrics = await queueManager.getQueueMetrics('my_queue');
 *   res.json(metrics);
 * });
 */
