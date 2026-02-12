# Changelog - Bot Factory Pi Integration

## Version 2.0.0 - Pi Integration (2025-02-11)

### 🎉 Major Features

#### Hybrid Bot Architecture
- Added support for two bot types:
  - **Conversational Bots** 💬 - Simple chat using Claude API
  - **Agent Bots** 🤖 - Powered by Pi with coding tools

#### Agent Bot Capabilities
- Execute bash commands
- Read and write files
- Interact with kubectl, gcloud, git
- Tool whitelisting for security
- Isolated workspaces per bot

### ✨ New Features

#### Bot Types & Tools
- `BotType` enum: `conversational` | `agent`
- `BotTool` type: `bash`, `read`, `write`, `edit`, `kubectl`, `gcloud`, `git`
- Tool validation and whitelisting
- Per-bot tool permissions

#### New Components
- `PiProvider` - Pi coding agent integration
- `BotRuntime` - Runtime manager with provider selection
- `BotRuntimeRegistry` - Active runtime management
- Tool execution validation

#### Updated Components
- `BotConfig` - Added `type` and `allowedTools` fields
- `create_bot` tool - Added `type` and `allowed_tools` parameters
- Bot executor - Type validation and tool checking
- Bot status - Shows type and tools
- Bot list - Displays type emoji (💬/🤖) and tools

### 📝 Documentation

#### New Docs
- `docs/bot-factory-pi-integration.md` - Comprehensive integration guide
- `examples/bot-factory-examples.md` - 8 real-world bot examples
- Updated `src/bot-factory/README.md` with Pi info

#### Example Bots
1. Customer Support (conversational)
2. DevOps Bot (agent - kubectl, bash, read)
3. Security Scanner (agent - read, bash)
4. Code Reviewer (agent - read, git)
5. Data Analyst (conversational)
6. Incident Response (agent - kubectl, bash, read, gcloud)
7. Documentation Bot (agent - read, write, git)
8. Performance Monitor (agent - kubectl, bash, read)

### 🔧 Technical Changes

#### New Files
```
src/
  llm/
    pi-provider.ts          # Pi integration
  bot-factory/
    bot-runtime.ts          # Runtime management

docs/
  bot-factory-pi-integration.md
  CHANGELOG-bot-factory-pi.md

examples/
  bot-factory-examples.md
```

#### Modified Files
```
src/bot-factory/
  types.ts                  # Added BotType, BotTool
  executor.ts               # Type/tool validation
  tools.ts                  # Updated create_bot schema

Dockerfile                  # Added pi installation
```

#### Dependencies
- Added `@mariozechner/pi-coding-agent` (global npm install in Docker)
- No changes to package.json (pi is CLI tool)

### 🔒 Security

#### Tool Whitelisting
- Each agent bot has explicit allowed tools list
- Tools validated before execution
- Bot cannot use tools outside whitelist
- Principle of least privilege recommended

#### Security Best Practices
- Read-only tools preferred for monitoring bots
- Avoid bash when specific tools available
- Monitor tool usage in logs
- Test agents in dev first

#### Workspace Isolation
- Each agent bot gets own workspace: `/tmp/bot-workspace/{botId}`
- File operations sandboxed to bot's workspace
- Process isolation via Pi subprocess

### 🐛 Bug Fixes
- None (new feature)

### ⚡ Performance

#### Conversational Bots
- Response time: ~2 seconds
- Cost per message: ~$0.001
- No tool execution overhead

#### Agent Bots
- Response time: ~5-10 seconds (includes tool execution)
- Cost per message: ~$0.005-0.02 (higher due to tools)
- 5-minute timeout for safety

### 📊 Metrics

#### Bot Type Distribution (Expected)
- 70% conversational (support, FAQ, consulting)
- 30% agent (DevOps, automation, analysis)

#### Tool Usage (Expected)
- Most used: `read` (file analysis)
- Second: `bash` (command execution)
- Third: `kubectl` (k8s monitoring)

### 🔄 Migration Guide

#### For Existing Bots
Old bots default to `conversational` type (no changes needed).

To upgrade to agent:
```bash
# 1. Note current config
@Ulf check status of mybot

# 2. Delete bot
@Ulf delete bot mybot

# 3. Recreate as agent
@Ulf create agent bot mybot
  personality: <same as before>
  tools: bash, read, kubectl
```

#### For Developers
```bash
# 1. Pull latest code
git pull origin main

# 2. Install pi locally (optional, for testing)
npm install -g @mariozechner/pi-coding-agent

# 3. Rebuild Docker image
docker build -t ulf-warden:latest .

# 4. Push and deploy
docker push ...
kubectl rollout restart deployment/ulf-warden -n ulf
```

### 📈 Future Roadmap

#### v2.1.0 (Next Quarter)
- Dynamic tool permissions (add/remove without recreate)
- Tool usage analytics dashboard
- Agent bot templates (pre-configured bots)

#### v2.2.0 (Future)
- Custom tools (bot-specific tools)
- Tool sandboxing (restrict bash commands)
- Bot-to-bot communication
- Cost estimation before creation

#### v3.0.0 (Long-term)
- Web dashboard for bot management
- Auto-scaling based on load
- Advanced monitoring and metrics
- Multi-cluster support

### 🙏 Credits

- Pi coding agent: [@mariozechner](https://github.com/mariozechner/pi-coding-agent)
- Claude API: [Anthropic](https://www.anthropic.com)

### 📞 Support

For issues:
1. Check documentation: `docs/bot-factory-pi-integration.md`
2. Review examples: `examples/bot-factory-examples.md`
3. Check logs: `kubectl logs -n agents deployment/bot-{name}`
4. File issue on GitHub with:
   - Bot type (conversational/agent)
   - Allowed tools (if agent)
   - Error message
   - Bot logs

### ⚠️ Breaking Changes

None. This is a backward-compatible feature addition.

Old bots continue to work as conversational bots (default type).

### 📦 Deployment Checklist

Before deploying to production:

- [ ] Pi installed in Docker image
- [ ] `ANTHROPIC_API_KEY` set
- [ ] Test conversational bot creation
- [ ] Test agent bot creation
- [ ] Verify tool whitelisting works
- [ ] Check bot status shows type/tools
- [ ] Test tool permission errors
- [ ] Monitor resource usage
- [ ] Review security settings
- [ ] Update team documentation

### 🔍 Testing

#### Automated Tests (Future)
- Unit tests for PiProvider
- Integration tests for bot runtime
- Tool validation tests
- Permission checking tests

#### Manual Testing (Current)
See `src/bot-factory/README.md` Testing section.

---

**Version:** 2.0.0  
**Date:** 2025-02-11  
**Author:** Lucas Sampaio  
**Reviewed by:** [TBD]
