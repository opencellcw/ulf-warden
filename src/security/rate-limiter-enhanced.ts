/**
 * Enhanced Rate Limiter
 *
 * Features:
 * - Per-endpoint rate limits
 * - Per-user rate limits
 * - Rate limit headers (X-RateLimit-*)
 * - Admin override capability
 * - Comprehensive metrics
 * - Redis-backed for distributed rate limiting
 * - In-memory fallback
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../logger';
import { cache, CacheNamespace } from '../core/cache';

export interface RateLimitRule {
  maxRequests: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
  blockDurationMs?: number; // How long to block after limit exceeded
  message?: string; // Custom error message
}

export interface EndpointRateLimits {
  [endpoint: string]: RateLimitRule;
}

export interface RateLimitConfig {
  // Global default
  defaultRule: RateLimitRule;

  // Per-endpoint rules
  endpointRules?: EndpointRateLimits;

  // Per-user overrides (key: userId, value: multiplier)
  userMultipliers?: Map<string, number>;

  // Admin users (bypass rate limits)
  adminUsers?: Set<string>;

  // Enable rate limit headers
  enableHeaders?: boolean;

  // Custom key generator
  keyGenerator?: (req: Request) => string;

  // Skip function
  skip?: (req: Request) => boolean;
}

export interface RateLimitInfo {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  retryAfter?: number; // Seconds
  message?: string;
}

export interface RateLimitMetrics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  byEndpoint: Map<string, { allowed: number; blocked: number }>;
  byUser: Map<string, { allowed: number; blocked: number }>;
}

/**
 * Enhanced Rate Limiter with per-endpoint and per-user limits
 */
export class EnhancedRateLimiter {
  private config: Required<RateLimitConfig>;
  private metrics: RateLimitMetrics;
  private cacheKeyPrefix = 'rate-limit';

  constructor(config: RateLimitConfig) {
    this.config = {
      defaultRule: config.defaultRule,
      endpointRules: config.endpointRules || {},
      userMultipliers: config.userMultipliers || new Map(),
      adminUsers: config.adminUsers || new Set(),
      enableHeaders: config.enableHeaders ?? true,
      keyGenerator: config.keyGenerator || this.defaultKeyGenerator.bind(this),
      skip: config.skip || (() => false),
    };

    this.metrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      byEndpoint: new Map(),
      byUser: new Map(),
    };

    log.info('[EnhancedRateLimit] Initialized', {
      defaultLimit: `${config.defaultRule.maxRequests}/${config.defaultRule.windowMs}ms`,
      endpointRules: Object.keys(config.endpointRules || {}).length,
      adminUsers: (config.adminUsers || new Set()).size,
    });
  }

  /**
   * Check rate limit for request
   */
  async checkLimit(req: Request): Promise<RateLimitInfo> {
    this.metrics.totalRequests++;

    // Check if should skip
    if (this.config.skip(req)) {
      return this.allowRequest(Infinity, Infinity, Date.now());
    }

    const userId = this.config.keyGenerator(req);
    const endpoint = this.normalizeEndpoint(req.path);

    // Check if admin (bypass)
    if (this.config.adminUsers.has(userId)) {
      log.debug('[EnhancedRateLimit] Admin bypass', { userId: this.maskId(userId), endpoint });
      return this.allowRequest(Infinity, Infinity, Date.now());
    }

    // Get applicable rule
    const rule = this.getRule(endpoint);
    const effectiveLimit = this.getEffectiveLimit(rule, userId);

    // Check rate limit
    const cacheKey = `${this.cacheKeyPrefix}:${userId}:${endpoint}`;
    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Get current usage from cache
    const usage = await cache.get<{ count: number; resetAt: number }>(
      CacheNamespace.BOT_STATE,
      cacheKey
    );

    let count = 0;
    let resetAt = now + rule.windowMs;

    if (usage && usage.resetAt > now) {
      // Within window
      count = usage.count;
      resetAt = usage.resetAt;
    } else {
      // New window
      resetAt = now + rule.windowMs;
    }

    // Check if exceeded
    if (count >= effectiveLimit) {
      const retryAfter = Math.ceil((resetAt - now) / 1000);

      this.recordBlock(endpoint, userId);

      log.warn('[EnhancedRateLimit] Rate limit exceeded', {
        userId: this.maskId(userId),
        endpoint,
        count,
        limit: effectiveLimit,
        retryAfter,
      });

      return {
        allowed: false,
        limit: effectiveLimit,
        remaining: 0,
        reset: Math.floor(resetAt / 1000),
        retryAfter,
        message:
          rule.message ||
          `Rate limit exceeded. Maximum ${effectiveLimit} requests per ${rule.windowMs / 1000}s.`,
      };
    }

    // Increment counter
    count++;
    await cache.set(
      CacheNamespace.BOT_STATE,
      cacheKey,
      { count, resetAt },
      Math.ceil(rule.windowMs / 1000)
    );

    this.recordAllow(endpoint, userId);

    log.debug('[EnhancedRateLimit] Request allowed', {
      userId: this.maskId(userId),
      endpoint,
      remaining: effectiveLimit - count,
    });

    return this.allowRequest(effectiveLimit, effectiveLimit - count, resetAt);
  }

  /**
   * Express middleware
   */
  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = await this.checkLimit(req);

        // Add rate limit headers
        if (this.config.enableHeaders) {
          res.setHeader('X-RateLimit-Limit', result.limit.toString());
          res.setHeader('X-RateLimit-Remaining', result.remaining.toString());
          res.setHeader('X-RateLimit-Reset', result.reset.toString());

          if (result.retryAfter) {
            res.setHeader('Retry-After', result.retryAfter.toString());
          }
        }

        if (!result.allowed) {
          res.status(429).json({
            error: 'Too Many Requests',
            message: result.message,
            retryAfter: result.retryAfter,
          });
          return;
        }

        next();
      } catch (error) {
        log.error('[EnhancedRateLimit] Middleware error', { error });
        // Fail open - allow request on error
        next();
      }
    };
  }

  /**
   * Get rule for endpoint
   */
  private getRule(endpoint: string): RateLimitRule {
    // Check exact match
    if (this.config.endpointRules[endpoint]) {
      return this.config.endpointRules[endpoint];
    }

    // Check pattern match
    for (const [pattern, rule] of Object.entries(this.config.endpointRules)) {
      if (this.matchPattern(endpoint, pattern)) {
        return rule;
      }
    }

    // Return default
    return this.config.defaultRule;
  }

  /**
   * Get effective limit for user (considering multipliers)
   */
  private getEffectiveLimit(rule: RateLimitRule, userId: string): number {
    const multiplier = this.config.userMultipliers.get(userId) || 1;
    return Math.floor(rule.maxRequests * multiplier);
  }

  /**
   * Match endpoint pattern (supports wildcards)
   */
  private matchPattern(endpoint: string, pattern: string): boolean {
    // Convert pattern to regex
    const regexPattern = pattern
      .replace(/\*/g, '.*')
      .replace(/\//g, '\\/');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(endpoint);
  }

  /**
   * Normalize endpoint path
   */
  private normalizeEndpoint(path: string): string {
    // Remove query params and trailing slashes
    return path.split('?')[0].replace(/\/$/, '') || '/';
  }

  /**
   * Default key generator (use userId or IP)
   */
  private defaultKeyGenerator(req: Request): string {
    // Try to get user ID from various sources
    const userId =
      (req as any).userId ||
      (req as any).user?.id ||
      req.headers['x-user-id'] ||
      req.ip ||
      'anonymous';

    return String(userId);
  }

  /**
   * Helper to create allowed response
   */
  private allowRequest(limit: number, remaining: number, resetAt: number): RateLimitInfo {
    return {
      allowed: true,
      limit,
      remaining,
      reset: Math.floor(resetAt / 1000),
    };
  }

  /**
   * Record allowed request in metrics
   */
  private recordAllow(endpoint: string, userId: string): void {
    this.metrics.allowedRequests++;

    // By endpoint
    const endpointMetric = this.metrics.byEndpoint.get(endpoint) || { allowed: 0, blocked: 0 };
    endpointMetric.allowed++;
    this.metrics.byEndpoint.set(endpoint, endpointMetric);

    // By user
    const userMetric = this.metrics.byUser.get(userId) || { allowed: 0, blocked: 0 };
    userMetric.allowed++;
    this.metrics.byUser.set(userId, userMetric);
  }

  /**
   * Record blocked request in metrics
   */
  private recordBlock(endpoint: string, userId: string): void {
    this.metrics.blockedRequests++;

    // By endpoint
    const endpointMetric = this.metrics.byEndpoint.get(endpoint) || { allowed: 0, blocked: 0 };
    endpointMetric.blocked++;
    this.metrics.byEndpoint.set(endpoint, endpointMetric);

    // By user
    const userMetric = this.metrics.byUser.get(userId) || { allowed: 0, blocked: 0 };
    userMetric.blocked++;
    this.metrics.byUser.set(userId, userMetric);
  }

  /**
   * Mask user ID for logging
   */
  private maskId(id: string): string {
    if (id.length <= 8) return '***';
    return id.substring(0, 4) + '...' + id.substring(id.length - 4);
  }

  /**
   * Add admin user (bypass rate limits)
   */
  addAdmin(userId: string): void {
    this.config.adminUsers.add(userId);
    log.info('[EnhancedRateLimit] Admin added', { userId: this.maskId(userId) });
  }

  /**
   * Remove admin user
   */
  removeAdmin(userId: string): void {
    this.config.adminUsers.delete(userId);
    log.info('[EnhancedRateLimit] Admin removed', { userId: this.maskId(userId) });
  }

  /**
   * Set user multiplier (e.g., 2.0 = double the limit)
   */
  setUserMultiplier(userId: string, multiplier: number): void {
    this.config.userMultipliers.set(userId, multiplier);
    log.info('[EnhancedRateLimit] User multiplier set', {
      userId: this.maskId(userId),
      multiplier,
    });
  }

  /**
   * Get metrics
   */
  getMetrics(): RateLimitMetrics {
    return {
      ...this.metrics,
      byEndpoint: new Map(this.metrics.byEndpoint),
      byUser: new Map(this.metrics.byUser),
    };
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const blockRate = this.metrics.totalRequests > 0
      ? ((this.metrics.blockedRequests / this.metrics.totalRequests) * 100).toFixed(2)
      : '0.00';

    // Top blocked endpoints
    const topBlockedEndpoints = Array.from(this.metrics.byEndpoint.entries())
      .sort((a, b) => b[1].blocked - a[1].blocked)
      .slice(0, 10)
      .map(([endpoint, metrics]) => ({
        endpoint,
        blocked: metrics.blocked,
        allowed: metrics.allowed,
      }));

    // Top blocked users
    const topBlockedUsers = Array.from(this.metrics.byUser.entries())
      .sort((a, b) => b[1].blocked - a[1].blocked)
      .slice(0, 10)
      .map(([userId, metrics]) => ({
        userId: this.maskId(userId),
        blocked: metrics.blocked,
        allowed: metrics.allowed,
      }));

    return {
      total: {
        requests: this.metrics.totalRequests,
        allowed: this.metrics.allowedRequests,
        blocked: this.metrics.blockedRequests,
        blockRate: `${blockRate}%`,
      },
      topBlockedEndpoints,
      topBlockedUsers,
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      byEndpoint: new Map(),
      byUser: new Map(),
    };
    log.info('[EnhancedRateLimit] Metrics reset');
  }
}

/**
 * Preset configurations
 */
export const RATE_LIMIT_PRESETS = {
  // Very strict: 5 req/min
  VERY_STRICT: {
    maxRequests: 5,
    windowMs: 60 * 1000,
    blockDurationMs: 10 * 60 * 1000,
  },

  // Strict: 10 req/min
  STRICT: {
    maxRequests: 10,
    windowMs: 60 * 1000,
    blockDurationMs: 5 * 60 * 1000,
  },

  // Normal: 30 req/min
  NORMAL: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
  },

  // Relaxed: 60 req/min
  RELAXED: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 30 * 1000,
  },

  // Very relaxed: 120 req/min
  VERY_RELAXED: {
    maxRequests: 120,
    windowMs: 60 * 1000,
    blockDurationMs: 15 * 1000,
  },

  // API endpoints
  API_DEFAULT: {
    maxRequests: 100,
    windowMs: 60 * 1000,
  },

  API_WRITE: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },

  API_AUTH: {
    maxRequests: 10,
    windowMs: 60 * 1000,
  },
};

/**
 * Create rate limiter from environment variables
 */
export function createRateLimiterFromEnv(): EnhancedRateLimiter {
  const defaultLimit = parseInt(process.env.RATE_LIMIT_DEFAULT || '30');
  const defaultWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000');

  const config: RateLimitConfig = {
    defaultRule: {
      maxRequests: defaultLimit,
      windowMs: defaultWindow,
    },
    enableHeaders: process.env.RATE_LIMIT_HEADERS !== 'false',
  };

  // Parse admin users from env
  if (process.env.RATE_LIMIT_ADMIN_USERS) {
    config.adminUsers = new Set(
      process.env.RATE_LIMIT_ADMIN_USERS.split(',').map(u => u.trim())
    );
  }

  return new EnhancedRateLimiter(config);
}
