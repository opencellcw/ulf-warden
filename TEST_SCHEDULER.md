# Test Scheduler System

## Teste 1: Reminder de 2 minutos

**No Slack, envie:**
```
@ulfberht-warden me lembra em 2 minutos de testar o sistema de agendamento
```

O Ulf vai:
1. Detectar palavras-chave "lembra" → usar agent mode
2. Usar tool `schedule_task` com:
   - name: "Reminder sobre sistema de agendamento"
   - when: "in 2 minutes"
   - channel: <seu_canal>
   - message: "🔔 Lembrete: testar o sistema de agendamento"
3. Responder com ID do job
4. Em 2 minutos, enviar mensagem no canal

## Teste 2: Listar tasks agendadas

**No Slack, envie:**
```
@ulfberht-warden lista minhas tasks agendadas
```

Vai mostrar todas as tasks com status, schedule e última execução.

## Teste 3: Cancelar task

**No Slack, envie:**
```
@ulfberht-warden cancela a task <ID>
```

## Teste 4: Recurring reminder (cron expression)

**No Slack, envie:**
```
@ulfberht-warden me lembra todo dia às 9h de fazer o standup
```

O Ulf vai criar um job com cron: `0 9 * * *`

## Verificação Manual

Para verificar os jobs diretamente no banco:

```bash
sqlite3 data/ulf.db "SELECT id, name, expression, enabled, last_run FROM cron_jobs;"
```

## Exemplos de Expressões Suportadas

### Tempo Relativo
- `in 30 seconds`
- `in 5 minutes`
- `in 2 hours`
- `in 1 day`

### Cron Expressions
- `*/5 * * * *` - A cada 5 minutos
- `0 9 * * *` - Todo dia às 9h
- `0 9 * * 1` - Toda segunda-feira às 9h
- `0 0 1 * *` - Primeiro dia de cada mês
- `30 14 * * 1-5` - Segunda a sexta às 14:30

## Logs

Para ver os logs do CronManager:

```bash
tail -f logs/ulf.log | grep CronManager
```

## Arquitetura

```
User (Slack)
    ↓
Agent (detecta keywords)
    ↓
schedule_task tool
    ↓
CronManager.addJob()
    ↓
SQLite (persist)
    ↓
node-cron (schedule)
    ↓
CronManager.executeTask()
    ↓
send_slack_message tool
    ↓
Slack API
```

## Keywords que Ativam Agent Mode

O handler detecta estas palavras para usar agent mode (com tools):

**Scheduling:**
- "lembra", "reminder", "agendar", "schedule"
- "me avisa", "notify", "alerta", "alert"

**Development:**
- "criar", "create", "instala", "install"
- "roda", "run", "executa", "execute"

**Multimodal:**
- "gera", "generate", "imagem", "image"
- "audio", "video", "transcreve", "transcribe"
