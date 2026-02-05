/**
 * Example Workflows Index
 *
 * Export all available workflow examples for easy importing
 */

export { deployAppWorkflow } from './deploy-app';
export { cicdPipeline } from './ci-cd-pipeline';
export { botCreationWorkflow } from './bot-creation';
export { dataProcessingWorkflow } from './data-processing';

/**
 * Usage:
 *
 * // Import all workflows
 * import * as workflows from './examples/workflows';
 *
 * // Or import specific workflows
 * import { deployAppWorkflow, cicdPipeline } from './examples/workflows';
 *
 * // Execute a workflow
 * import { workflowManager } from './src/core/workflow-manager';
 *
 * const result = await workflowManager.execute(workflows.deployAppWorkflow, {
 *   userId: 'user-123',
 *   userRequest: 'Deploy application'
 * });
 */
