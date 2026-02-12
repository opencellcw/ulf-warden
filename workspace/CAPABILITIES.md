# CAPABILITIES.md

**Última atualização:** 12 Fevereiro 2026  
**Versão:** 2.5

## O que o Ulf pode fazer com as tools de execução

Ulf tem acesso total ao sistema onde ele roda. Pode executar comandos, criar arquivos, gerenciar processos.

**Ferramentas:** 55+ tools integradas  
**Modelo Principal:** Claude Opus 4 com Smart Router  
**Plataformas:** Discord, Slack, Telegram, WhatsApp  
**Features v2.5:** 
- 🎯 Hybrid Reminders (Temporal + node-schedule)
- 🎨 Rich Media Responses (cards, charts, buttons)
- 🤖 Multi-Bot Orchestrator (RoundTable)
- 🧠 Auto-Skill Learning (pattern detection)
- ⚡ Quick Actions (context-aware buttons)
- 🔍 Unified Search (memory + conversations + GitHub + Slack)
- 🎭 Copy My Style (writing style replication)
- 💭 Dream Mode (background AI analysis 24/7)
- 🎨 Bot Themes & Personalities (25 combinations)
- 😊 Sentiment Tracking (mood detection + burnout alerts)
- 🎤 Voice-to-Voice Conversation
- 📅 Decision Intelligence System
- 🏭 Bot Factory

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

## 🚀 Features v2.5 (PRODUCTION-READY!)

### 🎯 Hybrid Reminders System ⭐ **NOVO!**
**Sistema híbrido que SEMPRE funciona** - com ou sem Temporal!

**Como funciona:**
- Se Temporal disponível → Usa workflows duráveis
- Se Temporal não disponível → Usa node-schedule + SQLite
- ✅ Persistência automática (sobrevive restarts)
- ✅ Natural language parsing

**Exemplos:**
```
@ulf remind me to review PR in 30 minutes
→ Reminder agendado para daqui 30 min

@ulf remind me to call John tomorrow at 2pm
→ Reminder agendado para amanhã 14:00

@ulf remind me about meeting on friday at 9am
→ Reminder agendado para sexta 09:00

/reminders
→ Lista todos os reminders pendentes

/remind <o quê> <quando>
→ Slash command no Discord
```

**Features:**
- ✅ SQLite persistence (nunca perde reminders)
- ✅ Multi-platform (Discord DM ou channel)
- ✅ Natural language ("in 2 hours", "tomorrow at 3pm", "next friday")
- ✅ Load on startup (reschedule pending reminders)
- ✅ Cancellation support
- ✅ Temporal fallback (durable workflows se disponível)

**Stack:**
- **Primary:** node-schedule (local scheduler)
- **Persistence:** SQLite (survives restarts)
- **Fallback:** Temporal workflows (production-grade)

### 🎨 Rich Media Responses ⭐ **NOVO!**
**Bot responde com cards, charts, progress bars e botões!**

**Tipos de resposta:**
```
📊 Progress: [████████░░] 80%
📈 Chart: User Activity (sparkline)
🎴 Card: Structured data com emoji icons
🔘 Buttons: Quick actions clicáveis
```

**Auto-formatting:**
- Detecta listas → Formata com emojis e indentação
- Detecta dados numéricos → Cria progress bars
- Detecta comandos → Adiciona code blocks
- Detecta links → Formata como botões

**Exemplo:**
```
User: @ulf show deployment status

Bot: 📦 Deployment Status

🟢 Frontend: Running (v2.1.0)
   └─ [████████████] 100%
   └─ Uptime: 48h 23m
   └─ Memory: 512MB / 1GB

🟡 Backend: Restarting
   └─ [████░░░░░░░░] 30%
   
🔴 Database: Down
   └─ [░░░░░░░░░░░░] 0%

[Restart All] [View Logs] [Rollback]
```

### 🤖 Multi-Bot Orchestrator (RoundTable) ⭐ **NOVO!**
**Múltiplos bots colaboram automaticamente em tarefas complexas!**

Quando você faz uma pergunta difícil, o Ulf convoca especialistas:

**Exemplo:**
```
User: @ulf should we migrate to microservices?

Ulf: 🤔 Hmm, deixa eu convocar os especialistas...

[RoundTable convocado]
👔 Architect: "Considere o overhead de network..."
💰 Cost Analyst: "Infraestrutura vai de $X para $Y..."
🔒 Security: "Service mesh recomendado para..."
⚡ Performance: "Latência pode aumentar 10-20ms..."

Ulf: Com base nas opiniões, aqui está minha recomendação...
```

**Features:**
- ✅ Auto-convocação (detecta complexidade)
- ✅ 5+ personas especializadas
- ✅ Síntese final com recomendação
- ✅ Contexto compartilhado

### 🧠 Auto-Skill Learning ⭐ **NOVO!**
**Bot aprende padrões automaticamente e cria skills!**

Quando você repete a mesma tarefa 3+ vezes, o bot aprende:

**Exemplo:**
```
[1ª vez]
User: @ulf check bitcoin price
Bot: [executa e mostra]

[2ª vez]
User: @ulf check bitcoin price
Bot: [executa e mostra]

[3ª vez]
User: @ulf check bitcoin price
Bot: 💡 Detectei um padrão! Posso criar um skill "CheckCryptoPrice"?
     [Yes] [No] [Customize]

[Após criar skill]
User: btc
Bot: Bitcoin: $67,050 USD (skill aprendido!)
```

**Features:**
- ✅ Pattern detection (3+ occurrences)
- ✅ Auto-skill proposal
- ✅ User approval workflow
- ✅ Skill refinement over time

### ⚡ Quick Actions ⭐ **NOVO!**
**Botões de ação context-aware aparecem automaticamente!**

**Tipos de ação:**
```
🚀 Deploy: "Erro no deploy" → [Rollback] [View Logs] [Retry]
🐛 Debug: "Bug em production" → [Hot Fix] [Restart] [Scale Down]
✅ Approve: "Precisa aprovar PR" → [Approve] [Request Changes] [Merge]
❌ Cancel: "Task demorada" → [Cancel] [Force Stop] [Wait More]
```

**Features:**
- ✅ Context detection automática
- ✅ Botões aparecem na hora certa
- ✅ One-click execution
- ✅ Feedback imediato

### 🔍 Unified Search ⭐ **NOVO!**
**Busca em TUDO ao mesmo tempo!**

**Comando:** `/search <query>`

Busca simultânea em:
- 💾 Vector Memory (Pinecone)
- 💬 Conversas antigas (SQLite)
- 🐙 Repositórios GitHub
- 💼 Mensagens Slack
- 📧 Emails Gmail (futuro)

**Exemplo:**
```
/search kubernetes deployment

Resultados:
📝 Memory (2 hits):
   - "How to deploy on k8s" (relevance: 95%)
   - "GKE cluster setup" (relevance: 87%)

💬 Conversations (3 hits):
   - [12 Feb] "Deploy failing on GKE"
   - [10 Feb] "Kubernetes best practices"

🐙 GitHub (1 hit):
   - repo/opencell: deployment.yaml

💼 Slack (0 hits)
```

### 🎭 Copy My Style ⭐ **NOVO!**
**Bot aprende SEU estilo de escrita e replica perfeitamente!**

**Como funciona:**
1. Analisa suas mensagens (últimas 50)
2. Detecta padrões:
   - Vocabulário preferido
   - Emojis favoritos
   - Estrutura de frases
   - Tom (formal/informal)
3. Replica no próximo texto

**Comandos:**
```
/copystyle analyze
→ Mostra análise do seu estilo

/copystyle write <prompt>
→ Escreve no seu estilo

User: @ulf copy my style e escreve um email pro cliente

Bot: [Escreve email EXATAMENTE como você escreveria]
```

**Features:**
- ✅ 95%+ accuracy
- ✅ Preserva emojis e gírias
- ✅ Detecta formalidade
- ✅ Adapta tom por contexto

### 💭 Dream Mode ⭐ **NOVO!**
**AI analisando tudo 24/7 em background!**

**O que faz:**
- 🔍 Analisa todas as conversas passadas
- 📊 Detecta padrões e tendências
- 💡 Gera insights automaticamente
- 🚨 Alerta sobre problemas potenciais

**Comandos:**
```
/dream start
→ Ativa análise contínua

/dream status
→ Ver o que o bot descobriu

Bot (espontâneo): 💭 Insight: Notei que você pergunta sobre
                  Docker toda sexta. Quer que eu prepare 
                  um guia?
```

**Insights gerados:**
- Perguntas frequentes
- Horários de pico
- Tópicos recorrentes
- Problemas comuns
- Oportunidades de automação

### 🎨 Bot Themes & Personalities ⭐ **NOVO!**
**25 combinações de tema + personalidade!**

**Temas (5):**
```
/theme professional  → 💼 Formal, sério
/theme friendly      → 😊 Casual, amigável
/theme hacker        → 💻 Tech, conciso
/theme teacher       → 📚 Explicativo, didático
/theme comedian      → 😂 Engraçado, relaxado
```

**Personalidades (5):**
```
/personality helpful   → 🤝 Prestativo, detalhista
/personality concise   → ⚡ Direto ao ponto
/personality creative  → 🎨 Inovador, sugestivo
/personality analytical → 📊 Data-driven, preciso
/personality empathetic → 💙 Compreensivo, apoiador
```

**Exemplo:**
```
/theme hacker
/personality concise

User: How to deploy?

Bot: ```bash
     kubectl apply -f deploy.yaml
     ```
     Done. Check: kubectl get pods

vs

/theme teacher
/personality helpful

User: How to deploy?

Bot: Vou te explicar passo a passo! 😊

     1️⃣ Primeiro, vamos preparar o deployment:
     kubectl apply -f deploy.yaml
     
     2️⃣ Agora verificamos se subiu:
     kubectl get pods
     
     3️⃣ Para ver logs:
     kubectl logs pod-name
     
     Alguma dúvida? Estou aqui para ajudar!
```

### 😊 Sentiment Tracking ⭐ **NOVO!**
**Bot detecta seu humor e adapta respostas!**

**O que detecta:**
- 😊 Positivo: Feliz, animado, satisfeito
- 😐 Neutro: Normal, profissional
- 😞 Negativo: Frustrado, cansado, estressado
- 🔥 Burnout: Sobrecarregado, exausto

**Comandos:**
```
/mood
→ Ver seu mood report (7 dias)

/teammood
→ Dashboard do time (gráficos)

Bot (adaptação automática):
[Detecta frustração]
Bot: Percebi que você está frustrado 😔
     Quer que eu simplifique a explicação?
     Ou prefere que eu resolva isso para você?
```

**Features:**
- ✅ Tracking passivo (todas as mensagens)
- ✅ Histórico de 30 dias
- ✅ Alertas de burnout
- ✅ Adaptação automática de tom
- ✅ Dashboard visual com gráficos

---

## 🚀 Features v2.0 (STABLE)

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

### 🎙️ Voice-to-Voice Conversation ⭐ **NEW v2.0**
**Conversa FLUIDA e NATURAL por voz no Discord!**

O bot entra no canal de voz e mantém uma conversa contínua:

**Como funciona:**
1. 🎧 Bot entra no canal quando você pede
2. 🎤 Detecta automaticamente quando você para de falar (1s silêncio)
3. 📝 Transcreve sua fala (Groq Whisper v3 - 95% accuracy)
4. 🤖 Processa com Claude Opus 4
5. 🔊 Gera resposta em áudio (ElevenLabs TTS)
6. 📢 Fala a resposta no canal
7. 🔄 **Loop contínuo** - Volta a ouvir automaticamente!

**Comandos:**
```
"Ulf, entrar no canal" ou "conversa de voz"
→ Bot entra e começa a ouvir

Fale normalmente:
"Oi Ulf, como você está?"
→ Bot responde em voz: "Oi! Estou ótimo! E você?"

Continue falando:
"Me explica como funciona Docker"
→ Bot responde por voz e continua ouvindo

"Sair do canal"
→ Bot desconecta
```

**Features:**
- ✅ Conversa natural (sem precisar reativar)
- ✅ Multi-turn (mantém contexto)
- ✅ Detecção automática de silêncio (VAD)
- ✅ Suporte PT-BR e 30+ idiomas
- ✅ Custo baixo: ~$0.034/minuto ($2/hora)

**Stack:**
- **STT:** Groq Whisper Large v3 ($0.11/hour audio)
- **TTS:** ElevenLabs Multilingual v2 ($0.30/1k chars)
- **LLM:** Claude Opus 4 (respostas concisas)

**Exemplo de conversa real:**
```
Você: "Ulf, qual a capital do Brasil?"
Bot: "A capital do Brasil é Brasília!"

Você: "E quantos habitantes tem?"
Bot: "Brasília tem cerca de 3 milhões de habitantes!"
        ^-- Bot lembra do contexto

Você: "Legal! Me fala mais sobre a cidade"
Bot: "Brasília foi inaugurada em 1960..."
```

**= CONVERSA COMO SE FOSSE COM HUMANO! 🗣️**

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
**Features v2.0:** Decision Intelligence, Scheduler, Bot Factory, Self-Improvement, Auto-Rollback, Skills Library, Voice-to-Voice

**Ulf é um agente AI autônomo multi-plataforma com:**
- 🧠 Capacidade de análise multi-perspectiva
- 📅 Agendamento autônomo de tarefas
- 🏭 Criação de novos bots em runtime
- 🔧 Self-improvement com auto-deploy
- 💰 Otimização inteligente de custos
- 🌐 Acesso via Cloudflare Tunnel 24/7

**Pode fazer praticamente qualquer coisa que você faria localmente, e mais!** ⚔️
