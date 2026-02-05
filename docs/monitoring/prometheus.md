

# Prometheus Metrics

Comprehensive metrics collection system using the industry-standard Prometheus format. Enables real-time monitoring, alerting, and performance analysis.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Available Metrics](#available-metrics)
- [Integration](#integration)
- [Prometheus Setup](#prometheus-setup)
- [Grafana Dashboards](#grafana-dashboards)
- [Best Practices](#best-practices)

## Overview

The Prometheus metrics system provides:

- **Automatic HTTP metrics** (requests, duration, response size)
- **System metrics** (CPU, memory, event loop lag)
- **Tool execution metrics** (duration, success rate, errors)
- **Cache metrics** (hits, misses, latency, size)
- **Rate limiter metrics** (requests, blocks, limits)
- **Workflow metrics** (duration, steps, errors)
- **LLM usage metrics** (tokens, costs, latency)
- **Retry metrics** (attempts, success rate)

## Quick Start

### 1. Install Dependencies

```bash
npm install prom-client
```

### 2. Basic Usage

```typescript
import express from 'express';
import { prometheusMetrics } from './src/core/prometheus-metrics';

const app = express();

// Apply HTTP metrics middleware
app.use(prometheusMetrics.httpMiddleware());

// Expose /metrics endpoint
app.get('/metrics', prometheusMetrics.metricsHandler());

app.listen(9090, () => {
  console.log('Metrics available at http://localhost:9090/metrics');
});
```

### 3. Record Custom Metrics

```typescript
import {
  recordToolExecution,
  recordCacheHit,
  recordRateLimitAllowed,
} from './src/core/metrics-integration';

// Tool execution
const start = Date.now();
await executeTool();
recordToolExecution('my_tool', Date.now() - start, 'success');

// Cache operations
recordCacheHit('llm_responses', 'redis');

// Rate limiting
recordRateLimitAllowed('/api/endpoint', 'normal');
```

## Available Metrics

### Tool Execution Metrics

#### `opencell_tool_execution_duration_seconds`
**Type:** Histogram
**Labels:** `tool_name`, `status`
**Description:** Duration of tool executions in seconds
**Buckets:** 0.1, 0.5, 1, 2, 5, 10, 30, 60

```typescript
recordToolExecution('fetch_data', 1500, 'success'); // 1.5 seconds
```

#### `opencell_tool_execution_total`
**Type:** Counter
**Labels:** `tool_name`, `status`
**Description:** Total number of tool executions

#### `opencell_tool_error_total`
**Type:** Counter
**Labels:** `tool_name`, `error_type`
**Description:** Total number of tool execution errors

### Cache Metrics

#### `opencell_cache_hits_total`
**Type:** Counter
**Labels:** `namespace`, `provider`
**Description:** Total number of cache hits

```typescript
recordCacheHit('llm_responses', 'redis');
```

#### `opencell_cache_misses_total`
**Type:** Counter
**Labels:** `namespace`, `provider`
**Description:** Total number of cache misses

#### `opencell_cache_operation_duration_seconds`
**Type:** Histogram
**Labels:** `operation`, `namespace`, `provider`
**Description:** Duration of cache operations (get, set, delete)
**Buckets:** 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1

#### `opencell_cache_size_bytes`
**Type:** Gauge
**Labels:** `namespace`, `provider`
**Description:** Current cache size in bytes

```typescript
updateCacheSize('llm_responses', 'redis', 1024000); // 1MB
```

#### `opencell_cache_evictions_total`
**Type:** Counter
**Labels:** `namespace`, `provider`, `reason`
**Description:** Total number of cache evictions (ttl, maxsize, manual)

### Rate Limiter Metrics

#### `opencell_rate_limit_requests_total`
**Type:** Counter
**Labels:** `endpoint`, `result`
**Description:** Total number of rate limit checks (allowed/blocked)

#### `opencell_rate_limit_blocked_total`
**Type:** Counter
**Labels:** `endpoint`, `user_type`
**Description:** Total number of blocked requests

```typescript
recordRateLimitBlocked('/api/auth/login', 'normal', 'user123');
```

#### `opencell_rate_limit_allowed_total`
**Type:** Counter
**Labels:** `endpoint`, `user_type`
**Description:** Total number of allowed requests

### Workflow Metrics

#### `opencell_workflow_duration_seconds`
**Type:** Histogram
**Labels:** `workflow_name`, `status`
**Description:** Duration of workflow executions
**Buckets:** 1, 5, 10, 30, 60, 120, 300, 600

```typescript
recordWorkflowExecution('user_onboarding', 5000, 10, 'success');
```

#### `opencell_workflow_steps_total`
**Type:** Counter
**Labels:** `workflow_name`
**Description:** Total number of workflow steps executed

#### `opencell_workflow_errors_total`
**Type:** Counter
**Labels:** `workflow_name`, `step_id`
**Description:** Total number of workflow errors

### LLM Metrics

#### `opencell_llm_requests_total`
**Type:** Counter
**Labels:** `model`, `status`
**Description:** Total number of LLM API requests

#### `opencell_llm_tokens_input_total`
**Type:** Counter
**Labels:** `model`
**Description:** Total number of input tokens used

#### `opencell_llm_tokens_output_total`
**Type:** Counter
**Labels:** `model`
**Description:** Total number of output tokens used

#### `opencell_llm_cost_usd_total`
**Type:** Counter
**Labels:** `model`
**Description:** Total LLM cost in USD

```typescript
recordLLMRequest(
  'gpt-4',      // model
  100,          // input tokens
  50,           // output tokens
  0.002,        // cost USD
  2500,         // duration ms
  'success'     // status
);
```

#### `opencell_llm_latency_seconds`
**Type:** Histogram
**Labels:** `model`
**Description:** LLM request latency
**Buckets:** 0.5, 1, 2, 5, 10, 20, 30, 60

### HTTP Metrics

#### `opencell_http_requests_total`
**Type:** Counter
**Labels:** `method`, `path`, `status`
**Description:** Total number of HTTP requests

Automatically collected by `prometheusMetrics.httpMiddleware()`.

#### `opencell_http_request_duration_seconds`
**Type:** Histogram
**Labels:** `method`, `path`, `status`
**Description:** HTTP request duration
**Buckets:** 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10

#### `opencell_http_response_size_bytes`
**Type:** Histogram
**Labels:** `method`, `path`, `status`
**Description:** HTTP response size
**Buckets:** 100, 1000, 10000, 100000, 1000000

### System Metrics (Default)

Automatically collected by prom-client:

- `process_cpu_user_seconds_total` - User CPU time
- `process_cpu_system_seconds_total` - System CPU time
- `process_heap_bytes` - Heap memory size
- `process_resident_memory_bytes` - Resident memory size
- `nodejs_eventloop_lag_seconds` - Event loop lag
- `nodejs_active_handles_total` - Active handles
- `nodejs_active_requests_total` - Active requests

## Integration

### Cache Integration

Add metrics to your cache implementation:

```typescript
import { recordCacheHit, recordCacheMiss, recordCacheSet } from './metrics-integration';

export class CacheManager {
  async get<T>(namespace: CacheNamespace, key: string): Promise<T | null> {
    const start = Date.now();

    const value = await this.redis.get(key);
    const duration = Date.now() - start;

    if (value) {
      recordCacheHit(namespace, 'redis');
    } else {
      recordCacheMiss(namespace, 'redis');
    }

    return value;
  }

  async set<T>(namespace: CacheNamespace, key: string, value: T, ttl: number): Promise<void> {
    const start = Date.now();

    await this.redis.set(key, value, 'EX', ttl);

    const duration = Date.now() - start;
    recordCacheSet(namespace, 'redis', duration);
  }
}
```

### Rate Limiter Integration

```typescript
import { recordRateLimitAllowed, recordRateLimitBlocked } from './metrics-integration';

export class RateLimiter {
  async checkLimit(req: Request): Promise<RateLimitInfo> {
    const result = await this.checkRateLimit(req);

    if (result.allowed) {
      recordRateLimitAllowed(req.path, 'normal');
    } else {
      recordRateLimitBlocked(req.path, 'normal', req.userId);
    }

    return result;
  }
}
```

### Retry Engine Integration

```typescript
import { recordRetryAttempt } from './metrics-integration';

export class RetryEngine {
  async executeWithRetry<T>(toolName: string, fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const result = await fn();
        recordRetryAttempt(toolName, attempt, true);
        return result;
      } catch (error) {
        recordRetryAttempt(toolName, attempt, false);
        if (attempt === this.maxAttempts) throw error;
        await this.delay(attempt);
      }
    }
  }
}
```

### Workflow Integration

```typescript
import { recordWorkflowExecution, recordWorkflowError } from './metrics-integration';

export class WorkflowManager {
  async execute(workflow: WorkflowDefinition): Promise<any> {
    const start = Date.now();

    try {
      const result = await this.executeSteps(workflow);
      const duration = Date.now() - start;

      recordWorkflowExecution(
        workflow.name,
        duration,
        workflow.steps.length,
        'success'
      );

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      recordWorkflowExecution(
        workflow.name,
        duration,
        workflow.steps.length,
        'error'
      );

      recordWorkflowError(workflow.name, error.stepId);

      throw error;
    }
  }
}
```

## Prometheus Setup

### 1. Install Prometheus

```bash
# macOS
brew install prometheus

# Linux
wget https://github.com/prometheus/prometheus/releases/download/v2.45.0/prometheus-2.45.0.linux-amd64.tar.gz
tar xvfz prometheus-*.tar.gz
cd prometheus-*
```

### 2. Configure Prometheus

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'opencell'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9090']
        labels:
          service: 'opencell'
          environment: 'production'

  # Add multiple instances
  - job_name: 'opencell-workers'
    static_configs:
      - targets:
          - 'worker1:9090'
          - 'worker2:9090'
          - 'worker3:9090'
        labels:
          service: 'opencell'
          environment: 'production'
          role: 'worker'
```

### 3. Start Prometheus

```bash
prometheus --config.file=prometheus.yml
```

Access Prometheus UI at: `http://localhost:9090`

### 4. Example Queries

#### Request Rate (per second)
```promql
rate(opencell_http_requests_total[5m])
```

#### Tool Execution P95 Latency
```promql
histogram_quantile(0.95, rate(opencell_tool_execution_duration_seconds_bucket[5m]))
```

#### Cache Hit Rate
```promql
opencell_cache_hits_total / (opencell_cache_hits_total + opencell_cache_misses_total)
```

#### Error Rate
```promql
rate(opencell_tool_error_total[5m]) / rate(opencell_tool_execution_total[5m])
```

#### LLM Cost per Hour
```promql
rate(opencell_llm_cost_usd_total[1h]) * 3600
```

#### Rate Limit Block Rate
```promql
rate(opencell_rate_limit_blocked_total[5m]) / rate(opencell_rate_limit_requests_total[5m])
```

## Grafana Dashboards

### 1. Install Grafana

```bash
# macOS
brew install grafana

# Linux
sudo apt-get install -y grafana
```

### 2. Add Prometheus Data Source

1. Open Grafana: `http://localhost:3000`
2. Go to Configuration → Data Sources
3. Add Prometheus
4. URL: `http://localhost:9090`
5. Save & Test

### 3. Import Dashboard

Use the following dashboard JSON or create custom panels.

#### System Overview Panel

```json
{
  "title": "System Overview",
  "panels": [
    {
      "title": "Request Rate",
      "targets": [
        {
          "expr": "rate(opencell_http_requests_total[5m])"
        }
      ]
    },
    {
      "title": "Tool Success Rate",
      "targets": [
        {
          "expr": "rate(opencell_tool_execution_total{status=\"success\"}[5m]) / rate(opencell_tool_execution_total[5m])"
        }
      ]
    },
    {
      "title": "Cache Hit Rate",
      "targets": [
        {
          "expr": "opencell_cache_hits_total / (opencell_cache_hits_total + opencell_cache_misses_total)"
        }
      ]
    }
  ]
}
```

### 4. Alert Rules

Create alerts in Prometheus or Grafana:

#### High Error Rate
```yaml
- alert: HighErrorRate
  expr: rate(opencell_tool_error_total[5m]) > 0.1
  for: 5m
  annotations:
    summary: "High error rate detected"
```

#### Cache Miss Rate High
```yaml
- alert: CacheMissRateHigh
  expr: opencell_cache_misses_total / (opencell_cache_hits_total + opencell_cache_misses_total) > 0.5
  for: 10m
  annotations:
    summary: "Cache miss rate above 50%"
```

#### Rate Limit Blocks
```yaml
- alert: HighRateLimitBlocks
  expr: rate(opencell_rate_limit_blocked_total[5m]) > 10
  for: 5m
  annotations:
    summary: "High rate of blocked requests"
```

## Best Practices

### 1. Label Cardinality

**Avoid high-cardinality labels** (user IDs, timestamps, UUIDs):

```typescript
// ❌ Bad - unlimited cardinality
prometheusMetrics.toolExecutionTotal.inc({ user_id: fullUserId });

// ✅ Good - mask or aggregate
const maskedId = userId.substring(0, 8) + '...';
prometheusMetrics.toolExecutionTotal.inc({ user_id: maskedId });
```

### 2. Metric Naming

Follow Prometheus naming conventions:

- Use `_total` suffix for counters
- Use `_seconds` suffix for durations
- Use `_bytes` suffix for sizes
- Use descriptive names: `http_request_duration_seconds` not `request_time`

### 3. Label Consistency

Use consistent label names across metrics:

```typescript
// ✅ Good - consistent
{ tool_name: 'fetch', status: 'success' }
{ tool_name: 'process', status: 'error' }

// ❌ Bad - inconsistent
{ toolName: 'fetch', result: 'ok' }
{ tool: 'process', status: 'failed' }
```

### 4. Histogram Buckets

Choose buckets appropriate for your use case:

```typescript
// Fast operations (ms)
buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]

// Medium operations (seconds)
buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]

// Slow operations (minutes)
buckets: [1, 5, 10, 30, 60, 120, 300, 600]
```

### 5. Testing Metrics

Always test metrics in development:

```typescript
import { prometheusMetrics } from './prometheus-metrics';

describe('Metrics', () => {
  beforeEach(() => {
    prometheusMetrics.resetMetrics();
  });

  it('should record tool execution', async () => {
    recordToolExecution('test_tool', 100, 'success');

    const metrics = await prometheusMetrics.register.metrics();
    expect(metrics).toContain('tool_execution_total');
  });
});
```

### 6. Production Deployment

- Use a dedicated /metrics port for security
- Enable authentication on /metrics endpoint
- Use service discovery for multi-instance scraping
- Set appropriate scrape intervals (15s recommended)
- Monitor Prometheus itself

## Troubleshooting

### Metrics Not Appearing

1. Check /metrics endpoint is accessible
2. Verify Prometheus scrape config
3. Check for label cardinality issues
4. Review Prometheus logs

### High Memory Usage

1. Reduce label cardinality
2. Increase scrape interval
3. Reduce retention period
4. Use metric relabeling

### Slow Queries

1. Add appropriate aggregations
2. Use recording rules
3. Optimize histogram buckets
4. Index frequently queried labels

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [prom-client](https://github.com/siimon/prom-client)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [PromQL Cheat Sheet](https://promlabs.com/promql-cheat-sheet/)

