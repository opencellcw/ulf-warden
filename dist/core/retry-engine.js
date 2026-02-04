"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryEngine = exports.RetryEngine = exports.DEFAULT_RETRY_POLICY = void 0;
const logger_1 = require("../logger");
exports.DEFAULT_RETRY_POLICY = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
    retryableErrors: [
        'ECONNRESET',
        'ETIMEDOUT',
        'ENOTFOUND',
        'rate_limit_error',
        'overloaded_error',
        'timeout'
    ],
    idempotent: false
};
class RetryEngine {
    policies = new Map();
    /**
     * Register a custom retry policy for a tool
     */
    registerPolicy(toolName, policy) {
        this.policies.set(toolName, {
            ...exports.DEFAULT_RETRY_POLICY,
            ...policy
        });
        logger_1.log.debug('[RetryEngine] Policy registered', { toolName, policy });
    }
    /**
     * Get retry policy for a tool
     */
    getPolicy(toolName) {
        return this.policies.get(toolName) || exports.DEFAULT_RETRY_POLICY;
    }
    /**
     * Check if error is retryable
     */
    isRetryableError(error, policy) {
        const errorMessage = error.message.toLowerCase();
        return policy.retryableErrors.some(pattern => errorMessage.includes(pattern.toLowerCase()));
    }
    /**
     * Calculate next delay with exponential backoff
     */
    calculateDelay(attempt, policy) {
        const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
        return Math.min(delay, policy.maxDelayMs);
    }
    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Execute function with retry logic
     */
    async executeWithRetry(toolName, fn, context) {
        const policy = this.getPolicy(toolName);
        const ctx = {
            attempt: context?.attempt || 1,
            totalDelayMs: context?.totalDelayMs || 0
        };
        try {
            const result = await fn();
            if (ctx.attempt > 1) {
                logger_1.log.info('[RetryEngine] Retry succeeded', {
                    toolName,
                    attempt: ctx.attempt,
                    totalDelayMs: ctx.totalDelayMs
                });
            }
            return result;
        }
        catch (error) {
            const err = error;
            ctx.lastError = err;
            // Check if we should retry
            const shouldRetry = ctx.attempt < policy.maxAttempts &&
                policy.idempotent &&
                this.isRetryableError(err, policy);
            if (!shouldRetry) {
                logger_1.log.warn('[RetryEngine] Retry exhausted or not applicable', {
                    toolName,
                    attempt: ctx.attempt,
                    error: err.message,
                    idempotent: policy.idempotent
                });
                throw err;
            }
            // Calculate delay and retry
            const delayMs = this.calculateDelay(ctx.attempt, policy);
            ctx.totalDelayMs += delayMs;
            logger_1.log.info('[RetryEngine] Retrying after error', {
                toolName,
                attempt: ctx.attempt,
                error: err.message,
                delayMs,
                totalDelayMs: ctx.totalDelayMs
            });
            await this.sleep(delayMs);
            return this.executeWithRetry(toolName, fn, {
                attempt: ctx.attempt + 1,
                totalDelayMs: ctx.totalDelayMs
            });
        }
    }
    /**
     * Execute with fallback strategy
     */
    async executeWithFallback(strategies) {
        const errors = [];
        for (const strategy of strategies) {
            try {
                logger_1.log.debug('[RetryEngine] Trying strategy', { name: strategy.name });
                return await strategy.fn();
            }
            catch (error) {
                errors.push({ name: strategy.name, error: error });
                logger_1.log.warn('[RetryEngine] Strategy failed', { name: strategy.name, error });
            }
        }
        // All strategies failed
        const errorSummary = errors.map(e => `${e.name}: ${e.error.message}`).join('; ');
        throw new Error(`All fallback strategies failed: ${errorSummary}`);
    }
}
exports.RetryEngine = RetryEngine;
// Singleton instance
exports.retryEngine = new RetryEngine();
// Register default policies for common tools
exports.retryEngine.registerPolicy('web_fetch', {
    maxAttempts: 3,
    idempotent: true, // Safe to retry GET requests
    retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'rate_limit']
});
exports.retryEngine.registerPolicy('web_search', {
    maxAttempts: 2,
    idempotent: true
});
exports.retryEngine.registerPolicy('web_extract', {
    maxAttempts: 2,
    idempotent: true
});
exports.retryEngine.registerPolicy('github_search', {
    maxAttempts: 2,
    idempotent: true
});
exports.retryEngine.registerPolicy('github_clone', {
    maxAttempts: 2,
    idempotent: true
});
// Non-idempotent tools should not auto-retry
exports.retryEngine.registerPolicy('execute_shell', {
    maxAttempts: 1,
    idempotent: false // Commands may have side effects
});
exports.retryEngine.registerPolicy('write_file', {
    maxAttempts: 2,
    idempotent: true // Overwrite is idempotent
});
exports.retryEngine.registerPolicy('read_file', {
    maxAttempts: 2,
    idempotent: true
});
