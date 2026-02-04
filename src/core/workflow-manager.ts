import { log } from '../logger';
import { toolRegistry, ToolContext } from './tool-registry';
import { toolCompat } from './tool-compat';
import { retryEngine } from './retry-engine';

export interface WorkflowStep {
  id: string;
  toolName: string;
  input: any | ((context: WorkflowContext) => any); // Static or dynamic
  dependsOn?: string[]; // Step IDs this depends on
  condition?: (context: WorkflowContext) => boolean; // Skip if false
  onError?: 'fail' | 'continue' | 'retry'; // Error handling strategy
  parallel?: boolean; // Can run in parallel with siblings
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  steps: WorkflowStep[];
  maxDuration?: number; // Max workflow duration in ms
}

export interface WorkflowContext {
  userId: string;
  userRequest: string;
  results: Map<string, any>; // Step ID -> Result
  errors: Map<string, Error>; // Step ID -> Error
  startTime: number;
}

export class WorkflowManager {
  /**
   * Execute a workflow
   */
  async execute(
    workflow: WorkflowDefinition,
    context: Omit<WorkflowContext, 'results' | 'errors' | 'startTime'>
  ): Promise<any> {
    const ctx: WorkflowContext = {
      ...context,
      results: new Map(),
      errors: new Map(),
      startTime: Date.now()
    };

    log.info('[WorkflowManager] Starting workflow', {
      name: workflow.name,
      steps: workflow.steps.length
    });

    try {
      // Build dependency graph
      const graph = this.buildDependencyGraph(workflow.steps);

      // Execute steps in topological order
      const executed = new Set<string>();
      const pending = new Set(workflow.steps.map(s => s.id));

      while (pending.size > 0) {
        // Check timeout
        if (workflow.maxDuration) {
          const elapsed = Date.now() - ctx.startTime;
          if (elapsed > workflow.maxDuration) {
            throw new Error(`Workflow timeout after ${elapsed}ms`);
          }
        }

        // Find steps ready to execute
        const ready = Array.from(pending).filter(stepId => {
          const step = workflow.steps.find(s => s.id === stepId)!;
          const depsReady = (step.dependsOn || []).every(dep => executed.has(dep));
          return depsReady;
        });

        if (ready.length === 0 && pending.size > 0) {
          throw new Error('Circular dependency detected or unresolvable dependencies');
        }

        // Separate parallel and sequential steps
        const parallelSteps = ready.filter(id =>
          workflow.steps.find(s => s.id === id)!.parallel
        );
        const sequentialSteps = ready.filter(id => !parallelSteps.includes(id));

        // Execute parallel steps concurrently
        if (parallelSteps.length > 0) {
          log.debug('[WorkflowManager] Executing parallel steps', {
            steps: parallelSteps
          });

          await Promise.all(
            parallelSteps.map(stepId => this.executeStep(stepId, workflow, ctx))
          );

          parallelSteps.forEach(id => {
            executed.add(id);
            pending.delete(id);
          });
        }

        // Execute sequential steps one by one
        for (const stepId of sequentialSteps) {
          await this.executeStep(stepId, workflow, ctx);
          executed.add(stepId);
          pending.delete(stepId);
        }
      }

      const duration = Date.now() - ctx.startTime;
      log.info('[WorkflowManager] Workflow completed', {
        name: workflow.name,
        duration,
        stepsExecuted: executed.size,
        errors: ctx.errors.size
      });

      // Return result of last step
      const lastStep = workflow.steps[workflow.steps.length - 1];
      return ctx.results.get(lastStep.id);

    } catch (error) {
      const duration = Date.now() - ctx.startTime;
      log.error('[WorkflowManager] Workflow failed', {
        name: workflow.name,
        error,
        duration,
        stepsCompleted: ctx.results.size
      });
      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    stepId: string,
    workflow: WorkflowDefinition,
    context: WorkflowContext
  ): Promise<void> {
    const step = workflow.steps.find(s => s.id === stepId)!;

    // Check condition
    if (step.condition && !step.condition(context)) {
      log.debug('[WorkflowManager] Skipping step due to condition', { stepId });
      return;
    }

    // Resolve input
    const input = typeof step.input === 'function'
      ? step.input(context)
      : step.input;

    log.debug('[WorkflowManager] Executing step', {
      stepId,
      toolName: step.toolName
    });

    try {
      // Execute with retry if configured
      const result = step.onError === 'retry'
        ? await retryEngine.executeWithRetry(
            step.toolName,
            () => toolCompat.execute(step.toolName, input, context.userId, context.userRequest)
          )
        : await toolCompat.execute(step.toolName, input, context.userId, context.userRequest);

      context.results.set(stepId, result);

      log.debug('[WorkflowManager] Step completed', {
        stepId,
        resultLength: typeof result === 'string' ? result.length : 'N/A'
      });

    } catch (error) {
      context.errors.set(stepId, error as Error);

      log.error('[WorkflowManager] Step failed', {
        stepId,
        error,
        onError: step.onError
      });

      if (step.onError === 'fail') {
        throw error;
      } else if (step.onError === 'continue') {
        log.warn('[WorkflowManager] Continuing despite error', { stepId });
      }
    }
  }

  /**
   * Build dependency graph (validates no cycles)
   */
  private buildDependencyGraph(steps: WorkflowStep[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const step of steps) {
      graph.set(step.id, new Set(step.dependsOn || []));
    }

    // Validate no cycles (simple DFS)
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const step of steps) {
      if (!visited.has(step.id) && hasCycle(step.id)) {
        throw new Error(`Circular dependency detected in workflow`);
      }
    }

    return graph;
  }

  /**
   * Validate workflow definition
   */
  validateWorkflow(workflow: WorkflowDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check for duplicate step IDs
    const stepIds = new Set<string>();
    for (const step of workflow.steps) {
      if (stepIds.has(step.id)) {
        errors.push(`Duplicate step ID: ${step.id}`);
      }
      stepIds.add(step.id);
    }

    // Check dependencies exist
    for (const step of workflow.steps) {
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          if (!stepIds.has(depId)) {
            errors.push(`Step ${step.id} depends on non-existent step: ${depId}`);
          }
        }
      }
    }

    // Check for circular dependencies
    try {
      this.buildDependencyGraph(workflow.steps);
    } catch (error: any) {
      errors.push(error.message);
    }

    // Check max workflow depth
    const maxDepth = this.calculateMaxDepth(workflow.steps);
    if (maxDepth > 20) {
      errors.push(`Workflow depth too high: ${maxDepth} (max 20)`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate maximum depth of workflow
   */
  private calculateMaxDepth(steps: WorkflowStep[]): number {
    const depths = new Map<string, number>();

    const calculateDepth = (stepId: string): number => {
      if (depths.has(stepId)) {
        return depths.get(stepId)!;
      }

      const step = steps.find(s => s.id === stepId)!;
      if (!step.dependsOn || step.dependsOn.length === 0) {
        depths.set(stepId, 1);
        return 1;
      }

      const maxDepDepth = Math.max(...step.dependsOn.map(dep => calculateDepth(dep)));
      const depth = maxDepDepth + 1;
      depths.set(stepId, depth);
      return depth;
    };

    return Math.max(...steps.map(s => calculateDepth(s.id)));
  }
}

// Singleton instance
export const workflowManager = new WorkflowManager();
