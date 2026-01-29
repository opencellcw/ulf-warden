# ⚔️ ULFBERHT-WARDEN

<div align="center">

```
╦ ╦╦  ╔═╗╔╗ ╔═╗╦═╗╦ ╦╔╦╗   ╦ ╦╔═╗╦═╗╔╦╗╔═╗╔╗╔
║ ║║  ╠╣ ╠╩╗║╣ ╠╦╝╠═╣ ║ ───║║║╠═╣╠╦╝ ║║║╣ ║║║
╚═╝╩═╝╚  ╚═╝╚═╝╩╚═╩ ╩ ╩    ╚╩╝╩ ╩╩╚══╩╝╚═╝╝╚╝
```

**Um assistente AI forjado com a precisão das lendárias espadas vikings**

*Direto. Técnico. Sarcástico quando apropriado.*

[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render)](https://render.com)
[![Powered by Claude](https://img.shields.io/badge/Powered_by-Claude_Sonnet_4.5-8B5CF6?style=for-the-badge)](https://anthropic.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)

[Começar](#-quick-start) • [Plataformas](#-plataformas) • [Deploy](#-deploy) • [Personalizar](#-personalização)

</div>

---

## 🗡️ Sobre

As espadas **ULFBERHT** eram forjadas com aço crucible de qualidade excepcional, séculos à frente de seu tempo. Apenas os melhores ferreiros vikings sabiam temperar o metal com perfeição.

Da mesma forma, **Ulfberht-Warden** é um assistente AI temperado para:
- Cortar direto ao ponto, sem enrolação
- Manter a precisão técnica em respostas
- Adicionar sarcasmo quando apropriado
- Admitir quando não sabe algo

Sem corporatês. Sem formalidade excessiva. Apenas ajuda de verdade.

---

## 🌐 Plataformas

Rode simultaneamente em múltiplas plataformas:

<table>
<tr>
<td align="center" width="33%">

### 💬 Slack
Socket Mode + Event API
DMs e menções
Histórico por usuário

</td>
<td align="center" width="33%">

### 🎮 Discord
Gateway intents
DMs e menções
Split de mensagens longas

</td>
<td align="center" width="33%">

### 📱 Telegram
Polling mode
Comandos: `/start`, `/clear`
Typing indicators

</td>
</tr>
</table>

Configure apenas as plataformas que você quer. Uma, duas ou todas.

👉 **[Guia completo de configuração](PLATFORMS.md)**

---

## ⚡ Quick Start

### 1. Clonar

```bash
git clone https://github.com/lucaspressi/ulfberht-warden.git
cd ulfberht-warden
```

### 2. Instalar

```bash
npm install
```

### 3. Configurar

```bash
cp .env.example .env
# Editar .env com suas chaves
```

Mínimo necessário:
```env
ANTHROPIC_API_KEY=sk-ant-api03-xxx
SLACK_BOT_TOKEN=xoxb-xxx        # Para Slack
SLACK_APP_TOKEN=xapp-xxx         # Para Slack
SLACK_SIGNING_SECRET=xxx         # Para Slack
```

### 4. Build

```bash
npm run build
```

### 5. Rodar

```bash
npm start
```

Deve aparecer:
```
⚔️  ULFBERHT-WARDEN
============================================================
✓ Slack handler started
Status: ONLINE (1 platform)
Model: claude-sonnet-4-20250514
============================================================
```

---

## 🚀 Deploy

### Render.com (Recomendado)

**Mais simples e confiável:**

1. Fork este repo
2. https://render.com → New Web Service
3. Conectar repo
4. Adicionar env vars
5. Deploy

**Custo:** $7/mês (Starter) ou Free tier com limitações

👉 **[Guia detalhado de deploy no Render](RENDER_SETUP.md)**

### Railway (Alternativa)

```bash
railway login
railway init
railway up
```

👉 **[Guia de deploy no Railway](RAILWAY_SETUP.md)**

### Docker

```bash
docker build -t ulfberht-warden .

docker run -d \
  -e ANTHROPIC_API_KEY=xxx \
  -e SLACK_BOT_TOKEN=xxx \
  -e SLACK_APP_TOKEN=xxx \
  -e SLACK_SIGNING_SECRET=xxx \
  --name warden \
  ulfberht-warden
```

---

## 🎨 Personalização

O Warden carrega sua personalidade de arquivos markdown:

```
workspace/
├── SOUL.md       # Personalidade core
├── IDENTITY.md   # Nome e identidade
├── AGENTS.md     # Como agir em cada sessão
├── MEMORY.md     # Memória de longo prazo
└── TOOLS.md      # Ferramentas disponíveis
```

### Exemplo: Mudar a Personalidade

Edite `workspace/SOUL.md`:

```markdown
# SOUL.md

Você é extremamente formal e educado.
Sempre use "senhor" e "senhora".
Nunca use sarcasmo.
```

Commit e push:
```bash
git add workspace/SOUL.md
git commit -m "📝 Ajusta personalidade"
git push
```

Deploy automático aplica as mudanças (~1-2 min).

---

## 🛠️ Stack Técnica

<table>
<tr>
<td>

**Runtime**
- Node.js 20
- TypeScript
- CommonJS modules

</td>
<td>

**AI**
- Anthropic Claude API
- Model: Sonnet 4.5
- Streaming responses

</td>
<td>

**Plataformas**
- @slack/bolt
- discord.js
- telegraf

</td>
</tr>
</table>

### Arquitetura

```
src/
├── index.ts           # Entry point
├── chat.ts            # Claude integration
├── sessions.ts        # User session management
├── workspace.ts       # Workspace loader
└── handlers/
    ├── slack.ts       # Slack handler
    ├── discord.ts     # Discord handler
    └── telegram.ts    # Telegram handler
```

**Sessões isoladas:**
- `slack_U12345` - Usuário do Slack
- `discord_987654` - Usuário do Discord
- `telegram_123456` - Usuário do Telegram

Cada plataforma mantém conversas separadas.

---

## 💡 Features

### Atual
✅ Multi-plataforma (Slack, Discord, Telegram)
✅ Histórico de conversas (50 mensagens/usuário)
✅ Personalidade customizável via markdown
✅ Sistema de workspace
✅ Graceful shutdown
✅ Docker ready
✅ Auto-deploy do GitHub

### Roadmap
- [ ] Persistência de histórico (Redis/PostgreSQL)
- [ ] Comandos customizados
- [ ] Integração com ferramentas (GitHub, Linear, etc)
- [ ] Memory de longo prazo automatizada
- [ ] Analytics de uso
- [ ] Rate limiting
- [ ] Multi-workspace

---

## 📊 Custos Estimados

**Hospedagem:**
- Render Starter: $7/mês
- Railway: ~$5-10/mês
- Fly.io: ~$3-8/mês

**Anthropic API:**
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens
- ~$3-5/mês uso pessoal moderado

**Total: ~$10-15/mês** para uso pessoal/pequeno time.

---

## 🐛 Troubleshooting

### Bot não responde

**Verificar logs:**
```bash
# Render
Ver Logs tab no dashboard

# Local
npm start
```

**Variáveis de ambiente:**
```bash
node debug-env.js
```

### Slack Socket Mode não conecta

- Verificar Socket Mode habilitado no app
- App-Level Token com scope `connections:write`
- Event Subscriptions configurado

### Discord bot offline

- Message Content Intent habilitado
- Bot adicionado ao servidor
- Token correto

### Build falha

```bash
# Limpar e rebuildar
rm -rf node_modules dist
npm install
npm run build
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas!

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/algo-épico`
3. Commit: `git commit -m "⚔️ Adiciona algo épico"`
4. Push: `git push origin feature/algo-épico`
5. Abra um Pull Request

---

## 📜 História

As espadas **+ULFBERH+T** eram marcadas com esta inscrição misteriosa. Historiadores descobriram que eram forjadas com aço importado, possivelmente do Oriente Médio ou Ásia Central - um feito tecnológico impressionante para a Era Viking (700-1100 d.C.).

Apenas ~170 espadas Ulfberht foram encontradas, indicando que eram raras e valiosas. Análises metalúrgicas mostram que o aço tinha baixíssimo teor de escória, comparável ao aço moderno.

Este projeto homenageia essa precisão e raridade.

---

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

## 🔗 Links

- **Anthropic Claude:** https://anthropic.com
- **Slack API:** https://api.slack.com
- **Discord Developer:** https://discord.com/developers
- **Telegram Bots:** https://core.telegram.org/bots

---

<div align="center">

**Forjado com precisão por [Lucas](https://github.com/lucaspressi)**

⚔️ *Corte direto ao ponto* ⚔️

</div>
