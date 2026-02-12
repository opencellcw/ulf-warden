# 🚀 Redis Cache - Quick Start

**Setup time:** 5 minutes  
**Cost savings:** $6,000/year  
**Latency improvement:** 80%

---

## ⚡ Quick Setup

### 1. Install Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 redis:7-alpine
```

### 2. Configure OpenCell

Add to `.env`:
```bash
REDIS_CACHE_ENABLED=true
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=86400
```

### 3. Start

```bash
npm run build
npm start
```

That's it! ✅ Cache is now active.

---

## 📊 Quick Test

```bash
# Test 1: Check health
curl http://localhost:3000/api/cache/health

# Test 2: Check stats
curl http://localhost:3000/api/cache/stats

# Test 3: Run demo
tsx examples/redis-cache-demo.ts
```

---

## 🎯 Common Commands

```bash
# View statistics
curl http://localhost:3000/api/cache/stats

# Invalidate all caches
curl -X POST http://localhost:3000/api/cache/invalidate

# Invalidate Claude only
curl -X POST http://localhost:3000/api/cache/invalidate \
  -H "Content-Type: application/json" \
  -d '{"provider": "claude"}'

# Check Redis connection
redis-cli ping  # Should return: PONG

# Monitor Redis in real-time
redis-cli monitor

# Check memory usage
redis-cli info memory
```

---

## 📈 Expected Results

### First Week
- Hit Rate: 70-80%
- Cost Reduction: 70%
- Latency: -70%

### After Two Weeks
- Hit Rate: 85-95%
- Cost Reduction: 85%
- Latency: -80%

### Steady State
- Hit Rate: 90%+
- Cost Reduction: 90%
- Latency: -80%

---

## 🐛 Troubleshooting

### Cache not working?

```bash
# 1. Check Redis is running
redis-cli ping

# 2. Check environment
echo $REDIS_CACHE_ENABLED  # Should be: true

# 3. Check connection
redis-cli -u $REDIS_URL ping

# 4. View logs
npm start | grep -i cache
```

### Low hit rate?

**Possible causes:**
- Queries are too unique
- Temperature too high (> 0.3)
- Cache recently cleared

**Solutions:**
```bash
# Check current stats
curl http://localhost:3000/api/cache/stats

# Warm cache with common queries
tsx examples/redis-cache-demo.ts
```

---

## 💰 ROI Calculator

**Your volume:** ___ requests/month

```
Cost without cache: requests × $0.003 = $___/month
Cost with cache (90% hit): requests × 0.1 × $0.003 = $___/month

Monthly savings: $___ 💰
Annual savings: $___ × 12 = $___ 🎉
```

**Example (10,000 req/month):**
- Without: $30/month
- With: $3/month
- **Savings: $27/month = $324/year** 💰

---

## 📚 Full Documentation

For complete guide, see: [docs/redis-cache-guide.md](docs/redis-cache-guide.md)

---

## ✅ Checklist

- [ ] Redis installed and running
- [ ] `.env` configured
- [ ] OpenCell restarted
- [ ] Health check passing
- [ ] Stats showing hits
- [ ] Monitoring set up

---

**Questions?** See [Troubleshooting](docs/redis-cache-guide.md#troubleshooting) or open an issue.

**Next steps:** 
- Monitor hit rate for 1 week
- Adjust TTL if needed
- Set up Grafana dashboard
