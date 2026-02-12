# Observability Module

Provides observability, monitoring, and cost tracking for OpenCell using AgentOps.

## Features

- **Session Management** - Track bot interactions from start to finish
- **Tool Execution Tracking** - Monitor all tool calls with args, results, and timing
- **Cost Tracking** - Real-time cost tracking per session, bot, and user
- **Error Tracking** - Capture and analyze errors with full context
- **Custom Events** - Track any custom metrics you need

## Quick Start

### 1. Enable AgentOps

Add to `.env`:
```bash
AGENTOPS_ENABLED=true
AGENTOPS_API_KEY=your-api-key
```

### 2. Use in Your Code

```typescript
import { getAgentOps } from './observability';

const agentOps = getAgentOps();

// Start session
const sessionId = await agentOps.startSession({
  botName: 'my-bot',
  botType: 'agent',
  userId: 'user123',
  platform: 'discord'
});

// Track events automatically...

// End session
await agentOps.endSession(sessionId);
```

## Files

- **agentops.ts** - AgentOps client wrapper
- **index.ts** - Module exports

## Documentation

See [docs/agentops-integration.md](../../docs/agentops-integration.md) for complete guide.

## Dashboard

View metrics at:
- **Cloud**: https://app.agentops.ai
- **Self-hosted**: http://localhost:3000

## Cost Tracking

Automatically tracks:
- Input/output tokens
- Provider and model
- Real-time cost calculation
- Budget alerts (configure in dashboard)

## Example Usage

Already integrated in:
- `BotRuntime` - Automatic session tracking
- Bot Factory - Track bot creation/deletion
- RoundTable - Track multi-agent deliberations (coming soon)

Enable AgentOps to get insights into your OpenCell deployment! 📊
