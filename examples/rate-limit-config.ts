/**
 * Rate Limiting Configuration Examples
 *
 * Shows how to configure per-endpoint and per-user rate limits
 */

import { EnhancedRateLimiter, RATE_LIMIT_PRESETS } from '../src/security/rate-limiter-enhanced';
import { Request } from 'express';

// ============================================================================
// Example 1: Basic Configuration with Default Limits
// ============================================================================

export const basicRateLimiter = new EnhancedRateLimiter({
  defaultRule: RATE_LIMIT_PRESETS.NORMAL, // 30 req/min
  enableHeaders: true,
});

// ============================================================================
// Example 2: Per-Endpoint Rate Limits
// ============================================================================

export const endpointRateLimiter = new EnhancedRateLimiter({
  // Default for all endpoints
  defaultRule: RATE_LIMIT_PRESETS.RELAXED, // 60 req/min

  // Specific endpoints with different limits
  endpointRules: {
    // Authentication endpoints - very strict
    '/api/auth/login': RATE_LIMIT_PRESETS.API_AUTH, // 10 req/min
    '/api/auth/register': RATE_LIMIT_PRESETS.API_AUTH,
    '/api/auth/reset-password': RATE_LIMIT_PRESETS.STRICT, // 10 req/min

    // Write operations - moderate
    '/api/users': RATE_LIMIT_PRESETS.API_WRITE, // 30 req/min
    '/api/posts': RATE_LIMIT_PRESETS.API_WRITE,
    '/api/comments': RATE_LIMIT_PRESETS.API_WRITE,

    // Read operations - relaxed
    '/api/search': RATE_LIMIT_PRESETS.API_DEFAULT, // 100 req/min
    '/api/feed': RATE_LIMIT_PRESETS.API_DEFAULT,

    // Admin endpoints - very relaxed
    '/api/admin/*': RATE_LIMIT_PRESETS.VERY_RELAXED, // 120 req/min

    // Heavy operations - very strict
    '/api/export': RATE_LIMIT_PRESETS.VERY_STRICT, // 5 req/min
    '/api/batch': RATE_LIMIT_PRESETS.VERY_STRICT,
  },

  enableHeaders: true,
});

// ============================================================================
// Example 3: Per-User Multipliers (Premium Users)
// ============================================================================

const userMultipliers = new Map<string, number>([
  ['premium_user_1', 2.0], // 2x limit
  ['premium_user_2', 2.0],
  ['enterprise_user_1', 5.0], // 5x limit
  ['enterprise_user_2', 5.0],
  ['free_user_1', 0.5], // Half limit
]);

export const tieredRateLimiter = new EnhancedRateLimiter({
  defaultRule: RATE_LIMIT_PRESETS.NORMAL, // 30 req/min base
  userMultipliers,
  enableHeaders: true,
});

// ============================================================================
// Example 4: Admin Override (Bypass Rate Limits)
// ============================================================================

const adminUsers = new Set([
  'admin_user_1',
  'admin_user_2',
  'support_team',
]);

export const adminAwareRateLimiter = new EnhancedRateLimiter({
  defaultRule: RATE_LIMIT_PRESETS.NORMAL,
  adminUsers,
  enableHeaders: true,
});

// ============================================================================
// Example 5: Custom Key Generator (Multi-Tenant)
// ============================================================================

export const multiTenantRateLimiter = new EnhancedRateLimiter({
  defaultRule: RATE_LIMIT_PRESETS.NORMAL,

  // Custom key: tenant_id + user_id
  keyGenerator: (req: Request) => {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const userId = (req as any).userId || req.ip;
    return `${tenantId}:${userId}`;
  },

  enableHeaders: true,
});

// ============================================================================
// Example 6: Skip Function (Whitelist IPs)
// ============================================================================

const whitelistedIPs = new Set([
  '127.0.0.1',
  '::1',
  '10.0.0.0/8',
]);

export const whitelistRateLimiter = new EnhancedRateLimiter({
  defaultRule: RATE_LIMIT_PRESETS.NORMAL,

  // Skip rate limiting for whitelisted IPs
  skip: (req: Request) => {
    return whitelistedIPs.has(req.ip || '');
  },

  enableHeaders: true,
});

// ============================================================================
// Example 7: Comprehensive Production Configuration
// ============================================================================

export const productionRateLimiter = new EnhancedRateLimiter({
  // Default: 60 requests per minute
  defaultRule: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    blockDurationMs: 60 * 1000,
  },

  // Per-endpoint rules
  endpointRules: {
    // Authentication - 5 attempts per 15 minutes
    '/api/auth/login': {
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
      blockDurationMs: 15 * 60 * 1000,
      message: 'Too many login attempts. Please try again later.',
    },

    '/api/auth/register': {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000, // 3 per hour
      blockDurationMs: 60 * 60 * 1000,
      message: 'Too many registration attempts.',
    },

    // Password reset - 3 per hour
    '/api/auth/forgot-password': {
      maxRequests: 3,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
      message: 'Too many password reset requests.',
    },

    // Write endpoints - 30 per minute
    '/api/users': {
      maxRequests: 30,
      windowMs: 60 * 1000,
    },

    '/api/posts': {
      maxRequests: 30,
      windowMs: 60 * 1000,
    },

    // Search - 100 per minute
    '/api/search': {
      maxRequests: 100,
      windowMs: 60 * 1000,
    },

    // File uploads - 10 per hour
    '/api/upload': {
      maxRequests: 10,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
      message: 'Upload limit reached. Please try again later.',
    },

    // Exports - 2 per hour
    '/api/export/*': {
      maxRequests: 2,
      windowMs: 60 * 60 * 1000,
      blockDurationMs: 60 * 60 * 1000,
      message: 'Export limit reached.',
    },

    // Webhook triggers - 20 per minute
    '/api/webhooks/*': {
      maxRequests: 20,
      windowMs: 60 * 1000,
    },

    // Health check - unlimited
    '/health': {
      maxRequests: 10000,
      windowMs: 60 * 1000,
    },

    // Metrics - unlimited for internal IPs
    '/metrics': {
      maxRequests: 10000,
      windowMs: 60 * 1000,
    },
  },

  // User multipliers based on subscription tier
  userMultipliers: new Map([
    // Premium users: 2x limit
    ['premium_*', 2.0],
    // Enterprise users: 5x limit
    ['enterprise_*', 5.0],
    // Free trial: 0.5x limit
    ['trial_*', 0.5],
  ]),

  // Admin users (no limits)
  adminUsers: new Set([
    'admin',
    'superuser',
  ]),

  // Enable X-RateLimit headers
  enableHeaders: true,

  // Custom key generator
  keyGenerator: (req: Request) => {
    // Try multiple sources
    const userId =
      (req as any).userId ||
      (req as any).user?.id ||
      req.headers['x-user-id'] ||
      req.headers['x-api-key'] ||
      req.ip ||
      'anonymous';

    return String(userId);
  },

  // Skip internal health checks
  skip: (req: Request) => {
    // Skip for health checks from load balancer
    if (req.path === '/health' && req.headers['user-agent']?.includes('ELB-HealthChecker')) {
      return true;
    }

    // Skip for internal IPs
    const ip = req.ip || '';
    if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('10.')) {
      return true;
    }

    return false;
  },
});

// ============================================================================
// Example 8: Dynamic Rate Limiting Based on Time of Day
// ============================================================================

export const timeBasedRateLimiter = new EnhancedRateLimiter({
  defaultRule: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },

  keyGenerator: (req: Request) => {
    const userId = (req as any).userId || req.ip;
    const hour = new Date().getHours();

    // Stricter limits during peak hours (9am-5pm)
    if (hour >= 9 && hour < 17) {
      return `peak:${userId}`;
    }

    // More relaxed during off-peak
    return `offpeak:${userId}`;
  },

  endpointRules: {
    // Different limits for peak vs off-peak
    '/api/*': {
      maxRequests: 30, // Peak default
      windowMs: 60 * 1000,
    },
  },
});

// ============================================================================
// Express App Integration Example
// ============================================================================

/*
import express from 'express';

const app = express();

// Apply rate limiting globally
app.use(productionRateLimiter.middleware());

// Or apply per-route
app.post('/api/auth/login', endpointRateLimiter.middleware(), (req, res) => {
  // Handle login
});

// Dynamic admin override
app.post('/api/admin/override/:userId', (req, res) => {
  const { userId } = req.params;
  productionRateLimiter.addAdmin(userId);
  res.json({ success: true });
});

// Set user multiplier
app.post('/api/admin/multiplier/:userId', (req, res) => {
  const { userId } = req.params;
  const { multiplier } = req.body;
  productionRateLimiter.setUserMultiplier(userId, multiplier);
  res.json({ success: true });
});

// Get metrics
app.get('/api/admin/rate-limit/metrics', (req, res) => {
  res.json(productionRateLimiter.getMetricsSummary());
});
*/
