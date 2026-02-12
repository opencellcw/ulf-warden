# AgentOps Integration Guide

Complete guide for integrating AgentOps observability and cost tracking with OpenCell.

## 🎯 What is AgentOps?

**AgentOps** is an opensource observability platform for AI agents that provides:
- 📊 **Session replay** - Watch your agents work step-by-step
- 📈 **Performance metrics** - Response times, success rates, error rates
- 💰 **Cost tracking** - Token usage and cost per session/bot/user
- 🔍 **Debugging** - Timeline of events, tool calls, LLM interactions
- 📱 **Dashboard** - Beautiful web UI for monitoring

**GitHub**: https://github.com/AgentOps-AI/agentops  
**Website**: https://www.agentops.ai

---

## 🚀 Quick Start

### 1. Sign Up for AgentOps

```bash
# Option A: Use AgentOps Cloud (easiest)
# Sign up at https://www.agentops.ai
# Get your API key from dashboard

# Option B: Self-hosted (advanced)
docker run -p 8080:8080 agentops/server
docker run -p 3000:3000 agentops/dashboard
```

### 2. Configure OpenCell

Add to `.env`:

```bash
AGENTOPS_ENABLED=true
AGENTOPS_API_KEY=your-api-key-here

# Optional (for self-hosted):
AGENTOPS_ENDPOINT=http://localhost:8080

# Optional (for tagging):
AGENTOPS_TAGS=opencell,production
```

### 3. Restart OpenCell

```bash
npm run build
npm start

# You'll see in logs:
# [AgentOps] Initialized successfully
```

### 4. View Dashboard

Open AgentOps dashboard:
- **Cloud**: https://app.agentops.ai
- **Self-hosted**: http://localhost:3000

You'll see all bot sessions, tool calls, costs, and errors! 🎉

---

## 📊 What Gets Tracked

### Automatically Tracked

When AgentOps is enabled, OpenCell automatically tracks:

#### 1. **Bot Sessions**
Every bot interaction creates a session:
- Session start/end
- Bot name and type (conversational vs agent)
- Platform (Discord, Slack, etc.)
- User ID
- Duration

#### 2. **Message Processing**
Each message processed by a bot:
- Input message length
- Output response length
- Processing time (ms)
- Success/failure

#### 3. **LLM Calls**
Token usage and costs:
- Provider (Claude, Moonshot)
- Model used (Opus, Sonnet, Haiku)
- Input tokens
- Output tokens
- Cost in USD

#### 4. **Tool Executions** (Agent bots only)
When agent bots use tools:
- Tool name
- Arguments
- Result
- Duration
- Success/failure

#### 5. **Errors**
Any errors during execution:
- Error message
- Stack trace
- Context (bot ID, type)
- Timestamp

### Custom Events

You can also track custom events:

```typescript
import { getAgentOps } from './observability';

const agentOps = getAgentOps();

// Track custom event
await agentOps.trackEvent(sessionId, 'roundtable_vote', {
  agent: 'analyst',
  vote: 'proposal_A',
  score: 4.5
});
```

---

## 💻 API Reference

### Session Management

```typescript
import { BotRuntime } from './bot-factory/bot-runtime';

// Create bot runtime
const bot = new BotRuntime(config);

// Start session (automatically creates AgentOps session)
await bot.startSession(userId, 'discord');

// Process messages (automatically tracked)
const response = await bot.processMessage(userMessage);

// End session (automatically closes AgentOps session)
await bot.endSession(true); // true = success
```

### Manual Tracking

For advanced use cases:

```typescript
import { getAgentOps } from './observability';

const agentOps = getAgentOps();

// Start session manually
const sessionId = await agentOps.startSession({
  botName: 'my-bot',
  botType: 'agent',
  userId: 'user123',
  platform: 'discord',
  tags: ['custom', 'tag']
});

// Track tool execution
await agentOps.trackToolExecution(sessionId, {
  tool: 'web_search',
  args: { query: 'OpenCell' },
  result: { results: [...] },
  duration: 1250,
  timestamp: Date.now()
});

// Track cost
await agentOps.trackCost(sessionId, {
  provider: 'claude',
  model: 'claude-opus-4-20250514',
  inputTokens: 1500,
  outputTokens: 800,
  cost: 0.045,
  timestamp: Date.now()
});

// Track error
await agentOps.trackError(sessionId, {
  error: 'API rate limit exceeded',
  stack: error.stack,
  context: { userId: 'user123' },
  timestamp: Date.now()
});

// Track custom event
await agentOps.trackEvent(sessionId, 'custom_event', {
  data: 'anything you want'
});

// End session
await agentOps.endSession(sessionId, {
  success: true,
  metadata: { finalState: 'completed' }
});
```

---

## 📈 Dashboard Features

### Session List
- All sessions from all bots
- Filter by: bot, user, platform, success/failure
- Sort by: date, duration, cost
- Search by session ID or user

### Session Detail
- Timeline of all events
- Tool executions with args and results
- LLM calls with token usage
- Errors with stack traces
- Cost breakdown
- Session metadata

### Analytics
- Total sessions per bot
- Success rate per bot
- Average response time
- Total cost (daily, weekly, monthly)
- Most used tools
- Error frequency

### Cost Tracking
- Real-time cost accumulation
- Cost per bot
- Cost per user
- Cost per platform
- Cost breakdown by provider/model
- Budget alerts (if configured)

---

## 🔍 Example: Debugging a Failed Session

### 1. Find Session in Dashboard

Filter by:
- Status: Failed
- Bot: my-agent-bot
- Date: Last 24 hours

### 2. Open Session Detail

See timeline:
```
[10:30:45] Session started
[10:30:46] Message received: "Deploy to production"
[10:30:47] Tool: kubectl_apply (args: {...})
[10:30:48] Error: Permission denied
[10:30:48] Session ended (Failed)
```

### 3. Identify Issue

Error shows:
```
Permission denied
Context: { botId: 'my-agent-bot', tool: 'kubectl' }
```

### 4. Fix & Verify

- Add kubectl permissions to bot
- Test again
- Check dashboard - session now succeeds! ✅

---

## 💰 Cost Tracking Examples

### View Total Cost

Dashboard shows:
- **Today**: $2.45
- **This week**: $15.80
- **This month**: $48.30

### Cost by Bot

| Bot | Sessions | Cost |
|-----|----------|------|
| guardian | 450 | $18.50 |
| devops | 320 | $22.10 |
| support | 180 | $7.70 |

### Cost by Model

| Model | Tokens | Cost |
|-------|--------|------|
| Claude Opus 4 | 2.5M | $35.20 |
| Claude Sonnet 4 | 1.8M | $8.10 |
| Moonshot Kimi | 5.2M | $2.60 |

### Budget Alerts

Set budget in AgentOps dashboard:
- Daily limit: $10
- Weekly limit: $50
- Monthly limit: $200

Get alerts when:
- 80% of budget used
- 100% of budget used
- Unusual spending spike detected

---

## 🎯 Best Practices

### 1. Use Sessions for User Interactions

Start/end sessions for each user conversation:

```typescript
// Discord message received
await bot.startSession(message.author.id, 'discord');

// Process messages
const response = await bot.processMessage(message.content);
await message.reply(response);

// User stops responding (after timeout or explicit end)
await bot.endSession(true);
```

### 2. Tag Sessions

Use tags for filtering:

```typescript
await agentOps.startSession({
  botName: 'guardian',
  botType: 'agent',
  tags: [
    'security-scan',     // By feature
    'production',        // By environment
    'priority-high'      // By priority
  ]
});
```

### 3. Track All Tool Calls

Automatically tracked in BotRuntime, but for custom tools:

```typescript
const startTime = Date.now();
try {
  const result = await myCustomTool(args);
  await agentOps.trackToolExecution(sessionId, {
    tool: 'my_custom_tool',
    args,
    result,
    duration: Date.now() - startTime,
    timestamp: Date.now()
  });
} catch (error) {
  await agentOps.trackError(sessionId, {
    error: error.message,
    stack: error.stack,
    timestamp: Date.now()
  });
}
```

### 4. Review Metrics Weekly

Schedule weekly reviews:
- Success rate trends
- Cost increases
- Most common errors
- Bot performance comparisons

---

## 🐛 Troubleshooting

### AgentOps Not Starting

**Check logs:**
```bash
kubectl logs -n ulf deployment/ulf-warden | grep AgentOps
```

**Common issues:**
- Missing `AGENTOPS_API_KEY` in .env
- Invalid API key
- Network connectivity (if self-hosted)

**Solution:**
```bash
# Verify API key
echo $AGENTOPS_API_KEY

# Test connectivity
curl -H "Authorization: Bearer $AGENTOPS_API_KEY" \
  https://api.agentops.ai/v1/health
```

### Sessions Not Appearing in Dashboard

**Check:**
1. AgentOps is enabled: `AGENTOPS_ENABLED=true`
2. Sessions are being started: `await bot.startSession()`
3. Sessions are being ended: `await bot.endSession()`

**Debug:**
```typescript
// Check if AgentOps is working
const agentOps = getAgentOps();
console.log('AgentOps enabled:', agentOps.isEnabled());
```

### Cost Tracking Inaccurate

**Ensure:**
- Token usage is provided by LLM provider
- Model names are correct
- Cost calculation formula is up-to-date

**Update cost formula:**
```typescript
// In bot-runtime.ts, estimateCost() method
const costs: Record<string, { input: number; output: number }> = {
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-20250514': { input: 3, output: 15 },
  // Add new models here
};
```

---

## 📚 Additional Resources

- **AgentOps Documentation**: https://docs.agentops.ai
- **GitHub**: https://github.com/AgentOps-AI/agentops
- **TypeScript SDK**: https://github.com/AgentOps-AI/agentops-node
- **Community Discord**: https://discord.gg/agentops

---

## ✅ Summary

AgentOps provides:
- ✅ **Observability** - See what your bots are doing
- ✅ **Cost Tracking** - Know exactly what you're spending
- ✅ **Debugging** - Quickly identify and fix issues
- ✅ **Analytics** - Understand bot performance
- ✅ **Easy Integration** - Just 3 env vars to enable

**Enable it today and get insights into your OpenCell deployment!** 🚀

---

**Last Updated**: February 11, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
