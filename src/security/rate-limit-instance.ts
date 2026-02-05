/**
 * Rate Limiter Singleton Instance
 *
 * Provides a configured instance of EnhancedRateLimiter for tool execution.
 */

import { EnhancedRateLimiter, RateLimitConfig } from './rate-limiter-enhanced';
import {
  DEFAULT_RATE_LIMIT,
  TOOL_RATE_LIMITS,
  ADMIN_MULTIPLIER,
  getAdminUsers
} from './rate-limit-config';
import { log } from '../logger';

let toolRateLimiter: EnhancedRateLimiter | null = null;

/**
 * Get or create the tool rate limiter instance
 */
export function getToolRateLimiter(): EnhancedRateLimiter {
  if (!toolRateLimiter) {
    const adminUsers = getAdminUsers();

    const config: RateLimitConfig = {
      defaultRule: DEFAULT_RATE_LIMIT,
      endpointRules: TOOL_RATE_LIMITS,
      adminUsers,
      enableHeaders: false, // Not using HTTP headers for tool execution
      keyGenerator: (req: any) => {
        // For tool execution, req.ip is actually the userId
        return req.ip || req.userId || 'anonymous';
      },
    };

    toolRateLimiter = new EnhancedRateLimiter(config);

    // Set admin multipliers
    adminUsers.forEach(adminId => {
      toolRateLimiter!.setUserMultiplier(adminId, ADMIN_MULTIPLIER);
    });

    log.info('[RateLimit] Tool rate limiter initialized', {
      adminUsers: adminUsers.size,
      adminMultiplier: ADMIN_MULTIPLIER,
      endpointRules: Object.keys(TOOL_RATE_LIMITS).length,
      defaultLimit: `${DEFAULT_RATE_LIMIT.maxRequests}/${DEFAULT_RATE_LIMIT.windowMs}ms`
    });
  }

  return toolRateLimiter;
}

/**
 * Reset the rate limiter instance (for testing)
 */
export function resetToolRateLimiter(): void {
  toolRateLimiter = null;
  log.info('[RateLimit] Tool rate limiter reset');
}

/**
 * Get rate limiter metrics
 */
export function getToolRateLimiterMetrics() {
  if (!toolRateLimiter) {
    return null;
  }
  return toolRateLimiter.getMetricsSummary();
}
