# CAPABILITIES.md

**Última atualização:** 12 Fevereiro 2026  
**Versão:** 2.0

## O que o Ulf pode fazer com as tools de execução

Ulf tem acesso total ao sistema onde ele roda. Pode executar comandos, criar arquivos, gerenciar processos.

**Ferramentas:** 55+ tools integradas  
**Modelo Principal:** Claude Opus 4 com Smart Router  
**Plataformas:** Discord, Slack, Telegram, WhatsApp  
**Features v2.0:** Decision Intelligence, Scheduler/Cron, Bot Factory, Self-Improvement

---

## Tecnologias Suportadas

### Backend
- **Python**: Flask, FastAPI, Django, Tornado
- **Node.js**: Express, Fastify, NestJS, Koa
- **Go**: Gin, Echo, Fiber
- **Rust**: Actix, Rocket, Axum
- **Ruby**: Rails, Sinatra
- **PHP**: Laravel, Symfony

### Frontend
- **React**: Create React App, Next.js, Vite
- **Vue**: Vue CLI, Nuxt.js
- **Angular**: Angular CLI
- **Svelte**: SvelteKit
- **HTML/CSS/JS**: Vanilla, Tailwind, Bootstrap

### Databases
- **SQL**: PostgreSQL, MySQL, SQLite
- **NoSQL**: MongoDB, Redis, CouchDB
- **ORMs**: SQLAlchemy, Prisma, TypeORM, Sequelize

### DevOps
- **Containers**: Docker, Docker Compose
- **Process managers**: PM2, Supervisor, systemd
- **Web servers**: Nginx, Apache
- **Proxies**: Caddy, Traefik

### Languages
- Python, JavaScript/TypeScript, Go, Rust, Ruby, PHP, Java, C/C++, Elixir, Clojure

---

## Exemplos de Uso

### 🎨 Gerar Imagem
```
User: @Ulf gera uma imagem de um gato astronauta

Ulf vai:
1. Usar replicate_generate_image ou openai_generate_image
2. Retornar URL da imagem gerada
3. Mostrar preview no Discord
```

### 🎬 Gerar Vídeo
```
User: @Ulf cria um vídeo de ondas na praia

Ulf vai:
1. Usar replicate_generate_video
2. Retornar URL do vídeo (MP4)
3. Mostrar preview no Discord
```

### 🎤 Texto para Fala
```
User: @Ulf converte "olá mundo" para áudio

Ulf vai:
1. Usar elevenlabs_text_to_speech
2. Retornar URL do áudio (MP3)
3. Enviar arquivo no Discord
```

### Criar API Node.js + Express
```
User: @Ulf cria uma API REST em Node.js com Express

Ulf vai:
1. npm install express
2. Criar server.js com rotas
3. npm start em background
4. Responder com URL e endpoints
```

### Deploy de React App
```
User: @Ulf sobe um React app com Vite

Ulf vai:
1. npm create vite@latest meu-app -- --template react
2. cd meu-app && npm install
3. npm run dev em background
4. Responder com URL de dev
```

### API Go com Gin
```
User: @Ulf cria uma API em Go com Gin

Ulf vai:
1. go mod init api
2. go get github.com/gin-gonic/gin
3. Criar main.go com rotas
4. go run main.go em background
5. Responder com URL
```

### Setup PostgreSQL + Python
```
User: @Ulf configura PostgreSQL com SQLAlchemy

Ulf vai:
1. Instalar psycopg2, sqlalchemy
2. Criar database.py com engine
3. Criar models.py com tabelas
4. Inicializar DB
5. Mostrar conexão string
```

### Docker Container
```
User: @Ulf sobe um container Redis

Ulf vai:
1. docker pull redis
2. docker run redis em background
3. Verificar container rodando
4. Responder com host:port
```

### Static Site com Nginx
```
User: @Ulf serve este HTML com nginx

Ulf vai:
1. Instalar nginx
2. Configurar /etc/nginx/sites-available/
3. Copiar HTML para /var/www/
4. Iniciar nginx
5. Responder com URL
```

---

## 🚀 Features v2.0 (NOVAS!)

### 🧠 Decision Intelligence System
**Comando:** `!decide [pergunta]`

Análise multi-perspectiva usando 5 agentes especializados:
- 📊 Strategic Analyst (data-driven)
- 💡 Creative Strategist (innovative)
- ⚠️ Critical Skeptic (risk-focused)
- 🔨 Pragmatic Executor (practical)
- 🎯 Ethical Advisor (values-driven)

**Exemplo:**
```
!decide Should I migrate to microservices or keep monolith?

Resultado:
✅ Consenso com 5 perspectivas diferentes
✅ Confidence score (0-100)
✅ Top prós, contras e riscos
✅ Perguntas críticas
✅ Alternativas sugeridas

Custo: ~$0.20 por análise
```

### 📅 Scheduler/Cron System
**Multi-plataforma:** Discord, Slack, Telegram (auto-detect)

**Formatos:**
- Tempo relativo: "in 30 minutes", "in 2 hours"
- Cron expressions: "0 9 * * *", "*/5 * * * *"

**Exemplos:**
```
Me lembra em 30 minutos de revisar PR
→ One-time task

Me avisa todo dia às 9h sobre standup
→ Recurring task (0 9 * * *)

Lista minhas tasks
→ Ver todas tasks agendadas

Cancela task [ID]
→ Remover task
```

**Features:**
- ✅ SQLite persistence (sobrevive restarts)
- ✅ Thread support (Discord threads, Slack thread_ts, Telegram replies)
- ✅ Auto-pause one-time tasks após execução
- ✅ Last run tracking

### 🏭 Bot Factory
**Comando:** `!create-bot [nome] [persona]`

Cria novos bots com personas customizadas em runtime.

**Exemplo:**
```
!create-bot CodeReviewer "Expert in code review, strict but helpful"

Resultado:
✅ Bot criado com persona customizada
✅ Isolated runtime
✅ System prompt configurável
✅ Todos os tools disponíveis
```

**Gerenciamento:**
```
!list-bots        → Ver todos bots
!delete-bot [nome] → Remover bot
```

### 🎯 Smart Router (Cost Optimization)
**AI-powered LLM selection** para cada tarefa.

**Routing inteligente:**
- 80% tarefas simples → Gemini 2.5 Flash ($0.15/Mtok)
- 10% tarefas médias → Gemini 2.5 Pro ($2/Mtok)
- 8% tarefas complexas → Claude 3.7 Sonnet ($3/Mtok)
- 2% tarefas críticas → Claude Opus 4 ($15/Mtok)

**Economia:** 90-99% vs usar só Claude Opus ($450/mês → $37/mês para 10M tokens)

---

## Capacidades Gerais

### 💰 Cryptocurrency Prices (IMPORTANTE!)
**Tool:** `get_crypto_price`

**⚠️ CRITICAL:** SEMPRE usar esta tool para preços de criptomoedas!
- ❌ NUNCA usar training data (desatualizado 45-60 dias!)
- ✅ SEMPRE chamar get_crypto_price quando perguntado sobre BTC, ETH, SOL, etc

**Features:**
- Multi-source validation (CoinGecko, Binance, Kraken)
- Divergence detection (alerta se fontes discordam >2%)
- Suporta todas principais cryptos e moedas fiat (USD, EUR, BRL)
- Real-time prices com timestamps

**Exemplo:**
```
User: Qual o preço do Bitcoin?
Bot: [chama get_crypto_price tool]
→ Retorna ~$67,050 USD com breakdown de 3 fontes
```

### 🎨 Multimodal/Media Generation
**Replicate:**
- Gerar imagens com IA (Flux, SDXL, Stable Diffusion)
- Gerar vídeos a partir de texto ou animar imagens
- Upscale de imagens (2x, 4x, 8x)
- Remover fundos de imagens
- Rodar qualquer modelo do Replicate

**ElevenLabs:**
- Converter texto para fala (9+ vozes)
- Listar vozes disponíveis
- Obter informações de vozes

**OpenAI:**
- Gerar imagens com DALL-E 2/3
- Usar GPT-4 para tarefas especializadas
- Transcrever áudio com Whisper
- Analisar imagens com GPT-4 Vision

### File Operations
- Criar/editar qualquer arquivo (código, config, HTML, JSON, etc)
- Ler arquivos existentes
- Listar diretórios
- Mover/copiar/deletar arquivos (via shell)

### Process Management
- Iniciar processos em background
- Verificar processos rodando
- Matar processos (via PID)
- Monitorar recursos (CPU, RAM)

### Package Management
- **Python**: pip, poetry, conda
- **Node.js**: npm, yarn, pnpm
- **Go**: go get, go mod
- **Rust**: cargo
- **System**: apt, yum, apk

### Network
- Curl/wget para APIs
- Verificar portas abertas
- Test de conectividade
- Proxy/tunneling

### Git Operations
- Clone repos
- Commit changes
- Push/pull
- Branch management

---

## Deploy Stack Atual

### Google Kubernetes Engine (GKE)
- **Plataforma**: GKE (Google Cloud)
- **Container**: Docker com Node.js/TypeScript
- **Região**: us-central1-a
- **Orquestração**: Kubernetes com Helm charts
- **Networking**: Cloudflare Tunnel (outbound-only, bypasses firewall)
- **Public URL**: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com
  - ⚠️ **IMPORTANTE**: NUNCA usar localhost/IPs em links externos!
- **Storage**: Persistent Volume (5GB) - filesystem é PERSISTENTE
- **Database**: SQLite em /data/ulf.db (persistente entre restarts)
- **Cache**: Redis (redis-master.agents.svc.cluster.local:6379)
- **Secrets**: Google Secret Manager (via CSI Driver)
- **Autoscaling**: HPA configurado (1-3 replicas baseado em CPU)
- **Recursos**:
  - Requests: 512Mi RAM, 250m CPU
  - Limits: 2Gi RAM, 1000m CPU

### Plataformas Conectadas
- **Slack**: ✅ Conectado via Socket Mode
- **Discord**: Token configurado (pronto para ativar)
- **Telegram**: Token configurado (pronto para ativar)

## Limitações

### Kubernetes Container
- Comandos shell disponíveis (bash, curl, git, npm, etc)
- Sem acesso a alguns comandos privilegiados (systemctl, iptables)
- Processos devem rodar dentro do container

### Timeout
- Comandos limitados a 30 segundos
- Processos longos devem rodar em background

### Segurança
- Secrets são gerenciados pelo Google Secret Manager
- Output é truncado se muito grande
- Filesystem /data é persistente, resto é read-only

---

## Boas Práticas

### Background Processes
Use `&` no final para rodar em background:
```bash
uvicorn main:app --port 8000 &
npm start &
go run main.go &
```

### Múltiplos Serviços
Cada serviço em porta diferente:
```
API Python: 8000
Frontend React: 3000
API Go: 8080
Redis: 6379
```

### Verificar Status
```
User: @Ulf mostra o que tá rodando

Ulf usa get_processes() e mostra todos os serviços ativos
```

### Logs
```
User: @Ulf mostra os logs do servidor

Ulf usa read_file() em logs ou tail -f
```

---

## Features Implementadas (v2.0)

- [x] Persistência de projetos (✅ PersistentVolume no GKE)
- [x] Deploy automatizado (✅ Cloud Build + Helm)
- [x] Scheduled tasks (✅ Cron System multi-plataforma)
- [x] Decision Intelligence (✅ Multi-perspectiva com 5 agentes)
- [x] Bot Factory (✅ Criar bots em runtime)
- [x] Smart Router (✅ AI-powered LLM selection)
- [x] Self-Improvement (✅ Propor melhorias + auto-deploy)
- [x] Cloudflare Tunnel (✅ Bypass GCP firewall)
- [x] Observability (✅ AgentOps integration)
- [x] Discord handler (✅ Ativo)
- [x] Slack handler (✅ Ativo)
- [x] Telegram handler (✅ Ativo)
- [x] WhatsApp handler (✅ Ativo)

## Próximas Features (v2.1+)

- [ ] Learning loop (Agent Lightning integration)
- [ ] Skills library (reusable code)
- [ ] Auto-rollback (health monitoring)
- [ ] Canary deployments
- [ ] Web dashboard
- [ ] Voice-to-voice
- [ ] Multi-region deploy

---

---

## 📊 Resumo de Capacidades

**Tools:** 55+ integradas  
**Plataformas:** Discord, Slack, Telegram, WhatsApp (4/4 ativas)  
**LLMs:** Claude Opus 4, Gemini 2.5 Flash/Pro, Moonshot Kimi K2.5  
**Custo:** $110-190/mês (92% economia com Smart Router)  
**Networking:** Cloudflare Tunnel (bypass firewall)  
**Features v2.0:** Decision Intelligence, Scheduler, Bot Factory, Self-Improvement

**Ulf é um agente AI autônomo multi-plataforma com:**
- 🧠 Capacidade de análise multi-perspectiva
- 📅 Agendamento autônomo de tarefas
- 🏭 Criação de novos bots em runtime
- 🔧 Self-improvement com auto-deploy
- 💰 Otimização inteligente de custos
- 🌐 Acesso via Cloudflare Tunnel 24/7

**Pode fazer praticamente qualquer coisa que você faria localmente, e mais!** ⚔️
