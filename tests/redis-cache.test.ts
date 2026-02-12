import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { RedisCache } from '../src/core/redis-cache';

describe('RedisCache', () => {
  let cache: RedisCache;

  before(async () => {
    // Set env vars for testing
    process.env.REDIS_CACHE_ENABLED = 'true';
    process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    
    cache = new RedisCache();
    
    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  after(async () => {
    await cache.close();
  });

  it('should store and retrieve values', async () => {
    const key = 'test:key';
    const value = { foo: 'bar', timestamp: Date.now() };

    await cache.set(key, value, 60);
    const retrieved = await cache.get(key);

    assert.deepStrictEqual(retrieved, value);
  });

  it('should return null for missing keys', async () => {
    const retrieved = await cache.get('nonexistent:key');
    assert.strictEqual(retrieved, null);
  });

  it('should cache and retrieve LLM responses', async () => {
    const provider = 'claude';
    const model = 'claude-opus-4';
    const messages = [
      { role: 'user', content: 'Hello, how are you?' }
    ];
    const response = {
      content: 'I am doing well, thank you!',
      model,
      usage: { inputTokens: 10, outputTokens: 15 }
    };

    await cache.cacheLLMResponse(provider, model, messages, undefined, response, 60);

    const cached = await cache.getCachedLLMResponse(provider, model, messages, undefined);

    assert.deepStrictEqual(cached, response);
  });

  it('should track cache statistics', async () => {
    cache.resetStats();

    // Cache miss
    await cache.get('miss:key');

    // Cache hit
    await cache.set('hit:key', 'value', 60);
    await cache.get('hit:key');

    const stats = cache.getStats();

    assert.strictEqual(stats.hits, 1);
    assert.strictEqual(stats.misses, 1);
    assert(stats.hitRate >= 0 && stats.hitRate <= 100);
  });

  it('should check if keys exist', async () => {
    const key = 'exists:key';
    
    await cache.set(key, 'value', 60);
    const exists = await cache.exists(key);
    
    assert.strictEqual(exists, true);

    await cache.delete(key);
    const existsAfterDelete = await cache.exists(key);
    
    assert.strictEqual(existsAfterDelete, false);
  });

  it('should handle cache with different TTLs', async () => {
    const key = 'ttl:key';
    const value = 'test value';

    // Set with 2 second TTL
    await cache.set(key, value, 2);
    
    // Should exist immediately
    let retrieved = await cache.get(key);
    assert.strictEqual(retrieved, value);

    // Wait 3 seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Should be expired
    retrieved = await cache.get(key);
    assert.strictEqual(retrieved, null);
  });

  it('should pass health check when Redis is available', async () => {
    const healthy = await cache.healthCheck();
    assert.strictEqual(healthy, true);
  });

  it('should get cache info', async () => {
    const info = await cache.getInfo();
    
    assert(info !== null);
    assert(typeof info.keys === 'number');
    assert(typeof info.memory === 'string');
    assert(typeof info.uptime === 'number');
  });

  it('should deduplicate identical LLM requests', async () => {
    cache.resetStats();

    const provider = 'moonshot';
    const model = 'kimi-k2.5';
    const messages = [
      { role: 'user', content: 'What is 2+2?' }
    ];
    const response = {
      content: '4',
      model,
      usage: { inputTokens: 5, outputTokens: 1 }
    };

    // First request - cache miss
    await cache.cacheLLMResponse(provider, model, messages, undefined, response, 60);

    // Second identical request - cache hit
    const cached = await cache.getCachedLLMResponse(provider, model, messages, undefined);

    assert.deepStrictEqual(cached, response);

    const stats = cache.getStats();
    assert(stats.hits >= 1, 'Should have at least 1 cache hit');
  });
});
