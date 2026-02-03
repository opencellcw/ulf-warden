# Bot Factory Migration Guide

This guide helps you migrate to the new Bot Factory feature.

## What is Bot Factory?

Bot Factory allows Discord admins to create and deploy new AI agents dynamically through conversation with Ulf, without manually forking repos or running deployment scripts.

## Prerequisites

Before enabling Bot Factory, ensure you have:

1. **Kubernetes Cluster** - A running GKE cluster
2. **kubectl Access** - Configured kubectl with cluster access
3. **Helm Installed** - Helm 3.x installed
4. **Admin Permissions** - Discord admin user IDs configured

## Migration Steps

### 1. Set Environment Variables

Add to your `.env` file:

```bash
# Required
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1
DISCORD_ADMIN_USER_IDS=123456789,987654321

# Optional
DATA_DIR=./data
```

Get your Discord user ID:
1. Enable Developer Mode in Discord (User Settings > Advanced)
2. Right-click your username
3. Click "Copy User ID"

### 2. Rebuild the Application

```bash
npm run build
```

### 3. Deploy/Restart Ulf

If running locally:
```bash
npm start
```

If deployed to Kubernetes:
```bash
# Rebuild Docker image
docker build -t ulf-warden:latest .

# Push to Artifact Registry
docker tag ulf-warden:latest ${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-warden:latest
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-warden:latest

# Restart deployment
kubectl rollout restart deployment/ulf-warden -n ulf
```

### 4. Verify Installation

Send a message to Ulf in Discord:

```
@Ulf list all bots
```

Expected response:
```
📋 No bots deployed yet.

Use `create_bot` to deploy your first bot!
```

### 5. Create Your First Bot

Try creating a test bot:

```
@Ulf create a bot named testbot with personality: You are a helpful testing assistant
```

Expected flow:
1. Ulf analyzes your request (~2 seconds)
2. Generates bot configuration
3. Deploys to Kubernetes (~30 seconds)
4. Confirms deployment with pod name

### 6. Verify Bot is Running

Check in Discord:
```
@Ulf check status of testbot
```

Check in Kubernetes:
```bash
kubectl get pods -n agents
kubectl logs -n agents deployment/bot-testbot -f
```

### 7. Interact with Your Bot

```
@testbot hello
```

The new bot should respond independently of Ulf.

## Database Migration

Bot Factory uses the existing `ulf.db` SQLite database. The schema is automatically created on first run.

To verify:
```bash
sqlite3 data/ulf.db "SELECT name FROM sqlite_master WHERE type='table' AND name='bots';"
```

Expected output:
```
bots
```

## Rollback Plan

If you need to rollback:

1. **Delete all created bots**:
   ```bash
   helm list -n agents
   helm uninstall bot-{name} -n agents  # For each bot
   ```

2. **Remove bot registry table** (optional):
   ```bash
   sqlite3 data/ulf.db "DROP TABLE IF EXISTS bots;"
   ```

3. **Revert code changes**:
   ```bash
   git checkout main
   npm run build
   npm start
   ```

## Troubleshooting

### Issue: "Only admins can create bots"

**Solution**: Verify `DISCORD_ADMIN_USER_IDS` is set correctly:
```bash
echo $DISCORD_ADMIN_USER_IDS
```

### Issue: "GCP_PROJECT_ID environment variable is required"

**Solution**: Add `GCP_PROJECT_ID` to your `.env` file:
```bash
echo "GCP_PROJECT_ID=your-project-id" >> .env
```

### Issue: Helm deployment fails

**Solution**: Check kubectl access:
```bash
kubectl cluster-info
kubectl get nodes
```

Verify Helm chart exists:
```bash
ls -la infra/helm/agent/
```

### Issue: Bot not responding in Discord

**Solution**: Check pod status:
```bash
kubectl get pods -n agents
kubectl logs -n agents pod/bot-{name}-xxx
```

Verify Discord token in Secret Manager:
```bash
gcloud secrets versions access latest --secret="DISCORD_BOT_TOKEN"
```

### Issue: Database errors

**Solution**: Check database file:
```bash
ls -la data/ulf.db
sqlite3 data/ulf.db ".integrity_check"
```

## Post-Migration Checklist

- [ ] Environment variables set
- [ ] Application rebuilt and restarted
- [ ] Can list bots (returns empty list)
- [ ] Successfully created test bot
- [ ] Test bot responds to messages
- [ ] Test bot status command works
- [ ] Successfully deleted test bot
- [ ] Verified agents namespace exists
- [ ] Checked logs for errors

## Resource Limits

After migration, be aware of:

- **Max bots per admin**: 10
- **Max proposals per day**: 5 (self-improvement system)
- **Bot name length**: 3-15 characters
- **Memory per bot**: 512Mi limit
- **CPU per bot**: 500m limit

## Next Steps

After successful migration:

1. Create production bots with specific personalities
2. Monitor bot resource usage
3. Set up alerts for bot failures
4. Document bot personalities for your team
5. Consider implementing bot templates (future feature)

## Support

For issues:
1. Check logs: `kubectl logs -n ulf deployment/ulf-warden`
2. Review database: `sqlite3 data/ulf.db "SELECT * FROM bots;"`
3. File an issue on GitHub with logs and error messages

## Security Considerations

- Only admins can create/delete bots
- All bots share the same API keys
- Bots run in isolated pods
- Bot creation is logged
- Consider implementing pod security policies
- Monitor bot activity for abuse

## Performance Notes

- Each bot consumes ~256Mi-512Mi memory
- Recommend max 20-30 bots per cluster
- Monitor cluster node capacity
- Consider node autoscaling for large deployments
# Bot Factory Quick Start

Create and deploy AI bots in seconds through Discord conversation.

## Quick Commands

### Create a Bot

Natural language:
```
@Ulf create a bot named guardian with personality: strict security monitor
@Ulf criar um bot chamado oracle para análise de dados
```

### List Bots

```
@Ulf list all bots
@Ulf listar todos os bots
```

### Check Bot Status

```
@Ulf check status of guardian
@Ulf status do bot guardian
```

### Delete Bot

```
@Ulf delete bot guardian
@Ulf deletar bot guardian
```

### Interact with Bot

```
@guardian what security issues do we have?
@oracle analyze this data
```

## Bot Examples

### Security Monitor

```
@Ulf create a bot named guardian with personality:

You are a strict security monitor. Your role:
- Monitor security alerts and vulnerabilities
- Provide security best practices
- Alert on suspicious activity
- Never execute commands, only analyze
```

### Code Reviewer

```
@Ulf create a bot named reviewer with personality:

You are a code review specialist. Your role:
- Review code for bugs and improvements
- Suggest best practices
- Check for security vulnerabilities
- Provide constructive feedback
```

### Data Analyst

```
@Ulf create a bot named oracle with personality:

You are a data analysis expert. Your role:
- Analyze datasets and provide insights
- Create visualizations
- Explain statistical concepts
- Help with data queries
```

### DevOps Helper

```
@Ulf create a bot named ops with personality:

You are a DevOps specialist. Your role:
- Help with deployment issues
- Monitor infrastructure
- Suggest optimizations
- Explain cloud concepts
```

### Customer Support

```
@Ulf create a bot named support with personality:

You are a friendly customer support agent. Your role:
- Answer customer questions
- Troubleshoot common issues
- Escalate complex problems
- Maintain a professional tone
```

## Bot Models

Choose the right model for your bot:

- **sonnet** (default) - Balanced speed and intelligence
- **opus** - Highest intelligence, slower, more expensive
- **haiku** - Fastest, cheaper, good for simple tasks

Example:
```
@Ulf create a bot named quickhelp with personality: fast helper, model: haiku
```

## Best Practices

### Naming

✅ Good names:
- `guardian`, `oracle`, `reviewer`, `ops`
- Lowercase, 3-15 characters
- Use hyphens for multi-word names: `code-review`

❌ Avoid:
- Reserved names: `ulf`, `admin`, `system`
- Special characters: `@`, `#`, `!`
- Too long: `super-advanced-ai-helper-bot`

### Personality

Be specific about the bot's role:

✅ Good:
```
You are a Python expert who helps debug code.
Focus on clean, Pythonic solutions.
```

❌ Too vague:
```
You are helpful.
```

### Resource Management

- Each bot uses ~256Mi-512Mi memory
- Limit: 10 bots per admin
- Delete unused bots to free resources

## Troubleshooting

### Bot not responding

1. Check status: `@Ulf check status of {name}`
2. Wait 30 seconds after creation
3. Verify bot is mentioned: `@{name}` not just `{name}`

### "Only admins can create bots"

You need to be in the admin list. Contact your server admin.

### Bot creation failed

1. Try a different name
2. Check if name is already taken
3. Simplify the personality description
4. Wait a few seconds and retry

### Bot gives wrong responses

The bot uses the personality you defined. To fix:
1. Delete the bot
2. Create a new one with a better personality
3. Be more specific in the personality description

## Tips

1. **Test first**: Create a test bot with a simple personality to verify everything works
2. **Be specific**: Detailed personalities lead to better bot behavior
3. **Monitor usage**: Check bot status regularly
4. **Clean up**: Delete bots you no longer need
5. **Name clearly**: Use descriptive names that indicate the bot's purpose

## Limits

- Max 10 bots per admin
- Bot names: 3-15 characters
- Deployment time: ~30 seconds
- Memory: 512Mi per bot
- CPU: 500m per bot

## Example Workflow

1. **Create bot**:
   ```
   @Ulf create a bot named tester with personality: testing assistant
   ```

2. **Wait for confirmation** (~30 seconds)

3. **Test interaction**:
   ```
   @tester hello
   ```

4. **Check if working**:
   ```
   @Ulf check status of tester
   ```

5. **Use regularly**:
   ```
   @tester help me with X
   ```

6. **Clean up when done**:
   ```
   @Ulf delete bot tester
   ```

## Getting Help

Ask Ulf:
```
@Ulf how do I create a bot?
@Ulf show me bot examples
@Ulf what bots can I create?
```

## Advanced Usage

### Multiple Channels

Bots work across all channels where Ulf is present. No extra configuration needed.

### Bot Collaboration

Bots can't directly talk to each other yet, but you can:
1. Ask one bot for information
2. Share that with another bot
3. Get combined insights

### Monitoring

Check all your bots:
```
@Ulf list all bots
```

This shows:
- Bot status (running/failed)
- Creation date
- Model used
- Creator

## What's Next?

Future features:
- Bot templates (pre-made personalities)
- Bot-to-bot communication
- Custom API keys per bot
- Web dashboard
- Auto-scaling
- Usage analytics

## Support

For issues:
1. Try `@Ulf check status of {name}`
2. Delete and recreate the bot
3. Contact your server admin
4. Check server logs if admin

## Security

- Only admins can create/delete bots
- Bots share the same API keys as Ulf
- All bot actions are logged
- Bots run in isolated containers
- Each bot has its own Discord identity
