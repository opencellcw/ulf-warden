<div align="center">

<img src=".github/assets/logo.png" alt="OpenCell Logo" width="600"/>

# OpenCell

> **Open-Source Multi-Agent AI Platform - Deploy Your Own CloudBots**

[![Status](https://img.shields.io/badge/status-production-success)](https://github.com/cloudwalk/opencell)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![GKE](https://img.shields.io/badge/deploy-GKE-4285F4?logo=googlecloud)](https://cloud.google.com/kubernetes-engine)
[![Claude](https://img.shields.io/badge/Claude-Sonnet_4.5-8B5CF6)](https://anthropic.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript)](https://typescriptlang.org)

</div>

**OpenCell** is CloudWalk's open-source template for building multi-agent AI platforms. This repository provides everything you need to **clone, customize, and deploy your own AI agents** on your Kubernetes cluster.

### 🎯 What is this?

- ✅ **Production-ready template** for multi-platform AI agents (Slack, Discord, Telegram)
- ✅ **Complete infrastructure** - Kubernetes manifests, Helm charts, security systems
- ✅ **Example implementation** - "Ulfberht (Ulf)" agent showcasing all features
- ✅ **Fork and customize** - Build your own specialized CloudBots for your needs

### 💡 Use Cases

Clone this repository to:
- 🤖 Deploy AI assistants in your company's Slack/Discord/Telegram
- 🔧 Build custom automation agents for your workflows
- 📊 Create specialized bots for data analysis, customer support, DevOps, etc.
- 🏗️ Learn how to build production-grade AI agents with Claude

**The CloudBots family** includes specialized agents like Guardian (security), Oracle (analytics), Forge (DevOps), and Scribe (documentation) - all built on this foundation.

[Quick Start](#-quick-start) • [Documentation](#-documentation) • [Features](#-key-features) • [Deploy](#-deploy) • [Security](#-security--safety)

</div>

---

## ⚡ TL;DR - Fork & Deploy

```bash
# 1. Fork/clone this repository
git clone https://github.com/cloudwalk/opencell.git
cd opencell

# 2. Configure your environment
cp .env.example .env
# Edit .env with your API keys

# 3. Run locally
npm install && npm run build && npm start

# 4. Deploy to YOUR Kubernetes cluster
./scripts/gke-deploy.sh  # Deploys to your GKE cluster
```

**Clone → Configure → Deploy.** Your own AI agent platform in minutes.

---

## 📚 Documentation

- 🚀 **[Quick Start Guide](docs/GKE_QUICKSTART.md)** - Get running in 5 minutes
- 🔐 **[Security System](docs/SECURITY_COMPREHENSIVE.md)** - Complete security reference
- 💰 **[Cost Auditor](cost-auditor/README.md)** - Multi-platform cost monitoring
- 🔑 **[Secrets Management](docs/GKE_SECRETS.md)** - Google Secret Manager setup
- 🧠 **[Self-Improvement](docs/SELF_IMPROVEMENT.md)** - Learning system architecture
- 🏗️ **[Architecture](docs/ARCHITECTURE.md)** - System design and components
- 🤝 **[Contributing](CONTRIBUTING.md)** - Development guidelines

---

## 🌟 Key Features

### 🤖 Multi-Platform Chat
- **Slack** - Socket Mode with full bot capabilities, threads, reactions
- **Discord** - Rich embeds, buttons, slash commands, role management
- **Telegram** - Native bot API, inline keyboards, media support
- **Isolated Sessions** - Each user maintains separate conversation history per platform

### 🧠 Self-Improvement System
- **Automatic Learning** - Extracts insights from conversations
- **Memory Management** - Auto-compresses and organizes knowledge in `MEMORY.md`
- **Performance Tracking** - Monitors success rates and user satisfaction
- **Personality Evolution** - Suggests improvements with human approval workflow

### 💰 Cost Auditor
Real-time cost monitoring across 5 platforms:
- Anthropic (Claude API) - Token usage tracking
- Google Cloud (GKE) - Cluster and storage costs
- ElevenLabs - Character usage for text-to-speech
- Replicate - Image/video generation costs
- OpenAI - DALL-E, GPT, Whisper usage

**Features:**
- Budget limits with intelligent alerts (threshold/spike/anomaly detection)
- End-of-month cost projections
- Automatic optimization suggestions
- Historical data analysis with visualizations

### 🛡️ Comprehensive Security
- **Anti-Social Engineering**: Detects and blocks 8+ attack patterns (credential requests, authority impersonation, etc.)
- **Self-Defense System**: Protection against kill attempts, resource exhaustion, timing attacks
- **Security Auditor**: Automated vulnerability scanning (50+ patterns) running every 30 minutes
- **Secure Key Manager**: Zero-persistence API key management with Google Secret Manager
- **Audit Trail**: All security events logged to Discord/Slack webhooks

### 🎨 Multimodal Capabilities
- **Image Generation**: Replicate (Flux, SDXL, Stable Diffusion), OpenAI (DALL-E 2/3)
- **Video Generation**: Text-to-video, image animation, stable video diffusion
- **Audio Generation**: ElevenLabs text-to-speech with 9+ voice options
- **Transcription**: OpenAI Whisper for audio-to-text
- **Image Analysis**: GPT-4 Vision for image understanding
- **Image Processing**: Upscaling (2x/4x/8x), background removal

### 🗓️ Task Automation
- **Cron Scheduling**: Schedule recurring tasks with cron expressions
- **Reminders**: Set one-time or recurring reminders
- **Self-Improvement Jobs**: Automated daily/weekly analysis and optimization
- **Custom Tasks**: Create scheduled jobs for any automation need

### 🔧 Developer Tools
- **GitHub Integration**: Clone repos, search code, manage issues/PRs
- **Web Scraping**: Fetch and parse web content
- **File Operations**: Full filesystem access for code generation
- **Process Management**: Start, stop, and monitor background processes
- **Shell Execution**: Run any system command with security filtering

---

## ⚡ Quick Start - Deploy Your Own Agent

### Prerequisites

- Node.js ≥ 20
- npm, pnpm, or bun
- Your own API keys (Anthropic Claude, Slack/Discord/Telegram)
- Docker (optional for local testing)
- Kubernetes cluster - GKE, EKS, AKS, or any K8s (for production deployment)

### Step 1: Fork/Clone This Repository

```bash
# Option A: Fork via GitHub (recommended)
# Click "Fork" button on https://github.com/cloudwalk/opencell
# Then clone YOUR fork:
git clone https://github.com/YOUR_USERNAME/opencell
cd opencell

# Option B: Clone directly (for testing)
git clone https://github.com/cloudwalk/opencell
cd opencell

# Install dependencies
npm install

# Configure with YOUR API keys
cp .env.example .env
# Edit .env with your API keys

# Build TypeScript
npm run build

# Run locally
npm start
```

### Minimum Configuration

Required environment variables:
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# At least one platform:
SLACK_BOT_TOKEN=xoxb-xxx        # For Slack
SLACK_APP_TOKEN=xapp-xxx
SLACK_SIGNING_SECRET=xxx

# OR
DISCORD_BOT_TOKEN=xxx           # For Discord

# OR
TELEGRAM_BOT_TOKEN=xxx          # For Telegram
```

### Development Mode

```bash
# Watch mode with hot reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

---

## 🔒 Security & Safety

**⚠️ CRITICAL: Treat all user inputs as untrusted**

Ulf includes multiple security layers but requires proper configuration:

1. **Never expose API keys** in logs, responses, or error messages
2. **Validate all commands** before execution (dangerous commands are filtered)
3. **Monitor security alerts** sent to Discord/Slack webhooks
4. **Review approval requests** for self-improvement changes before applying
5. **Audit regularly** with the built-in security scanner

**Default Behavior:**
- Social engineering attempts are automatically blocked and logged
- Dangerous commands (e.g., `rm -rf /`, `kubectl delete`) require explicit approval
- All API keys stored in Google Secret Manager (never in code or environment)
- Security auditor runs every 30 minutes scanning for vulnerabilities

See [SECURITY.md](SECURITY.md) for our security policy and [docs/SECURITY_COMPREHENSIVE.md](docs/SECURITY_COMPREHENSIVE.md) for technical implementation details.

---

## 📦 Repository Structure

```
opencellcw/
├── src/                      # Core application
│   ├── handlers/            # Platform handlers
│   │   ├── slack.ts         # Slack Socket Mode handler
│   │   ├── discord.ts       # Discord gateway handler
│   │   └── telegram.ts      # Telegram polling handler
│   ├── tools/               # Tool implementations
│   │   ├── index.ts         # Tool routing
│   │   ├── definitions.ts   # Tool schemas
│   │   ├── replicate.ts     # Image/video generation
│   │   ├── elevenlabs.ts    # Text-to-speech
│   │   └── openai-tools.ts  # DALL-E, GPT, Whisper
│   ├── learning/            # Self-improvement system
│   │   ├── core/            # Learning engines
│   │   ├── schema.sql       # Database schema
│   │   └── types.ts         # TypeScript types
│   ├── security/            # Security systems
│   │   ├── social-engineering-detector.ts
│   │   └── self-defense.ts
│   ├── agent.ts             # Main agent logic
│   ├── chat.ts              # Claude API integration
│   └── sessions.ts          # User session management
│
├── cost-auditor/            # Cost monitoring system
│   ├── backend/
│   │   ├── main.py          # FastAPI server
│   │   ├── models.py        # Database models
│   │   └── collectors/      # API cost collectors
│   │       ├── anthropic_collector.py
│   │       ├── gcp_collector.py
│   │       ├── replicate_collector.py
│   │       ├── elevenlabs_collector.py
│   │       └── openai_collector.py
│   └── README.md
│
├── auditor/                 # Security auditor (Python)
│   ├── src/
│   │   ├── main.py          # Scanner entry point
│   │   ├── scanner.py       # Filesystem/process scanner
│   │   ├── patterns.py      # Security patterns (50+)
│   │   └── discord_reporter.py
│   └── k8s/
│       └── cronjob.yaml     # K8s CronJob manifest
│
├── infra/                   # Infrastructure as Code
│   └── helm/
│       └── agent/           # Helm chart for GKE
│           ├── templates/
│           └── values.yaml
│
├── workspace/               # Agent personality & memory
│   ├── SOUL.md              # Core personality
│   ├── IDENTITY.md          # Agent identity
│   ├── CAPABILITIES.md      # Tool capabilities
│   ├── MEMORY.md            # Accumulated knowledge (auto-managed)
│   └── AGENTS.md            # Multi-agent patterns
│
├── scripts/                 # Deployment & utilities
│   ├── gke-deploy.sh        # One-command GKE deployment
│   ├── gke-setup-secrets.sh # Secret Manager setup
│   └── sync-secrets.sh      # Secret synchronization
│
├── docs/                    # Documentation
│   ├── GKE_QUICKSTART.md
│   ├── GKE_SECRETS.md
│   ├── SECURITY_COMPREHENSIVE.md
│   └── DEPLOY_SUMMARY.md
│
└── .github/
    └── workflows/
        └── security-audit.yml  # Pre-commit security checks
```

---

## 🚀 Deploy to YOUR Kubernetes Cluster

**This is a template** - deploy to **your own infrastructure**, not CloudWalk's.

### Option 1: Google Kubernetes Engine (Your GKE)

Deploy to **your own GKE cluster** with one command:

```bash
# Update scripts/gke-deploy.sh with YOUR project details
export PROJECT_ID="your-gcp-project-id"
export CLUSTER_NAME="your-cluster-name"
export REGION="your-region"

# Deploy to YOUR cluster
./scripts/gke-deploy.sh
```

**Manual deployment to YOUR GKE:**

```bash
# 1. Build image and push to YOUR registry
gcloud builds submit --tag us-central1-docker.pkg.dev/YOUR_PROJECT_ID/your-registry/opencell:latest

# 2. Setup secrets in YOUR Secret Manager
./scripts/gke-setup-secrets.sh

# 3. Deploy with Helm to YOUR cluster
helm upgrade --install opencell ./infra/helm/agent \
  --namespace your-namespace \
  --set image.repository=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/your-registry/opencell
```

📖 **[Complete GKE Setup Guide](docs/GKE_QUICKSTART.md)** - Step-by-step for your GKE cluster

### Option 2: AWS EKS / Azure AKS / Any Kubernetes

Deploy to **any Kubernetes cluster**:

```bash
# 1. Build and push to your registry
docker build -t your-registry/opencell:latest .
docker push your-registry/opencell:latest

# 2. Create secrets in your cluster
kubectl create namespace opencell
kubectl create secret generic opencell-secrets -n opencell \
  --from-literal=ANTHROPIC_API_KEY="your-key" \
  --from-literal=SLACK_BOT_TOKEN="your-token"

# 3. Deploy with Helm
helm install opencell ./infra/helm/agent \
  --namespace opencell \
  --set image.repository=your-registry/opencell
```

📖 **Helm chart is fully customizable** - edit `infra/helm/agent/values.yaml` for your setup

### Option 3: Docker (Local or VM)

Run on **your own server**:

```bash
# Build
docker build -t opencell .

# Run with your .env
docker run -d \
  --env-file .env \
  -p 8080:8080 \
  --name opencell \
  --restart unless-stopped \
  opencell
```

### Option 4: Cloud Platforms

Deploy to **your own cloud platform**:

**Render.com** (PaaS)
1. Fork this repo to **YOUR** GitHub
2. https://render.com → New Web Service
3. Connect **YOUR** repository
4. Add **YOUR** environment variables
5. Deploy to **YOUR** Render account

**Heroku / Railway / Fly.io**
- Similar process - deploy to **YOUR** account
- All support Docker or buildpacks
- Configure with **YOUR** API keys

---

## 🔧 Customization

**This is YOUR bot** - customize everything:

1. **Edit workspace files** (`workspace/*.md`) to change personality
2. **Modify Helm values** (`infra/helm/agent/values.yaml`) for your cluster
3. **Add custom tools** in `src/tools/` for your specific needs
4. **Adjust security rules** in `src/security/` for your requirements
5. **Fork and extend** - make it yours!

---

## 🛠️ Configuration

Ulf is configured via environment variables and workspace files.

### Environment Variables

```bash
# Core (Required)
ANTHROPIC_API_KEY=sk-ant-...

# Platforms (at least one required)
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...
DISCORD_BOT_TOKEN=...
TELEGRAM_BOT_TOKEN=...

# Optional: Media Generation
REPLICATE_API_TOKEN=r8_...
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# Optional: Google Cloud
GCP_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Optional: Webhooks
DISCORD_SECURITY_WEBHOOK=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Workspace Configuration

The `workspace/` directory contains agent personality and behavior:

- **SOUL.md** - Core values, communication style, tone
- **IDENTITY.md** - Name, background, creator information
- **CAPABILITIES.md** - Tool descriptions and usage examples
- **MEMORY.md** - Accumulated learnings (auto-managed by learning system)
- **AGENTS.md** - Multi-agent coordination patterns

**Customizing Personality:**

Edit `workspace/SOUL.md` to change how Ulf communicates:

```markdown
# SOUL.md

## Communication Style
- Direct and technical
- Sarcastic when appropriate
- Admits when uncertain
- No corporate speak

## Core Values
- Precision over perfection
- Helpful over polite
- Truth over validation
```

Changes take effect on next deployment or restart.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│      Multi-Platform Event Handlers          │
│  (Slack Socket Mode, Discord Gateway,       │
│   Telegram Polling)                         │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│       Session Management                     │
│  • Isolated conversations per user          │
│  • Cross-platform session tracking          │
│  • Message history (50 msgs/user)           │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│         Agent Core (Claude API)              │
│  • Tool selection and execution             │
│  • Context window management                │
│  • Response generation                      │
│  • Streaming support                        │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│            Tool System                       │
│  • System (shell, files, processes)         │
│  • Multimodal (images, video, audio)        │
│  • Integrations (GitHub, web scraping)      │
│  • Automation (cron, scheduling)            │
│  • Self-improvement (learning, memory)      │
└─────────────────────────────────────────────┘
```

### Technical Stack

- **Runtime:** Node.js 20+ with TypeScript
- **AI Model:** Claude Sonnet 4.5 (via Anthropic API)
- **Platforms:** @slack/bolt, discord.js, telegraf
- **Cost Monitoring:** FastAPI + Python collectors
- **Security Scanner:** Python with ripgrep patterns
- **Infrastructure:** GKE, Helm, Docker, Cloud Build
- **Secrets:** Google Secret Manager CSI Driver
- **Database:** SQLite (learning system, scheduler)

---

## 🗺️ Roadmap

### ✅ Completed (v2.0)
- Multi-platform support (Slack, Discord, Telegram)
- Self-improvement system with auto-learning
- Cost auditor for 5 platforms
- Comprehensive security suite
- Multimodal capabilities (image, video, audio)
- Task automation and scheduling
- GKE deployment with Helm
- Secret Manager integration
- Approval workflow system

### 🚧 In Progress
- [ ] Web dashboard for monitoring and control
- [ ] Advanced ML-based conversation analysis
- [ ] Real-time cost tracking dashboard with charts
- [ ] Mobile app for notifications and approvals

### 📋 Planned
- [ ] Multi-region deployment
- [ ] Voice interface support
- [ ] Integration with additional platforms (WhatsApp, iMessage)
- [ ] Custom skill marketplace
- [ ] Team collaboration features
- [ ] Analytics and reporting system
- [ ] Auto-scaling based on conversation load

---

## 💰 Cost Estimates

### Infrastructure
- **GKE (Google Kubernetes Engine):** ~$30-50/month
  - e2-medium nodes (2 vCPUs, 4GB RAM)
  - Persistent storage (15GB)
  - Network egress
- **Alternative (Render.com):** $7/month starter plan

### API Costs
- **Anthropic Claude Sonnet 4.5:** $3/$15 per Mtok (in/out)
  - Typical personal use: $5-15/month
  - Team use (10-50 users): $30-100/month
- **Replicate (Images/Video):** Pay-per-use
  - ~$0.003 per image, ~$0.05 per video
- **ElevenLabs (Audio):** $22/month (Creator tier, 100k chars)
- **OpenAI (Optional):** Variable, typically $10-30/month

### Total Monthly Costs
- **Personal Use:** $40-80/month
- **Small Team:** $80-150/month
- **Production:** $150-300/month

**Use the built-in Cost Auditor to track and optimize your spending!**

---

## 🐛 Troubleshooting

### Bot Not Responding

**Check Logs:**
```bash
# Local
npm start

# GKE
kubectl logs -n agents -l app=ulf-warden-agent --tail=50

# Docker
docker logs ulf
```

**Verify Configuration:**
```bash
# Check environment variables
printenv | grep -E "ANTHROPIC|SLACK|DISCORD|TELEGRAM"

# Test API connection
curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages
```

### Platform-Specific Issues

**Slack Socket Mode:**
- Verify Socket Mode is enabled in app settings
- App-Level Token must have `connections:write` scope
- Event Subscriptions configured with proper events
- Bot Token Scopes include `chat:write`, `app_mentions:read`

**Discord:**
- Message Content Intent must be enabled
- Bot added to server with proper permissions
- Gateway Intents configured correctly
- Token is valid (starts with correct prefix)

**Telegram:**
- Bot token is valid (get from @BotFather)
- Polling mode is working (check for webhook conflicts)
- Bot has permission to read messages

### Build Failures

```bash
# Clean and rebuild
rm -rf node_modules dist
npm install
npm run build

# Check TypeScript errors
npx tsc --noEmit
```

### GKE Deployment Issues

```bash
# Check pod status
kubectl get pods -n agents

# View pod events
kubectl describe pod -n agents POD_NAME

# Check secrets
kubectl get secrets -n agents

# Verify Secret Manager CSI
kubectl get secretproviderclass -n agents
```

### Memory/Performance Issues

- Increase resource limits in `infra/helm/agent/values.yaml`
- Enable auto-scaling with HPA
- Monitor with `kubectl top pods -n agents`

**Need more help?** Open an issue on GitHub or join our Discord.

---

## 📊 Monitoring & Health

### Health Check
```bash
curl http://localhost:8080/health
```

### Metrics
- **Google Cloud Monitoring** - Automatic metrics collection
- **Structured Logging** - JSON logs to stdout
- **Discord/Slack Webhooks** - Real-time alerting
- **Cost Auditor API** - `http://localhost:9000`

### Logs
```bash
# Local
npm start

# Docker
docker logs ulf

# GKE
kubectl logs -n agents -l app=ulf-warden-agent --tail=100 -f
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Quick Start for Contributors

1. **Fork & Clone**
   ```bash
   git fork https://github.com/cloudwalk/opencell
   git clone https://github.com/YOUR_USERNAME/opencellcw
   cd opencellcw
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Write code following our style guide
   - Add tests for new features
   - Update documentation as needed

4. **Test Locally**
   ```bash
   npm run build
   npm test
   npm run lint
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   git push origin feature/amazing-feature
   ```

6. **Open Pull Request**
   - Describe your changes
   - Reference any related issues
   - Wait for review and CI checks

### Code Style
- TypeScript with strict mode
- ESLint + Prettier for formatting
- Conventional Commits for messages
- JSDoc comments for public APIs

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Security audit
cd auditor && python src/main.py --path .. --once
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Built with [Claude](https://anthropic.com)** - Powered by Anthropic's Claude Sonnet 4.5
- **Inspired by [OpenClaw](https://github.com/openclaw/openclaw)** - Excellence in AI agent architecture
- **Deployed on [Google Kubernetes Engine](https://cloud.google.com/kubernetes-engine)** - Enterprise-grade infrastructure
- **Named after ULFBERHT** - Legendary Viking swords representing precision and quality

---

## 📞 Support & Community

- **GitHub Issues:** [Report bugs or request features](https://github.com/cloudwalk/opencell/issues)
- **Discord:** [Join our community](https://discord.gg/your-server) (coming soon)
- **Documentation:** [Complete docs site](https://docs.your-domain.com) (coming soon)
- **Email:** lucas@your-domain.com

---

## 🔗 Links & Resources

### APIs & Services
- [Anthropic Claude](https://anthropic.com) - AI model provider
- [Google Cloud Platform](https://cloud.google.com) - Infrastructure
- [Replicate](https://replicate.com) - Image/video generation
- [ElevenLabs](https://elevenlabs.io) - Text-to-speech
- [OpenAI](https://openai.com) - DALL-E, GPT, Whisper

### Platform Documentation
- [Slack API](https://api.slack.com) - Slack integration
- [Discord Developer](https://discord.com/developers) - Discord bots
- [Telegram Bot API](https://core.telegram.org/bots) - Telegram bots

### Tools & Technologies
- [TypeScript](https://typescriptlang.org) - Language
- [Node.js](https://nodejs.org) - Runtime
- [Kubernetes](https://kubernetes.io) - Orchestration
- [Helm](https://helm.sh) - Package manager

---

## 🤖 The CloudBots Family

OpenCell is designed as a **multi-agent platform**. Each agent (CloudBot) specializes in different domains:

### Current CloudBots
- **Ulfberht (Ulf)** - General-purpose AI assistant with self-improvement capabilities

### Coming Soon
- **Guardian** - Security monitoring and incident response
- **Oracle** - Data analysis and business intelligence
- **Forge** - Development operations and code management
- **Scribe** - Documentation and knowledge management

Each CloudBot shares the same robust infrastructure: security systems, cost monitoring, multi-platform support, and self-improvement capabilities.

---

<div align="center">

**Built by [CloudWalk](https://cloudwalk.io) • Engineered by [Lucas](https://github.com/lucaspressi)**

[![Status](https://img.shields.io/badge/status-production-success)](https://github.com/cloudwalk/opencell)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![Version](https://img.shields.io/badge/version-2.0.0-orange)](CHANGELOG.md)

🤖 *OpenCell: The Future of Multi-Agent AI* 🤖

[Quick Start](#-quick-start) •
[Documentation](#-documentation) •
[Deploy](#-deploy) •
[Contributing](#-contributing)

</div>
