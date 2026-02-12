# TOOLS.md

Configurações locais, IDs importantes, e notas sobre ferramentas disponíveis.

---

## Discord

### Servidores e Canais

**IDs Importantes:**
- Discord ID do Lucas (owner): `375567912706416642`
- *(Adicione IDs de servidores/canais conforme necessário)*

### Listen Channels
Canais onde o bot ouve sem precisar ser mencionado:
- Configurado via `DISCORD_LISTEN_CHANNELS` (comma-separated)
- Bot responde automaticamente nesses canais
- Ainda usa logic de reação/NO_REPLY

### Comportamento
- **Guild (servidor):** Só responde se mencionado (@ulf) ou em listen channel
- **DM:** Sempre responde (após verificar identidade)
- **Threads:** Entende contexto da thread

---

## Ferramentas Disponíveis

### 🔧 System Tools
- `execute_shell` - Executar comandos (npm, pip, docker, curl, etc)
- `get_processes` - Listar processos rodando
- `process_*` - Gerenciar processos em background

### 📁 File Tools
- `read_file` - Ler arquivos
- `write_file` - Criar/atualizar arquivos
- `list_directory` - Explorar filesystem
- `file_search` - Buscar arquivos por padrão (glob)
- `file_diff` - Diff entre arquivos
- `file_backup` - Backup de arquivos

### 🌐 Web Tools
- `web_fetch` - Fetch conteúdo de páginas
- `web_extract` - Extrair dados com CSS selectors
- `brave_web_search` - Busca geral (Brave API)
- `brave_news_search` - Busca de notícias (Brave API)

### 💰 Cryptocurrency Tools
- `get_crypto_price` - Get real-time cryptocurrency prices

**⚠️ CRITICAL: ALWAYS use get_crypto_price for cryptocurrency prices!**
- ❌ NEVER use your training data for crypto prices (outdated by 45-60 days)
- ✅ ALWAYS call get_crypto_price when asked about BTC, ETH, SOL, or any crypto price
- ✅ Tool validates prices across 3 sources (CoinGecko, CoinCap, Binance)
- ✅ Returns real-time prices with multi-source validation
- ✅ Supports all major cryptocurrencies and fiat currencies (USD, EUR, BRL)

**Example:**
```
User: "What's the Bitcoin price?"
❌ Wrong: Use training data → Says $104k (OUTDATED!)
✅ Correct: Call get_crypto_price({symbol: "btc", currency: "usd"}) → Returns ~$67k (CURRENT!)
```

### 🎭 Browser Automation (Playwright)
- `browser_navigate` - Navegar para URLs
- `browser_screenshot` - Tirar screenshots
- `browser_get_content` - Extrair HTML/texto
- `browser_click` - Clicar em elementos
- `browser_fill_form` - Preencher formulários
- `browser_execute_js` - Executar JavaScript
- `browser_wait_for` - Aguardar elementos
- `browser_close` - Fechar sessão

### 🐙 GitHub Tools
- `github_clone` - Clonar repositórios
- `github_search` - Buscar código/repos
- `github_issue` - Gerenciar issues
- `github_pr` - Gerenciar pull requests

### 🎨 Multimodal (Imagens, Vídeos, Áudio)

**Replicate (5 tools):**
- `replicate_generate_image` - Gerar imagens (Flux, SDXL, Stable Diffusion)
- `replicate_generate_video` - Gerar vídeos ou animar imagens
- `replicate_run_model` - Executar qualquer modelo Replicate
- `replicate_upscale_image` - AI upscaling (2x, 4x, 8x)
- `replicate_remove_background` - Remover fundo de imagens

**OpenAI (4 tools):**
- `openai_generate_image` - DALL-E 2/3
- `openai_gpt_chat` - GPT-4 para tarefas especializadas
- `openai_transcribe_audio` - Whisper (áudio → texto)
- `openai_analyze_image` - GPT-4 Vision (análise de imagens)

**ElevenLabs (3 tools):**
- `elevenlabs_text_to_speech` - TTS com 9+ vozes
- `elevenlabs_list_voices` - Listar vozes disponíveis
- `elevenlabs_get_voice_info` - Detalhes de uma voz

---

## APIs e Tokens

### Claude (Anthropic)
- **Modelo:** claude-sonnet-4-20250514
- **Max tokens:** 200k (com context compaction at 150k)
- **Uso:** Agent principal (com tools)

### OpenAI
- **Modelos:** GPT-4, DALL-E 3, Whisper
- **Uso:** Tarefas especializadas, imagens, transcrição

### ElevenLabs
- **Uso:** Text-to-speech
- **Vozes:** Rachel, Adam, Domi, etc

### Replicate
- **Uso:** Geração de imagens/vídeos
- **Modelos:** Flux, SDXL, Stable Diffusion, etc

### Brave Search
- **Uso:** Web search (privado, sem tracking)
- **Free tier:** 2k queries/mês
- **Cost:** $0.25 por 1k queries (20x mais barato que Google)

---

## Infraestrutura

### Google Cloud (GKE)
- **Cluster:** ulf-cluster
- **Namespace:** agents
- **Deployment:** ulf-warden-agent
- **Pods:** 1 replica (scalable)

### Redis
- **Service:** redis-master.agents.svc.cluster.local:6379
- **Uso:** Cache, rate limiting, queue system

### Database
- **Tipo:** SQLite
- **Path:** /data/ulf.db
- **Persistência:** PVC (ReadWriteOnce)

### Volumes
- `/data` - Persistent data (SQLite, logs, WhatsApp auth)
- `/app/config` - Workspace files (SOUL.md, etc)

---

## Rate Limits

### Tool Rate Limits
- **AI tools** (OpenAI, Replicate): 10/hour (50/hour admin)
- **Web tools** (fetch, search): 20/hour (100/hour admin)
- **API tools** (Brave, GitHub): 60/hour (300/hour admin)
- **File tools**: 120/hour (600/hour admin)
- **Shell tools**: 100/hour (500/hour admin)

### Admin Multiplier
- Owner (Lucas): 5x normal rate limit
- Trusted: 2x normal rate limit

---

## Background Systems

### Session Management
- **Auto-flush:** 60s interval
- **Garbage Collection:** 1h interval, remove sessions >24h old
- **Smart flush:** After 10 messages or 5min idle

### Context Compaction
- **Model max:** 200k tokens
- **Reserved:** 30k tokens (response + tools)
- **Threshold:** 150k tokens (trigger at 88% usage)
- **Strategy:** Summarize old messages, keep last 10

### Queue System
9 queues ativas:
- workflow (5 workers)
- tool_execution (10 workers)
- llm_requests (3 workers)
- notifications (20 workers)
- webhooks (10 workers)
- email (5 workers)
- data_processing (3 workers)
- cache_warmup (2 workers)
- dead_letter (1 worker)

### Cron/Scheduled Tasks
- Gerenciado via `cron-manager`
- Jobs persistidos em database
- Suporta: lembretes, notificações, checks periódicos

---

## Comandos Úteis

### Kubernetes
```bash
# Ver pods
kubectl get pods -n agents

# Logs do Ulf
kubectl logs -n agents -l app=ulf-warden-agent -f

# Restart deployment
kubectl rollout restart deployment/ulf-warden-agent -n agents

# Escalar
kubectl scale deployment ulf-warden-agent --replicas=2 -n agents

# Status do deployment
kubectl rollout status deployment/ulf-warden-agent -n agents
```

### Build & Deploy
```bash
# Build local
npm run build

# Deploy GKE
gcloud builds submit --config cloudbuild.yaml

# Ver builds
gcloud builds list --limit=5
```

### Git
```bash
# Status
git status

# Commit
git add . && git commit -m "message"

# Push
git push origin main
```

---

## Atalhos e Convenções

### Logs
- **Prod logs:** `kubectl logs -n agents -l app=ulf-warden-agent -f`
- **Últimas 50 linhas:** `kubectl logs ... --tail=50`
- **Desde N minutos:** `kubectl logs ... --since=5m`

### Debugging
- **Ver environment vars:** `kubectl exec -n agents POD_NAME -- env`
- **Shell no pod:** `kubectl exec -n agents POD_NAME -it -- /bin/bash`
- **Describe pod:** `kubectl describe pod POD_NAME -n agents`

### Status Rápido
- **Sistema:** "status" ou "ulf status" no Discord
- **Ferramentas:** Ver CAPABILITIES.md
- **Memória:** Ver MEMORY.md e memory/

---

## Notas Importantes

### Security
- Sempre verificar identidade antes de ações sensíveis
- Trust levels em `workspace/memory/contacts.md`
- Blocklist de tools em `src/config/blocked-tools.ts`

### Workspace
- Arquivos em `/app/config/` (SOUL.md, AGENTS.md, etc)
- Carregados no início de cada sessão
- Memória em `memory/` persiste entre sessões

### Media Generation
- Replicate: Melhor pra imagens/vídeos
- OpenAI: DALL-E bom pra ilustrações
- ElevenLabs: TTS natural com vozes variadas

---

## Atualizações Recentes

### 2026-02-09: Evolução Rex
- ✅ Sistema de reações com emoji
- ✅ Suporte a NO_REPLY
- ✅ Sistema de identificação (trust levels)
- ✅ Memória estruturada (daily logs)
- ✅ Context compaction (150k threshold)
- ✅ Brave Search API
- ✅ Playwright browser automation

### Features Ativas
- Reações: `REACT:😂`
- Silêncio: `NO_REPLY`
- Identidade: Trust levels (owner, trusted, known, unknown)
- Memória: Daily logs em `memory/YYYY-MM-DD.md`
- Tools: 55 tools disponíveis (Brave Search, Playwright, etc)

---

**Última atualização:** 2026-02-09
**Mantenha este arquivo atualizado** conforme adicionar novos IDs, configs, ou descobrir novas convenções.

---

## 🚀 Advanced Tools

Para documentação completa de 29 ferramentas avançadas, consulte:

📄 **[TOOLS-ADVANCED.md](./TOOLS-ADVANCED.md)** (21 KB)

### Categorias Disponíveis:

#### 📅 Scheduler (4 tools)
- `schedule_task` - Agendar tarefas com cron/tempo relativo
- `cancel_scheduled_task` - Cancelar tasks
- `list_scheduled_tasks` - Listar tasks ativas
- Multi-plataforma: Discord, Slack, Telegram

#### 🤖 Bot Factory (4 tools)  
- `create_bot` - Criar bots dinamicamente no K8s
- `delete_bot` - Remover bots
- `list_bots` - Listar bots ativos
- `get_bot_status` - Status detalhado
- Tipos: Conversational ou Agent

#### 🎨 Replicate Registry (4 tools)
- `search_replicate_models` - Busca semântica de models
- `get_replicate_model_info` - Info detalhada
- `list_top_replicate_models` - Top por popularidade
- `sync_replicate_models` - Sync manual
- Auto-learning com usage tracking

#### ⚙️ Process Management (5 tools)
- `process_start` - Iniciar processo em background
- `process_stop` - Parar processo
- `process_restart` - Reiniciar processo
- `process_list` - Listar processos
- `process_logs` - Ver logs
- Auto-restart e monitoring

#### 🧠 Memory (2 tools)
- `memory_search` - Busca vetorial de memórias
- `memory_recall` - Recuperar memória específica
- Semantic search com OpenAI embeddings

#### 🛠️ Utilities (7 tools)
- `send_email` - Gmail integration
- `send_slack_message` - Slack direto
- `youtube_video_clone` - Download YouTube
- `scan_repo_secrets` - Security scan
- `secure_repo` - Repo hardening
- `deploy_public_app` - Deploy to Vercel/CF Pages
- `delete_public_app`, `list_public_apps`

**Total:** 66 tools implementados  
**Documentados:** 37 (este arquivo) + 29 (TOOLS-ADVANCED.md)

---

**Última atualização:** 2026-02-12  
**Versão:** 2.5  
**Mantenha ambos os arquivos atualizados** conforme adicionar novos tools ou descobrir novas convenções.
