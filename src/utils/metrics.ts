import { performance } from 'perf_hooks';
import { log } from '../logger';

/**
 * Performance Metrics
 *
 * Track and measure performance of async operations
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Measure async function execution time
   */
  async measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      this.recordMetric(name, duration);

      log.info(`[Perf] ${name}`, { durationMs: duration.toFixed(2) });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      log.error(`[Perf] ${name} failed`, {
        durationMs: duration.toFixed(2),
        error
      });
      throw error;
    }
  }

  /**
   * Measure sync function execution time
   */
  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();

    try {
      const result = fn();
      const duration = performance.now() - start;

      this.recordMetric(name, duration);

      log.info(`[Perf] ${name}`, { durationMs: duration.toFixed(2) });

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      log.error(`[Perf] ${name} failed`, {
        durationMs: duration.toFixed(2),
        error
      });
      throw error;
    }
  }

  /**
   * Create a decorator for measuring methods
   */
  static measureMethod(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const start = performance.now();
      const className = target.constructor.name;
      const methodName = `${className}.${propertyKey}`;

      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - start;

        if (duration > 100) { // Only log slow operations (>100ms)
          log.info(`[Perf] ${methodName}`, { durationMs: duration.toFixed(2) });
        }

        return result;
      } catch (error) {
        const duration = performance.now() - start;
        log.error(`[Perf] ${methodName} failed`, {
          durationMs: duration.toFixed(2),
          error
        });
        throw error;
      }
    };

    return descriptor;
  }

  /**
   * Record metric for statistics
   */
  private recordMetric(name: string, duration: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const values = this.metrics.get(name)!;
    values.push(duration);

    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const values = this.metrics.get(name);

    if (!values || values.length === 0) {
      return null;
    }

    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  /**
   * Get all metrics
   */
  getAllStats(): Record<string, any> {
    const stats: Record<string, any> = {};

    for (const [name, _] of this.metrics) {
      stats[name] = this.getStats(name);
    }

    return stats;
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }
}

// Export singleton
let metricsInstance: PerformanceMetrics | null = null;

export function getMetrics(): PerformanceMetrics {
  if (!metricsInstance) {
    metricsInstance = new PerformanceMetrics();
  }
  return metricsInstance;
}

// Export decorator
export const measureMethod = PerformanceMetrics.measureMethod;
