# HEARTBEAT.md

Checklist de execução periódica. O bot executa essas verificações automaticamente.

---

## Quando Executar

- **Intervalo:** A cada 30 minutos (configurável)
- **Silencioso:** Se tudo OK, retorna `HEARTBEAT_OK` (sem notificar)
- **Alerta:** Se algo precisa atenção, notifica o owner

---

## Checklist de Verificações

### 1. Sistema de Saúde
- [ ] Redis está conectado?
- [ ] Database está acessível?
- [ ] Disk space OK? (>10% livre)
- [ ] Memory usage OK? (<80%)

### 2. Sessões Ativas
- [ ] Há sessões ativas que precisam de flush?
- [ ] Há sessões idle >1h que podem ser limpas?
- [ ] Garbage collection rodou recentemente?

### 3. Memória
- [ ] Daily log de hoje existe?
- [ ] Daily log tem eventos registrados?
- [ ] Curadoria de MEMORY.md necessária? (>24h desde última)
- [ ] Há logs antigos para arquivar? (>30 dias)

### 4. Comunicação
- [ ] Há menções não respondidas? (Discord, Slack)
- [ ] Há mensagens em DM não lidas?
- [ ] Há notificações pendentes?

### 5. APIs e Quotas
- [ ] Brave Search API: Quota OK? (<80% uso)
- [ ] OpenAI API: Quota OK?
- [ ] ElevenLabs API: Quota OK?
- [ ] Replicate API: Quota OK?
- [ ] Anthropic API: Quota OK?

### 6. Background Jobs
- [ ] Queue system está rodando?
- [ ] Há jobs failed na dead letter queue?
- [ ] Cron jobs estão agendados corretamente?

### 7. Infraestrutura (GKE)
- [ ] Pod está healthy?
- [ ] CPU usage OK? (<70%)
- [ ] Memory usage OK? (<80%)
- [ ] Restarts recentes? (últimas 24h)

---

## Ações Automáticas

### Se tudo OK
- Retornar `HEARTBEAT_OK`
- Não notificar (silencioso)
- Continuar monitorando

### Se algo precisa atenção
- Executar ação corretiva quando possível:
  - Flush de sessões idle
  - Curadoria de memória
  - Limpeza de logs antigos
  - Retry de jobs failed

### Se algo está crítico
- Notificar owner via DM Discord:
  - Disk space <10%
  - Memory >90%
  - Redis desconectado
  - API quota >90%
  - Restarts frequentes

---

## Formato de Resposta

### HEARTBEAT_OK (tudo normal)
```
HEARTBEAT_OK
```

### HEARTBEAT_ACTION (algo foi feito)
```
HEARTBEAT_ACTION:
- Flushed 3 idle sessions
- Curated memory (7 insights extracted)
- Cleaned 2 old logs (>30 days)
```

### HEARTBEAT_ALERT (requer atenção)
```
HEARTBEAT_ALERT:
⚠️ Disk space: 8% (critical)
⚠️ Redis disconnected
✅ Auto-reconnect attempted
```

---

## Configuração

### Variáveis de Ambiente

```bash
# Heartbeat
HEARTBEAT_ENABLED=true
HEARTBEAT_INTERVAL_MINUTES=30

# Thresholds
HEARTBEAT_DISK_THRESHOLD=10    # % mínimo livre
HEARTBEAT_MEMORY_THRESHOLD=80  # % máximo usado
HEARTBEAT_CPU_THRESHOLD=70     # % máximo usado
HEARTBEAT_API_QUOTA_THRESHOLD=80  # % máximo usado

# Notificações
HEARTBEAT_NOTIFY_DISCORD=true
HEARTBEAT_DISCORD_DM_USER_ID=375567912706416642  # Lucas
```

---

## Logs

Heartbeat actions são registrados em:
- Daily log (`memory/YYYY-MM-DD.md` - seção System Events)
- Console output (`[Heartbeat] ...`)
- MEMORY.md (se algo importante acontecer)

---

## Frequência de Verificações

| Item | Check | Ação se Falhar |
|------|-------|----------------|
| Redis | 30min | Auto-reconnect |
| Disk | 30min | Alert se <10% |
| Memory | 30min | Alert se >90% |
| Sessions | 30min | Auto-flush idle |
| Curadoria | 24h | Auto-curate |
| API Quotas | 30min | Alert se >80% |
| Health | 30min | Report status |

---

## Prioridades

1. **Crítico** (alertar imediatamente):
   - Disk space <10%
   - Redis desconectado e reconnect falhou
   - Memory >90%
   - API quota >95%

2. **Importante** (ação automática):
   - Sessions idle >1h → Flush
   - Memory curation >24h → Curate
   - Logs antigos >30d → Archive

3. **Informativo** (log apenas):
   - Queue jobs processados
   - Garbage collection executado
   - Daily log criado

---

## Exemplo de Execução

```typescript
// A cada 30 minutos
const heartbeat = await executeHeartbeat();

if (heartbeat.status === 'ok') {
  return 'HEARTBEAT_OK';
}

if (heartbeat.status === 'action') {
  await logSystemEvent('Heartbeat actions', heartbeat.actions.join(', '));
  return `HEARTBEAT_ACTION: ${heartbeat.actions.join(', ')}`;
}

if (heartbeat.status === 'alert') {
  await notifyOwner(heartbeat.alerts);
  return `HEARTBEAT_ALERT: ${heartbeat.alerts.join(', ')}`;
}
```

---

**Mantra:** "Monitor silenciosamente, alertar inteligentemente, agir automaticamente."
