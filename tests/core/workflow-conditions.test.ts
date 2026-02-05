/**
 * Workflow Conditional Branching Tests
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  ConditionEvaluator,
  BranchResolver,
  ConditionalBranch,
  SwitchBranch,
} from '../../src/core/workflow-conditions';
import { WorkflowContext } from '../../src/core/workflow-manager';

describe('ConditionEvaluator', () => {
  let evaluator: ConditionEvaluator;
  let context: WorkflowContext;

  beforeEach(() => {
    evaluator = new ConditionEvaluator();
    context = {
      userId: 'user123',
      userRequest: 'test request',
      results: new Map([
        ['step1', { value: 42, status: 'success' }],
        ['step2', { value: 100, type: 'premium' }],
      ]),
      errors: new Map(),
      startTime: Date.now(),
    };
  });

  describe('Boolean Literals', () => {
    it('should evaluate true literal', () => {
      const result = evaluator.evaluate('true', context);
      assert.strictEqual(result.matched, true);
      assert.strictEqual(result.error, undefined);
    });

    it('should evaluate false literal', () => {
      const result = evaluator.evaluate('false', context);
      assert.strictEqual(result.matched, false);
      assert.strictEqual(result.error, undefined);
    });
  });

  describe('Comparison Operators', () => {
    it('should evaluate equality (==)', () => {
      const result = evaluator.evaluate('$results.step1.value == 42', context);
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate inequality (!=)', () => {
      const result = evaluator.evaluate('$results.step1.value != 100', context);
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate greater than (>)', () => {
      const result = evaluator.evaluate('$results.step2.value > 50', context);
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate less than (<)', () => {
      const result = evaluator.evaluate('$results.step1.value < 50', context);
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate greater than or equal (>=)', () => {
      const result = evaluator.evaluate('$results.step1.value >= 42', context);
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate less than or equal (<=)', () => {
      const result = evaluator.evaluate('$results.step2.value <= 100', context);
      assert.strictEqual(result.matched, true);
    });
  });

  describe('String Comparisons', () => {
    it('should compare strings', () => {
      const result = evaluator.evaluate('$results.step1.status == "success"', context);
      assert.strictEqual(result.matched, true);
    });

    it('should handle string inequality', () => {
      const result = evaluator.evaluate('$results.step2.type != "basic"', context);
      assert.strictEqual(result.matched, true);
    });
  });

  describe('Logical Operators', () => {
    it('should evaluate AND (&&)', () => {
      const result = evaluator.evaluate(
        '$results.step1.value == 42 && $results.step2.value == 100',
        context
      );
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate OR (||)', () => {
      const result = evaluator.evaluate(
        '$results.step1.value == 50 || $results.step2.value == 100',
        context
      );
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate NOT (!)', () => {
      const result = evaluator.evaluate('!false', context);
      assert.strictEqual(result.matched, true);
    });

    it('should handle complex logical expressions', () => {
      const result = evaluator.evaluate(
        '$results.step1.value > 40 && $results.step2.type == "premium"',
        context
      );
      assert.strictEqual(result.matched, true);
    });
  });

  describe('Function Conditions', () => {
    it('should evaluate function returning true', () => {
      const result = evaluator.evaluate((ctx) => ctx.userId === 'user123', context);
      assert.strictEqual(result.matched, true);
    });

    it('should evaluate function returning false', () => {
      const result = evaluator.evaluate((ctx) => ctx.userId === 'other', context);
      assert.strictEqual(result.matched, false);
    });

    it('should evaluate complex function logic', () => {
      const result = evaluator.evaluate(
        (ctx) => {
          const step1 = ctx.results.get('step1');
          return step1 && step1.value > 40;
        },
        context
      );
      assert.strictEqual(result.matched, true);
    });
  });

  describe('Value Evaluation', () => {
    it('should evaluate value expression', () => {
      const value = evaluator.evaluateValue('$results.step2.type', context);
      assert.strictEqual(value, 'premium');
    });

    it('should evaluate numeric value', () => {
      const value = evaluator.evaluateValue('$results.step1.value', context);
      assert.strictEqual(value, 42);
    });

    it('should evaluate function returning value', () => {
      const value = evaluator.evaluateValue(
        (ctx) => ctx.results.get('step2')?.type,
        context
      );
      assert.strictEqual(value, 'premium');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid context path', () => {
      const result = evaluator.evaluate('$results.nonexistent.value == 42', context);
      // Should not throw, but won't match
      assert.strictEqual(result.matched, false);
    });

    it('should handle function throwing error', () => {
      const result = evaluator.evaluate(() => {
        throw new Error('Test error');
      }, context);

      assert.strictEqual(result.matched, false);
      assert.ok(result.error);
    });
  });
});

describe('BranchResolver', () => {
  let resolver: BranchResolver;
  let context: WorkflowContext;

  beforeEach(() => {
    resolver = new BranchResolver();
    context = {
      userId: 'user123',
      userRequest: 'test request',
      results: new Map([
        ['fetch_user', { status: 'active', type: 'premium' }],
      ]),
      errors: new Map(),
      startTime: Date.now(),
    };
  });

  describe('Conditional Branch', () => {
    it('should resolve to thenSteps when condition is true', () => {
      const branch: ConditionalBranch = {
        type: 'if',
        condition: '$results.fetch_user.status == "active"',
        thenSteps: ['step_a', 'step_b'],
        elseSteps: ['step_c'],
      };

      const steps = resolver.resolveConditional(branch, context);
      assert.deepStrictEqual(steps, ['step_a', 'step_b']);
    });

    it('should resolve to elseSteps when condition is false', () => {
      const branch: ConditionalBranch = {
        type: 'if',
        condition: '$results.fetch_user.status == "inactive"',
        thenSteps: ['step_a'],
        elseSteps: ['step_c', 'step_d'],
      };

      const steps = resolver.resolveConditional(branch, context);
      assert.deepStrictEqual(steps, ['step_c', 'step_d']);
    });

    it('should return empty array when condition is false and no elseSteps', () => {
      const branch: ConditionalBranch = {
        type: 'if',
        condition: 'false',
        thenSteps: ['step_a'],
      };

      const steps = resolver.resolveConditional(branch, context);
      assert.deepStrictEqual(steps, []);
    });

    it('should handle function conditions', () => {
      const branch: ConditionalBranch = {
        type: 'if',
        condition: (ctx) => ctx.userId === 'user123',
        thenSteps: ['authorized_step'],
        elseSteps: ['unauthorized_step'],
      };

      const steps = resolver.resolveConditional(branch, context);
      assert.deepStrictEqual(steps, ['authorized_step']);
    });
  });

  describe('Switch Branch', () => {
    it('should match first case', () => {
      const branch: SwitchBranch = {
        type: 'switch',
        expression: '$results.fetch_user.type',
        cases: [
          { value: 'premium', steps: ['premium_step'] },
          { value: 'basic', steps: ['basic_step'] },
        ],
      };

      const steps = resolver.resolveSwitch(branch, context);
      assert.deepStrictEqual(steps, ['premium_step']);
    });

    it('should match correct case', () => {
      context.results.set('fetch_user', { type: 'basic' });

      const branch: SwitchBranch = {
        type: 'switch',
        expression: '$results.fetch_user.type',
        cases: [
          { value: 'premium', steps: ['premium_step'] },
          { value: 'basic', steps: ['basic_step'] },
        ],
      };

      const steps = resolver.resolveSwitch(branch, context);
      assert.deepStrictEqual(steps, ['basic_step']);
    });

    it('should use default when no case matches', () => {
      context.results.set('fetch_user', { type: 'trial' });

      const branch: SwitchBranch = {
        type: 'switch',
        expression: '$results.fetch_user.type',
        cases: [
          { value: 'premium', steps: ['premium_step'] },
          { value: 'basic', steps: ['basic_step'] },
        ],
        defaultSteps: ['default_step'],
      };

      const steps = resolver.resolveSwitch(branch, context);
      assert.deepStrictEqual(steps, ['default_step']);
    });

    it('should return empty array when no match and no default', () => {
      context.results.set('fetch_user', { type: 'unknown' });

      const branch: SwitchBranch = {
        type: 'switch',
        expression: '$results.fetch_user.type',
        cases: [
          { value: 'premium', steps: ['premium_step'] },
        ],
      };

      const steps = resolver.resolveSwitch(branch, context);
      assert.deepStrictEqual(steps, []);
    });

    it('should handle function expressions', () => {
      const branch: SwitchBranch = {
        type: 'switch',
        expression: (ctx) => ctx.results.get('fetch_user')?.type,
        cases: [
          { value: 'premium', steps: ['premium_step'] },
        ],
      };

      const steps = resolver.resolveSwitch(branch, context);
      assert.deepStrictEqual(steps, ['premium_step']);
    });

    it('should match numeric values', () => {
      context.results.set('calculation', { result: 42 });

      const branch: SwitchBranch = {
        type: 'switch',
        expression: '$results.calculation.result',
        cases: [
          { value: 42, steps: ['answer_step'] },
          { value: 0, steps: ['zero_step'] },
        ],
      };

      const steps = resolver.resolveSwitch(branch, context);
      assert.deepStrictEqual(steps, ['answer_step']);
    });
  });

  describe('Generic Resolve', () => {
    it('should resolve if branch', () => {
      const branch: ConditionalBranch = {
        type: 'if',
        condition: 'true',
        thenSteps: ['step_a'],
      };

      const steps = resolver.resolve(branch, context);
      assert.deepStrictEqual(steps, ['step_a']);
    });

    it('should resolve switch branch', () => {
      const branch: SwitchBranch = {
        type: 'switch',
        expression: '"premium"',
        cases: [
          { value: 'premium', steps: ['premium_step'] },
        ],
      };

      const steps = resolver.resolve(branch, context);
      assert.deepStrictEqual(steps, ['premium_step']);
    });
  });
});
