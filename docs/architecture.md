# Repository Structure

Clean, organized structure following OpenClaw patterns.

## Overview

```
opencellcw/
├── 📄 Root Documentation
│   ├── README.md           # Main documentation
│   ├── CONTRIBUTING.md     # Development guidelines
│   ├── CHANGELOG.md        # Version history
│   └── LICENSE             # MIT License
│
├── 📚 docs/                # Detailed documentation
│   ├── GKE_QUICKSTART.md  # GKE deployment guide
│   ├── GKE_SECRETS.md     # Secret Manager setup
│   ├── SCHEDULER_USAGE.md # Task automation
│   ├── SECURITY_COMPREHENSIVE.md # Security reference
│   └── SELF_IMPROVEMENT.md # Learning system
│
├── 🤖 src/                 # Core application
│   ├── handlers/          # Platform handlers (Slack, Discord, Telegram)
│   ├── tools/             # Tool implementations
│   ├── learning/          # Self-improvement system
│   ├── security/          # Security systems
│   ├── agent.ts           # Main agent logic
│   ├── chat.ts            # Claude API integration
│   └── sessions.ts        # Session management
│
├── 💰 cost-auditor/        # Cost monitoring system
│   ├── backend/
│   │   ├── main.py        # FastAPI server
│   │   ├── models.py      # Database models
│   │   ├── requirements.txt
│   │   └── collectors/    # API cost collectors
│   └── README.md
│
├── 🔒 auditor/             # Security scanner
│   ├── src/
│   │   ├── main.py        # Scanner entry point
│   │   ├── scanner.py     # Filesystem/process scanner
│   │   ├── patterns.py    # Security patterns (50+)
│   │   └── discord_reporter.py
│   ├── k8s/
│   │   └── cronjob.yaml   # Kubernetes CronJob
│   ├── deploy.sh          # Deployment script
│   ├── requirements.txt
│   └── README.md
│
├── 🏗️ infra/               # Infrastructure as Code
│   └── helm/
│       └── agent/         # Helm chart for GKE
│           ├── templates/
│           ├── values.yaml
│           └── Chart.yaml
│
├── 🧠 workspace/           # Agent personality & memory
│   ├── SOUL.md            # Core personality
│   ├── IDENTITY.md        # Agent identity
│   ├── CAPABILITIES.md    # Tool capabilities
│   ├── MEMORY.md          # Accumulated knowledge (auto-managed)
│   └── AGENTS.md          # Multi-agent patterns
│
├── 🔧 scripts/             # Deployment & utilities
│   ├── gke-deploy.sh      # One-command GKE deployment
│   ├── gke-setup-secrets.sh # Secret Manager setup
│   ├── install-git-hooks.sh # Git hooks installer
│   ├── migrate-v2.sh      # Version migration
│   └── sync-secrets.sh    # Secret synchronization
│
└── ⚙️ .github/
    └── workflows/
        └── security-audit.yml # Pre-commit security checks
```

## File Count

- **Documentation**: 15 .md files
- **Source code**: ~70 TypeScript files
- **Python modules**: ~15 files (auditor + cost-auditor)
- **Infrastructure**: ~10 Helm templates + manifests
- **Total**: ~130 files (excluding node_modules, dist, .git)

## Key Principles

1. **Clear Separation** - Each subsystem has its own directory
2. **Documentation Hub** - All docs in `docs/` with README hub
3. **Workspace Pattern** - Personality files in dedicated `workspace/`
4. **Infrastructure as Code** - All deployment configs in `infra/`
5. **OpenClaw-like** - Professional structure, easy navigation

## Documentation Strategy

### Root Level
- **README.md** - Comprehensive overview, quick start, features
- **CONTRIBUTING.md** - Development workflow and guidelines
- **CHANGELOG.md** - Version history and notable changes

### Docs Directory
- **Deployment** - GKE_QUICKSTART.md, GKE_SECRETS.md
- **Features** - SCHEDULER_USAGE.md, SELF_IMPROVEMENT.md
- **Security** - SECURITY_COMPREHENSIVE.md

### Subsystems
- **auditor/README.md** - Security scanner documentation
- **cost-auditor/README.md** - Cost monitoring documentation

### Workspace
- Personality and behavior configuration (not documentation)
- Auto-managed by the learning system (MEMORY.md)

## Navigation

From README:
- Quick Start → Installation and basic setup
- Features → What the system can do
- Documentation → Links to all detailed guides
- Deploy → Step-by-step deployment instructions

From any doc:
- Clear section headers
- Links back to main README
- Related doc references

## Maintenance

To keep repository clean:
1. ✅ No duplicate documentation
2. ✅ Remove obsolete files immediately
3. ✅ Consolidate related information
4. ✅ Use `docs/` for detailed guides
5. ✅ Keep root minimal (README, CONTRIBUTING, CHANGELOG)

---

**Structure Version**: 2.0
**Last Updated**: 2026-02-02
