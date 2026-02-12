# What's New in OpenCell v2.0

## 🎉 Major Release - February 11, 2025

OpenCell v2.0 introduces **4 groundbreaking features** that transform it into the most powerful open-source AI agent platform.

---

## 🌟 Headline Features

### 1. 🌙 Moonshot AI Integration - **97% Cost Savings**

Switch to Moonshot AI (Kimi) for massive cost reduction:

**Before:**
```bash
Claude Sonnet: $150/month for 10M tokens
```

**After:**
```bash
Moonshot Kimi: $5/month for 10M tokens
Annual Savings: $1,740 💰
```

**Key Benefits:**
- ✅ **10x larger context**: 2M tokens vs 200k
- ✅ **97% cheaper**: $0.50/Mtok vs $3-15/Mtok
- ✅ **Drop-in replacement**: Same tools, same features
- ✅ **Better Portuguese**: Native support

**Usage:**
```bash
# .env
LLM_PROVIDER=moonshot
MOONSHOT_API_KEY=sk-xxx
MOONSHOT_MODEL=kimi-k2.5
```

📖 [Complete Guide](docs/moonshot-provider.md) • [Quick Start](examples/moonshot-quick-start.md)

---

### 2. 🤖 Bot Factory - **Create Bots on Demand**

Create specialized AI agents via Discord conversation:

**Before:**
```
Manual deployment:
1. Clone repo
2. Configure
3. Build Docker image
4. Deploy to K8s
5. Wait 5+ minutes
```

**After:**
```
@Ulf create agent bot named devops
  personality: Kubernetes expert
  tools: kubectl, bash, read

# Bot deployed in 30 seconds! 🚀
```

**Features:**
- 💬 **Conversational bots** - Chat only (fast, cheap, safe)
- 🤖 **Agent bots** - With coding tools (bash, kubectl, git, etc.)
- 🎨 **Auto persona** - Emoji badges, role detection
- 🔒 **Tool whitelist** - Control permissions per bot
- ⚡ **30-second deployment** - Kubernetes auto-scaling

**Example Bots:**
```bash
# Support bot (conversational)
@Ulf create bot named support
  personality: friendly customer support

# DevOps bot (agent)
@Ulf create agent bot named devops
  tools: kubectl, bash, read
  personality: Kubernetes expert

# Security scanner (agent)
@Ulf create agent bot named guardian
  tools: read, bash
  personality: security vulnerability scanner
```

📖 [Complete Guide](docs/bot-factory-pi-integration.md) • [8 Examples](examples/bot-factory-examples.md)

---

### 3. 🎯 RoundTable - **Multi-Agent Deliberation**

Complex decisions with 5-6 specialized agents:

**Before:**
```
Single agent responds immediately
→ May miss edge cases
→ No diverse perspectives
```

**After:**
```
@Ulf !roundtable Should we use MongoDB or PostgreSQL?

Round 1: 5 agents discuss (Analyst, Creative, Skeptic, Pragmatist, Ethicist)
Round 2: Deeper analysis
Round 3: Convergence toward consensus

Proposals: Each agent proposes solution
Voting: Democratic decision (Majority/Rated/Ranked/Unanimity)

Winner: Hybrid approach (PostgreSQL + MongoDB) - 60% consensus
```

**Agents:**
- 📊 **Analyst** - Data-driven, evidence-based insights
- 💡 **Creative** - Innovative, out-of-the-box solutions
- 🔍 **Skeptic** - Risk identification, edge cases
- 🔧 **Pragmatist** - Practical implementation focus
- ⚖️ **Ethicist** - Ethical evaluation, long-term consequences
- 📝 **Summarizer** - Consensus building, synthesis

**Voting Rules:**
- **Majority** - Simple plurality (fastest)
- **Unanimity** - 100% agreement (safest)
- **Rated** - 1-5 stars per proposal (nuanced)
- **Ranked** - Borda count (best for ranking)

**Use Cases:**
- Architecture decisions
- Database/technology choices
- Trade-off analysis
- Strategic planning
- Complex troubleshooting

📖 [Complete Guide](docs/roundtable-system.md) • [Implementation](ROUNDTABLE_IMPLEMENTATION.md)

---

### 4. 🔌 MCP Integration - **100+ Tools, Zero Coding**

Connect to Model Context Protocol servers:

**Before:**
```typescript
// Custom integration = 150+ lines of code
export async function braveSearch(query: string) {
  const response = await fetch('https://api.brave.com/...');
  // ... parsing, error handling, formatting
  return results;
}
```

**After:**
```json
// mcp.json - Just 7 lines!
{
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": { "BRAVE_API_KEY": "${BRAVE_API_KEY}" }
  }
}
```

**Available Servers (100+):**
- 🔍 **Brave Search** - Web search
- 🐙 **GitHub** - Issues, PRs, code search
- 🗄️ **PostgreSQL** - Database queries
- 🗺️ **Google Maps** - Geocoding, directions
- 💬 **Slack** - Send messages, manage channels
- 🌐 **Puppeteer** - Browser automation
- 📁 **Filesystem** - File operations
- 🧠 **Memory** - Persistent storage
- ...and 90+ more!

**Usage:**
```bash
# 1. Add to mcp.json
# 2. Add API key to .env
# 3. Restart OpenCell
# That's it! ✨

# Tools auto-discovered and available
@Ulf search for "MCP protocol" using Brave
```

📖 [Complete Guide](docs/mcp-integration.md) • [Examples](examples/mcp-integration-example.ts)

---

## 📊 Impact Summary

| Feature | Benefit | Impact |
|---------|---------|--------|
| **Moonshot AI** | Cost savings | **-97%** 💰 |
| **Bot Factory** | Deployment speed | **10x faster** ⚡ |
| **RoundTable** | Decision quality | **Multiple perspectives** 🎯 |
| **MCP Integration** | Integration effort | **~95% less code** 🔌 |

---

## 🚀 Getting Started with v2.0

### 1. Update Your Installation

```bash
git pull origin main
npm install
npm run build
```

### 2. Try Moonshot AI

```bash
# Add to .env
echo "LLM_PROVIDER=moonshot" >> .env
echo "MOONSHOT_API_KEY=sk-xxx" >> .env

npm start

# Same features, 97% cheaper!
```

### 3. Create Your First Bot

```
# In Discord
@Ulf create agent bot named helper
  tools: read, bash
  personality: general coding assistant
```

### 4. Try RoundTable

```
@Ulf !roundtable Should we deploy on AWS or GCP?

# Watch 5 agents deliberate and vote!
```

### 5. Enable MCP

```bash
# Configure Brave Search
echo "BRAVE_API_KEY=your-key" >> .env

# Already configured in mcp.json!
npm start

# Use immediately
@Ulf search for "latest AI news"
```

---

## 📈 Migration Guide

### From v1.x to v2.0

**1. Update Dependencies**
```bash
npm install @modelcontextprotocol/sdk zod json5
```

**2. Optional: Switch to Moonshot**
```bash
# .env
LLM_PROVIDER=moonshot  # Add this line
MOONSHOT_API_KEY=sk-xxx  # Add your key
```

**3. Optional: Enable MCP**
```bash
# Edit mcp.json - change "enabled": true
# Add API keys to .env
```

**4. Rebuild and Restart**
```bash
npm run build
npm start
```

**That's it!** All new features are opt-in and backward compatible.

---

## 🎯 Use Case Examples

### Startup on a Budget
```bash
# Before: $150/month with Claude
LLM_PROVIDER=claude

# After: $5/month with Moonshot
LLM_PROVIDER=moonshot

# Same features, 97% savings!
```

### DevOps Team
```bash
# Create specialized bots
@Ulf create agent bot named k8s-expert
  tools: kubectl, bash, read
  personality: Kubernetes troubleshooter

@Ulf create agent bot named ci-cd
  tools: bash, git, read
  personality: CI/CD pipeline expert

# Now you have specialized assistants!
@k8s-expert why is pod crashing?
@ci-cd optimize our GitHub Actions
```

### Strategic Decision Making
```bash
# Complex decisions with multiple perspectives
@Ulf !roundtable Should we adopt microservices?

# 5 agents discuss:
# - Analyst: technical feasibility
# - Creative: innovative approaches
# - Skeptic: migration risks
# - Pragmatist: resource requirements
# - Ethicist: team impact

# Result: Balanced decision with consensus score
```

### Rapid Integration
```bash
# Add GitHub integration (0 lines of code!)
# Just enable in mcp.json

@Ulf create an issue in repo opencellcw
  title: "Add caching layer"
  body: "Improve performance..."

# Works immediately via MCP!
```

---

## 📊 Performance Benchmarks

### Cost (10M tokens/month)
- Claude: $150/month
- Moonshot: $5/month
- **Savings: $1,740/year** 💰

### Speed
- Simple chat: ~2s (unchanged)
- Bot creation: 30s (vs 5+ min manual)
- RoundTable: 45s for full deliberation
- MCP tools: +100-500ms latency

### Resource Usage
- Moonshot: Same as Claude
- Bot Factory: +50MB RAM per bot
- RoundTable: 5x API calls (still cheaper with Moonshot!)
- MCP: +5-10MB RAM per server

---

## 🛡️ Security Enhancements

### Bot Factory Security
- ✅ Tool whitelist per bot
- ✅ Admin-only bot creation
- ✅ Workspace isolation
- ✅ Audit logging

### MCP Security
- ✅ Process isolation (stdio)
- ✅ API keys in .env (not exposed)
- ✅ Health monitoring
- ✅ Auto-reconnection

### General
- ✅ All existing 7-layer security maintained
- ✅ Rate limiting applies to all features
- ✅ Secrets in Google Secret Manager

---

## 📚 Documentation

### New Docs
- [Moonshot Provider](docs/moonshot-provider.md)
- [Bot Factory + Pi](docs/bot-factory-pi-integration.md)
- [Bot Persona System](docs/bot-persona-system.md)
- [RoundTable System](docs/roundtable-system.md)
- [MCP Integration](docs/mcp-integration.md)
- [Documentation Index](docs/INDEX.md)

### Updated Docs
- [README.md](README.md) - Completely revised
- [.env.example](.env.example) - New variables
- [Architecture](docs/ARCHITECTURE.md) - Multi-agent flows

---

## 🐛 Known Issues

1. **MCP SSE Transport**: Not fully tested (use stdio)
2. **RoundTable Cost**: 5x API calls (mitigated with Moonshot)
3. **Bot Factory Limits**: 10 bots per admin
4. **Pi Agent Speed**: Slower than conversational bots

---

## 🔮 What's Next (v2.1)

- [ ] Web dashboard for bot management
- [ ] Bot marketplace (community templates)
- [ ] Advanced cost optimization
- [ ] Multi-cluster bot deployment
- [ ] Voice-to-voice conversations
- [ ] Custom MCP server generator

---

## 🙏 Acknowledgments

**v2.0 Contributors:**
- Moonshot AI team for amazing API
- Anthropic for MCP specification
- Pi coding agent by @mariozechner
- RoundTable paper (ICLR 2025)

---

## 📞 Questions?

- 📖 [Full Documentation](docs/INDEX.md)
- 🐛 [Report Issues](https://github.com/cloudwalk/opencell/issues)
- 💬 [Discussions](https://github.com/cloudwalk/opencell/discussions)
- 🔒 [Security](SECURITY.md)

---

<div align="center">

**🎉 Welcome to OpenCell v2.0!**

The most powerful open-source AI agent platform.

**Star ⭐ if you're excited about these features!**

[Get Started](README.md) • [Documentation](docs/INDEX.md) • [GitHub](https://github.com/cloudwalk/opencell)

</div>
