"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.measureMethod = exports.PerformanceMetrics = void 0;
exports.getMetrics = getMetrics;
const perf_hooks_1 = require("perf_hooks");
const logger_1 = require("../logger");
/**
 * Performance Metrics
 *
 * Track and measure performance of async operations
 */
class PerformanceMetrics {
    metrics = new Map();
    /**
     * Measure async function execution time
     */
    async measure(name, fn) {
        const start = perf_hooks_1.performance.now();
        try {
            const result = await fn();
            const duration = perf_hooks_1.performance.now() - start;
            this.recordMetric(name, duration);
            logger_1.log.info(`[Perf] ${name}`, { durationMs: duration.toFixed(2) });
            return result;
        }
        catch (error) {
            const duration = perf_hooks_1.performance.now() - start;
            logger_1.log.error(`[Perf] ${name} failed`, {
                durationMs: duration.toFixed(2),
                error
            });
            throw error;
        }
    }
    /**
     * Measure sync function execution time
     */
    measureSync(name, fn) {
        const start = perf_hooks_1.performance.now();
        try {
            const result = fn();
            const duration = perf_hooks_1.performance.now() - start;
            this.recordMetric(name, duration);
            logger_1.log.info(`[Perf] ${name}`, { durationMs: duration.toFixed(2) });
            return result;
        }
        catch (error) {
            const duration = perf_hooks_1.performance.now() - start;
            logger_1.log.error(`[Perf] ${name} failed`, {
                durationMs: duration.toFixed(2),
                error
            });
            throw error;
        }
    }
    /**
     * Create a decorator for measuring methods
     */
    static measureMethod(target, propertyKey, descriptor) {
        const originalMethod = descriptor.value;
        descriptor.value = async function (...args) {
            const start = perf_hooks_1.performance.now();
            const className = target.constructor.name;
            const methodName = `${className}.${propertyKey}`;
            try {
                const result = await originalMethod.apply(this, args);
                const duration = perf_hooks_1.performance.now() - start;
                if (duration > 100) { // Only log slow operations (>100ms)
                    logger_1.log.info(`[Perf] ${methodName}`, { durationMs: duration.toFixed(2) });
                }
                return result;
            }
            catch (error) {
                const duration = perf_hooks_1.performance.now() - start;
                logger_1.log.error(`[Perf] ${methodName} failed`, {
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
    recordMetric(name, duration) {
        if (!this.metrics.has(name)) {
            this.metrics.set(name, []);
        }
        const values = this.metrics.get(name);
        values.push(duration);
        // Keep only last 100 measurements
        if (values.length > 100) {
            values.shift();
        }
    }
    /**
     * Get statistics for a metric
     */
    getStats(name) {
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
    getAllStats() {
        const stats = {};
        for (const [name, _] of this.metrics) {
            stats[name] = this.getStats(name);
        }
        return stats;
    }
    /**
     * Clear all metrics
     */
    clear() {
        this.metrics.clear();
    }
}
exports.PerformanceMetrics = PerformanceMetrics;
// Export singleton
let metricsInstance = null;
function getMetrics() {
    if (!metricsInstance) {
        metricsInstance = new PerformanceMetrics();
    }
    return metricsInstance;
}
// Export decorator
exports.measureMethod = PerformanceMetrics.measureMethod;
