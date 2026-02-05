# OpenTelemetry Distributed Tracing

Comprehensive distributed tracing system using OpenTelemetry for observability across services.

## Overview

OpenTelemetry provides:
- **Distributed tracing** across services
- **Automatic instrumentation** for HTTP, Express, Redis
- **Custom span creation** for business logic
- **Trace context propagation** across boundaries
- **Export to Jaeger/Zipkin/OTLP**
- **Performance monitoring**

## Quick Start

### 1. Initialize Tracing

```typescript
import { initializeTracing } from './src/core/tracing';

await initializeTracing({
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
  environment: 'production',
  exporter: 'jaeger',
  jaeger: {
    endpoint: 'http://localhost:14268/api/traces',
  },
});
```

### 2. Create Custom Spans

```typescript
import { traceFunction } from './src/core/tracing';

const result = await traceFunction(
  'process_data',
  async () => {
    // Your code here
    return processedData;
  },
  {
    'data.size': 1000,
    'data.type': 'json',
  }
);
```

### 3. Express Integration

```typescript
import express from 'express';
import { tracingMiddleware, tracingErrorHandler } from './src/core/tracing-middleware';

const app = express();

// Add tracing middleware
app.use(tracingMiddleware());

// Your routes
app.get('/api/users', async (req, res) => {
  // Automatically traced!
  res.json({ users: [] });
});

// Error handler
app.use(tracingErrorHandler());
```

## Features

### Tool Execution Tracing

```typescript
import { traceToolExecution } from './src/core/tracing';

const result = await traceToolExecution('fetch_data', { query: '...' }, async () => {
  return await executeTool();
});
```

### Workflow Tracing

```typescript
import { traceWorkflow } from './src/core/tracing';

await traceWorkflow('user_onboarding', 3, async () => {
  await step1();
  await step2();
  await step3();
});
```

### LLM Request Tracing

```typescript
import { traceLLMRequest } from './src/core/tracing';

const response = await traceLLMRequest('gpt-4', 100, async () => {
  return await llm.complete(prompt);
});
```

### Cache Operation Tracing

```typescript
import { traceCacheOperation } from './src/core/tracing';

const data = await traceCacheOperation('get', 'users', 'user:123', async () => {
  return await cache.get('user:123');
});
```

### Decorator Pattern

```typescript
import { Traced } from './src/core/tracing';

class UserService {
  @Traced('UserService.getUser')
  async getUser(userId: string) {
    return await db.findUser(userId);
  }
}
```

## Exporters

### Jaeger

```typescript
await initializeTracing({
  serviceName: 'my-service',
  exporter: 'jaeger',
  jaeger: {
    endpoint: 'http://localhost:14268/api/traces',
  },
});
```

**Setup Jaeger:**
```bash
docker run -d \
  -p 16686:16686 \
  -p 14268:14268 \
  jaegertracing/all-in-one:latest
```

**Access UI:** http://localhost:16686

### Zipkin

```typescript
await initializeTracing({
  serviceName: 'my-service',
  exporter: 'zipkin',
});
```

**Setup Zipkin:**
```bash
docker run -d -p 9411:9411 openzipkin/zipkin
```

**Access UI:** http://localhost:9411

### OTLP (OpenTelemetry Protocol)

```typescript
await initializeTracing({
  serviceName: 'my-service',
  exporter: 'otlp',
  otlp: {
    endpoint: 'http://localhost:4318/v1/traces',
    headers: {
      'Authorization': 'Bearer token',
    },
  },
});
```

## Trace Context

### Get Trace/Span IDs

```typescript
import { getTraceId, getSpanId } from './src/core/tracing';

const traceId = getTraceId();
const spanId = getSpanId();

// Include in logs
console.log(`[${traceId}] Processing request`);
```

### Propagate Context

```typescript
import { injectTraceContext, extractTraceContext } from './src/core/tracing';

// Inject into outgoing HTTP headers
const headers = {};
injectTraceContext(headers);

await fetch('http://api.example.com', { headers });

// Extract from incoming headers
const ctx = extractTraceContext(req.headers);
```

## Best Practices

### 1. Span Naming

```typescript
// ❌ Bad - too generic
await traceFunction('process', async () => {});

// ✅ Good - descriptive
await traceFunction('process_user_payment', async () => {});
```

### 2. Add Meaningful Attributes

```typescript
await traceFunction(
  'fetch_users',
  async () => {},
  {
    'query.limit': 100,
    'query.offset': 0,
    'query.filters': 'active=true',
  }
);
```

### 3. Handle Errors

Errors are automatically recorded, but you can add context:

```typescript
const span = tracingManager.startSpan('risky_operation');

try {
  await riskyOperation();
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: error.message,
  });
  throw error;
} finally {
  span.end();
}
```

### 4. Keep Spans Short

```typescript
// ❌ Bad - too broad
await traceFunction('process_request', async () => {
  await step1(); // 1s
  await step2(); // 1s
  await step3(); // 1s
});

// ✅ Good - individual spans
await traceFunction('step1', async () => await step1());
await traceFunction('step2', async () => await step2());
await traceFunction('step3', async () => await step3());
```

### 5. Sampling

For high-traffic services, use sampling:

```typescript
import { samplingMiddleware } from './src/core/tracing-middleware';

// Sample 10% of requests
app.use(samplingMiddleware(0.1));
```

## Performance

### Overhead Analysis

- **Span creation**: ~0.1ms per span
- **Context propagation**: ~0.01ms
- **Export (async)**: No blocking overhead

### Optimization Tips

1. **Use batch export** (default in OpenTelemetry)
2. **Sample high-volume endpoints**
3. **Limit span attributes** (< 20 per span)
4. **Avoid capturing large payloads**

## Troubleshooting

### Traces Not Appearing

1. Check exporter endpoint is reachable
2. Verify service name is set
3. Check Jaeger/Zipkin is running
4. Look for export errors in logs

### High Memory Usage

1. Enable sampling for high-traffic endpoints
2. Reduce batch size
3. Limit span retention

### Missing Spans

1. Ensure `await` is used with async operations
2. Check spans are properly ended
3. Verify context propagation

## Integration Examples

### With Prometheus

```typescript
// Trace + Metrics
await tracingManager.withSpan('api_call', async (span) => {
  const start = Date.now();

  const result = await apiCall();

  const duration = Date.now() - start;

  // Record metric
  prometheusMetrics.httpRequestDuration.observe(
    { endpoint: '/api/call' },
    duration / 1000
  );

  // Trace captures same info
  return result;
});
```

### With Queue System

```typescript
import { traceQueueJob } from './src/core/tracing-middleware';

queueManager.registerProcessor('my_queue', async (job) => {
  return await traceQueueJob(
    'my_queue',
    job.id!,
    job.data.type,
    async () => {
      return await processJob(job);
    }
  );
});
```

### With Workflows

```typescript
import { traceWorkflowStep } from './src/core/tracing-middleware';

async function executeWorkflow(workflow: Workflow) {
  for (const step of workflow.steps) {
    await traceWorkflowStep(
      workflow.name,
      step.id,
      step.name,
      async () => await executeStep(step)
    );
  }
}
```

## References

- [OpenTelemetry Docs](https://opentelemetry.io/docs/)
- [Jaeger Docs](https://www.jaegertracing.io/docs/)
- [Zipkin Docs](https://zipkin.io/)
