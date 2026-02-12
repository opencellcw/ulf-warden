# OpenCell Documentation Index

Complete documentation for OpenCell (Ulf-Warden) v2.0

---

## 🚀 Getting Started

| Document | Description |
|----------|-------------|
| [Quick Start Guide](GKE_QUICKSTART.md) | Get running in 5 minutes |
| [Installation Guide](INSTALLATION.md) | Detailed installation instructions |
| [Configuration Guide](CONFIGURATION.md) | Environment variables and settings |

---

## 🆕 New Features (v2.0)

### Moonshot AI Provider
| Document | Description |
|----------|-------------|
| **[Moonshot Provider Guide](moonshot-provider.md)** | Complete integration guide |
| [Quick Start](../examples/moonshot-quick-start.md) | 5-minute setup |
| [Implementation Summary](../MOONSHOT_IMPLEMENTATION.md) | Technical details |

**Key Features:**
- 97% cost savings vs Claude
- 2M token context window (10x larger)
- Drop-in replacement
- Perfect for Portuguese

### Bot Factory + Pi Integration
| Document | Description |
|----------|-------------|
| **[Bot Factory + Pi Integration](bot-factory-pi-integration.md)** | Complete guide |
| [Bot Persona System](bot-persona-system.md) | Visual identity system |
| [Bot Factory Examples](../examples/bot-factory-examples.md) | 8 real-world examples |
| [Implementation Summary](../BOT_FACTORY_PI_IMPLEMENTATION.md) | Technical details |

**Key Features:**
- Create bots via Discord conversation
- Two types: Conversational (chat) or Agent (with tools)
- Tool whitelist per bot
- Dynamic deployment in ~30 seconds

### RoundTable Multi-Agent System
| Document | Description |
|----------|-------------|
| **[RoundTable System Guide](roundtable-system.md)** | Complete guide |
| [Implementation Summary](../ROUNDTABLE_IMPLEMENTATION.md) | Technical details |

**Key Features:**
- 5-6 specialized agents deliberate together
- 3 phases: Discussion → Proposals → Voting
- 4 voting rules (Majority, Unanimity, Rated, Ranked)
- Perfect for complex decisions

### Model Context Protocol (MCP)
| Document | Description |
|----------|-------------|
| **[MCP Integration Guide](mcp-integration.md)** | Complete guide |
| [MCP Examples](../examples/mcp-integration-example.ts) | 10 practical examples |
| [Implementation Summary](../MCP_IMPLEMENTATION.md) | Technical details |
| [Configuration File](../mcp.json) | Server configurations |

**Key Features:**
- Connect to 100+ MCP servers
- Zero coding required (just config)
- Plug-and-play tool integrations
- GitHub, Slack, Postgres, Brave Search, etc.

---

## 🏗️ Core Features

### Architecture
| Document | Description |
|----------|-------------|
| [System Architecture](ARCHITECTURE.md) | High-level design |
| [Hybrid Architecture](architecture/hybrid-architecture.md) | Execution patterns |
| [Tool Registry](architecture/tool-registry.md) | Tool management |
| [Workflow Manager](architecture/workflow-manager.md) | Orchestration |

### Security
| Document | Description |
|----------|-------------|
| **[Security Architecture](security/SECURITY_ARCHITECTURE.md)** | 7-layer defense |
| [vs ClawdBot Comparison](CLAWDBOT_COMPARISON.md) | Security improvements |
| [vs OpenClaw Security](OPENCLAW_SECURITY_COMPARISON.md) | Technical comparison |
| [Security Policy](../SECURITY.md) | Vulnerability reporting |
| [GKE Secrets Management](GKE_SECRETS.md) | Google Secret Manager |

### Cost Management
| Document | Description |
|----------|-------------|
| **[Cost Auditor Guide](../cost-auditor/README.md)** | Multi-platform monitoring |
| [Cost Optimization](cost-optimization.md) | Savings strategies |
| [Budget Alerts](../cost-auditor/alerts.md) | Alert configuration |

### Self-Improvement
| Document | Description |
|----------|-------------|
| **[Self-Improvement System](SELF_IMPROVEMENT.md)** | Learning architecture |
| [Memory Management](memory-management.md) | Knowledge compression |
| [Performance Tracking](performance-tracking.md) | Metrics and analytics |

### Platform Integration
| Document | Description |
|----------|-------------|
| [Discord Integration](discord-formatting-integration.md) | Rich embeds, buttons |
| [Slack Integration](slack-integration.md) | Socket mode, threads |
| [Telegram Integration](telegram-integration.md) | Bot API, keyboards |
| [WhatsApp Integration](whatsapp-integration.md) | QR auth, groups |

### Multimodal Features
| Document | Description |
|----------|-------------|
| [Image Generation](multimodal/image-generation.md) | Replicate, DALL-E |
| [Voice Support](multimodal/voice-support.md) | Discord voice, TTS |
| [Video Generation](multimodal/video-generation.md) | Text-to-video |
| [Audio Transcription](multimodal/transcription.md) | Whisper integration |

---

## 🚢 Deployment

| Document | Description |
|----------|-------------|
| [GKE Deployment](GKE_QUICKSTART.md) | Google Kubernetes Engine |
| [Docker Setup](docker-setup.md) | Container deployment |
| [Local Development](local-development.md) | Dev environment |
| [CI/CD Pipeline](cicd-pipeline.md) | Automation |
| [Monitoring](monitoring.md) | Observability setup |

---

## 🔧 Development

| Document | Description |
|----------|-------------|
| [Contributing Guide](../CONTRIBUTING.md) | How to contribute |
| [Code Style](code-style.md) | TypeScript conventions |
| [Testing Guide](testing.md) | Unit and integration tests |
| [Debugging](debugging.md) | Common issues |

---

## 📚 Reference

### API Documentation
| Document | Description |
|----------|-------------|
| [Tool Definitions](../src/tools/definitions.ts) | All available tools |
| [LLM Interface](../src/llm/interface.ts) | Provider abstraction |
| [Agent Interface](../src/agent.ts) | Core agent logic |

### Configuration Reference
| Document | Description |
|----------|-------------|
| [Environment Variables](.env.example) | All config options |
| [mcp.json Schema](mcp-schema.md) | MCP configuration |
| [Helm Charts](../infra/helm/) | Kubernetes deployment |

### Examples
| Document | Description |
|----------|-------------|
| [Bot Factory Examples](../examples/bot-factory-examples.md) | 8 bot configurations |
| [Moonshot Quick Start](../examples/moonshot-quick-start.md) | Switch to Moonshot |
| [MCP Integration](../examples/mcp-integration-example.ts) | 10 integration patterns |
| [Workflow Examples](../examples/workflows/) | Complex task flows |

---

## 🆚 Comparisons

| Document | Description |
|----------|-------------|
| [vs ClawdBot](CLAWDBOT_COMPARISON.md) | Security improvements |
| [vs OpenClaw Security](OPENCLAW_SECURITY_COMPARISON.md) | Technical diff |
| [Claude vs Moonshot](moonshot-vs-claude.md) | Provider comparison |

---

## 📋 Changelogs

| Document | Description |
|----------|-------------|
| [Main Changelog](../CHANGELOG.md) | All releases |
| [Bot Factory Changelog](CHANGELOG-bot-factory-pi.md) | v2.0 features |
| [Security Fixes](security/CHANGELOG.md) | Security updates |

---

## 🎓 Tutorials

### Beginner
- [ ] [Your First Bot](tutorials/first-bot.md)
- [ ] [Basic Commands](tutorials/basic-commands.md)
- [ ] [Simple Chat Bot](tutorials/simple-chatbot.md)

### Intermediate
- [ ] [Creating Agent Bots](tutorials/agent-bots.md)
- [ ] [Using RoundTable](tutorials/roundtable.md)
- [ ] [Adding MCP Servers](tutorials/mcp-servers.md)

### Advanced
- [ ] [Custom MCP Server](tutorials/custom-mcp-server.md)
- [ ] [Multi-Cluster Deployment](tutorials/multi-cluster.md)
- [ ] [Cost Optimization](tutorials/cost-optimization.md)

---

## 🔍 Troubleshooting

| Issue | Document |
|-------|----------|
| Installation problems | [Installation FAQ](faq/installation.md) |
| Bot won't connect | [Connection Issues](faq/connection.md) |
| Tool execution fails | [Tool Debugging](faq/tools.md) |
| High costs | [Cost Troubleshooting](faq/costs.md) |
| Security concerns | [Security FAQ](faq/security.md) |
| MCP servers offline | [MCP Troubleshooting](mcp-integration.md#troubleshooting) |

---

## 📊 Use Cases

| Use Case | Document |
|----------|----------|
| Customer Support Bot | [Support Bot Guide](use-cases/support-bot.md) |
| DevOps Automation | [DevOps Bot Guide](use-cases/devops-bot.md) |
| Code Review Assistant | [Code Review Guide](use-cases/code-review.md) |
| Data Analysis | [Analytics Bot Guide](use-cases/analytics-bot.md) |
| Security Monitoring | [Security Bot Guide](use-cases/security-bot.md) |

---

## 🎯 Quick Links by Topic

### Cost Optimization
1. [Moonshot Provider](moonshot-provider.md) - 97% savings
2. [Cost Auditor](../cost-auditor/README.md) - Monitoring
3. [Budget Alerts](../cost-auditor/alerts.md) - Notifications

### Multi-Agent
1. [RoundTable System](roundtable-system.md) - Deliberation
2. [Bot Factory](bot-factory-pi-integration.md) - Dynamic bots
3. [Bot Personas](bot-persona-system.md) - Visual identity

### Integrations
1. [MCP Integration](mcp-integration.md) - 100+ servers
2. [GitHub Integration](github-integration.md) - Repo management
3. [Database Access](database-access.md) - SQL queries

### Security
1. [Security Architecture](security/SECURITY_ARCHITECTURE.md) - 7 layers
2. [vs ClawdBot](CLAWDBOT_COMPARISON.md) - Improvements
3. [Secrets Management](GKE_SECRETS.md) - Google SM

---

## 📞 Getting Help

1. **Documentation** - Start here first
2. **[FAQ](faq/)** - Common questions
3. **[Issues](https://github.com/cloudwalk/opencell/issues)** - Bug reports
4. **[Discussions](https://github.com/cloudwalk/opencell/discussions)** - Questions
5. **[Security](../SECURITY.md)** - Vulnerability reporting

---

## 🔄 Keep Updated

This documentation is for **OpenCell v2.0** (February 2025).

Check [CHANGELOG.md](../CHANGELOG.md) for latest updates.

---

<div align="center">

**📖 Can't find what you need? [Open an issue](https://github.com/cloudwalk/opencell/issues/new)**

[Back to README](../README.md) • [GitHub](https://github.com/cloudwalk/opencell)

</div>
