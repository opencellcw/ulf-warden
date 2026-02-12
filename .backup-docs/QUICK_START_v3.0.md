# 🚀 Quick Start - OpenCell v3.0

## Get Started in 5 Minutes!

---

## ✅ Prerequisites

```bash
# Check Node.js version
node --version  # Must be 20+

# Check if you have a K8s cluster (optional, for production)
kubectl cluster-info

# Check if Docker is running (for local)
docker ps
```

---

## 🔥 3-Step Setup

### **Step 1: Clone and Install**

```bash
git clone https://github.com/cloudwalk/opencell.git
cd opencell
npm install
```

### **Step 2: Configure Environment**

```bash
cp .env.example .env
```

**Edit `.env` with your API keys:**

```bash
# REQUIRED: At least 1 LLM provider
ANTHROPIC_API_KEY=sk-ant-your-key-here

# RECOMMENDED: For cost optimization
MOONSHOT_API_KEY=sk-your-moonshot-key

# OPTIONAL: Additional providers
OPENAI_API_KEY=sk-your-openai-key
GEMINI_API_KEY=your-gemini-key

# REQUIRED: At least 1 platform
DISCORD_BOT_TOKEN=your-discord-token
# or
SLACK_BOT_TOKEN=xoxb-your-slack-token

# RECOMMENDED: Enable Pi for agent powers
ENABLE_PI=true

# RECOMMENDED: Hybrid routing for cost savings
DEFAULT_PROVIDER=moonshot
DAILY_BUDGET=10.00
```

### **Step 3: Run!**

```bash
# Build
npm run build

# Run
npm start

# Or development mode
npm run dev
```

**Bot is now live! 🎉**

---

## 🤖 Create Your First Bot

### **Option 1: Simple Conversational Bot**

Send this in Discord/Slack:

```
@Ulf create bot support
  personality: You are a friendly customer support agent who helps users with questions about our products
```

**Bot deploys in ~30 seconds!**

**Use it:**
```
@support How do I reset my password?
@support What are your pricing tiers?
```

---

### **Option 2: Agent Bot with Pi Powers**

```
@Ulf create agent bot devops
  personality: You are a Kubernetes expert who helps debug issues and deploy applications
  tools: bash, kubectl, read, write
```

**Bot has FULL POWERS!**

**Use it:**
```
@devops check if pods are healthy
@devops analyze logs from guardian pod
@devops deploy new version with 2GB memory
```

---

## 🎓 Test Skills

### **Brave Search Skill:**

```
@devops search for kubernetes best practices 2026
```

Bot will:
1. Detect "search" trigger
2. Load brave-search skill
3. Execute search
4. Return results

---

### **YouTube Transcript Skill:**

```
@devops get transcript from this video: https://youtube.com/watch?v=xxx
```

Bot will:
1. Detect "youtube" trigger
2. Load youtube-transcript skill
3. Fetch transcript
4. Summarize content

---

## 💰 Monitor Costs

### **Check Dispatcher Stats:**

```typescript
// In your code or console

import { createHybridDispatcher } from './src/llm/hybrid-dispatcher';

const dispatcher = createHybridDispatcher();
const stats = dispatcher.getStats();

console.log(`
  Daily Cost: $${stats.dailyCost.toFixed(2)}
  Budget: $${stats.config.budget.dailyBudget}
  Remaining: $${(stats.config.budget.dailyBudget - stats.dailyCost).toFixed(2)}
`);
```

---

## 📊 Check Which Provider Was Used

Look at logs:

```bash
# Bot logs show routing decisions
[Hybrid Dispatcher] Routing decision {
  complexity: "SIMPLE",
  selectedProvider: "moonshot",
  cost: "$0.0001"
}

[Hybrid Dispatcher] Routing decision {
  complexity: "TOOL_USE",
  selectedProvider: "pi-enhanced",
  cost: "$0.08"
}
```

---

## 🔧 Advanced Configuration

### **Enable All Providers (Maximum Power):**

```bash
# .env

# All 4 providers
ANTHROPIC_API_KEY=sk-ant-xxx
MOONSHOT_API_KEY=sk-xxx
OPENAI_API_KEY=sk-xxx
GEMINI_API_KEY=AIza-xxx

# Pi configuration
ENABLE_PI=true
PI_PROVIDER=anthropic  # or moonshot, openai

# Hybrid routing
DEFAULT_PROVIDER=moonshot
DAILY_BUDGET=20.00
MAX_COST_PER_MESSAGE=1.00

# Budget protection
# If daily cost exceeds $20, auto-switch to Moonshot only
```

---

### **Custom Routing Triggers:**

```typescript
// src/bot-factory/executor.ts

import { createHybridDispatcher, HybridConfig } from '../llm/hybrid-dispatcher';

const config: HybridConfig = {
  defaultProvider: 'moonshot',
  enablePi: true,
  
  piConfig: {
    allowedTools: ['bash', 'kubectl', 'read', 'write'],
    botId: 'my-bot'
  },
  
  routing: {
    // Custom Pi triggers (tool use)
    piTriggers: [
      /deploy/i,
      /kubectl/i,
      /analyze.*log/i,
      /fix.*bug/i
    ],
    
    // Custom Claude triggers (complex reasoning)
    claudeTriggers: [
      /architecture/i,
      /design.*system/i,
      /explain.*detailed/i
    ]
  },
  
  budget: {
    maxCostPerMessage: 0.50,
    dailyBudget: 10.00
  }
};

const dispatcher = new HybridDispatcher(config);
```

---

## 🐛 Troubleshooting

### **Pi Not Working?**

```bash
# Check if Pi is installed
which pi

# If not found, install:
npm install -g @mariozechner/pi-coding-agent

# Check version
pi --version

# Test Pi
echo "Hello Pi!" | pi --headless
```

---

### **Bot Not Using Skills?**

```bash
# Check if skills directory exists
ls ~/.pi/agent/skills/

# If empty, clone skills:
git clone https://github.com/anthropics/anthropic-skills ~/.pi/agent/skills/anthropic-skills
git clone https://github.com/mariozechner/pi-skills ~/.pi/agent/skills/pi-skills

# Restart bot
npm start
```

---

### **High Costs?**

```bash
# Check logs for provider usage
grep "selectedProvider" logs/app.log

# If too much Claude/Pi:
# 1. Lower budget in .env
DAILY_BUDGET=5.00

# 2. Force Moonshot for more tasks
DEFAULT_PROVIDER=moonshot

# 3. Add more triggers for Moonshot
# (edit hybrid-dispatcher.ts)
```

---

## 📖 Next Steps

### **Learn More:**

1. Read [README.md](README.md) - Complete feature overview
2. Read [Pi Integration Guide](docs/HYBRID-PI-INTEGRATION.md) - Full Pi + Skills
3. Read [Integration Complete](INTEGRATION_COMPLETE.md) - Technical details
4. Check [Changelog](CHANGELOG_v3.0.md) - What's new

### **Experiment:**

```bash
# Create different bot types
@Ulf create bot analyst
  personality: You are a data analyst

@Ulf create agent bot security
  personality: You scan for vulnerabilities
  tools: bash, read

@Ulf create agent bot db-admin
  personality: You manage databases
  tools: bash, kubectl

# Test skills
@devops search for docker security best practices
@devops get YouTube transcript from <url>
@devops check calendar for today (if gccli configured)

# Test multi-step tasks
@devops analyze error logs, find the issue, and suggest a fix
```

---

## 🎯 Production Deployment

### **Deploy to Kubernetes:**

```bash
# Build Docker image
docker build -t opencell:v3.0 .

# Push to registry
docker tag opencell:v3.0 gcr.io/your-project/opencell:v3.0
docker push gcr.io/your-project/opencell:v3.0

# Deploy with Helm
helm install opencell ./infra/helm/coordinator \
  --namespace opencell \
  --create-namespace \
  --set image.tag=v3.0 \
  --set env.ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  --set env.MOONSHOT_API_KEY=$MOONSHOT_API_KEY \
  --set env.ENABLE_PI=true

# Check deployment
kubectl get pods -n opencell
```

---

## 🔐 Security Checklist

Before production:

- [ ] Rotate all API keys
- [ ] Set up proper RBAC in K8s
- [ ] Configure tool whitelisting per bot
- [ ] Enable audit logging
- [ ] Set budget limits
- [ ] Review skill safety levels
- [ ] Test failover scenarios
- [ ] Set up monitoring/alerting

---

## 💡 Pro Tips

### **Cost Optimization:**

```bash
# Let 90% of queries go to Moonshot (cheap)
DEFAULT_PROVIDER=moonshot

# Only use Pi when explicitly needed
# (triggers: deploy, kubectl, analyze, etc)

# Monitor daily:
grep "Daily Cost" logs/app.log
```

### **Performance Optimization:**

```bash
# Enable caching (already default)
REDIS_URL=redis://localhost:6379

# Use CDN for static assets
# Use streaming for long responses
```

### **Skill Mastery:**

```bash
# List all available skills
ls ~/.pi/agent/skills/*/

# Read a skill to understand it
cat ~/.pi/agent/skills/pi-skills/brave-search/SKILL.md

# Test skill directly with Pi
echo "search for kubernetes" | pi --headless

# Encourage bot to use skills by using trigger words:
# "search", "transcribe", "youtube", "calendar", etc
```

---

## 🎉 You're All Set!

**OpenCell v3.0 is now running with:**

✅ Pi agent powers  
✅ 17 official skills  
✅ 4 LLM providers  
✅ Hybrid cost optimization  
✅ Production-ready setup  

**Start building your AI agent army! 🚀**

---

**Need Help?**

- 📖 [Full Documentation](README.md)
- 🐛 [GitHub Issues](https://github.com/cloudwalk/opencell/issues)
- 💬 [Discussions](https://github.com/cloudwalk/opencell/discussions)
- 📧 Email: support@opencell.ai (if configured)

**Happy coding!** 🔥
