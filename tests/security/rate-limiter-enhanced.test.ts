/**
 * Enhanced Rate Limiter Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { EnhancedRateLimiter, RATE_LIMIT_PRESETS } from '../../src/security/rate-limiter-enhanced';
import { Request } from 'express';

// Mock request helper (use unique IPs to avoid Redis cache conflicts)
let requestCounter = 0;
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/test',
    ip: `127.0.0.${++requestCounter}`,
    headers: {},
    ...overrides,
  } as Request;
}

describe('EnhancedRateLimiter', () => {
  let limiter: EnhancedRateLimiter;

  beforeEach(() => {
    limiter = new EnhancedRateLimiter({
      defaultRule: {
        maxRequests: 5,
        windowMs: 1000, // 1 second for faster tests
      },
      enableHeaders: true,
    });
  });

  afterEach(() => {
    limiter.resetMetrics();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limit', async () => {
      const req = createMockRequest();

      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkLimit(req);
        assert.strictEqual(result.allowed, true);
        assert.strictEqual(result.remaining, 4 - i);
      }
    });

    it('should block requests exceeding limit', async () => {
      const req = createMockRequest();

      // Use up all tokens
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(req);
      }

      // Next request should be blocked
      const result = await limiter.checkLimit(req);
      assert.strictEqual(result.allowed, false);
      assert.ok(result.retryAfter);
      assert.ok(result.message);
    });

    it('should reset after window expires', async () => {
      const req = createMockRequest();

      // Use up all tokens
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(req);
      }

      // Block
      let result = await limiter.checkLimit(req);
      assert.strictEqual(result.allowed, false);

      // Wait for window to reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be allowed again
      result = await limiter.checkLimit(req);
      assert.strictEqual(result.allowed, true);
    });
  });

  describe('Per-Endpoint Rate Limits', () => {
    beforeEach(() => {
      limiter = new EnhancedRateLimiter({
        defaultRule: {
          maxRequests: 10,
          windowMs: 1000,
        },
        endpointRules: {
          '/api/auth/login': {
            maxRequests: 3,
            windowMs: 1000,
          },
          '/api/search': {
            maxRequests: 20,
            windowMs: 1000,
          },
        },
      });
    });

    it('should apply endpoint-specific limits', async () => {
      const loginReq = createMockRequest({ path: '/api/auth/login' });
      const searchReq = createMockRequest({ path: '/api/search' });

      // Login: limit 3
      for (let i = 0; i < 3; i++) {
        const result = await limiter.checkLimit(loginReq);
        assert.strictEqual(result.allowed, true);
      }

      const blockedLogin = await limiter.checkLimit(loginReq);
      assert.strictEqual(blockedLogin.allowed, false);

      // Search: limit 20 (should still work)
      for (let i = 0; i < 20; i++) {
        const result = await limiter.checkLimit(searchReq);
        assert.strictEqual(result.allowed, true);
      }

      const blockedSearch = await limiter.checkLimit(searchReq);
      assert.strictEqual(blockedSearch.allowed, false);
    });

    it('should match wildcard patterns', async () => {
      limiter = new EnhancedRateLimiter({
        defaultRule: {
          maxRequests: 10,
          windowMs: 1000,
        },
        endpointRules: {
          '/api/admin/*': {
            maxRequests: 100,
            windowMs: 1000,
          },
        },
      });

      const adminReq = createMockRequest({ path: '/api/admin/users' });

      // Should have limit of 100
      for (let i = 0; i < 100; i++) {
        const result = await limiter.checkLimit(adminReq);
        assert.strictEqual(result.allowed, true);
      }

      const blocked = await limiter.checkLimit(adminReq);
      assert.strictEqual(blocked.allowed, false);
    });
  });

  describe('User Multipliers', () => {
    beforeEach(() => {
      const userMultipliers = new Map([
        ['premium_user', 2.0], // 2x limit
        ['limited_user', 0.5], // Half limit
      ]);

      limiter = new EnhancedRateLimiter({
        defaultRule: {
          maxRequests: 10,
          windowMs: 1000,
        },
        userMultipliers,
        keyGenerator: (req) => (req as any).userId || req.ip,
      });
    });

    it('should apply multiplier for premium users', async () => {
      const req = createMockRequest({ userId: 'premium_user' } as any);

      // Premium user has 2x limit = 20 requests
      for (let i = 0; i < 20; i++) {
        const result = await limiter.checkLimit(req);
        assert.strictEqual(result.allowed, true);
      }

      const blocked = await limiter.checkLimit(req);
      assert.strictEqual(blocked.allowed, false);
    });

    it('should apply reduced limit for limited users', async () => {
      const req = createMockRequest({ userId: 'limited_user' } as any);

      // Limited user has 0.5x limit = 5 requests
      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkLimit(req);
        assert.strictEqual(result.allowed, true);
      }

      const blocked = await limiter.checkLimit(req);
      assert.strictEqual(blocked.allowed, false);
    });

    it('should use default limit for normal users', async () => {
      const req = createMockRequest({ userId: 'normal_user' } as any);

      // Normal user has 1x limit = 10 requests
      for (let i = 0; i < 10; i++) {
        const result = await limiter.checkLimit(req);
        assert.strictEqual(result.allowed, true);
      }

      const blocked = await limiter.checkLimit(req);
      assert.strictEqual(blocked.allowed, false);
    });

    it('should allow dynamic multiplier updates', async () => {
      const req = createMockRequest({ userId: 'dynamic_user' } as any);

      // Initially default limit (10)
      for (let i = 0; i < 10; i++) {
        await limiter.checkLimit(req);
      }

      let blocked = await limiter.checkLimit(req);
      assert.strictEqual(blocked.allowed, false);

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Set multiplier to 2x
      limiter.setUserMultiplier('dynamic_user', 2.0);

      // Should now have 20 requests
      for (let i = 0; i < 20; i++) {
        const result = await limiter.checkLimit(req);
        assert.strictEqual(result.allowed, true);
      }
    });
  });

  describe('Admin Override', () => {
    beforeEach(() => {
      const adminUsers = new Set(['admin123']);

      limiter = new EnhancedRateLimiter({
        defaultRule: {
          maxRequests: 5,
          windowMs: 1000,
        },
        adminUsers,
        keyGenerator: (req) => (req as any).userId || req.ip,
      });
    });

    it('should bypass rate limit for admin users', async () => {
      const adminReq = createMockRequest({ userId: 'admin123' } as any);

      // Admin can make unlimited requests
      for (let i = 0; i < 100; i++) {
        const result = await limiter.checkLimit(adminReq);
        assert.strictEqual(result.allowed, true);
        assert.strictEqual(result.limit, Infinity);
      }
    });

    it('should enforce rate limit for non-admin users', async () => {
      const normalReq = createMockRequest({ userId: 'user123' } as any);

      // Use up limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(normalReq);
      }

      const blocked = await limiter.checkLimit(normalReq);
      assert.strictEqual(blocked.allowed, false);
    });

    it('should allow dynamic admin management', async () => {
      const userReq = createMockRequest({ userId: 'user456' } as any);

      // Initially limited
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(userReq);
      }

      let blocked = await limiter.checkLimit(userReq);
      assert.strictEqual(blocked.allowed, false);

      // Make user admin
      limiter.addAdmin('user456');

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should now be unlimited
      for (let i = 0; i < 100; i++) {
        const result = await limiter.checkLimit(userReq);
        assert.strictEqual(result.allowed, true);
      }

      // Remove admin
      limiter.removeAdmin('user456');

      // Wait for reset
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be limited again
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(userReq);
      }

      blocked = await limiter.checkLimit(userReq);
      assert.strictEqual(blocked.allowed, false);
    });
  });

  describe('Skip Function', () => {
    beforeEach(() => {
      limiter = new EnhancedRateLimiter({
        defaultRule: {
          maxRequests: 5,
          windowMs: 1000,
        },
        skip: (req) => req.path === '/health',
      });
    });

    it('should skip rate limiting for matched requests', async () => {
      const healthReq = createMockRequest({ path: '/health' });

      // Health endpoint should be unlimited
      for (let i = 0; i < 100; i++) {
        const result = await limiter.checkLimit(healthReq);
        assert.strictEqual(result.allowed, true);
      }
    });

    it('should enforce rate limiting for non-matched requests', async () => {
      const apiReq = createMockRequest({ path: '/api/test' });

      // Use up limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(apiReq);
      }

      const blocked = await limiter.checkLimit(apiReq);
      assert.strictEqual(blocked.allowed, false);
    });
  });

  describe('Custom Key Generator', () => {
    it('should use custom key for different users', async () => {
      limiter = new EnhancedRateLimiter({
        defaultRule: {
          maxRequests: 5,
          windowMs: 1000,
        },
        keyGenerator: (req) => req.headers['x-api-key'] as string || req.ip,
      });

      const user1Req = createMockRequest({ headers: { 'x-api-key': 'key1' } });
      const user2Req = createMockRequest({ headers: { 'x-api-key': 'key2' } });

      // User 1: use up limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(user1Req);
      }

      const user1Blocked = await limiter.checkLimit(user1Req);
      assert.strictEqual(user1Blocked.allowed, false);

      // User 2: should still work (different key)
      for (let i = 0; i < 5; i++) {
        const result = await limiter.checkLimit(user2Req);
        assert.strictEqual(result.allowed, true);
      }
    });
  });

  describe('Metrics', () => {
    it('should track allowed and blocked requests', async () => {
      const req = createMockRequest();

      // 5 allowed
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(req);
      }

      // 3 blocked
      for (let i = 0; i < 3; i++) {
        await limiter.checkLimit(req);
      }

      const metrics = limiter.getMetrics();
      assert.strictEqual(metrics.totalRequests, 8);
      assert.strictEqual(metrics.allowedRequests, 5);
      assert.strictEqual(metrics.blockedRequests, 3);
    });

    it('should track metrics by endpoint', async () => {
      const req1 = createMockRequest({ path: '/api/endpoint1' });
      const req2 = createMockRequest({ path: '/api/endpoint2' });

      await limiter.checkLimit(req1); // allowed
      await limiter.checkLimit(req2); // allowed

      const metrics = limiter.getMetrics();
      assert.ok(metrics.byEndpoint.has('/api/endpoint1'));
      assert.ok(metrics.byEndpoint.has('/api/endpoint2'));
    });

    it('should provide metrics summary', async () => {
      const req = createMockRequest();

      // Generate some traffic
      for (let i = 0; i < 10; i++) {
        await limiter.checkLimit(req);
      }

      const summary = limiter.getMetricsSummary();
      assert.ok(summary.total);
      assert.ok(summary.total.requests > 0);
      assert.ok(summary.total.blockRate);
    });

    it('should reset metrics', async () => {
      const req = createMockRequest();

      await limiter.checkLimit(req);

      let metrics = limiter.getMetrics();
      assert.strictEqual(metrics.totalRequests, 1);

      limiter.resetMetrics();

      metrics = limiter.getMetrics();
      assert.strictEqual(metrics.totalRequests, 0);
    });
  });

  describe('Rate Limit Info', () => {
    it('should include limit, remaining, and reset', async () => {
      const req = createMockRequest();

      const result = await limiter.checkLimit(req);

      assert.ok(typeof result.limit === 'number');
      assert.ok(typeof result.remaining === 'number');
      assert.ok(typeof result.reset === 'number');
      assert.strictEqual(result.limit, 5);
      assert.strictEqual(result.remaining, 4);
    });

    it('should include retryAfter when blocked', async () => {
      const req = createMockRequest();

      // Use up limit
      for (let i = 0; i < 5; i++) {
        await limiter.checkLimit(req);
      }

      const blocked = await limiter.checkLimit(req);
      assert.strictEqual(blocked.allowed, false);
      assert.ok(blocked.retryAfter);
      assert.ok(blocked.retryAfter > 0);
    });
  });
});
