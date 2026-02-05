# 📋 Core Branch - Task List

Tasks para `feature/core-architecture` (Claude #2)

---

## 🔥 Alta Prioridade

### 1. Redis Caching Layer
**Agente:** performance-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~5 horas
**Prioridade:** 🔴 CRÍTICA

**Descrição:**
Implementar caching layer com Redis como primary e in-memory como fallback.

**Subtasks:**
- [ ] Setup Redis connection
- [ ] Criar `src/core/cache.ts` com interface unificada
- [ ] Implementar Redis cache provider
- [ ] Implementar in-memory cache fallback
- [ ] Cache invalidation strategy
- [ ] TTL configuration per cache type
- [ ] Adicionar cache middleware para API responses
- [ ] Integrar com database queries
- [ ] Benchmark e medir improvement
- [ ] Documentar em `docs/architecture/caching.md`

**Arquivos a editar:**
- `src/core/cache.ts` (criar)
- `src/utils/cache.ts` (melhorar ou deprecar)
- `src/persistence/database.ts` (adicionar cache)
- `package.json` (adicionar redis como dep)
- `.env.example` (adicionar REDIS_URL)

**Impacto esperado:**
- 70-80% reduction em query time para dados frequently accessed
- Reduced database load
- Better scalability

**Referências:**
- https://redis.io/docs/
- https://github.com/redis/node-redis

---

### 2. Tool Registry Enhancements
**Agente:** tool-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~4 horas
**Prioridade:** 🔴 CRÍTICA

**Descrição:**
Adicionar versionamento, validation e dependency resolution para tools.

**Subtasks:**
- [ ] Adicionar tool versioning (semver)
- [ ] Tool dependency resolution
- [ ] JSON Schema validation para tool configs
- [ ] Auto-discovery de tools
- [ ] Tool compatibility checks
- [ ] Deprecation warnings
- [ ] Tool registry API endpoints
- [ ] Documentar em `docs/architecture/tool-registry.md`

**Arquivos a editar:**
- `src/core/tool-registry.ts` (major enhancement)
- `src/tools/definitions.ts` (adicionar versioning)
- `src/tools/registry/*.ts` (atualizar para novo schema)

**Impacto esperado:**
- Better tool management
- Easier to add new tools
- Prevent breaking changes

---

## 💡 Média Prioridade

### 3. Workflow Conditional Branching
**Agente:** workflow-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~4 horas

**Descrição:**
Implementar conditional branching no workflow engine (if/else, switch).

**Subtasks:**
- [ ] Design conditional syntax
- [ ] Implementar if/else logic
- [ ] Implementar switch/case logic
- [ ] Condition evaluation engine
- [ ] Testar com exemplos complexos
- [ ] Documentar syntax
- [ ] Criar workflow examples usando conditionals

**Arquivos a editar:**
- `src/core/workflow-manager.ts` (major feature)
- `examples/workflows/conditional-example.yaml` (criar)
- `docs/workflows/conditional-branching.md` (criar)

---

### 4. Parallel Workflow Execution
**Agente:** workflow-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~4 horas

**Descrição:**
Permitir steps de workflow rodarem em paralelo.

**Subtasks:**
- [ ] Design parallel execution syntax
- [ ] Implementar worker pool
- [ ] Resource management (max concurrent steps)
- [ ] Error handling em parallel steps
- [ ] Wait for all/any completion
- [ ] Performance optimization
- [ ] Criar examples

**Arquivos a editar:**
- `src/core/workflow-manager.ts` (major feature)
- `examples/workflows/parallel-example.yaml` (criar)

---

### 5. API Rate Limiting Per Endpoint
**Agente:** security-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~3 horas

**Descrição:**
Implementar rate limiting granular por endpoint.

**Subtasks:**
- [ ] Design rate limit configuration
- [ ] Per-endpoint rate limits
- [ ] Per-user rate limits
- [ ] Rate limit headers (X-RateLimit-*)
- [ ] Rate limit exceeded responses
- [ ] Admin override capability
- [ ] Metrics para rate limiting

**Arquivos a editar:**
- `src/security/rate-limiter.ts` (enhance)
- `src/index.ts` (apply middleware)
- `.env.example` (rate limit configs)

---

### 6. Prometheus Metrics Endpoint
**Agente:** monitoring-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~3 horas

**Descrição:**
Expor métricas em formato Prometheus.

**Subtasks:**
- [ ] Setup prom-client
- [ ] Create metrics collectors
- [ ] Expose /metrics endpoint
- [ ] Add custom metrics (tool execution, cache hits, etc)
- [ ] Grafana dashboard config (opcional)
- [ ] Documentation

**Arquivos a editar:**
- `src/core/metrics.ts` (enhance)
- `src/index.ts` (add /metrics endpoint)
- `package.json` (add prom-client)
- `docs/monitoring/prometheus.md` (criar)

---

### 7. Queue System (Bull/BullMQ)
**Agente:** performance-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~5 horas

**Descrição:**
Implementar message queue para async jobs.

**Subtasks:**
- [ ] Setup Bull/BullMQ
- [ ] Create job queue
- [ ] Job scheduling
- [ ] Priority queues
- [ ] Dead letter queue
- [ ] Job retry logic
- [ ] Queue monitoring dashboard
- [ ] Integration com workflow engine

**Arquivos a editar:**
- `src/core/queue.ts` (criar)
- `src/core/workflow-manager.ts` (integrate)
- `package.json` (add bull/bullmq)

---

## 🌟 Baixa Prioridade

### 8. OpenTelemetry Tracing
**Agente:** monitoring-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~4 horas

**Descrição:**
Implementar distributed tracing com OpenTelemetry.

**Subtasks:**
- [ ] Setup OpenTelemetry SDK
- [ ] Auto-instrumentation
- [ ] Custom spans
- [ ] Trace context propagation
- [ ] Export to Jaeger/Zipkin
- [ ] Performance overhead analysis

---

### 9. Database Migration System
**Agente:** performance-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~3 horas

**Descrição:**
Implementar sistema de migrations para database schema.

**Subtasks:**
- [ ] Migration framework (knex, umzug, etc)
- [ ] Migration file structure
- [ ] Up/down migrations
- [ ] Seed data capability
- [ ] Migration CLI commands

---

### 10. More Workflow Examples
**Agente:** workflow-specialist
**Status:** ⏳ Pendente
**Estimativa:** ~2 horas

**Descrição:**
Criar mais workflow examples para casos de uso comuns.

**Subtasks:**
- [ ] Code review workflow
- [ ] Testing workflow
- [ ] Documentation generation workflow
- [ ] Analytics/reporting workflow
- [ ] Backup workflow

---

## ✅ Completado

### Hybrid Architecture (Phases 1-3) ✓
**Agente:** Múltiplos
**Completado em:** 2026-02-03

**O que foi feito:**
- ✅ Phase 1: Output Parser + Retry Engine
- ✅ Phase 2: Tool Registry + Workflow Manager
- ✅ Phase 3: Observability & Telemetry
- ✅ 4 Workflow examples
- ✅ Comprehensive tests
- ✅ Integration documentation

---

## 📊 Resumo

| Prioridade | Total | Pendente | Em Progresso | Completo |
|------------|-------|----------|--------------|----------|
| Alta | 2 | 2 | 0 | 0 |
| Média | 5 | 5 | 0 | 0 |
| Baixa | 3 | 3 | 0 | 0 |
| **TOTAL** | **10** | **10** | **0** | **1** |

---

## 🎯 Recomendação de Próxima Task

**Sugestão:** Começar com **Redis Caching Layer** (Alta Prioridade, Crítica)

**Por quê:**
1. Maior impacto em performance (70-80% improvement)
2. Foundation para outras features (queue system usa Redis)
3. Relatively self-contained (não afeta muito código existente)
4. Immediate user benefit

**Como começar:**
```bash
# 1. Checkout branch
git checkout feature/core-architecture

# 2. Ativar agente
echo "$(date): Iniciando performance-specialist - Redis caching" >> coordination/sync/messages.md

# 3. Instalar deps
npm install redis ioredis

# 4. Ler código existente
cat src/utils/cache.ts
cat src/persistence/database.ts

# 5. Começar implementação
# Criar src/core/cache.ts com interface unificada
```

---

## 📋 Dependências entre Tasks

```
Redis Caching (1)
  └─> Queue System (7) - Queue usa Redis

Tool Registry (2)
  └─> Workflow Engine - Workflows usam tools

Conditional Branching (3) + Parallel Execution (4)
  └─> More Workflow Examples (10)

Prometheus Metrics (6)
  └─> OpenTelemetry (8) - Complementares
```

**Ordem recomendada:**
1. Redis Caching (1)
2. Tool Registry (2)
3. Rate Limiting (5)
4. Conditional Branching (3)
5. Parallel Execution (4)
6. Prometheus Metrics (6)
7. Queue System (7)
8. OpenTelemetry (8)
9. Database Migrations (9)
10. More Examples (10)

---

**Última atualização:** 2026-02-05
**Tasks total:** 11 (1 completa, 10 pendentes)
**Próxima prioridade:** Redis Caching Layer (CRÍTICA)
