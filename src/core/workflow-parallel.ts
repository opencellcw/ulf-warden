/**
 * Parallel Workflow Execution System
 *
 * Provides advanced parallel execution with worker pools and resource management
 */

import { log } from '../logger';
import { WorkflowContext } from './workflow-manager';

/**
 * Wait strategy for parallel execution
 */
export type WaitStrategy =
  | 'all'        // Wait for all steps to complete (fail if any fails)
  | 'any'        // Wait for any step to complete successfully
  | 'allSettled' // Wait for all steps to settle (don't fail on errors)
  | 'race';      // Return first completed (success or failure)

/**
 * Parallel execution group
 */
export interface ParallelGroup {
  id: string;
  steps: string[]; // Step IDs to execute in parallel
  waitStrategy?: WaitStrategy; // Default: 'all'
  maxConcurrent?: number; // Max concurrent steps (default: unlimited)
  continueOnError?: boolean; // Continue if some steps fail (default: false)
  timeout?: number; // Timeout for the entire group in ms
}

/**
 * Parallel execution result
 */
export interface ParallelExecutionResult {
  groupId: string;
  completedSteps: string[];
  failedSteps: string[];
  skippedSteps: string[];
  duration: number;
  success: boolean;
  results: Map<string, any>;
  errors: Map<string, Error>;
}

/**
 * Worker pool configuration
 */
export interface WorkerPoolConfig {
  maxConcurrent?: number; // Max concurrent workers (default: 10)
  queueSize?: number; // Max queue size (default: unlimited)
  timeout?: number; // Default timeout per task in ms
}

/**
 * Task for worker pool
 */
interface WorkerTask<T> {
  id: string;
  execute: () => Promise<T>;
  timeout?: number;
}

/**
 * Worker Pool
 *
 * Manages concurrent execution with resource limits
 */
export class WorkerPool {
  private maxConcurrent: number;
  private queueSize: number;
  private defaultTimeout: number;
  private activeWorkers: number = 0;
  private queue: Array<WorkerTask<any>> = [];
  private stats = {
    tasksCompleted: 0,
    tasksFailed: 0,
    tasksTimedOut: 0,
    totalWaitTime: 0,
  };

  constructor(config: WorkerPoolConfig = {}) {
    this.maxConcurrent = config.maxConcurrent || 10;
    this.queueSize = config.queueSize || Infinity;
    this.defaultTimeout = config.timeout || 30000; // 30 seconds

    log.debug('[WorkerPool] Initialized', {
      maxConcurrent: this.maxConcurrent,
      queueSize: this.queueSize,
    });
  }

  /**
   * Execute a task in the worker pool
   */
  async execute<T>(task: WorkerTask<T>): Promise<T> {
    // Check queue size
    if (this.queue.length >= this.queueSize) {
      throw new Error(`Worker pool queue full (max: ${this.queueSize})`);
    }

    const startWaitTime = Date.now();

    // Wait for available worker slot
    while (this.activeWorkers >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const waitTime = Date.now() - startWaitTime;
    this.stats.totalWaitTime += waitTime;

    // Execute task
    this.activeWorkers++;

    log.debug('[WorkerPool] Executing task', {
      taskId: task.id,
      activeWorkers: this.activeWorkers,
      queueLength: this.queue.length,
      waitTime,
    });

    try {
      const timeout = task.timeout || this.defaultTimeout;
      const result = await this.executeWithTimeout(task.execute, timeout);

      this.stats.tasksCompleted++;

      log.debug('[WorkerPool] Task completed', {
        taskId: task.id,
        activeWorkers: this.activeWorkers - 1,
      });

      return result;
    } catch (error: any) {
      if (error.message?.includes('timeout')) {
        this.stats.tasksTimedOut++;
      } else {
        this.stats.tasksFailed++;
      }

      log.error('[WorkerPool] Task failed', {
        taskId: task.id,
        error,
      });

      throw error;
    } finally {
      this.activeWorkers--;
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Execute multiple tasks in parallel with concurrency limit
   */
  async executeMany<T>(tasks: WorkerTask<T>[]): Promise<T[]> {
    const promises = tasks.map(task => this.execute(task));
    return Promise.all(promises);
  }

  /**
   * Execute multiple tasks with different wait strategies
   */
  async executeWithStrategy<T>(
    tasks: WorkerTask<T>[],
    strategy: WaitStrategy
  ): Promise<{ results: (T | Error)[]; success: boolean }> {
    const promises = tasks.map(task =>
      this.execute(task).catch(error => error as Error)
    );

    let results: (T | Error)[];
    let success: boolean;

    switch (strategy) {
      case 'all':
        // Wait for all, fail if any fails
        try {
          results = await Promise.all(promises);
          success = results.every(r => !(r instanceof Error));
        } catch (error) {
          success = false;
          results = [error as Error];
        }
        break;

      case 'any':
        // Wait for any success
        try {
          const result = await Promise.any(promises);
          results = [result];
          success = true;
        } catch (error) {
          // All failed
          results = (error as AggregateError).errors || [error as Error];
          success = false;
        }
        break;

      case 'allSettled':
        // Wait for all to settle (don't throw)
        const settled = await Promise.allSettled(promises);
        results = settled.map(s =>
          s.status === 'fulfilled' ? s.value : s.reason
        );
        success = settled.some(s => s.status === 'fulfilled');
        break;

      case 'race':
        // Return first completed
        const raceResult = await Promise.race(promises);
        results = [raceResult];
        success = !(raceResult instanceof Error);
        break;
    }

    return { results, success };
  }

  /**
   * Get worker pool statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeWorkers: this.activeWorkers,
      queueLength: this.queue.length,
      averageWaitTime:
        this.stats.tasksCompleted > 0
          ? this.stats.totalWaitTime / this.stats.tasksCompleted
          : 0,
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      activeWorkers: this.activeWorkers,
      maxConcurrent: this.maxConcurrent,
      queueLength: this.queue.length,
      utilizationRate:
        this.maxConcurrent > 0
          ? (this.activeWorkers / this.maxConcurrent) * 100
          : 0,
    };
  }
}

/**
 * Parallel Execution Manager
 *
 * Manages parallel execution groups with worker pools
 */
export class ParallelExecutionManager {
  private workerPool: WorkerPool;

  constructor(config: WorkerPoolConfig = {}) {
    this.workerPool = new WorkerPool(config);
  }

  /**
   * Execute a parallel group
   */
  async executeGroup(
    group: ParallelGroup,
    stepExecutor: (stepId: string) => Promise<any>,
    context: WorkflowContext
  ): Promise<ParallelExecutionResult> {
    const startTime = Date.now();
    const result: ParallelExecutionResult = {
      groupId: group.id,
      completedSteps: [],
      failedSteps: [],
      skippedSteps: [],
      duration: 0,
      success: true,
      results: new Map(),
      errors: new Map(),
    };

    log.info('[ParallelExecution] Starting parallel group', {
      groupId: group.id,
      steps: group.steps.length,
      waitStrategy: group.waitStrategy || 'all',
      maxConcurrent: group.maxConcurrent || 'unlimited',
    });

    try {
      // Create tasks for worker pool
      const tasks: WorkerTask<any>[] = group.steps.map(stepId => ({
        id: stepId,
        execute: async () => {
          try {
            const stepResult = await stepExecutor(stepId);
            result.results.set(stepId, stepResult);
            result.completedSteps.push(stepId);
            return stepResult;
          } catch (error) {
            result.errors.set(stepId, error as Error);
            result.failedSteps.push(stepId);
            throw error;
          }
        },
        timeout: group.timeout,
      }));

      // Execute with concurrency limit if specified
      if (group.maxConcurrent && group.maxConcurrent < tasks.length) {
        log.debug('[ParallelExecution] Using concurrency limit', {
          maxConcurrent: group.maxConcurrent,
        });

        // Execute in batches
        const batches: WorkerTask<any>[][] = [];
        for (let i = 0; i < tasks.length; i += group.maxConcurrent) {
          batches.push(tasks.slice(i, i + group.maxConcurrent));
        }

        for (const batch of batches) {
          const batchResults = await this.workerPool.executeWithStrategy(
            batch,
            group.waitStrategy || 'all'
          );

          if (!batchResults.success && !group.continueOnError) {
            result.success = false;
            break;
          }
        }
      } else {
        // Execute all at once
        const executionResult = await this.workerPool.executeWithStrategy(
          tasks,
          group.waitStrategy || 'all'
        );

        result.success = executionResult.success || !!group.continueOnError;
      }

      // Mark steps not executed as skipped
      for (const stepId of group.steps) {
        if (!result.completedSteps.includes(stepId) && !result.failedSteps.includes(stepId)) {
          result.skippedSteps.push(stepId);
        }
      }

      result.duration = Date.now() - startTime;

      log.info('[ParallelExecution] Parallel group completed', {
        groupId: group.id,
        completed: result.completedSteps.length,
        failed: result.failedSteps.length,
        skipped: result.skippedSteps.length,
        duration: result.duration,
        success: result.success,
      });

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.success = false;

      log.error('[ParallelExecution] Parallel group failed', {
        groupId: group.id,
        error,
        duration: result.duration,
      });

      throw error;
    }
  }

  /**
   * Get worker pool stats
   */
  getStats() {
    return this.workerPool.getStats();
  }

  /**
   * Get current status
   */
  getStatus() {
    return this.workerPool.getStatus();
  }
}

// Singleton instance
let parallelExecutionManager: ParallelExecutionManager | null = null;

export function getParallelExecutionManager(
  config?: WorkerPoolConfig
): ParallelExecutionManager {
  if (!parallelExecutionManager) {
    parallelExecutionManager = new ParallelExecutionManager(config);
  }
  return parallelExecutionManager;
}

export const parallelExecution = getParallelExecutionManager();
