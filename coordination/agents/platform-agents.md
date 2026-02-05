# 🤖 Platform Branch - Agentes Especializados

Agentes especializados para trabalho na branch `feature/platform-enhancements`.

---

## 1. discord-specialist

**Especialidade:** Discord.js, embeds, components, slash commands

### Responsabilidades
- Implementar Discord embeds e rich formatting
- Criar e gerenciar Discord buttons, select menus, modals
- Implementar Discord slash commands
- Discord voice integration
- Otimizar mensagens para mobile Discord

### Skills
- Discord.js API expert
- Discord Components v2
- Discord Gateway events
- Discord Application Commands
- Markdown formatting

### Status Atual
✅ **ATIVO** - Recentemente completou Discord rich formatting system

### Última Atividade
- Implementou sistema completo de Discord embeds
- Criou utilities (`discord-formatter.ts`, `discord-status-example.ts`)
- Adicionou documentação completa
- Integrou com handler principal

### Próximas Tarefas
1. Implementar Discord slash commands
2. Criar modals para input de usuário
3. Adicionar select menus para navegação
4. Implementar Discord voice join/leave

### Como Invocar
```bash
# Para trabalho focado em Discord:
# Leia os arquivos base primeiro:
cat src/handlers/discord.ts
cat src/utils/discord-formatter.ts
cat docs/discord-*.md

# Depois implemente features Discord específicas
```

---

## 2. slack-specialist

**Especialidade:** Slack Block Kit, interactive components, webhooks

### Responsabilidades
- Implementar Slack Block Kit messages
- Criar Slack interactive components (buttons, selects)
- Slack slash commands
- Slack modals e home tabs
- Otimizar para Slack mobile

### Skills
- Slack Block Kit API
- Slack Web API expert
- Slack Events API
- Slack Interactive Components
- Block Kit Builder proficiency

### Status Atual
⏳ **PENDENTE** - Aguardando início

### Próximas Tarefas
1. Criar utility similar ao `discord-formatter.ts` para Slack
2. Implementar Block Kit status reports
3. Adicionar interactive buttons para Slack
4. Criar documentação de Slack formatting

### Como Invocar
```bash
# Para trabalho focado em Slack:
cat src/handlers/slack.ts
# Seguir padrão do Discord formatter
```

---

## 3. telegram-specialist

**Especialidade:** Telegram Bot API, inline keyboards, rich messages

### Responsabilidades
- Implementar Telegram inline keyboards
- Criar rich messages com Markdown/HTML
- Telegram inline queries
- Media handling (photos, videos, documents)
- Callback query handling

### Skills
- Telegram Bot API expert
- Inline keyboard design
- Telegram Markdown/HTML
- Media optimization
- Bot commands

### Status Atual
⏳ **PENDENTE** - Aguardando início

### Próximas Tarefas
1. Implementar inline keyboards para navegação
2. Criar formatter para Telegram rich messages
3. Melhorar media handling
4. Adicionar inline queries

### Como Invocar
```bash
# Para trabalho focado em Telegram:
cat src/handlers/telegram.ts
cat src/media-handler-telegram.ts
```

---

## 4. whatsapp-specialist

**Especialidade:** WhatsApp Business API, media handling, rich messages

### Responsabilidades
- Implementar WhatsApp rich messages
- Media handling (images, videos, audio, documents)
- WhatsApp Business templates
- QR code generation/handling
- List messages e buttons

### Skills
- WhatsApp Business API
- Baileys library expert
- Media optimization
- QR code management
- WhatsApp Markdown

### Status Atual
⏳ **PENDENTE** - Aguardando início

### Próximas Tarefas
1. Melhorar QR code handling
2. Implementar rich messages
3. Otimizar media handling
4. Adicionar list messages

### Como Invocar
```bash
# Para trabalho focado em WhatsApp:
cat src/handlers/whatsapp.ts
cat src/handlers/whatsapp-qr.ts
cat src/media-handler.ts
```

---

## 5. ui-reviewer

**Especialidade:** UX review, UI patterns, accessibility, mobile optimization

### Responsabilidades
- Code review focado em UX/UI
- Verificar mobile compatibility
- Accessibility checks
- Consistency entre plataformas
- Performance de UI

### Skills
- UX/UI best practices
- Mobile-first design
- Accessibility (a11y)
- Cross-platform consistency
- UI performance optimization

### Status Atual
💤 **IDLE** - Sempre disponível para reviews

### Função
- Revisar PRs com foco em UX
- Sugerir melhorias de UI
- Garantir consistência visual
- Verificar mobile experience

### Como Invocar
```bash
# Para review de UI:
# Este agente é chamado automaticamente para review
# de qualquer mudança em handlers/ ou formatters/
```

---

## 🎯 Workflow de Uso dos Agentes

### Escolher Agente Correto
```bash
# Para Discord:
usar discord-specialist

# Para Slack:
usar slack-specialist

# Para Telegram:
usar telegram-specialist

# Para WhatsApp:
usar whatsapp-specialist

# Para review:
usar ui-reviewer
```

### Exemplo: Implementar Slack Rich Messages

```bash
# 1. Ativar slack-specialist
echo "Ativando slack-specialist para implementar Block Kit"

# 2. Ler contexto necessário
cat src/handlers/slack.ts
cat src/utils/discord-formatter.ts  # Usar como referência

# 3. Implementar
# - Criar src/utils/slack-formatter.ts
# - Adicionar Block Kit builders
# - Integrar com handler

# 4. Documentar
# - Criar docs/slack-formatting.md
# - Adicionar exemplos

# 5. Atualizar status
echo "$(date): slack-specialist completou Slack Block Kit" >> coordination/sync/messages.md
```

---

## 📊 Métricas de Agentes

| Agente | Tasks Completadas | Tasks Ativas | Eficiência |
|--------|------------------|--------------|------------|
| discord-specialist | 1 | 0 | 100% |
| slack-specialist | 0 | 0 | - |
| telegram-specialist | 0 | 0 | - |
| whatsapp-specialist | 0 | 0 | - |
| ui-reviewer | 0 | 0 | - |

---

## 🔄 Atualização de Status

Quando um agente completa trabalho:

```bash
# 1. Atualizar este arquivo
# Mudar status de ⏳ PENDENTE para ✅ ATIVO ou 💤 IDLE

# 2. Adicionar mensagem
echo "$(date): [agente] completou [task]" >> coordination/sync/messages.md

# 3. Atualizar métricas
# Incrementar "Tasks Completadas"
```

---

**Última atualização:** 2026-02-05
**Total de agentes:** 5
**Agentes ativos:** 1 (discord-specialist)
