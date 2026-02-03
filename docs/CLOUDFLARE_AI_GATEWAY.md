# Cloudflare AI Gateway Integration

This document explains how to set up and use Cloudflare AI Gateway with Ulf to improve reliability, reduce costs, and gain analytics.

## What is Cloudflare AI Gateway?

Cloudflare AI Gateway is a proxy that sits between your application and AI providers (like Anthropic). It provides:

1. **🔄 Automatic Fallback** - If Anthropic API is down, automatically switches to backup providers
2. **💰 Response Caching** - Cache responses to reduce API costs (up to 90% savings on repeated queries)
3. **📊 Unified Analytics** - Single dashboard for all AI requests across providers
4. **🛡️ Rate Limiting** - Protect against API abuse and control costs
5. **🔍 Request Logging** - Detailed logs of all AI interactions for debugging

## Benefits for Ulf

- **Cost Reduction**: Caching can save 30-50% on API costs
- **Improved Reliability**: Automatic fallback ensures bot stays online even if Anthropic has issues
- **Analytics**: Understand token usage, latency, and error patterns
- **Security**: Rate limiting prevents abuse
- **Free Tier**: 10 million requests/month on free plan

## Setup Instructions

### 1. Create Cloudflare Account

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Sign up or log in
3. No domain required for AI Gateway

### 2. Create AI Gateway

1. In Cloudflare dashboard, go to **AI** → **AI Gateway**
2. Click **Create Gateway**
3. Name your gateway (e.g., `ulf-gateway`)
4. Click **Create**

### 3. Get Configuration Values

After creating the gateway, you'll see:

- **Account ID**: A 32-character string (e.g., `abc123def456...`)
- **Gateway Slug**: The name you chose (e.g., `ulf-gateway`)

### 4. Configure Ulf

Add to your `.env` file or Google Secret Manager:

```bash
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
CLOUDFLARE_GATEWAY_SLUG=ulf-gateway
```

### 5. Deploy to GKE

#### Option A: Using Secret Manager (Recommended)

```bash
# Create secrets in Google Secret Manager
echo -n "your-cloudflare-account-id" | gcloud secrets create cloudflare-account-id \
  --data-file=- \
  --project=${PROJECT_ID}

echo -n "ulf-gateway" | gcloud secrets create cloudflare-gateway-slug \
  --data-file=- \
  --project=${PROJECT_ID}

# Update SecretProviderClass
kubectl edit secretproviderclass ulf-warden-agent-secrets -n agents
```

Add to `parameters.secrets`:

```yaml
- secretPath: "projects/${PROJECT_ID}/secrets/cloudflare-account-id/versions/latest"
  fileName: "cloudflare-account-id"
- secretPath: "projects/${PROJECT_ID}/secrets/cloudflare-gateway-slug/versions/latest"
  fileName: "cloudflare-gateway-slug"
```

Add to deployment env:

```yaml
- name: CLOUDFLARE_ACCOUNT_ID
  value: /mnt/secrets/cloudflare-account-id
- name: CLOUDFLARE_GATEWAY_SLUG
  value: /mnt/secrets/cloudflare-gateway-slug
```

#### Option B: Direct Environment Variables

Add to `infra/helm/agent/values.yaml`:

```yaml
env:
  - name: CLOUDFLARE_ACCOUNT_ID
    value: "your-account-id"
  - name: CLOUDFLARE_GATEWAY_SLUG
    value: "ulf-gateway"
```

### 6. Restart Deployment

```bash
kubectl rollout restart deployment/ulf-warden-agent -n agents
```

### 7. Verify

Check logs to confirm Gateway is enabled:

```bash
kubectl logs -n agents deployment/ulf-warden-agent | grep Gateway
```

You should see:

```
[Claude] Cloudflare AI Gateway enabled { accountId: 'abc123...', gatewaySlug: 'ulf-gateway' }
```

## Features and Configuration

### Response Caching

Enable caching in Cloudflare dashboard:

1. Go to your gateway settings
2. Enable **Cache Responses**
3. Set TTL (Time To Live) - recommended: 1 hour for development, 24 hours for production
4. Configure cache keys (default: full request body)

**Cost Savings Example:**
- Without cache: 1000 requests × 100k tokens = $5.00
- With 50% cache hit rate: 500 requests × 100k tokens = $2.50
- **Savings: 50% ($2.50/day or $75/month)**

### Rate Limiting

Protect against abuse:

1. Go to gateway settings
2. Enable **Rate Limiting**
3. Set limits:
   - Per user: 100 requests/minute
   - Per IP: 500 requests/minute

### Analytics Dashboard

View real-time metrics:

1. Go to AI Gateway dashboard
2. See:
   - Request volume over time
   - Token usage (input/output)
   - Latency percentiles (p50, p95, p99)
   - Error rates by provider
   - Cache hit rates
   - Cost estimates

### Fallback Providers

Configure automatic failover:

1. In gateway settings, add secondary providers:
   - Primary: Anthropic
   - Fallback: OpenAI GPT-4
2. Set failover conditions:
   - On 5xx errors
   - On timeout (>30s)
   - On rate limit

**Note**: This requires OpenAI API key and model mapping configuration.

## How It Works

### Request Flow

```
Discord Message
    ↓
Ulf Bot
    ↓
ClaudeProvider (src/llm/claude.ts)
    ↓
Anthropic SDK with baseURL override
    ↓
Cloudflare AI Gateway
    ↓
[Cache Check] → Cache Hit? Return cached response
    ↓ (Cache Miss)
Anthropic API
    ↓
Response cached by Gateway
    ↓
Return to Ulf
    ↓
Send to Discord
```

### Fallback Logic

If Gateway fails:

1. Ulf logs warning: `[Claude] Gateway failed, attempting fallback to direct API`
2. Creates new Anthropic client without baseURL override
3. Retries request directly to Anthropic API
4. Continues operation seamlessly

This ensures **100% uptime** even if Gateway has issues.

## Monitoring

### Log Messages

**Gateway Enabled:**
```
[Claude] Cloudflare AI Gateway enabled { accountId: 'abc123...', gatewaySlug: 'ulf-gateway' }
```

**Normal Request:**
```
[Claude] Generated response {
  model: 'claude-sonnet-4-20250514',
  processingTime: '1234ms',
  inputTokens: 150,
  outputTokens: 300,
  viaGateway: true
}
```

**Gateway Failure + Fallback:**
```
[Claude] Generation failed { error: 'Gateway timeout', viaGateway: true }
[Claude] Gateway failed, attempting fallback to direct API
[Claude] Fallback successful { model: 'claude-sonnet-4-20250514', ... }
```

### Kubectl Logs

```bash
# Watch for Gateway-related logs
kubectl logs -n agents deployment/ulf-warden-agent -f | grep -i gateway

# Check for fallback events
kubectl logs -n agents deployment/ulf-warden-agent --since=1h | grep -i fallback
```

### Cloudflare Dashboard

Monitor in real-time:

```
https://dash.cloudflare.com/<account-id>/ai/ai-gateway/<gateway-slug>
```

Metrics refreshed every 5 seconds.

## Cost Analysis

### Without Gateway

```
Monthly API Costs:
- 1M requests
- Avg 200 tokens/request
- 200M tokens total
- $3/million tokens (Claude Sonnet)
- Total: $600/month
```

### With Gateway (50% cache hit rate)

```
Monthly API Costs:
- 1M requests
- 50% cached (0 API cost)
- 500k actual API calls
- 100M tokens total
- $3/million tokens
- Total: $300/month
- Savings: $300/month (50%)
```

### With Gateway (70% cache hit rate)

```
Monthly API Costs:
- 1M requests
- 70% cached
- 300k actual API calls
- 60M tokens total
- Total: $180/month
- Savings: $420/month (70%)
```

**Gateway Cost**: $0 (free tier up to 10M requests/month)

## Troubleshooting

### Gateway Not Detected

**Symptom**: Logs show `[Claude] Using direct Anthropic API`

**Solution**:
1. Verify environment variables are set:
   ```bash
   kubectl exec -n agents deployment/ulf-warden-agent -- env | grep CLOUDFLARE
   ```
2. Check Secret Manager values
3. Restart deployment

### Gateway Errors

**Symptom**: All requests failing with Gateway errors

**Solution**:
1. Check Cloudflare dashboard for Gateway status
2. Verify Account ID and Gateway Slug are correct
3. Check Cloudflare API status: https://www.cloudflarestatus.com/
4. Fallback will automatically activate

### Cache Not Working

**Symptom**: 0% cache hit rate in dashboard

**Solution**:
1. Enable caching in Gateway settings
2. Check cache key configuration
3. Verify TTL is > 0
4. Test with identical requests

### High Latency

**Symptom**: Requests slower through Gateway

**Solution**:
1. Check Cloudflare edge location (should be close to your region)
2. Verify network path: `traceroute gateway.ai.cloudflare.com`
3. Check Anthropic API latency in dashboard
4. Gateway typically adds <50ms overhead

## Disabling Gateway

To temporarily disable Gateway without removing configuration:

```bash
# Method 1: Delete environment variables
kubectl set env deployment/ulf-warden-agent -n agents \
  CLOUDFLARE_ACCOUNT_ID- \
  CLOUDFLARE_GATEWAY_SLUG-

# Method 2: Set to empty string
kubectl set env deployment/ulf-warden-agent -n agents \
  CLOUDFLARE_ACCOUNT_ID="" \
  CLOUDFLARE_GATEWAY_SLUG=""
```

Bot will automatically fall back to direct Anthropic API.

## Advanced: Multiple Gateways

For different environments:

```yaml
# Development
CLOUDFLARE_GATEWAY_SLUG=ulf-dev

# Staging
CLOUDFLARE_GATEWAY_SLUG=ulf-staging

# Production
CLOUDFLARE_GATEWAY_SLUG=ulf-production
```

Each gateway has independent:
- Cache
- Rate limits
- Analytics
- Fallback rules

## Security Considerations

1. **API Key Protection**: Gateway does NOT log API keys
2. **Request Logging**: Be aware responses may be logged by Cloudflare (check their policy)
3. **HTTPS Only**: All traffic encrypted end-to-end
4. **No PII in Cache Keys**: Avoid caching requests with personal data

## Support

- **Cloudflare AI Gateway Docs**: https://developers.cloudflare.com/ai-gateway/
- **Ulf Issues**: https://github.com/cloudwalk/ulf-warden/issues
- **Cloudflare Support**: https://community.cloudflare.com/

## Summary

✅ **Cost Reduction**: 30-70% savings through caching
✅ **Improved Reliability**: Automatic fallback to direct API
✅ **Analytics**: Track usage, latency, errors
✅ **Easy Setup**: 5 minutes to configure
✅ **Zero Risk**: Automatic fallback ensures continuous operation

Enable Cloudflare AI Gateway to make Ulf more reliable and cost-effective!
