/**
 * OpenTelemetry Tracing Examples
 *
 * Shows how to use distributed tracing with OpenTelemetry
 */

import express from 'express';
import {
  initializeTracing,
  shutdownTracing,
  traceFunction,
  traceToolExecution,
  traceWorkflow,
  traceLLMRequest,
  traceCacheOperation,
  getTraceId,
  Traced,
} from '../src/core/tracing';
import {
  tracingMiddleware,
  tracingErrorHandler,
  tracedFetch,
  traceBatchOperation,
  traceQueueJob,
  PerformanceTracer,
} from '../src/core/tracing-middleware';

// ===== Example 1: Basic Setup =====

async function basicSetupExample() {
  console.log('=== Example 1: Basic Setup ===\n');

  // Initialize tracing with Jaeger
  await initializeTracing({
    serviceName: 'my-service',
    serviceVersion: '1.0.0',
    environment: 'development',
    exporter: 'jaeger',
    jaeger: {
      endpoint: 'http://localhost:14268/api/traces',
    },
  });

  console.log('OpenTelemetry initialized!');
  console.log('View traces at: http://localhost:16686\n');

  // Cleanup
  await shutdownTracing();
}

// ===== Example 2: Custom Spans =====

async function customSpansExample() {
  console.log('=== Example 2: Custom Spans ===\n');

  await initializeTracing({
    serviceName: 'custom-spans-demo',
    exporter: 'console',
  });

  // Simple traced function
  await traceFunction(
    'process_data',
    async () => {
      console.log('Processing data...');
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log('Data processed!');
    },
    {
      'data.size': 1000,
      'data.type': 'json',
    }
  );

  await shutdownTracing();
  console.log();
}

// ===== Example 3: Nested Spans =====

async function nestedSpansExample() {
  console.log('=== Example 3: Nested Spans ===\n');

  await initializeTracing({
    serviceName: 'nested-spans-demo',
    exporter: 'console',
  });

  await traceFunction('parent_operation', async () => {
    console.log('Parent operation started');

    await traceFunction('child_operation_1', async () => {
      console.log('  Child 1 running...');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await traceFunction('child_operation_2', async () => {
      console.log('  Child 2 running...');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    console.log('Parent operation completed');
  });

  await shutdownTracing();
  console.log();
}

// ===== Example 4: Tool Execution Tracing =====

async function toolExecutionExample() {
  console.log('=== Example 4: Tool Execution Tracing ===\n');

  await initializeTracing({
    serviceName: 'tool-execution-demo',
    exporter: 'console',
  });

  const toolInput = { query: 'fetch user data' };

  const result = await traceToolExecution('fetch_user_data', toolInput, async () => {
    console.log('Executing tool: fetch_user_data');
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { userId: '123', name: 'John Doe' };
  });

  console.log('Tool result:', result);

  await shutdownTracing();
  console.log();
}

// ===== Example 5: Workflow Tracing =====

async function workflowExample() {
  console.log('=== Example 5: Workflow Tracing ===\n');

  await initializeTracing({
    serviceName: 'workflow-demo',
    exporter: 'console',
  });

  await traceWorkflow('user_onboarding', 3, async () => {
    console.log('Starting user onboarding workflow...');

    await traceFunction('step_1_validate', async () => {
      console.log('  Step 1: Validating user data');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await traceFunction('step_2_create', async () => {
      console.log('  Step 2: Creating user account');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await traceFunction('step_3_notify', async () => {
      console.log('  Step 3: Sending welcome email');
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    console.log('Workflow completed!');
  });

  await shutdownTracing();
  console.log();
}

// ===== Example 6: LLM Request Tracing =====

async function llmRequestExample() {
  console.log('=== Example 6: LLM Request Tracing ===\n');

  await initializeTracing({
    serviceName: 'llm-demo',
    exporter: 'console',
  });

  const response = await traceLLMRequest('gpt-4', 100, async () => {
    console.log('Sending LLM request...');
    await new Promise((resolve) => setTimeout(resolve, 200));
    return {
      response: 'AI response here',
      outputTokens: 50,
    };
  });

  console.log('LLM response:', response);

  await shutdownTracing();
  console.log();
}

// ===== Example 7: Cache Operation Tracing =====

async function cacheOperationExample() {
  console.log('=== Example 7: Cache Operation Tracing ===\n');

  await initializeTracing({
    serviceName: 'cache-demo',
    exporter: 'console',
  });

  // Cache get (miss)
  const cachedData = await traceCacheOperation('get', 'user_data', 'user:123', async () => {
    console.log('Cache miss, fetching from database...');
    await new Promise((resolve) => setTimeout(resolve, 50));
    return null;
  });

  // Cache set
  await traceCacheOperation('set', 'user_data', 'user:123', async () => {
    console.log('Storing in cache...');
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

  await shutdownTracing();
  console.log();
}

// ===== Example 8: Decorator Pattern =====

class UserService {
  @Traced('UserService.getUser')
  async getUser(userId: string) {
    console.log(`Fetching user: ${userId}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { id: userId, name: 'John Doe' };
  }

  @Traced()
  async updateUser(userId: string, data: any) {
    console.log(`Updating user: ${userId}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { success: true };
  }
}

async function decoratorExample() {
  console.log('=== Example 8: Decorator Pattern ===\n');

  await initializeTracing({
    serviceName: 'decorator-demo',
    exporter: 'console',
  });

  const userService = new UserService();

  await userService.getUser('user123');
  await userService.updateUser('user123', { name: 'Jane Doe' });

  await shutdownTracing();
  console.log();
}

// ===== Example 9: Express Integration =====

async function expressIntegrationExample() {
  console.log('=== Example 9: Express Integration ===\n');

  await initializeTracing({
    serviceName: 'express-demo',
    exporter: 'jaeger',
  });

  const app = express();

  // Add tracing middleware
  app.use(tracingMiddleware());

  app.get('/api/users/:id', async (req, res) => {
    const traceId = getTraceId();
    console.log(`Request trace ID: ${traceId}`);

    await traceFunction('fetch_user', async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    res.json({
      userId: req.params.id,
      traceId,
    });
  });

  // Error handler with tracing
  app.use(tracingErrorHandler());

  const server = app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
    console.log('Try: curl http://localhost:3000/api/users/123');
  });

  // Cleanup after 5 seconds
  setTimeout(async () => {
    server.close();
    await shutdownTracing();
    console.log('Server stopped\n');
  }, 5000);
}

// ===== Example 10: Batch Operation Tracing =====

async function batchOperationExample() {
  console.log('=== Example 10: Batch Operation Tracing ===\n');

  await initializeTracing({
    serviceName: 'batch-demo',
    exporter: 'console',
  });

  const users = [
    { id: '1', name: 'Alice' },
    { id: '2', name: 'Bob' },
    { id: '3', name: 'Charlie' },
  ];

  await traceBatchOperation('process_users', users, async (user, index) => {
    console.log(`Processing user ${index + 1}: ${user.name}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  await shutdownTracing();
  console.log();
}

// ===== Example 11: Queue Job Tracing =====

async function queueJobExample() {
  console.log('=== Example 11: Queue Job Tracing ===\n');

  await initializeTracing({
    serviceName: 'queue-demo',
    exporter: 'console',
  });

  await traceQueueJob('email_queue', 'job_123', 'send_email', async () => {
    console.log('Processing queue job: send_email');
    await new Promise((resolve) => setTimeout(resolve, 100));
    return { sent: true };
  });

  await shutdownTracing();
  console.log();
}

// ===== Example 12: Performance Monitoring =====

async function performanceMonitoringExample() {
  console.log('=== Example 12: Performance Monitoring ===\n');

  await initializeTracing({
    serviceName: 'performance-demo',
    exporter: 'console',
  });

  const perf = new PerformanceTracer();

  await traceFunction('performance_test', async () => {
    perf.mark('start');

    console.log('Operation 1...');
    await new Promise((resolve) => setTimeout(resolve, 100));
    perf.mark('op1_done');

    console.log('Operation 2...');
    await new Promise((resolve) => setTimeout(resolve, 150));
    perf.mark('op2_done');

    const op1Duration = perf.measure('op1_done');
    const op2Duration = perf.measure('op2_done');

    console.log(`Operation 1: ${op1Duration}ms`);
    console.log(`Operation 2: ${op2Duration}ms`);
  });

  await shutdownTracing();
  console.log();
}

// ===== Run All Examples =====

async function runAllExamples() {
  try {
    await basicSetupExample();
    await customSpansExample();
    await nestedSpansExample();
    await toolExecutionExample();
    await workflowExample();
    await llmRequestExample();
    await cacheOperationExample();
    await decoratorExample();
    // await expressIntegrationExample(); // Skip - starts server
    await batchOperationExample();
    await queueJobExample();
    await performanceMonitoringExample();

    console.log('All examples completed!');
    process.exit(0);
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  runAllExamples();
}

/**
 * Jaeger Setup:
 *
 * Docker:
 *   docker run -d -p 16686:16686 -p 14268:14268 jaegertracing/all-in-one:latest
 *
 * Access UI:
 *   http://localhost:16686
 *
 * Zipkin Setup:
 *
 * Docker:
 *   docker run -d -p 9411:9411 openzipkin/zipkin
 *
 * Access UI:
 *   http://localhost:9411
 *
 * OTLP Collector:
 *
 * Install OpenTelemetry Collector and configure with OTLP receiver
 */
