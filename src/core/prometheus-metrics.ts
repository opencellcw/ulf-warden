/**
 * Prometheus Metrics with prom-client
 *
 * Comprehensive metrics collection for:
 * - Tool execution (duration, success rate, errors)
 * - Workflow execution
 * - Retry attempts
 * - Cache performance (hits, misses, latency)
 * - Rate limiting (requests, blocks, limits)
 * - LLM usage (tokens, costs)
 * - System resources (CPU, memory, event loop)
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';
import { Request, Response } from 'express';
import { log } from '../logger';

export class PrometheusMetrics {
  public readonly register: Registry;

  // Tool execution metrics
  public readonly toolExecutionDuration: Histogram;
  public readonly toolExecutionTotal: Counter;
  public readonly toolErrorTotal: Counter;

  // Retry metrics
  public readonly retryAttemptsTotal: Counter;
  public readonly retrySuccessTotal: Counter;

  // Workflow metrics
  public readonly workflowDuration: Histogram;
  public readonly workflowStepsTotal: Counter;
  public readonly workflowErrorsTotal: Counter;

  // Cache metrics
  public readonly cacheHitsTotal: Counter;
  public readonly cacheMissesTotal: Counter;
  public readonly cacheSetTotal: Counter;
  public readonly cacheDeleteTotal: Counter;
  public readonly cacheOperationDuration: Histogram;
  public readonly cacheSize: Gauge;
  public readonly cacheEvictionsTotal: Counter;

  // Rate limiter metrics
  public readonly rateLimitRequestsTotal: Counter;
  public readonly rateLimitBlockedTotal: Counter;
  public readonly rateLimitAllowedTotal: Counter;
  public readonly rateLimitByEndpoint: Counter;
  public readonly rateLimitByUser: Counter;

  // LLM metrics
  public readonly llmRequestsTotal: Counter;
  public readonly llmTokensInput: Counter;
  public readonly llmTokensOutput: Counter;
  public readonly llmCostUsd: Counter;
  public readonly llmLatency: Histogram;

  // HTTP metrics
  public readonly httpRequestsTotal: Counter;
  public readonly httpRequestDuration: Histogram;
  public readonly httpResponseSize: Histogram;

  // System metrics (collected automatically by prom-client)
  // - process_cpu_user_seconds_total
  // - process_cpu_system_seconds_total
  // - process_heap_bytes
  // - process_resident_memory_bytes
  // - nodejs_eventloop_lag_seconds
  // - nodejs_active_handles_total
  // - nodejs_active_requests_total

  constructor(prefix: string = 'opencell_') {
    this.register = new Registry();

    // Enable default Node.js metrics (CPU, memory, event loop)
    collectDefaultMetrics({
      register: this.register,
      prefix,
    });

    // ===== Tool Execution Metrics =====
    this.toolExecutionDuration = new Histogram({
      name: `${prefix}tool_execution_duration_seconds`,
      help: 'Duration of tool executions in seconds',
      labelNames: ['tool_name', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.register],
    });

    this.toolExecutionTotal = new Counter({
      name: `${prefix}tool_execution_total`,
      help: 'Total number of tool executions',
      labelNames: ['tool_name', 'status'],
      registers: [this.register],
    });

    this.toolErrorTotal = new Counter({
      name: `${prefix}tool_error_total`,
      help: 'Total number of tool execution errors',
      labelNames: ['tool_name', 'error_type'],
      registers: [this.register],
    });

    // ===== Retry Metrics =====
    this.retryAttemptsTotal = new Counter({
      name: `${prefix}retry_attempts_total`,
      help: 'Total number of retry attempts',
      labelNames: ['tool_name', 'attempt'],
      registers: [this.register],
    });

    this.retrySuccessTotal = new Counter({
      name: `${prefix}retry_success_total`,
      help: 'Total number of successful retries',
      labelNames: ['tool_name'],
      registers: [this.register],
    });

    // ===== Workflow Metrics =====
    this.workflowDuration = new Histogram({
      name: `${prefix}workflow_duration_seconds`,
      help: 'Duration of workflow executions in seconds',
      labelNames: ['workflow_name', 'status'],
      buckets: [1, 5, 10, 30, 60, 120, 300, 600],
      registers: [this.register],
    });

    this.workflowStepsTotal = new Counter({
      name: `${prefix}workflow_steps_total`,
      help: 'Total number of workflow steps executed',
      labelNames: ['workflow_name'],
      registers: [this.register],
    });

    this.workflowErrorsTotal = new Counter({
      name: `${prefix}workflow_errors_total`,
      help: 'Total number of workflow errors',
      labelNames: ['workflow_name', 'step_id'],
      registers: [this.register],
    });

    // ===== Cache Metrics =====
    this.cacheHitsTotal = new Counter({
      name: `${prefix}cache_hits_total`,
      help: 'Total number of cache hits',
      labelNames: ['namespace', 'provider'],
      registers: [this.register],
    });

    this.cacheMissesTotal = new Counter({
      name: `${prefix}cache_misses_total`,
      help: 'Total number of cache misses',
      labelNames: ['namespace', 'provider'],
      registers: [this.register],
    });

    this.cacheSetTotal = new Counter({
      name: `${prefix}cache_set_total`,
      help: 'Total number of cache set operations',
      labelNames: ['namespace', 'provider'],
      registers: [this.register],
    });

    this.cacheDeleteTotal = new Counter({
      name: `${prefix}cache_delete_total`,
      help: 'Total number of cache delete operations',
      labelNames: ['namespace', 'provider'],
      registers: [this.register],
    });

    this.cacheOperationDuration = new Histogram({
      name: `${prefix}cache_operation_duration_seconds`,
      help: 'Duration of cache operations in seconds',
      labelNames: ['operation', 'namespace', 'provider'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.register],
    });

    this.cacheSize = new Gauge({
      name: `${prefix}cache_size_bytes`,
      help: 'Current cache size in bytes',
      labelNames: ['namespace', 'provider'],
      registers: [this.register],
    });

    this.cacheEvictionsTotal = new Counter({
      name: `${prefix}cache_evictions_total`,
      help: 'Total number of cache evictions',
      labelNames: ['namespace', 'provider', 'reason'],
      registers: [this.register],
    });

    // ===== Rate Limiter Metrics =====
    this.rateLimitRequestsTotal = new Counter({
      name: `${prefix}rate_limit_requests_total`,
      help: 'Total number of rate limit checks',
      labelNames: ['endpoint', 'result'],
      registers: [this.register],
    });

    this.rateLimitBlockedTotal = new Counter({
      name: `${prefix}rate_limit_blocked_total`,
      help: 'Total number of blocked requests',
      labelNames: ['endpoint', 'user_type'],
      registers: [this.register],
    });

    this.rateLimitAllowedTotal = new Counter({
      name: `${prefix}rate_limit_allowed_total`,
      help: 'Total number of allowed requests',
      labelNames: ['endpoint', 'user_type'],
      registers: [this.register],
    });

    this.rateLimitByEndpoint = new Counter({
      name: `${prefix}rate_limit_by_endpoint_total`,
      help: 'Rate limit checks by endpoint',
      labelNames: ['endpoint'],
      registers: [this.register],
    });

    this.rateLimitByUser = new Counter({
      name: `${prefix}rate_limit_by_user_total`,
      help: 'Rate limit checks by user',
      labelNames: ['user_id'],
      registers: [this.register],
    });

    // ===== LLM Metrics =====
    this.llmRequestsTotal = new Counter({
      name: `${prefix}llm_requests_total`,
      help: 'Total number of LLM API requests',
      labelNames: ['model', 'status'],
      registers: [this.register],
    });

    this.llmTokensInput = new Counter({
      name: `${prefix}llm_tokens_input_total`,
      help: 'Total number of input tokens used',
      labelNames: ['model'],
      registers: [this.register],
    });

    this.llmTokensOutput = new Counter({
      name: `${prefix}llm_tokens_output_total`,
      help: 'Total number of output tokens used',
      labelNames: ['model'],
      registers: [this.register],
    });

    this.llmCostUsd = new Counter({
      name: `${prefix}llm_cost_usd_total`,
      help: 'Total LLM cost in USD',
      labelNames: ['model'],
      registers: [this.register],
    });

    this.llmLatency = new Histogram({
      name: `${prefix}llm_latency_seconds`,
      help: 'LLM request latency in seconds',
      labelNames: ['model'],
      buckets: [0.5, 1, 2, 5, 10, 20, 30, 60],
      registers: [this.register],
    });

    // ===== HTTP Metrics =====
    this.httpRequestsTotal = new Counter({
      name: `${prefix}http_requests_total`,
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.register],
    });

    this.httpRequestDuration = new Histogram({
      name: `${prefix}http_request_duration_seconds`,
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });

    this.httpResponseSize = new Histogram({
      name: `${prefix}http_response_size_bytes`,
      help: 'HTTP response size in bytes',
      labelNames: ['method', 'path', 'status'],
      buckets: [100, 1000, 10000, 100000, 1000000],
      registers: [this.register],
    });

    log.info('[PrometheusMetrics] Initialized', {
      metricsCount: this.register.getMetricsAsArray().length,
    });
  }

  /**
   * Express middleware to collect HTTP metrics
   */
  httpMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const start = Date.now();

      // Track response
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const status = String(res.statusCode);
        const path = this.normalizePath(req.path);

        this.httpRequestsTotal.inc({
          method: req.method,
          path,
          status,
        });

        this.httpRequestDuration.observe(
          {
            method: req.method,
            path,
            status,
          },
          duration
        );

        const contentLength = res.getHeader('content-length');
        if (contentLength) {
          this.httpResponseSize.observe(
            {
              method: req.method,
              path,
              status,
            },
            Number(contentLength)
          );
        }
      });

      next();
    };
  }

  /**
   * Express route handler for /metrics endpoint
   */
  metricsHandler() {
    return async (req: Request, res: Response) => {
      try {
        res.set('Content-Type', this.register.contentType);
        const metrics = await this.register.metrics();
        res.send(metrics);
      } catch (error) {
        log.error('[PrometheusMetrics] Error getting metrics', { error });
        res.status(500).send('Error collecting metrics');
      }
    };
  }

  /**
   * Get metrics as JSON (for debugging)
   */
  async getMetricsJSON() {
    return await this.register.getMetricsAsJSON();
  }

  /**
   * Reset all metrics (for testing)
   */
  resetMetrics(): void {
    this.register.resetMetrics();
    log.info('[PrometheusMetrics] Metrics reset');
  }

  /**
   * Normalize path for metrics (remove IDs, limit cardinality)
   */
  private normalizePath(path: string): string {
    // Replace UUIDs with :id
    path = path.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id'
    );

    // Replace numeric IDs with :id
    path = path.replace(/\/\d+/g, '/:id');

    // Limit to first 3 path segments to avoid cardinality explosion
    const segments = path.split('/').slice(0, 4);
    return segments.join('/') || '/';
  }
}

// Singleton instance
export const prometheusMetrics = new PrometheusMetrics();

// Export for easy integration
export { Registry, Counter, Histogram, Gauge } from 'prom-client';
