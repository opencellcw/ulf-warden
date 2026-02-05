# 🤝 Coordination Directory

Este diretório é usado para **comunicação e alinhamento** entre as branches paralelas.

## 📁 Estrutura

```
coordination/
├── README.md           # Este arquivo
├── status.md          # Status atual de cada branch e agente
├── tasks/             # Gestão de tarefas
│   ├── platform.md    # Tarefas de Platform/UI (Claude #1)
│   └── core.md        # Tarefas de Core/Backend (Claude #2)
├── agents/            # Definição de agentes especializados
│   ├── platform-agents.md   # Agentes para Platform branch
│   └── core-agents.md       # Agentes para Core branch
└── sync/              # Sincronização e comunicação
    ├── messages.md    # Mensagens entre branches/agentes
    └── conflicts.md   # Avisos de possíveis conflitos
```

## 🎯 Como Usar

### Para Claude #1 (Platform/UI)
```bash
# Antes de começar trabalho:
cat coordination/status.md
cat coordination/tasks/platform.md

# Ao terminar trabalho:
echo "$(date): Completei task X" >> coordination/sync/messages.md
# Atualizar coordination/status.md com progresso
```

### Para Claude #2 (Core/Backend)
```bash
# Antes de começar trabalho:
cat coordination/status.md
cat coordination/tasks/core.md

# Ao terminar trabalho:
echo "$(date): Completei task Y" >> coordination/sync/messages.md
# Atualizar coordination/status.md com progresso
```

## 📋 Workflow

1. **Antes de trabalhar**:
   - Leia `status.md` para ver estado atual
   - Leia sua task list (`tasks/platform.md` ou `tasks/core.md`)
   - Verifique `sync/messages.md` para atualizações do outro Claude

2. **Durante o trabalho**:
   - Se editar arquivo compartilhado, avise em `sync/conflicts.md`
   - Use os agentes especializados definidos em `agents/`

3. **Depois de trabalhar**:
   - Atualize `status.md` com seu progresso
   - Adicione mensagem em `sync/messages.md`
   - Marque tasks completadas

## 🤖 Agentes Especializados

Cada branch tem agentes especializados para diferentes tipos de trabalho:

### Platform Branch (Claude #1)
- **discord-specialist**: Discord formatting, embeds, buttons
- **slack-specialist**: Slack rich messages, blocks
- **telegram-specialist**: Telegram inline keyboards
- **whatsapp-specialist**: WhatsApp media handling
- **ui-reviewer**: Code review focado em UX

### Core Branch (Claude #2)
- **performance-specialist**: Caching, optimization
- **tool-specialist**: Tool registry, tool development
- **workflow-specialist**: Workflow engine, orchestration
- **security-specialist**: Rate limiting, validation
- **monitoring-specialist**: Metrics, telemetry, observability

Ver detalhes em `agents/platform-agents.md` e `agents/core-agents.md`.

## 🚨 Regras

1. ✅ **SEMPRE** atualize `status.md` após mudanças significativas
2. ✅ **SEMPRE** avise em `sync/conflicts.md` se editar arquivo compartilhado
3. ✅ Commit este diretório em AMBAS as branches
4. ❌ **NUNCA** delete mensagens de `sync/messages.md`
5. ❌ **NUNCA** edite tasks do outro Claude sem avisar

## 📊 Status Quick View

```bash
# Ver status rápido:
cat coordination/status.md

# Ver todas as mensagens:
cat coordination/sync/messages.md

# Ver tarefas pendentes:
grep "⏳" coordination/tasks/*.md
```

---

**Última atualização:** $(date)
**Branches ativas:** 2
**Agentes ativos:** 10 (5 por branch)
