# 🤖 OpenCell Terminal Agent - Your Personal AI Assistant

Run a powerful AI agent directly in your terminal! Cross-platform (Windows, Mac, Linux).

---

## ✨ Features

### **🆓 Start Free with Ollama**
- Runs 100% local on your machine
- No API keys needed
- Offline capable
- Privacy-first (data never leaves your PC)

### **🔓 Unlock Premium Models**
- Start with Ollama (free)
- Add Claude when you need power
- Add Moonshot for cheap scale
- Add OpenAI for variety
- Add Gemini for speed

### **🎯 Agent Capabilities**
- ✅ Read/write files
- ✅ Execute commands
- ✅ Search the web
- ✅ Code generation & debugging
- ✅ Multi-step tasks
- ✅ Context memory
- ✅ Project awareness

### **💻 Cross-Platform**
- Windows (PowerShell, CMD)
- Mac (zsh, bash)
- Linux (bash, sh, fish)

---

## 🚀 Quick Start

### **1. Install**

```bash
npm install -g opencell-agent
```

Or run locally:
```bash
cd cli-agent
npm install
npm link
```

### **2. Initialize**

```bash
ocell init
```

This will:
- Set up Ollama (or help you install it)
- Create config directory
- Download a default model (llama3 or mistral)

### **3. Start Chatting**

```bash
ocell chat
```

Or one-shot:
```bash
ocell "create a Python script to analyze CSV files"
```

---

## 📊 Provider Tiers

### **Tier 0: Ollama (Free)** 🆓
```
Models: llama3, mistral, codellama, phi3
Cost: $0
Speed: Fast (local)
Quality: Good
Privacy: 100% (offline)

Great for:
- Learning
- Coding help
- Quick questions
- Privacy-sensitive work
```

### **Tier 1: Moonshot ($0.50/Mtok)** 💰
```
Models: moonshot-v1-8k, kimi
Cost: ~$3/month (100 chats/day)
Speed: Very fast
Quality: Great

Great for:
- High volume
- Production use
- Cost-conscious
```

### **Tier 2: Claude ($15/Mtok)** 🧠
```
Models: claude-opus-4, claude-sonnet
Cost: ~$60/month (100 chats/day)
Speed: Medium
Quality: Excellent

Great for:
- Complex reasoning
- Code generation
- Research
```

### **Tier 3: OpenAI ($10/Mtok)** 🤖
```
Models: gpt-4, gpt-4-turbo
Cost: ~$30/month (100 chats/day)
Speed: Fast
Quality: Excellent

Great for:
- Variety
- Specific GPT features
```

### **Tier 4: Gemini ($1.25/Mtok)** ⚡
```
Models: gemini-2.5-flash, gemini-pro
Cost: ~$12/month (100 chats/day)
Speed: Very fast
Quality: Great

Great for:
- Fast inference
- Google ecosystem
```

---

## 🎮 Usage

### **Interactive Mode**

```bash
ocell chat
# or
ocell
```

Starts an interactive session:
```
╔═══════════════════════════════════════╗
║   🤖 OpenCell Terminal Agent          ║
║   Using: Ollama (llama3)              ║
╚═══════════════════════════════════════╝

You: Create a Python function to sort files by extension

Agent: I'll create that for you...

[Agent creates file, shows code, asks if you want to run it]

You: yes, run it

[Agent executes, shows results]
```

### **One-Shot Commands**

```bash
# Quick questions
ocell "what's the git command to undo last commit?"

# File operations
ocell "read todos.txt and summarize"

# Code generation
ocell "create a React component for a todo list"

# Multi-step
ocell "analyze all .js files, find unused functions, create a report"
```

### **With Specific Model**

```bash
# Use Claude for complex task
ocell --provider claude "refactor this entire codebase to use TypeScript"

# Use Ollama for quick question
ocell --provider ollama "what does this error mean?"

# Use Moonshot for cheap bulk
ocell --provider moonshot "translate these 50 files to Portuguese"
```

---

## 🔓 Unlocking Providers

### **Start Free (Ollama)**

```bash
ocell init
# Automatically sets up Ollama
# Downloads llama3 (4GB)
```

### **Add Claude**

```bash
ocell unlock claude

# Prompts for API key
# Tests connection
# Saves encrypted locally
```

### **Add Moonshot**

```bash
ocell unlock moonshot
```

### **View Status**

```bash
ocell providers

╔═══════════════════════════════════════╗
║   🔓 Unlocked Providers               ║
╚═══════════════════════════════════════╝

✅ Ollama (llama3, mistral)
   Status: Active
   Cost: $0
   
✅ Claude (opus-4)
   Status: Active
   Cost: $60/month (est)
   Credit: $15 remaining
   
🔒 Moonshot
   Status: Locked
   Cost: $3/month (est)
   Unlock: ocell unlock moonshot
```

---

## 💡 Advanced Usage

### **Project Context**

```bash
# Agent learns your project
ocell learn

# Uses project context
ocell "add error handling to all API calls"
```

### **Memory**

```bash
# Agent remembers conversation
ocell "what did we discuss yesterday?"

# Clear memory
ocell forget
```

### **Tools**

```bash
# Search web
ocell search "latest React 19 features"

# Execute code
ocell run script.py

# Git operations
ocell git "commit all changes with meaningful message"
```

### **Aliases**

```bash
# Create shortcuts
ocell alias code "create a"
ocell alias fix "debug and fix"
ocell alias doc "write documentation for"

# Use them
ocell code "Python API client"
ocell fix "login.js"
ocell doc "api.ts"
```

---

## 🎨 UI Modes

### **Rich Mode (Default)**
Beautiful terminal UI with colors, boxes, progress bars

### **Simple Mode**
Plain text for piping/scripting
```bash
ocell --simple "list all TODO items" > todos.txt
```

### **JSON Mode**
Machine-readable output
```bash
ocell --json "analyze code quality" | jq '.score'
```

---

## 📁 File Structure

```
~/.opencell/
  ├── config.json         # Configuration
  ├── providers.json      # Encrypted API keys
  ├── memory.db          # Conversation history (SQLite)
  ├── cache/             # Response cache
  └── models/            # Ollama models
```

---

## 🔒 Security

- API keys encrypted with system keychain
- Local-only storage (no cloud)
- Audit log for all commands
- Permission system for sensitive operations

---

## ⚙️ Configuration

```bash
# Set default provider
ocell config set provider ollama

# Set model
ocell config set model llama3

# Enable/disable features
ocell config set tools.web_search true
ocell config set tools.file_write true
ocell config set tools.code_exec false

# View config
ocell config list
```

---

## 🚀 Examples

### **Coding Assistant**

```bash
# Generate boilerplate
ocell "create Express API with auth, CRUD for users, TypeScript"

# Debug
ocell "why is app.js throwing TypeError on line 42?"

# Refactor
ocell "refactor components/ to use hooks instead of class components"

# Review
ocell "code review src/ and suggest improvements"
```

### **DevOps**

```bash
# Docker
ocell "create Dockerfile for this Node.js app with multi-stage build"

# K8s
ocell "generate Kubernetes deployment for this service"

# Scripts
ocell "write bash script to backup database and upload to S3"
```

### **Data Analysis**

```bash
# CSV
ocell "analyze sales.csv and create visualization"

# Logs
ocell "parse nginx.log, find errors, create report"

# JSON
ocell "read all package.json files, list outdated dependencies"
```

### **Documentation**

```bash
# README
ocell "generate comprehensive README.md for this project"

# API docs
ocell "create OpenAPI spec from Express routes"

# Comments
ocell "add JSDoc comments to all functions in src/"
```

---

## 🎯 Workflow Examples

### **New Project Setup**

```bash
# Initialize project
ocell "create new React + TypeScript project with Vite"

# Add features
ocell "add authentication with JWT"
ocell "add state management with Zustand"
ocell "add routing with React Router"

# Setup DevOps
ocell "create Docker setup with docker-compose"
ocell "add GitHub Actions CI/CD"

# Documentation
ocell "generate project documentation"
```

### **Daily Development**

```bash
# Morning standup
ocell "summarize git commits from yesterday"

# Code review
ocell "review PR #123 from GitHub"

# Bug fixing
ocell "find and fix all TypeScript errors"

# End of day
ocell "generate commit message for staged changes"
ocell "update CHANGELOG.md with today's changes"
```

---

## 🔧 Troubleshooting

### **Ollama not found**

```bash
# Install Ollama
# Mac:
brew install ollama

# Linux:
curl -fsSL https://ollama.com/install.sh | sh

# Windows:
# Download from ollama.com

# Start Ollama
ollama serve
```

### **Model download failed**

```bash
# Manually download
ollama pull llama3

# Or use smaller model
ocell config set model phi3
```

### **Permission denied**

```bash
# Enable file operations
ocell config set tools.file_write true

# Or use sudo (not recommended)
sudo ocell "system operation"
```

---

## 🌟 Tips & Tricks

### **1. Use Ollama for Everything First**
- It's free and fast
- Good enough for 80% of tasks
- Only use paid models when you need power

### **2. Combine with Unix Tools**
```bash
ocell "list TODO items" | grep urgent
ocell "generate test data" | jq . > data.json
```

### **3. Create Aliases for Common Tasks**
```bash
ocell alias todo "read TODO.md and show next 3 tasks"
ocell alias commit "generate commit message"
ocell alias review "code review and suggest fixes"
```

### **4. Use Project Context**
```bash
# Let agent learn your project once
ocell learn

# Then it knows your codebase
ocell "add error handling to API client"
```

### **5. Switch Providers Based on Task**
```bash
# Simple tasks: Ollama (free)
ocell "format this JSON"

# Medium tasks: Moonshot (cheap)
ocell --provider moonshot "refactor this component"

# Complex tasks: Claude (powerful)
ocell --provider claude "architect this microservice"
```

---

## 📊 Cost Comparison

100 commands/day, 30 days/month:

```
Ollama only:     $0/month
+ Moonshot:      $3/month  (most commands)
+ Claude:        $60/month (complex only)
+ OpenAI:        $30/month (variety)
+ Gemini:        $12/month (fast queries)

Smart hybrid:    $10-20/month
  - Ollama: 60% of commands (free)
  - Moonshot: 30% (bulk work)
  - Claude: 10% (complex reasoning)
```

**Recommendation:** Start with Ollama, add Moonshot when you need cloud, add Claude for complex tasks.

---

## 🤝 Contributing

```bash
git clone https://github.com/cloudwalk/opencell.git
cd cli-agent
npm install
npm run dev
```

---

## 📚 Related

- **OpenCell Bot Platform** - Discord/Slack/Telegram bots
- **Pi Coding Agent** - The original terminal agent (this is inspired by it!)
- **Ollama** - Local LLM runtime

---

## 📄 License

MIT

---

**Your personal AI assistant in the terminal!** 🤖✨

Start free with Ollama, scale when you need!
