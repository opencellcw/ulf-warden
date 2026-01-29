# ⚔️ Ulfberht-Warden

AI assistant forjado com precisão, rodando no Slack.

## Setup

### 1. Criar Slack App

1. https://api.slack.com/apps → Create New App
2. From scratch → Nome: "Ulfberht-Warden"

### 2. Configurar Permissões

**OAuth & Permissions** → Bot Token Scopes:
- `app_mentions:read`
- `channels:history`
- `channels:read`
- `chat:write`
- `groups:history`
- `groups:read`
- `im:history`
- `im:read`
- `im:write`
- `users:read`

### 3. Socket Mode

1. Settings → Socket Mode → Enable
2. Gerar App-Level Token (scope: `connections:write`)
3. Salvar como SLACK_APP_TOKEN

### 4. Event Subscriptions

Subscribe to bot events:
- `app_mention`
- `message.im`

### 5. Instalar

Install to Workspace → copiar Bot Token

### 6. Variáveis de Ambiente

```bash
cp .env.example .env
# Editar .env com suas chaves
```

### 7. Rodar

```bash
npm install
npm start
```

### 8. Deploy (Railway)

1. Conectar repo
2. Adicionar variáveis de ambiente
3. Deploy automático

## Uso

- DM: manda mensagem direta pro bot
- Menção: `@Ulfberht-Warden sua pergunta`

## Personalização

Edite os arquivos em `workspace/`:
- `SOUL.md` - Personalidade
- `IDENTITY.md` - Nome e identidade
- `MEMORY.md` - Memória de longo prazo
