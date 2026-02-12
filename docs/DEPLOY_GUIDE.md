# 🚀 OpenCell Deployment Guide

Complete guide for deploying OpenCell on any platform.

---

## 🎯 Quick Start (3 Minutes)

```bash
npm install
npm run setup
```

The interactive wizard will guide you through:
1. Choose platform (Discord/Slack/Telegram)
2. Select AI provider (Claude/Moonshot/OpenAI/Gemini)
3. Optional features (Image gen, Search, Voice, Pi)
4. Deployment method (10+ options)

---

## 💻 Local Development

### Option 1: Direct

```bash
# 1. Install dependencies
npm install

# 2. Configure (interactive)
npm run setup

# 3. Start
npm start
```

### Option 2: Docker Compose

```bash
# 1. Setup (generates docker-compose.yml)
npm run setup
# Choose "Docker Compose" in deployment step

# 2. Start
docker-compose up -d

# 3. View logs
docker-compose logs -f opencell

# 4. Stop
docker-compose down
```

**Includes:**
- Redis (caching)
- Persistent volumes
- Auto-restart

---

## ☁️ Cloud Platforms (Easy)

### 🎨 Render ($7/mo) ⭐ RECOMMENDED

**Why Render:**
- ✅ Auto-deploy from Git
- ✅ Free SSL
- ✅ Easy environment variables
- ✅ Persistent disk included
- ✅ One-click rollback

**Setup:**

1. **Run setup wizard:**
```bash
npm run setup
# Choose "Render" in deployment step
```

2. **Push to GitHub:**
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

3. **Deploy on Render:**
- Go to https://render.com
- Click "New" → "Blueprint"
- Connect your GitHub repo
- Render auto-detects `render.yaml`
- Add environment variables in dashboard:
  - `ANTHROPIC_API_KEY`
  - `DISCORD_BOT_TOKEN`
  - etc.
- Click "Apply"

4. **Auto-deploy:**
Every git push deploys automatically!

**Cost:** $7/month (Starter)  
**Deploy time:** 3-5 minutes  
**Difficulty:** ⭐ Easy

---

### 🚂 Railway ($5/mo)

**Why Railway:**
- ✅ Super simple UI
- ✅ GitHub integration
- ✅ Auto-scaling
- ✅ Great developer experience

**Setup:**

1. **Run setup wizard:**
```bash
npm run setup
# Choose "Railway" in deployment step
```

2. **Deploy:**
- Go to https://railway.app
- Click "New Project" → "Deploy from GitHub"
- Select your repo
- Railway auto-detects Dockerfile
- Add environment variables in "Variables" tab
- Deploy!

**Cost:** $5/month  
**Deploy time:** 2-3 minutes  
**Difficulty:** ⭐ Very Easy

---

### ✈️ Fly.io (Free Tier Available)

**Why Fly.io:**
- ✅ Free tier (3 VMs)
- ✅ Global edge deployment
- ✅ Fast CLI
- ✅ Easy scaling

**Setup:**

1. **Install flyctl:**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Run setup wizard:**
```bash
npm run setup
# Choose "Fly.io" in deployment step
```

3. **Login and launch:**
```bash
fly auth login
fly launch
```

4. **Set secrets:**
```bash
fly secrets set ANTHROPIC_API_KEY=sk-ant-xxx
fly secrets set DISCORD_BOT_TOKEN=xxx
```

5. **Deploy:**
```bash
fly deploy
```

**Cost:** FREE (2GB RAM, 3 VMs)  
**Deploy time:** 5 minutes  
**Difficulty:** ⭐⭐ Easy

---

### 💜 Heroku ($7/mo)

**Why Heroku:**
- ✅ Classic platform
- ✅ Reliable
- ✅ Add-ons ecosystem
- ✅ Simple git-based deploy

**Setup:**

1. **Install Heroku CLI:**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

2. **Run setup wizard:**
```bash
npm run setup
# Choose "Heroku" in deployment step
```

3. **Create app:**
```bash
heroku login
heroku create opencell-bot
heroku stack:set container
```

4. **Set config:**
```bash
heroku config:set ANTHROPIC_API_KEY=sk-ant-xxx
heroku config:set DISCORD_BOT_TOKEN=xxx
```

5. **Deploy:**
```bash
git push heroku main
```

**Cost:** $7/month (Basic)  
**Deploy time:** 5-7 minutes  
**Difficulty:** ⭐⭐ Easy

---

### 🌊 DigitalOcean ($5/mo)

**Why DigitalOcean:**
- ✅ Simple App Platform
- ✅ Full control
- ✅ Good performance
- ✅ Transparent pricing

**Setup:**

1. **Run setup wizard:**
```bash
npm run setup
# Choose "DigitalOcean" in deployment step
```

2. **Deploy:**
- Go to https://cloud.digitalocean.com/apps
- Click "Create App" → "GitHub"
- Select repo and branch
- DigitalOcean detects Dockerfile
- Add environment variables
- Choose $5/mo plan (Basic)
- Launch!

**Cost:** $5/month  
**Deploy time:** 5-7 minutes  
**Difficulty:** ⭐⭐ Easy

---

## 🏢 Cloud Platforms (Advanced)

### ☁️ AWS ECS/Fargate (~$15/mo)

**Why AWS:**
- ✅ Enterprise scale
- ✅ Full AWS ecosystem
- ✅ High availability
- ✅ Advanced networking

**Setup:**

1. **Run setup wizard:**
```bash
npm run setup
# Choose "AWS" in deployment step
```

2. **Create ECR repository:**
```bash
aws ecr create-repository --repository-name opencell
```

3. **Build and push image:**
```bash
docker build -t opencell .
docker tag opencell:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/opencell:latest
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/opencell:latest
```

4. **Create ECS cluster:**
```bash
aws ecs create-cluster --cluster-name opencell
```

5. **Register task definition:**
```bash
aws ecs register-task-definition --cli-input-json file://aws-task-definition.json
```

6. **Create service:**
```bash
aws ecs create-service \
  --cluster opencell \
  --service-name opencell-bot \
  --task-definition opencell-bot \
  --desired-count 1 \
  --launch-type FARGATE
```

**Cost:** ~$15/month (Fargate)  
**Deploy time:** 20-30 minutes  
**Difficulty:** ⭐⭐⭐⭐ Advanced

**Docs:**
- [AWS ECS Guide](https://docs.aws.amazon.com/ecs/)
- [Fargate Pricing](https://aws.amazon.com/fargate/pricing/)

---

### ☁️ Azure Container Apps (~$10/mo)

**Why Azure:**
- ✅ Microsoft stack
- ✅ Serverless containers
- ✅ Auto-scaling
- ✅ Azure integrations

**Setup:**

1. **Install Azure CLI:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

2. **Run setup wizard:**
```bash
npm run setup
# Choose "Azure" in deployment step
```

3. **Login and create resources:**
```bash
az login
az group create --name opencell-rg --location eastus
az acr create --resource-group opencell-rg --name opencellregistry --sku Basic
```

4. **Build and push:**
```bash
az acr build --registry opencellregistry --image opencell:latest .
```

5. **Deploy container app:**
```bash
az containerapp create \
  --resource-group opencell-rg \
  --name opencell-bot \
  --image opencellregistry.azurecr.io/opencell:latest \
  --environment my-environment \
  --ingress external \
  --target-port 3000
```

**Cost:** ~$10/month  
**Deploy time:** 20-30 minutes  
**Difficulty:** ⭐⭐⭐⭐ Advanced

**Docs:**
- [Azure Container Apps](https://azure.microsoft.com/en-us/products/container-apps/)

---

### ☸️ Google Kubernetes Engine (GKE) (~$25/mo)

**Why GKE:**
- ✅ Production-ready
- ✅ Auto-scaling
- ✅ High availability
- ✅ Kubernetes native

**Setup:**

1. **Run setup wizard:**
```bash
npm run setup
# Choose "GKE" in deployment step
```

2. **Build image:**
```bash
npm run build:image
```

3. **Deploy:**
```bash
./scripts/gke-deploy.sh
```

**Cost:** ~$25/month (small cluster)  
**Deploy time:** 15-20 minutes  
**Difficulty:** ⭐⭐⭐⭐ Advanced

**Full Guide:** See [docs/GKE_SETUP.md](./GKE_SETUP.md)

---

## 📊 Comparison Table

| Platform | Cost/mo | Setup Time | Difficulty | Auto-Deploy | Free Tier |
|----------|---------|------------|------------|-------------|-----------|
| **Render** | $7 | 5 min | ⭐ | ✅ | ❌ |
| **Railway** | $5 | 3 min | ⭐ | ✅ | ❌ |
| **Fly.io** | FREE | 5 min | ⭐⭐ | ❌ | ✅ |
| **Heroku** | $7 | 7 min | ⭐⭐ | ✅ | ❌ |
| **DigitalOcean** | $5 | 7 min | ⭐⭐ | ✅ | ❌ |
| **AWS ECS** | $15 | 30 min | ⭐⭐⭐⭐ | ❌ | ✅ (limited) |
| **Azure** | $10 | 30 min | ⭐⭐⭐⭐ | ❌ | ✅ (limited) |
| **GKE** | $25 | 20 min | ⭐⭐⭐⭐ | ❌ | ✅ (limited) |
| **Docker** | $0 | 2 min | ⭐ | ❌ | ✅ |
| **Local** | $0 | 1 min | ⭐ | ❌ | ✅ |

---

## 🎯 Recommendations

### For Quick Testing:
→ **Local** or **Docker Compose**
- Free, instant setup
- Good for development

### For Production (Small):
→ **Render** or **Railway**
- Simple setup
- Auto-deploy from Git
- $5-7/month
- Perfect for small bots

### For Production (Medium):
→ **Fly.io** or **DigitalOcean**
- Free tier (Fly) or $5/mo
- Global deployment
- More control

### For Production (Enterprise):
→ **GKE**, **AWS**, or **Azure**
- Auto-scaling
- High availability
- Enterprise features
- Higher cost but production-grade

---

## 🔧 Environment Variables

All platforms require these environment variables:

### Required:
```bash
# AI Provider (at least 1)
ANTHROPIC_API_KEY=sk-ant-xxx
# or
MOONSHOT_API_KEY=sk-xxx
# or
OPENAI_API_KEY=sk-xxx

# Platform (at least 1)
DISCORD_BOT_TOKEN=xxx
# or
SLACK_BOT_TOKEN=xoxb-xxx
# or
TELEGRAM_BOT_TOKEN=xxx
```

### Optional:
```bash
# Features
REPLICATE_API_TOKEN=r8_xxx      # Image generation
BRAVE_API_KEY=BSA_xxx           # Web search
ELEVENLABS_API_KEY=sk_xxx       # TTS
GROQ_API_KEY=gsk_xxx            # Speech-to-text

# Config
DEFAULT_PROVIDER=moonshot       # Cost optimization
ENABLE_PI=true                  # Agent powers
DAILY_BUDGET=10.00              # Cost protection
```

**Setup Wizard handles all of this automatically!**

---

## 🆘 Troubleshooting

### Bot not connecting?
1. Check environment variables
2. Verify API keys are correct
3. Check platform tokens are valid
4. View logs: `docker-compose logs` or platform-specific logs

### Deploy failing?
1. Run `npm run build` locally first
2. Check Dockerfile syntax
3. Verify all dependencies in package.json
4. Check platform-specific logs

### Out of memory?
1. Increase instance size
2. Disable heavy features (Pi, voice)
3. Use Moonshot provider (lighter)

### High costs?
1. Set `DAILY_BUDGET` limit
2. Use Moonshot as default provider
3. Enable Redis caching
4. Monitor usage in provider dashboard

---

## 📚 Additional Resources

- **Setup Wizard:** `npm run setup`
- **Full README:** [../README.md](../README.md)
- **GKE Guide:** [GKE_SETUP.md](./GKE_SETUP.md)
- **API Keys:** [API_KEYS_MANAGEMENT.md](./API_KEYS_MANAGEMENT.md)
- **Discord Setup:** [DISCORD_GUIDE.md](./DISCORD_GUIDE.md)

---

## 🎉 Success!

Once deployed, your bot will:
- ✅ Connect to your platform(s)
- ✅ Respond to messages
- ✅ Use configured AI provider
- ✅ Have all enabled features

**Test it:**
- Discord: `@bot hello`
- Slack: `@bot hello`
- Telegram: `/start`

---

Need help? Open an issue on GitHub! 🚀
