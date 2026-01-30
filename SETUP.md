# Setup Guide - Ulfberht-Warden v2.0

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file:
```env
# Required
ANTHROPIC_API_KEY=your_api_key_here

# At least one platform (Slack, Discord, or Telegram)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...

# Optional platforms
DISCORD_BOT_TOKEN=your_discord_token
TELEGRAM_BOT_TOKEN=your_telegram_token

# Data directories (optional, defaults shown)
DATA_DIR=./data
LOGS_DIR=./data/logs

# Local LLM (optional, for cost savings)
LOCAL_LLM_ENABLED=false              # Set to true to enable
LLM_STRATEGY=claude_only             # Options: claude_only, hybrid, local_only, local_fallback
LOCAL_MODEL_NAME=Xenova/LaMini-Flan-T5-783M
MODEL_CACHE_DIR=./.cache/models
```

### 2.5. (Optional) Setup Local LLM
To enable local model for simple tasks (reduces API costs):
```bash
./scripts/setup-local-llm.sh
```

This downloads a lightweight model (~1.5GB) that runs on CPU for simple tasks like greetings and basic Q&A. Complex tasks and tool use still route to Claude API.

**See [docs/LOCAL_LLM.md](docs/LOCAL_LLM.md) for complete guide.**

### 3. Build
```bash
npm run build
```

### 4. Run
```bash
npm start
```

## Local Development

### Development Mode (with hot reload)
```bash
npm run dev
```

### Directory Structure
After first run, the following directories will be created:
```
./data/
├── ulf.db              # SQLite database
├── logs/               # Structured logs
│   ├── error.log
│   └── ulf.log
└── fallback/           # JSON backups (if DB fails)

./workspace/memory/     # Daily logs (auto-created)
```

## Testing

### Test Session Persistence
1. Start the bot: `npm start`
2. Send a message on Slack: "Oi Ulf, me lembra desse teste"
3. Stop the bot: Ctrl+C
4. Restart: `npm start`
5. Send: "O que eu te pedi?"
6. Expected: Ulf remembers the conversation ✓

### Test Memory Updates
1. Send: "@Ulf aprende: prefiro FastAPI com SQLAlchemy"
2. Check `workspace/MEMORY.md` was updated
3. Send: "@Ulf qual minha stack preferida?"
4. Expected: "FastAPI com SQLAlchemy" ✓

### Test Daily Logs
1. Perform actions throughout the day
2. Check `workspace/memory/YYYY-MM-DD.md` exists
3. Verify logs include conversations + tool executions ✓

### Test GitHub Integration
```
Send: "@Ulf clona o repo anthropics/anthropic-sdk-typescript"
Expected: Repo cloned successfully ✓
```

### Test Web Scraping
```
Send: "@Ulf busca o título do site https://anthropic.com"
Expected: Title extracted and returned ✓
```

### Test Process Management
```
Send: "@Ulf sobe uma FastAPI e monitora"
Expected: FastAPI running + PID tracked + auto-restart available ✓
```

## Deployment to Render

### Prerequisites
- Render account
- GitHub repository connected to Render
- Starter plan or higher (for persistent disk)

### Steps

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "feat: upgrade to v2.0 with agency capabilities"
   git push
   ```

2. **Configure Render**
   - Go to Render Dashboard
   - Create new Web Service
   - Connect your GitHub repository
   - Render will detect `render.yaml` automatically

3. **Set Environment Variables**
   In Render dashboard, set:
   - `ANTHROPIC_API_KEY`
   - `SLACK_BOT_TOKEN`
   - `SLACK_APP_TOKEN`
   - (Optional) Discord and Telegram tokens

4. **Deploy**
   - Render will automatically build and deploy
   - Persistent disk will be provisioned at `/data`
   - Database will be created on first run

5. **Verify**
   - Check logs for "Status: ONLINE"
   - Test sending a message on Slack
   - Check that session persists across deployments

## Render Configuration Details

### Persistent Disk
- **Location**: `/data`
- **Size**: 1GB (configurable in `render.yaml`)
- **Survives**: Deploys, restarts, container rebuilds
- **Contains**: Database, logs, fallback data

### Plan Requirements
- **Free tier**: ❌ No persistent disk
- **Starter ($7/mo)**: ✅ 1GB persistent disk
- **Standard and above**: ✅ Larger disks available

### Environment Variables
Set in Render dashboard (not in code):
```
ANTHROPIC_API_KEY=...
SLACK_BOT_TOKEN=...
SLACK_APP_TOKEN=...
DISCORD_BOT_TOKEN=... (optional)
TELEGRAM_BOT_TOKEN=... (optional)
```

Auto-configured by `render.yaml`:
```
NODE_ENV=production
DATA_DIR=/data
LOGS_DIR=/data/logs
```

## Monitoring

### Logs
View logs in Render dashboard or via CLI:
```bash
render logs -t web -s ulfberht-warden
```

### Database
SSH into container and inspect:
```bash
render ssh -s ulfberht-warden
sqlite3 /data/ulf.db
```

### Health Check
Visit your Render URL:
```
https://ulfberht-warden.onrender.com/
```

Returns:
```json
{
  "status": "online",
  "bot": "ulf",
  "platforms": {
    "slack": true,
    "discord": false,
    "telegram": false
  }
}
```

## Troubleshooting

### Database Not Found
- Check `/data` directory exists
- Verify `DATA_DIR` environment variable
- Check permissions on `/data`

### Sessions Not Persisting
- Verify persistent disk is mounted
- Check database file exists: `/data/ulf.db`
- Review logs for persistence errors

### GitHub CLI Not Working
- Verify Dockerfile includes `gh` installation
- Rebuild Docker image: `docker build -t ulf .`
- Check `gh --version` in container

### Memory Not Updating
- Check `workspace/MEMORY.md` file permissions
- Verify workspace directory is writable
- Review memory curator logs

### Process Management Issues
- Processes don't survive container restarts
- Use external process managers (PM2, systemd) for critical services
- Process tools are for temporary/session-based processes

## Advanced Configuration

### Database Connection
To use PostgreSQL instead of SQLite:
1. Add PostgreSQL service in Render
2. Update `src/persistence/database.ts`
3. Add `pg` dependency: `npm install pg`

### Custom Log Rotation
Edit `src/logger.ts`:
```typescript
maxsize: 10 * 1024 * 1024, // 10MB
maxFiles: 10
```

### Memory Curation Frequency
Edit `src/persistence/memory-curator.ts`:
```typescript
const CURATION_INTERVAL = 20; // Every 20 conversations
```

### Process Auto-Restart Delay
Edit `src/tools/process.ts`:
```typescript
setTimeout(() => {
  // Restart logic
}, 5000); // 5 second delay
```

## Support

For issues or questions:
1. Check logs in `/data/logs/`
2. Review `CHANGELOG.md` for recent changes
3. Check GitHub issues
4. Review Render logs in dashboard

## Next Steps

After setup:
1. Test all features with the test commands above
2. Configure memory curation interval
3. Set up monitoring alerts
4. Customize tools as needed
5. Add custom tools in `src/tools/`

Enjoy your upgraded Ulfberht-Warden! 🗡️
