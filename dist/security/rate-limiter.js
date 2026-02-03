"use strict";
/**
 * Rate Limiter - Prevent abuse and DDoS
 *
 * Inspired by Cloudflare Workers rate limiting
 * Implements token bucket algorithm
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimiter = exports.RATE_LIMIT_CONFIGS = void 0;
exports.getNormalRateLimiter = getNormalRateLimiter;
exports.getStrictRateLimiter = getStrictRateLimiter;
const logger_1 = require("../logger");
/**
 * In-memory rate limiter
 * Note: Resets on pod restart (acceptable for basic protection)
 */
class RateLimiter {
    buckets = new Map();
    config;
    constructor(config) {
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
    async checkLimit(userId) {
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
            logger_1.log.warn('[RateLimit] User blocked', {
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
            logger_1.log.warn('[RateLimit] User rate limited', {
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
        logger_1.log.debug('[RateLimit] Request allowed', {
            userId: this.maskUserId(userId),
            tokensRemaining: bucket.tokens
        });
        return { allowed: true };
    }
    /**
     * Manually block a user (e.g., for suspicious activity)
     */
    blockUser(userId, durationMs = this.config.blockDurationMs) {
        const bucket = this.buckets.get(userId) || {
            tokens: 0,
            lastRefill: Date.now(),
        };
        bucket.blockedUntil = Date.now() + durationMs;
        bucket.tokens = 0;
        this.buckets.set(userId, bucket);
        logger_1.log.warn('[RateLimit] User manually blocked', {
            userId: this.maskUserId(userId),
            durationMs
        });
    }
    /**
     * Unblock a user
     */
    unblockUser(userId) {
        const bucket = this.buckets.get(userId);
        if (bucket) {
            bucket.blockedUntil = undefined;
            bucket.tokens = this.config.maxRequests;
            bucket.lastRefill = Date.now();
            logger_1.log.info('[RateLimit] User unblocked', {
                userId: this.maskUserId(userId)
            });
        }
    }
    /**
     * Get current rate limit status for user
     */
    getStatus(userId) {
        const bucket = this.buckets.get(userId);
        if (!bucket)
            return null;
        return {
            tokensRemaining: bucket.tokens,
            blockedUntil: bucket.blockedUntil
        };
    }
    /**
     * Cleanup expired buckets to prevent memory leak
     */
    cleanup() {
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
            logger_1.log.debug('[RateLimit] Cleanup completed', { bucketsRemoved: cleaned });
        }
    }
    /**
     * Mask user ID for logging (privacy)
     */
    maskUserId(userId) {
        if (userId.length <= 8)
            return '***';
        return userId.substring(0, 4) + '...' + userId.substring(userId.length - 4);
    }
    /**
     * Get statistics
     */
    getStats() {
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
exports.RateLimiter = RateLimiter;
// Default configurations for different use cases
exports.RATE_LIMIT_CONFIGS = {
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
let normalLimiter = null;
let strictLimiter = null;
function getNormalRateLimiter() {
    if (!normalLimiter) {
        normalLimiter = new RateLimiter(exports.RATE_LIMIT_CONFIGS.NORMAL);
        logger_1.log.info('[RateLimit] Normal rate limiter initialized', exports.RATE_LIMIT_CONFIGS.NORMAL);
    }
    return normalLimiter;
}
function getStrictRateLimiter() {
    if (!strictLimiter) {
        strictLimiter = new RateLimiter(exports.RATE_LIMIT_CONFIGS.STRICT);
        logger_1.log.info('[RateLimit] Strict rate limiter initialized', exports.RATE_LIMIT_CONFIGS.STRICT);
    }
    return strictLimiter;
}
