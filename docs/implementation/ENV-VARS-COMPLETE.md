# ========================================
# Ulf Warden - Complete Environment Variables
# ========================================
# DOCUMENTATION FILE - NOT A REAL .env FILE
# All values here are PLACEHOLDERS/EXAMPLES only!
# This is the COMPLETE list of all env vars used in the codebase.
# Copy to .env and fill in your REAL values.

# ========================================
# CORE SETTINGS
# ========================================
NODE_ENV=production
PORT=3000
DATA_DIR=./data
LOGS_DIR=./data/logs
DATABASE_PATH=./data/ulf.db
DATABASE_URL=sqlite:./data/ulf.db

# ========================================
# LLM PROVIDERS (Primary)
# ========================================

# Anthropic Claude (Primary)
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-opus-4-20250514

# Google Gemini (Cost Optimization)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash-exp

# Moonshot Kimi (Ultra-cheap)
MOONSHOT_API_KEY=sk-...

# OpenAI (GPT-4, DALL-E, Whisper)
OPENAI_API_KEY=sk-...

# ========================================
# LLM ROUTING & OPTIMIZATION
# ========================================
LLM_STRATEGY=smart_router  # Options: claude_only, smart_router, round_robin
DEFAULT_LLM_PROVIDER=anthropic
FALLBACK_LLM_PROVIDER=gemini

# ========================================
# PLATFORM INTEGRATIONS
# ========================================

# Discord
DISCORD_BOT_TOKEN=your-discord-token
DISCORD_CLIENT_ID=your-client-id
DISCORD_ADMIN_USER_IDS=123456789,987654321
DISCORD_LISTEN_CHANNELS=channel-id-1,channel-id-2
DISCORD_ACTIVITY_CHANNEL=channel-id
DISCORD_CHANNEL_ID=default-channel-id

# Slack
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CHANNEL_ID=C...

# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHANNEL_ID=@your-channel

# WhatsApp
WHATSAPP_ENABLED=false

# ========================================
# MEDIA & GENERATION APIS
# ========================================

# Replicate (Image/Video/Audio)
REPLICATE_API_TOKEN=r8_...

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=your-voice-id

# Groq (Whisper STT)
GROQ_API_KEY=gsk_...

# DALL-E (covered by OPENAI_API_KEY)

# ========================================
# SEARCH & WEB
# ========================================

# Brave Search
BRAVE_SEARCH_API_KEY=BSA...

# Playwright (Browser automation)
PLAYWRIGHT_ENABLED=true

# ========================================
# DATABASE & CACHE
# ========================================

# Redis
REDIS_URL=redis://redis-master:6379
REDIS_HOST=redis-master
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=ulf
REDIS_CACHE_ENABLED=true
REDIS_CACHE_TTL=86400

# SQLite
DB_CLIENT=sqlite3
DB_CONNECTION=./data/ulf.db

# ========================================
# OBSERVABILITY & MONITORING
# ========================================

# AgentOps
AGENTOPS_API_KEY=your-agentops-key
AGENTOPS_BASE_URL=https://api.agentops.ai
AGENTOPS_ENABLED=true
AGENTOPS_ENDPOINT=https://api.agentops.ai
AGENTOPS_TAGS=production,ulf-warden

# Langfuse
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
LANGFUSE_HOST=https://cloud.langfuse.com

# Sentry
SENTRY_DSN=https://...@sentry.io/...

# Telemetry
TELEMETRY_ENABLED=false

# Tracing
TRACING_ENABLED=false
JAEGER_ENDPOINT=http://jaeger:14268/api/traces

# ========================================
# TOOLS & FEATURES
# ========================================

# Allowed/Blocked Tools
ALLOWED_TOOLS=
BLOCKED_TOOLS=
ADMIN_ONLY_TOOLS=replicate_generate_image,replicate_generate_video

# Tool Registry
TOOL_REGISTRY_ENABLED=true

# Queue System
QUEUE_ENABLED=true

# Workflow Manager
WORKFLOW_MANAGER_ENABLED=true

# ========================================
# GITHUB INTEGRATION
# ========================================
GITHUB_TOKEN=ghp_...
GITHUB_USERNAME=your-username
GITHUB_REPO=your-repo
GITHUB_OWNER=your-org

# ========================================
# EMAIL (Gmail)
# ========================================
GMAIL_USER=your-email@gmail.com
GMAIL_PASSWORD=your-app-password

# ========================================
# GCP (Google Cloud Platform)
# ========================================
GCP_PROJECT_ID=your-project-id
GCP_REGION=us-central1

# ========================================
# KUBERNETES & DEPLOYMENT
# ========================================
NAMESPACE=agents
DEPLOYMENT_NAME=ulf-warden-agent
PUBLIC_URL=https://your-domain.com

# Dashboard
DASHBOARD_URL=https://dashboard.your-domain.com

# API
API_BASE_URL=https://api.your-domain.com

# ========================================
# SECURITY & SECRETS
# ========================================

# Key Rotation
KEY_ROTATION_ENABLED=true
KEY_ROTATION_DAYS=90
KEY_ROTATION_WARNING_DAYS=7

# Social Engineering Protection
SOCIAL_ENGINEERING_DETECTION=true

# ========================================
# ACTIVITY & IDLE DETECTION
# ========================================
ACTIVITY_IDLE_MINUTES=30
HEARTBEAT_ENABLED=true

# ========================================
# EMBEDDINGS & ML
# ========================================
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_CACHE_ENABLED=true

# ========================================
# CRYPTO PRICES
# ========================================
BINANCE_API_KEY=your-binance-key (optional)
BINANCE_SECRET=your-binance-secret (optional)
# Note: CoinGecko and CoinCap are free, no keys needed

# ========================================
# AUTO-MIGRATION
# ========================================
AUTO_MIGRATE=false

# ========================================
# CLOUDFLARE TUNNEL
# ========================================
TUNNEL_TOKEN=your-cloudflare-tunnel-token

# ========================================
# EXPERIMENTAL FEATURES
# ========================================

# Multi-Agent Systems
ROUNDTABLE_ENABLED=true

# Bot Factory
BOT_FACTORY_ENABLED=true

# Self-Improvement
SELF_IMPROVEMENT_ENABLED=true

# Voice-to-Voice
VOICE_ENABLED=true

# MCP (Model Context Protocol)
MCP_ENABLED=true
MCP_CONFIG_PATH=./mcp.json

# ========================================
# ADMIN CHANNELS
# ========================================
ADMIN_CHANNEL_ID=your-admin-channel-id

# ========================================
# RATE LIMITING
# ========================================
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000

# ========================================
# DEPRECATED (Keep for backward compatibility)
# ========================================
# ANTHROPIC_API_KEY (use above)
# OPENAI_API_KEY (use above)

# ========================================
# END OF FILE
# ========================================
# Total: 118+ environment variables
# Last updated: Feb 12, 2026
