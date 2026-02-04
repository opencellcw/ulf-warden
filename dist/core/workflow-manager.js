"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workflowManager = exports.WorkflowManager = void 0;
const logger_1 = require("../logger");
const tool_compat_1 = require("./tool-compat");
const retry_engine_1 = require("./retry-engine");
class WorkflowManager {
    /**
     * Execute a workflow
     */
    async execute(workflow, context) {
        const ctx = {
            ...context,
            results: new Map(),
            errors: new Map(),
            startTime: Date.now()
        };
        logger_1.log.info('[WorkflowManager] Starting workflow', {
            name: workflow.name,
            steps: workflow.steps.length
        });
        try {
            // Build dependency graph
            const graph = this.buildDependencyGraph(workflow.steps);
            // Execute steps in topological order
            const executed = new Set();
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
                    const step = workflow.steps.find(s => s.id === stepId);
                    const depsReady = (step.dependsOn || []).every(dep => executed.has(dep));
                    return depsReady;
                });
                if (ready.length === 0 && pending.size > 0) {
                    throw new Error('Circular dependency detected or unresolvable dependencies');
                }
                // Separate parallel and sequential steps
                const parallelSteps = ready.filter(id => workflow.steps.find(s => s.id === id).parallel);
                const sequentialSteps = ready.filter(id => !parallelSteps.includes(id));
                // Execute parallel steps concurrently
                if (parallelSteps.length > 0) {
                    logger_1.log.debug('[WorkflowManager] Executing parallel steps', {
                        steps: parallelSteps
                    });
                    await Promise.all(parallelSteps.map(stepId => this.executeStep(stepId, workflow, ctx)));
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
            logger_1.log.info('[WorkflowManager] Workflow completed', {
                name: workflow.name,
                duration,
                stepsExecuted: executed.size,
                errors: ctx.errors.size
            });
            // Return result of last step
            const lastStep = workflow.steps[workflow.steps.length - 1];
            return ctx.results.get(lastStep.id);
        }
        catch (error) {
            const duration = Date.now() - ctx.startTime;
            logger_1.log.error('[WorkflowManager] Workflow failed', {
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
    async executeStep(stepId, workflow, context) {
        const step = workflow.steps.find(s => s.id === stepId);
        // Check condition
        if (step.condition && !step.condition(context)) {
            logger_1.log.debug('[WorkflowManager] Skipping step due to condition', { stepId });
            return;
        }
        // Resolve input
        const input = typeof step.input === 'function'
            ? step.input(context)
            : step.input;
        logger_1.log.debug('[WorkflowManager] Executing step', {
            stepId,
            toolName: step.toolName
        });
        try {
            // Execute with retry if configured
            const result = step.onError === 'retry'
                ? await retry_engine_1.retryEngine.executeWithRetry(step.toolName, () => tool_compat_1.toolCompat.execute(step.toolName, input, context.userId, context.userRequest))
                : await tool_compat_1.toolCompat.execute(step.toolName, input, context.userId, context.userRequest);
            context.results.set(stepId, result);
            logger_1.log.debug('[WorkflowManager] Step completed', {
                stepId,
                resultLength: typeof result === 'string' ? result.length : 'N/A'
            });
        }
        catch (error) {
            context.errors.set(stepId, error);
            logger_1.log.error('[WorkflowManager] Step failed', {
                stepId,
                error,
                onError: step.onError
            });
            if (step.onError === 'fail') {
                throw error;
            }
            else if (step.onError === 'continue') {
                logger_1.log.warn('[WorkflowManager] Continuing despite error', { stepId });
            }
        }
    }
    /**
     * Build dependency graph (validates no cycles)
     */
    buildDependencyGraph(steps) {
        const graph = new Map();
        for (const step of steps) {
            graph.set(step.id, new Set(step.dependsOn || []));
        }
        // Validate no cycles (simple DFS)
        const visited = new Set();
        const recursionStack = new Set();
        const hasCycle = (nodeId) => {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            const neighbors = graph.get(nodeId) || new Set();
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (hasCycle(neighbor)) {
                        return true;
                    }
                }
                else if (recursionStack.has(neighbor)) {
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
    validateWorkflow(workflow) {
        const errors = [];
        // Check for duplicate step IDs
        const stepIds = new Set();
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
        }
        catch (error) {
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
    calculateMaxDepth(steps) {
        const depths = new Map();
        const calculateDepth = (stepId) => {
            if (depths.has(stepId)) {
                return depths.get(stepId);
            }
            const step = steps.find(s => s.id === stepId);
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
exports.WorkflowManager = WorkflowManager;
// Singleton instance
exports.workflowManager = new WorkflowManager();
