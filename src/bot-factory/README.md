# Bot Factory

Transform Ulf into a "Bot Factory" where Discord admins can create and deploy new AI agents by simply talking to Ulf.

## Overview

Create two types of bots:

1. **Conversational Bots** 💬 - Simple chat using Claude API (fast, safe)
2. **Agent Bots** 🤖 - Powered by Pi with tools like bash, kubectl, read/write (powerful, needs permissions)

Instead of forking repositories and manually deploying, users can say:

```
"Ulf, create a bot called Guardian for security monitoring"
"Ulf, create agent bot named DevOps with tools: kubectl, bash"
```

And Ulf will automatically deploy a new bot to the same GKE cluster in ~30 seconds.

## Features

- **Two Bot Types**: Conversational (chat only) or Agent (with tools)
- **Conversational Bot Creation**: Create bots via Discord messages
- **Agent Tools**: bash, read, write, edit, kubectl, gcloud, git
- **Tool Whitelisting**: Each agent bot has explicit tool permissions
- **Multi-Tenancy**: All bots run in the same GKE cluster (`agents` namespace)
- **Shared Infrastructure**: Bots share Secret Manager, Artifact Registry, and Service Account
- **Isolated Pods**: Each bot gets its own deployment with unique configuration
- **Database Registry**: SQLite database tracks all deployed bots
- **Admin-Only**: Only Discord admins can create/delete bots

## Bot Types

| Type | Provider | Use Cases | Tools |
|------|----------|-----------|-------|
| **Conversational** 💬 | Claude API | Support, FAQ, consulting | None |
| **Agent** 🤖 | Pi | DevOps, automation, code analysis | bash, kubectl, read, write, etc. |

## Architecture

### Components

1. **Bot Registry** (`registry.ts`) - SQLite database for bot metadata
2. **Helm Generator** (`helm-generator.ts`) - Generates Helm values dynamically
3. **Deployer** (`deployer.ts`) - Kubernetes deployment orchestrator
4. **Discord Handler** (`discord-handler.ts`) - Natural language bot creation
5. **Tools** (`tools.ts`) - Claude tool definitions for bot management
6. **Executor** (`executor.ts`) - Tool execution handlers

### Database Schema

```sql
CREATE TABLE bots (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  personality TEXT NOT NULL,
  creator_discord_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'deploying',
  helm_release_name TEXT NOT NULL,
  deployment_config TEXT NOT NULL,
  last_health_check TIMESTAMP
);
```

## Usage

### Create Conversational Bot

```
User: "Ulf, create a bot named Support with personality: friendly customer support agent"
Ulf: "💬 Bot 'Support' created successfully!
      - Type: Conversational
      - Status: Running
      - Pod: bot-support-7d8f9c-xyz
      Try mentioning @Support to interact with it!"
```

### Create Agent Bot

```
User: "Ulf, create agent bot named DevOps with tools: kubectl, bash, read
       personality: Kubernetes expert who monitors deployments"
Ulf: "🤖 Bot 'DevOps' created successfully!
      - Type: Agent (with tools)
      - Tools: kubectl, bash, read
      - Status: Running
      - Pod: bot-devops-7d8f9c-xyz
      ⚠️ Agent Mode: This bot can execute commands. Use responsibly!"
```

### Create Bot (Tool Call)

```json
// Conversational bot
{
  "name": "create_bot",
  "input": {
    "name": "oracle",
    "personality": "You are a data analyst that helps with insights",
    "type": "conversational",
    "model": "sonnet"
  }
}

// Agent bot
{
  "name": "create_bot",
  "input": {
    "name": "devops",
    "personality": "You are a Kubernetes expert",
    "type": "agent",
    "allowed_tools": ["kubectl", "bash", "read"],
    "model": "sonnet"
  }
}
```

### List Bots

```
User: "Ulf, list all bots"
Ulf: "📋 Deployed Bots:
      ✅ guardian - Running (created 2 days ago)
      ✅ oracle - Running (created 1 day ago)"
```

### Get Bot Status

```json
{
  "name": "get_bot_status",
  "input": {
    "name": "guardian"
  }
}
```

### Delete Bot

```json
{
  "name": "delete_bot",
  "input": {
    "name": "guardian"
  }
}
```

## Prerequisites

### For All Bots

- Kubernetes cluster (GKE)
- kubectl configured
- Helm 3.x installed
- `ANTHROPIC_API_KEY` environment variable

### For Agent Bots (Additional)

Agent bots require **Pi coding agent** installed:

**In Docker/Production:**
```dockerfile
# Already added to Dockerfile
RUN npm install -g @mariozechner/pi-coding-agent
```

**Local Development:**
```bash
npm install -g @mariozechner/pi-coding-agent

# Verify installation
pi --version
```

Pi uses the same `ANTHROPIC_API_KEY` as conversational bots.

## Configuration

### Environment Variables

Required:
- `GCP_PROJECT_ID` - Google Cloud project ID
- `GCP_REGION` - GCP region (default: `us-central1`)
- `DISCORD_ADMIN_USER_IDS` - Comma-separated Discord user IDs with admin access
- `ANTHROPIC_API_KEY` - Claude API key (for both bot types)

Optional:
- `DATA_DIR` - Directory for SQLite database (default: `./data`)

### Bot Constraints

- **Name**: 3-15 characters, lowercase alphanumeric and hyphens only
- **Reserved Names**: `ulf`, `warden`, `system`, `admin`, `root`, `default`, `kube`
- **Bot Limit**: Maximum 10 bots per admin user
- **Model Options**: `sonnet`, `opus`, `haiku`
- **Bot Types**: `conversational` or `agent`
- **Available Tools** (agent only): `bash`, `read`, `write`, `edit`, `kubectl`, `gcloud`, `git`

## Kubernetes Resources

### Namespace
- All bots deploy to the `agents` namespace
- Namespace is created automatically if it doesn't exist

### Helm Release
- Each bot is a separate Helm release: `bot-{name}`
- Uses the existing `./infra/helm/agent` chart

### Resources per Bot
- Requests: 256Mi memory, 100m CPU
- Limits: 512Mi memory, 500m CPU

## Security

### Authorization
- Only users in `DISCORD_ADMIN_USER_IDS` can create/delete bots
- All bot creation/deletion events are logged

### Resource Limits
- Maximum 10 bots per admin user
- Bot names validated against reserved names
- Helm values validated before deployment

### Secret Management
- All bots share the same Secret Manager secrets
- Secrets: `ANTHROPIC_API_KEY`, `DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`

### Agent Bot Security

⚠️ **Important**: Agent bots can execute commands and modify files.

**Tool Whitelisting:**
- Each agent bot has an explicit list of allowed tools
- Bot cannot use tools outside its whitelist
- Tool validation happens before execution

**Best Practices:**
1. **Principle of Least Privilege**: Only grant tools the bot needs
2. **Avoid bash when possible**: Use specific tools (kubectl, git) instead
3. **Read-only when possible**: Prefer `read` over `write` for analysis bots
4. **Monitor tool usage**: Review bot logs regularly
5. **Test in dev first**: Create test agent bots before production

**Example Safe Configurations:**
```bash
# Monitoring bot (read-only)
allowed_tools: ["read", "kubectl"]

# DevOps bot (controlled access)
allowed_tools: ["kubectl", "bash", "read"]

# Security scanner (analysis only)
allowed_tools: ["read", "bash"]

# ❌ Avoid (too broad)
allowed_tools: ["bash", "write", "edit", "kubectl", "gcloud", "git"]
```

## Commands Detected

The Discord handler detects these patterns:

- "criar bot" / "create bot"
- "novo bot" / "new bot"
- "listar bots" / "list bots"
- "delete bot" / "deletar bot"
- "bot status" / "status do bot"

## File Structure

```
src/bot-factory/
├── README.md              # This file
├── index.ts               # Main exports
├── types.ts               # TypeScript interfaces (BotType, BotTool)
├── schema.sql             # Database schema
├── registry.ts            # Bot registry manager
├── helm-generator.ts      # Helm values generator
├── deployer.ts            # Kubernetes deployment
├── discord-handler.ts     # Discord command handler
├── tools.ts               # Claude tool definitions
├── executor.ts            # Tool execution handlers (type validation)
└── bot-runtime.ts         # Runtime manager (provider selection) ← NEW

src/llm/
├── claude.ts              # ClaudeProvider (conversational bots)
└── pi-provider.ts         # PiProvider (agent bots) ← NEW

docs/
├── bot-factory.md                  # User guide
└── bot-factory-pi-integration.md   # Pi integration guide ← NEW

examples/
└── bot-factory-examples.md         # Real-world examples ← NEW
```

## Testing

### Manual Testing - Conversational Bot

1. **Create bot**:
   ```
   @Ulf create a bot named testbot with personality: helpful assistant
   ```

2. **Verify creation**:
   ```
   @Ulf list all bots
   # Should show: 💬 testbot (conversational)
   ```

3. **Test interaction**:
   ```
   @testbot hello, how are you?
   ```

4. **Check status**:
   ```
   @Ulf check status of testbot
   # Should show: Type: conversational
   ```

5. **Cleanup**:
   ```
   @Ulf delete bot testbot
   ```

### Manual Testing - Agent Bot

1. **Create agent bot**:
   ```
   @Ulf create agent bot named devbot
     personality: helpful DevOps assistant
     tools: bash, read
   ```

2. **Verify creation**:
   ```
   @Ulf list all bots
   # Should show: 🤖 devbot (agent) - Tools: bash, read
   ```

3. **Test tool usage**:
   ```
   @devbot read the package.json file
   # Should actually read and show file contents
   ```

4. **Test bash**:
   ```
   @devbot run command: echo "Hello from agent bot"
   # Should execute bash command
   ```

5. **Test tool restriction**:
   ```
   @devbot write a file named test.txt
   # Should fail: "write" not in allowed tools
   ```

6. **Check status**:
   ```
   @Ulf check status of devbot
   # Should show: Type: agent, Tools: bash, read
   ```

7. **Cleanup**:
   ```
   @Ulf delete bot devbot
   ```

### Verification Commands

```bash
# Check deployed bots in Kubernetes
kubectl get pods -n agents

# Verify Helm releases
helm list -n agents

# Check bot registry in database
sqlite3 data/ulf.db "SELECT * FROM bots;"

# Tail bot logs
kubectl logs -n agents deployment/bot-testbot -f
```

## Documentation

- **[Bot Factory Pi Integration Guide](../../docs/bot-factory-pi-integration.md)** - Detailed guide on hybrid architecture
- **[Bot Factory Examples](../../examples/bot-factory-examples.md)** - Real-world bot configurations and use cases

## Future Enhancements

1. **Dynamic Tool Permissions** - Add/remove tools without recreating bot
2. **Tool Usage Analytics** - Track which tools are used most
3. **Custom Tools** - Define bot-specific tools beyond the defaults
4. **Tool Sandboxing** - Restrict bash to safe command subset
5. **Bot Templates** - Predefined personalities (CodeReviewer, SecurityGuard, DataAnalyst)
6. **Per-Bot Secrets** - Allow custom API keys per bot
7. **Resource Quotas** - CPU/memory limits per bot
8. **Bot Collaboration** - Bots can invoke each other via internal API
9. **Web Dashboard** - Visual management of bots
10. **Auto-scaling** - Scale bots based on message load
11. **Bot Monitoring** - Health checks and uptime tracking
12. **Bot Metrics** - Message count, token usage, response times, tool usage stats

## Troubleshooting

### Bot fails to deploy

Check logs:
```bash
kubectl logs -n agents deployment/bot-{name} -f
```

Verify Helm values:
```bash
helm get values bot-{name} -n agents
```

### Bot not responding in Discord

1. Check if pod is running: `kubectl get pods -n agents`
2. Check bot logs: `kubectl logs -n agents pod/bot-{name}-xxx`
3. Verify Discord token in Secret Manager
4. Check bot status: `@Ulf check status of {name}`

### Agent Bot Specific Issues

**Pi not found:**
```bash
# Check if pi is installed
kubectl exec -n agents deployment/bot-{name} -- which pi

# Should output: /usr/local/bin/pi
# If not found, rebuild Docker image with pi installed
```

**Tool permission denied:**
```
Problem: Bot says "cannot use tool X"

Solution:
1. Check bot config: @Ulf check status of {name}
2. Verify allowed_tools list
3. Recreate bot with correct tools if needed
```

**Agent bot timeout:**
```
Problem: Agent bot takes >5 minutes to respond

Causes:
- Complex bash command stuck
- Pi process hanging
- Network issues

Solutions:
1. Check Pi process: kubectl exec ... -- ps aux | grep pi
2. Kill stuck process: kubectl delete pod -n agents bot-{name}-xxx
3. Simplify bot tasks or break into smaller steps
```

**Tool execution fails:**
```
Problem: Agent runs tool but gets error

Debugging:
1. Check tool is in PATH:
   kubectl exec ... -- which kubectl

2. Check permissions:
   kubectl exec ... -- ls -la /tmp/bot-workspace

3. Test tool manually:
   kubectl exec ... -- kubectl get pods

4. Review bot logs for error details
```

### Database errors

Check database integrity:
```bash
sqlite3 data/ulf.db ".integrity_check"

# View bot configs
sqlite3 data/ulf.db "SELECT id, name, deployment_config FROM bots;"
```

## Contributing

When adding new features to Bot Factory:

1. Update types in `types.ts`
2. Add database migrations in `schema.sql`
3. Document new tools in `tools.ts`
4. Update this README with usage examples
