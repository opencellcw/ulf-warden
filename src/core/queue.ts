/**
 * Queue System with BullMQ
 *
 * Features:
 * - Job queues with priorities
 * - Job scheduling (delayed, cron)
 * - Retry logic with exponential backoff
 * - Dead letter queue
 * - Job events and monitoring
 * - Rate limiting
 * - Concurrency control
 * - Integration with workflows
 */

import { Queue, Worker, Job, QueueEvents, JobsOptions, Processor } from 'bullmq';
import { Redis } from 'ioredis';
import { log } from '../logger';
import { prometheusMetrics } from './prometheus-metrics';

// ===== Types =====

export interface QueueConfig {
  name: string;
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  defaultJobOptions?: JobsOptions;
  workerConcurrency?: number;
  rateLimiter?: {
    max: number;
    duration: number;
  };
}

export interface JobData<T = any> {
  type: string;
  payload: T;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface JobResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  duration: number;
}

export enum JobPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4,
  BACKGROUND = 5,
}

export interface ScheduleOptions {
  delay?: number; // Delay in ms
  repeat?: {
    pattern?: string; // Cron pattern
    every?: number; // Repeat every N ms
    limit?: number; // Max repetitions
  };
}

// ===== Queue Manager =====

export class QueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private processors: Map<string, Processor> = new Map();
  private redisConnection: Redis | null = null;

  /**
   * Create or get a queue
   */
  getQueue(config: QueueConfig): Queue {
    if (this.queues.has(config.name)) {
      return this.queues.get(config.name)!;
    }

    // Create Redis connection
    const connection = config.redis
      ? new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db || 0,
          maxRetriesPerRequest: null, // Required for BullMQ
        })
      : this.getDefaultRedisConnection();

    // Create queue with default options
    const queue = new Queue(config.name, {
      connection,
      defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 500, // Keep last 500 failed jobs
        attempts: 3, // Retry 3 times
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        ...config.defaultJobOptions,
      },
    });

    this.queues.set(config.name, queue);

    // Setup queue events
    this.setupQueueEvents(config.name, connection);

    log.info('[Queue] Queue created', {
      name: config.name,
      concurrency: config.workerConcurrency,
    });

    return queue;
  }

  /**
   * Register a job processor
   */
  registerProcessor<T = any, R = any>(
    queueName: string,
    processor: (job: Job<JobData<T>>) => Promise<JobResult<R>>
  ): void {
    this.processors.set(queueName, processor as Processor);
    log.info('[Queue] Processor registered', { queueName });
  }

  /**
   * Start worker for a queue
   */
  startWorker(config: QueueConfig): Worker {
    if (this.workers.has(config.name)) {
      log.warn('[Queue] Worker already started', { name: config.name });
      return this.workers.get(config.name)!;
    }

    const processor = this.processors.get(config.name);
    if (!processor) {
      throw new Error(`No processor registered for queue: ${config.name}`);
    }

    const connection = config.redis
      ? new Redis({
          host: config.redis.host,
          port: config.redis.port,
          password: config.redis.password,
          db: config.redis.db || 0,
          maxRetriesPerRequest: null,
        })
      : this.getDefaultRedisConnection();

    const worker = new Worker(config.name, processor, {
      connection,
      concurrency: config.workerConcurrency || 5,
      limiter: config.rateLimiter,
    });

    // Worker event handlers
    worker.on('completed', (job) => {
      log.info('[Queue] Job completed', {
        queueName: config.name,
        jobId: job.id,
        duration: Date.now() - job.timestamp,
      });

      // Record metrics
      prometheusMetrics.toolExecutionTotal.inc({
        tool_name: `queue_${config.name}`,
        status: 'success',
      });
    });

    worker.on('failed', (job, error) => {
      log.error('[Queue] Job failed', {
        queueName: config.name,
        jobId: job?.id,
        error: error.message,
        attempts: job?.attemptsMade,
      });

      // Record metrics
      prometheusMetrics.toolExecutionTotal.inc({
        tool_name: `queue_${config.name}`,
        status: 'error',
      });

      prometheusMetrics.toolErrorTotal.inc({
        tool_name: `queue_${config.name}`,
        error_type: error.name || 'unknown',
      });
    });

    worker.on('error', (error) => {
      log.error('[Queue] Worker error', {
        queueName: config.name,
        error: error.message,
      });
    });

    this.workers.set(config.name, worker);

    log.info('[Queue] Worker started', {
      name: config.name,
      concurrency: config.workerConcurrency || 5,
    });

    return worker;
  }

  /**
   * Add a job to the queue
   */
  async addJob<T = any>(
    queueName: string,
    jobData: JobData<T>,
    options?: {
      priority?: JobPriority;
      schedule?: ScheduleOptions;
      jobId?: string;
    }
  ): Promise<Job> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const jobOptions: JobsOptions = {
      priority: options?.priority || JobPriority.NORMAL,
      jobId: options?.jobId,
    };

    // Handle scheduling
    if (options?.schedule) {
      if (options.schedule.delay) {
        jobOptions.delay = options.schedule.delay;
      }

      if (options.schedule.repeat) {
        jobOptions.repeat = options.schedule.repeat;
      }
    }

    const job = await queue.add(jobData.type, jobData, jobOptions);

    log.info('[Queue] Job added', {
      queueName,
      jobId: job.id,
      type: jobData.type,
      priority: options?.priority,
      scheduled: !!options?.schedule,
    });

    return job;
  }

  /**
   * Remove a job from the queue
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      log.info('[Queue] Job removed', { queueName, jobId });
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      state,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const [
      waiting,
      active,
      completed,
      failed,
      delayed,
    ] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    // Check if paused
    const isPaused = await queue.isPaused();

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused ? 1 : 0,
      total: waiting + active + delayed,
    };
  }

  /**
   * Retry all failed jobs
   */
  async retryFailedJobs(queueName: string): Promise<number> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const failedJobs = await queue.getFailed();
    let retried = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retried++;
      } catch (error) {
        log.error('[Queue] Failed to retry job', {
          queueName,
          jobId: job.id,
          error,
        });
      }
    }

    log.info('[Queue] Retried failed jobs', { queueName, retried });
    return retried;
  }

  /**
   * Clean old jobs
   */
  async cleanQueue(
    queueName: string,
    grace: number = 3600000, // 1 hour
    limit: number = 1000
  ): Promise<string[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    const cleaned = await queue.clean(grace, limit, 'completed');
    log.info('[Queue] Queue cleaned', { queueName, cleaned: cleaned.length });

    return cleaned;
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.pause();
    log.info('[Queue] Queue paused', { queueName });
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.resume();
    log.info('[Queue] Queue resumed', { queueName });
  }

  /**
   * Drain queue (remove all waiting jobs)
   */
  async drainQueue(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue not found: ${queueName}`);
    }

    await queue.drain();
    log.info('[Queue] Queue drained', { queueName });
  }

  /**
   * Close queue and worker
   */
  async close(queueName: string): Promise<void> {
    const queue = this.queues.get(queueName);
    const worker = this.workers.get(queueName);
    const events = this.queueEvents.get(queueName);

    if (worker) {
      await worker.close();
      this.workers.delete(queueName);
    }

    if (events) {
      await events.close();
      this.queueEvents.delete(queueName);
    }

    if (queue) {
      await queue.close();
      this.queues.delete(queueName);
    }

    log.info('[Queue] Closed', { queueName });
  }

  /**
   * Close all queues and workers
   */
  async closeAll(): Promise<void> {
    const queueNames = Array.from(this.queues.keys());

    await Promise.all(queueNames.map((name) => this.close(name)));

    if (this.redisConnection) {
      await this.redisConnection.quit();
      this.redisConnection = null;
    }

    log.info('[Queue] All queues closed');
  }

  /**
   * Setup queue events for monitoring
   */
  private setupQueueEvents(queueName: string, connection: Redis): void {
    const queueEvents = new QueueEvents(queueName, { connection });

    queueEvents.on('waiting', ({ jobId }) => {
      log.debug('[Queue] Job waiting', { queueName, jobId });
    });

    queueEvents.on('active', ({ jobId }) => {
      log.debug('[Queue] Job active', { queueName, jobId });
    });

    queueEvents.on('progress', ({ jobId, data }) => {
      log.debug('[Queue] Job progress', { queueName, jobId, progress: data });
    });

    this.queueEvents.set(queueName, queueEvents);
  }

  /**
   * Get default Redis connection
   */
  private getDefaultRedisConnection(): Redis {
    if (!this.redisConnection) {
      this.redisConnection = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
      });
    }

    return this.redisConnection;
  }
}

// Singleton instance
export const queueManager = new QueueManager();
