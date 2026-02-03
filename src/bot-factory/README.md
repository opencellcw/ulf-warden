# Bot Factory

Transform Ulf into a "Bot Factory" where Discord admins can create and deploy new AI agents by simply talking to Ulf.

## Overview

Instead of forking repositories and manually deploying, users can say:

```
"Ulf, create a bot called Guardian for security monitoring"
```

And Ulf will automatically deploy a new bot to the same GKE cluster in ~30 seconds.

## Features

- **Conversational Bot Creation**: Create bots via Discord messages
- **Multi-Tenancy**: All bots run in the same GKE cluster (`agents` namespace)
- **Shared Infrastructure**: Bots share Secret Manager, Artifact Registry, and Service Account
- **Isolated Pods**: Each bot gets its own deployment with unique configuration
- **Database Registry**: SQLite database tracks all deployed bots
- **Admin-Only**: Only Discord admins can create/delete bots

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

### Create Bot (Natural Language)

```
User: "Ulf, create a bot named Guardian with personality: strict security monitor"
Ulf: "🤖 Creating bot 'Guardian'...
      - Status: Running
      - Pod: bot-guardian-7d8f9c-xyz
      Try mentioning @Guardian to interact with it!"
```

### Create Bot (Tool Call)

```json
{
  "name": "create_bot",
  "input": {
    "name": "oracle",
    "personality": "You are a data analyst that helps with insights and visualizations",
    "model": "sonnet",
    "enable_discord": true
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

## Configuration

### Environment Variables

Required:
- `GCP_PROJECT_ID` - Google Cloud project ID
- `GCP_REGION` - GCP region (default: `us-central1`)
- `DISCORD_ADMIN_USER_IDS` - Comma-separated Discord user IDs with admin access

Optional:
- `DATA_DIR` - Directory for SQLite database (default: `./data`)

### Bot Constraints

- **Name**: 3-15 characters, lowercase alphanumeric and hyphens only
- **Reserved Names**: `ulf`, `warden`, `system`, `admin`, `root`, `default`, `kube`
- **Bot Limit**: Maximum 10 bots per admin user
- **Model Options**: `sonnet`, `opus`, `haiku`

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
├── types.ts               # TypeScript interfaces
├── schema.sql             # Database schema
├── registry.ts            # Bot registry manager
├── helm-generator.ts      # Helm values generator
├── deployer.ts            # Kubernetes deployment
├── discord-handler.ts     # Discord command handler
├── tools.ts               # Claude tool definitions
└── executor.ts            # Tool execution handlers
```

## Testing

### Manual Testing

1. **Create a bot**:
   ```
   @Ulf create a bot named testbot with personality: helpful assistant
   ```

2. **List bots**:
   ```
   @Ulf list all bots
   ```

3. **Check bot status**:
   ```
   @Ulf check status of testbot
   ```

4. **Interact with bot**:
   ```
   @testbot hello
   ```

5. **Delete bot**:
   ```
   @Ulf delete bot testbot
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

## Future Enhancements

1. **Bot Templates** - Predefined personalities (CodeReviewer, SecurityGuard, DataAnalyst)
2. **Per-Bot Secrets** - Allow custom API keys per bot
3. **Resource Quotas** - CPU/memory limits per bot
4. **Bot Collaboration** - Bots can invoke each other via internal API
5. **Web Dashboard** - Visual management of bots
6. **Auto-scaling** - Scale bots based on message load
7. **Bot Monitoring** - Health checks and uptime tracking
8. **Bot Metrics** - Message count, token usage, response times

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

### Database errors

Check database integrity:
```bash
sqlite3 data/ulf.db ".integrity_check"
```

## Contributing

When adding new features to Bot Factory:

1. Update types in `types.ts`
2. Add database migrations in `schema.sql`
3. Document new tools in `tools.ts`
4. Update this README with usage examples
