/**
 * Lightweight Workflow Validation Tests
 *
 * Tests workflow structure without executing them
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

describe('Workflow Structure Validation', () => {
  const workflows = [
    { name: 'code_review', workflow: codeReviewWorkflow, minSteps: 5 },
    { name: 'testing_pipeline', workflow: testingWorkflow, minSteps: 8 },
    { name: 'documentation_generation', workflow: documentationWorkflow, minSteps: 10 },
    { name: 'analytics_reporting', workflow: analyticsWorkflow, minSteps: 10 },
    { name: 'comprehensive_backup', workflow: backupWorkflow, minSteps: 15 },
  ];

  workflows.forEach(({ name, workflow, minSteps }) => {
    describe(`${name} workflow`, () => {
      it('should have valid structure', () => {
        assert.ok(workflow.name);
        assert.ok(workflow.description);
        assert.ok(Array.isArray(workflow.steps));
        assert.ok(workflow.steps.length >= minSteps);
      });

      it('should have unique step IDs', () => {
        const ids = workflow.steps.map(s => s.id);
        const uniqueIds = new Set(ids);
        assert.strictEqual(ids.length, uniqueIds.size);
      });

      it('should have valid dependencies', () => {
        const stepIds = new Set(workflow.steps.map(s => s.id));
        workflow.steps.forEach(step => {
          if (step.dependsOn) {
            step.dependsOn.forEach(depId => {
              assert.ok(stepIds.has(depId), `Dependency ${depId} not found`);
            });
          }
        });
      });

      it('should have timeout configured', () => {
        assert.ok(workflow.maxDuration);
        assert.ok(workflow.maxDuration > 0);
      });
    });
  });

  it('all workflows should be unique', () => {
    const names = workflows.map(w => w.workflow.name);
    const uniqueNames = new Set(names);
    assert.strictEqual(names.length, uniqueNames.size);
  });
});
