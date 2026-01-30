# Changelog - Ulfberht-Warden Evolution

## Version 2.1.0 - Local LLM Integration (2026-01-30)

This update adds **dual-model architecture** with intelligent routing between Claude API and local models.

### 🎯 New Features

#### Local LLM Support
- **Dual-model architecture** - Claude API (primary) + Local models (secondary)
- **Intelligent router** - Automatically selects best model for each task
- **4 routing strategies**:
  - `claude_only` - Always use Claude (default, backward compatible)
  - `hybrid` - Smart routing (simple tasks local, complex Claude)
  - `local_fallback` - Try local first, fallback to Claude
  - `local_only` - Always use local model
- **CPU inference** - Uses transformers.js (ONNX Runtime)
- **3 supported models**:
  - LaMini-Flan-T5-783M (~1.5GB) - Default, fastest
  - TinyLlama-1.1B (~2GB) - Better quality
  - Phi-2 (~5GB) - Best quality
- **Cost savings** - 50-70% reduction with hybrid strategy
- **Automatic fallback** - Graceful degradation on errors
- **Model caching** - Downloads once, cached for future use

#### New Modules
- `src/llm/interface.ts` - Unified LLM interface
- `src/llm/claude.ts` - Claude provider wrapper
- `src/llm/local.ts` - Local model provider (transformers.js)
- `src/llm/router.ts` - Intelligent routing logic
- `src/llm/index.ts` - Public exports

#### Enhanced Modules
- `src/chat.ts` - Now uses router for model selection
- `src/agent.ts` - Integrated with router (still uses Claude for tools)
- `src/config.ts` - Added `getLLMConfig()` helper

#### Setup & Documentation
- `scripts/setup-local-llm.sh` - Automated setup script
- `docs/LOCAL_LLM.md` - Complete feature guide (50+ sections)
- `LOCAL_LLM_SUMMARY.md` - Implementation summary
- Updated `SETUP.md` with local LLM instructions

### 🎮 Usage

**Enable hybrid mode** (recommended):
```env
LLM_STRATEGY=hybrid
LOCAL_LLM_ENABLED=true
```

**Run setup**:
```bash
./scripts/setup-local-llm.sh
```

**Behavior**:
- Simple greetings → Local model
- Complex tasks → Claude API
- Tool use → Always Claude
- Automatic routing

### 💰 Cost Impact

- **Claude only**: $3-15 per 1M input tokens (baseline)
- **Hybrid**: 50-70% cost reduction (estimated)
- **Local fallback**: 70-90% cost reduction (estimated)

### 📊 Performance

- **Claude**: <1 second response time
- **Local (small)**: 1-3 seconds
- **Local (medium)**: 2-5 seconds
- **Local (large)**: 3-8 seconds

### 🔧 Resource Requirements

| Strategy | RAM | Disk | Render Plan |
|----------|-----|------|-------------|
| Claude only | 512MB | 1GB | Free |
| Hybrid (small) | 2GB | 3GB | Starter |
| Hybrid (large) | 4GB | 6GB | Standard |

### ✅ Backward Compatibility

**100% backward compatible**:
- Default behavior unchanged (Claude only)
- Local LLM is opt-in
- No breaking changes
- Existing deployments work without modifications

### 📝 Notes

- Local models don't support tool use (always routes to Claude)
- Model downloaded on first use (~1.5GB for default)
- Requires Render Starter plan for hybrid mode
- CPU inference only (GPU support planned)

---

## Version 2.0.0 - Agency Evolution (2026-01-30)

This major update transforms Ulfberht-Warden from a basic chatbot into a daemon-like assistant with real agency capabilities.

### 🎯 Major Features

#### Phase 1: Memory Persistence
- **SQLite Database Layer** (`src/persistence/database.ts`)
  - Persistent storage for sessions, memories, and tool executions
  - WAL mode for better concurrency
  - Automatic table creation and migrations
  - Fallback to JSON files if database fails

- **Persistence Layer** (`src/persistence/index.ts`)
  - Unified interface for all persistence operations
  - Session management with auto-recovery
  - Memory storage and search
  - Tool execution audit trail

- **Daily Logs System** (`src/persistence/daily-logs.ts`)
  - Automatic creation of `workspace/memory/YYYY-MM-DD.md` files
  - Logs conversations, tool executions, learnings, and errors
  - Timestamped entries for easy tracking

- **Memory Curation** (`src/persistence/memory-curator.ts`)
  - Automatic curation every 10 conversations
  - Uses Claude to extract insights from daily logs
  - Updates `workspace/MEMORY.md` with curated content
  - Learns user preferences and patterns

- **Enhanced SessionManager** (`src/sessions.ts`)
  - Sessions survive container restarts
  - Auto-loads from database on startup
  - Async operations for better performance
  - Integration with daily logs and memory curation

#### Phase 2: State Management
- **Workspace Updates** (`src/workspace.ts`)
  - `updateMemory()` - Dynamically update MEMORY.md
  - `commitToGit()` - Optional git auto-commit
  - `saveState()` - Save workspace state on shutdown

- **Graceful Shutdown** (`src/index.ts`)
  - SIGTERM/SIGINT handlers
  - Flushes all sessions to database
  - Closes connections cleanly
  - Zero data loss on restart

- **Auto-Recovery**
  - Detects incomplete tool executions
  - Loads all sessions from database
  - Recovers from crashes automatically

#### Phase 3: Enhanced Integrations
- **GitHub CLI Tools** (`src/tools/github.ts`)
  - `github_clone` - Clone repositories
  - `github_search` - Search repos, code, issues, PRs
  - `github_issue` - Create/view/list issues
  - `github_pr` - Create/view/list pull requests

- **Web Scraping** (`src/tools/web.ts`)
  - `web_fetch` - Fetch and parse webpages
  - `web_extract` - Extract structured data with CSS selectors
  - Timeout and size limits for safety

- **Enhanced File Operations** (`src/tools/files.ts`)
  - `file_search` - Search files with glob patterns and content
  - `file_diff` - Show differences between files or git versions
  - `file_backup` - Create backups of files/directories

- **Process Management** (`src/tools/process.ts`)
  - `process_start` - Start and monitor processes
  - `process_list` - List all managed processes
  - `process_stop` - Stop processes gracefully or forcefully
  - `process_restart` - Restart managed processes
  - `process_logs` - View process logs
  - Auto-restart on failure (optional)

#### Phase 4: Agency Tools
- **Structured Logging** (`src/logger.ts`)
  - Winston-based logging system
  - Console + file outputs
  - Log rotation (5MB per file, 5 files)
  - Structured metadata
  - Separate error logs

- **Daemon Manager** (`src/daemon.ts`)
  - Monitor managed processes
  - Health checks for services
  - Auto-restart capabilities
  - Graceful shutdown of all processes

- **Config Manager** (`src/config.ts`)
  - Load from .env files
  - Override with database values
  - Hot reload support
  - Sensitive key protection

### 🛠️ Infrastructure Changes

#### Dockerfile
- Added GitHub CLI installation
- Created `/data` directory for persistence
- Added `/data/logs` for structured logs
- Environment variables for data directories
- Volume mount for persistent storage

#### Render Configuration
- Updated `render.yaml` with persistent disk
- 1GB disk mounted at `/data`
- Starter plan ($7/month)
- Environment variables configured

#### Dependencies Added
- `better-sqlite3` - SQLite database
- `winston` - Structured logging
- `axios` - HTTP requests
- `cheerio` - HTML parsing
- `glob` - File pattern matching

### 📊 Data Structure

#### Database Schema
```sql
sessions (userId, messages, createdAt, lastActivity)
memories (id, date, content, type, tags, createdAt)
tool_executions (id, userId, toolName, input, output, timestamp, status, errorMessage)
config (key, value, updatedAt)
```

#### File Structure
```
/data/
├── ulf.db              # SQLite database
├── logs/               # Structured logs
│   ├── error.log
│   └── ulf.log
└── fallback/           # JSON backups
    ├── sessions.json
    └── memories.json

workspace/
├── memory/             # Daily logs
│   ├── 2026-01-30.md
│   └── .gitkeep
├── SOUL.md
├── IDENTITY.md
├── MEMORY.md           # Auto-updated
└── AGENTS.md
```

### 🔧 Breaking Changes
- `SessionManager.addMessage()` is now async (must use `await`)
- `SessionManager.getHistory()` is now async (must use `await`)
- `SessionManager.clear()` is now async (must use `await`)
- All handlers updated to use async session methods

### 🚀 Migration Guide

1. **Update Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Add to your `.env`:
   ```
   DATA_DIR=./data
   LOGS_DIR=./data/logs
   ```

3. **Database Initialization**
   Database is automatically created on first run at `./data/ulf.db`

4. **Render Deployment**
   - Ensure you're on Starter plan or higher
   - Persistent disk will be automatically provisioned
   - Data survives across deployments

### ✅ Success Criteria
- ✅ Sessions survive container restarts
- ✅ MEMORY.md updated automatically
- ✅ Daily logs created in `workspace/memory/`
- ✅ GitHub CLI integration works
- ✅ Web scraping works
- ✅ Process management with auto-restart
- ✅ Structured logging in `/data/logs/`
- ✅ Graceful shutdown without data loss
- ✅ Auto-recovery after crashes

### 📝 Notes
- First deployment will create database and directory structure
- Memory curation happens every 10 conversations
- Daily logs are created automatically at midnight
- Process auto-restart can be enabled per process
- All tool executions are logged to database

### 🔮 Future Enhancements
- PostgreSQL support for multi-instance deployments
- Real-time log streaming via WebSocket
- Enhanced health checks with alerting
- Memory search API
- Process metrics and monitoring dashboard
