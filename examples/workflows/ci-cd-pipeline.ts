/**
 * CI/CD Pipeline Workflow
 *
 * Complete continuous integration and deployment pipeline:
 * 1. Lint code → Check style
 * 2. Run unit tests → Verify functionality
 * 3. Run integration tests → Test components together
 * 4. Build artifacts → Compile production bundle
 * 5. Push to registry → Store artifacts
 * 6. Deploy to staging → Test in staging environment
 *
 * Usage:
 *   import { cicdPipeline } from './examples/workflows/ci-cd-pipeline';
 *   await workflowManager.execute(cicdPipeline, { userId, userRequest });
 */

import { WorkflowDefinition } from '../../src/core/workflow-manager';

export const cicdPipeline: WorkflowDefinition = {
  name: 'cicd_pipeline',
  description: 'Complete CI/CD pipeline with linting, testing, building, and deployment',
  maxDuration: 600000, // 10 minutes

  steps: [
    // Phase 1: Code Quality (parallel checks)
    {
      id: 'lint',
      toolName: 'execute_shell',
      input: {
        command: 'npm run lint',
        workingDir: '.'
      },
      onError: 'fail',
      parallel: true
    },

    {
      id: 'type_check',
      toolName: 'execute_shell',
      input: {
        command: 'npx tsc --noEmit',
        workingDir: '.'
      },
      onError: 'fail',
      parallel: true
    },

    // Phase 2: Testing (depends on quality checks)
    {
      id: 'unit_tests',
      toolName: 'execute_shell',
      input: {
        command: 'npm run test:unit',
        workingDir: '.'
      },
      dependsOn: ['lint', 'type_check'],
      onError: 'fail',
      parallel: true
    },

    {
      id: 'integration_tests',
      toolName: 'execute_shell',
      input: {
        command: 'npm run test:integration',
        workingDir: '.'
      },
      dependsOn: ['lint', 'type_check'],
      onError: 'fail',
      parallel: true
    },

    // Phase 3: Security Scan (parallel with tests)
    {
      id: 'security_scan',
      toolName: 'execute_shell',
      input: {
        command: 'npm audit --audit-level=high',
        workingDir: '.'
      },
      dependsOn: ['lint', 'type_check'],
      onError: 'continue', // Warn but don't fail
      parallel: true
    },

    // Phase 4: Build (depends on all tests passing)
    {
      id: 'build_production',
      toolName: 'execute_shell',
      input: {
        command: 'npm run build:prod',
        workingDir: '.'
      },
      dependsOn: ['unit_tests', 'integration_tests'],
      onError: 'fail'
    },

    // Phase 5: Generate artifacts
    {
      id: 'create_docker_image',
      toolName: 'execute_shell',
      input: {
        command: 'docker build -t opencell:latest .',
        workingDir: '.'
      },
      dependsOn: ['build_production'],
      onError: 'fail',
      condition: (ctx) => {
        // Only build docker image if deployment is enabled
        return process.env.DOCKER_BUILD_ENABLED === 'true';
      }
    },

    // Phase 6: Push artifacts
    {
      id: 'push_to_registry',
      toolName: 'execute_shell',
      input: {
        command: 'docker push opencell:latest',
        workingDir: '.'
      },
      dependsOn: ['create_docker_image'],
      onError: 'retry',
      retryConfig: {
        maxAttempts: 3,
        delayMs: 10000
      }
    },

    // Phase 7: Deploy to staging
    {
      id: 'deploy_staging',
      toolName: 'web_fetch',
      input: {
        url: 'https://api.deploy.example.com/v1/staging/deploy',
        method: 'POST',
        body: {
          image: 'opencell:latest',
          environment: 'staging'
        }
      },
      dependsOn: ['push_to_registry'],
      onError: 'fail'
    },

    // Phase 8: Smoke tests on staging
    {
      id: 'smoke_tests',
      toolName: 'web_fetch',
      input: {
        url: 'https://staging.example.com/health',
        method: 'GET'
      },
      dependsOn: ['deploy_staging'],
      onError: 'fail'
    },

    // Phase 9: Notify success
    {
      id: 'notify_team',
      toolName: 'execute_shell',
      input: {
        command: 'echo "✅ CI/CD Pipeline completed successfully! Deployed to staging."'
      },
      dependsOn: ['smoke_tests'],
      onError: 'continue'
    }
  ]
};

/**
 * Usage Example:
 *
 * import { workflowManager } from './src/core/workflow-manager';
 * import { cicdPipeline } from './examples/workflows/ci-cd-pipeline';
 *
 * // Run full CI/CD pipeline
 * const result = await workflowManager.execute(cicdPipeline, {
 *   userId: 'jenkins-bot',
 *   userRequest: 'Run CI/CD pipeline for commit abc123'
 * });
 *
 * // Check result
 * if (result.smoke_tests.status === 'healthy') {
 *   console.log('✅ Pipeline successful, staging is healthy');
 * }
 */

/**
 * Pipeline Visualization:
 *
 *     [lint] ----\
 *     [type_check] --> [unit_tests] -------\
 *     [security_scan]  [integration_tests] --> [build] --> [docker] --> [push] --> [deploy] --> [smoke] --> [notify]
 *
 * Estimated Duration: 5-10 minutes
 * Parallel Execution: 5 steps run in parallel (lint, type_check, unit_tests, integration_tests, security_scan)
 */
