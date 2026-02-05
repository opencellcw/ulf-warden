/**
 * Metrics Integration Helpers
 *
 * Provides easy-to-use functions for collecting metrics from various systems
 */

import { prometheusMetrics } from './prometheus-metrics';
import { log } from '../logger';

/**
 * Tool execution metrics wrapper
 */
export function recordToolExecution(
  toolName: string,
  durationMs: number,
  status: 'success' | 'error',
  errorType?: string
): void {
  const durationSeconds = durationMs / 1000;

  prometheusMetrics.toolExecutionDuration.observe({ tool_name: toolName, status }, durationSeconds);
  prometheusMetrics.toolExecutionTotal.inc({ tool_name: toolName, status });

  if (status === 'error' && errorType) {
    prometheusMetrics.toolErrorTotal.inc({ tool_name: toolName, error_type: errorType });
  }

  log.debug('[Metrics] Tool execution recorded', {
    toolName,
    durationMs,
    status,
  });
}

/**
 * Retry metrics wrapper
 */
export function recordRetryAttempt(
  toolName: string,
  attempt: number,
  success: boolean
): void {
  prometheusMetrics.retryAttemptsTotal.inc({
    tool_name: toolName,
    attempt: String(attempt),
  });

  if (success) {
    prometheusMetrics.retrySuccessTotal.inc({ tool_name: toolName });
  }

  log.debug('[Metrics] Retry attempt recorded', {
    toolName,
    attempt,
    success,
  });
}

/**
 * Workflow metrics wrapper
 */
export function recordWorkflowExecution(
  workflowName: string,
  durationMs: number,
  stepCount: number,
  status: 'success' | 'error'
): void {
  const durationSeconds = durationMs / 1000;

  prometheusMetrics.workflowDuration.observe(
    { workflow_name: workflowName, status },
    durationSeconds
  );

  prometheusMetrics.workflowStepsTotal.inc({ workflow_name: workflowName }, stepCount);

  log.debug('[Metrics] Workflow execution recorded', {
    workflowName,
    durationMs,
    stepCount,
    status,
  });
}

/**
 * Workflow step error
 */
export function recordWorkflowError(workflowName: string, stepId: string): void {
  prometheusMetrics.workflowErrorsTotal.inc({
    workflow_name: workflowName,
    step_id: stepId,
  });
}

/**
 * Cache hit metrics
 */
export function recordCacheHit(namespace: string, provider: 'redis' | 'memory'): void {
  prometheusMetrics.cacheHitsTotal.inc({ namespace, provider });
}

/**
 * Cache miss metrics
 */
export function recordCacheMiss(namespace: string, provider: 'redis' | 'memory'): void {
  prometheusMetrics.cacheMissesTotal.inc({ namespace, provider });
}

/**
 * Cache set operation
 */
export function recordCacheSet(
  namespace: string,
  provider: 'redis' | 'memory',
  durationMs: number
): void {
  prometheusMetrics.cacheSetTotal.inc({ namespace, provider });
  prometheusMetrics.cacheOperationDuration.observe(
    { operation: 'set', namespace, provider },
    durationMs / 1000
  );
}

/**
 * Cache delete operation
 */
export function recordCacheDelete(
  namespace: string,
  provider: 'redis' | 'memory',
  durationMs: number
): void {
  prometheusMetrics.cacheDeleteTotal.inc({ namespace, provider });
  prometheusMetrics.cacheOperationDuration.observe(
    { operation: 'delete', namespace, provider },
    durationMs / 1000
  );
}

/**
 * Cache eviction
 */
export function recordCacheEviction(
  namespace: string,
  provider: 'redis' | 'memory',
  reason: 'ttl' | 'maxsize' | 'manual'
): void {
  prometheusMetrics.cacheEvictionsTotal.inc({ namespace, provider, reason });
}

/**
 * Update cache size gauge
 */
export function updateCacheSize(
  namespace: string,
  provider: 'redis' | 'memory',
  sizeBytes: number
): void {
  prometheusMetrics.cacheSize.set({ namespace, provider }, sizeBytes);
}

/**
 * Rate limit request (allowed)
 */
export function recordRateLimitAllowed(
  endpoint: string,
  userType: 'normal' | 'premium' | 'admin'
): void {
  prometheusMetrics.rateLimitRequestsTotal.inc({ endpoint, result: 'allowed' });
  prometheusMetrics.rateLimitAllowedTotal.inc({ endpoint, user_type: userType });
  prometheusMetrics.rateLimitByEndpoint.inc({ endpoint });
}

/**
 * Rate limit request (blocked)
 */
export function recordRateLimitBlocked(
  endpoint: string,
  userType: 'normal' | 'premium' | 'admin',
  userId?: string
): void {
  prometheusMetrics.rateLimitRequestsTotal.inc({ endpoint, result: 'blocked' });
  prometheusMetrics.rateLimitBlockedTotal.inc({ endpoint, user_type: userType });
  prometheusMetrics.rateLimitByEndpoint.inc({ endpoint });

  if (userId) {
    // Mask user ID to limit cardinality
    const maskedUserId = userId.substring(0, 8) + '...';
    prometheusMetrics.rateLimitByUser.inc({ user_id: maskedUserId });
  }
}

/**
 * LLM request metrics
 */
export function recordLLMRequest(
  model: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  durationMs: number,
  status: 'success' | 'error'
): void {
  prometheusMetrics.llmRequestsTotal.inc({ model, status });
  prometheusMetrics.llmTokensInput.inc({ model }, inputTokens);
  prometheusMetrics.llmTokensOutput.inc({ model }, outputTokens);
  prometheusMetrics.llmCostUsd.inc({ model }, costUsd);
  prometheusMetrics.llmLatency.observe({ model }, durationMs / 1000);

  log.debug('[Metrics] LLM request recorded', {
    model,
    inputTokens,
    outputTokens,
    costUsd,
    durationMs,
    status,
  });
}

/**
 * Measure async function and record metrics
 */
export async function measureAsync<T>(
  metricName: string,
  labels: Record<string, string>,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = (Date.now() - start) / 1000;

    // Record success
    log.debug('[Metrics] Async operation completed', {
      metricName,
      durationMs: duration * 1000,
    });

    return result;
  } catch (error) {
    const duration = (Date.now() - start) / 1000;

    // Record error
    log.error('[Metrics] Async operation failed', {
      metricName,
      durationMs: duration * 1000,
      error,
    });

    throw error;
  }
}

/**
 * Get current metrics summary (for debugging)
 */
export async function getMetricsSummary(): Promise<any> {
  return await prometheusMetrics.getMetricsJSON();
}

/**
 * Reset all metrics (for testing)
 */
export function resetAllMetrics(): void {
  prometheusMetrics.resetMetrics();
  log.info('[Metrics] All metrics reset');
}
