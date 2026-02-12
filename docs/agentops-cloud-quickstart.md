# AgentOps Cloud - Quick Start Guide

Get full observability for OpenCell in 5 minutes using AgentOps Cloud.

## 🎯 What You Get

- 📊 **Real-time Dashboard** - See all bot sessions live
- 💰 **Cost Tracking** - Track spending per bot/user/platform
- 🔍 **Session Replay** - Watch execution step-by-step
- 🐛 **Error Debugging** - Full stack traces and context
- 📈 **Analytics** - Performance trends and insights

All in a beautiful web dashboard with zero infrastructure to manage!

---

## ⚡ Quick Start (5 minutes)

### Step 1: Sign Up (2 minutes)

1. Go to **https://www.agentops.ai**
2. Click "Sign Up" or "Get Started"
3. Create account (email + password or Google/GitHub)
4. Verify email

### Step 2: Get API Key (1 minute)

1. Login to dashboard: **https://app.agentops.ai**
2. Go to **Settings** or **API Keys**
3. Click "Create New API Key"
4. Copy the key (starts with `ak-` or similar)

### Step 3: Enable in OpenCell (2 minutes)

Run the automated script:

```bash
# From opencellcw directory
./scripts/enable-agentops-cloud.sh <YOUR_API_KEY>

# Example:
./scripts/enable-agentops-cloud.sh ak-1234567890abcdef
```

The script will:
- ✅ Set environment variables
- ✅ Restart deployment
- ✅ Verify initialization
- ✅ Show next steps

### Step 4: Verify (30 seconds)

Check logs:

```bash
kubectl logs -n agents deployment/ulf-warden-agent | grep AgentOps
```

You should see:
```
[AgentOps] Initialized successfully
```

### Step 5: Use and Monitor! 🎉

1. **Use any bot** (Discord, Slack, Telegram, WhatsApp)
2. **Open dashboard**: https://app.agentops.ai
3. **See the session appear** in real-time!

---

## 📊 What You'll See in Dashboard

### Session List

All bot interactions in one place:

```
┌─────────────────────────────────────────────────────────┐
│ Sessions                                                │
├─────────────────────────────────────────────────────────┤
│ 🟢 guardian-bot    user123   Discord   2m ago   $0.05  │
│ 🟢 devops-bot      user456   Slack     5m ago   $0.12  │
│ 🔴 support-bot     user789   WhatsApp  8m ago   FAILED │
│ 🟢 main-agent      user321   Discord   10m ago  $0.08  │
└─────────────────────────────────────────────────────────┘
```

**Filters:**
- By bot name
- By user
- By platform
- By success/failure
- By date range

### Session Detail

Click any session to see timeline:

```
Session: guardian-bot (user123, Discord)
Duration: 2m 15s
Cost: $0.05
Status: ✅ Success

Timeline:
┌─────────────────────────────────────────────────────────┐
│ [10:30:45] Session started                              │
│ [10:30:46] Message received: "Check for vulnerabilities"│
│ [10:30:47] Tool: read_file (250ms) ✅                    │
│ [10:30:48] Tool: bash_command (1.2s) ✅                  │
│ [10:30:49] LLM Call: Claude Opus 4                      │
│            Input: 1,500 tokens                          │
│            Output: 800 tokens                           │
│            Cost: $0.045                                 │
│ [10:30:51] Response sent (success)                      │
│ [10:32:00] Session ended                                │
└─────────────────────────────────────────────────────────┘
```

### Analytics Dashboard

See aggregate metrics:

**Today:**
- 📊 Total Sessions: 458
- ✅ Success Rate: 94.3%
- 💰 Total Cost: $12.45
- ⏱️ Avg Duration: 3.2s

**Top Bots:**
1. guardian-bot - 152 sessions ($5.20)
2. devops-bot - 134 sessions ($4.80)
3. support-bot - 98 sessions ($1.60)

**Cost Breakdown:**
- Claude Opus 4: $8.50 (68%)
- Claude Sonnet 4: $3.20 (26%)
- Moonshot Kimi: $0.75 (6%)

### Error Tracking

Failed sessions show:
- Error message
- Stack trace
- Context (bot, user, platform)
- Failed step in timeline
- Suggestions to fix

---

## 🔧 Configuration Options

### Basic Configuration (Default)

Already set by the script:
```bash
AGENTOPS_ENABLED=true
AGENTOPS_API_KEY=ak-xxxxx
AGENTOPS_TAGS=opencell,production
```

### Advanced Configuration

Add more tags or custom endpoint:

```bash
kubectl set env deployment/ulf-warden-agent -n agents \
  AGENTOPS_TAGS="opencell,production,gke,team-ai"
```

### Per-Bot Configuration

Track different bots with different tags:

```typescript
// When creating bot session
await bot.startSession(userId, 'discord');

// AgentOps automatically tags with:
// - Bot name
// - Bot type (conversational/agent)
// - Platform
// - Your custom tags
```

---

## 💰 Pricing

AgentOps Cloud offers:

**Free Tier:**
- 10,000 events/month
- 7-day data retention
- Basic analytics
- Email support

**Pro Tier:** ($49/month)
- Unlimited events
- 90-day data retention
- Advanced analytics
- Priority support

**Enterprise:** (Custom)
- Custom retention
- SSO/SAML
- Dedicated support
- SLA

**For OpenCell:** Free tier is enough for most deployments!

---

## 🎯 Use Cases

### 1. Cost Optimization

See which bots cost most:
```
💰 Monthly Cost: $148.50

By Bot:
├─ guardian (security): $65.20 (44%)
├─ devops (automation): $52.30 (35%)
└─ support (help): $31.00 (21%)

Action: Switch devops to Moonshot → Save $48/month
```

### 2. Performance Monitoring

Track response times:
```
⏱️ Average Response Time: 3.2s

Slowest Operations:
├─ GitHub API calls: 5.8s
├─ Database queries: 4.2s
└─ File operations: 2.1s

Action: Cache GitHub responses → 2x faster
```

### 3. Error Debugging

Find failing patterns:
```
🔴 Error Rate: 5.7% (26 failures)

Top Errors:
├─ Permission denied (kubectl): 15 (58%)
├─ API rate limit: 8 (31%)
└─ Timeout: 3 (11%)

Action: Increase kubectl permissions
```

### 4. User Analytics

Understand usage:
```
👥 Active Users: 87

Top Users:
├─ user123: 152 sessions
├─ user456: 98 sessions
└─ user789: 67 sessions

Peak Hours: 10am-12pm, 2pm-4pm
```

---

## 📱 Mobile Access

AgentOps dashboard is mobile-friendly:

1. Open https://app.agentops.ai on phone
2. Login
3. View sessions on-the-go
4. Get push notifications (optional)

---

## 🔗 Integrations

### Slack Notifications

Get alerts in Slack:
1. Go to AgentOps Settings
2. Connect Slack workspace
3. Choose alert types:
   - High error rate
   - Cost threshold exceeded
   - Performance degradation

### Email Alerts

Automatic emails for:
- Daily summary
- Weekly report
- Critical errors
- Cost alerts

---

## 🐛 Troubleshooting

### AgentOps not initializing

**Check logs:**
```bash
kubectl logs -n agents deployment/ulf-warden-agent | grep AgentOps
```

**Common issues:**

1. **Invalid API key**
   ```
   [AgentOps] Initialization failed: Invalid API key
   ```
   Solution: Check API key in dashboard, update deployment

2. **Network issues**
   ```
   [AgentOps] Connection timeout
   ```
   Solution: Check egress firewall rules

3. **Not enabled**
   ```
   [AgentOps] Disabled - Set AGENTOPS_ENABLED=true
   ```
   Solution: Run enable script again

### Sessions not appearing

**Check:**
1. AgentOps initialized successfully (logs)
2. Bot is creating sessions: `await bot.startSession()`
3. Sessions are ending: `await bot.endSession()`
4. API key is correct
5. Network connectivity

**Debug:**
```bash
# Check if events are being sent
kubectl logs -n agents deployment/ulf-warden-agent | grep "trackEvent\|startSession"
```

### High latency

AgentOps adds minimal latency (<10ms per event):

**If experiencing issues:**
1. Check network to AgentOps API
2. Reduce event frequency (if custom tracking)
3. Use async/non-blocking calls (already default)

---

## 🔒 Security

### Data Privacy

AgentOps stores:
- ✅ Session metadata (bot name, user ID, timestamps)
- ✅ Event data (tool calls, costs, errors)
- ✅ Performance metrics

AgentOps does **NOT** store:
- ❌ Message content (unless explicitly sent)
- ❌ User passwords or secrets
- ❌ API keys
- ❌ Sensitive business data

### Data Retention

- Free: 7 days
- Pro: 90 days
- Enterprise: Custom

After retention period, data is automatically deleted.

### Compliance

AgentOps is:
- SOC 2 Type II certified
- GDPR compliant
- CCPA compliant

---

## ✅ Next Steps

After enabling AgentOps Cloud:

1. **Use your bots** - Every interaction is tracked
2. **Explore dashboard** - Familiarize with features
3. **Set up alerts** - Get notified of issues
4. **Optimize costs** - Identify expensive operations
5. **Share with team** - Invite team members to dashboard

---

## 📚 Resources

- **Dashboard**: https://app.agentops.ai
- **Documentation**: https://docs.agentops.ai
- **GitHub**: https://github.com/AgentOps-AI/agentops
- **Community**: https://discord.gg/agentops
- **Support**: support@agentops.ai

---

## 🎉 Summary

**With AgentOps Cloud you get:**
- ✅ Full observability in 5 minutes
- ✅ Zero infrastructure to manage
- ✅ Beautiful web dashboard
- ✅ Real-time cost tracking
- ✅ Session replay and debugging
- ✅ Free tier for most use cases

**Just 3 commands:**
```bash
# 1. Sign up at agentops.ai
# 2. Get API key
# 3. Run:
./scripts/enable-agentops-cloud.sh <API_KEY>
```

**That's it!** 🚀

---

**Last Updated**: February 11, 2026  
**Version**: 1.0.0  
**Status**: ✅ Tested and Working
