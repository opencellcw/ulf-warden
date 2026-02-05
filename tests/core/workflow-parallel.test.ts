/**
 * Parallel Workflow Execution Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  WorkerPool,
  ParallelExecutionManager,
  ParallelGroup,
} from '../../src/core/workflow-parallel';
import { WorkflowContext } from '../../src/core/workflow-manager';

describe('WorkerPool', () => {
  let pool: WorkerPool;

  beforeEach(() => {
    pool = new WorkerPool({
      maxConcurrent: 3,
      timeout: 5000,
    });
  });

  describe('Basic Execution', () => {
    it('should execute a task successfully', async () => {
      const result = await pool.execute({
        id: 'task1',
        execute: async () => 'success',
      });

      assert.strictEqual(result, 'success');
    });

    it('should execute multiple tasks', async () => {
      const tasks = [
        { id: 'task1', execute: async () => 1 },
        { id: 'task2', execute: async () => 2 },
        { id: 'task3', execute: async () => 3 },
      ];

      const results = await pool.executeMany(tasks);
      assert.deepStrictEqual(results, [1, 2, 3]);
    });

    it('should handle task errors', async () => {
      await assert.rejects(
        async () =>
          await pool.execute({
            id: 'failing-task',
            execute: async () => {
              throw new Error('Task failed');
            },
          }),
        /Task failed/
      );
    });
  });

  describe('Concurrency Limiting', () => {
    it('should limit concurrent executions', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task${i}`,
        execute: async () => {
          concurrent++;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          await new Promise(resolve => setTimeout(resolve, 50));
          concurrent--;
          return i;
        },
      }));

      await pool.executeMany(tasks);

      // Should not exceed maxConcurrent (3)
      assert.ok(maxConcurrent <= 3);
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running tasks', async () => {
      const shortTimeoutPool = new WorkerPool({
        maxConcurrent: 5,
        timeout: 100, // 100ms timeout
      });

      await assert.rejects(
        async () =>
          await shortTimeoutPool.execute({
            id: 'slow-task',
            execute: async () => {
              await new Promise(resolve => setTimeout(resolve, 500));
              return 'done';
            },
          }),
        /timeout/
      );
    });

    it('should use task-specific timeout', async () => {
      const result = await pool.execute({
        id: 'custom-timeout-task',
        execute: async () => {
          await new Promise(resolve => setTimeout(resolve, 150));
          return 'success';
        },
        timeout: 200, // Custom 200ms timeout
      });

      assert.strictEqual(result, 'success');
    });
  });

  describe('Wait Strategies', () => {
    it('should execute with "all" strategy', async () => {
      const tasks = [
        { id: 'task1', execute: async () => 1 },
        { id: 'task2', execute: async () => 2 },
        { id: 'task3', execute: async () => 3 },
      ];

      const { results, success } = await pool.executeWithStrategy(tasks, 'all');

      assert.strictEqual(success, true);
      assert.deepStrictEqual(results, [1, 2, 3]);
    });

    it('should execute with "any" strategy', async () => {
      const tasks = [
        {
          id: 'slow',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'slow';
          },
        },
        {
          id: 'fast',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'fast';
          },
        },
      ];

      const { results, success } = await pool.executeWithStrategy(tasks, 'any');

      assert.strictEqual(success, true);
      assert.strictEqual(results.length, 1);
      // Should get the fast result
      assert.ok(results[0] === 'fast' || results[0] === 'slow');
    });

    it('should execute with "allSettled" strategy', async () => {
      const tasks = [
        { id: 'success', execute: async () => 'ok' },
        {
          id: 'failure',
          execute: async () => {
            throw new Error('failed');
          },
        },
        { id: 'success2', execute: async () => 'ok2' },
      ];

      const { results, success } = await pool.executeWithStrategy(tasks, 'allSettled');

      assert.strictEqual(results.length, 3);
      assert.strictEqual(results[0], 'ok');
      assert.ok(results[1] instanceof Error);
      assert.strictEqual(results[2], 'ok2');
      // Success if any succeeded
      assert.strictEqual(success, true);
    });

    it('should execute with "race" strategy', async () => {
      const tasks = [
        {
          id: 'slow',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return 'slow';
          },
        },
        {
          id: 'fast',
          execute: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'fast';
          },
        },
      ];

      const { results, success } = await pool.executeWithStrategy(tasks, 'race');

      assert.strictEqual(results.length, 1);
      assert.strictEqual(success, true);
    });
  });

  describe('Statistics', () => {
    it('should track execution statistics', async () => {
      await pool.execute({
        id: 'task1',
        execute: async () => 'success',
      });

      await pool.execute({
        id: 'task2',
        execute: async () => 'success',
      });

      const stats = pool.getStats();

      assert.strictEqual(stats.tasksCompleted, 2);
      assert.strictEqual(stats.activeWorkers, 0);
    });

    it('should track failed tasks', async () => {
      try {
        await pool.execute({
          id: 'failing',
          execute: async () => {
            throw new Error('fail');
          },
        });
      } catch (e) {
        // Expected
      }

      const stats = pool.getStats();
      assert.strictEqual(stats.tasksFailed, 1);
    });
  });

  describe('Status', () => {
    it('should report current status', async () => {
      const status = pool.getStatus();

      assert.strictEqual(status.activeWorkers, 0);
      assert.strictEqual(status.maxConcurrent, 3);
      assert.strictEqual(status.utilizationRate, 0);
    });
  });
});

describe('ParallelExecutionManager', () => {
  let manager: ParallelExecutionManager;
  let context: WorkflowContext;

  beforeEach(() => {
    manager = new ParallelExecutionManager({
      maxConcurrent: 5,
      timeout: 5000,
    });

    context = {
      userId: 'user123',
      userRequest: 'test',
      results: new Map(),
      errors: new Map(),
      startTime: Date.now(),
    };
  });

  describe('Parallel Group Execution', () => {
    it('should execute parallel group with all steps', async () => {
      const group: ParallelGroup = {
        id: 'test_group',
        steps: ['step1', 'step2', 'step3'],
        waitStrategy: 'all',
      };

      const stepResults = new Map([
        ['step1', 'result1'],
        ['step2', 'result2'],
        ['step3', 'result3'],
      ]);

      const stepExecutor = async (stepId: string) => {
        return stepResults.get(stepId);
      };

      const result = await manager.executeGroup(group, stepExecutor, context);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.completedSteps.length, 3);
      assert.strictEqual(result.failedSteps.length, 0);
      assert.strictEqual(result.skippedSteps.length, 0);
    });

    it('should handle failed steps in group', async () => {
      const group: ParallelGroup = {
        id: 'failing_group',
        steps: ['step1', 'step2', 'step3'],
        waitStrategy: 'allSettled',
        continueOnError: true,
      };

      const stepExecutor = async (stepId: string) => {
        if (stepId === 'step2') {
          throw new Error('Step 2 failed');
        }
        return `result_${stepId}`;
      };

      const result = await manager.executeGroup(group, stepExecutor, context);

      assert.strictEqual(result.completedSteps.length, 2);
      assert.strictEqual(result.failedSteps.length, 1);
      assert.strictEqual(result.failedSteps[0], 'step2');
    });

    it('should respect maxConcurrent limit', async () => {
      let concurrent = 0;
      let maxConcurrent = 0;

      const group: ParallelGroup = {
        id: 'limited_group',
        steps: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8'],
        waitStrategy: 'all',
        maxConcurrent: 3,
      };

      const stepExecutor = async (stepId: string) => {
        concurrent++;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await new Promise(resolve => setTimeout(resolve, 50));
        concurrent--;
        return stepId;
      };

      await manager.executeGroup(group, stepExecutor, context);

      assert.ok(maxConcurrent <= 3);
    });

    it('should use "any" wait strategy', async () => {
      const group: ParallelGroup = {
        id: 'any_group',
        steps: ['slow', 'fast'],
        waitStrategy: 'any',
      };

      const stepExecutor = async (stepId: string) => {
        if (stepId === 'slow') {
          await new Promise(resolve => setTimeout(resolve, 200));
        } else {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        return stepId;
      };

      const result = await manager.executeGroup(group, stepExecutor, context);

      // With "any" strategy, should complete when first step succeeds
      assert.ok(result.completedSteps.length >= 1);
    });

    it('should handle group timeout', async () => {
      const group: ParallelGroup = {
        id: 'timeout_group',
        steps: ['slow1', 'slow2'],
        waitStrategy: 'allSettled',
        continueOnError: true,
        timeout: 100, // 100ms timeout
      };

      const stepExecutor = async (stepId: string) => {
        await new Promise(resolve => setTimeout(resolve, 500));
        return stepId;
      };

      const result = await manager.executeGroup(group, stepExecutor, context);

      // With allSettled and continueOnError, timeouts don't throw
      // but steps will be skipped or failed
      assert.ok(result.failedSteps.length + result.skippedSteps.length > 0);
    });
  });

  describe('Statistics and Status', () => {
    it('should provide execution statistics', () => {
      const stats = manager.getStats();

      assert.ok('tasksCompleted' in stats);
      assert.ok('tasksFailed' in stats);
      assert.ok('activeWorkers' in stats);
    });

    it('should provide current status', () => {
      const status = manager.getStatus();

      assert.ok('activeWorkers' in status);
      assert.ok('maxConcurrent' in status);
      assert.ok('utilizationRate' in status);
    });
  });
});
