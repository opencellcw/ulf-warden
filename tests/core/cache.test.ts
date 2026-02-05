/**
 * Unified Cache Tests
 *
 * Tests for Redis-first with in-memory fallback caching
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { UnifiedCacheManager, CacheNamespace } from '../../src/core/cache';

describe('UnifiedCacheManager', () => {
  let cache: UnifiedCacheManager;

  beforeEach(() => {
    // Initialize cache (memory-only for tests)
    cache = new UnifiedCacheManager({
      memory: {
        ttl: 60,
        checkPeriod: 10,
        maxKeys: 100,
      },
      // Don't connect to Redis in tests
      redis: undefined,
    });
  });

  afterEach(async () => {
    await cache.clear();
    await cache.close();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set(CacheNamespace.SESSION, 'user1', { name: 'Alice' });

      const result = await cache.get(CacheNamespace.SESSION, 'user1');

      assert.deepStrictEqual(result, { name: 'Alice' });
    });

    it('should return null for missing keys', async () => {
      const result = await cache.get(CacheNamespace.SESSION, 'nonexistent');

      assert.strictEqual(result, null);
    });

    it('should delete keys', async () => {
      await cache.set(CacheNamespace.SESSION, 'user1', { name: 'Alice' });

      const deleted = await cache.delete(CacheNamespace.SESSION, 'user1');
      const result = await cache.get(CacheNamespace.SESSION, 'user1');

      assert.strictEqual(deleted, true);
      assert.strictEqual(result, null);
    });

    it('should clear all cache', async () => {
      await cache.set(CacheNamespace.SESSION, 'user1', { name: 'Alice' });
      await cache.set(CacheNamespace.SESSION, 'user2', { name: 'Bob' });

      await cache.clear();

      const result1 = await cache.get(CacheNamespace.SESSION, 'user1');
      const result2 = await cache.get(CacheNamespace.SESSION, 'user2');

      assert.strictEqual(result1, null);
      assert.strictEqual(result2, null);
    });
  });

  describe('Namespaces', () => {
    it('should isolate values by namespace', async () => {
      await cache.set(CacheNamespace.SESSION, 'key1', 'session-value');
      await cache.set(CacheNamespace.USER_DATA, 'key1', 'user-value');

      const sessionValue = await cache.get(CacheNamespace.SESSION, 'key1');
      const userData = await cache.get(CacheNamespace.USER_DATA, 'key1');

      assert.strictEqual(sessionValue, 'session-value');
      assert.strictEqual(userData, 'user-value');
    });

    it('should delete entire namespace', async () => {
      await cache.set(CacheNamespace.SESSION, 'user1', 'value1');
      await cache.set(CacheNamespace.SESSION, 'user2', 'value2');
      await cache.set(CacheNamespace.USER_DATA, 'user1', 'other-value');

      const deletedCount = await cache.deleteNamespace(CacheNamespace.SESSION);

      assert.strictEqual(deletedCount, 2);

      const session1 = await cache.get(CacheNamespace.SESSION, 'user1');
      const session2 = await cache.get(CacheNamespace.SESSION, 'user2');
      const userData = await cache.get(CacheNamespace.USER_DATA, 'user1');

      assert.strictEqual(session1, null);
      assert.strictEqual(session2, null);
      assert.strictEqual(userData, 'other-value'); // Other namespace unaffected
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect custom TTL', async () => {
      // Set with 1 second TTL
      await cache.set(CacheNamespace.SESSION, 'temp-key', 'temp-value', 1);

      // Should exist immediately
      const immediate = await cache.get(CacheNamespace.SESSION, 'temp-key');
      assert.strictEqual(immediate, 'temp-value');

      // Wait 1.5 seconds
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should be expired
      const expired = await cache.get(CacheNamespace.SESSION, 'temp-key');
      assert.strictEqual(expired, null);
    });
  });

  describe('Cached Function Execution', () => {
    it('should cache function results', async () => {
      let callCount = 0;

      const expensiveFunction = async () => {
        callCount++;
        return { result: 'computed-value' };
      };

      // First call - should execute function
      const result1 = await cache.cached(
        CacheNamespace.DATABASE_QUERY,
        'query1',
        expensiveFunction
      );

      assert.strictEqual(callCount, 1);
      assert.deepStrictEqual(result1, { result: 'computed-value' });

      // Second call - should use cache
      const result2 = await cache.cached(
        CacheNamespace.DATABASE_QUERY,
        'query1',
        expensiveFunction
      );

      assert.strictEqual(callCount, 1); // Function not called again
      assert.deepStrictEqual(result2, { result: 'computed-value' });
    });

    it('should execute function on cache miss', async () => {
      let callCount = 0;

      const fn = async () => {
        callCount++;
        return `call-${callCount}`;
      };

      const result1 = await cache.cached(CacheNamespace.DATABASE_QUERY, 'key1', fn);
      const result2 = await cache.cached(CacheNamespace.DATABASE_QUERY, 'key2', fn);

      assert.strictEqual(result1, 'call-1');
      assert.strictEqual(result2, 'call-2');
      assert.strictEqual(callCount, 2);
    });
  });

  describe('Memoization', () => {
    it('should memoize async functions', async () => {
      let callCount = 0;

      const fetchUser = async (userId: string) => {
        callCount++;
        return { id: userId, name: `User ${userId}` };
      };

      const cachedFetchUser = cache.memoize(
        CacheNamespace.USER_DATA,
        fetchUser,
        (userId) => userId
      );

      // First call
      const user1 = await cachedFetchUser('user1');
      assert.strictEqual(callCount, 1);
      assert.deepStrictEqual(user1, { id: 'user1', name: 'User user1' });

      // Second call - cached
      const user1Again = await cachedFetchUser('user1');
      assert.strictEqual(callCount, 1); // Not called again
      assert.deepStrictEqual(user1Again, { id: 'user1', name: 'User user1' });

      // Different user - new call
      const user2 = await cachedFetchUser('user2');
      assert.strictEqual(callCount, 2);
      assert.deepStrictEqual(user2, { id: 'user2', name: 'User user2' });
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set(CacheNamespace.SESSION, 'key1', 'value1');

      // Hit
      await cache.get(CacheNamespace.SESSION, 'key1');

      // Miss
      await cache.get(CacheNamespace.SESSION, 'key2');

      // Hit
      await cache.get(CacheNamespace.SESSION, 'key1');

      const stats = cache.getStats();

      assert.strictEqual(stats.hits, 2);
      assert.strictEqual(stats.misses, 1);
      assert.strictEqual(stats.hitRate, '66.67%');
    });

    it('should track sets and deletes', async () => {
      await cache.set(CacheNamespace.SESSION, 'key1', 'value1');
      await cache.set(CacheNamespace.SESSION, 'key2', 'value2');
      await cache.delete(CacheNamespace.SESSION, 'key1');

      const stats = cache.getStats();

      assert.strictEqual(stats.sets, 2);
      assert.strictEqual(stats.deletes, 1);
    });
  });

  describe('Complex Data Types', () => {
    it('should cache objects', async () => {
      const data = {
        id: 1,
        name: 'Test',
        nested: {
          value: 123,
        },
      };

      await cache.set(CacheNamespace.SESSION, 'object', data);
      const result = await cache.get(CacheNamespace.SESSION, 'object');

      assert.deepStrictEqual(result, data);
    });

    it('should cache arrays', async () => {
      const data = [1, 2, 3, { name: 'Test' }];

      await cache.set(CacheNamespace.SESSION, 'array', data);
      const result = await cache.get(CacheNamespace.SESSION, 'array');

      assert.deepStrictEqual(result, data);
    });
  });

  describe('Provider Information', () => {
    it('should report memory as provider when Redis not connected', () => {
      const stats = cache.getStats();

      assert.strictEqual(stats.provider, 'memory');
      assert.strictEqual(stats.redisConnected, false);
    });
  });
});
