# 🫀 Heartbeat System

## Overview

The Heartbeat System gives Ulf **autonomous capabilities** by performing periodic checks without waiting for user input. This transforms Ulf from a reactive chatbot into a proactive assistant.

## How It Works

```
┌─────────────────────────────────────────────────────┐
│         Every N minutes (configurable)             │
│                                                     │
│  1. Load workspace context (MEMORY.md, etc.)      │
│  2. Call Claude with "Heartbeat check" prompt     │
│  3. Claude reviews state and decides:             │
│     - Everything OK → "HEARTBEAT_OK"              │
│     - Issue found → Brief alert message           │
│  4. If alert: Send to Slack (unless quiet hours)  │
└─────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```env
# Enable/disable heartbeat
HEARTBEAT_ENABLED=true

# Check interval in minutes (default: 30)
HEARTBEAT_INTERVAL_MINUTES=30

# Slack channel for alerts (default: ulf-heartbeat)
HEARTBEAT_CHANNEL=ulf-heartbeat
```

### Quiet Hours

By default, alerts are suppressed between **23:00 and 07:00** (11 PM - 7 AM).

This is configured in `src/heartbeat/types.ts`:
```typescript
quietHoursStart: 23,  // 11 PM
quietHoursEnd: 7      // 7 AM
```

## What Ulf Checks

During each heartbeat, Ulf autonomously reviews:

1. **Pending Actions** - Any follow-ups or tasks mentioned by users
2. **Recent Interactions** - Issues or patterns in conversations
3. **Scheduled Tasks** - Due dates or reminders
4. **System Health** - Memory usage, running processes, etc.

## Response Format

Ulf uses a special format to indicate status:

### ✅ Everything OK
```
HEARTBEAT_OK
```
→ No alert sent, just logged

### ⚠️ Attention Needed
```
⚠️ Memory usage is high (85%). Consider reviewing and archiving old sessions.
```
→ Alert sent to Slack

```
📅 Reminder: User asked to follow up on project X today.
```
→ Alert sent to Slack

## State Tracking

Heartbeat state is persisted in `/data/heartbeat-state.json`:

```json
{
  "lastCheck": "2026-01-30T06:30:00.000Z",
  "checksPerformed": 142,
  "alertsSent": 5,
  "lastAlert": "2026-01-29T14:22:00.000Z"
}
```

## Usage

### Start Automatically (Production)

Heartbeat starts automatically when `HEARTBEAT_ENABLED=true`:

```bash
# In .env or Render dashboard
HEARTBEAT_ENABLED=true
HEARTBEAT_INTERVAL_MINUTES=30
```

### Manual Trigger (Testing)

```typescript
import { getHeartbeatManager } from './heartbeat/heartbeat-manager';

const heartbeat = getHeartbeatManager();
const check = await heartbeat.trigger();

console.log(check);
// {
//   timestamp: "2026-01-30T06:30:00.000Z",
//   type: "alert",
//   message: "⚠️ ...",
//   requiresAttention: true
// }
```

## Examples

### Example 1: All Good
```
[Heartbeat] Performing check
[Heartbeat] Check response: "HEARTBEAT_OK"
[Heartbeat] No alert needed
```

### Example 2: Memory Alert
```
[Heartbeat] Performing check
[Heartbeat] Check response: "⚠️ Memory usage is high..."
[Heartbeat] Alert sent to Slack
```

Message in Slack:
```
🔔 Heartbeat Alert

⚠️ Memory usage is high (85%). Consider reviewing and archiving old sessions.

2026-01-30T06:30:00.000Z
```

### Example 3: Reminder
```
[Heartbeat] Performing check
[Heartbeat] Check response: "📅 Reminder: User asked..."
[Heartbeat] Alert sent to Slack
```

## Architecture

```
src/heartbeat/
├── types.ts                 # Types and config
├── heartbeat-manager.ts     # Main logic
└── README.md               # This file

Integrates with:
- src/index.ts              # Initialization
- src/workspace.ts          # Context loading
- src/logger.ts             # Logging
```

## API

### `HeartbeatManager`

```typescript
class HeartbeatManager {
  // Start heartbeat loop
  start(): void;

  // Stop heartbeat loop
  stop(): void;

  // Get current state
  getState(): HeartbeatState;

  // Manual trigger (testing)
  trigger(): Promise<HeartbeatCheck>;
}
```

### Singleton Access

```typescript
import { getHeartbeatManager } from './heartbeat/heartbeat-manager';

// Get instance (must be initialized first)
const heartbeat = getHeartbeatManager();
```

## Benefits

### Before Heartbeat:
- ❌ Ulf waits for user input
- ❌ Misses scheduled tasks
- ❌ No proactive monitoring
- ❌ High memory usage goes unnoticed

### After Heartbeat:
- ✅ Ulf checks status autonomously
- ✅ Sends reminders for tasks
- ✅ Alerts on issues (memory, errors)
- ✅ Feels like a real assistant

## Future Enhancements

### 1. Smart Scheduling
Instead of fixed intervals, check more frequently during work hours:
```typescript
// 15 min during work hours (9-5)
// 60 min during off hours
```

### 2. Health Metrics
Monitor and report:
- API response times
- Error rates
- Memory/CPU usage
- Database size

### 3. Context Awareness
Use calendar/time for reminders:
```typescript
// "It's 9am Monday, user has meeting in 30 min"
```

### 4. Learning
Track patterns:
- When does user need reminders?
- What alerts are most useful?
- Adjust frequency accordingly

## Troubleshooting

### Heartbeat not starting

Check logs:
```bash
# Should see:
[Heartbeat] Initialized
[Heartbeat] Started
[Heartbeat] Performing check
```

If not:
1. Verify `HEARTBEAT_ENABLED=true`
2. Check Slack token is valid
3. Ensure Claude API key is set

### No alerts in Slack

Possible causes:
1. **Quiet hours** - Check time (23:00-07:00 suppressed)
2. **Channel missing** - Create `#ulf-heartbeat` channel
3. **Everything OK** - Ulf is returning `HEARTBEAT_OK`

Check state:
```bash
cat data/heartbeat-state.json
# If alertsSent = 0, Ulf hasn't found issues
```

### Too many alerts

Adjust sensitivity by modifying the prompt in `heartbeat-manager.ts`:
```typescript
// Add: "Only alert if CRITICAL"
```

Or increase interval:
```env
HEARTBEAT_INTERVAL_MINUTES=60  # 1 hour
```

## Cost Considerations

Each heartbeat check makes one Claude API call:
- Model: `claude-sonnet-4-20250514`
- Tokens: ~500-1000 per check
- Cost: ~$0.003-0.015 per check

With 30-minute intervals:
- 48 checks/day
- 1,440 checks/month
- **Cost: ~$4-20/month**

To reduce costs:
- Increase interval (60 minutes)
- Use cheaper model (`haiku`)
- Disable during nights/weekends

## Comparison to Other Systems

| System | Approach | Pros | Cons |
|--------|----------|------|------|
| **Cron** | Scheduled commands | Precise timing | No intelligence |
| **Heartbeat** | Periodic AI checks | Contextual, flexible | API cost |
| **Webhooks** | Event-driven | Real-time | Needs external trigger |
| **Polling** | Check external APIs | Stays synced | High frequency needed |

Heartbeat is best for **intelligent autonomous monitoring** where you want the AI to decide what's important.

---

## Summary

The Heartbeat System transforms Ulf from reactive to proactive:

**Reactive (before):**
```
User: "Remind me tomorrow"
Ulf: "OK!"
[Never reminds - no autonomous capability]
```

**Proactive (after):**
```
User: "Remind me tomorrow"
Ulf: "OK!"
[Next day, heartbeat detects reminder due]
Ulf in Slack: "📅 Reminder: You asked me to remind you about X"
```

**Enable it today:**
```env
HEARTBEAT_ENABLED=true
HEARTBEAT_INTERVAL_MINUTES=30
HEARTBEAT_CHANNEL=ulf-heartbeat
```

🫀 **Your Ulf now has a heartbeat!**
