/**
 * Workflow Examples Tests
 *
 * Tests to validate workflow structure and integrity
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  codeReviewWorkflow,
  testingWorkflow,
  documentationWorkflow,
  analyticsWorkflow,
  backupWorkflow,
} from '../../examples/workflow-examples';
import { WorkflowDefinition } from '../../src/core/workflow-manager';

describe('Workflow Examples', () => {
  describe('Structure Validation', () => {
    it('all workflows should have required fields', () => {
      const workflows = [
        codeReviewWorkflow,
        testingWorkflow,
        documentationWorkflow,
        analyticsWorkflow,
        backupWorkflow,
      ];

      workflows.forEach((workflow) => {
        assert.ok(workflow.name, 'Workflow should have name');
        assert.ok(workflow.description, 'Workflow should have description');
        assert.ok(Array.isArray(workflow.steps), 'Workflow should have steps array');
        assert.ok(workflow.steps.length > 0, 'Workflow should have at least one step');
      });
    });

    it('all steps should have unique IDs', () => {
      const workflows = [
        codeReviewWorkflow,
        testingWorkflow,
        documentationWorkflow,
        analyticsWorkflow,
        backupWorkflow,
      ];

      workflows.forEach((workflow) => {
        const stepIds = workflow.steps.map((s) => s.id);
        const uniqueIds = new Set(stepIds);

        assert.strictEqual(
          stepIds.length,
          uniqueIds.size,
          `Workflow ${workflow.name} has duplicate step IDs`
        );
      });
    });

    it('all step dependencies should exist', () => {
      const workflows = [
        codeReviewWorkflow,
        testingWorkflow,
        documentationWorkflow,
        analyticsWorkflow,
        backupWorkflow,
      ];

      workflows.forEach((workflow) => {
        const stepIds = new Set(workflow.steps.map((s) => s.id));

        workflow.steps.forEach((step) => {
          if (step.dependsOn) {
            step.dependsOn.forEach((depId) => {
              assert.ok(
                stepIds.has(depId),
                `Step ${step.id} depends on non-existent step ${depId} in workflow ${workflow.name}`
              );
            });
          }
        });
      });
    });

    it('workflows should have no circular dependencies', () => {
      const workflows = [
        codeReviewWorkflow,
        testingWorkflow,
        documentationWorkflow,
        analyticsWorkflow,
        backupWorkflow,
      ];

      workflows.forEach((workflow) => {
        const hasCycle = detectCycle(workflow);
        assert.strictEqual(
          hasCycle,
          false,
          `Workflow ${workflow.name} has circular dependencies`
        );
      });
    });
  });

  describe('Code Review Workflow', () => {
    it('should have correct structure', () => {
      assert.strictEqual(codeReviewWorkflow.name, 'code_review');
      assert.ok(codeReviewWorkflow.steps.length >= 5);
      assert.ok(codeReviewWorkflow.maxDuration);
    });

    it('should have fetch_changes as first step', () => {
      const firstStep = codeReviewWorkflow.steps[0];
      assert.strictEqual(firstStep.id, 'fetch_changes');
      assert.strictEqual(firstStep.toolName, 'git_diff');
    });

    it('should have parallel validation steps', () => {
      const parallelSteps = codeReviewWorkflow.steps.filter((s) => s.parallel);
      assert.ok(parallelSteps.length >= 3, 'Should have at least 3 parallel steps');
    });

    it('should have report generation step', () => {
      const reportStep = codeReviewWorkflow.steps.find((s) => s.id === 'generate_report');
      assert.ok(reportStep);
      assert.ok(reportStep.dependsOn);
      assert.ok(reportStep.dependsOn.length >= 3);
    });

    it('should conditionally post comments', () => {
      const commentStep = codeReviewWorkflow.steps.find((s) => s.id === 'post_comment');
      assert.ok(commentStep);
      assert.ok(typeof commentStep.condition === 'function');
    });
  });

  describe('Testing Workflow', () => {
    it('should have correct structure', () => {
      assert.strictEqual(testingWorkflow.name, 'testing_pipeline');
      assert.ok(testingWorkflow.steps.length >= 8);
    });

    it('should start with environment setup', () => {
      const setupStep = testingWorkflow.steps[0];
      assert.strictEqual(setupStep.id, 'setup_environment');
    });

    it('should have parallel test execution', () => {
      const testSteps = testingWorkflow.steps.filter((s) =>
        s.id.includes('test') && s.parallel
      );
      assert.ok(testSteps.length >= 2, 'Should have parallel test steps');
    });

    it('should enforce coverage thresholds', () => {
      const thresholdStep = testingWorkflow.steps.find((s) => s.id === 'check_thresholds');
      assert.ok(thresholdStep);
      assert.strictEqual(thresholdStep.onError, 'fail');
    });

    it('should always cleanup', () => {
      const cleanupStep = testingWorkflow.steps.find((s) => s.id === 'cleanup');
      assert.ok(cleanupStep);
      assert.strictEqual(cleanupStep.onError, 'continue');
    });
  });

  describe('Documentation Workflow', () => {
    it('should have correct structure', () => {
      assert.strictEqual(documentationWorkflow.name, 'documentation_generation');
      assert.ok(documentationWorkflow.steps.length >= 10);
    });

    it('should analyze codebase first', () => {
      const analyzeStep = documentationWorkflow.steps[0];
      assert.strictEqual(analyzeStep.id, 'analyze_codebase');
    });

    it('should validate links before deployment', () => {
      const checkLinksStep = documentationWorkflow.steps.find((s) => s.id === 'check_links');
      const deployStep = documentationWorkflow.steps.find((s) => s.id === 'deploy_docs');

      assert.ok(checkLinksStep);
      assert.ok(deployStep);
      assert.ok(deployStep.dependsOn?.includes('check_links'));
    });

    it('should notify team after deployment', () => {
      const notifyStep = documentationWorkflow.steps.find((s) => s.id === 'notify_team');
      assert.ok(notifyStep);
      assert.ok(notifyStep.dependsOn?.includes('deploy_docs'));
    });
  });

  describe('Analytics Workflow', () => {
    it('should have correct structure', () => {
      assert.strictEqual(analyticsWorkflow.name, 'analytics_reporting');
      assert.ok(analyticsWorkflow.steps.length >= 10);
    });

    it('should collect metrics first', () => {
      const collectStep = analyticsWorkflow.steps[0];
      assert.strictEqual(collectStep.id, 'collect_metrics');
    });

    it('should have parallel data collection', () => {
      const parallelSteps = analyticsWorkflow.steps.filter(
        (s) => s.parallel && s.id.includes('fetch')
      );
      assert.ok(parallelSteps.length >= 2);
    });

    it('should aggregate before calculating KPIs', () => {
      const aggregateStep = analyticsWorkflow.steps.find((s) => s.id === 'aggregate_data');
      const kpiStep = analyticsWorkflow.steps.find((s) => s.id === 'calculate_kpis');

      assert.ok(aggregateStep);
      assert.ok(kpiStep);
      assert.ok(kpiStep.dependsOn?.includes('aggregate_data'));
    });

    it('should distribute report to multiple channels', () => {
      const emailStep = analyticsWorkflow.steps.find((s) => s.id === 'email_stakeholders');
      const slackStep = analyticsWorkflow.steps.find((s) => s.id === 'post_to_slack');

      assert.ok(emailStep);
      assert.ok(slackStep);
    });
  });

  describe('Backup Workflow', () => {
    it('should have correct structure', () => {
      assert.strictEqual(backupWorkflow.name, 'comprehensive_backup');
      assert.ok(backupWorkflow.steps.length >= 15);
    });

    it('should prepare directory first', () => {
      const prepareStep = backupWorkflow.steps[0];
      assert.strictEqual(prepareStep.id, 'prepare_backup_dir');
    });

    it('should have parallel backup steps', () => {
      const backupSteps = backupWorkflow.steps.filter(
        (s) => s.parallel && s.id.includes('backup')
      );
      assert.ok(backupSteps.length >= 2);
    });

    it('should encrypt before uploading', () => {
      const encryptStep = backupWorkflow.steps.find((s) => s.id === 'encrypt_backup');
      const uploadS3Step = backupWorkflow.steps.find((s) => s.id === 'upload_to_s3');
      const uploadGCSStep = backupWorkflow.steps.find((s) => s.id === 'upload_to_gcs');

      assert.ok(encryptStep);
      assert.ok(uploadS3Step);
      assert.ok(uploadGCSStep);
      assert.ok(uploadS3Step.dependsOn?.includes('encrypt_backup'));
      assert.ok(uploadGCSStep.dependsOn?.includes('encrypt_backup'));
    });

    it('should verify uploads', () => {
      const verifyS3 = backupWorkflow.steps.find((s) => s.id === 'verify_s3_upload');
      const verifyGCS = backupWorkflow.steps.find((s) => s.id === 'verify_gcs_upload');

      assert.ok(verifyS3);
      assert.ok(verifyGCS);
    });

    it('should always cleanup local files', () => {
      const cleanupStep = backupWorkflow.steps.find((s) => s.id === 'cleanup_local');
      assert.ok(cleanupStep);
      assert.strictEqual(cleanupStep.onError, 'continue');
    });

    it('should log and notify on success', () => {
      const logStep = backupWorkflow.steps.find((s) => s.id === 'log_backup');
      const notifyStep = backupWorkflow.steps.find((s) => s.id === 'notify_success');

      assert.ok(logStep);
      assert.ok(notifyStep);
      assert.ok(notifyStep.dependsOn?.includes('log_backup'));
    });
  });

  describe('Dynamic Inputs', () => {
    it('workflows should use dynamic inputs', () => {
      const workflows = [
        codeReviewWorkflow,
        testingWorkflow,
        documentationWorkflow,
        analyticsWorkflow,
        backupWorkflow,
      ];

      workflows.forEach((workflow) => {
        const dynamicSteps = workflow.steps.filter((s) => typeof s.input === 'function');
        assert.ok(
          dynamicSteps.length > 0,
          `Workflow ${workflow.name} should have dynamic input steps`
        );
      });
    });
  });

  describe('Error Handling', () => {
    it('workflows should have error handling strategies', () => {
      const workflows = [
        codeReviewWorkflow,
        testingWorkflow,
        documentationWorkflow,
        analyticsWorkflow,
        backupWorkflow,
      ];

      workflows.forEach((workflow) => {
        const stepsWithErrorHandling = workflow.steps.filter((s) => s.onError);
        assert.ok(
          stepsWithErrorHandling.length > 0,
          `Workflow ${workflow.name} should have error handling`
        );
      });
    });
  });

  describe('Timeouts', () => {
    it('all workflows should have maxDuration set', () => {
      const workflows = [
        codeReviewWorkflow,
        testingWorkflow,
        documentationWorkflow,
        analyticsWorkflow,
        backupWorkflow,
      ];

      workflows.forEach((workflow) => {
        assert.ok(workflow.maxDuration, `Workflow ${workflow.name} should have maxDuration`);
        assert.ok(
          workflow.maxDuration > 0,
          `Workflow ${workflow.name} maxDuration should be positive`
        );
      });
    });
  });
});

// Helper function to detect cycles in dependency graph
function detectCycle(workflow: WorkflowDefinition): boolean {
  const graph = new Map<string, string[]>();

  // Build adjacency list
  workflow.steps.forEach((step) => {
    graph.set(step.id, step.dependsOn || []);
  });

  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycleUtil(stepId: string): boolean {
    if (!visited.has(stepId)) {
      visited.add(stepId);
      recStack.add(stepId);

      const neighbors = graph.get(stepId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleUtil(neighbor)) {
            return true;
          }
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
    }

    recStack.delete(stepId);
    return false;
  }

  for (const stepId of graph.keys()) {
    if (hasCycleUtil(stepId)) {
      return true;
    }
  }

  return false;
}
