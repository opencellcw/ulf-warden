# Rex Evolution - Fase 4: Proatividade ✅

## Objetivo

Implementar sistema proativo que:
- Executa verificações periódicas (heartbeat)
- Notifica owner sobre eventos importantes
- Monitora saúde do sistema automaticamente
- Age autonomamente quando possível

---

## ✅ Implementado (Fase 4)

### 1. HEARTBEAT.md - Checklist Proativo

**Arquivo:** `workspace/HEARTBEAT.md`

**Checklist de verificações:**
- Sistema de Saúde (Redis, Database, Disk, Memory)
- Sessões Ativas (flush, GC)
- Memória (daily logs, curadoria)
- Comunicação (menções não respondidas)
- APIs e Quotas (Brave, OpenAI, etc)
- Background Jobs (queue system, cron)
- Infraestrutura (GKE health)

**Respostas possíveis:**
- `HEARTBEAT_OK` - Tudo normal (silencioso)
- `HEARTBEAT_ACTION` - Algo foi feito automaticamente
- `HEARTBEAT_ALERT` - Requer atenção (notifica owner)

**Exemplo:**
```markdown
### 1. Sistema de Saúde
- [ ] Redis está conectado?
- [ ] Database está acessível?
- [ ] Disk space OK? (>10% livre)
- [ ] Memory usage OK? (<80%)
```

---

### 2. Heartbeat Manager

**Arquivo:** `src/proactive/heartbeat-manager.ts`

**Funcionalidades:**
- Execução periódica (30min default, configurável)
- Verifica checklist do HEARTBEAT.md
- Executa ações corretivas automaticamente
- Registra resultados em daily logs
- Notifica owner se necessário

**Checks implementados:**

#### System Health
```typescript
- Redis connection: Check + auto-reconnect
- Memory usage: Warning >80%, Critical >90%
- Disk space: Warning <20%, Critical <10%
- Database: Accessibility check
```

#### Sessions
```typescript
- Active sessions count
- Auto-flush if needed
- Garbage collection verification
```

#### Memory
```typescript
- Today's daily log exists?
- Curation needed? (>24h)
- Old logs to archive? (>30d)
```

#### APIs
```typescript
- Anthropic API key configured?
- Optional APIs present?
- Quota monitoring (basic)
```

**Configuração:**
```bash
# .env
HEARTBEAT_ENABLED=true
HEARTBEAT_INTERVAL_MINUTES=30
HEARTBEAT_DISK_THRESHOLD=10
HEARTBEAT_MEMORY_THRESHOLD=80
HEARTBEAT_API_QUOTA_THRESHOLD=80
```

**Uso:**
```typescript
import { heartbeatManager } from './proactive/heartbeat-manager';

// Start periodic execution
heartbeatManager.start();

// Manual execution
const result = await heartbeatManager.execute();

// Check status
const status = heartbeatManager.getStatus();
```

---

### 3. Notification Manager

**Arquivo:** `src/proactive/notification-manager.ts`

**Funcionalidades:**
- Envia notificações via Discord DM
- Rate limiting (não spamma owner)
- Prioridades: low, medium, high, critical
- História de notificações (deduplicação)

**Prioridades:**
- **Low** (ℹ️): Informação geral
- **Medium** (⚠️): Atenção recomendada
- **High** (🔴): Ação necessária
- **Critical** (🚨): Ação imediata

**Rate Limiting:**
- Mesma notificação: 60min cooldown
- Previne spam de alertas repetidos
- Cleanup automático (>24h)

**Uso:**
```typescript
import { notificationManager } from './proactive/notification-manager';

// Set Discord client
notificationManager.setDiscordClient(discordClient);

// Send notification
await notificationManager.notify({
  title: 'Disk Space Low',
  message: 'Only 8% free space remaining',
  priority: 'high',
  timestamp: new Date().toISOString()
});

// Shortcuts
await notificationManager.notifyCritical('Redis Down', 'Connection failed');
await notificationManager.notifyAlert('Memory High', '85% usage', 'medium');
await notificationManager.notifyInfo('Curation Complete', '5 insights extracted');
```

**Exemplo de DM:**
```
🔴 **Disk Space Low**

Only 8% free space remaining.
Consider cleaning up old files or expanding storage.
```

---

### 4. Health Monitor

**Arquivo:** `src/proactive/health-monitor.ts`

**Funcionalidades:**
- Health checks avançados
- Métricas detalhadas
- Detecção de issues críticos
- Notificações automáticas

**Checks:**

#### Redis
- Connection status
- Auto-reconnect if down

#### Disk
- Space usage
- Warning <20%, Critical <10%

#### Memory
- Usage percentage
- Warning >80%, Critical >90%

#### Database
- File exists and accessible
- Non-empty check

#### APIs
- Anthropic (required)
- OpenAI (optional)
- Brave (optional)
- Others (optional)

**Resultado:**
```typescript
interface HealthStatus {
  healthy: boolean;
  checks: {
    redis: boolean;
    disk: boolean;
    memory: boolean;
    database: boolean;
    apis: boolean;
  };
  metrics: {
    memoryUsagePercent: number;
    diskFreePercent?: number;
    redisConnected: boolean;
    uptime: number;
  };
  warnings: string[];
  errors: string[];
}
```

**Uso:**
```typescript
import { healthMonitor } from './proactive/health-monitor';

// Full health check
const status = await healthMonitor.check();

// System info
const info = healthMonitor.getSystemInfo();

// Format status
const formatted = healthMonitor.formatStatus(status);
console.log(formatted);
```

**Saída formatada:**
```
**System Health:** ✅ Healthy

**Checks:**
✅ redis: OK
✅ disk: OK
✅ memory: OK
✅ database: OK
✅ apis: OK

**Metrics:**
Memory: 45.2%
Disk Free: 35.8%
Redis: Connected
Uptime: 1234min

**Warnings:**
⚠️ Memory usage high: 78.5%
```

---

## Arquitetura do Sistema Proativo

```
┌─────────────────────────────────────────────────────┐
│              Heartbeat Manager                       │
│  (Executa a cada 30min)                             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ├──> Health Monitor
                       │    - Check Redis, Disk, Memory
                       │    - Check Database, APIs
                       │    - Return status + metrics
                       │
                       ├──> Session Manager
                       │    - Check active sessions
                       │    - Auto-flush if needed
                       │
                       ├──> Memory Curator
                       │    - Check if curation needed
                       │    - Auto-curate if >24h
                       │
                       └──> Notification Manager
                            - Send alerts if critical
                            - Rate limit notifications
                            - Discord DM to owner
```

---

## Fluxo de Execução

### 1. Heartbeat Periódico

```typescript
// Startup (src/index.ts)
heartbeatManager.start();

// A cada 30min
const result = await heartbeatManager.execute();

if (result.status === 'ok') {
  // Tudo OK, silencioso
  return 'HEARTBEAT_OK';
}

if (result.status === 'action') {
  // Ações executadas
  log.info('Actions:', result.actions);
  dailyLogger.logSystemEvent('Heartbeat', result.actions.join(', '));
  return `HEARTBEAT_ACTION: ${result.actions.join(', ')}`;
}

if (result.status === 'alert') {
  // Alertas críticos
  notificationManager.notifyAlert('Heartbeat Alert', result.alerts.join('\n'));
  return `HEARTBEAT_ALERT: ${result.alerts.join(', ')}`;
}
```

### 2. Notificações Inteligentes

```typescript
// Critical issue detected
if (diskFreePercent < 10) {
  await notificationManager.notifyCritical(
    'Disk Space Critical',
    `Only ${diskFreePercent.toFixed(1)}% free`
  );
}

// Rate limiting prevents spam
// Se mesma notificação foi enviada <60min atrás, skip
```

### 3. Health Monitoring Contínuo

```typescript
// Heartbeat chama health monitor
const health = await healthMonitor.check();

if (!health.healthy) {
  // Log errors
  health.errors.forEach(err => log.error(err));

  // Notify if critical
  if (health.errors.some(e => e.includes('critical'))) {
    await notificationManager.notifyCritical(
      'System Health Critical',
      health.errors.join('\n')
    );
  }
}
```

---

## Benefícios

### 1. **Proatividade**
- Bot age autonomamente sem precisar de comando
- Detecta problemas antes de se tornarem críticos
- Manutenção automática (flush sessions, curate memory)

### 2. **Monitoramento Contínuo**
- Health checks a cada 30min
- Métricas de sistema (disk, memory, Redis)
- API quotas e database checks

### 3. **Notificações Inteligentes**
- Owner é notificado apenas quando necessário
- Rate limiting previne spam
- Prioridades claras (low, medium, high, critical)

### 4. **Ações Automáticas**
- Flush de sessions idle
- Curadoria de memória (>24h)
- Reconnect Redis se desconectado
- Limpeza de logs antigos

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

### Integração no Startup

```typescript
// src/index.ts (depois de inicializar handlers)

// Set Discord client for notifications
if (handlers.discord) {
  notificationManager.setDiscordClient(handlers.discord);
}

// Start heartbeat
if (process.env.HEARTBEAT_ENABLED === 'true') {
  heartbeatManager.start();
  log.info('Heartbeat system started');
}

// Start memory curation (24h)
memoryCurator.startAutoCuration();
```

---

## Arquivos Criados

### Novos Módulos
- `workspace/HEARTBEAT.md` (checklist, 200 linhas)
- `src/proactive/heartbeat-manager.ts` (500 linhas)
- `src/proactive/notification-manager.ts` (300 linhas)
- `src/proactive/health-monitor.ts` (400 linhas)
- `docs/rex-evolution-phase4.md` (este documento)

---

## Métricas

### Fase 4 Stats
- **Files criados:** 4 novos módulos
- **Total linhas:** ~1600 linhas
- **Features:** Heartbeat, Notifications, Health Monitor
- **Build:** ✅ Passou sem erros

### Overall Stats (Todas as Fases)
| Fase | Files | Linhas | Features |
|------|-------|--------|----------|
| 1 - Core | 6 | ~1500 | Reações, NO_REPLY, Contacts, Memory básica |
| 2 - Personalidade | 4 | ~2000 | SOUL, IDENTITY, USER, TOOLS |
| 3 - Memória | 4 | ~1500 | Daily logs, Curator, Loader, Search |
| 4 - Proatividade | 4 | ~1600 | Heartbeat, Notifications, Health |
| **Total** | **18** | **~6600** | **Todas as features Rex** |

---

## Testes Recomendados

### 1. Heartbeat Manual

```typescript
import { heartbeatManager } from './src/proactive/heartbeat-manager';

// Execute once
const result = await heartbeatManager.execute();
console.log('Status:', result.status);
console.log('Actions:', result.actions);
console.log('Alerts:', result.alerts);
```

### 2. Health Check

```typescript
import { healthMonitor } from './src/proactive/health-monitor';

const health = await healthMonitor.check();
console.log(healthMonitor.formatStatus(health));
```

### 3. Notificações

```typescript
import { notificationManager } from './src/proactive/notification-manager';

// Set client first
notificationManager.setDiscordClient(discordClient);

// Send test notification
await notificationManager.notifyInfo('Test', 'This is a test notification');
```

---

## Próximos Passos

### 📦 Deploy Completo (Todas as 4 Fases)

```bash
npm run build
gcloud builds submit --config cloudbuild.yaml
kubectl rollout restart deployment/ulf-warden-agent -n agents
```

**O que vai testar:**
- ✅ Fase 1: Reações, NO_REPLY, Trust levels
- ✅ Fase 2: Personalidade brasileira, SOUL, IDENTITY, USER, TOOLS
- ✅ Fase 3: Memory search, recall, daily logs, curadoria
- ✅ Fase 4: Heartbeat, notificações, health monitoring

---

## Exemplo de Heartbeat em Ação

### Execução Normal (HEARTBEAT_OK)
```
[Heartbeat] Starting execution
[Heartbeat] Redis: Connected
[Heartbeat] Memory: 45.2% (OK)
[Heartbeat] Disk: 35.8% free (OK)
[Heartbeat] Sessions: 2 active
[Heartbeat] Memory curator: Last run 2h ago (OK)
[Heartbeat] Result: HEARTBEAT_OK
```

### Execução com Ações (HEARTBEAT_ACTION)
```
[Heartbeat] Starting execution
[Heartbeat] Redis: Connected
[Heartbeat] Memory: 78.5% (high but OK)
[Heartbeat] Disk: 35.8% free (OK)
[Heartbeat] Sessions: 5 active (flushing...)
[Heartbeat] Memory curator: Last run 26h ago (curating...)
[Heartbeat] Result: HEARTBEAT_ACTION
Actions:
- Flushed 5 active sessions
- Curated memory (3 insights extracted)
```

### Execução com Alertas (HEARTBEAT_ALERT)
```
[Heartbeat] Starting execution
[Heartbeat] Redis: Disconnected (reconnecting...)
[Heartbeat] Memory: 92.1% (CRITICAL!)
[Heartbeat] Disk: 8.3% free (CRITICAL!)
[Heartbeat] Result: HEARTBEAT_ALERT
Alerts:
⚠️ Redis disconnected
⚠️ Memory usage critical: 92.1%
⚠️ Disk space critical: 8.3% free

→ Discord DM sent to owner
```

---

**Status:** ✅ Fase 4 Completa
**Todas as 4 fases:** ✅ Implementadas
**Próximo:** Deploy completo para produção!
