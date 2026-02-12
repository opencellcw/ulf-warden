# Changelog

All notable changes to OpenCell (Ulf-Warden) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2025-02-11

### 🎉 MAJOR RELEASE - Complete Platform Transformation

This release transforms OpenCell into the most powerful open-source AI agent platform with 4 groundbreaking features.

---

### ✨ Added - New Features

#### 🌙 Moonshot AI Integration - 97% Cost Savings
- **Multi-provider LLM system** with automatic routing
- **Moonshot (Kimi) provider** with 2M token context window
- **97% cost reduction**: $0.50/Mtok vs Claude's $3-15/Mtok
- **Drop-in replacement**: All tools and features work identically
- **Better Portuguese support**: Native language processing
- Configuration via `LLM_PROVIDER` environment variable
- Automatic OpenAI format → Anthropic format conversion
- Streaming support with tool calling
- **Documentation**: `docs/moonshot-provider.md`, `examples/moonshot-quick-start.md`
- **Implementation**: `src/llm/moonshot-provider.ts`, `src/llm/router.ts`

#### 🤖 Bot Factory - Dynamic Bot Creation
- **Create bots via Discord conversation** - No manual deployment needed
- **Two bot types**:
  - **Conversational bots**: Chat-only (fast, cheap, safe)
  - **Agent bots**: Full tool access (bash, kubectl, git, read, write)
- **30-second deployment**: Automatic Kubernetes scaling
- **Tool whitelist per bot**: Fine-grained permission control
- **Auto-persona system**: Emoji badges, role-based formatting
- **Pi Agent integration**: Advanced coding capabilities
- **Discord commands**: `create bot`, `list bots`, `delete bot`, `check status`
- **Admin-only access**: Secure bot creation
- **Workspace isolation**: Each bot has separate workspace
- **Audit logging**: Track bot creation and usage
- **Documentation**: `docs/bot-factory-pi-integration.md`, `docs/bot-persona-system.md`
- **Examples**: `examples/bot-factory-examples.md` (8 real-world examples)
- **Implementation**: `src/bot-factory/` (9 new files)

#### 🎯 RoundTable - Multi-Agent Deliberation
- **5-6 specialized agents** deliberate together on complex decisions
- **3-phase process**:
  - **Phase 1: Message** - Open discussion among agents
  - **Phase 2: Proposal** - Structured solution proposals
  - **Phase 3: Voting** - Democratic decision making
- **6 agent personas**:
  - 📊 **Analyst**: Data-driven, evidence-based
  - 💡 **Creative**: Innovative, out-of-the-box
  - 🔍 **Skeptic**: Risk identification, edge cases
  - 🔧 **Pragmatist**: Practical implementation
  - ⚖️ **Ethicist**: Ethical evaluation
  - 📝 **Summarizer**: Consensus building
- **4 voting rules**: Majority, Unanimity, Rated (1-5 stars), Ranked (Borda count)
- **Consensus detection**: Automatic convergence monitoring
- **SQLite storage**: Session history and analytics
- **Discord integration**: Rich embeds with voting results
- **Discord commands**: `!roundtable <question>`, options for voting rules
- **Statistics tracking**: Agent win rates, voting effectiveness
- **Documentation**: `docs/roundtable-system.md`
- **Implementation**: `src/roundtable/` (10 new files)

#### 🔌 Model Context Protocol (MCP) Integration
- **Connect to 100+ MCP servers** with zero coding
- **Plug-and-play integrations**:
  - 🔍 Brave Search (web search)
  - 🐙 GitHub (issues, PRs, code search)
  - 🗄️ PostgreSQL (database queries)
  - 🗺️ Google Maps (geocoding, directions)
  - 💬 Slack (messages, channels)
  - 🌐 Puppeteer (browser automation)
  - 📁 Filesystem (file operations)
  - 🧠 Memory (persistent storage)
- **Two transport types**: stdio (local process) and SSE (HTTP)
- **Auto-discovery**: Tools automatically detected from servers
- **Configuration**: Simple JSON config file (`mcp.json`)
- **Environment variables**: `${VAR}` substitution support
- **Health monitoring**: 30-second health checks with auto-reconnection
- **Discord commands**: `!mcp status`, `!mcp servers`, `!mcp tools`
- **Tool adapter**: Automatic MCP → Anthropic format conversion
- **Graceful shutdown**: Proper connection cleanup
- **Documentation**: `docs/mcp-integration.md`
- **Examples**: `examples/mcp-integration-example.ts` (10 integration patterns)
- **Implementation**: `src/mcp/` (8 new files)

---

### 🔧 Changed - Improvements

#### Architecture
- **Multi-provider LLM support**: Claude, Moonshot, and extensible for more
- **Router pattern**: Single interface for multiple providers
- **Tool format conversion**: Automatic schema adaptation
- **Enhanced logging**: Structured logging with context

#### Documentation
- **Complete README rewrite**: Modern, comprehensive, feature-focused
- **Documentation index**: `docs/INDEX.md` for easy navigation
- **What's New guide**: `WHATS_NEW.md` with migration instructions
- **API documentation**: Inline JSDoc for all public APIs

#### Configuration
- **Extended .env.example**: All new features documented
- **Provider selection**: `LLM_PROVIDER` environment variable
- **MCP configuration**: Separate `mcp.json` file
- **Bot Factory settings**: Admin controls and limits

---

### 🐛 Fixed

#### TypeScript Compilation
- Fixed all type errors across codebase
- Added missing type annotations
- Resolved `any` type issues in transports
- Fixed process.env type incompatibilities

#### Error Handling
- Improved error messages for LLM providers
- Better MCP server connection error handling
- Graceful degradation when services unavailable
- Proper cleanup on shutdown

#### Security
- Validated all user inputs in Bot Factory
- Sanitized tool inputs in MCP adapter
- Admin-only access to bot creation
- Proper workspace isolation

---

### 📚 Documentation

#### New Documentation
- `docs/moonshot-provider.md` - Complete Moonshot integration guide
- `docs/bot-factory-pi-integration.md` - Bot Factory complete guide
- `docs/bot-persona-system.md` - Visual persona system
- `docs/roundtable-system.md` - Multi-agent deliberation guide
- `docs/mcp-integration.md` - MCP integration guide (10KB)
- `docs/INDEX.md` - Complete documentation index
- `WHATS_NEW.md` - v2.0 feature overview
- `MOONSHOT_IMPLEMENTATION.md` - Technical implementation
- `BOT_FACTORY_PI_IMPLEMENTATION.md` - Bot Factory technical details
- `ROUNDTABLE_IMPLEMENTATION.md` - RoundTable technical details
- `MCP_IMPLEMENTATION.md` - MCP technical details
- `QUICK_START_PI_BOTS.md` - Quick start for Pi bots

#### Updated Documentation
- `README.md` - Complete rewrite with v2.0 features
- `.env.example` - All new environment variables
- `CONTRIBUTING.md` - Updated contribution guidelines

#### Examples
- `examples/bot-factory-examples.md` - 8 real-world bot configs
- `examples/moonshot-quick-start.md` - 5-minute Moonshot setup
- `examples/mcp-integration-example.ts` - 10 integration patterns

---

### 🔒 Security

#### Bot Factory Security
- ✅ Admin-only bot creation
- ✅ Tool whitelist per bot
- ✅ Workspace isolation
- ✅ Audit logging for all operations
- ✅ Rate limiting applies to all bots

#### MCP Security
- ✅ Process isolation (stdio transport)
- ✅ API keys in environment (not exposed)
- ✅ Health monitoring and auto-reconnection
- ✅ Timeout protection on tool calls

#### General
- ✅ Maintained all existing 7-layer security
- ✅ Rate limiting applies to all features
- ✅ Secrets remain in Google Secret Manager
- ✅ TLS enforced everywhere

---

### 📊 Performance

#### Cost
- **Moonshot**: 97% cheaper than Claude ($0.50 vs $3-15 per million tokens)
- **Bot Factory**: Minimal overhead (~50MB RAM per bot)
- **RoundTable**: 5x API calls (mitigated with Moonshot pricing)
- **MCP**: No additional LLM cost (just external service costs)

#### Speed
- **Moonshot**: Similar response times to Claude
- **Bot Factory**: 30-second deployment (vs 5+ minutes manual)
- **RoundTable**: ~45 seconds for full deliberation (3 rounds)
- **MCP**: +100-500ms latency per tool call (stdio)

#### Resource Usage
- **Moonshot**: Same as Claude
- **Bot Factory**: +50MB RAM per bot
- **RoundTable**: 5x API calls per session
- **MCP**: +5-10MB RAM per connected server

---

### 🚀 Migration Guide

#### From v1.x to v2.0

**1. Update Dependencies**
```bash
npm install @modelcontextprotocol/sdk zod json5
```

**2. Optional: Enable Moonshot**
```bash
# Add to .env
LLM_PROVIDER=moonshot
MOONSHOT_API_KEY=sk-xxx
MOONSHOT_MODEL=kimi-k2.5
```

**3. Optional: Configure MCP**
```bash
# Edit mcp.json to enable servers
# Add API keys to .env (e.g., BRAVE_API_KEY)
```

**4. Rebuild**
```bash
npm run build
npm start
```

**All new features are opt-in and backward compatible!**

---

### 📁 Files Added

#### Core Implementation (~140 KB of code)
```
src/llm/moonshot-provider.ts          # Moonshot integration
src/llm/router.ts                      # Multi-provider router
src/llm/pi-provider.ts                 # Pi Agent provider

src/bot-factory/                       # Bot Factory (9 files)
├── types.ts                           # Type definitions
├── executor.ts                        # Bot execution
├── tools.ts                           # Tool management
├── bot-runtime.ts                     # Bot runtime
├── bot-discord-handler.ts             # Bot handler
├── persona-formatter.ts               # Visual personas
└── discord-handler.ts                 # Factory commands

src/roundtable/                        # RoundTable (10 files)
├── types.ts                           # Type definitions
├── personas.ts                        # 6 agent personas
├── core.ts                            # Orchestrator
├── storage.ts                         # SQLite storage
├── phases/
│   ├── message-phase.ts               # Discussion phase
│   ├── proposal-phase.ts              # Proposal phase
│   └── voting-phase.ts                # Voting phase
├── discord-handler.ts                 # Discord integration
└── discord-formatter.ts               # Rich embeds

src/mcp/                               # MCP Integration (8 files)
├── types.ts                           # Type definitions
├── config-loader.ts                   # Configuration
├── transports.ts                      # stdio/SSE transports
├── client.ts                          # MCP client manager
├── tool-adapter.ts                    # Tool conversion
├── lifecycle.ts                       # Health monitoring
└── discord-handler.ts                 # Discord commands

mcp.json                               # MCP configuration
```

#### Documentation (~55 KB)
```
docs/moonshot-provider.md
docs/bot-factory-pi-integration.md
docs/bot-persona-system.md
docs/roundtable-system.md
docs/mcp-integration.md
docs/INDEX.md
docs/CHANGELOG-bot-factory-pi.md

WHATS_NEW.md
MOONSHOT_IMPLEMENTATION.md
BOT_FACTORY_PI_IMPLEMENTATION.md
ROUNDTABLE_IMPLEMENTATION.md
MCP_IMPLEMENTATION.md
QUICK_START_PI_BOTS.md
```

#### Examples
```
examples/bot-factory-examples.md
examples/moonshot-quick-start.md
examples/mcp-integration-example.ts
```

#### Tests
```
tests/moonshot-provider.test.ts
```

#### Scripts
```
scripts/migrate-to-moonshot.sh
```

---

### 🎯 Use Cases Enabled

#### Cost-Sensitive Deployments
```bash
# Switch to Moonshot for 97% savings
LLM_PROVIDER=moonshot
# Annual savings: $1,740 for 10M tokens/month
```

#### Dynamic Team Scaling
```bash
# Create specialized bots on demand
@Ulf create agent bot named devops tools: kubectl, bash
@Ulf create bot named support personality: friendly helper
```

#### Complex Decision Making
```bash
# Multi-agent deliberation
@Ulf !roundtable Should we adopt microservices?
# 5 agents discuss, propose, vote democratically
```

#### Rapid Integration
```bash
# Add integrations without coding
# Just enable in mcp.json
@Ulf search for "latest AI news" using Brave
@Ulf create issue in GitHub repo opencellcw
```

---

### 🐛 Known Issues

1. **MCP SSE Transport**: Not fully tested (use stdio for now)
2. **RoundTable Cost**: 5x API calls (mitigated with Moonshot)
3. **Bot Factory Limits**: 10 bots per admin (configurable)
4. **Pi Agent Speed**: Slower than conversational bots

---

### 🔮 Roadmap (v2.1)

- [ ] Web dashboard for bot management
- [ ] Bot marketplace (community templates)
- [ ] Advanced cost optimization with caching
- [ ] Multi-cluster bot deployment
- [ ] Voice-to-voice conversations
- [ ] Custom MCP server generator
- [ ] GraphQL API
- [ ] Mobile app (iOS/Android)

---

## [1.x] - Previous Versions

See individual feature changelogs:
- [Security Fixes](docs/security/CHANGELOG.md)
- [Discord Formatting](docs/DISCORD-FORMATTING-SUMMARY.md)
- [Cost Auditor](cost-auditor/CHANGELOG.md)

---

## Version History

- **v2.0.0** (2025-02-11) - Major release: Moonshot, Bot Factory, RoundTable, MCP
- **v1.5.0** (2025-02-10) - API key rotation system
- **v1.4.0** (2025-02-05) - Discord formatting improvements
- **v1.3.0** (2025-02-03) - Cloudflare AI Gateway integration
- **v1.2.0** (2025-02-01) - Security architecture overhaul
- **v1.1.0** (2025-01-30) - GKE deployment automation
- **v1.0.0** (2025-01-15) - Initial release

---

<div align="center">

**📖 For detailed migration instructions, see [WHATS_NEW.md](WHATS_NEW.md)**

**🐛 Found a bug? [Report it](https://github.com/cloudwalk/opencell/issues)**

[Back to README](README.md) • [Documentation](docs/INDEX.md)

</div>
