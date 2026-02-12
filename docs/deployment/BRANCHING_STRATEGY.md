# 🌳 Branching Strategy - OpenCell

## 📋 Resumo

Este repositório usa **2 branches de desenvolvimento paralelo** para permitir que múltiplos agentes Claude trabalhem simultaneamente sem conflitos.

## 🎯 Branches Ativas

### 1️⃣ `feature/platform-enhancements`
**Owner:** Claude 1 (Platform & UI/UX)
**Focus:** Features de plataforma e experiência do usuário

**Responsabilidades:**
- ✨ Discord (embeds, buttons, slash commands, modals, voice)
- ✨ Slack (rich formatting, interactive components)
- ✨ Telegram (inline keyboards, rich messages)
- ✨ WhatsApp (rich messages, media handling)
- ✨ Multi-platform UI consistency
- ✨ Media handling improvements
- ✨ User experience enhancements

**Arquivos principais:**
- `src/handlers/discord.ts`
- `src/handlers/slack.ts`
- `src/handlers/telegram.ts`
- `src/handlers/whatsapp.ts`
- `src/utils/discord-formatter.ts`
- `src/media-handler-*.ts`
- `docs/discord-*.md`

---

### 2️⃣ `feature/core-architecture`
**Owner:** Claude 2 (Backend & Core)
**Focus:** Arquitetura central e backend

**Responsabilidades:**
- 🏗️ Tool Registry expansions
- 🏗️ Workflow Engine improvements
- 🏗️ Performance optimizations
- 🏗️ Caching layer
- 🏗️ Queue system
- 🏗️ Monitoring & metrics
- 🏗️ Database optimizations
- 🏗️ API improvements

**Arquivos principais:**
- `src/core/`
- `src/tools/`
- `src/workflows/`
- `examples/workflows/`
- `src/agent.ts`
- `src/chat.ts`
- `docs/architecture/`

---

## 🔄 Workflow

### Para Cada Claude:

1. **Sempre trabalhe na SUA branch:**
   ```bash
   git checkout feature/platform-enhancements  # Claude 1
   # ou
   git checkout feature/core-architecture      # Claude 2
   ```

2. **Commit regularmente:**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   git push origin feature/platform-enhancements
   ```

3. **Sync com main periodicamente:**
   ```bash
   git fetch origin
   git merge origin/main
   # Resolver conflitos se necessário
   git push
   ```

4. **Criar PR quando estiver pronto:**
   - Ir para GitHub
   - Criar Pull Request da sua branch → `main`
   - Pedir review
   - Merge após aprovação

---

## ⚠️ Regras de Conflito

### ✅ Arquivos SEM Conflito (podem editar em paralelo):

**Claude 1 (Platform):**
- Qualquer arquivo em `src/handlers/`
- Qualquer arquivo em `src/utils/` relacionado a formatting
- Docs de plataforma específica

**Claude 2 (Core):**
- Qualquer arquivo em `src/core/`
- Qualquer arquivo em `src/tools/`
- Qualquer arquivo em `src/workflows/`
- Docs de arquitetura

### ⚠️ Arquivos COM Possível Conflito (coordenar):

- `src/index.ts` - Entry point
- `package.json` - Dependencies
- `README.md` - Main docs
- `.env.example` - Config
- `src/agent.ts` - Agent logic

**Regra:** Se precisar editar um arquivo "compartilhado", **comunique** via commit message ou issue.

---

## 📊 Status Atual

### Branch: `main`
- ✅ Production-ready code
- ✅ 2 commits ahead (Discord formatting + repo cleanup)
- ⏳ Waiting for branch PRs

### Branch: `feature/platform-enhancements`
- 👤 Owner: Claude 1
- ✅ Discord rich formatting implemented
- ✅ Repository organized
- 🎯 Next: Slack formatting, Discord slash commands

### Branch: `feature/core-architecture`
- 👤 Owner: Claude 2
- ✅ Hybrid Architecture (Phases 1-3)
- ✅ Workflow examples
- ✅ Tests implemented
- 🎯 Next: Performance optimizations, caching

---

## 🚀 Merge Strategy

### Quando fazer merge para main:

1. **Feature completa e testada**
2. **CI/CD passing** (workflows)
3. **Code review approved**
4. **No merge conflicts**
5. **Documentation updated**

### Ordem de merge preferencial:

1. Branches menores primeiro (menos chance de conflito)
2. Features independentes antes de dependentes
3. Bugfixes podem ser merged direto (hotfix)

---

## 🔧 Comandos Úteis

```bash
# Ver todas as branches
git branch -a

# Trocar de branch
git checkout feature/platform-enhancements

# Ver status
git status

# Ver diferenças com main
git diff main

# Ver log de commits
git log --oneline -n 10

# Sync com remote
git fetch origin
git pull origin feature/platform-enhancements

# Ver branches no GitHub
open https://github.com/cloudwalk/opencell/branches
```

---

## 📝 Convenções de Commit

Use prefixos semânticos:

- `feat:` - Nova feature
- `fix:` - Bug fix
- `docs:` - Documentação
- `style:` - Formatação, espaços
- `refactor:` - Refatoração de código
- `test:` - Adicionar/modificar tests
- `chore:` - Manutenção, config

**Exemplo:**
```bash
git commit -m "feat: add Discord slash commands support"
```

---

## 🤝 Comunicação

### Como os Claudes se comunicam:

1. **Via commit messages** - Descrever mudanças claramente
2. **Via este arquivo** - Atualizar quando mudar responsabilidades
3. **Via GitHub Issues** - Para discussões maiores
4. **Via PR comments** - Durante code review

---

## 📚 Documentação Adicional

- [Architecture Docs](docs/architecture/)
- [Contributing Guide](CONTRIBUTING.md)
- [Security Policy](SECURITY.md)

---

**Última atualização:** 2026-02-04
**Branches ativas:** 2
**Status:** ✅ Operacional
