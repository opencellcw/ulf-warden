# 🌐 Multi-Platform Setup

Ulfberht-Warden pode rodar simultaneamente em **Slack**, **Discord** e **Telegram**.

Configure apenas as plataformas que você quer usar. Você pode habilitar 1, 2 ou todas as 3.

---

## 🎯 Slack

### 1. Criar Slack App

1. https://api.slack.com/apps → **Create New App**
2. **From scratch** → Nome: `Ulf` ou `Ulfberht-Warden`

### 2. Configurar Permissões

**OAuth & Permissions** → **Bot Token Scopes**:
```
app_mentions:read
channels:history
channels:read
chat:write
groups:history
groups:read
im:history
im:read
im:write
users:read
```

### 3. Socket Mode

1. **Settings** → **Socket Mode** → **Enable**
2. Gerar **App-Level Token** (scope: `connections:write`)
3. Salvar como `SLACK_APP_TOKEN`

### 4. Event Subscriptions

**Subscribe to bot events**:
- `app_mention`
- `message.im`

### 5. Instalar e Pegar Tokens

1. **Install to Workspace**
2. Copiar **Bot Token** → `SLACK_BOT_TOKEN`
3. **Basic Information** → **Signing Secret** → `SLACK_SIGNING_SECRET`

---

## 🎮 Discord

### 1. Criar Discord Bot

1. https://discord.com/developers/applications
2. **New Application** → Nome: `Ulfberht-Warden`

### 2. Criar Bot

1. **Bot** tab → **Add Bot**
2. Desabilitar **Public Bot** (opcional)
3. Copiar **Token** → `DISCORD_BOT_TOKEN`

### 3. Habilitar Intents

**Bot** → **Privileged Gateway Intents**:
- ✅ Message Content Intent
- ✅ Server Members Intent
- ✅ Presence Intent

### 4. Adicionar ao Servidor

1. **OAuth2** → **URL Generator**
2. **Scopes**: `bot`
3. **Bot Permissions**:
   - Send Messages
   - Read Messages/View Channels
   - Read Message History
4. Copiar URL gerada e abrir no navegador
5. Selecionar servidor e autorizar

### 5. Usar

- **DM**: Manda mensagem direta pro bot
- **Servidor**: Menciona `@Ulfberht-Warden sua mensagem`

---

## 📱 Telegram

### 1. Criar Bot

1. Abrir Telegram e conversar com [@BotFather](https://t.me/botfather)
2. Enviar `/newbot`
3. Seguir instruções:
   - Nome do bot: `Ulf`
   - Username: `ulf_warden_bot` (precisa terminar com `_bot`)

### 2. Pegar Token

BotFather vai te dar um token → `TELEGRAM_BOT_TOKEN`

### 3. Configurar (Opcional)

```
/setdescription - Assistente AI forjado com precisão
/setabouttext - Ulf (Ulfberht-Warden), powered by Claude
/setuserpic - Enviar foto do bot
```

### 4. Usar

1. Buscar seu bot no Telegram
2. `/start` pra começar
3. Mandar mensagens normalmente
4. `/clear` pra limpar histórico

---

## ⚙️ Configuração Multi-Platform

### Variáveis de Ambiente

Adicione no `.env` ou Railway:

```env
# Obrigatório
ANTHROPIC_API_KEY=sk-ant-api03-xxx

# Slack (opcional)
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
SLACK_SIGNING_SECRET=xxx

# Discord (opcional)
DISCORD_BOT_TOKEN=xxx

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=xxx
```

### Exemplos de Configuração

**Apenas Slack:**
```env
ANTHROPIC_API_KEY=sk-ant-xxx
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
SLACK_SIGNING_SECRET=xxx
```

**Slack + Discord:**
```env
ANTHROPIC_API_KEY=sk-ant-xxx
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
SLACK_SIGNING_SECRET=xxx
DISCORD_BOT_TOKEN=xxx
```

**Todas as 3 plataformas:**
```env
ANTHROPIC_API_KEY=sk-ant-xxx
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
SLACK_SIGNING_SECRET=xxx
DISCORD_BOT_TOKEN=xxx
TELEGRAM_BOT_TOKEN=xxx
```

---

## 🔍 Como Funciona

### Sessões Isoladas

Cada plataforma tem sessões isoladas:
- `slack_U12345` - usuário do Slack
- `discord_987654` - usuário do Discord
- `telegram_123456` - usuário do Telegram

Mesmo usuário em plataformas diferentes = conversas separadas.

### Histórico

- Cada sessão mantém últimas 50 mensagens
- Histórico persiste enquanto servidor roda
- Reiniciar servidor = limpa histórico

### Performance

- Bot responde em paralelo em todas as plataformas
- Cada mensagem = 1 chamada à API do Claude
- Custo ~$0.01 por conversa longa (50 mensagens)

---

## 🚀 Deploy

### Railway

Adicionar todas as env vars no Railway dashboard e o bot vai iniciar todas as plataformas configuradas automaticamente.

### Logs

Railway mostrará:
```
⚔️  ULFBERHT-WARDEN
✓ Slack handler started
✓ Discord handler started
✓ Telegram handler started
Status: ONLINE (3 platforms)
```

---

## 🛠️ Troubleshooting

### Slack não conecta

- Verificar Socket Mode habilitado
- Verificar Event Subscriptions configurado
- Checar tokens corretos

### Discord não aparece online

- Verificar Message Content Intent habilitado
- Token correto
- Bot adicionado ao servidor

### Telegram não responde

- Token correto do BotFather
- Bot não bloqueado
- `/start` enviado primeiro

### Ver logs detalhados

```bash
# No Railway
railway logs

# Local
npm run dev
```

---

## 📊 Custos

**Railway:**
- 1 plataforma: ~$1-2/mês
- 3 plataformas: ~$2-3/mês

**Anthropic API:**
- ~$0.01 por conversa longa
- ~$3-5/mês uso pessoal moderado

**Total estimado: $5-8/mês** para todas as plataformas.
