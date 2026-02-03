# Welcome to OpenCell

OpenCell is CloudWalk's **open-source multi-agent AI platform** for deploying your own AI assistants on Kubernetes.

## 🎯 What is OpenCell?

OpenCell provides everything you need to build, deploy, and manage AI agents that work across **Slack, Discord, Telegram, and WhatsApp**.

### Key Features

- 🤖 **Multi-Platform Support** - One codebase, multiple channels
- ☁️ **Cloud-Native** - Built for Kubernetes (GKE, EKS, AKS)
- 🧠 **Claude Sonnet 4.5** - Powered by Anthropic's latest model
- 🔧 **Bot Factory** - Create new bots via conversation
- 🔐 **Enterprise Security** - Self-defense, secrets management, audit logs
- 📊 **Self-Improvement** - Agents can propose and apply their own improvements

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/cloudwalk/opencell.git
cd opencell

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Deploy to GKE
./scripts/gke-deploy.sh
```

## 📚 Documentation Structure

- **Getting Started** - Installation and basic setup
- **Platforms** - Configure Slack, Discord, Telegram, WhatsApp
- **Features** - Bot Factory, Self-Improvement, Scheduler
- **Deployment** - GKE, secrets, monitoring
- **Security** - Best practices and policies

## 💬 Community

- **GitHub:** [cloudwalk/opencell](https://github.com/cloudwalk/opencell)
- **Discord:** [Join our community](https://discord.gg/47ZYQzHX)
- **Email:** lucas@cloudwalk.io

## 📖 Next Steps

Start with the [GKE Quick Start](GKE_QUICKSTART.md) to deploy your first agent!
