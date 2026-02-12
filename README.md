<div align="center">

<img src=".github/assets/logo.png" alt="OpenCell Logo" width="600"/>

# OpenCell (Ulf-Warden)

> **🤖 Open-Source Multi-Agent AI Platform - Your Own AI Agent Army**

[![Status](https://img.shields.io/badge/status-production-success)](https://github.com/cloudwalk/opencell)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)
[![GKE](https://img.shields.io/badge/deploy-GKE-4285F4?logo=googlecloud)](https://cloud.google.com/kubernetes-engine)
[![Pi Powered](https://img.shields.io/badge/Pi-Coding_Agent-FF6B6B)](https://github.com/mariozechner/pi-coding-agent)
[![Claude](https://img.shields.io/badge/Claude-Opus_4-8B5CF6)](https://anthropic.com)
[![Moonshot](https://img.shields.io/badge/Moonshot-Kimi-00D9FF)](https://moonshot.cn)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991)](https://openai.com)
[![Gemini](https://img.shields.io/badge/Gemini-2.5-4285F4)](https://ai.google.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript)](https://typescriptlang.org)

</div>

**OpenCell** (Ulfberht-Warden) is a production-ready multi-agent AI platform that runs on YOUR infrastructure. Deploy unlimited specialized AI agents across Slack, Discord, Telegram, and WhatsApp.

## ⚡ Quick Start (3 Minutes)

```bash
git clone https://github.com/cloudwalk/opencell.git
cd opencell
npm install
npm run setup  # Interactive wizard - answers all questions!
npm start      # Bot is live! 🚀
```

**That's it!** The setup wizard handles everything:
- ✅ Platform selection (Discord/Slack/Telegram)
- ✅ AI provider (Claude/Moonshot/OpenAI/Gemini)
- ✅ Optional features (image gen, search, voice, Pi)
- ✅ Deployment (10+ options: Render, Railway, Fly.io, Docker, GKE...)

**[📖 Full Quick Start Guide →](QUICKSTART.md)**  
**[🚀 Deployment Options →](docs/DEPLOY_GUIDE.md)**

---

## ✨ LATEST - v3.0 (February 12, 2026)

### 🔥 **Pi Integration + Hybrid Multi-Provider System**

#### **Pi Coding Agent - Full Agent Powers! 🤖**
- Bots powered by **Pi** (same engine as this conversation!)
- Execute bash commands, read/write files, interact with K8s
- Access to **official Pi skills library** (17+ specialized skills)
- Skills auto-discovery and intelligent usage
- Multi-step problem solving with tools
- 📖 [Pi Integration Guide](docs/HYBRID-PI-INTEGRATION.md)

#### **Hybrid Dispatcher - Ultimate Cost Optimization 💰**
- **4 LLM providers** working together intelligently:
  - **Moonshot** ($0.50/Mtok) - Simple queries (90% of traffic)
  - **Gemini** ($0.075-1.25/Mtok) - Fast inference
  - **OpenAI** ($0.50-30/Mtok) - GPT-4 quality
  - **Claude** ($3-15/Mtok) - Complex reasoning
  - **Pi** (multi-call) - Full agent powers
- **Automatic routing** based on task complexity
- **85-97% cost savings** vs Claude-only
- **Budget protection** (daily limits, per-message caps)
- 📖 [Hybrid Dispatcher Docs](docs/HYBRID-PI-INTEGRATION.md)

#### **Cost Comparison:**
```
100 messages/day with Hybrid Dispatcher:
- 60 simple → Moonshot: $0.06
- 30 normal → Claude: $0.60
- 10 complex → Pi: $0.80
= $1.46/day (~$44/month)

vs Claude-only: $2/day ($60/month)
💰 SAVINGS: $16/month (27%)

vs Moonshot-only: $0.10/day but no agent powers
vs Pi-only: $5/day (too expensive)
```

### 🎓 **Pi Skills System**

Bots have access to **17 official Pi skills**:

**🔍 Search & Information:**
- `brave-search` - Web search
- `youtube-transcript` - Video transcripts

**📧 Communication:**
- `gmcli` - Gmail integration
- `gccli` - Google Calendar
- `gdcli` - Google Drive

**🎨 Creation:**
- `frontend-design` - React components
- `pdf`, `docx`, `xlsx`, `pptx` - Document creation

**🔧 Development:**
- `mcp-builder` - Build MCP servers
- `webapp-testing` - Playwright testing
- `browser-tools` - Browser automation

**🎙️ Media:**
- `transcribe` - Speech-to-text
- And more...

Bots can:
1. Auto-discover relevant skills based on user query
2. Read skill documentation dynamically
3. Execute skill-specific tools
4. Combine multiple skills for complex tasks

📖 [See full skills catalog](docs/HYBRID-PI-INTEGRATION.md#-available-pi-skills)

---

## 🚀 Features

### 🤖 **Multi-Agent Architecture**

- **Bot Factory** - Create unlimited specialized bots dynamically
- **Agent Bots** - Full Pi powers (bash, kubectl, read, write, deploy)
- **Conversational Bots** - Fast, cheap, focused on chat
- **RoundTable** - Multi-agent deliberation system
- **Bot Types:** DevOps, Security, Support, Analytics, Custom

### 🎯 **Multi-Platform**

- **Discord** - Voice channels, slash commands, reactions
- **Slack** - Threads, mentions, apps
- **Telegram** - Groups, channels, inline
- **WhatsApp** - QR code auth, groups

### 💰 **Cost Optimization**

| Provider | Cost/Mtok | Use Case | Speed |
|----------|-----------|----------|-------|
| **Moonshot** | $0.50 | Simple queries (default) | ⚡⚡⚡ |
| **Gemini Flash** | $0.075 | Fast inference | ⚡⚡⚡ |
| **Gemini Pro** | $1.25 | Balanced quality | ⚡⚡ |
| **OpenAI GPT-4** | $10-30 | High quality | ⚡⚡ |
| **Claude Opus** | $15 | Complex reasoning | ⚡ |
| **Pi Agent** | Multi-call | Tool execution | ⚡ |

**Hybrid Dispatcher** automatically routes to cheapest provider that can handle the task!

### 🔧 **Agent Powers (via Pi)**

Agent bots can:
- ✅ Execute bash commands (`ps aux`, `docker ps`)
- ✅ Kubernetes management (`kubectl get pods`)
- ✅ Read/write files (`read: src/app.ts`)
- ✅ Deploy applications (`helm install`)
- ✅ Git operations (`git diff`, `git commit`)
- ✅ Multi-step debugging and fixes
- ✅ Load and use official Pi skills

### 🎓 **Skills System**

```typescript
User: "search for kubernetes tutorials"

Bot: Detected "search" → loading brave-search skill...
[read: ~/.pi/agent/skills/pi-skills/brave-search/SKILL.md]
[uses brave_search tool]

Bot: "Found 10 K8s tutorials:
     1. Official K8s Docs
     2. K8s Patterns by...
     ..."
```

Bots are **skill-aware** and use them automatically!

### 🔒 **Security**

- **7-layer security** (rate limiting, tool whitelisting, audit logs)
- **Tool safety levels:** Safe, Caution, Restricted
- **Budget protection** (daily limits prevent cost overruns)
- **Sandboxed execution** (Pi workspaces isolated per bot)
- **Permission system** (admin-only commands)

### 📊 **Observability**

- **AgentOps** - Session tracking, cost monitoring
- **Langfuse** - LLM tracing and analytics
- **OpenTelemetry** - Distributed tracing
- **Redis Cache** - Response caching for cost savings
- **Real-time logs** - Per-bot, per-provider tracking

---

## ⚡ Quick Start

### 1. Prerequisites

```bash
# Required
- Node.js 20+
- Docker
- Kubernetes cluster (GKE, EKS, local)
- At least 1 LLM API key (Claude, Moonshot, OpenAI, or Gemini)

# Optional (for full features)
- Pi coding agent installed globally
- Brave API key (web search)
- Replicate API key (image generation)
- ElevenLabs API key (TTS)
```

### 2. Clone and Install

```bash
git clone https://github.com/cloudwalk/opencell.git
cd opencell
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

**Minimal setup (.env):**
```bash
# Required: At least 1 provider
ANTHROPIC_API_KEY=sk-ant-xxx

# Recommended: Cost optimization
DEFAULT_PROVIDER=moonshot
MOONSHOT_API_KEY=sk-xxx

# Optional: Pi agent powers
ENABLE_PI=true

# Platform: At least 1
DISCORD_BOT_TOKEN=xxx
# or
SLACK_BOT_TOKEN=xoxb-xxx
```

**Full setup (.env):**
```bash
# All providers (Hybrid Dispatcher picks best)
ANTHROPIC_API_KEY=sk-ant-xxx
MOONSHOT_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=AIza-xxx

# Hybrid configuration
DEFAULT_PROVIDER=moonshot  # Cheapest for bulk
ENABLE_PI=true             # Agent powers
DAILY_BUDGET=10.00         # Cost protection

# All platforms
DISCORD_BOT_TOKEN=xxx
SLACK_BOT_TOKEN=xoxb-xxx
TELEGRAM_BOT_TOKEN=xxx

# Features
BRAVE_API_KEY=BSA_xxx      # Web search
REPLICATE_API_TOKEN=r8_xxx # Image gen
GROQ_API_KEY=gsk_xxx       # Speech-to-text
ELEVENLABS_API_KEY=sk_xxx  # TTS
```

### 4. Run Locally

```bash
# Build
npm run build

# Run
npm start

# Or with development mode
npm run dev
```

### 5. Create Your First Bot

**Option A: Conversational Bot (simple)**
```
@Ulf create bot oracle
  personality: You are a data analysis consultant
```

**Option B: Agent Bot (with Pi powers)**
```
@Ulf create agent bot devops
  personality: You are a Kubernetes expert
  tools: bash, kubectl, read, write
```

Bot deploys to Kubernetes in ~30 seconds! 🚀

---

## 📖 Architecture

### **System Diagram**

```
┌─────────────────────────────────────────────┐
│         Users (Discord, Slack, etc)         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│         Bot Factory (Coordinator)           │
│  - Creates/manages bots                     │
│  - Routes messages                          │
│  - Security & rate limiting                 │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐   ┌────────▼───────────┐
│ Bot Runtime    │   │ Bot Runtime        │
│ (guardian)     │   │ (oracle)           │
└───────┬────────┘   └────────┬───────────┘
        │                     │
┌───────▼─────────────────────▼────────────┐
│      Hybrid Dispatcher (LLM Router)      │
│  - Analyzes task complexity              │
│  - Selects optimal provider              │
│  - Tracks costs and budget               │
└──────────────────┬───────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───▼────┐  ┌──────▼──────┐  ┌───▼─────┐
│Moonshot│  │   Claude    │  │   Pi    │
│(cheap) │  │  (quality)  │  │ (agent) │
└────────┘  └─────────────┘  └────┬────┘
                                   │
                   ┌───────────────┴────────────────┐
                   │                                │
            ┌──────▼──────┐              ┌─────────▼────────┐
            │ Pi Skills   │              │ Infrastructure   │
            │ - 17 skills │              │ - kubectl        │
            │ - Auto-load │              │ - docker         │
            └─────────────┘              │ - bash           │
                                         └──────────────────┘
```

### **Request Flow Examples**

#### **Simple Query (Moonshot):**
```
User: "oi, tudo bem?"
  ↓
Coordinator
  ↓
Bot Runtime (guardian)
  ↓
Hybrid Dispatcher
  ├─ Complexity: SIMPLE
  ├─ Cost: $0.0001
  └─ Provider: Moonshot ⚡
  ↓
Response: "Oi! Tudo ótimo! 😊"
Time: 2s | Cost: $0.0001
```

#### **Complex Reasoning (Claude):**
```
User: "explain OpenCell architecture in detail"
  ↓
Hybrid Dispatcher
  ├─ Complexity: REASONING
  ├─ Trigger: /architecture/
  └─ Provider: Claude Opus 🧠
  ↓
Response: [Detailed architectural explanation]
Time: 8s | Cost: $0.03
```

#### **Tool Use (Pi Agent):**
```
User: "check if pods are healthy"
  ↓
Hybrid Dispatcher
  ├─ Complexity: TOOL_USE
  ├─ Trigger: /check.*pod/
  └─ Provider: Pi 🔧
  ↓
Pi Execution:
  1. kubectl get pods -n agents
  2. Analyze output
  3. Identify issues
  ↓
Response: "3 pods running:
          ✅ guardian (healthy)
          ✅ oracle (healthy)
          ⚠️ devops (CrashLoopBackOff)"
Time: 15s | Cost: $0.08
```

---

## 🔧 Deployment

### **Local (Development)**

```bash
npm run dev
```

### **Docker**

```bash
docker build -t opencell .
docker run -p 3000:3000 --env-file .env opencell
```

### **Kubernetes (GKE)**

```bash
# 1. Create cluster
gcloud container clusters create opencell-cluster \
  --num-nodes=3 \
  --machine-type=e2-medium \
  --region=us-central1

# 2. Deploy with Helm
helm install opencell ./infra/helm/coordinator \
  --namespace opencell \
  --create-namespace \
  --set env.ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY

# 3. Expose externally
kubectl expose deployment opencell-coordinator \
  --type=LoadBalancer \
  --port=80 \
  --target-port=3000 \
  --namespace=opencell

# 4. Get external IP
kubectl get svc -n opencell
```

### **Cloud Run (Serverless)**

```bash
gcloud run deploy opencell \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
```

---

## 📊 Cost Analysis

### **Monthly Costs (100 msgs/day)**

#### **Scenario 1: Claude Only (baseline)**
```
100 msgs/day × $0.02/msg = $2/day
= $60/month 💸
```

#### **Scenario 2: Moonshot Only (cheap but limited)**
```
100 msgs/day × $0.001/msg = $0.10/day
= $3/month 💰

BUT: No agent powers, lower quality
```

#### **Scenario 3: Hybrid Dispatcher (RECOMMENDED) 🏆**
```
60 simple queries → Moonshot: $0.06
30 normal queries → Claude: $0.60
10 tool use → Pi: $0.80
────────────────────────────
Total: $1.46/day = $44/month

💰 SAVINGS: $16/month (27% vs Claude)
✅ BENEFITS: Full agent powers + quality
```

#### **Scenario 4: Hybrid + Home PC Worker**
```
Daily cloud cost: $1.46
Home PC (off-peak workloads): -$0.50
────────────────────────────
Total: $0.96/day = $29/month

💰 SAVINGS: $31/month (52% vs Claude)
🏠 BONUS: Free GPU for image gen, LLMs
```

### **Cost Breakdown by Provider:**

| Provider | Input | Output | Context | Best For |
|----------|-------|--------|---------|----------|
| Moonshot | $0.50/Mtok | $0.50/Mtok | 2M tokens | Bulk queries |
| Gemini Flash | $0.075/Mtok | $0.30/Mtok | 2M tokens | Fast inference |
| Gemini Pro | $1.25/Mtok | $5.00/Mtok | 2M tokens | Balanced |
| OpenAI GPT-4 | $10/Mtok | $30/Mtok | 128k tokens | Quality |
| Claude Opus | $15/Mtok | $75/Mtok | 200k tokens | Reasoning |
| Pi Agent | Variable | Variable | N/A | Tool execution |

---

## 🎯 Use Cases

### **1. DevOps Automation**
```
@devops check if all pods are healthy
@devops deploy guardian with 2GB memory
@devops analyze error logs from last hour
```

**Powers:** kubectl, docker, bash, read logs

### **2. Security Monitoring**
```
@guardian scan for hardcoded secrets
@guardian check CVE database for vulnerabilities
@guardian audit permissions in namespace agents
```

**Powers:** bash, read files, web search

### **3. Customer Support**
```
@support how do I reset my password?
@support troubleshoot login issues
@support what are your pricing tiers?
```

**Powers:** conversation only (fast, cheap)

### **4. Data Analysis**
```
@oracle analyze sales data from Q4
@oracle create visualization of user growth
@oracle predict churn risk for cohort X
```

**Powers:** read files, Python scripts, calculations

### **5. Content Creation**
```
@creator search trending topics in AI
@creator write blog post about Kubernetes
@creator generate social media posts
```

**Powers:** web search, writing, image generation

---

## 📚 Documentation

- **[Quick Start](QUICK_START_PI_BOTS.md)** - Get started in 5 minutes
- **[Pi Integration](docs/HYBRID-PI-INTEGRATION.md)** - Full agent powers
- **[Hybrid Dispatcher](docs/HYBRID-PI-INTEGRATION.md)** - Cost optimization
- **[Bot Factory](docs/bot-factory-pi-integration.md)** - Create bots
- **[Skills System](docs/HYBRID-PI-INTEGRATION.md#-available-pi-skills)** - 17 official skills
- **[Moonshot Provider](docs/moonshot-provider.md)** - 97% cost savings
- **[MCP Integration](docs/mcp-integration.md)** - Connect 100+ services
- **[RoundTable](docs/roundtable-system.md)** - Multi-agent deliberation
- **[Voice System](docs/VOICE-TO-VOICE-SYSTEM.md)** - Voice conversations
- **[Security](SECURITY.md)** - 7-layer security
- **[K8s Deployment](docs/agentops-k8s-deployment.md)** - Production deploy

---

## 🛠️ Development

### **Project Structure**

```
opencell/
├── src/
│   ├── bot-factory/           # Bot creation and management
│   │   ├── types.ts           # Bot types (Agent, Conversational)
│   │   ├── executor.ts        # Bot creation logic
│   │   ├── bot-runtime.ts     # Bot execution engine
│   │   ├── pi-awareness-prompt.ts  # Pi self-awareness system
│   │   └── pi-skills-loader.ts     # Skills auto-discovery
│   ├── llm/                   # LLM providers
│   │   ├── claude.ts          # Claude API
│   │   ├── moonshot-provider.ts    # Moonshot API
│   │   ├── openai-provider.ts      # OpenAI API
│   │   ├── gemini-provider.ts      # Gemini API
│   │   ├── pi-provider-enhanced.ts # Pi integration
│   │   └── hybrid-dispatcher.ts    # Smart routing
│   ├── handlers/              # Platform handlers
│   │   ├── discord.ts
│   │   ├── slack.ts
│   │   └── telegram.ts
│   ├── tools/                 # Agent tools
│   ├── observability/         # Monitoring
│   └── core/                  # Core utilities
├── infra/                     # Infrastructure
│   ├── helm/                  # Helm charts
│   ├── cloudflare-tunnel/     # Tunnel configs
│   └── docker/
├── docs/                      # Documentation
└── examples/                  # Code examples
```

### **Adding a New Provider**

```typescript
// src/llm/my-provider.ts

import { LLMProvider, LLMMessage, LLMResponse } from './interface';

export class MyProvider implements LLMProvider {
  name = 'my-provider';
  
  async generate(messages: LLMMessage[]): Promise<LLMResponse> {
    // Your implementation
  }
}

// src/llm/index.ts
export { MyProvider } from './my-provider';
```

### **Creating a Custom Skill**

```markdown
<!-- ~/.pi/agent/skills/my-skills/custom-skill/SKILL.md -->

# Custom Skill

Description: My custom skill for X

Triggers: keyword1, keyword2

## Usage:

1. Detect trigger keywords
2. Use custom tool:
   \`\`\`bash
   custom_tool --param value
   \`\`\`
3. Process results
```

Bot auto-discovers and uses it!

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md)

### **Areas for Contribution:**

- 🤖 New bot templates
- 🔧 Additional tools/skills
- 🌐 New platform integrations
- 📚 Documentation improvements
- 🧪 Test coverage
- 🎨 UI/UX enhancements

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

---

## 🙏 Credits

**Built with:**
- [Pi Coding Agent](https://github.com/mariozechner/pi-coding-agent) by @mariozechner
- [Anthropic Claude](https://anthropic.com)
- [Moonshot AI](https://moonshot.cn)
- [OpenAI](https://openai.com)
- [Google Gemini](https://ai.google.dev)

**Inspired by:**
- OpenClaw-Security (security patterns)
- AgentOps (observability)
- MCP (Model Context Protocol)

---

## 📞 Support

- **Documentation:** [docs/](docs/)
- **Issues:** [GitHub Issues](https://github.com/cloudwalk/opencell/issues)
- **Discussions:** [GitHub Discussions](https://github.com/cloudwalk/opencell/discussions)
- **Discord:** [Join our server](https://discord.gg/opencell)

---

<div align="center">

**OpenCell** - Your own AI agent army, your infrastructure, your rules.

Made with ❤️ by the community

[⭐ Star on GitHub](https://github.com/cloudwalk/opencell) • [📖 Read the Docs](docs/) • [🚀 Deploy Now](QUICK_START_PI_BOTS.md)

</div>
