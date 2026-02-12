# Bot Factory - Pi Integration Guide

This guide explains the hybrid bot architecture that supports both **conversational bots** (Claude API) and **agent bots** (Pi-powered).

## Overview

The Bot Factory now supports two types of bots:

| Type | Provider | Capabilities | Use Cases |
|------|----------|--------------|-----------|
| **Conversational** | Claude API | Chat only | Support, FAQ, consulting |
| **Agent** | Pi (coding agent) | Chat + Tools (bash, read, write, etc.) | DevOps, automation, code analysis |

## Bot Types

### 💬 Conversational Bot

Simple chat bot using Claude API directly. Fast, cheap, and safe.

**Example:**
```
@Ulf create a bot named support with personality:
You are a helpful customer support agent. Answer questions about our products and services.
```

**Characteristics:**
- ✅ Fast response time
- ✅ Lower cost (no tool execution overhead)
- ✅ Safe (no command execution)
- ❌ Cannot execute commands
- ❌ Cannot read/write files
- ❌ Cannot interact with infrastructure

### 🤖 Agent Bot

Powerful agent using Pi coding agent. Can execute commands and interact with the environment.

**Example:**
```
@Ulf create agent bot named devops 
  personality: You are a Kubernetes expert who helps with deployments
  allowed_tools: ["bash", "kubectl", "read"]
```

**Characteristics:**
- ✅ Can execute commands (bash)
- ✅ Can read files
- ✅ Can write files
- ✅ Can interact with kubectl, gcloud, git
- ⚠️ Requires tool permissions (whitelist)
- ⚠️ Slower (tool execution overhead)
- ⚠️ Higher cost

## Creating Bots

### Conversational Bot

```typescript
// Via Discord
@Ulf create a bot named oracle
  personality: You are a data analysis consultant who provides insights

// Via Tool Call
{
  name: "create_bot",
  input: {
    name: "oracle",
    personality: "You are a data analysis consultant",
    type: "conversational", // default
    model: "sonnet"
  }
}
```

### Agent Bot

```typescript
// Via Discord
@Ulf create agent bot named devops
  personality: You are a Kubernetes expert
  tools: kubectl, bash, read

// Via Tool Call
{
  name: "create_bot",
  input: {
    name: "devops",
    personality: "You are a Kubernetes expert who helps with deployments",
    type: "agent",
    allowed_tools: ["bash", "kubectl", "read"],
    model: "sonnet"
  }
}
```

## Available Tools

Agent bots can use these tools (must be explicitly allowed):

| Tool | Description | Example Use Case |
|------|-------------|------------------|
| `bash` | Execute shell commands | Check logs, run scripts |
| `read` | Read files | Analyze configs, review code |
| `write` | Create/overwrite files | Generate configs, save reports |
| `edit` | Edit files precisely | Fix bugs, update configs |
| `kubectl` | Kubernetes CLI | Check pods, deployments |
| `gcloud` | Google Cloud CLI | Manage GCP resources |
| `git` | Git commands | Check repo status, create branches |

## Security & Permissions

### Tool Whitelisting

Each agent bot has a **whitelist** of allowed tools. The bot cannot use tools outside this list.

```typescript
// Example: DevOps bot
allowed_tools: ["bash", "kubectl", "read"]

// ✅ Can do:
- kubectl get pods
- read /etc/config.yaml
- bash -c "ps aux"

// ❌ Cannot do:
- write /etc/passwd (write not allowed)
- git clone ... (git not allowed)
```

### Best Practices

1. **Principle of Least Privilege**: Only grant tools the bot actually needs
2. **Read-Only When Possible**: Prefer `read` over `write` if the bot only analyzes
3. **No Bash for Simple Bots**: Conversational bots don't need bash access
4. **Audit Tool Usage**: Monitor bot logs for suspicious tool usage

### Example Configurations

```typescript
// Support Bot - No tools needed
{
  type: "conversational",
  allowed_tools: [] // or undefined
}

// Security Scanner - Read-only
{
  type: "agent",
  allowed_tools: ["read", "bash"] // Can scan but not modify
}

// DevOps Automation - Full access
{
  type: "agent",
  allowed_tools: ["bash", "kubectl", "read", "write", "gcloud"]
}

// Code Reviewer - Safe access
{
  type: "agent",
  allowed_tools: ["read", "git"] // Can review but not deploy
}
```

## Architecture

### Conversational Flow

```
User Message → Discord Handler → BotRuntime
                                      ↓
                                 ClaudeProvider (API)
                                      ↓
                                   Response
```

### Agent Flow

```
User Message → Discord Handler → BotRuntime
                                      ↓
                                  PiProvider (spawn pi)
                                      ↓
                            Pi executes with tools
                                      ↓
                                   Response
```

### Code Structure

```
src/
├── bot-factory/
│   ├── types.ts           # BotType, BotTool definitions
│   ├── executor.ts        # Bot creation with type validation
│   ├── bot-runtime.ts     # Runtime manager (choose provider)
│   └── tools.ts           # Tool definitions (updated)
└── llm/
    ├── claude.ts          # ClaudeProvider (conversational)
    └── pi-provider.ts     # PiProvider (agent)
```

## Installation

### Prerequisites

For agent bots to work, Pi must be installed in the container:

```dockerfile
# Dockerfile
FROM node:20-slim

# Install Pi coding agent globally
RUN npm install -g @mariozechner/pi-coding-agent

# ... rest of Dockerfile
```

Or for local development:

```bash
npm install -g @mariozechner/pi-coding-agent
```

### Environment Variables

```bash
# Required for all bots
ANTHROPIC_API_KEY=sk-ant-...

# Required for agent bots
# (Pi uses the same ANTHROPIC_API_KEY)
```

## Examples

### 1. Customer Support Bot (Conversational)

```
@Ulf create a bot named support
  personality: You are a friendly customer support agent.
  You help customers with product questions and troubleshooting.
  Always be polite and professional.
```

**Usage:**
```
@support How do I reset my password?
```

### 2. DevOps Bot (Agent)

```
@Ulf create agent bot named devops
  personality: You are a Kubernetes expert who helps with deployments.
  tools: kubectl, bash, read
```

**Usage:**
```
@devops check if all pods are running in the agents namespace

→ Bot runs: kubectl get pods -n agents
→ Analyzes output
→ Responds: "All 3 pods are running and healthy"
```

### 3. Security Scanner Bot (Agent)

```
@Ulf create agent bot named guardian
  personality: You monitor security issues and scan for vulnerabilities.
  tools: read, bash
```

**Usage:**
```
@guardian scan the repository for hardcoded secrets

→ Bot runs: bash -c "grep -r 'API_KEY' ."
→ Analyzes findings
→ Responds: "Found 2 potential secrets in config files"
```

### 4. Code Reviewer Bot (Agent)

```
@Ulf create agent bot named reviewer
  personality: You are a code review expert focusing on best practices.
  tools: read, git
```

**Usage:**
```
@reviewer review the recent changes in main branch

→ Bot runs: git diff main~5..main
→ Analyzes code
→ Responds with review comments
```

## Performance Comparison

| Metric | Conversational | Agent |
|--------|----------------|-------|
| **Response Time** | ~2 seconds | ~5-10 seconds |
| **Cost per Message** | $0.001 | $0.005-0.02 |
| **Token Usage** | Low | Medium-High |
| **Tool Execution** | None | Multiple possible |
| **Complexity** | Low | High |

## Troubleshooting

### Agent Bot Not Responding

1. **Check Pi installation:**
   ```bash
   kubectl exec -n agents deployment/bot-{name} -- which pi
   ```

2. **Check logs:**
   ```bash
   kubectl logs -n agents deployment/bot-{name} -f
   ```

3. **Verify workspace directory:**
   ```bash
   kubectl exec -n agents deployment/bot-{name} -- ls -la /tmp/bot-workspace
   ```

### Tool Permission Denied

If bot says "cannot use tool X":

1. Check `allowed_tools` in bot config
2. Recreate bot with correct tools:
   ```
   @Ulf delete bot {name}
   @Ulf create agent bot {name} ... tools: bash, read
   ```

### Pi Process Timeout

If agent takes too long (>5 minutes):

- Pi has a 5-minute timeout for safety
- Consider breaking complex tasks into smaller steps
- Use conversational bot if no tools needed

## Migration Guide

### Upgrading Existing Bots

Old bots (created before Pi integration) default to `conversational` type.

To upgrade to agent:

1. **Note bot configuration:**
   ```
   @Ulf check status of mybot
   ```

2. **Delete old bot:**
   ```
   @Ulf delete bot mybot
   ```

3. **Recreate as agent:**
   ```
   @Ulf create agent bot mybot
     personality: <same as before>
     tools: bash, read, kubectl
   ```

## Future Enhancements

- [ ] **Dynamic tool permissions** - Add/remove tools without recreating bot
- [ ] **Tool usage analytics** - Track which tools are used most
- [ ] **Custom tools** - Define bot-specific tools
- [ ] **Tool sandboxing** - Restrict bash commands to safe subset
- [ ] **Tool audit log** - Track all tool executions
- [ ] **Cost estimation** - Show cost before creating agent bot
- [ ] **Agent templates** - Pre-configured agent bots (devops, security, etc.)

## Support

For issues:

1. Check bot type: `@Ulf check status of {name}`
2. Review logs: `kubectl logs -n agents deployment/bot-{name}`
3. Test Pi locally: `pi --version`
4. File issue on GitHub with logs

## Resources

- [Pi Coding Agent Docs](https://github.com/mariozechner/pi-coding-agent)
- [Bot Factory README](./bot-factory.md)
- [Claude API Docs](https://docs.anthropic.com)
