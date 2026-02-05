/**
 * Cache System Tests
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { UnifiedCacheManager, CacheNamespace } from '../../src/core/cache';

describe('UnifiedCacheManager', () => {
  let cache: UnifiedCacheManager;

  beforeEach(() => {
    // Create new cache instance for each test
    cache = new UnifiedCacheManager({
      memory: {
        ttl: 60,
        checkPeriod: 10,
        maxKeys: 100,
      },
      redis: undefined, // Disable Redis for tests
    });
  });

  afterEach(async () => {
    // Clean up
    await cache.clear();
    await cache.close();
  });

  describe('Basic Operations', () => {
    it('should set and get values', async () => {
      await cache.set(CacheNamespace.SESSION, 'user123', { name: 'Test User' });
      const value = await cache.get(CacheNamespace.SESSION, 'user123');
      assert.deepStrictEqual(value, { name: 'Test User' });
    });

    it('should return null for missing keys', async () => {
      const value = await cache.get(CacheNamespace.SESSION, 'nonexistent');
      assert.strictEqual(value, null);
    });

    it('should delete keys', async () => {
      await cache.set(CacheNamespace.SESSION, 'user123', { name: 'Test' });
      await cache.delete(CacheNamespace.SESSION, 'user123');
      const value = await cache.get(CacheNamespace.SESSION, 'user123');
      assert.strictEqual(value, null);
    });

    it('should clear all cache', async () => {
      await cache.set(CacheNamespace.SESSION, 'user1', { name: 'User 1' });
      await cache.set(CacheNamespace.USER_DATA, 'user2', { name: 'User 2' });
      await cache.clear();
      const value1 = await cache.get(CacheNamespace.SESSION, 'user1');
      const value2 = await cache.get(CacheNamespace.USER_DATA, 'user2');
      assert.strictEqual(value1, null);
      assert.strictEqual(value2, null);
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
      await cache.set(CacheNamespace.USER_DATA, 'user1', 'value3');

      const deletedCount = await cache.deleteNamespace(CacheNamespace.SESSION);
      assert.strictEqual(deletedCount, 2);

      const session1 = await cache.get(CacheNamespace.SESSION, 'user1');
      const session2 = await cache.get(CacheNamespace.SESSION, 'user2');
      const userData = await cache.get(CacheNamespace.USER_DATA, 'user1');

      assert.strictEqual(session1, null);
      assert.strictEqual(session2, null);
      assert.strictEqual(userData, 'value3');
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should respect custom TTL', async () => {
      // Set with 1 second TTL
      await cache.set(CacheNamespace.SESSION, 'temp', 'value', 1);

      // Should exist immediately
      const value1 = await cache.get(CacheNamespace.SESSION, 'temp');
      assert.strictEqual(value1, 'value');

      // Wait 1.5 seconds
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Should be expired
      const value2 = await cache.get(CacheNamespace.SESSION, 'temp');
      assert.strictEqual(value2, null);
    });
  });

  describe('Cached Function Execution', () => {
    it('should cache function results', async () => {
      let callCount = 0;
      const expensiveFn = async () => {
        callCount++;
        return { result: 'computed' };
      };

      // First call - executes function
      const result1 = await cache.cached(CacheNamespace.API_RESPONSE, 'test', expensiveFn);
      assert.strictEqual(callCount, 1);
      assert.deepStrictEqual(result1, { result: 'computed' });

      // Second call - returns cached result
      const result2 = await cache.cached(CacheNamespace.API_RESPONSE, 'test', expensiveFn);
      assert.strictEqual(callCount, 1); // Function not called again
      assert.deepStrictEqual(result2, { result: 'computed' });
    });

    it('should execute function on cache miss', async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return 'result';
      };

      await cache.cached(CacheNamespace.API_RESPONSE, 'key1', fn);
      await cache.cached(CacheNamespace.API_RESPONSE, 'key2', fn);

      assert.strictEqual(callCount, 2); // Different keys = different cache entries
    });
  });

  describe('Memoization', () => {
    it('should memoize async functions', async () => {
      let callCount = 0;
      const getUserData = async (userId: string) => {
        callCount++;
        return { id: userId, name: `User ${userId}` };
      };

      const memoized = cache.memoize(
        CacheNamespace.USER_DATA,
        getUserData,
        (userId) => userId
      );

      // First call
      const result1 = await memoized('user123');
      assert.strictEqual(callCount, 1);
      assert.deepStrictEqual(result1, { id: 'user123', name: 'User user123' });

      // Second call - cached
      const result2 = await memoized('user123');
      assert.strictEqual(callCount, 1); // Not called again
      assert.deepStrictEqual(result2, { id: 'user123', name: 'User user123' });

      // Different argument
      const result3 = await memoized('user456');
      assert.strictEqual(callCount, 2);
      assert.deepStrictEqual(result3, { id: 'user456', name: 'User user456' });
    });
  });

  describe('Statistics', () => {
    it('should track hits and misses', async () => {
      await cache.set(CacheNamespace.SESSION, 'key1', 'value1');

      await cache.get(CacheNamespace.SESSION, 'key1'); // Hit
      await cache.get(CacheNamespace.SESSION, 'key2'); // Miss
      await cache.get(CacheNamespace.SESSION, 'key1'); // Hit

      const stats = cache.getStats();
      assert.strictEqual(stats.hits, 2);
      assert.strictEqual(stats.misses, 1);
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
      const obj = {
        id: 123,
        name: 'Test',
        nested: { key: 'value' },
        array: [1, 2, 3],
      };

      await cache.set(CacheNamespace.USER_DATA, 'obj', obj);
      const retrieved = await cache.get(CacheNamespace.USER_DATA, 'obj');

      assert.deepStrictEqual(retrieved, obj);
    });

    it('should cache arrays', async () => {
      const arr = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      await cache.set(CacheNamespace.API_RESPONSE, 'arr', arr);
      const retrieved = await cache.get(CacheNamespace.API_RESPONSE, 'arr');

      assert.deepStrictEqual(retrieved, arr);
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
