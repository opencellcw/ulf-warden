/**
 * Prometheus Metrics Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { PrometheusMetrics } from '../../src/core/prometheus-metrics';
import {
  recordToolExecution,
  recordRetryAttempt,
  recordWorkflowExecution,
  recordWorkflowError,
  recordCacheHit,
  recordCacheMiss,
  recordCacheSet,
  recordRateLimitAllowed,
  recordRateLimitBlocked,
  recordLLMRequest,
  resetAllMetrics,
} from '../../src/core/metrics-integration';

describe('PrometheusMetrics', () => {
  let metrics: PrometheusMetrics;

  beforeEach(() => {
    metrics = new PrometheusMetrics('test_');
  });

  afterEach(() => {
    metrics.resetMetrics();
  });

  describe('Tool Execution Metrics', () => {
    it('should record tool execution duration', async () => {
      metrics.toolExecutionDuration.observe({ tool_name: 'test_tool', status: 'success' }, 1.5);

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_tool_execution_duration_seconds'));
      assert.ok(metricsOutput.includes('tool_name="test_tool"'));
      assert.ok(metricsOutput.includes('status="success"'));
    });

    it('should count tool executions', async () => {
      metrics.toolExecutionTotal.inc({ tool_name: 'test_tool', status: 'success' });
      metrics.toolExecutionTotal.inc({ tool_name: 'test_tool', status: 'success' });
      metrics.toolExecutionTotal.inc({ tool_name: 'test_tool', status: 'error' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_tool_execution_total'));
    });

    it('should count tool errors', async () => {
      metrics.toolErrorTotal.inc({ tool_name: 'test_tool', error_type: 'timeout' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_tool_error_total'));
      assert.ok(metricsOutput.includes('error_type="timeout"'));
    });
  });

  describe('Retry Metrics', () => {
    it('should count retry attempts', async () => {
      metrics.retryAttemptsTotal.inc({ tool_name: 'test_tool', attempt: '1' });
      metrics.retryAttemptsTotal.inc({ tool_name: 'test_tool', attempt: '2' });
      metrics.retryAttemptsTotal.inc({ tool_name: 'test_tool', attempt: '3' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_retry_attempts_total'));
    });

    it('should count successful retries', async () => {
      metrics.retrySuccessTotal.inc({ tool_name: 'test_tool' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_retry_success_total'));
    });
  });

  describe('Workflow Metrics', () => {
    it('should record workflow duration', async () => {
      metrics.workflowDuration.observe(
        { workflow_name: 'test_workflow', status: 'success' },
        45.2
      );

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_workflow_duration_seconds'));
      assert.ok(metricsOutput.includes('workflow_name="test_workflow"'));
    });

    it('should count workflow steps', async () => {
      metrics.workflowStepsTotal.inc({ workflow_name: 'test_workflow' }, 5);

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_workflow_steps_total'));
    });

    it('should count workflow errors', async () => {
      metrics.workflowErrorsTotal.inc({
        workflow_name: 'test_workflow',
        step_id: 'step1',
      });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_workflow_errors_total'));
    });
  });

  describe('Cache Metrics', () => {
    it('should count cache hits', async () => {
      metrics.cacheHitsTotal.inc({ namespace: 'llm_responses', provider: 'redis' });
      metrics.cacheHitsTotal.inc({ namespace: 'llm_responses', provider: 'redis' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_cache_hits_total'));
      assert.ok(metricsOutput.includes('namespace="llm_responses"'));
      assert.ok(metricsOutput.includes('provider="redis"'));
    });

    it('should count cache misses', async () => {
      metrics.cacheMissesTotal.inc({ namespace: 'llm_responses', provider: 'redis' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_cache_misses_total'));
    });

    it('should record cache operation duration', async () => {
      metrics.cacheOperationDuration.observe(
        { operation: 'set', namespace: 'llm_responses', provider: 'redis' },
        0.005
      );

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_cache_operation_duration_seconds'));
      assert.ok(metricsOutput.includes('operation="set"'));
    });

    it('should track cache size', async () => {
      metrics.cacheSize.set({ namespace: 'llm_responses', provider: 'memory' }, 1024000);

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_cache_size_bytes'));
    });

    it('should count cache evictions', async () => {
      metrics.cacheEvictionsTotal.inc({
        namespace: 'llm_responses',
        provider: 'memory',
        reason: 'maxsize',
      });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_cache_evictions_total'));
      assert.ok(metricsOutput.includes('reason="maxsize"'));
    });
  });

  describe('Rate Limiter Metrics', () => {
    it('should count rate limit requests', async () => {
      metrics.rateLimitRequestsTotal.inc({ endpoint: '/api/test', result: 'allowed' });
      metrics.rateLimitRequestsTotal.inc({ endpoint: '/api/test', result: 'blocked' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_rate_limit_requests_total'));
    });

    it('should count blocked requests', async () => {
      metrics.rateLimitBlockedTotal.inc({
        endpoint: '/api/auth/login',
        user_type: 'normal',
      });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_rate_limit_blocked_total'));
      assert.ok(metricsOutput.includes('endpoint="/api/auth/login"'));
    });

    it('should count allowed requests', async () => {
      metrics.rateLimitAllowedTotal.inc({
        endpoint: '/api/search',
        user_type: 'premium',
      });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_rate_limit_allowed_total'));
      assert.ok(metricsOutput.includes('user_type="premium"'));
    });
  });

  describe('LLM Metrics', () => {
    it('should count LLM requests', async () => {
      metrics.llmRequestsTotal.inc({ model: 'gpt-4', status: 'success' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_llm_requests_total'));
      assert.ok(metricsOutput.includes('model="gpt-4"'));
    });

    it('should count tokens', async () => {
      metrics.llmTokensInput.inc({ model: 'gpt-4' }, 100);
      metrics.llmTokensOutput.inc({ model: 'gpt-4' }, 50);

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_llm_tokens_input_total'));
      assert.ok(metricsOutput.includes('test_llm_tokens_output_total'));
    });

    it('should track LLM costs', async () => {
      metrics.llmCostUsd.inc({ model: 'gpt-4' }, 0.002);

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_llm_cost_usd_total'));
    });

    it('should record LLM latency', async () => {
      metrics.llmLatency.observe({ model: 'gpt-4' }, 2.5);

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_llm_latency_seconds'));
    });
  });

  describe('HTTP Metrics', () => {
    it('should count HTTP requests', async () => {
      metrics.httpRequestsTotal.inc({ method: 'GET', path: '/api/test', status: '200' });

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_http_requests_total'));
      assert.ok(metricsOutput.includes('method="GET"'));
      assert.ok(metricsOutput.includes('status="200"'));
    });

    it('should record HTTP request duration', async () => {
      metrics.httpRequestDuration.observe(
        { method: 'POST', path: '/api/test', status: '201' },
        0.15
      );

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_http_request_duration_seconds'));
    });

    it('should record HTTP response size', async () => {
      metrics.httpResponseSize.observe(
        { method: 'GET', path: '/api/test', status: '200' },
        5000
      );

      const metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.includes('test_http_response_size_bytes'));
    });
  });

  describe('Default System Metrics', () => {
    it('should include Node.js process metrics', async () => {
      const metricsOutput = await metrics.register.metrics();

      // Check for default Node.js metrics (with test_ prefix)
      assert.ok(
        metricsOutput.includes('test_process_cpu') || metricsOutput.includes('process_cpu')
      );
      assert.ok(
        metricsOutput.includes('test_nodejs') || metricsOutput.includes('nodejs')
      );
      // At least one process metric should be present
      assert.ok(metricsOutput.includes('process_'));
    });
  });

  describe('Metrics Format', () => {
    it('should export metrics in Prometheus format', async () => {
      metrics.toolExecutionTotal.inc({ tool_name: 'test_tool', status: 'success' });

      const metricsOutput = await metrics.register.metrics();

      // Check HELP and TYPE lines
      assert.ok(metricsOutput.includes('# HELP'));
      assert.ok(metricsOutput.includes('# TYPE'));

      // Check metric value line
      assert.ok(/test_tool_execution_total.*\d+/.test(metricsOutput));
    });

    it('should handle labels correctly', async () => {
      metrics.toolExecutionTotal.inc({ tool_name: 'tool1', status: 'success' });
      metrics.toolExecutionTotal.inc({ tool_name: 'tool2', status: 'error' });

      const metricsOutput = await metrics.register.metrics();

      // Should have separate lines for different label values
      assert.ok(metricsOutput.includes('tool_name="tool1"'));
      assert.ok(metricsOutput.includes('tool_name="tool2"'));
      assert.ok(metricsOutput.includes('status="success"'));
      assert.ok(metricsOutput.includes('status="error"'));
    });
  });

  describe('Metrics Integration Helpers', () => {
    beforeEach(() => {
      resetAllMetrics();
    });

    it('should record tool execution via helper', async () => {
      recordToolExecution('test_tool', 1500, 'success');

      const metricsJson = await metrics.register.getMetricsAsJSON();
      const toolMetric = metricsJson.find((m: any) =>
        m.name.includes('tool_execution_total')
      );

      assert.ok(toolMetric);
    });

    it('should record retry attempt via helper', async () => {
      recordRetryAttempt('test_tool', 2, true);

      const metricsJson = await metrics.register.getMetricsAsJSON();
      const retryMetric = metricsJson.find((m: any) => m.name.includes('retry_attempts_total'));

      assert.ok(retryMetric);
    });

    it('should record workflow execution via helper', async () => {
      recordWorkflowExecution('test_workflow', 5000, 10, 'success');

      const metricsJson = await metrics.register.getMetricsAsJSON();
      const workflowMetric = metricsJson.find((m: any) =>
        m.name.includes('workflow_duration_seconds')
      );

      assert.ok(workflowMetric);
    });

    it('should record cache hit via helper', async () => {
      recordCacheHit('llm_responses', 'redis');

      const metricsJson = await metrics.register.getMetricsAsJSON();
      const cacheMetric = metricsJson.find((m: any) => m.name.includes('cache_hits_total'));

      assert.ok(cacheMetric);
    });

    it('should record rate limit via helper', async () => {
      recordRateLimitAllowed('/api/test', 'normal');
      recordRateLimitBlocked('/api/auth/login', 'normal', 'user123');

      const metricsJson = await metrics.register.getMetricsAsJSON();
      const rateLimitMetric = metricsJson.find((m: any) =>
        m.name.includes('rate_limit_requests_total')
      );

      assert.ok(rateLimitMetric);
    });

    it('should record LLM request via helper', async () => {
      recordLLMRequest('gpt-4', 100, 50, 0.002, 2500, 'success');

      const metricsJson = await metrics.register.getMetricsAsJSON();
      const llmMetric = metricsJson.find((m: any) => m.name.includes('llm_requests_total'));

      assert.ok(llmMetric);
    });
  });

  describe('Metrics Reset', () => {
    it('should reset all metrics', async () => {
      metrics.toolExecutionTotal.inc({ tool_name: 'test_tool', status: 'success' });
      metrics.cacheHitsTotal.inc({ namespace: 'test', provider: 'redis' });

      let metricsOutput = await metrics.register.metrics();
      assert.ok(metricsOutput.length > 0);

      metrics.resetMetrics();

      metricsOutput = await metrics.register.metrics();
      // After reset, only HELP and TYPE comments should remain
      assert.ok(metricsOutput.includes('# HELP'));
    });
  });
});
