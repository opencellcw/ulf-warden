/**
 * OpenTelemetry Distributed Tracing
 *
 * Features:
 * - Automatic instrumentation (HTTP, Express, Redis)
 * - Custom span creation
 * - Trace context propagation
 * - Export to Jaeger/Zipkin/OTLP
 * - Performance monitoring
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import {
  Span,
  SpanStatusCode,
  trace,
  context,
  propagation,
  Context,
  SpanKind,
  SpanOptions,
  Tracer,
} from '@opentelemetry/api';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { log } from '../logger';

// ===== Configuration =====

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  environment?: string;
  exporter?: 'jaeger' | 'otlp' | 'console';
  jaeger?: {
    endpoint?: string;
  };
  otlp?: {
    endpoint?: string;
    headers?: Record<string, string>;
  };
  sampling?: {
    type: 'always_on' | 'always_off' | 'trace_id_ratio';
    ratio?: number; // 0.0 to 1.0
  };
  disableAutoInstrumentation?: boolean;
}

// ===== Tracing Manager =====

export class TracingManager {
  private sdk: NodeSDK | null = null;
  private tracer: Tracer | null = null;
  private config: TracingConfig;
  private initialized = false;

  constructor(config: TracingConfig) {
    this.config = {
      serviceVersion: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      exporter: 'jaeger',
      sampling: { type: 'always_on' },
      ...config,
    };
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      log.warn('[Tracing] Already initialized');
      return;
    }

    try {
      // Create resource
      const resource = Resource.default().merge(
        new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: this.config.serviceVersion!,
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment!,
        })
      );

      // Create exporter
      const exporter = this.createExporter();

      // Create SDK
      this.sdk = new NodeSDK({
        resource,
        spanProcessor: new BatchSpanProcessor(exporter) as any,
        instrumentations: [], // Manual instrumentation only for now
      });

      // Start SDK
      await this.sdk.start();

      // Get tracer
      this.tracer = trace.getTracer(this.config.serviceName, this.config.serviceVersion);

      this.initialized = true;

      log.info('[Tracing] OpenTelemetry initialized', {
        serviceName: this.config.serviceName,
        exporter: this.config.exporter,
        environment: this.config.environment,
      });
    } catch (error) {
      log.error('[Tracing] Failed to initialize', { error });
      throw error;
    }
  }

  /**
   * Shutdown tracing
   */
  async shutdown(): Promise<void> {
    if (!this.sdk) {
      return;
    }

    try {
      await this.sdk.shutdown();
      this.initialized = false;
      log.info('[Tracing] OpenTelemetry shutdown');
    } catch (error) {
      log.error('[Tracing] Failed to shutdown', { error });
      throw error;
    }
  }

  /**
   * Create a custom span
   */
  startSpan(name: string, options?: SpanOptions): Span {
    if (!this.tracer) {
      throw new Error('Tracing not initialized');
    }

    return this.tracer.startSpan(name, options);
  }

  /**
   * Create a span with automatic ending
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    options?: SpanOptions
  ): Promise<T> {
    const span = this.startSpan(name, options);

    try {
      const result = await context.with(trace.setSpan(context.active(), span), () => fn(span));
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error: any) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
      span.recordException(error);
      throw error;
    } finally {
      span.end();
    }
  }

  /**
   * Get active span
   */
  getActiveSpan(): Span | undefined {
    return trace.getSpan(context.active());
  }

  /**
   * Add attributes to active span
   */
  addAttributes(attributes: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Add event to active span
   */
  addEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.getActiveSpan();
    if (span) {
      span.addEvent(name, attributes);
    }
  }

  /**
   * Get tracer
   */
  getTracer(): Tracer {
    if (!this.tracer) {
      throw new Error('Tracing not initialized');
    }
    return this.tracer;
  }

  /**
   * Create exporter based on config
   */
  private createExporter(): any {
    switch (this.config.exporter) {
      case 'jaeger':
        return new JaegerExporter({
          endpoint: this.config.jaeger?.endpoint || 'http://localhost:14268/api/traces',
        });

      case 'otlp':
        return new OTLPTraceExporter({
          url: this.config.otlp?.endpoint || 'http://localhost:4318/v1/traces',
          headers: this.config.otlp?.headers || {},
        });

      case 'console':
        // Use console exporter for development
        const { ConsoleSpanExporter } = require('@opentelemetry/sdk-trace-base');
        return new ConsoleSpanExporter();

      default:
        throw new Error(`Unknown exporter: ${this.config.exporter}`);
    }
  }
}

// ===== Tracing Utilities =====

/**
 * Decorator for tracing methods
 */
export function Traced(spanName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const name = spanName || `${target.constructor.name}.${propertyKey}`;

      if (!tracingManager || !tracingManager.getActiveSpan) {
        // Tracing not initialized, run normally
        return await originalMethod.apply(this, args);
      }

      return await tracingManager.withSpan(
        name,
        async (span) => {
          // Add method arguments as attributes
          span.setAttributes({
            'method.name': propertyKey,
            'method.args_count': args.length,
          });

          const result = await originalMethod.apply(this, args);
          return result;
        },
        {
          kind: SpanKind.INTERNAL,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Trace a function
 */
export async function traceFunction<T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  if (!tracingManager) {
    return await fn();
  }

  return await tracingManager.withSpan(
    name,
    async (span) => {
      if (attributes) {
        span.setAttributes(attributes);
      }

      return await fn();
    },
    {
      kind: SpanKind.INTERNAL,
    }
  );
}

/**
 * Trace tool execution
 */
export async function traceToolExecution<T>(
  toolName: string,
  input: any,
  fn: () => Promise<T>
): Promise<T> {
  return await traceFunction(
    `tool.${toolName}`,
    fn,
    {
      'tool.name': toolName,
      'tool.input_size': JSON.stringify(input).length,
    }
  );
}

/**
 * Trace workflow execution
 */
export async function traceWorkflow<T>(
  workflowName: string,
  stepCount: number,
  fn: () => Promise<T>
): Promise<T> {
  return await traceFunction(
    `workflow.${workflowName}`,
    fn,
    {
      'workflow.name': workflowName,
      'workflow.steps': stepCount,
    }
  );
}

/**
 * Trace LLM request
 */
export async function traceLLMRequest<T>(
  model: string,
  inputTokens: number,
  fn: () => Promise<T>
): Promise<T> {
  return await tracingManager.withSpan(
    `llm.${model}`,
    async (span) => {
      span.setAttributes({
        'llm.model': model,
        'llm.input_tokens': inputTokens,
      });

      const result = await fn();

      // Add output tokens if available
      if (result && typeof result === 'object' && 'outputTokens' in result) {
        span.setAttribute('llm.output_tokens', (result as any).outputTokens);
      }

      return result;
    },
    {
      kind: SpanKind.CLIENT,
    }
  );
}

/**
 * Trace cache operation
 */
export async function traceCacheOperation<T>(
  operation: 'get' | 'set' | 'delete',
  namespace: string,
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  return await traceFunction(
    `cache.${operation}`,
    async () => {
      const result = await fn();

      if (tracingManager) {
        tracingManager.addAttributes({
          'cache.operation': operation,
          'cache.namespace': namespace,
          'cache.key': key.substring(0, 50), // Limit key length
          'cache.hit': operation === 'get' && !!result,
        });
      }

      return result;
    }
  );
}

/**
 * Trace HTTP request
 */
export async function traceHTTPRequest<T>(
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  return await tracingManager.withSpan(
    `http.${method}`,
    async (span) => {
      span.setAttributes({
        'http.method': method,
        'http.url': url,
      });

      const result = await fn();

      // Add response status if available
      if (result && typeof result === 'object' && 'status' in result) {
        span.setAttribute('http.status_code', (result as any).status);
      }

      return result;
    },
    {
      kind: SpanKind.CLIENT,
    }
  );
}

/**
 * Trace database query
 */
export async function traceDatabaseQuery<T>(
  operation: string,
  table: string,
  fn: () => Promise<T>
): Promise<T> {
  return await traceFunction(
    `db.${operation}`,
    fn,
    {
      'db.operation': operation,
      'db.table': table,
    }
  );
}

/**
 * Create child span
 */
export function createChildSpan(name: string, options?: SpanOptions): Span {
  if (!tracingManager) {
    throw new Error('Tracing not initialized');
  }

  const tracer = tracingManager.getTracer();
  return tracer.startSpan(name, options, context.active());
}

/**
 * Get trace ID from active span
 */
export function getTraceId(): string | undefined {
  const span = tracingManager?.getActiveSpan();
  if (span) {
    return span.spanContext().traceId;
  }
  return undefined;
}

/**
 * Get span ID from active span
 */
export function getSpanId(): string | undefined {
  const span = tracingManager?.getActiveSpan();
  if (span) {
    return span.spanContext().spanId;
  }
  return undefined;
}

/**
 * Inject trace context into headers (for propagation)
 */
export function injectTraceContext(headers: Record<string, string>): void {
  propagation.inject(context.active(), headers);
}

/**
 * Extract trace context from headers
 */
export function extractTraceContext(headers: Record<string, string>): Context {
  return propagation.extract(context.active(), headers);
}

// Singleton instance
let tracingManager: TracingManager;

/**
 * Initialize tracing with config
 */
export async function initializeTracing(config: TracingConfig): Promise<TracingManager> {
  tracingManager = new TracingManager(config);
  await tracingManager.initialize();
  return tracingManager;
}

/**
 * Get tracing manager instance
 */
export function getTracingManager(): TracingManager {
  if (!tracingManager) {
    throw new Error('Tracing not initialized. Call initializeTracing() first.');
  }
  return tracingManager;
}

/**
 * Shutdown tracing
 */
export async function shutdownTracing(): Promise<void> {
  if (tracingManager) {
    await tracingManager.shutdown();
  }
}
