/**
 * Tracing Middleware and Integration Helpers
 *
 * Express middleware and helpers for integrating tracing with existing systems
 */

import { Request, Response, NextFunction } from 'express';
import {
  getTracingManager,
  getTraceId,
  getSpanId,
  injectTraceContext,
  extractTraceContext,
} from './tracing';
import { context, trace, SpanStatusCode } from '@opentelemetry/api';
import { log } from '../logger';

/**
 * Express middleware to add trace context to requests
 */
export function tracingMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const tracingManager = getTracingManager();

    // Extract trace context from incoming headers
    const ctx = extractTraceContext(req.headers as Record<string, string>);

    // Create span for this request
    context.with(ctx, () => {
      const span = tracingManager.startSpan(`HTTP ${req.method} ${req.path}`, {
        attributes: {
          'http.method': req.method,
          'http.url': req.url,
          'http.path': req.path,
          'http.host': req.hostname,
          'http.user_agent': req.get('user-agent'),
        },
      });

      // Add trace ID to request for logging
      (req as any).traceId = span.spanContext().traceId;
      (req as any).spanId = span.spanContext().spanId;

      // Add trace headers to response
      res.setHeader('X-Trace-Id', span.spanContext().traceId);
      res.setHeader('X-Span-Id', span.spanContext().spanId);

      // Track response
      res.on('finish', () => {
        span.setAttributes({
          'http.status_code': res.statusCode,
          'http.status_class': Math.floor(res.statusCode / 100) + 'xx',
        });

        if (res.statusCode >= 400) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `HTTP ${res.statusCode}`,
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        span.end();
      });

      res.on('error', (error) => {
        span.recordException(error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error.message,
        });
        span.end();
      });

      next();
    });
  };
}

/**
 * Add trace context to logger
 */
export function enrichLogWithTrace(logData: any): any {
  const traceId = getTraceId();
  const spanId = getSpanId();

  if (traceId || spanId) {
    return {
      ...logData,
      trace: {
        traceId,
        spanId,
      },
    };
  }

  return logData;
}

/**
 * Trace database middleware (for query builders like Knex)
 */
export function traceDatabaseMiddleware(queryBuilder: any): void {
  const originalQuery = queryBuilder.query;

  queryBuilder.query = async function (...args: any[]) {
    const tracingManager = getTracingManager();

    return await tracingManager.withSpan(
      'db.query',
      async (span) => {
        // Extract query info
        const query = args[0];
        span.setAttributes({
          'db.system': 'sqlite',
          'db.statement': typeof query === 'string' ? query.substring(0, 500) : 'unknown',
        });

        return await originalQuery.apply(this, args);
      }
    );
  };
}

/**
 * Trace Redis middleware
 */
export function traceRedisCommand(redis: any): void {
  const originalSendCommand = redis.sendCommand;

  redis.sendCommand = async function (command: any) {
    const tracingManager = getTracingManager();

    return await tracingManager.withSpan(
      `redis.${command.name}`,
      async (span) => {
        span.setAttributes({
          'db.system': 'redis',
          'db.operation': command.name,
          'redis.args_count': command.args?.length || 0,
        });

        return await originalSendCommand.call(this, command);
      }
    );
  };
}

/**
 * Trace HTTP client requests (for axios, fetch, etc.)
 */
export function traceHttpClient(client: any): void {
  const originalRequest = client.request;

  client.request = async function (config: any) {
    const tracingManager = getTracingManager();

    return await tracingManager.withSpan(
      `http.client.${config.method || 'GET'}`,
      async (span) => {
        span.setAttributes({
          'http.method': config.method || 'GET',
          'http.url': config.url,
        });

        // Inject trace context into request headers
        config.headers = config.headers || {};
        injectTraceContext(config.headers);

        try {
          const response = await originalRequest.call(this, config);

          span.setAttributes({
            'http.status_code': response.status,
          });

          return response;
        } catch (error: any) {
          span.recordException(error);
          throw error;
        }
      }
    );
  };
}

/**
 * Create error handler with tracing
 */
export function tracingErrorHandler() {
  return (error: Error, req: Request, res: Response, next: NextFunction) => {
    const tracingManager = getTracingManager();
    const span = tracingManager.getActiveSpan();

    if (span) {
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }

    log.error('[TracingMiddleware] Error', enrichLogWithTrace({ error }));

    res.status(500).json({
      error: 'Internal Server Error',
      traceId: getTraceId(),
    });
  };
}

/**
 * Create trace-aware fetch wrapper
 */
export async function tracedFetch(
  url: string,
  options: RequestInit = {}
): Promise<globalThis.Response> {
  const tracingManager = getTracingManager();

  return await tracingManager.withSpan(
    'http.fetch',
    async (span) => {
      span.setAttributes({
        'http.method': options.method || 'GET',
        'http.url': url,
      });

      // Inject trace context
      options.headers = options.headers || {};
      injectTraceContext(options.headers as Record<string, string>);

      try {
        const response = await fetch(url, options);

        span.setAttributes({
          'http.status_code': response.status,
        });

        return response;
      } catch (error: any) {
        span.recordException(error);
        throw error;
      }
    }
  );
}

/**
 * Batch operation tracer
 */
export async function traceBatchOperation<T>(
  operationName: string,
  items: T[],
  processor: (item: T, index: number) => Promise<void>
): Promise<void> {
  const tracingManager = getTracingManager();

  await tracingManager.withSpan(
    `batch.${operationName}`,
    async (span) => {
      span.setAttributes({
        'batch.operation': operationName,
        'batch.size': items.length,
      });

      let completed = 0;
      let failed = 0;

      for (let i = 0; i < items.length; i++) {
        try {
          await processor(items[i], i);
          completed++;
        } catch (error) {
          failed++;
          span.addEvent('item_failed', {
            index: i,
            error: (error as Error).message,
          });
        }
      }

      span.setAttributes({
        'batch.completed': completed,
        'batch.failed': failed,
      });
    }
  );
}

/**
 * Trace queue job processing
 */
export async function traceQueueJob<T>(
  queueName: string,
  jobId: string,
  jobType: string,
  processor: () => Promise<T>
): Promise<T> {
  const tracingManager = getTracingManager();

  return await tracingManager.withSpan(
    `queue.${queueName}.${jobType}`,
    async (span) => {
      span.setAttributes({
        'queue.name': queueName,
        'queue.job_id': jobId,
        'queue.job_type': jobType,
      });

      const result = await processor();

      span.addEvent('job_completed');

      return result;
    }
  );
}

/**
 * Trace workflow step
 */
export async function traceWorkflowStep<T>(
  workflowName: string,
  stepId: string,
  stepName: string,
  processor: () => Promise<T>
): Promise<T> {
  const tracingManager = getTracingManager();

  return await tracingManager.withSpan(
    `workflow.${workflowName}.step.${stepName}`,
    async (span) => {
      span.setAttributes({
        'workflow.name': workflowName,
        'workflow.step_id': stepId,
        'workflow.step_name': stepName,
      });

      const result = await processor();

      span.addEvent('step_completed');

      return result;
    }
  );
}

/**
 * Performance monitoring utility
 */
export class PerformanceTracer {
  private marks: Map<string, number> = new Map();

  /**
   * Mark start of operation
   */
  mark(name: string): void {
    this.marks.set(name, Date.now());

    const tracingManager = getTracingManager();
    tracingManager.addEvent(`mark.${name}`);
  }

  /**
   * Measure duration since mark
   */
  measure(name: string): number {
    const start = this.marks.get(name);
    if (!start) {
      throw new Error(`Mark not found: ${name}`);
    }

    const duration = Date.now() - start;

    const tracingManager = getTracingManager();
    tracingManager.addAttributes({
      [`duration.${name}_ms`]: duration,
    });

    return duration;
  }

  /**
   * Clear all marks
   */
  clear(): void {
    this.marks.clear();
  }
}

/**
 * Sampling decision helper
 */
export function shouldSample(samplingRate: number = 1.0): boolean {
  return Math.random() < samplingRate;
}

/**
 * Create sampling middleware
 */
export function samplingMiddleware(samplingRate: number = 1.0) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!shouldSample(samplingRate)) {
      // Skip tracing for this request
      (req as any).skipTracing = true;
    }

    next();
  };
}
