/**
 * Workflow Conditional Branching System
 *
 * Provides if/else and switch/case logic for workflows
 */

import { WorkflowContext } from './workflow-manager';
import { log } from '../logger';

/**
 * Condition evaluation result
 */
export interface ConditionResult {
  matched: boolean;
  value?: any;
  error?: string;
}

/**
 * If/Else branch definition
 */
export interface ConditionalBranch {
  type: 'if';
  condition: string | ((context: WorkflowContext) => boolean);
  thenSteps: string[]; // Step IDs to execute if true
  elseSteps?: string[]; // Step IDs to execute if false
}

/**
 * Switch/Case branch definition
 */
export interface SwitchBranch {
  type: 'switch';
  expression: string | ((context: WorkflowContext) => any);
  cases: {
    value: any;
    steps: string[]; // Step IDs to execute for this case
  }[];
  defaultSteps?: string[]; // Step IDs to execute if no case matches
}

/**
 * Union type for all branch types
 */
export type BranchDefinition = ConditionalBranch | SwitchBranch;

/**
 * Condition Evaluator
 *
 * Evaluates string expressions and function conditions
 */
export class ConditionEvaluator {
  /**
   * Evaluate a condition (string expression or function)
   */
  evaluate(
    condition: string | ((context: WorkflowContext) => boolean),
    context: WorkflowContext
  ): ConditionResult {
    try {
      let matched: boolean;

      if (typeof condition === 'function') {
        // Direct function evaluation
        matched = condition(context);
      } else {
        // String expression evaluation
        matched = this.evaluateExpression(condition, context);
      }

      return {
        matched,
        value: matched,
      };
    } catch (error: any) {
      log.error('[ConditionEvaluator] Evaluation error', { error, condition });
      return {
        matched: false,
        error: error.message,
      };
    }
  }

  /**
   * Evaluate a value expression (for switch statements)
   */
  evaluateValue(
    expression: string | ((context: WorkflowContext) => any),
    context: WorkflowContext
  ): any {
    try {
      if (typeof expression === 'function') {
        return expression(context);
      } else {
        return this.evaluateExpression(expression, context, true);
      }
    } catch (error: any) {
      log.error('[ConditionEvaluator] Value evaluation error', { error, expression });
      return undefined;
    }
  }

  /**
   * Evaluate a string expression
   */
  private evaluateExpression(
    expr: string,
    context: WorkflowContext,
    returnValue: boolean = false
  ): any {
    // Simple expression parser
    // Supports:
    // - Variable access: $results.stepId.field
    // - Comparisons: ==, !=, >, <, >=, <=
    // - Logical: &&, ||, !
    // - Literals: true, false, numbers, strings

    // Clean up expression
    expr = expr.trim();

    // Handle logical operators
    if (expr.includes('||')) {
      const parts = expr.split('||').map(p => p.trim());
      return parts.some(part => this.evaluateExpression(part, context, returnValue));
    }

    if (expr.includes('&&')) {
      const parts = expr.split('&&').map(p => p.trim());
      return parts.every(part => this.evaluateExpression(part, context, returnValue));
    }

    // Handle negation
    if (expr.startsWith('!')) {
      const inner = expr.slice(1).trim();
      const result = this.evaluateExpression(inner, context, returnValue);
      return returnValue ? result : !result;
    }

    // Handle comparisons
    const comparisonOps = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
    for (const op of comparisonOps) {
      if (expr.includes(op)) {
        const [left, right] = expr.split(op).map(p => p.trim());
        const leftVal = this.resolveValue(left, context);
        const rightVal = this.resolveValue(right, context);

        switch (op) {
          case '===':
          case '==':
            return leftVal === rightVal;
          case '!==':
          case '!=':
            return leftVal !== rightVal;
          case '>':
            return leftVal > rightVal;
          case '<':
            return leftVal < rightVal;
          case '>=':
            return leftVal >= rightVal;
          case '<=':
            return leftVal <= rightVal;
        }
      }
    }

    // No operators - just resolve value
    return this.resolveValue(expr, context);
  }

  /**
   * Resolve a value from context or literal
   */
  private resolveValue(expr: string, context: WorkflowContext): any {
    expr = expr.trim();

    // Boolean literals
    if (expr === 'true') return true;
    if (expr === 'false') return false;

    // Null/undefined
    if (expr === 'null') return null;
    if (expr === 'undefined') return undefined;

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }

    // String literal (quoted)
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Context variable access
    if (expr.startsWith('$')) {
      return this.resolveContextVariable(expr, context);
    }

    // If we get here, treat as string literal
    return expr;
  }

  /**
   * Resolve a context variable like $results.stepId.field
   */
  private resolveContextVariable(path: string, context: WorkflowContext): any {
    // Remove leading $
    path = path.slice(1);

    const parts = path.split('.');
    let current: any = context;

    for (const part of parts) {
      if (current instanceof Map) {
        current = current.get(part);
      } else if (typeof current === 'object' && current !== null) {
        current = current[part];
      } else {
        return undefined;
      }

      if (current === undefined) {
        return undefined;
      }
    }

    return current;
  }
}

/**
 * Branch Resolver
 *
 * Determines which steps to execute based on branch conditions
 */
export class BranchResolver {
  private evaluator: ConditionEvaluator;

  constructor() {
    this.evaluator = new ConditionEvaluator();
  }

  /**
   * Resolve a conditional branch
   */
  resolveConditional(
    branch: ConditionalBranch,
    context: WorkflowContext
  ): string[] {
    const result = this.evaluator.evaluate(branch.condition, context);

    if (result.error) {
      log.error('[BranchResolver] Condition evaluation failed', {
        error: result.error,
        branch: branch.condition,
      });
      // Default to else branch on error
      return branch.elseSteps || [];
    }

    log.debug('[BranchResolver] Conditional branch resolved', {
      matched: result.matched,
      thenSteps: branch.thenSteps.length,
      elseSteps: branch.elseSteps?.length || 0,
    });

    return result.matched ? branch.thenSteps : (branch.elseSteps || []);
  }

  /**
   * Resolve a switch branch
   */
  resolveSwitch(
    branch: SwitchBranch,
    context: WorkflowContext
  ): string[] {
    const value = this.evaluator.evaluateValue(branch.expression, context);

    log.debug('[BranchResolver] Switch expression evaluated', {
      value,
      cases: branch.cases.length,
    });

    // Find matching case
    for (const caseOption of branch.cases) {
      if (this.valuesEqual(value, caseOption.value)) {
        log.debug('[BranchResolver] Switch case matched', {
          value,
          caseValue: caseOption.value,
          steps: caseOption.steps.length,
        });
        return caseOption.steps;
      }
    }

    // No match - use default
    log.debug('[BranchResolver] No switch case matched, using default', {
      value,
      defaultSteps: branch.defaultSteps?.length || 0,
    });

    return branch.defaultSteps || [];
  }

  /**
   * Resolve any branch type
   */
  resolve(branch: BranchDefinition, context: WorkflowContext): string[] {
    if (branch.type === 'if') {
      return this.resolveConditional(branch, context);
    } else if (branch.type === 'switch') {
      return this.resolveSwitch(branch, context);
    }

    log.error('[BranchResolver] Unknown branch type', { type: (branch as any).type });
    return [];
  }

  /**
   * Compare two values for equality
   */
  private valuesEqual(a: any, b: any): boolean {
    // Handle null/undefined
    if (a === null || a === undefined) {
      return a === b;
    }

    // Handle primitives
    if (typeof a !== 'object') {
      return a === b;
    }

    // Handle arrays
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((val, idx) => this.valuesEqual(val, b[idx]));
    }

    // Handle objects
    if (typeof b === 'object' && b !== null) {
      const aKeys = Object.keys(a);
      const bKeys = Object.keys(b);

      if (aKeys.length !== bKeys.length) return false;

      return aKeys.every(key =>
        bKeys.includes(key) && this.valuesEqual(a[key], b[key])
      );
    }

    return false;
  }
}

// Singleton instances
export const conditionEvaluator = new ConditionEvaluator();
export const branchResolver = new BranchResolver();
