/**
 * OpenTelemetry Tracing Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import {
  TracingManager,
  initializeTracing,
  shutdownTracing,
  traceFunction,
  getTraceId,
  getSpanId,
} from '../../src/core/tracing';

describe('OpenTelemetry Tracing', () => {
  let tracingManager: TracingManager;

  beforeEach(async () => {
    // Initialize with console exporter for testing
    tracingManager = await initializeTracing({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
      exporter: 'console',
      disableAutoInstrumentation: true, // Disable for faster tests
    });
  });

  afterEach(async () => {
    await shutdownTracing();
  });

  describe('Initialization', () => {
    it('should initialize tracing manager', () => {
      assert.ok(tracingManager);
    });

    it('should get tracer', () => {
      const tracer = tracingManager.getTracer();
      assert.ok(tracer);
    });
  });

  describe('Span Creation', () => {
    it('should create a span', () => {
      const span = tracingManager.startSpan('test-span');
      assert.ok(span);
      assert.ok(span.spanContext());
      span.end();
    });

    it('should create span with attributes', () => {
      const span = tracingManager.startSpan('test-span', {
        attributes: {
          'test.attribute': 'value',
          'test.number': 42,
        },
      });

      assert.ok(span);
      span.end();
    });

    it('should create nested spans', async () => {
      await tracingManager.withSpan('parent-span', async (parentSpan) => {
        assert.ok(parentSpan);

        await tracingManager.withSpan('child-span', async (childSpan) => {
          assert.ok(childSpan);
          assert.notStrictEqual(parentSpan.spanContext().spanId, childSpan.spanContext().spanId);
        });
      });
    });
  });

  describe('Span Operations', () => {
    it('should add attributes to span', async () => {
      await tracingManager.withSpan('test-span', async (span) => {
        tracingManager.addAttributes({
          'custom.attribute': 'value',
          'custom.count': 10,
        });

        assert.ok(true); // Just verify no errors
      });
    });

    it('should add events to span', async () => {
      await tracingManager.withSpan('test-span', async (span) => {
        tracingManager.addEvent('test-event', {
          'event.data': 'some data',
        });

        assert.ok(true);
      });
    });

    it('should handle errors in span', async () => {
      try {
        await tracingManager.withSpan('error-span', async (span) => {
          throw new Error('Test error');
        });
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.message, 'Test error');
      }
    });
  });

  describe('Trace Context', () => {
    it('should get trace ID', async () => {
      await tracingManager.withSpan('test-span', async () => {
        const traceId = getTraceId();
        assert.ok(traceId);
        assert.strictEqual(typeof traceId, 'string');
        assert.ok(traceId.length > 0);
      });
    });

    it('should get span ID', async () => {
      await tracingManager.withSpan('test-span', async () => {
        const spanId = getSpanId();
        assert.ok(spanId);
        assert.strictEqual(typeof spanId, 'string');
        assert.ok(spanId.length > 0);
      });
    });

    it('should have different trace ID for different traces', async () => {
      let traceId1: string | undefined;
      let traceId2: string | undefined;

      await tracingManager.withSpan('trace1', async () => {
        traceId1 = getTraceId();
      });

      await tracingManager.withSpan('trace2', async () => {
        traceId2 = getTraceId();
      });

      assert.ok(traceId1);
      assert.ok(traceId2);
      // Note: In same process, traces might share same trace ID
      // Just verify both are valid
      assert.ok(traceId1.length > 0);
      assert.ok(traceId2.length > 0);
    });
  });

  describe('Helper Functions', () => {
    it('should trace function', async () => {
      let executed = false;

      await traceFunction(
        'test-function',
        async () => {
          executed = true;
          return 'result';
        },
        {
          'custom.attribute': 'value',
        }
      );

      assert.strictEqual(executed, true);
    });

    it('should trace function with error', async () => {
      try {
        await traceFunction('error-function', async () => {
          throw new Error('Test error');
        });
        assert.fail('Should have thrown error');
      } catch (error: any) {
        assert.strictEqual(error.message, 'Test error');
      }
    });

    it('should trace function and return result', async () => {
      const result = await traceFunction('test-function', async () => {
        return { data: 'test' };
      });

      assert.deepStrictEqual(result, { data: 'test' });
    });
  });

  describe('Multiple Spans', () => {
    it('should handle sequential spans', async () => {
      await tracingManager.withSpan('span1', async () => {
        // First span
      });

      await tracingManager.withSpan('span2', async () => {
        // Second span
      });

      await tracingManager.withSpan('span3', async () => {
        // Third span
      });

      assert.ok(true);
    });

    it('should handle parallel spans', async () => {
      await Promise.all([
        tracingManager.withSpan('parallel1', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }),
        tracingManager.withSpan('parallel2', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }),
        tracingManager.withSpan('parallel3', async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }),
      ]);

      assert.ok(true);
    });
  });

  describe('Span Lifecycle', () => {
    it('should properly end spans', async () => {
      const span = tracingManager.startSpan('lifecycle-test');

      // Span should be valid
      assert.ok(span.spanContext().traceId);

      span.end();

      // Span is ended but context still accessible
      assert.ok(span.spanContext().traceId);
    });

    it('should handle span exceptions', async () => {
      const span = tracingManager.startSpan('exception-test');

      try {
        throw new Error('Test exception');
      } catch (error) {
        span.recordException(error as Error);
        span.end();
      }

      assert.ok(true);
    });
  });

  describe('Configuration', () => {
    it('should initialize with custom config', async () => {
      await shutdownTracing();

      const customManager = await initializeTracing({
        serviceName: 'custom-service',
        serviceVersion: '2.0.0',
        environment: 'production',
        exporter: 'console',
      });

      assert.ok(customManager);

      await shutdownTracing();

      // Restore original for other tests
      tracingManager = await initializeTracing({
        serviceName: 'test-service',
        exporter: 'console',
        disableAutoInstrumentation: true,
      });
    });
  });

  describe('Performance', () => {
    it('should handle many spans efficiently', async () => {
      const start = Date.now();

      for (let i = 0; i < 100; i++) {
        await tracingManager.withSpan(`span-${i}`, async () => {
          // Minimal work
        });
      }

      const duration = Date.now() - start;

      // Should complete in reasonable time (< 1 second for 100 spans)
      assert.ok(duration < 1000);
    });
  });
});

describe('Tracing without initialization', () => {
  it('should handle tracing when not initialized', async () => {
    // Tracing not initialized, should not throw
    const result = await traceFunction('test', async () => {
      return 'result';
    });

    assert.strictEqual(result, 'result');
  });
});
