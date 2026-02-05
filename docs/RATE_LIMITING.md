# Rate Limiting - Per-Endpoint Configuration

## Overview

OpenCellCW implements comprehensive rate limiting to prevent abuse of expensive APIs and resources. Rate limits are enforced **per user** and **per tool**, with different limits based on resource cost.

## Rate Limit Tiers

| Category | Limit | Window | Tools |
|----------|-------|--------|-------|
| **AI Generation** | 10 req | 1 hour | Replicate, OpenAI, ElevenLabs |
| **Web Hosting** | 20 req | 1 hour | deploy_public_app, delete_public_app |
| **External APIs** | 60 req | 1 hour | GitHub, web_fetch, web_extract |
| **File Writes** | 120 req | 1 hour | write_file, file_backup |
| **Shell Commands** | 100 req | 1 hour | execute_shell, process_start |
| **Read Operations** | 200 req | 1 hour | read_file, list_directory (default) |

## Admin Privileges

Admin users receive **5x multiplier** on all rate limits:

- AI Generation: 10 → **50/hour**
- Web Hosting: 20 → **100/hour**
- External APIs: 60 → **300/hour**
- etc.

**Configuring admins:**
```bash
# .env
DISCORD_ADMIN_USER_IDS=123456789,987654321
```

Admins are automatically:
1. Loaded from `DISCORD_ADMIN_USER_IDS`
2. Given 5x rate limit multiplier
3. Tracked separately in metrics

## How It Works

### 1. Rate Limit Check Flow

```
User requests tool
    ↓
1. Check blocklist (blocked-tools.ts)
    ↓
2. Check rate limit (rate-limiter-enhanced.ts) ← NEW
    ↓
3. Check concurrency (max 5 tools per user)
    ↓
4. Execute tool with timeout
```

### 2. Storage

- **Primary:** Redis (distributed, persistent)
- **Fallback:** In-memory (single pod)

Uses the unified cache system (`src/core/cache.ts`).

### 3. Rate Limit Keys

Format: `rate-limit:{userId}:{toolName}`

Example:
```
rate-limit:discord:123456789:replicate_generate_image
rate-limit:discord:987654321:deploy_public_app
```

## Error Messages

When rate limit is exceeded, users receive:

```
Rate limit exceeded. Maximum 10 requests per hour.
Please wait 3427s before trying again.
```

Error includes:
- Current limit
- Retry-after time (seconds)
- Category-specific message

## Configuration Files

### `src/security/rate-limit-config.ts`

Defines rate limits for each tool category:

```typescript
const AI_GENERATION_LIMIT: RateLimitRule = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 15 * 60 * 1000, // Block 15 min
  message: 'AI generation rate limit exceeded. Limit: 10 requests per hour.'
};

export const TOOL_RATE_LIMITS: EndpointRateLimits = {
  'replicate_generate_image': AI_GENERATION_LIMIT,
  'replicate_*': AI_GENERATION_LIMIT, // Wildcard
  // ... etc
};
```

### `src/security/rate-limit-instance.ts`

Singleton instance with configuration:

```typescript
const config: RateLimitConfig = {
  defaultRule: DEFAULT_RATE_LIMIT,
  endpointRules: TOOL_RATE_LIMITS,
  adminUsers: getAdminUsers(),
  enableHeaders: false, // Not using HTTP for tools
};
```

### `src/security/tool-executor.ts`

Integration point - checks rate limit before execution:

```typescript
// 2. Check rate limit
const rateLimiter = getToolRateLimiter();
const rateLimitCheck = await rateLimiter.checkLimit({
  path: toolName,
  ip: userId,
} as any);

if (!rateLimitCheck.allowed) {
  throw new Error(
    `${rateLimitCheck.message}\n` +
    `Please wait ${rateLimitCheck.retryAfter}s before trying again.`
  );
}
```

## Metrics

### Available Metrics

```typescript
{
  total: {
    requests: 1234,
    allowed: 1200,
    blocked: 34,
    blockRate: "2.75%"
  },
  topBlockedEndpoints: [
    {
      endpoint: "replicate_generate_image",
      blocked: 15,
      allowed: 85
    }
  ],
  topBlockedUsers: [
    {
      userId: "disc...6789",
      blocked: 8,
      allowed: 92
    }
  ]
}
```

### Accessing Metrics

```typescript
import { getToolRateLimiterMetrics } from './security/rate-limit-instance';

const metrics = getToolRateLimiterMetrics();
console.log('Block rate:', metrics.total.blockRate);
```

## Pattern Matching

Rate limits support wildcard patterns:

```typescript
'replicate_*': AI_GENERATION_LIMIT,  // Matches all Replicate tools
'openai_*': AI_GENERATION_LIMIT,     // Matches all OpenAI tools
'github_*': EXTERNAL_API_LIMIT,      // Matches all GitHub tools
```

Most specific match wins:
```typescript
'replicate_generate_image': AI_GENERATION_LIMIT,  // Exact match (used)
'replicate_*': AI_GENERATION_LIMIT,               // Wildcard (fallback)
```

## Testing

### Manual Testing

```bash
# Test AI generation limit
for i in {1..12}; do
  # Send Discord message: "Generate an image of a cat"
  echo "Request $i"
  sleep 2
done
# Expected: First 10 succeed, last 2 fail with rate limit error
```

### Unit Tests

See `tests/security/rate-limiter-enhanced.test.ts` (TODO)

## Monitoring

### Redis Keys

Check current rate limits:
```bash
redis-cli KEYS "rate-limit:*"
redis-cli GET "rate-limit:discord:123456789:replicate_generate_image"
```

### Logs

Rate limit violations are logged:
```
[WARN] [ToolExecutor] Rate limit exceeded
  tool: replicate_generate_image
  userId: disc...6789
  limit: 10
  retryAfter: 3427
```

## Future Improvements

1. **Dynamic Limits** - Adjust based on system load
2. **Cost-Based Limits** - Track actual API costs, not just request count
3. **Burst Allowance** - Allow short bursts within limits
4. **User Tiers** - Different limits for free/paid users
5. **Dashboard** - Web UI for viewing/adjusting limits

## Environment Variables

```bash
# Admin users (Discord IDs)
DISCORD_ADMIN_USER_IDS=123456789,987654321

# Rate limit specific admins (optional)
RATE_LIMIT_ADMIN_USERS=user1,user2

# Default rate limit (optional, affects read-only tools)
RATE_LIMIT_DEFAULT=200
RATE_LIMIT_WINDOW_MS=3600000

# Enable/disable headers (for HTTP APIs)
RATE_LIMIT_HEADERS=true
```

## Architecture

```
┌─────────────────────────────────────────┐
│         User Request (Discord)          │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│       tool-executor.ts                  │
│  1. Blocklist check                     │
│  2. Rate limit check ◄── NEW            │
│  3. Concurrency check                   │
│  4. Execute tool                        │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│    rate-limit-instance.ts               │
│  - Singleton EnhancedRateLimiter        │
│  - Configured with tool limits          │
│  - Loads admin users                    │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│    rate-limiter-enhanced.ts             │
│  - Check user + tool limit              │
│  - Update counter in cache              │
│  - Return allowed/denied                │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│           cache.ts (Redis)              │
│  Key: rate-limit:{user}:{tool}         │
│  Value: { count, resetAt }             │
│  TTL: windowMs (1 hour)                 │
└─────────────────────────────────────────┘
```

## Summary

**✅ Implemented:**
- Per-tool rate limits (10-200/hour depending on cost)
- Admin multipliers (5x)
- Redis-backed with in-memory fallback
- Comprehensive metrics
- Helpful error messages

**✅ Protects:**
- Expensive APIs (Replicate, OpenAI, ElevenLabs)
- Web hosting abuse
- Resource exhaustion
- Cost overruns

**✅ Maintains:**
- User productivity (generous limits for normal use)
- Admin productivity (5x multiplier)
- System stability (distributed via Redis)
