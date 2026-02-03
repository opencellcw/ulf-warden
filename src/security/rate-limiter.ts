/**
 * Rate Limiter - Prevent abuse and DDoS
 *
 * Inspired by Cloudflare Workers rate limiting
 * Implements token bucket algorithm
 */

import { log } from '../logger';

interface RateLimitConfig {
  maxRequests: number;  // Max requests per window
  windowMs: number;     // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
}

interface UserBucket {
  tokens: number;
  lastRefill: number;
  blockedUntil?: number;
}

/**
 * In-memory rate limiter
 * Note: Resets on pod restart (acceptable for basic protection)
 */
class RateLimiter {
  private buckets: Map<string, UserBucket> = new Map();
  private config: Required<RateLimitConfig>;

  constructor(config: RateLimitConfig) {
    this.config = {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
      blockDurationMs: config.blockDurationMs || 60000, // Default: 1 minute
    };

    // Cleanup expired buckets every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if request is allowed
   * Returns true if allowed, false if rate limited
   */
  async checkLimit(userId: string): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    const now = Date.now();
    let bucket = this.buckets.get(userId);

    // Initialize bucket if doesn't exist
    if (!bucket) {
      bucket = {
        tokens: this.config.maxRequests,
        lastRefill: now,
      };
      this.buckets.set(userId, bucket);
    }

    // Check if user is blocked
    if (bucket.blockedUntil && now < bucket.blockedUntil) {
      const retryAfter = Math.ceil((bucket.blockedUntil - now) / 1000);
      log.warn('[RateLimit] User blocked', {
        userId: this.maskUserId(userId),
        retryAfter: `${retryAfter}s`
      });
      return {
        allowed: false,
        reason: 'Rate limit exceeded. Too many requests.',
        retryAfter
      };
    }

    // Refill tokens based on time elapsed
    const timeSinceRefill = now - bucket.lastRefill;
    if (timeSinceRefill >= this.config.windowMs) {
      bucket.tokens = this.config.maxRequests;
      bucket.lastRefill = now;
      bucket.blockedUntil = undefined;
    }

    // Check if tokens available
    if (bucket.tokens <= 0) {
      // Block user
      bucket.blockedUntil = now + this.config.blockDurationMs;
      const retryAfter = Math.ceil(this.config.blockDurationMs / 1000);

      log.warn('[RateLimit] User rate limited', {
        userId: this.maskUserId(userId),
        maxRequests: this.config.maxRequests,
        windowMs: this.config.windowMs,
        blockedFor: `${retryAfter}s`
      });

      return {
        allowed: false,
        reason: `Rate limit exceeded. Maximum ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s.`,
        retryAfter
      };
    }

    // Consume token
    bucket.tokens--;

    log.debug('[RateLimit] Request allowed', {
      userId: this.maskUserId(userId),
      tokensRemaining: bucket.tokens
    });

    return { allowed: true };
  }

  /**
   * Manually block a user (e.g., for suspicious activity)
   */
  blockUser(userId: string, durationMs: number = this.config.blockDurationMs): void {
    const bucket = this.buckets.get(userId) || {
      tokens: 0,
      lastRefill: Date.now(),
    };

    bucket.blockedUntil = Date.now() + durationMs;
    bucket.tokens = 0;
    this.buckets.set(userId, bucket);

    log.warn('[RateLimit] User manually blocked', {
      userId: this.maskUserId(userId),
      durationMs
    });
  }

  /**
   * Unblock a user
   */
  unblockUser(userId: string): void {
    const bucket = this.buckets.get(userId);
    if (bucket) {
      bucket.blockedUntil = undefined;
      bucket.tokens = this.config.maxRequests;
      bucket.lastRefill = Date.now();

      log.info('[RateLimit] User unblocked', {
        userId: this.maskUserId(userId)
      });
    }
  }

  /**
   * Get current rate limit status for user
   */
  getStatus(userId: string): { tokensRemaining: number; blockedUntil?: number } | null {
    const bucket = this.buckets.get(userId);
    if (!bucket) return null;

    return {
      tokensRemaining: bucket.tokens,
      blockedUntil: bucket.blockedUntil
    };
  }

  /**
   * Cleanup expired buckets to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [userId, bucket] of this.buckets.entries()) {
      // Remove if not accessed in last hour
      if (now - bucket.lastRefill > 60 * 60 * 1000) {
        this.buckets.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      log.debug('[RateLimit] Cleanup completed', { bucketsRemoved: cleaned });
    }
  }

  /**
   * Mask user ID for logging (privacy)
   */
  private maskUserId(userId: string): string {
    if (userId.length <= 8) return '***';
    return userId.substring(0, 4) + '...' + userId.substring(userId.length - 4);
  }

  /**
   * Get statistics
   */
  getStats(): { totalUsers: number; blockedUsers: number } {
    const now = Date.now();
    let blockedUsers = 0;

    for (const bucket of this.buckets.values()) {
      if (bucket.blockedUntil && now < bucket.blockedUntil) {
        blockedUsers++;
      }
    }

    return {
      totalUsers: this.buckets.size,
      blockedUsers
    };
  }
}

// Default configurations for different use cases
export const RATE_LIMIT_CONFIGS = {
  // Strict: 10 requests per minute (for suspicious users)
  STRICT: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000, // Block for 5 minutes
  },

  // Normal: 30 requests per minute (default)
  NORMAL: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000, // Block for 1 minute
  },

  // Relaxed: 60 requests per minute (for trusted users/admins)
  RELAXED: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 30 * 1000, // Block for 30 seconds
  },
};

// Singleton instances for different rate limits
let normalLimiter: RateLimiter | null = null;
let strictLimiter: RateLimiter | null = null;

export function getNormalRateLimiter(): RateLimiter {
  if (!normalLimiter) {
    normalLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.NORMAL);
    log.info('[RateLimit] Normal rate limiter initialized', RATE_LIMIT_CONFIGS.NORMAL);
  }
  return normalLimiter;
}

export function getStrictRateLimiter(): RateLimiter {
  if (!strictLimiter) {
    strictLimiter = new RateLimiter(RATE_LIMIT_CONFIGS.STRICT);
    log.info('[RateLimit] Strict rate limiter initialized', RATE_LIMIT_CONFIGS.STRICT);
  }
  return strictLimiter;
}

export { RateLimiter };
export type { RateLimitConfig };
