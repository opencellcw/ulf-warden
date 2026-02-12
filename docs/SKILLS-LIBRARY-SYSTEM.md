# 📚 Skills Library System

**Status:** ✅ **IMPLEMENTADO**  
**Version:** 2.0  
**Data:** 12 Fevereiro 2026

---

## 📋 Visão Geral

Sistema de **aprendizado e reutilização de código** baseado em embeddings semânticos. O bot salva implementações bem-sucedidas como "skills" e as reutiliza em propostas futuras similares.

**Inspirado em:** [Voyager (Minecraft Agent)](https://voyager.minedojo.org/) - lifelong learning via skills library

**Benefícios:**
- 🧠 **Aprendizado contínuo** - Bot aprende com cada implementação
- 🔄 **Reutilização inteligente** - Busca semântica por código similar
- 📈 **Melhora com o tempo** - Success rate tracking
- 💡 **Context-aware** - OpenAI embeddings (1536 dimensões)
- 💰 **Cost-effective** - $0.02 por 1M tokens

---

## 🏗️ Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────┐
│               SkillsLibrary                         │
│   (SQLite storage + semantic search)                │
└──────────────┬──────────────────────────┬───────────┘
               │                          │
       ┌───────▼────────┐        ┌────────▼─────────┐
       │ EmbeddingService│       │  Similarity      │
       │ (OpenAI API)    │       │  (Cosine)        │
       └─────────────────┘       └──────────────────┘
```

### Fluxo de Aprendizado

```
1. 💡 Propor Melhoria
   ├─ Busca skills similares (semantic search)
   └─ Sugere código comprovado (success rate >80%)

2. 🔨 Implementar
   ├─ Usa skills sugeridas como referência
   └─ Gera novo código

3. 🚀 Deploy
   ├─ Sucesso? → Salva como skill
   └─ Falha? → Marca skill existente como falha

4. 📚 Skills Library
   ├─ Armazena código + embedding
   ├─ Track success/failure rate
   └─ Disponível para próximas propostas
```

### Database Schema

```sql
CREATE TABLE skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  code TEXT NOT NULL,
  language TEXT NOT NULL,  -- typescript, python, bash
  category TEXT NOT NULL,  -- feature, bugfix, optimization
  tags TEXT NOT NULL,      -- JSON array
  usage_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  success_rate REAL DEFAULT 0,
  last_used TEXT,
  created_at TEXT NOT NULL,
  embedding_json TEXT      -- OpenAI embedding (1536 dims)
);
```

---

## 🚀 Uso

### 1. Básico (com EnhancedSelfImprover)

```typescript
import { EnhancedSelfImprover } from './evolution/enhanced-self-improver';
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const improver = new EnhancedSelfImprover(claude);

// Propor melhoria (busca skills automaticamente)
const proposal = await improver.proposeImprovement(
  "Add health check endpoint with uptime and version"
);

// Se encontrou skills similares, estarão em:
console.log('Suggested skills:', proposal.suggestedSkills);

// Implementar (usa skills como referência)
await improver.implementProposal(proposal);

// Deploy (salva como skill se sucesso)
const result = await improver.deployProposal(proposal);

// Skills library agora tem essa implementação!

improver.close();
```

### 2. Standalone (busca manual)

```typescript
import { SkillsLibrary } from './evolution/skills';

const library = new SkillsLibrary('./data/skills.db');

// Buscar skills similares
const results = await library.findSimilar(
  "I need a health check endpoint",
  limit: 5,
  minSimilarity: 0.75  // 75% similar
);

console.log(`Found ${results.length} similar skills:`);
results.forEach((result, i) => {
  console.log(`${i + 1}. ${result.skill.name}`);
  console.log(`   Similarity: ${(result.similarity * 100).toFixed(1)}%`);
  console.log(`   Success Rate: ${result.skill.successRate.toFixed(0)}%`);
  console.log(`   Used: ${result.skill.usageCount} times`);
  console.log(`   Code:\n${result.skill.code.substring(0, 200)}...`);
});

library.close();
```

### 3. Adicionar Skill Manualmente

```typescript
const library = new SkillsLibrary();

const skillId = await library.addSkill({
  name: 'Health Check Endpoint',
  description: 'Create /health endpoint with status, uptime, version',
  code: `
export function healthCheck() {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    version: process.env.VERSION || '1.0.0',
    timestamp: new Date().toISOString()
  };
}
  `,
  language: 'typescript',
  category: 'feature',
  tags: ['health', 'monitoring', 'endpoint']
});

console.log(`Skill added with ID: ${skillId}`);
```

### 4. Registrar Uso

```typescript
// Quando skill é usada com sucesso
library.recordUsage(skillId, true);

// Quando skill falha
library.recordUsage(skillId, false);

// Success rate é atualizado automaticamente
const skill = library.getSkill('Health Check Endpoint');
console.log(`Success rate: ${skill.successRate}%`);
```

### 5. Estatísticas

```typescript
const stats = library.getStats();

console.log('Total skills:', stats.totalSkills);
console.log('Categories:', stats.categories);
console.log('Languages:', stats.languages);
console.log('Top performers:', stats.topPerformers);
console.log('Recently used:', stats.recentlyUsed);
```

---

## 🔍 Semantic Search

### Como Funciona

1. **Embedding Generation**
   - Query: "Add health endpoint" → OpenAI → [0.123, -0.456, 0.789, ...]
   - 1536 dimensões (text-embedding-3-small)

2. **Similarity Calculation**
   - Cosine similarity vs todas skills no DB
   - Score: 0.0 (ortogonal) até 1.0 (idêntico)

3. **Ranking**
   - Ordena por similarity (desc)
   - Empate? Ordena por success rate
   - Filtra por threshold (default 75%)

### Exemplos de Similarity

| Query | Skill | Similarity | Match |
|-------|-------|------------|-------|
| "health check endpoint" | "Health Check API" | 95% | Highly similar |
| "rate limit api" | "Rate Limiting Middleware" | 92% | Very similar |
| "logging with timestamps" | "Logger Utility" | 88% | Very similar |
| "error handling" | "Error Handler Middleware" | 85% | Similar |
| "cache redis" | "Rate Limiting" | 45% | Not similar |

---

## 📊 Tracking e Analytics

### Success Rate

```
Success Rate = (success_count / usage_count) * 100

Exemplo:
- usage_count: 10
- success_count: 8
- failure_count: 2
- success_rate: 80%
```

### Uso ao Longo do Tempo

```typescript
const skill = library.getSkill('Health Check Endpoint');

console.log({
  name: skill.name,
  usageCount: skill.usageCount,      // 25 vezes usado
  successCount: skill.successCount,  // 23 sucessos
  failureCount: skill.failureCount,  // 2 falhas
  successRate: skill.successRate,    // 92%
  lastUsed: skill.lastUsed,          // 2026-02-12
  createdAt: skill.createdAt         // 2026-02-01
});
```

### Top Performers

```typescript
const topSkills = library.getTopSkills(10, minUsage: 3);

topSkills.forEach((skill, i) => {
  console.log(`${i + 1}. ${skill.name}`);
  console.log(`   Success: ${skill.successRate.toFixed(0)}%`);
  console.log(`   Used: ${skill.usageCount} times`);
});
```

---

## 🏷️ Categorias e Tags

### Categorias Padrão

| Categoria | Descrição | Exemplo |
|-----------|-----------|---------|
| **feature** | Nova funcionalidade | Health check endpoint |
| **bugfix** | Correção de bug | Fix memory leak |
| **optimization** | Melhoria de performance | Cache Redis integration |
| **refactor** | Refatoração de código | Extract service layer |
| **documentation** | Docs/comments | Add JSDoc to functions |
| **test** | Testes | Unit tests for API |
| **utility** | Utilitários gerais | Logger, helpers |
| **other** | Outros | Catch-all |

### Tags Comuns

```typescript
// Monitoring
tags: ['health', 'monitoring', 'status', 'metrics']

// API/Web
tags: ['api', 'endpoint', 'route', 'middleware']

// Security
tags: ['auth', 'rate-limiting', 'validation', 'security']

// Performance
tags: ['cache', 'optimization', 'performance', 'scaling']

// Infrastructure
tags: ['deployment', 'k8s', 'docker', 'ci-cd']
```

---

## 💰 Custos

### OpenAI Embeddings

**Modelo:** text-embedding-3-small  
**Preço:** $0.02 por 1M tokens  
**Dimensões:** 1536

**Exemplos:**
- 1 skill (500 chars) ≈ 125 tokens → $0.0000025
- 100 skills → $0.00025
- 10,000 skills → $0.025

**Cache:** Embeddings são cacheados (100 últimos em memória)

### Storage

**Database:** SQLite (local, free)  
**Tamanho médio por skill:** ~5 KB  
**1000 skills:** ~5 MB  
**10,000 skills:** ~50 MB

**Total:** Basicamente $0/mês! 🎉

---

## 🧪 Testes

### Test Script

```bash
# Run all skills library tests
./scripts/test-skills-library.sh
```

**Testes incluídos:**
1. Initialize library
2. Add sample skills (4 examples)
3. Semantic search (3 queries)
4. Get top performers
5. Library statistics
6. Search by tags

### Manual Testing

```bash
# 1. Compile
npm run build

# 2. Run tests
./scripts/test-skills-library.sh

# 3. Check database
sqlite3 ./data/test-skills.db
sqlite> SELECT name, success_rate, usage_count FROM skills;
sqlite> .quit

# 4. Clean up
rm ./data/test-skills.db
```

---

## 🔮 Integration com Self-Improvement

### Fluxo Completo

```typescript
// 1. Usuário pede melhoria
"Add Redis caching to reduce database load"

// 2. EnhancedSelfImprover busca skills
const similarSkills = await skillsLibrary.findSimilar(query);

// Encontra: "Redis Cache Integration" (90% similar, 95% success)

// 3. Proposta inclui skill como referência
proposal.suggestedSkills = [
  {
    name: "Redis Cache Integration",
    code: "...",  // Código comprovado
    similarity: 0.90,
    successRate: 95
  }
];

// 4. Claude implementa usando skill como base
const implementation = await claude.implement(proposal);

// 5. Deploy com monitoring
const result = await deployProposal(proposal);

// 6. Se sucesso, salva nova skill
if (result.success) {
  await skillsLibrary.addSkill({
    name: "Redis Caching for API",
    description: "...",
    code: implementation,
    // ...
  });
}

// 7. Próxima vez que alguém pedir cache, vai encontrar essa skill!
```

---

## 🎯 Casos de Uso

### Caso 1: Código Repetitivo

**Antes (sem skills):**
```
Request 1: "Add /status endpoint" → Implementa do zero
Request 2: "Add /version endpoint" → Implementa do zero (similar!)
Request 3: "Add /health endpoint" → Implementa do zero (again!)
```

**Depois (com skills):**
```
Request 1: "Add /status endpoint" → Implementa do zero, salva skill
Request 2: "Add /version endpoint" → Encontra skill 92% similar, reusa
Request 3: "Add /health endpoint" → Encontra skill 95% similar, reusa
```

### Caso 2: Aprendizado com Falhas

```
Tentativa 1: Implementa rate limiting → Deploy falha (bug) → 0% success
Tentativa 2: Corrige bug → Deploy sucesso → 50% success
Tentativa 3: Usa código corrigido → Sucesso → 67% success
Tentativa 4+: Sempre usa versão comprovada → 75%+ success

Skills library sempre sugere a versão com maior success rate!
```

### Caso 3: Team Knowledge

```
Developer A: Implementa OAuth2 (expert) → 100% success
Developer B: Precisa OAuth2 → Skills sugere código de A
Developer C: Precisa OAuth2 → Skills sugere código de A

Team inteiro se beneficia do conhecimento de A!
```

---

## 🐛 Troubleshooting

### Embeddings não funcionam

**Erro:** `OPENAI_API_KEY environment variable is required`  
**Solução:** Configure API key

```bash
export OPENAI_API_KEY=sk-...
```

### Nenhuma skill encontrada

**Causa:** Threshold muito alto (default 75%)  
**Solução:** Reduza threshold

```typescript
const results = await library.findSimilar(query, 5, 0.6); // 60%
```

### Database locked

**Causa:** Múltiplas conexões simultâneas  
**Solução:** Use singleton

```typescript
// Singleton pattern
let libraryInstance: SkillsLibrary;

export function getSkillsLibrary(): SkillsLibrary {
  if (!libraryInstance) {
    libraryInstance = new SkillsLibrary();
  }
  return libraryInstance;
}
```

### Embeddings muito lentas

**Causa:** Cache miss, API calls  
**Solução:** Pre-generate embeddings

```typescript
// Batch generation
const texts = skills.map(s => s.code);
const embeddings = await embeddingService.generateBatchEmbeddings(texts);
```

---

## 📈 Estatísticas de Exemplo

### Após 1 Mês de Uso

```
Total Skills: 147
Categories:
  - feature: 58 skills
  - bugfix: 31 skills
  - optimization: 24 skills
  - refactor: 19 skills
  - utility: 15 skills

Languages:
  - typescript: 112 skills
  - python: 23 skills
  - bash: 8 skills
  - other: 4 skills

Top Performers (success rate >90%):
  1. Health Check Endpoint (100%, 12 uses)
  2. Rate Limiting Middleware (95%, 8 uses)
  3. Redis Cache Integration (93%, 14 uses)
  4. Logger Utility (91%, 6 uses)
  5. Error Handler (90%, 10 uses)

Recently Used:
  - Redis Cache Integration (5 min ago)
  - Error Handler (1 hour ago)
  - Health Check Endpoint (3 hours ago)

Reuse Rate: 62%
(62% of new proposals reused existing skills)
```

---

## 🔮 Roadmap

### v2.1 (Próxima versão)
- [ ] Code snippets (não só arquivos completos)
- [ ] Multi-file skills (skill composta)
- [ ] Version control (skill v1, v2, v3)
- [ ] Import/export skills (compartilhar entre bots)
- [ ] Skills marketplace (community skills)

### v2.2 (Futuro)
- [ ] Automatic skill extraction from git history
- [ ] Code quality scoring (além de success rate)
- [ ] Conflict detection (skills incompatíveis)
- [ ] Performance benchmarks per skill

---

## 📚 Arquivos Relacionados

```
src/evolution/skills/
├── skills-library.ts      # Core library + SQLite
├── embeddings.ts          # OpenAI embeddings API
├── similarity.ts          # Cosine similarity math
└── index.ts               # Exports

src/evolution/
├── enhanced-self-improver.ts  # Integração completa
└── types.ts                   # Type definitions

scripts/
└── test-skills-library.sh     # Test suite

docs/
└── SKILLS-LIBRARY-SYSTEM.md   # Esta documentação

data/
└── skills.db                  # SQLite database (gitignored)
```

---

## 🎓 Recursos Adicionais

### Papers & Inspiração

- **Voyager (2023):** [https://voyager.minedojo.org/](https://voyager.minedojo.org/)
- **STOP Framework:** Self-Taught Optimizer
- **Agent Lightning:** Microsoft Research (60% improvement)

### OpenAI Embeddings

- **Docs:** [https://platform.openai.com/docs/guides/embeddings](https://platform.openai.com/docs/guides/embeddings)
- **Pricing:** [https://openai.com/pricing](https://openai.com/pricing)
- **Models:** text-embedding-3-small (fastest, cheapest)

---

## ✅ Checklist de Ativação

Antes de usar skills library em produção:

- [ ] OPENAI_API_KEY configurada
- [ ] SQLite database criada (./data/skills.db)
- [ ] Testado com skills de exemplo
- [ ] Semantic search funcionando (threshold 75%)
- [ ] Success rate tracking testado
- [ ] Integração com EnhancedSelfImprover
- [ ] Backup strategy para database
- [ ] Monitoring de custos OpenAI

---

**Status:** ✅ Production Ready  
**Última atualização:** 12 Fevereiro 2026  
**Mantido por:** Lucas (OpenCell/CloudWalk)  

**Aprenda com cada linha de código! 🚀**
