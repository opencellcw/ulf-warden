# 📅 Cron Scheduler - Guia de Uso

## Visão Geral

O sistema de agendamento permite ao Ulf criar reminders e tasks recorrentes usando expressões naturais ou cron.

## Exemplos de Uso no Slack

### 1. Reminder Simples

```
@ulfberht-warden me lembra em 30 minutos de fazer code review
```

Ulf vai:
- Criar um job one-time
- Em 30 minutos, enviar mensagem no mesmo canal
- Auto-desabilitar o job após executar

### 2. Reminder Diário

```
@ulfberht-warden me lembra todo dia às 9h de fazer standup
```

Ulf vai:
- Criar um job recorrente (cron: `0 9 * * *`)
- Todo dia às 9h enviar mensagem
- Job continua ativo até ser cancelado

### 3. Listar Tasks Agendadas

```
@ulfberht-warden lista minhas tasks agendadas
```

Resposta:
```
📅 Scheduled Tasks (2):

**Code Review Reminder**
  • ID: `a1b2c3d4`
  • Status: ✅ Active
  • Schedule: in 30 minutes
  • Last run: Never

**Daily Standup**
  • ID: `e5f6g7h8`
  • Status: ✅ Active
  • Schedule: 0 9 * * *
  • Last run: 2025-01-30 09:00:00
```

### 4. Cancelar Task

```
@ulfberht-warden cancela a task a1b2c3d4
```

### 5. Reminders Específicos

```
@ulfberht-warden me avisa em 2 horas se o deploy terminou
@ulfberht-warden agenda um lembrete pra daqui 1 dia sobre a reunião
@ulfberht-warden me lembra toda segunda às 10h de enviar o relatório
```

## Formatos Suportados

### Tempo Relativo
- `in 30 seconds` / `em 30 segundos`
- `in 5 minutes` / `em 5 minutos`
- `in 2 hours` / `em 2 horas`
- `in 1 day` / `em 1 dia`

### Expressões Cron

| Expressão | Descrição |
|-----------|-----------|
| `*/5 * * * *` | A cada 5 minutos |
| `0 * * * *` | A cada hora |
| `0 9 * * *` | Todo dia às 9h |
| `0 9 * * 1` | Toda segunda às 9h |
| `0 9 * * 1-5` | Segunda a sexta às 9h |
| `0 0 1 * *` | Primeiro dia do mês |
| `30 14 * * *` | Todo dia às 14:30 |

## Arquitetura Interna

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                         │
│              "me lembra em 30 minutos"                  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Slack Handler                          │
│  • Detecta keywords: "lembra", "agendar", etc.         │
│  • Usa Agent Mode (com tools)                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                 Claude Agent                            │
│  • Analisa intenção do usuário                         │
│  • Decide usar tool: schedule_task                     │
│  • Extrai: name, when, channel, message                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            schedule_task Tool                           │
│  Input: { name, when, channel, message }               │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  CronManager                            │
│  • Parse expression (relativo → cron)                  │
│  • Valida expressão cron                               │
│  • Salva no SQLite                                     │
│  • Schedule com node-cron                              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ (após delay)
                       ▼
┌─────────────────────────────────────────────────────────┐
│              node-cron Trigger                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│          CronManager.executeTask()                      │
│  • Identifica task type: slack_message                 │
│  • Chama executeSlackMessage()                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│            Slack API (chat.postMessage)                 │
│  • Envia mensagem no canal                             │
└─────────────────────────────────────────────────────────┘
```

## Componentes

### 1. CronManager (src/scheduler/cron-manager.ts)
- Singleton que gerencia todos os jobs
- Persistência em SQLite (tabela `cron_jobs`)
- Integração com node-cron
- Auto-recovery: carrega jobs no startup

### 2. Tools (src/tools/scheduler.ts)
- `schedule_task`: Cria novo job
- `list_scheduled_tasks`: Lista jobs do usuário
- `cancel_scheduled_task`: Remove job

### 3. Database Schema
```sql
CREATE TABLE cron_jobs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  expression TEXT NOT NULL,
  task_type TEXT NOT NULL,
  task_data TEXT NOT NULL,  -- JSON
  enabled INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  last_run TEXT,
  next_run TEXT,
  user_id TEXT,
  metadata TEXT  -- JSON
);
```

## Teste Manual

### 1. Rodar o script de teste
```bash
npm run dev  # Terminal 1 (inicia o Ulf)

# Terminal 2
tsx test-scheduler.ts
```

### 2. Verificar banco de dados
```bash
sqlite3 data/ulf.db
> SELECT id, name, expression, enabled FROM cron_jobs;
> .quit
```

### 3. Ver logs
```bash
tail -f logs/ulf.log | grep -E "(CronManager|Scheduler)"
```

## Persistência e Confiabilidade

✅ **Jobs sobrevivem a reinícios**: Salvos em SQLite
✅ **Auto-recovery**: Jobs carregados no startup
✅ **Graceful shutdown**: Jobs parados corretamente
✅ **One-time jobs**: Auto-desabilitados após executar
✅ **Error handling**: Falhas não crasheiam o sistema
✅ **Logging completo**: Todas operações logadas

## Próximos Passos

### Features Futuras
- [ ] Thread_ts support: Responder no mesmo thread
- [ ] Timezone support: Permitir usuários escolherem fuso
- [ ] Pause/Resume: Pausar e resumir jobs
- [ ] Job history: Ver histórico de execuções
- [ ] Web UI: Interface para gerenciar jobs
- [ ] Webhooks: Trigger jobs via HTTP
- [ ] Conditions: Executar jobs condicionalmente

### Integrações Possíveis
- [ ] Discord reminders
- [ ] Telegram reminders
- [ ] Email notifications
- [ ] GitHub issue reminders
- [ ] Calendar sync

## Troubleshooting

### Job não executou
1. Verificar se está enabled: `SELECT enabled FROM cron_jobs WHERE id='...'`
2. Verificar logs: `grep "CronManager" logs/ulf.log`
3. Verificar expressão cron: Use https://crontab.guru/

### Mensagem não chegou no Slack
1. Verificar se bot tem permissão `chat:write`
2. Verificar se bot está no canal
3. Verificar logs de Slack: `grep "SlackMessaging" logs/ulf.log`

### Jobs duplicados
Se múltiplos jobs estão sendo criados:
1. Limpar banco: `DELETE FROM cron_jobs WHERE user_id='...'`
2. Reiniciar Ulf

## Performance

- SQLite handle leitura/escrita até 50k jobs
- node-cron handle milhares de jobs simultâneos
- Memória: ~1KB por job ativo
- CPU: Negligível (cron é event-driven)

## Segurança

- ✅ Jobs isolados por user_id
- ✅ Validação de expressões cron
- ✅ Sanitização de inputs
- ✅ Rate limiting futuro (TODO)
