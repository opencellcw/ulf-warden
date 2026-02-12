# Quick Start - Pi Agent Bots

Get started with agent bots in 5 minutes! 🚀

## TL;DR

```bash
# Conversational bot (chat only)
@Ulf create a bot named helper
  personality: You are a helpful assistant

# Agent bot (with tools)
@Ulf create agent bot named devops
  personality: You are a DevOps expert
  tools: kubectl, bash, read
```

## 🤔 Which Bot Type?

```
Need to execute commands? → Agent bot 🤖
Just conversation?        → Conversational bot 💬
```

### Decision Tree

```
Is your bot...
  ├─ Answering questions only?
  │    └─ ✅ Use conversational bot
  │
  ├─ Reading files/logs?
  │    └─ ✅ Use agent bot (tool: read)
  │
  ├─ Checking Kubernetes status?
  │    └─ ✅ Use agent bot (tools: kubectl, read)
  │
  ├─ Scanning for security issues?
  │    └─ ✅ Use agent bot (tools: read, bash)
  │
  ├─ Modifying files/configs?
  │    └─ ⚠️ Use agent bot (tools: write, edit)
  │         Carefully consider security!
  │
  └─ Running arbitrary commands?
       └─ 🚨 Use agent bot (tool: bash)
            HIGH RISK - Minimal permissions only!
```

## 📋 Common Patterns

### 1. Support Bot (Conversational)

```
@Ulf create a bot named support
  personality: You are a friendly customer support agent.
  You answer questions about our products and help troubleshoot issues.
```

**Use when:**
- Answering FAQs
- Providing product information
- General customer support
- No system access needed

### 2. Monitoring Bot (Agent - Read-Only)

```
@Ulf create agent bot named monitor
  personality: You monitor system health and alert on issues.
  tools: read, kubectl
```

**Use when:**
- Checking pod status
- Reading log files
- Monitoring deployments
- No modifications needed

### 3. DevOps Bot (Agent - Limited Write)

```
@Ulf create agent bot named devops
  personality: You help with deployments and troubleshooting.
  tools: kubectl, bash, read
```

**Use when:**
- Deploying services
- Troubleshooting issues
- Running diagnostic commands
- Limited system modifications

### 4. Security Scanner (Agent - Analysis)

```
@Ulf create agent bot named guardian
  personality: You scan code for security vulnerabilities.
  tools: read, bash
```

**Use when:**
- Scanning for secrets
- Checking dependencies
- Analyzing configurations
- No modifications, just alerts

## 🛡️ Security Guidelines

### ✅ Safe Tool Combinations

```typescript
// Monitoring only (safest)
tools: ["read"]

// Kubernetes monitoring
tools: ["kubectl", "read"]

// Analysis and scanning
tools: ["read", "bash"]

// Limited DevOps
tools: ["kubectl", "bash", "read"]
```

### ⚠️ Use with Caution

```typescript
// Can modify files
tools: ["write", "edit"]

// Can modify infrastructure
tools: ["kubectl", "bash", "write"]

// Full access (avoid!)
tools: ["bash", "kubectl", "read", "write", "edit", "gcloud", "git"]
```

### 🚨 Red Flags

❌ Don't create agent bots that:
- Have bash + write + edit together
- Need all tools at once
- Perform actions without confirmation
- Handle production deployments automatically

✅ Instead:
- Use minimal tools needed
- Separate concerns (monitoring vs. deploying)
- Require human confirmation for destructive actions
- Test in dev environment first

## 🚀 Quick Examples

### Example 1: Log Analyzer

```
@Ulf create agent bot named logbot
  personality: You analyze application logs and identify issues.
  You help debug errors by reading log files.
  tools: read, bash
```

**Usage:**
```
@logbot analyze the last 100 lines of the api logs
@logbot find all errors from the last hour
@logbot what's causing the high response times?
```

### Example 2: Deployment Helper

```
@Ulf create agent bot named deployer
  personality: You help with Kubernetes deployments.
  You check deployment status and suggest fixes for issues.
  tools: kubectl, read
```

**Usage:**
```
@deployer check if the api deployment is healthy
@deployer why are pods failing?
@deployer scale the api to 3 replicas
```

### Example 3: Code Reviewer

```
@Ulf create agent bot named reviewer
  personality: You review code changes and suggest improvements.
  Focus on best practices and potential bugs.
  tools: read, git
```

**Usage:**
```
@reviewer review recent changes in src/handlers
@reviewer check for security issues
@reviewer suggest improvements for error handling
```

## 🔧 Troubleshooting

### Bot Not Using Tools

❌ **Problem:**
```
@devbot check the pods
→ "I don't have access to check pods"
```

✅ **Solution:**
```
# Be explicit
@devbot run kubectl get pods and analyze the output

# Or recreate with correct tools
@Ulf delete bot devbot
@Ulf create agent bot devbot tools: kubectl, read
```

### Tool Permission Error

❌ **Problem:**
```
@devbot write a config file
→ "Error: cannot use tool write"
```

✅ **Solution:**
```
# Check current tools
@Ulf check status of devbot

# Recreate with write permission if needed
@Ulf delete bot devbot
@Ulf create agent bot devbot tools: kubectl, read, write
```

### Slow Response

❌ **Problem:**
Agent bot takes very long to respond

✅ **Solutions:**
1. Use conversational bot if no tools needed
2. Break complex tasks into steps
3. Check for hanging commands in logs

## 📊 Comparison Chart

| Feature | Conversational | Agent |
|---------|----------------|-------|
| **Response Time** | ~2 seconds | ~5-10 seconds |
| **Cost** | Low | Medium |
| **Can read files?** | ❌ | ✅ |
| **Can run commands?** | ❌ | ✅ |
| **Can modify files?** | ❌ | ✅ (if allowed) |
| **Security risk** | Low | Medium-High |
| **Setup complexity** | Simple | Moderate |
| **Best for** | Chat, support | Automation, DevOps |

## 🎯 Recommendations

### Start Simple
1. Create conversational bot first
2. Test interactions
3. Identify if tools are needed
4. Upgrade to agent bot only if necessary

### Example Progression
```
# Week 1: Start with conversation
@Ulf create bot named helper personality: general assistant

# Week 2: Need to read files
@Ulf delete bot helper
@Ulf create agent bot helper tools: read personality: ...

# Week 3: Need to run commands
@Ulf delete bot helper
@Ulf create agent bot helper tools: read, bash personality: ...
```

## 🆘 Getting Help

### If bot doesn't work:
```
# 1. Check status
@Ulf check status of mybots

# 2. List all bots
@Ulf list all bots

# 3. Check logs (admin)
kubectl logs -n agents deployment/bot-mybot -f

# 4. Recreate if needed
@Ulf delete bot mybot
@Ulf create agent bot mybot ...
```

### If unsure about tools:
```
Start minimal:
  tools: ["read"]

Add incrementally:
  tools: ["read", "bash"]
  tools: ["read", "bash", "kubectl"]

Only add write if absolutely needed:
  tools: ["read", "write"]
```

## 📚 Learn More

- **Full Guide:** [docs/bot-factory-pi-integration.md](docs/bot-factory-pi-integration.md)
- **Examples:** [examples/bot-factory-examples.md](examples/bot-factory-examples.md)
- **Security:** See "Agent Bot Security" in [src/bot-factory/README.md](src/bot-factory/README.md)

## 💡 Pro Tips

1. **Name bots by function:** `monitor`, `deployer`, `scanner` (not `bot1`, `bot2`)
2. **Be specific in personality:** Detailed instructions = better behavior
3. **Test incrementally:** Start with read-only, add tools as needed
4. **Monitor usage:** Check logs to see what tools are actually used
5. **Delete unused bots:** Keep cluster clean

## ✅ Checklist

Before creating your first agent bot:

- [ ] Read this guide
- [ ] Decide which tools needed
- [ ] Choose minimal tool set
- [ ] Write clear personality
- [ ] Test in dev first
- [ ] Monitor bot behavior
- [ ] Review security implications
- [ ] Document bot purpose

---

Ready? Create your first agent bot! 🎉

```
@Ulf create agent bot named mybot
  personality: [Your bot's purpose]
  tools: [Minimal tools needed]
```

Questions? Check the docs or ask in Discord!
