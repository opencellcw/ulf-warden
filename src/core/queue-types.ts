/**
 * Predefined Queue Types
 *
 * Common queue configurations for different use cases
 */

import { queueManager, QueueConfig, JobData, JobResult, JobPriority } from './queue';
import { Job } from 'bullmq';
import { log } from '../logger';

// ===== Queue Names =====

export enum QueueName {
  // Workflow execution queue
  WORKFLOW = 'workflow',

  // Tool execution queue
  TOOL_EXECUTION = 'tool_execution',

  // LLM requests queue
  LLM_REQUESTS = 'llm_requests',

  // Notifications queue
  NOTIFICATIONS = 'notifications',

  // Webhooks queue
  WEBHOOKS = 'webhooks',

  // Email queue
  EMAIL = 'email',

  // Data processing queue
  DATA_PROCESSING = 'data_processing',

  // Cache warmup queue
  CACHE_WARMUP = 'cache_warmup',

  // Dead letter queue
  DEAD_LETTER = 'dead_letter',
}

// ===== Queue Configurations =====

const QUEUE_CONFIGS: Record<QueueName, QueueConfig> = {
  [QueueName.WORKFLOW]: {
    name: QueueName.WORKFLOW,
    workerConcurrency: 5,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 100,
      removeOnFail: false, // Keep failed workflows for debugging
    },
  },

  [QueueName.TOOL_EXECUTION]: {
    name: QueueName.TOOL_EXECUTION,
    workerConcurrency: 10,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
    rateLimiter: {
      max: 100,
      duration: 1000, // 100 jobs per second
    },
  },

  [QueueName.LLM_REQUESTS]: {
    name: QueueName.LLM_REQUESTS,
    workerConcurrency: 3,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 100,
      removeOnFail: 100,
    },
    rateLimiter: {
      max: 10,
      duration: 1000, // 10 requests per second (API limits)
    },
  },

  [QueueName.NOTIFICATIONS]: {
    name: QueueName.NOTIFICATIONS,
    workerConcurrency: 20,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 500,
      },
      removeOnComplete: 10,
      removeOnFail: 100,
    },
  },

  [QueueName.WEBHOOKS]: {
    name: QueueName.WEBHOOKS,
    workerConcurrency: 10,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: 50,
      removeOnFail: 200,
    },
  },

  [QueueName.EMAIL]: {
    name: QueueName.EMAIL,
    workerConcurrency: 5,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: 'exponential',
        delay: 3000,
      },
      removeOnComplete: 20,
      removeOnFail: 100,
    },
  },

  [QueueName.DATA_PROCESSING]: {
    name: QueueName.DATA_PROCESSING,
    workerConcurrency: 3,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'fixed',
        delay: 10000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
    },
  },

  [QueueName.CACHE_WARMUP]: {
    name: QueueName.CACHE_WARMUP,
    workerConcurrency: 2,
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000,
      },
      removeOnComplete: 10,
      removeOnFail: 50,
    },
  },

  [QueueName.DEAD_LETTER]: {
    name: QueueName.DEAD_LETTER,
    workerConcurrency: 1,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false, // Keep all dead letters
      removeOnFail: false,
    },
  },
};

// ===== Queue Initializers =====

export class QueueService {
  private initialized = false;

  /**
   * Initialize all queues
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn('[QueueService] Already initialized');
      return;
    }

    // Create all queues
    for (const [queueName, config] of Object.entries(QUEUE_CONFIGS)) {
      queueManager.getQueue(config);
    }

    // Register processors
    this.registerProcessors();

    // Start workers
    this.startWorkers();

    this.initialized = true;
    log.info('[QueueService] Initialized', {
      queues: Object.keys(QUEUE_CONFIGS).length,
    });
  }

  /**
   * Register processors for each queue
   */
  private registerProcessors(): void {
    // Workflow processor
    queueManager.registerProcessor(
      QueueName.WORKFLOW,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Processing workflow job', {
            jobId: job.id,
            type: job.data.type,
          });

          // Workflow processing logic would go here
          // For now, just simulate
          await new Promise((resolve) => setTimeout(resolve, 100));

          return {
            success: true,
            data: { result: 'workflow completed' },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // Tool execution processor
    queueManager.registerProcessor(
      QueueName.TOOL_EXECUTION,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Processing tool execution job', {
            jobId: job.id,
            tool: job.data.type,
          });

          // Tool execution logic would go here
          await new Promise((resolve) => setTimeout(resolve, 50));

          return {
            success: true,
            data: { result: 'tool executed' },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // LLM requests processor
    queueManager.registerProcessor(
      QueueName.LLM_REQUESTS,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Processing LLM request', {
            jobId: job.id,
            model: job.data.payload?.model,
          });

          // LLM request logic would go here
          await new Promise((resolve) => setTimeout(resolve, 200));

          return {
            success: true,
            data: { response: 'LLM response' },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // Notifications processor
    queueManager.registerProcessor(
      QueueName.NOTIFICATIONS,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Sending notification', {
            jobId: job.id,
            userId: job.data.userId,
          });

          // Notification logic would go here
          await new Promise((resolve) => setTimeout(resolve, 30));

          return {
            success: true,
            data: { sent: true },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // Webhooks processor
    queueManager.registerProcessor(
      QueueName.WEBHOOKS,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Sending webhook', {
            jobId: job.id,
            url: job.data.payload?.url,
          });

          // Webhook logic would go here
          await new Promise((resolve) => setTimeout(resolve, 100));

          return {
            success: true,
            data: { sent: true },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // Email processor
    queueManager.registerProcessor(
      QueueName.EMAIL,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Sending email', {
            jobId: job.id,
            to: job.data.payload?.to,
          });

          // Email logic would go here
          await new Promise((resolve) => setTimeout(resolve, 50));

          return {
            success: true,
            data: { sent: true },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // Data processing processor
    queueManager.registerProcessor(
      QueueName.DATA_PROCESSING,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Processing data', {
            jobId: job.id,
          });

          // Data processing logic would go here
          await new Promise((resolve) => setTimeout(resolve, 100));

          return {
            success: true,
            data: { processed: true },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // Cache warmup processor
    queueManager.registerProcessor(
      QueueName.CACHE_WARMUP,
      async (job: Job<JobData>) => {
        const start = Date.now();

        try {
          log.info('[Queue] Warming up cache', {
            jobId: job.id,
          });

          // Cache warmup logic would go here
          await new Promise((resolve) => setTimeout(resolve, 50));

          return {
            success: true,
            data: { warmed: true },
            duration: Date.now() - start,
          };
        } catch (error: any) {
          return {
            success: false,
            error: error.message,
            duration: Date.now() - start,
          };
        }
      }
    );

    // Dead letter processor (just logs)
    queueManager.registerProcessor(
      QueueName.DEAD_LETTER,
      async (job: Job<JobData>) => {
        log.error('[Queue] Dead letter job', {
          jobId: job.id,
          originalQueue: job.data.metadata?.originalQueue,
          originalJobId: job.data.metadata?.originalJobId,
          error: job.data.metadata?.error,
        });

        return {
          success: true,
          data: { logged: true },
          duration: 0,
        };
      }
    );
  }

  /**
   * Start workers for all queues
   */
  private startWorkers(): void {
    for (const config of Object.values(QUEUE_CONFIGS)) {
      queueManager.startWorker(config);
    }
  }

  /**
   * Shutdown service
   */
  async shutdown(): Promise<void> {
    await queueManager.closeAll();
    this.initialized = false;
    log.info('[QueueService] Shutdown complete');
  }
}

// ===== Helper Functions =====

/**
 * Queue a workflow for execution
 */
export async function queueWorkflow(
  workflowName: string,
  data: any,
  options?: {
    priority?: JobPriority;
    userId?: string;
  }
): Promise<string> {
  const job = await queueManager.addJob(
    QueueName.WORKFLOW,
    {
      type: 'workflow_execution',
      payload: {
        workflowName,
        data,
      },
      userId: options?.userId,
    },
    {
      priority: options?.priority || JobPriority.NORMAL,
    }
  );

  return job.id!;
}

/**
 * Queue a tool execution
 */
export async function queueToolExecution(
  toolName: string,
  input: any,
  options?: {
    priority?: JobPriority;
    userId?: string;
  }
): Promise<string> {
  const job = await queueManager.addJob(
    QueueName.TOOL_EXECUTION,
    {
      type: toolName,
      payload: input,
      userId: options?.userId,
    },
    {
      priority: options?.priority || JobPriority.NORMAL,
    }
  );

  return job.id!;
}

/**
 * Queue an LLM request
 */
export async function queueLLMRequest(
  model: string,
  prompt: string,
  options?: {
    priority?: JobPriority;
    userId?: string;
  }
): Promise<string> {
  const job = await queueManager.addJob(
    QueueName.LLM_REQUESTS,
    {
      type: 'llm_request',
      payload: {
        model,
        prompt,
      },
      userId: options?.userId,
    },
    {
      priority: options?.priority || JobPriority.HIGH, // LLM requests default to high priority
    }
  );

  return job.id!;
}

/**
 * Send a notification
 */
export async function queueNotification(
  userId: string,
  message: string,
  options?: {
    priority?: JobPriority;
    channel?: string;
  }
): Promise<string> {
  const job = await queueManager.addJob(
    QueueName.NOTIFICATIONS,
    {
      type: 'notification',
      payload: {
        message,
        channel: options?.channel || 'default',
      },
      userId,
    },
    {
      priority: options?.priority || JobPriority.NORMAL,
    }
  );

  return job.id!;
}

/**
 * Schedule a recurring job
 */
export async function scheduleRecurringJob(
  queueName: QueueName,
  jobData: JobData,
  cronPattern: string
): Promise<string> {
  const job = await queueManager.addJob(queueName, jobData, {
    schedule: {
      repeat: {
        pattern: cronPattern,
      },
    },
    jobId: `recurring_${jobData.type}_${Date.now()}`, // Unique ID for recurring jobs
  });

  return job.id!;
}

// Singleton instance
export const queueService = new QueueService();
