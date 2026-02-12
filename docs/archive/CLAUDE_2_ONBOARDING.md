# 👋 Olá Claude Code #2!

Este é um guia de onboarding para você começar a trabalhar no projeto **OpenCell** em paralelo com outro Claude Code.

---

## 🎯 Sua Missão

Você foi designado para trabalhar na branch **`feature/core-architecture`**, focando em **Backend, Core Features e Performance**.

O outro Claude (Claude #1) está trabalhando em **`feature/platform-enhancements`**, focando em **UI/UX e Features de Plataforma**.

---

## 🚀 Quick Start

### 1. Clone e Setup (se necessário)
```bash
cd /path/to/opencellcw
git fetch origin
git checkout feature/core-architecture
```

### 2. Verifique que está na branch correta
```bash
git branch
# Deve mostrar: * feature/core-architecture
```

### 3. Sync com as últimas mudanças
```bash
git pull origin feature/core-architecture
```

Pronto! Você está configurado e pronto para começar. 🎉

---

## 📋 Suas Responsabilidades

### ✅ VOCÊ DEVE TRABALHAR EM:

#### 🏗️ Core Architecture
- `src/core/` - Sistema central
- `src/agent.ts` - Lógica do agent principal
- `src/chat.ts` - Sistema de chat
- `src/tools/` - Tool system

#### 🔧 Tools & Workflows
- `src/tools/` - Tool registry, tool implementations
- `src/workflows/` - Workflow manager
- `examples/workflows/` - Workflow examples
- Adicionar novos tools
- Melhorar workflow engine

#### ⚡ Performance & Infrastructure
- Caching layer
- Queue system
- Database optimizations
- API improvements
- Monitoring & metrics
- Rate limiting improvements

#### 📚 Documentação
- `docs/architecture/` - Docs de arquitetura
- `docs/ARCHITECTURE.md`
- Docs de workflows
- API documentation

### ❌ EVITE EDITAR (são do Claude #1):

- `src/handlers/discord.ts` - Discord handler
- `src/handlers/slack.ts` - Slack handler
- `src/handlers/telegram.ts` - Telegram handler
- `src/handlers/whatsapp.ts` - WhatsApp handler
- `src/utils/discord-formatter.ts` - Discord utilities
- `src/media-handler-*.ts` - Media handlers
- `docs/discord-*.md` - Discord docs

### ⚠️ ARQUIVOS COMPARTILHADOS (coordenar se precisar editar):

- `src/index.ts` - Entry point (comunique se precisar mudar)
- `package.json` - Dependencies (use commits claros)
- `README.md` - Main readme (coordene updates)
- `.env.example` - Config (comunique mudanças)

---

## 🎯 Sugestões de Tarefas

Aqui estão algumas tarefas sugeridas para você começar:

### 🔥 Alta Prioridade

1. **Performance Optimization**
   - Implementar caching layer (Redis ou in-memory)
   - Otimizar database queries
   - Add query result caching
   - Benchmark e profile código crítico

2. **Tool Registry Enhancements**
   - Adicionar versionamento de tools
   - Tool dependency resolution
   - Tool validation schema
   - Auto-discovery de tools

3. **Workflow Engine**
   - Conditional branching
   - Parallel execution
   - Error recovery & retry logic
   - Workflow state persistence

### 💡 Média Prioridade

4. **Queue System**
   - Implementar message queue (Bull/BullMQ)
   - Job scheduling
   - Priority queues
   - Dead letter queue

5. **Monitoring & Observability**
   - Structured logging improvements
   - Metrics collection (Prometheus)
   - Tracing (OpenTelemetry)
   - Health check endpoints

6. **API Improvements**
   - REST API para tool execution
   - GraphQL endpoint (opcional)
   - API rate limiting per endpoint
   - API documentation (Swagger/OpenAPI)

### 🌟 Baixa Prioridade

7. **Database Optimizations**
   - Migration system
   - Connection pooling
   - Index optimization
   - Query optimization

8. **More Workflow Examples**
   - Code review workflow
   - Testing workflow
   - Documentation generation workflow
   - Analytics workflow

---

## 🔄 Workflow de Trabalho

### Sempre que for trabalhar:

```bash
# 1. Certifique-se que está na branch correta
git checkout feature/core-architecture

# 2. Sync com remote
git fetch origin
git pull origin feature/core-architecture

# 3. Faça suas mudanças
# ... edite arquivos ...

# 4. Commit
git add .
git commit -m "feat: your feature description

Detailed explanation of what changed and why.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

# 5. Push
git push origin feature/core-architecture
```

### Sync com main periodicamente:

```bash
git fetch origin
git merge origin/main
# Resolve conflicts if any
git push
```

---

## 📝 Convenções de Commit

Use prefixos semânticos:

- `feat:` - Nova feature
- `fix:` - Bug fix
- `perf:` - Performance improvement
- `refactor:` - Code refactoring
- `test:` - Tests
- `docs:` - Documentation
- `chore:` - Maintenance

**Exemplos:**
```bash
feat: add Redis caching layer for API responses
perf: optimize database queries with proper indexes
refactor: restructure tool registry for better performance
test: add comprehensive tests for workflow engine
```

---

## 🚨 Regras Importantes

### ✅ DO:
- ✅ Commit frequentemente com mensagens claras
- ✅ Push para `feature/core-architecture` regularmente
- ✅ Sync com `main` periodicamente
- ✅ Adicionar testes para novas features
- ✅ Documentar mudanças significativas
- ✅ Usar TypeScript tipado

### ❌ DON'T:
- ❌ Não commite para `main` diretamente
- ❌ Não edite arquivos da branch do Claude #1
- ❌ Não commite secrets ou dados sensíveis
- ❌ Não commite `data/`, `dist/`, `node_modules/`
- ❌ Não force push sem necessidade

---

## 🤝 Comunicação com Claude #1

### Como se comunicar:

1. **Via Commit Messages** - Seja descritivo
   ```
   feat: add caching layer

   Implemented Redis caching for API responses. This improves
   response time by ~70% for repeated queries.

   Note to Claude #1: This might affect how handlers fetch data.
   Check src/core/cache.ts for the new cache interface.
   ```

2. **Via BRANCHING_STRATEGY.md** - Atualize se mudar responsabilidades
   ```bash
   # Se precisar pegar responsabilidade do Claude #1
   # Edite BRANCHING_STRATEGY.md e explique why
   ```

3. **Via GitHub Issues** - Para discussões maiores
   ```
   Crie issue com label "coordination" para discutir
   mudanças que afetam ambas branches
   ```

---

## 📊 Status Atual do Projeto

### O que já foi feito:

#### ✅ Por Claude #1 (Platform):
- Discord rich formatting system (embeds, buttons, status)
- Repository organization
- Documentation cleanup
- 5 Discord docs criados
- 2 Discord utilities implementadas

#### ✅ Trabalho Anterior (Core):
- Hybrid Architecture (Phases 1-3)
  - Output Parser + Retry Engine
  - Tool Registry + Workflow Manager
  - Observability & Telemetry
- 4 Workflow examples
- Comprehensive tests
- Integration status docs

### O que está faltando (SUAS TAREFAS):

- ⏳ Caching layer
- ⏳ Queue system
- ⏳ Performance optimizations
- ⏳ More workflow examples
- ⏳ API improvements
- ⏳ Database optimizations
- ⏳ Monitoring improvements

---

## 🗺️ Arquitetura Atual

```
OpenCell/
├── src/
│   ├── core/              ← VOCÊ (Tool Registry, Workflow Manager)
│   ├── tools/             ← VOCÊ (Tool implementations)
│   ├── workflows/         ← VOCÊ (Workflow engine)
│   ├── handlers/          ← Claude #1 (Platform handlers)
│   ├── utils/             ← Compartilhado (coordenar)
│   ├── agent.ts           ← VOCÊ (Agent logic)
│   ├── chat.ts            ← VOCÊ (Chat system)
│   └── index.ts           ← Compartilhado (coordenar)
│
├── examples/
│   └── workflows/         ← VOCÊ (Workflow examples)
│
├── docs/
│   ├── architecture/      ← VOCÊ (Architecture docs)
│   ├── discord-*.md       ← Claude #1 (Discord docs)
│   └── *.md              ← Compartilhado (coordenar)
│
└── tests/                 ← VOCÊ (Core tests)
```

---

## 🎓 Recursos Úteis

### Documentação do Projeto:
- `README.md` - Overview geral
- `BRANCHING_STRATEGY.md` - Estratégia completa de branches
- `CONTRIBUTING.md` - Guidelines de contribuição
- `docs/architecture/` - Docs de arquitetura detalhados
- `docs/ARCHITECTURE.md` - Visão geral da arquitetura

### Comandos Git Úteis:
```bash
# Ver todas as branches
git branch -a

# Ver status
git status

# Ver diferenças com main
git diff main

# Ver log de commits
git log --oneline --graph -n 20

# Ver quem está trabalhando onde
git log --all --oneline --graph -n 30

# Ver branches no GitHub
open https://github.com/cloudwalk/opencell/branches
```

---

## 🐛 Troubleshooting

### Se você acidentalmente commitar na branch errada:
```bash
# Voltar último commit (mantém mudanças)
git reset --soft HEAD~1

# Trocar para branch correta
git checkout feature/core-architecture

# Commit novamente
git add .
git commit -m "feat: ..."
```

### Se tiver conflitos ao fazer merge:
```bash
# Ver arquivos com conflito
git status

# Resolver conflitos manualmente, depois:
git add .
git commit -m "merge: resolve conflicts with main"
git push
```

### Se precisar descartar mudanças:
```bash
# Descartar mudanças não commitadas
git checkout -- .

# Ou reset completo
git reset --hard origin/feature/core-architecture
```

---

## 🎯 Checklist Inicial

Antes de começar, verifique:

- [ ] Estou na branch `feature/core-architecture`
- [ ] Fiz `git pull` para pegar últimas mudanças
- [ ] Li este documento completamente
- [ ] Entendi minhas responsabilidades
- [ ] Sei quais arquivos evitar
- [ ] Entendo o workflow de commit/push
- [ ] Configurei o ambiente de desenvolvimento

---

## 🚀 Começar Agora!

Você está pronto! Aqui está um primeiro comando para começar:

```bash
git checkout feature/core-architecture
git pull origin feature/core-architecture
ls -la src/core/
cat docs/architecture/HYBRID_IMPLEMENTATION_GUIDE.md
```

Escolha uma tarefa da lista de **Alta Prioridade** acima e comece!

Boa sorte e bom trabalho! 🎉

---

**Documentos Relacionados:**
- `BRANCHING_STRATEGY.md` - Estratégia completa
- `CONTRIBUTING.md` - Como contribuir
- `docs/architecture/` - Arquitetura detalhada

**Última atualização:** 2026-02-04
**Sua branch:** `feature/core-architecture`
**Outra branch:** `feature/platform-enhancements` (Claude #1)
