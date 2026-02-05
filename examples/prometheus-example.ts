/**
 * Prometheus Metrics Example
 *
 * Shows how to use the Prometheus metrics system
 */

import express from 'express';
import { prometheusMetrics } from '../src/core/prometheus-metrics';
import {
  recordToolExecution,
  recordCacheHit,
  recordCacheMiss,
  recordRateLimitAllowed,
  recordRateLimitBlocked,
  recordLLMRequest,
} from '../src/core/metrics-integration';

const app = express();
const port = 9090;

// ===== Setup Express App with Metrics =====

// Apply HTTP metrics middleware
app.use(prometheusMetrics.httpMiddleware());

// Expose /metrics endpoint for Prometheus scraping
app.get('/metrics', prometheusMetrics.metricsHandler());

// ===== Example API Endpoints =====

app.get('/api/test', async (req, res) => {
  // Simulate tool execution
  const start = Date.now();

  // Simulate some work
  await new Promise(resolve => setTimeout(resolve, Math.random() * 100));

  const duration = Date.now() - start;
  recordToolExecution('test_api_call', duration, 'success');

  res.json({ message: 'Test successful', duration });
});

app.get('/api/cache-test', async (req, res) => {
  // Simulate cache lookup
  const cacheHit = Math.random() > 0.5;

  if (cacheHit) {
    recordCacheHit('llm_responses', 'redis');
    res.json({ message: 'Cache hit!', cached: true });
  } else {
    recordCacheMiss('llm_responses', 'redis');

    // Simulate fetching from source
    await new Promise(resolve => setTimeout(resolve, 100));

    res.json({ message: 'Cache miss, fetched from source', cached: false });
  }
});

app.post('/api/auth/login', async (req, res) => {
  // Simulate rate limiting
  const isAllowed = Math.random() > 0.3;

  if (isAllowed) {
    recordRateLimitAllowed('/api/auth/login', 'normal');
    res.json({ message: 'Login successful' });
  } else {
    recordRateLimitBlocked('/api/auth/login', 'normal', 'user123');
    res.status(429).json({ error: 'Too many requests' });
  }
});

app.post('/api/llm', async (req, res) => {
  // Simulate LLM API call
  const start = Date.now();

  await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));

  const duration = Date.now() - start;
  const inputTokens = Math.floor(Math.random() * 500) + 100;
  const outputTokens = Math.floor(Math.random() * 300) + 50;
  const cost = (inputTokens * 0.00001) + (outputTokens * 0.00003);

  recordLLMRequest('gpt-4', inputTokens, outputTokens, cost, duration, 'success');

  res.json({
    model: 'gpt-4',
    inputTokens,
    outputTokens,
    cost: cost.toFixed(4),
    duration,
  });
});

// ===== Custom Metrics Example =====

app.get('/api/custom-metrics', async (req, res) => {
  // You can also access metrics directly
  prometheusMetrics.toolExecutionTotal.inc({
    tool_name: 'custom_operation',
    status: 'success',
  });

  prometheusMetrics.toolExecutionDuration.observe(
    { tool_name: 'custom_operation', status: 'success' },
    0.123 // seconds
  );

  res.json({ message: 'Custom metrics recorded' });
});

// ===== Metrics JSON Endpoint (for debugging) =====

app.get('/metrics/json', async (req, res) => {
  const metricsJson = await prometheusMetrics.getMetricsJSON();
  res.json(metricsJson);
});

// ===== Start Server =====

app.listen(port, () => {
  console.log(`Prometheus metrics example running on http://localhost:${port}`);
  console.log(`Metrics available at: http://localhost:${port}/metrics`);
  console.log('');
  console.log('Example endpoints:');
  console.log('  GET  /api/test         - Test tool execution metrics');
  console.log('  GET  /api/cache-test   - Test cache metrics');
  console.log('  POST /api/auth/login   - Test rate limit metrics');
  console.log('  POST /api/llm          - Test LLM metrics');
  console.log('  GET  /api/custom-metrics - Custom metrics example');
  console.log('  GET  /metrics/json     - View metrics as JSON');
  console.log('');
  console.log('Generate some traffic:');
  console.log('  while true; do curl http://localhost:9090/api/test; sleep 1; done');
});

// ===== Simulate Background Activity =====

// Simulate periodic tool executions
setInterval(() => {
  const tools = ['fetch_data', 'process_data', 'store_data'];
  const tool = tools[Math.floor(Math.random() * tools.length)];
  const duration = Math.random() * 1000 + 100;
  const status = Math.random() > 0.9 ? 'error' : 'success';

  recordToolExecution(tool, duration, status as 'success' | 'error');
}, 5000);

// Simulate cache operations
setInterval(() => {
  const namespaces = ['llm_responses', 'tool_results', 'user_sessions'];
  const namespace = namespaces[Math.floor(Math.random() * namespaces.length)];

  if (Math.random() > 0.3) {
    recordCacheHit(namespace, 'redis');
  } else {
    recordCacheMiss(namespace, 'redis');
  }
}, 2000);

/**
 * Prometheus Configuration Example
 *
 * Add this to your prometheus.yml:
 *
 * scrape_configs:
 *   - job_name: 'opencell'
 *     scrape_interval: 15s
 *     static_configs:
 *       - targets: ['localhost:9090']
 *         labels:
 *           service: 'opencell'
 *           environment: 'production'
 *
 * Then start Prometheus:
 *   prometheus --config.file=prometheus.yml
 *
 * View metrics:
 *   http://localhost:9090/graph
 *
 * Example queries:
 *   - rate(opencell_tool_execution_total[5m])
 *   - histogram_quantile(0.95, rate(opencell_tool_execution_duration_seconds_bucket[5m]))
 *   - opencell_cache_hits_total / (opencell_cache_hits_total + opencell_cache_misses_total)
 *   - rate(opencell_llm_cost_usd_total[1h])
 */
