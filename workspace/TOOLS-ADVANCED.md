# 🔧 Advanced Tools Documentation

**Versão:** 2.5  
**Última atualização:** 12 Fevereiro 2026  
**Total:** 29 ferramentas avançadas

Este documento detalha ferramentas avançadas que não estão no TOOLS.md principal. Todas estão implementadas e funcionais.

---

## 📋 Prerequisites

Antes de usar os tools, você precisará de alguns IDs e tokens:

### Como Obter Channel ID

**Discord:**
1. Ativar Developer Mode: Settings → Advanced → Developer Mode
2. Right-click no canal → Copy ID
3. Resultado: 17-19 dígitos (ex: `1234567890123456789`)

**Slack:**
1. Right-click no canal → Copy Link
2. URL format: `https://workspace.slack.com/archives/C1234567890`
3. Channel ID: `C1234567890` (parte após `/archives/`)

**Telegram:**
1. Usar bot `@userinfobot`
2. Forward mensagem do canal para o bot
3. Bot retorna `chat_id` (pode ser negativo)

### Como Obter Discord Bot Token

1. Acesse [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecione sua aplicação → Bot → Token
3. Click "Reset Token" se necessário
4. **⚠️ IMPORTANTE:** Nunca exponha o token em código! Use variáveis de ambiente:
   ```bash
   export DISCORD_BOT_TOKEN="seu-token-aqui"
   ```

---

## 📅 Scheduler Tools (4 tools)

Sistema de agendamento multi-plataforma com suporte a cron e tempo relativo.

### `schedule_task`

Agendar tarefas para execução futura. Suporta Discord, Slack e Telegram com auto-detecção de plataforma.

**Sintaxe:**
```typescript
schedule_task({
  schedule: string,      // Cron ou tempo relativo
  channel_id: string,    // ID do canal (auto-detecta plataforma)
  task_name: string,     // Nome descritivo
  message: string,       // Mensagem a enviar
  user_id?: string       // Opcional: ID do usuário para DM
})
```

**Formatos Suportados:**

**Tempo Relativo:**
- `"in 30 seconds"` - Em 30 segundos
- `"in 5 minutes"` - Em 5 minutos
- `"in 2 hours"` - Em 2 horas
- `"in 1 day"` - Em 1 dia

**Cron Expressions:**
- `"*/5 * * * *"` - A cada 5 minutos
- `"0 9 * * *"` - Diariamente às 9h
- `"0 9 * * 1"` - Toda segunda-feira às 9h
- `"0 0 1 * *"` - Primeiro dia do mês
- `"0 */2 * * *"` - A cada 2 horas

**Auto-detecção de Plataforma:**
- Discord: IDs de 17-19 dígitos (snowflake)
- Telegram: IDs numéricos (podem ser negativos)
- Slack: IDs string (ex: `C1234567890`)

**Exemplos:**
```typescript
// Lembrete simples
schedule_task({
  schedule: "in 30 minutes",
  channel_id: "1234567890123456789",
  task_name: "PR Review Reminder",
  message: "@lucas lembra de revisar o PR #123"
})

// Standup diário
schedule_task({
  schedule: "0 9 * * 1-5",
  channel_id: "1234567890123456789",
  task_name: "Daily Standup",
  message: "🎯 Bom dia! Standup em 10 minutos!"
})

// Relatório semanal
schedule_task({
  schedule: "0 18 * * 5",
  channel_id: "C1234567890",
  task_name: "Weekly Report",
  message: "📊 Relatório semanal pronto!"
})
```

**Use Cases:**
- ✅ Lembretes pessoais
- ✅ Standups recorrentes
- ✅ Follow-ups automáticos
- ✅ Relatórios periódicos
- ✅ Alertas agendados

**Limitações:**
- Requer Discord/Slack/Telegram configurado
- Mensagens enviadas via bot (não pode ser DM direto)
- **Timezone:** UTC (Coordinated Universal Time)
  - Para 9h BRT: use `"0 12 * * *"` (9h BRT = 12h UTC)
  - Para 18h BRT: use `"0 21 * * *"` (18h BRT = 21h UTC)
  - Verificar timezone: logs do bot mostram horários em UTC

---

### `cancel_scheduled_task`

Cancelar tarefa agendada por ID.

**Sintaxe:**
```typescript
cancel_scheduled_task({
  task_id: string  // ID obtido de list_scheduled_tasks
})
```

**Exemplo:**
```typescript
cancel_scheduled_task({ task_id: "reminder_20260212_1234" })
```

**Efeitos:**
- ✅ Task parada imediatamente
- ✅ Removida do schedule
- ✅ Não pode ser recuperada

---

### `list_scheduled_tasks`

Listar todas as tarefas agendadas do usuário.

**Sintaxe:**
```typescript
list_scheduled_tasks()  // Sem parâmetros
```

**Retorna:**
```json
[
  {
    "id": "reminder_20260212_1234",
    "name": "PR Review Reminder",
    "schedule": "in 30 minutes",
    "platform": "discord",
    "channel_id": "1234567890123456789",
    "message": "@lucas lembra de revisar o PR #123",
    "status": "active",
    "next_run": "2026-02-12T18:30:00Z",
    "last_run": null,
    "runs": 0
  }
]
```

**Use Cases:**
- Ver todas tasks ativas
- Obter IDs para cancelamento
- Verificar próxima execução
- Debugar schedules

---

## 🤖 Bot Factory Tools (4 tools)

Sistema de criação dinâmica de bots especializados no Kubernetes.

### `create_bot`

Criar e deployar novo bot AI no cluster GKE.

**Sintaxe:**
```typescript
create_bot({
  name: string,              // Nome único (DNS-safe - ver abaixo)
  type: "conversational" | "agent",
  personality: string,       // Prompt de personalidade
  discord_token?: string,    // Token Discord (opcional)
  allowed_tools?: string[],  // Tools permitidos (agent only)
  admin?: boolean            // Admin privileges (default: false)
})
```

**DNS-safe Name Rules:**
- Apenas lowercase: `a-z`
- Números permitidos: `0-9`
- Hyphens permitidos: `-` (mas não no início/fim)
- Tamanho: 1-63 caracteres
- ✅ Válidos: `support`, `devops-bot`, `guardian2`
- ❌ INVÁLIDOS: `Support` (maiúscula), `dev_ops` (underscore), `-bot` (começa com hyphen)

**Tipos de Bot:**

**1. Conversational** (Chat simples)
- Usa Claude API diretamente
- SEM ferramentas/tools
- Rápido e barato (~$0.50/dia)
- Seguro (sem acesso ao sistema)

**2. Agent** (Coding Agent)
- Usa Pi coding agent framework
- COM ferramentas (bash, read, write, edit, etc)
- Poderoso mas requer cuidado
- Mais caro (~$2-5/dia)

**Exemplos:**

**Bot de Suporte:**
```typescript
create_bot({
  name: "support",
  type: "conversational",
  personality: `You are a helpful customer support agent for CloudWalk. 
  Be friendly, professional, and always try to help.
  If you don't know something, escalate to a human.`,
  discord_token: process.env.DISCORD_BOT_TOKEN_SUPPORT  // Use env var, never hardcode!
})
```

**Bot DevOps:**
```typescript
create_bot({
  name: "devops",
  type: "agent",
  personality: `You are a Kubernetes and DevOps expert.
  Help with deployments, debugging, and infrastructure.
  Always explain what you're doing before executing commands.`,
  allowed_tools: ["bash", "kubectl", "read", "write"],
  discord_token: process.env.DISCORD_BOT_TOKEN_DEVOPS,  // Use env var!
  admin: true
})
```

**Bot de Segurança:**
```typescript
create_bot({
  name: "guardian",
  type: "agent",
  personality: `You are a security monitoring agent.
  Watch for suspicious activity and report issues.
  Never execute destructive commands without approval.`,
  allowed_tools: ["read", "bash", "scan_repo_secrets"],
  discord_token: process.env.DISCORD_BOT_TOKEN_GUARDIAN  // Use env var!
})
```

**Deploy Process:**
1. Validação (nome DNS-safe, token válido)
2. Helm chart generation
3. Deploy to Kubernetes (~30 segundos)
4. Bot registry update
5. Discord connection established

**Requisitos:**
- ✅ Admin privileges (security check)
- ✅ Valid Discord token
- ✅ DNS-safe name (lowercase, hyphens ok)
- ✅ GKE cluster access

**Limitações:**
- Apenas admins podem criar bots
- Nome deve ser único no cluster
- Agent bots DEVEM ter allowed_tools especificado
- Max 10 bots por cluster (soft limit)

---

### `delete_bot`

Deletar bot do cluster (IRREVERSÍVEL).

**Sintaxe:**
```typescript
delete_bot({
  name: string  // Nome do bot
})
```

**Efeitos:**
- ❌ Remove pod do Kubernetes
- ❌ Deleta Helm release
- ❌ Remove do bot registry
- ❌ Bot fica offline no Discord
- ⚠️ **AÇÃO IRREVERSÍVEL**

**Exemplo:**
```typescript
delete_bot({
  name: "old-support-bot"
})
```

**Requisitos:**
- Admin privileges
- Bot deve existir

---

### `list_bots`

Listar todos os bots ativos no cluster.

**Sintaxe:**
```typescript
list_bots()  // Sem parâmetros
```

**Retorna:**
```json
[
  {
    "name": "support",
    "type": "conversational",
    "status": "running",
    "pod": "support-bot-7f8c9d4b6-x9k2m",
    "uptime": "2d 5h 23m",
    "discord_username": "Support Bot#1234",
    "created_at": "2026-02-10T10:00:00Z"
  },
  {
    "name": "devops",
    "type": "agent",
    "status": "running",
    "pod": "devops-bot-5a6b7c8d9-p4q3r",
    "uptime": "1d 12h 45m",
    "discord_username": "DevOps Agent#5678",
    "allowed_tools": ["bash", "kubectl", "read"],
    "created_at": "2026-02-11T14:30:00Z"
  }
]
```

---

### `get_bot_status`

Obter status detalhado de bot específico.

**Sintaxe:**
```typescript
get_bot_status({
  name: string
})
```

**Retorna:**
```json
{
  "name": "devops",
  "type": "agent",
  "status": "running",
  "health": {
    "pod": "Running",
    "restarts": 0,
    "cpu": "45%",
    "memory": "512MB / 1GB"
  },
  "metrics": {
    "messages_processed": 1234,
    "uptime_seconds": 142560,
    "errors_last_hour": 2
  },
  "discord": {
    "username": "DevOps Agent#5678",
    "connected": true,
    "guilds": 3
  },
  "config": {
    "personality": "You are a Kubernetes expert...",
    "allowed_tools": ["bash", "kubectl", "read"],
    "admin": true
  }
}
```

**Use Cases:**
- Debug bot issues
- Monitor performance
- Check health
- Verify configuration

---

## 🎨 Replicate Registry Tools (4 tools)

Sistema auto-atualizável de registro de modelos Replicate com busca semântica.

### `search_replicate_models`

Buscar modelos com semantic search baseado em OpenAI embeddings.

**Sintaxe:**
```typescript
search_replicate_models({
  query: string,           // Busca em linguagem natural
  category?: string,       // Filtro de categoria
  limit?: number          // Max resultados (default: 10)
})
```

**Categorias Disponíveis:**
- `text-to-image` - Geração de imagens
- `image-to-image` - Transformação de imagens
- `video` - Geração/edição de vídeo
- `audio` - Áudio/música
- `text` - LLMs e text processing
- `image-enhancement` - Upscaling, deblur
- `image-control` - ControlNet, pose
- `other` - Outros modelos

**Exemplos:**

**Busca geral:**
```typescript
search_replicate_models({
  query: "gerar imagens realistas de pessoas"
})
// Retorna: Flux Pro, SDXL, RealVisXL
```

**Com filtro de categoria:**
```typescript
search_replicate_models({
  query: "anime style",
  category: "text-to-image",
  limit: 5
})
```

**Por use case:**
```typescript
search_replicate_models({
  query: "upscale image 4x without artifacts"
})
// Retorna: Real-ESRGAN, Clarity Upscaler
```

**Retorna:**
```json
[
  {
    "name": "Flux Pro",
    "owner": "black-forest-labs",
    "description": "State-of-the-art image generation",
    "category": "text-to-image",
    "version": "latest",
    "stats": {
      "usage_count": 1523,
      "success_rate": 0.98,
      "avg_runtime": 12.5,
      "popularity_score": 1492.54
    },
    "parameters": {
      "prompt": "string",
      "num_outputs": "1-4",
      "aspect_ratio": "1:1|16:9|9:16"
    }
  }
]
```

**Ranking por Popularidade:**
```
popularity_score = usage_count * success_rate * 100
```

Modelos com mais uso E maior taxa de sucesso aparecem primeiro.

**Use Cases:**
- "qual model usar para X?" ✅
- "me recomenda um model de Y" ✅
- "flux ou stable diffusion?" ✅
- Descobrir novos models ✅

---

### `get_replicate_model_info`

Info detalhada sobre model específico.

**Sintaxe:**
```typescript
get_replicate_model_info({
  model_name: string  // Nome do model (ex: "Flux Pro")
})
```

**Retorna:**
```json
{
  "name": "Flux Pro",
  "owner": "black-forest-labs",
  "description": "...",
  "category": "text-to-image",
  "version": "latest",
  "stats": {
    "usage_count": 1523,
    "success_count": 1492,
    "failure_count": 31,
    "success_rate": 0.98,
    "avg_runtime": 12.5,
    "min_runtime": 8.2,
    "max_runtime": 45.3
  },
  "parameters": {
    "prompt": {
      "type": "string",
      "description": "Text prompt",
      "required": true
    },
    "num_outputs": {
      "type": "integer",
      "min": 1,
      "max": 4,
      "default": 1
    }
  },
  "examples": [
    {
      "prompt": "cyberpunk city at night",
      "output_url": "https://...",
      "runtime": 11.2
    }
  ],
  "last_used": "2026-02-12T15:30:00Z"
}
```

---

### `list_top_replicate_models`

Listar top models por popularidade ou categoria.

**Sintaxe:**
```typescript
list_top_replicate_models({
  category?: string,     // Filtro de categoria
  limit?: number,        // Max resultados (default: 10)
  sort_by?: "popularity" | "usage" | "success_rate"
})
```

**Exemplos:**

**Top overall:**
```typescript
list_top_replicate_models({
  limit: 5,
  sort_by: "popularity"
})
```

**Top text-to-image:**
```typescript
list_top_replicate_models({
  category: "text-to-image",
  limit: 10,
  sort_by: "success_rate"
})
```

**Mais usados:**
```typescript
list_top_replicate_models({
  sort_by: "usage"
})
```

---

### `sync_replicate_models`

Sincronização manual do registry (normalmente auto-sync às 3 AM).

**Sintaxe:**
```typescript
sync_replicate_models()  // Sem parâmetros
```

**Efeitos:**
- Descobre novos models da Replicate API
- Atualiza info de models existentes
- Gera embeddings para busca semântica
- Atualiza popularidade scores

**Uso:**
- Admin apenas
- Sync automático diário (3 AM)
- Use manual sync apenas se necessário

**Custo:** ~$0.02 por sync (OpenAI embeddings)

**⚠️ Custos do Replicate:**
- Replicate models são **PAGOS** (não grátis)
- Custos variam por model: $0.001 - $0.10 por geração
- Models populares (Flux Pro, SDXL): ~$0.03/imagem
- Verificar preços: https://replicate.com/pricing
- Billing: Replicate cobra diretamente (API token necessário)

---

## ⚙️ Process Management Tools (5 tools)

Gerenciamento de processos em background com monitoramento.

### `process_start`

Iniciar processo em background com monitoring.

**Sintaxe:**
```typescript
process_start({
  name: string,          // Nome único
  command: string,       // Comando a executar
  auto_restart?: boolean, // Auto-restart on crash (default: false)
  cwd?: string          // Working directory (default: /app no container)
})
```

**Working Directory:**
- **Default:** `/app` (diretório atual do bot no container)
- **Aceita:** Path absoluto ou relativo
- **Relativo:** A partir de `/app`
- **Exemplo:** `cwd: "./scripts"` → `/app/scripts`

**Exemplos:**

**API Server:**
```typescript
process_start({
  name: "api",
  command: "uvicorn main:app --host 0.0.0.0 --port 8000",
  auto_restart: true,
  cwd: "/app/api"
})
```

**Worker:**
```typescript
process_start({
  name: "worker",
  command: "python worker.py",
  auto_restart: true
})
```

**Build Process:**
```typescript
process_start({
  name: "build",
  command: "npm run build",
  auto_restart: false  // One-time execution
})
```

**Features:**
- ✅ Stdout/stderr capture
- ✅ Auto-restart on crash (se enabled)
- ✅ Exit code tracking
- ✅ Resource monitoring
- ✅ Log rotation

**Auto-Restart Behavior:**

Com `auto_restart: true`:
- ✅ Exit code 0: Restart
- ✅ Exit code != 0: Restart
- ✅ Max attempts: Ilimitado (restart forever)
- ✅ Delay: 5 segundos entre restarts
- ❌ Exponential backoff: Não (sempre 5s)

Com `auto_restart: false`:
- ❌ Processo termina e para (não restart)
- ✅ Útil para: Builds, migrations, one-time scripts

---

### `process_stop`

Parar processo por nome.

**Sintaxe:**
```typescript
process_stop({
  name: string,      // Nome do processo
  force?: boolean    // SIGKILL instead of SIGTERM
})
```

**Exemplos:**
```typescript
// Graceful stop
process_stop({ name: "api" })

// Force kill
process_stop({ name: "hung-worker", force: true })
```

---

### `process_restart`

Reiniciar processo (stop + start).

**Sintaxe:**
```typescript
process_restart({
  name: string
})
```

**Exemplo:**
```typescript
process_restart({ name: "api" })
```

**Efeitos:**
- SIGTERM enviado
- Wait até processo terminar (max 30s)
- Restart com mesmas configs
- Logs preservados

---

### `process_list`

Listar todos os processos gerenciados.

**Sintaxe:**
```typescript
process_list()  // Sem parâmetros
```

**Retorna:**
```json
[
  {
    "name": "api",
    "command": "uvicorn main:app",
    "pid": 12345,
    "status": "running",
    "uptime": "2h 34m 12s",
    "restarts": 2,
    "auto_restart": true,
    "cpu": "12%",
    "memory": "256MB"
  },
  {
    "name": "worker",
    "command": "python worker.py",
    "pid": 12346,
    "status": "stopped",
    "exit_code": 0,
    "last_run": "2026-02-12T15:00:00Z"
  }
]
```

---

### `process_logs`

Ver logs de processo.

**Sintaxe:**
```typescript
process_logs({
  name: string,
  lines?: number,      // Últimas N linhas (default: 100)
  follow?: boolean     // Stream logs (default: false)
})
```

**Exemplos:**
```typescript
// Últimas 50 linhas
process_logs({
  name: "api",
  lines: 50
})

// Stream real-time (follow)
process_logs({
  name: "worker",
  follow: true
})
```

---

## 🧠 Memory Tools (2 tools)

Sistema de memória persistente com busca vetorial.

### `memory_search`

Buscar memórias com semantic search.

**Sintaxe:**
```typescript
memory_search({
  query: string,       // Busca em linguagem natural
  limit?: number,      // Max resultados (default: 5)
  min_score?: number  // Min similarity (0-1, default: 0.7)
})
```

**Similarity Score Guide:**
- **Range:** 0.0 (totalmente diferente) a 1.0 (idêntico)
- **0.9+:** Altamente relevante (match quase exato)
- **0.7-0.9:** Relevante (match semântico bom) ← Default threshold
- **0.5-0.7:** Parcialmente relevante
- **<0.5:** Pouco relevante (não retornado por default)

**Ajustes:**
- Muitos falsos positivos? Aumente para `0.8+`
- Poucos resultados? Diminua para `0.6`

**Exemplos:**
```typescript
// Buscar decisões passadas
memory_search({
  query: "decisões sobre arquitetura de microserviços"
})

// Buscar conversas específicas
memory_search({
  query: "quando discutimos a migração para GCP?"
})
```

**Retorna:**
```json
[
  {
    "id": "mem_20260210_1234",
    "content": "Decidimos migrar para microserviços...",
    "similarity": 0.89,
    "created_at": "2026-02-10T14:30:00Z",
    "context": {
      "user": "lucas",
      "channel": "arch-decisions",
      "platform": "discord"
    }
  }
]
```

**Use Cases:**
- Recall de decisões ✅
- Buscar discussões passadas ✅
- Retrieve context ✅

---

### `memory_recall`

Recuperar memória específica por ID.

**Sintaxe:**
```typescript
memory_recall({
  memory_id: string
})
```

**Retorna:**
```json
{
  "id": "mem_20260210_1234",
  "content": "Full memory content...",
  "created_at": "2026-02-10T14:30:00Z",
  "updated_at": "2026-02-10T14:30:00Z",
  "context": {
    "user": "lucas",
    "channel": "arch-decisions",
    "platform": "discord"
  },
  "metadata": {
    "tags": ["architecture", "microservices"],
    "importance": "high"
  }
}
```

---

## 🛠️ Utility Tools (7 tools)

Ferramentas auxiliares para integração com serviços externos.

### `send_email`

Enviar email via Gmail.

**Sintaxe:**
```typescript
send_email({
  to: string,           // Email(s) - comma-separated
  subject: string,      // Assunto
  body: string,         // Corpo do email
  html?: boolean,       // HTML email (default: false)
  cc?: string,          // CC recipients
  bcc?: string         // BCC recipients
})
```

**Exemplos:**

**Email simples:**
```typescript
send_email({
  to: "user@example.com",
  subject: "Hello",
  body: "Hi there!\n\nThis is a test email."
})
```

**Email HTML:**
```typescript
send_email({
  to: "team@company.com",
  subject: "Weekly Report",
  body: `
    <h1>Weekly Report</h1>
    <p>Here are this week's metrics:</p>
    <ul>
      <li>Deploys: 12</li>
      <li>Incidents: 2</li>
      <li>Uptime: 99.9%</li>
    </ul>
  `,
  html: true
})
```

**Múltiplos destinatários:**
```typescript
send_email({
  to: "user1@example.com,user2@example.com",
  cc: "manager@example.com",
  subject: "Update",
  body: "..."
})
```

**Requisitos:**
- GMAIL_USER env var
- GMAIL_PASSWORD env var (app password)

---

### `send_slack_message`

Enviar mensagem para Slack channel.

**Sintaxe:**
```typescript
send_slack_message({
  channel_id: string,    // Slack channel ID
  message: string,       // Mensagem
  thread_ts?: string    // Reply to thread
})
```

**Exemplos:**
```typescript
// Channel message
send_slack_message({
  channel_id: "C1234567890",
  message: "Deploy completed! 🚀"
})

// Thread reply
send_slack_message({
  channel_id: "C1234567890",
  message: "Issue fixed!",
  thread_ts: "1234567890.123456"
})
```

---

### `youtube_video_clone`

Clonar vídeo do YouTube (download + metadata).

**Sintaxe:**
```typescript
youtube_video_clone({
  url: string,           // YouTube URL
  format?: string,       // Video format (default: "best")
  audio_only?: boolean  // Download audio only
})
```

**Exemplos:**
```typescript
// Download video
youtube_video_clone({
  url: "https://youtube.com/watch?v=..."
})

// Audio only
youtube_video_clone({
  url: "https://youtube.com/watch?v=...",
  audio_only: true
})
```

**Retorna:**
- Local file path
- Video metadata (title, duration, views)
- Thumbnail URL

---

### `scan_repo_secrets`

Scan repositório por secrets expostos.

**Sintaxe:**
```typescript
scan_repo_secrets({
  repo_path: string     // Path do repo
})
```

**Detecta:**
- API keys (AWS, Google, Stripe, etc)
- Private keys (SSH, PGP)
- Tokens (GitHub, GitLab, Slack)
- Passwords hardcoded
- Database URLs com credentials

**Retorna:**
```json
{
  "secrets_found": 3,
  "files_scanned": 142,
  "results": [
    {
      "file": "config.py",
      "line": 15,
      "type": "AWS Access Key",
      "secret": "AKIA...",
      "severity": "critical"
    }
  ]
}
```

---

### `secure_repo`

Securizar repositório GitHub (adicionar .gitignore, pre-commit hooks).

**Sintaxe:**
```typescript
secure_repo({
  repo_path: string,
  add_gitignore?: boolean,
  add_precommit?: boolean,
  scan_history?: boolean
})
```

**Efeitos:**
- Adiciona .gitignore completo
- Setup pre-commit hooks (secret scanning)
- Scan git history (se enabled)
- Remove secrets encontrados

---

### `deploy_public_app`

Deploy aplicação pública (ex: landing page).

**Sintaxe:**
```typescript
deploy_public_app({
  name: string,          // App name
  source_path: string,   // Source directory
  framework?: string     // Framework (auto-detect)
})
```

**Frameworks suportados:**
- Next.js
- React (Vite)
- Vue
- Static HTML

**Deploy para:** Vercel ou Cloudflare Pages

---

### `delete_public_app`

Deletar aplicação pública deployada.

**Sintaxe:**
```typescript
delete_public_app({
  name: string
})
```

---

### `list_public_apps`

Listar todas apps públicas deployadas.

**Sintaxe:**
```typescript
list_public_apps()
```

**Retorna:**
```json
[
  {
    "name": "landing",
    "url": "https://landing.vercel.app",
    "framework": "Next.js",
    "status": "deployed",
    "last_deploy": "2026-02-12T15:00:00Z"
  }
]
```

---

## 📊 Comparação de Tools

| Category | Tools | Complexity | Admin Only | Use Frequency |
|----------|-------|------------|------------|---------------|
| **Scheduler** | 4 | Média | No | Alta |
| **Bot Factory** | 4 | Alta | Yes | Baixa |
| **Replicate Registry** | 4 | Baixa | No | Média |
| **Process Management** | 5 | Média | No | Alta |
| **Memory** | 2 | Baixa | No | Média |
| **Utilities** | 7 | Variável | Parcial | Baixa |

---

## 🎯 Quick Reference

### Scheduler
- `schedule_task` - Agendar execução
- `cancel_scheduled_task` - Cancelar task
- `list_scheduled_tasks` - Listar tasks

### Bot Factory
- `create_bot` - Criar bot
- `delete_bot` - Deletar bot
- `list_bots` - Listar bots
- `get_bot_status` - Status detalhado

### Replicate Registry
- `search_replicate_models` - Buscar models
- `get_replicate_model_info` - Info detalhada
- `list_top_replicate_models` - Top models
- `sync_replicate_models` - Sync manual

### Process Management
- `process_start` - Iniciar processo
- `process_stop` - Parar processo
- `process_restart` - Reiniciar processo
- `process_list` - Listar processos
- `process_logs` - Ver logs

### Memory
- `memory_search` - Buscar memórias
- `memory_recall` - Recuperar memória

### Utilities
- `send_email` - Gmail
- `send_slack_message` - Slack
- `youtube_video_clone` - YouTube
- `scan_repo_secrets` - Security scan
- `secure_repo` - Repo security
- `deploy_public_app` - Deploy app
- `delete_public_app` - Delete app
- `list_public_apps` - List apps

---

**Última atualização:** 12 Fevereiro 2026  
**Versão:** 2.5  
**Total:** 29 ferramentas documentadas ✅
