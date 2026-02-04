import { log } from '../logger';

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[]; // Error message patterns
  idempotent: boolean; // Can this operation be safely retried?
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
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

export interface RetryContext {
  attempt: number;
  lastError?: Error;
  totalDelayMs: number;
}

export class RetryEngine {
  private policies: Map<string, RetryPolicy> = new Map();

  /**
   * Register a custom retry policy for a tool
   */
  registerPolicy(toolName: string, policy: Partial<RetryPolicy>): void {
    this.policies.set(toolName, {
      ...DEFAULT_RETRY_POLICY,
      ...policy
    });
    log.debug('[RetryEngine] Policy registered', { toolName, policy });
  }

  /**
   * Get retry policy for a tool
   */
  private getPolicy(toolName: string): RetryPolicy {
    return this.policies.get(toolName) || DEFAULT_RETRY_POLICY;
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error, policy: RetryPolicy): boolean {
    const errorMessage = error.message.toLowerCase();
    return policy.retryableErrors.some(pattern =>
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Calculate next delay with exponential backoff
   */
  private calculateDelay(attempt: number, policy: RetryPolicy): number {
    const delay = policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1);
    return Math.min(delay, policy.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    toolName: string,
    fn: () => Promise<T>,
    context?: Partial<RetryContext>
  ): Promise<T> {
    const policy = this.getPolicy(toolName);
    const ctx: RetryContext = {
      attempt: context?.attempt || 1,
      totalDelayMs: context?.totalDelayMs || 0
    };

    try {
      const result = await fn();

      if (ctx.attempt > 1) {
        log.info('[RetryEngine] Retry succeeded', {
          toolName,
          attempt: ctx.attempt,
          totalDelayMs: ctx.totalDelayMs
        });
      }

      return result;
    } catch (error) {
      const err = error as Error;
      ctx.lastError = err;

      // Check if we should retry
      const shouldRetry =
        ctx.attempt < policy.maxAttempts &&
        policy.idempotent &&
        this.isRetryableError(err, policy);

      if (!shouldRetry) {
        log.warn('[RetryEngine] Retry exhausted or not applicable', {
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

      log.info('[RetryEngine] Retrying after error', {
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
  async executeWithFallback<T>(
    strategies: Array<{ name: string; fn: () => Promise<T> }>
  ): Promise<T> {
    const errors: Array<{ name: string; error: Error }> = [];

    for (const strategy of strategies) {
      try {
        log.debug('[RetryEngine] Trying strategy', { name: strategy.name });
        return await strategy.fn();
      } catch (error) {
        errors.push({ name: strategy.name, error: error as Error });
        log.warn('[RetryEngine] Strategy failed', { name: strategy.name, error });
      }
    }

    // All strategies failed
    const errorSummary = errors.map(e => `${e.name}: ${e.error.message}`).join('; ');
    throw new Error(`All fallback strategies failed: ${errorSummary}`);
  }
}

// Singleton instance
export const retryEngine = new RetryEngine();

// Register default policies for common tools
retryEngine.registerPolicy('web_fetch', {
  maxAttempts: 3,
  idempotent: true, // Safe to retry GET requests
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'rate_limit']
});

retryEngine.registerPolicy('web_search', {
  maxAttempts: 2,
  idempotent: true
});

retryEngine.registerPolicy('web_extract', {
  maxAttempts: 2,
  idempotent: true
});

retryEngine.registerPolicy('github_search', {
  maxAttempts: 2,
  idempotent: true
});

retryEngine.registerPolicy('github_clone', {
  maxAttempts: 2,
  idempotent: true
});

// Non-idempotent tools should not auto-retry
retryEngine.registerPolicy('execute_shell', {
  maxAttempts: 1,
  idempotent: false // Commands may have side effects
});

retryEngine.registerPolicy('write_file', {
  maxAttempts: 2,
  idempotent: true // Overwrite is idempotent
});

retryEngine.registerPolicy('read_file', {
  maxAttempts: 2,
  idempotent: true
});
