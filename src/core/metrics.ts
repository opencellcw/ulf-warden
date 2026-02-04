/**
 * Metrics Collection System
 *
 * Provides Prometheus-compatible metrics for:
 * - Tool execution duration and success rate
 * - Workflow execution metrics
 * - Retry attempts
 * - LLM API costs
 * - System health
 */

interface MetricValue {
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface HistogramBucket {
  le: number; // Less than or equal
  count: number;
}

class Counter {
  private name: string;
  private help: string;
  private values: Map<string, number> = new Map();

  constructor(name: string, help: string) {
    this.name = name;
    this.help = help;
  }

  inc(labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.labelsToKey(labels);
    const current = this.values.get(key) || 0;
    this.values.set(key, current + value);
  }

  get(labels: Record<string, string> = {}): number {
    const key = this.labelsToKey(labels);
    return this.values.get(key) || 0;
  }

  reset(): void {
    this.values.clear();
  }

  toPrometheus(): string {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} counter\n`;

    for (const [key, value] of this.values.entries()) {
      output += `${this.name}${key} ${value}\n`;
    }

    return output;
  }

  private labelsToKey(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    const pairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${pairs}}`;
  }
}

class Histogram {
  private name: string;
  private help: string;
  private buckets: number[];
  private counts: Map<string, HistogramBucket[]> = new Map();
  private sums: Map<string, number> = new Map();

  constructor(name: string, help: string, buckets: number[]) {
    this.name = name;
    this.help = help;
    this.buckets = [...buckets, Infinity].sort((a, b) => a - b);
  }

  observe(value: number, labels: Record<string, string> = {}): void {
    const key = this.labelsToKey(labels);

    // Initialize buckets if not exists
    if (!this.counts.has(key)) {
      this.counts.set(key, this.buckets.map(le => ({ le, count: 0 })));
      this.sums.set(key, 0);
    }

    // Update buckets
    const buckets = this.counts.get(key)!;
    for (const bucket of buckets) {
      if (value <= bucket.le) {
        bucket.count++;
      }
    }

    // Update sum
    const currentSum = this.sums.get(key) || 0;
    this.sums.set(key, currentSum + value);
  }

  reset(): void {
    this.counts.clear();
    this.sums.clear();
  }

  toPrometheus(): string {
    let output = `# HELP ${this.name} ${this.help}\n`;
    output += `# TYPE ${this.name} histogram\n`;

    for (const [key, buckets] of this.counts.entries()) {
      for (const bucket of buckets) {
        const labels = key ? key.slice(0, -1) + `,le="${bucket.le}"}` : `{le="${bucket.le}"}`;
        output += `${this.name}_bucket${labels} ${bucket.count}\n`;
      }

      const sum = this.sums.get(key) || 0;
      const count = buckets[buckets.length - 1].count;

      output += `${this.name}_sum${key} ${sum}\n`;
      output += `${this.name}_count${key} ${count}\n`;
    }

    return output;
  }

  private labelsToKey(labels: Record<string, string>): string {
    if (Object.keys(labels).length === 0) return '';
    const pairs = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `{${pairs}}`;
  }
}

export class MetricsCollector {
  // Tool execution metrics
  private toolExecutionDuration: Histogram;
  private toolExecutionCount: Counter;
  private toolErrorCount: Counter;

  // Retry metrics
  private retryCount: Counter;
  private retrySuccessCount: Counter;

  // Workflow metrics
  private workflowDuration: Histogram;
  private workflowStepCount: Counter;

  // LLM metrics
  private llmTokensInput: Counter;
  private llmTokensOutput: Counter;
  private llmCostUsd: Counter;

  // System metrics
  private activeUsers: Counter;
  private activeTools: Counter;

  constructor() {
    // Tool metrics
    this.toolExecutionDuration = new Histogram(
      'tool_execution_duration_seconds',
      'Duration of tool executions in seconds',
      [0.1, 0.5, 1, 2, 5, 10, 30]
    );

    this.toolExecutionCount = new Counter(
      'tool_execution_total',
      'Total number of tool executions'
    );

    this.toolErrorCount = new Counter(
      'tool_error_total',
      'Total number of tool execution errors'
    );

    // Retry metrics
    this.retryCount = new Counter(
      'retry_attempts_total',
      'Total number of retry attempts'
    );

    this.retrySuccessCount = new Counter(
      'retry_success_total',
      'Total number of successful retries'
    );

    // Workflow metrics
    this.workflowDuration = new Histogram(
      'workflow_duration_seconds',
      'Duration of workflow executions in seconds',
      [1, 5, 10, 30, 60, 300]
    );

    this.workflowStepCount = new Counter(
      'workflow_steps_total',
      'Total number of workflow steps executed'
    );

    // LLM metrics
    this.llmTokensInput = new Counter(
      'llm_tokens_input_total',
      'Total number of input tokens used'
    );

    this.llmTokensOutput = new Counter(
      'llm_tokens_output_total',
      'Total number of output tokens used'
    );

    this.llmCostUsd = new Counter(
      'llm_cost_usd_total',
      'Total LLM cost in USD'
    );

    // System metrics
    this.activeUsers = new Counter(
      'active_users_total',
      'Total number of active users'
    );

    this.activeTools = new Counter(
      'active_tools_total',
      'Total number of active tool executions'
    );
  }

  // Tool execution
  recordToolExecution(toolName: string, durationSeconds: number, status: 'success' | 'error'): void {
    this.toolExecutionDuration.observe(durationSeconds, { tool_name: toolName, status });
    this.toolExecutionCount.inc({ tool_name: toolName, status });

    if (status === 'error') {
      this.toolErrorCount.inc({ tool_name: toolName });
    }
  }

  // Retry
  recordRetryAttempt(toolName: string, attempt: number, success: boolean): void {
    this.retryCount.inc({ tool_name: toolName, attempt: String(attempt) });

    if (success) {
      this.retrySuccessCount.inc({ tool_name: toolName });
    }
  }

  // Workflow
  recordWorkflowExecution(workflowName: string, durationSeconds: number, stepCount: number, status: 'success' | 'error'): void {
    this.workflowDuration.observe(durationSeconds, { workflow_name: workflowName, status });
    this.workflowStepCount.inc({ workflow_name: workflowName }, stepCount);
  }

  // LLM
  recordLLMUsage(model: string, inputTokens: number, outputTokens: number, costUsd: number): void {
    this.llmTokensInput.inc({ model }, inputTokens);
    this.llmTokensOutput.inc({ model }, outputTokens);
    this.llmCostUsd.inc({ model }, costUsd);
  }

  // System
  recordActiveUser(userId: string): void {
    this.activeUsers.inc({ user_id: userId.substring(0, 12) });
  }

  recordActiveTool(toolName: string, active: boolean): void {
    this.activeTools.inc({ tool_name: toolName }, active ? 1 : -1);
  }

  // Export all metrics in Prometheus format
  toPrometheus(): string {
    let output = '';

    output += this.toolExecutionDuration.toPrometheus() + '\n';
    output += this.toolExecutionCount.toPrometheus() + '\n';
    output += this.toolErrorCount.toPrometheus() + '\n';
    output += this.retryCount.toPrometheus() + '\n';
    output += this.retrySuccessCount.toPrometheus() + '\n';
    output += this.workflowDuration.toPrometheus() + '\n';
    output += this.workflowStepCount.toPrometheus() + '\n';
    output += this.llmTokensInput.toPrometheus() + '\n';
    output += this.llmTokensOutput.toPrometheus() + '\n';
    output += this.llmCostUsd.toPrometheus() + '\n';
    output += this.activeUsers.toPrometheus() + '\n';
    output += this.activeTools.toPrometheus() + '\n';

    return output;
  }

  // Reset all metrics
  reset(): void {
    this.toolExecutionDuration.reset();
    this.toolExecutionCount.reset();
    this.toolErrorCount.reset();
    this.retryCount.reset();
    this.retrySuccessCount.reset();
    this.workflowDuration.reset();
    this.workflowStepCount.reset();
    this.llmTokensInput.reset();
    this.llmTokensOutput.reset();
    this.llmCostUsd.reset();
    this.activeUsers.reset();
    this.activeTools.reset();
  }
}

// Singleton instance
export const metrics = new MetricsCollector();
