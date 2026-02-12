# 🎯 OpenCell - Plano de Ação Executável

**Data de Criação:** 12 de Fevereiro de 2025  
**Objetivo:** Roadmap executável para próximos 90 dias  
**Prioridade:** Segurança → Performance → Features

---

## 🚨 AÇÕES CRÍTICAS (Hoje/Esta Semana)

### 1. Fix Vulnerabilidade do Axios 🔴
**Prioridade:** CRÍTICA  
**Tempo:** 30 minutos  
**Impacto:** Segurança

```bash
# Passo 1: Atualizar axios
npm audit fix

# Passo 2: Verificar
npm audit

# Passo 3: Testar
npm run build
npm test

# Passo 4: Commit
git add package*.json
git commit -m "fix(deps): resolve axios DoS vulnerability (CVE-GHSA-43fc-jf86-j433)"
git push
```

**Validação:** `npm audit` deve retornar 0 vulnerabilidades

---

### 2. Limpar Dependências Não Usadas 🟡
**Prioridade:** ALTA  
**Tempo:** 1 hora  
**Impacto:** Build speed, bundle size

```bash
# Passo 1: Remover pacotes
npm uninstall \
  @opentelemetry/instrumentation-express \
  @opentelemetry/instrumentation-http \
  @opentelemetry/instrumentation-redis-4 \
  ffmpeg-static \
  json5 \
  opusscript \
  semver \
  tweetnacl

# Passo 2: Verificar se build passa
npm run build

# Passo 3: Testar funcionamento básico
npm start
# (Testar bot no Discord/Slack)

# Passo 4: Commit
git add package*.json
git commit -m "chore(deps): remove unused dependencies (-50MB)"
git push
```

**Validação:** Build passa, bot funciona normalmente, `node_modules` ~50MB menor

---

### 3. Implementar Cache Redis para LLM 💰
**Prioridade:** ALTA  
**Tempo:** 6 horas  
**Impacto:** -40% custos, -80% latência em queries repetidas

```bash
# Passo 1: Criar arquivo de cache
cat > src/core/redis-cache.ts << 'EOF'
import Redis from 'ioredis';
import crypto from 'crypto';

export class RedisCache {
  private client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(this.hashKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.client.set(
        this.hashKey(key),
        JSON.stringify(value),
        'EX',
        ttl
      );
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async cacheLLMResponse(
    provider: string,
    model: string,
    messages: any[],
    response: any,
    ttl: number = 86400 // 24 hours
  ): Promise<void> {
    const cacheKey = `llm:${provider}:${model}:${JSON.stringify(messages)}`;
    await this.set(cacheKey, response, ttl);
  }

  async getCachedLLMResponse(
    provider: string,
    model: string,
    messages: any[]
  ): Promise<any | null> {
    const cacheKey = `llm:${provider}:${model}:${JSON.stringify(messages)}`;
    return await this.get(cacheKey);
  }

  async close(): Promise<void> {
    await this.client.quit();
  }
}

export const redisCache = new RedisCache();
EOF

# Passo 2: Integrar no Claude provider
# Editar src/llm/claude.ts - adicionar antes da chamada API:

# const cached = await redisCache.getCachedLLMResponse('claude', model, messages);
# if (cached) {
#   console.log('[Cache] Hit para mensagens:', messages.length);
#   return cached;
# }

# // Após receber resposta:
# await redisCache.cacheLLMResponse('claude', model, messages, response);

# Passo 3: Testar
npm run build
npm start

# Passo 4: Monitorar hit rate
# Adicionar ao dashboard Grafana
```

**Validação:**
- Primeira query: ~2s (miss)
- Segunda query idêntica: ~100ms (hit)
- Logs mostram "[Cache] Hit"

**ROI:** $500/mês economia em chamadas LLM duplicadas

---

## 📅 SEMANA 1 (12-19 Fevereiro)

### Dia 1-2: Segurança e Cleanup ✅
- [x] Fix axios vulnerability
- [x] Remover dependências não usadas
- [ ] Executar security audit completo
  ```bash
  npm run security-audit
  # Gerar relatório em docs/security/audit-2025-02-12.md
  ```

### Dia 3-4: Performance (Cache) 💰
- [ ] Implementar RedisCache
- [ ] Integrar no Claude provider
- [ ] Integrar no Moonshot provider
- [ ] Dashboard de hit rate

### Dia 5: Provider Gemini 🤖
- [ ] Implementar `src/llm/gemini.ts`
- [ ] Adicionar ao router (`src/llm/router.ts`)
- [ ] Testes básicos
- [ ] Documentação (`docs/gemini-provider.md`)

---

## 📅 SEMANA 2 (19-26 Fevereiro)

### Dia 1-2: Distributed Tracing 🔍
- [ ] Ativar arquivos do tracing
  ```bash
  git mv src/core/tracing.ts.disabled src/core/tracing.ts
  git mv src/core/tracing-middleware.ts.disabled src/core/tracing-middleware.ts
  ```
- [ ] Descomentar imports no `src/index.ts`
- [ ] Deploy Jaeger local
  ```bash
  docker run -d --name jaeger \
    -p 16686:16686 \
    -p 14268:14268 \
    jaegertracing/all-in-one:latest
  ```
- [ ] Configurar .env
  ```bash
  TRACING_ENABLED=true
  TRACING_EXPORTER=jaeger
  JAEGER_ENDPOINT=http://localhost:14268/api/traces
  ```

### Dia 3-4: Testes (Bot Factory) ✅
- [ ] Criar `tests/bot-factory/bot-creation.test.ts`
- [ ] Criar `tests/bot-factory/tool-whitelist.test.ts`
- [ ] Criar `tests/bot-factory/persona-formatter.test.ts`
- [ ] Cobertura: 60% → 70%

### Dia 5: Database Migrations 🗄️
- [ ] Implementar migration engine
  ```typescript
  // src/core/migrations.ts
  export async function runMigrations() {
    const migrations = await loadMigrationFiles();
    for (const migration of migrations) {
      await migration.up();
      await recordMigration(migration.name);
    }
  }
  ```
- [ ] Criar migrations para bots, sessions
- [ ] Teste de rollback

---

## 📅 SEMANA 3-4 (26 Fev - 12 Março)

### Observability (Langfuse) 📊
- [ ] Instalar Langfuse
  ```bash
  npm install langfuse
  ```
- [ ] Integrar em todos os providers LLM
- [ ] Dashboard de custos
- [ ] Alertas de anomalias

### Self-Improvement v2 (Fase 1) 🧠
- [ ] Implementar `FeedbackLoop`
  - Capturar interações
  - Inferir satisfação do usuário
  - Armazenar em vector store
- [ ] Implementar `PatternRecognizer`
  - Cluster interações bem-sucedidas
  - Identificar patterns comuns
- [ ] Dashboard básico de patterns

---

## 📅 SEMANA 5-8 (Março)

### Vector Database (Pinecone) 🧠
- [ ] Setup Pinecone account (free tier)
- [ ] Implementar `PineconeVectorStore`
- [ ] Migration de memórias existentes
- [ ] Semantic search em conversas
- [ ] Benchmarks de performance

### Temporal.io Workflows ⚙️
- [ ] Setup Temporal (self-hosted ou cloud)
- [ ] Migrar Bot Factory deployment para workflow
- [ ] Migrar RoundTable para workflow
- [ ] Dashboard de workflows

---

## 📅 SEMANA 9-12 (Abril)

### Web Dashboard v1 (MVP) 🌐
- [ ] Setup Next.js + Tailwind
- [ ] Clerk authentication
- [ ] Bot management UI
  - Listar bots
  - Criar bot (form)
  - Editar bot
  - Deletar bot
- [ ] Cost dashboard
  - Gráficos por provider
  - Gráficos por bot
  - Projeções
- [ ] Deploy em Vercel

---

## 🎯 METAS POR MÊS

### Fevereiro (Segurança + Performance)
- ✅ 0 vulnerabilidades críticas
- ✅ Cache Redis implementado
- ✅ Gemini provider ativo
- ✅ Distributed tracing funcional
- ✅ 70% cobertura de testes
- 💰 **-30% custos LLM**
- ⚡ **-50% latência média**

### Março (Observability + Self-Improvement)
- ✅ Langfuse integrado
- ✅ Vector database operacional
- ✅ Temporal workflows ativos
- ✅ Self-improvement v2 (Fase 1)
- ✅ 80% cobertura de testes
- 📊 **Dashboard de analytics**
- 🧠 **Feedback loop automatizado**

### Abril (Web Dashboard)
- ✅ Dashboard MVP deployed
- ✅ Clerk authentication
- ✅ Bot management via UI
- ✅ Cost analytics visualizations
- 👥 **Democratização (non-devs podem criar bots)**
- 🚀 **10x facilidade de uso**

---

## 📊 KPIs e Tracking

### Métricas Semanais
```bash
# Criar script de tracking
cat > scripts/weekly-metrics.sh << 'EOF'
#!/bin/bash

echo "=== OpenCell Weekly Metrics ==="
echo "Date: $(date)"
echo ""

# Code metrics
echo "Code Lines:"
wc -l src/**/*.ts | tail -1

# Test coverage
echo "Test Coverage:"
npm test -- --coverage | grep "All files"

# Bundle size
echo "Bundle Size:"
du -sh dist/

# Dependencies
echo "Dependencies:"
npm list --depth=0 | wc -l

# Vulnerabilities
echo "Security:"
npm audit | grep "vulnerabilities"

# Performance (avg response time from logs)
echo "Avg Response Time:"
grep "response_time" logs/latest.log | awk '{sum+=$3; count++} END {print sum/count "ms"}'

# Costs (last 7 days)
echo "LLM Costs (7d):"
node scripts/calculate-costs.js --days 7

EOF

chmod +x scripts/weekly-metrics.sh
```

### Dashboard de Progresso
Criar issue tracking no GitHub Projects:
- [ ] Coluna "Backlog"
- [ ] Coluna "In Progress"
- [ ] Coluna "Testing"
- [ ] Coluna "Done"

Labels:
- `priority:critical` (vermelho)
- `priority:high` (laranja)
- `priority:medium` (amarelo)
- `priority:low` (verde)
- `type:security` (🔒)
- `type:performance` (⚡)
- `type:feature` (✨)
- `type:bug` (🐛)

---

## 🎁 QUICK WINS (Impacto Alto, Esforço Baixo)

### Quick Win 1: Smart Router Optimization ⚡
**Tempo:** 2 horas  
**Impacto:** -20% custos

```typescript
// src/llm/router.ts
export function selectProviderForTask(task: string): string {
  // Simple tasks → Moonshot (cheap)
  if (task.length < 100) return 'moonshot';
  
  // Code generation → Claude (best quality)
  if (task.includes('code') || task.includes('function')) return 'claude';
  
  // Portuguese → Moonshot (better)
  if (detectLanguage(task) === 'pt') return 'moonshot';
  
  // Default → Moonshot (cheapest)
  return 'moonshot';
}
```

### Quick Win 2: Response Compression 📦
**Tempo:** 1 hora  
**Impacto:** -30% bandwidth

```typescript
// src/index.ts
import compression from 'compression';
app.use(compression());
```

### Quick Win 3: Lazy Loading de MCP Servers ⚡
**Tempo:** 3 horas  
**Impacto:** -50% startup time

```typescript
// src/mcp/lifecycle.ts
export async function lazyLoadServer(serverName: string) {
  if (!loadedServers.has(serverName)) {
    await startMCPServer(serverName);
    loadedServers.add(serverName);
  }
}
```

---

## 🚀 COMANDOS ÚTEIS

### Deploy Rápido
```bash
# Build + Deploy + Health Check
npm run deploy:quick
```

### Rollback
```bash
# Rollback para versão anterior
kubectl rollout undo deployment/ulf-warden -n ulf
```

### Performance Profiling
```bash
# Profiling de CPU
node --prof dist/index.js

# Analisar profile
node --prof-process isolate-0x*.log > profile.txt
```

### Cost Estimation
```bash
# Estimar custos para próximo mês
node scripts/estimate-costs.js --provider moonshot --volume 15M
```

---

## 📞 CHECKLIST DE DEPLOY

Antes de cada deploy em produção:

- [ ] ✅ Todos os testes passando (`npm test`)
- [ ] ✅ Build sem erros (`npm run build`)
- [ ] ✅ Security audit limpo (`npm audit`)
- [ ] ✅ Performance benchmarks OK (latência < 3s)
- [ ] ✅ Backup de database
- [ ] ✅ Canary deployment (10% traffic)
- [ ] ✅ Monitoring dashboards OK
- [ ] ✅ Rollback plan testado
- [ ] ✅ Changelog atualizado
- [ ] ✅ Docs atualizadas

---

## 🎉 CELEBRAÇÃO DE MILESTONES

### Milestone 1: Segurança 100% ✅
**Meta:** 0 vulnerabilidades, 70% cobertura testes  
**Prêmio:** 🍕 Pizza team!

### Milestone 2: Performance 2x ⚡
**Meta:** -50% latência, -40% custos  
**Prêmio:** 🎮 Game night!

### Milestone 3: Self-Improvement Live 🧠
**Meta:** 80% melhorias automáticas  
**Prêmio:** 🏖️ Day off!

### Milestone 4: Dashboard MVP 🌐
**Meta:** Web UI deployed, 10 beta users  
**Prêmio:** 🍾 Champagne celebration!

---

## 📈 RETROSPECTIVA MENSAL

Último dia de cada mês:
1. Review de KPIs
2. What went well?
3. What could be improved?
4. Action items for next month
5. Update roadmap

Template:
```markdown
# Retrospectiva - [Mês]

## Accomplishments ✅
- [Lista de conquistas]

## Challenges ⚠️
- [Lista de desafios]

## Learnings 📚
- [Lista de aprendizados]

## Next Month Goals 🎯
- [Lista de metas]
```

---

**Próxima Review:** 19 de Fevereiro de 2025  
**Responsável:** Time OpenCell  
**Status:** 🚀 Em Execução
