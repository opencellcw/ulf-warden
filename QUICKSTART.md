# ⚡ OpenCell - Quick Start (30 Seconds!)

Get your AI bot running in **30 SECONDS** with our ultra-UX setup wizard!

**NEW in v2:**
- 🚀 Quick Start Templates (choose & done!)
- 🔍 Auto-Detection (remembers your config)
- ✅ Smart Validation (real-time API key checks)
- 📋 Interactive Preview (see before you commit)
- 💰 Cost Calculator (know your expenses)
- 🎉 Beautiful UX (colors, progress bars, celebration!)

---

## 🚀 One-Command Setup

```bash
git clone https://github.com/cloudwalk/opencell.git
cd opencell
npm install
npm run setup
```

That's it! The wizard handles everything:
- ✅ Platform selection (Discord/Slack/Telegram)
- ✅ AI provider configuration
- ✅ Optional features (image gen, search, voice)
- ✅ Deployment method (10+ options)
- ✅ Automatic file generation

---

## 🎯 What You Get

### **Multi-Platform Bot** 🤖
- Discord, Slack, or Telegram (or all!)
- Slash commands, reactions, voice
- Thread support, DMs, groups

### **AI Powered** 🧠
- Claude Opus 4 (best quality)
- Moonshot (cheapest, $0.50/Mtok)
- OpenAI GPT-4
- Gemini 2.5
- Hybrid mode (auto-routes to cheapest)

### **Advanced Features** 🎨
- Image generation (Replicate)
- Web search (Brave)
- Voice/TTS (ElevenLabs + Groq)
- Pi agent powers (bash, kubectl, files)

### **Enterprise Ready** 🏢
- Redis caching
- OpenTelemetry tracing
- Cost monitoring
- Auto-scaling ready

---

## 📋 Setup Flow

### **Step 1: Choose Platform** 📱
```
1. Discord only
2. Slack only
3. Telegram only
4. All platforms
5. Skip (manual)
```

### **Step 2: Select AI Provider** 🤖
```
1. Claude (best, $15/Mtok) ⭐
2. Moonshot (cheapest, $0.50/Mtok)
3. OpenAI ($10/Mtok)
4. Gemini ($1.25/Mtok)
5. Hybrid (auto-route)
```

### **Step 3: Optional Features** 🎨
```
• Image Generation? (y/N)
• Web Search? (y/N)
• Voice/TTS? (y/N)
• Agent Powers (Pi)? (y/N)
```

### **Step 4: Deployment** 🚀
```
💻 LOCAL:
1. Local (npm start)
2. Docker Compose

☁️ CLOUD (Easy):
3. Render ($7/mo) ⭐
4. Railway ($5/mo)
5. Fly.io (FREE)
6. Heroku ($7/mo)
7. DigitalOcean ($5/mo)

🏢 CLOUD (Advanced):
8. AWS ECS
9. Azure Container Apps
10. GKE
```

---

## 🎮 Example: Discord Bot in 3 Steps

### **1. Run Setup:**
```bash
npm run setup
```

**Wizard dialogue:**
```
Choose platform: 1 (Discord)
Discord Bot Token: [paste from discord.com/developers]

Choose AI provider: 1 (Claude)
Claude API Key: [paste from console.anthropic.com]

Image Generation? n
Web Search? n
Voice? n
Pi Powers? n

Deployment: 1 (Local)

✅ Setup complete!
```

### **2. Start Bot:**
```bash
npm start
```

### **3. Test on Discord:**
```
@bot hello
→ Bot: "Hello! I'm powered by Claude. How can I help?"
```

**Done!** 🎉

---

## 💰 Cost Examples

### **Small Bot (100 msgs/day)**
- **Moonshot:** ~$0.10/day = $3/month
- **Claude:** ~$2/day = $60/month
- **Hybrid:** ~$0.50/day = $15/month ⭐

### **Medium Bot (1000 msgs/day)**
- **Moonshot:** ~$1/day = $30/month
- **Claude:** ~$20/day = $600/month
- **Hybrid:** ~$5/day = $150/month ⭐

**Hybrid mode = 75% savings!**

---

## 🔧 Reconfigure Anytime

```bash
npm run setup
```

Wizard runs again, updates `.env` automatically!

---

## 🆘 Troubleshooting

### Bot not starting?
```bash
# Check .env file exists
ls -la .env

# Check logs
npm start 2>&1 | tee bot.log
```

### Can't connect to platform?
1. Verify token in `.env`
2. Check bot permissions on platform
3. Restart bot: `npm start`

### Want to change AI provider?
```bash
npm run setup
# Just re-select provider, keeps other settings
```

---

## 📚 Next Steps

### **Explore Features:**
- [Full README](README.md) - Complete documentation
- [Deployment Guide](docs/DEPLOY_GUIDE.md) - All deployment options
- [API Keys](docs/API_KEYS_MANAGEMENT.md) - Managing secrets

### **Deploy to Cloud:**
```bash
npm run setup
# Choose Render, Railway, or Fly.io
# Follow wizard instructions
```

### **Enable Advanced Features:**
```bash
npm run setup
# Say "yes" to Image Gen, Search, Voice, Pi
# Add required API keys
```

---

## 🎯 Why OpenCell?

### **vs ClawdBot:**
- ✅ Plug-and-play setup (just as easy!)
- ✅ Multiple AI providers (not just Claude)
- ✅ Cost optimization (hybrid routing)
- ✅ More platforms (Discord + Slack + Telegram)
- ✅ Agent powers (Pi integration)
- ✅ Open source (self-hosted)

### **vs Building from Scratch:**
- ✅ 3-minute setup (not hours)
- ✅ Production-ready (caching, tracing, monitoring)
- ✅ Multi-platform (one bot, all platforms)
- ✅ Cost-optimized (hybrid routing built-in)
- ✅ Extensible (add your own features)

---

## 🎉 That's It!

You now have a production-ready AI bot!

**Commands to remember:**
```bash
npm run setup    # Configure/reconfigure
npm start        # Start bot locally
npm run build    # Build for production
npm test         # Run tests
```

**Questions?**
- 📖 Read [README.md](README.md)
- 🚀 Check [DEPLOY_GUIDE.md](docs/DEPLOY_GUIDE.md)
- 💬 Open an issue on GitHub

---

**Happy bot building!** 🤖🚀
