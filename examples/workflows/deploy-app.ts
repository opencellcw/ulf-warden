/**
 * Deploy Application Workflow
 *
 * Steps:
 * 1. Run tests → Ensure code quality
 * 2. Build application → Compile/bundle code
 * 3. Deploy to server → Upload and restart
 * 4. Verify deployment → Health check
 *
 * Usage:
 *   import { deployAppWorkflow } from './examples/workflows/deploy-app';
 *   await workflowManager.execute(deployAppWorkflow, { userId, userRequest });
 */

import { WorkflowDefinition } from '../../src/core/workflow-manager';

export const deployAppWorkflow: WorkflowDefinition = {
  name: 'deploy_app',
  description: 'Test, build, and deploy application',
  maxDuration: 300000, // 5 minutes

  steps: [
    // Step 1: Run tests
    {
      id: 'run_tests',
      toolName: 'execute_shell',
      input: {
        command: 'npm test',
        workingDir: '.'
      },
      onError: 'fail' // Stop deployment if tests fail
    },

    // Step 2: Build application (depends on tests passing)
    {
      id: 'build',
      toolName: 'execute_shell',
      input: {
        command: 'npm run build',
        workingDir: '.'
      },
      dependsOn: ['run_tests'],
      onError: 'fail'
    },

    // Step 3: Create deployment package
    {
      id: 'package',
      toolName: 'execute_shell',
      input: {
        command: 'tar -czf dist.tar.gz dist/',
        workingDir: '.'
      },
      dependsOn: ['build'],
      onError: 'fail'
    },

    // Step 4: Deploy to server (via API)
    {
      id: 'deploy',
      toolName: 'web_fetch',
      input: {
        url: 'https://api.deploy.example.com/v1/deploy',
        method: 'POST',
        body: {
          app: 'opencell',
          version: 'latest'
        }
      },
      dependsOn: ['package'],
      onError: 'retry', // Retry if network issues
      retryConfig: {
        maxAttempts: 3,
        delayMs: 5000
      }
    },

    // Step 5: Verify deployment (parallel with notification)
    {
      id: 'health_check',
      toolName: 'web_fetch',
      input: {
        url: 'https://app.example.com/health',
        method: 'GET'
      },
      dependsOn: ['deploy'],
      onError: 'fail',
      parallel: true
    },

    // Step 6: Send success notification (parallel with health check)
    {
      id: 'notify_success',
      toolName: 'execute_shell',
      input: {
        command: 'echo "✅ Deployment successful!"'
      },
      dependsOn: ['deploy'],
      onError: 'continue', // Don't fail deployment if notification fails
      parallel: true
    }
  ]
};

/**
 * Usage Example:
 *
 * import { workflowManager } from './src/core/workflow-manager';
 * import { deployAppWorkflow } from './examples/workflows/deploy-app';
 *
 * const result = await workflowManager.execute(deployAppWorkflow, {
 *   userId: 'user-123',
 *   userRequest: 'Deploy the app to production'
 * });
 *
 * console.log('Deployment result:', result);
 */
