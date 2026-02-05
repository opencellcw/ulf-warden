# 🤖 Core Branch - Agentes Especializados

Agentes especializados para trabalho na branch `feature/core-architecture`.

---

## 1. performance-specialist

**Especialidade:** Caching, optimization, profiling, database tuning

### Responsabilidades
- Implementar caching layers (Redis, in-memory)
- Query optimization
- Performance profiling e benchmarking
- Memory optimization
- Database indexing

### Skills
- Redis expert
- Database optimization
- Profiling tools (Node.js profiler, clinic.js)
- Caching strategies (LRU, TTL, invalidation)
- Performance metrics

### Status Atual
⏳ **ALTA PRIORIDADE** - Aguardando Claude #2

### Próximas Tarefas
1. Implementar Redis caching layer
2. Adicionar in-memory cache como fallback
3. Otimizar database queries
4. Benchmark código crítico
5. Adicionar query result caching

### Arquivos Relacionados
- `src/core/cache.ts` (criar)
- `src/utils/cache.ts` (existe, pode melhorar)
- `src/persistence/database.ts`
- `src/core/metrics.ts`

### Como Invocar
```bash
# Para trabalho de performance:
# 1. Profile código atual
node --prof dist/index.js
node --prof-process isolate-*.log

# 2. Identificar bottlenecks
# 3. Implementar caching
# 4. Benchmark resultados
```

---

## 2. tool-specialist

**Especialidade:** Tool registry, tool development, tool validation

### Responsabilidades
- Tool registry enhancements
- Criar novos tools
- Tool versioning
- Tool dependency resolution
- Tool validation schemas

### Skills
- Tool architecture design
- JSON Schema validation
- Dependency management
- API design
- Tool testing

### Status Atual
⏳ **ALTA PRIORIDADE** - Aguardando Claude #2

### Próximas Tarefas
1. Adicionar versionamento de tools
2. Tool dependency resolution
3. Tool validation schema
4. Auto-discovery de tools
5. Tool marketplace/registry API

### Arquivos Relacionados
- `src/core/tool-registry.ts`
- `src/tools/` (vários tools)
- `src/tools/registry/` (tool implementations)
- `src/security/tool-executor.ts`

### Como Invocar
```bash
# Para trabalho com tools:
cat src/core/tool-registry.ts
cat src/tools/definitions.ts
ls -la src/tools/registry/

# Implementar melhorias conforme prioridade
```

---

## 3. workflow-specialist

**Especialidade:** Workflow engine, orchestration, state management

### Responsabilidades
- Workflow engine improvements
- Conditional branching
- Parallel execution
- Error recovery & retry logic
- Workflow state persistence

### Skills
- State machine design
- Orchestration patterns
- DAG (Directed Acyclic Graph) design
- Error handling strategies
- Workflow testing

### Status Atual
⏳ **MÉDIA PRIORIDADE** - Aguardando Claude #2

### Próximas Tarefas
1. Conditional branching implementation
2. Parallel step execution
3. Error recovery mechanisms
4. Workflow state persistence
5. Workflow visualization

### Arquivos Relacionados
- `src/core/workflow-manager.ts`
- `src/workflows/` (workflow definitions)
- `examples/workflows/` (workflow examples)
- `docs/architecture/workflows.md`

### Como Invocar
```bash
# Para trabalho com workflows:
cat src/core/workflow-manager.ts
ls -la examples/workflows/
cat docs/architecture/HYBRID_IMPLEMENTATION_GUIDE.md
```

---

## 4. security-specialist

**Especialidade:** Security, rate limiting, validation, sanitization

### Responsabilidades
- Rate limiting improvements
- Input validation
- Security scanning
- Tool execution sandboxing
- Secrets management

### Skills
- Security best practices
- Rate limiting algorithms
- Input sanitization
- JWT/OAuth
- Security auditing

### Status Atual
⏳ **MÉDIA PRIORIDADE** - Aguardando Claude #2

### Próximas Tarefas
1. Implement per-endpoint rate limiting
2. Enhanced input validation
3. Tool execution timeout improvements
4. Security audit automation
5. Secrets scanning enhancements

### Arquivos Relacionados
- `src/security/` (multiple security modules)
- `src/security/rate-limiter.ts`
- `src/security/sanitizer.ts`
- `src/security/vetter.ts`
- `auditor/` (security auditor)

### Como Invocar
```bash
# Para trabalho de security:
cat src/security/rate-limiter.ts
ls -la src/security/
cat auditor/README.md
```

---

## 5. monitoring-specialist

**Especialidade:** Observability, metrics, logging, tracing

### Responsabilidades
- Metrics collection (Prometheus)
- Structured logging improvements
- Tracing (OpenTelemetry)
- Health check endpoints
- Alerting

### Skills
- Prometheus metrics
- OpenTelemetry
- Structured logging (Winston, Pino)
- Grafana dashboards
- APM tools

### Status Atual
⏳ **MÉDIA PRIORIDADE** - Aguardando Claude #2

### Próximas Tarefas
1. Prometheus metrics endpoint
2. OpenTelemetry tracing
3. Structured logging improvements
4. Health check dashboard
5. Alert rules configuration

### Arquivos Relacionados
- `src/core/telemetry.ts`
- `src/core/metrics.ts`
- `src/utils/metrics.ts`
- `src/logger.ts`

### Como Invocar
```bash
# Para trabalho de monitoring:
cat src/core/telemetry.ts
cat src/core/metrics.ts
cat src/logger.ts
```

---

## 🎯 Workflow de Uso dos Agentes

### Escolher Agente Correto
```bash
# Para performance/caching:
usar performance-specialist

# Para tools:
usar tool-specialist

# Para workflows:
usar workflow-specialist

# Para security:
usar security-specialist

# Para monitoring:
usar monitoring-specialist
```

### Exemplo: Implementar Caching Layer

```bash
# 1. Ativar performance-specialist
echo "Ativando performance-specialist para caching layer"

# 2. Ler contexto necessário
cat src/utils/cache.ts
cat src/persistence/database.ts

# 3. Planejar implementação
# - Redis como cache principal
# - In-memory como fallback
# - Cache invalidation strategy
# - TTL configuration

# 4. Implementar
# - Criar src/core/cache.ts
# - Integrar com database.ts
# - Adicionar cache middleware

# 5. Testar e benchmark
npm run test
npm run benchmark

# 6. Atualizar status
echo "$(date): performance-specialist completou caching layer" >> coordination/sync/messages.md
```

---

## 📊 Métricas de Agentes

| Agente | Tasks Completadas | Tasks Ativas | Prioridade |
|--------|------------------|--------------|------------|
| performance-specialist | 0 | 0 | 🔴 ALTA |
| tool-specialist | 0 | 0 | 🔴 ALTA |
| workflow-specialist | 0 | 0 | 🟡 MÉDIA |
| security-specialist | 0 | 0 | 🟡 MÉDIA |
| monitoring-specialist | 0 | 0 | 🟡 MÉDIA |

---

## 🎯 Priorização

### Fase 1 (Alta Prioridade)
1. **performance-specialist**: Caching layer
2. **tool-specialist**: Tool registry enhancements

### Fase 2 (Média Prioridade)
3. **workflow-specialist**: Conditional branching
4. **security-specialist**: Rate limiting per endpoint
5. **monitoring-specialist**: Prometheus metrics

### Fase 3 (Baixa Prioridade)
- Database optimizations
- More workflow examples
- Advanced monitoring features

---

## 🔄 Atualização de Status

Quando um agente completa trabalho:

```bash
# 1. Atualizar este arquivo
# Incrementar "Tasks Completadas"
# Mudar status se necessário

# 2. Adicionar mensagem
echo "$(date): [agente] completou [task]" >> coordination/sync/messages.md

# 3. Atualizar coordination/status.md
# Atualizar progresso geral
```

---

**Última atualização:** 2026-02-05
**Total de agentes:** 5
**Agentes ativos:** 0 (aguardando Claude #2)
**Prioridade máxima:** performance-specialist, tool-specialist
