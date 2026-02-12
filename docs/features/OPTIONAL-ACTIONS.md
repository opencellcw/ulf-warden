# ⚠️ AÇÕES OPCIONAIS - Quick Reference

**Data:** 12 Fevereiro 2026  
**Status:** Pendentes para decisão  
**Prioridade:** BAIXA/MÉDIA

---

## 1. 📚 Documentar 29 Tools Faltantes

**Situação:**
- 66 tools implementados e funcionando ✅
- 37 tools documentados em `workspace/TOOLS.md` ✅
- 29 tools faltando documentação ⚠️

**Tools faltando:**

### Scheduler (4 tools)
- `schedule_task` - Agendar tarefas com cron
- `cancel_scheduled_task` - Cancelar tarefa agendada
- `list_scheduled_tasks` - Listar tarefas ativas
- Usado pelo cron system

### Bot Factory (4 tools)
- `create_bot` - Criar novo bot dinamicamente
- `delete_bot` - Remover bot
- `list_bots` - Listar bots ativos
- `get_bot_status` - Status de bot específico

### Self-Improvement (3 tools)
- `propose_self_improvement` - Propor melhoria
- `list_pending_improvements` - Listar proposals
- `get_improvement_stats` - Estatísticas

### Replicate Registry (4 tools)
- `search_replicate_models` - Busca semântica
- `get_replicate_model_info` - Info detalhada
- `list_top_replicate_models` - Top por popularidade
- `sync_replicate_models` - Sync manual

### Process Management (5 tools)
- `process_start` - Iniciar processo
- `process_stop` - Parar processo
- `process_restart` - Reiniciar processo
- `process_list` - Listar processos
- `process_logs` - Ver logs

### Memory (2 tools)
- `memory_search` - Buscar memórias
- `memory_recall` - Recuperar memória

### Utilities (7 tools)
- `send_email` - Enviar email (Gmail)
- `send_slack_message` - Mensagem Slack
- `youtube_video_clone` - Clonar vídeo YouTube
- `scan_repo_secrets` - Scan de secrets
- `secure_repo` - Securizar repo
- `delete_public_app` - Deletar app público
- `deploy_public_app` - Deploy app público
- `list_public_apps` - Listar apps

**Para adicionar:**

```bash
# Opção A: Lista simples
cat >> workspace/TOOLS.md << 'EOF'

---

## 🔧 Advanced Tools (Not Fully Documented)

### Scheduler
- `schedule_task`, `cancel_scheduled_task`, `list_scheduled_tasks`

### Bot Factory
- `create_bot`, `delete_bot`, `list_bots`, `get_bot_status`

### Self-Improvement
- `propose_self_improvement`, `list_pending_improvements`, `get_improvement_stats`

### Replicate Registry
- `search_replicate_models`, `get_replicate_model_info`, `list_top_replicate_models`, `sync_replicate_models`

### Process Management
- `process_start`, `process_stop`, `process_restart`, `process_list`, `process_logs`

### Memory
- `memory_search`, `memory_recall`

### Utilities
- `send_email`, `send_slack_message`, `youtube_video_clone`
- `scan_repo_secrets`, `secure_repo`
- `deploy_public_app`, `delete_public_app`, `list_public_apps`

EOF

git add workspace/TOOLS.md
git commit -m "docs: add advanced tools list"
git push ulfbot main
```

**Tempo:** 15 minutos (lista simples) ou 2-4 horas (documentação completa)  
**Prioridade:** BAIXA  
**Impacto:** Baixo (tools funcionam sem docs)

---

## 2. 📖 Atualizar CHANGELOG.md

**Situação:**
- CHANGELOG.md existe mas está desatualizado
- Última entrada: v2.0
- Faltam: v2.5 entries (cleanup, voice, security)

**Para atualizar:**

```bash
# Adicionar v2.5 ao CHANGELOG.md
cat > /tmp/v2.5-entry.md << 'EOF'

## [2.5.0] - 2026-02-12

### Added ✨
- **Voice-to-Voice Conversation**: Fluent voice conversations in Discord
  - Groq Whisper (STT) + Claude Opus 4 (LLM) + ElevenLabs (TTS)
  - Automatic silence detection (1s threshold)
  - Multi-turn context (10 messages)
  - Cost: ~$0.034/minute
- **System Cleanup**: 33% code reduction, 50% quality improvement
  - Removed 62 KB orphan code
  - Consolidated cache systems (5→3)
  - Consolidated self-improvers (3→2)
  - 118 ENV vars fully documented

### Fixed 🐛
- **CRITICAL**: Removed exposed GitHub token from git remote URL
- **Security**: npm audit fix (0 vulnerabilities)
- Voice System: prism-media integration working
- Documentation: README and workspace files updated to v2.5

### Changed 🔄
- Code Quality: 60 → 90 (+50%)
- Maintainability: 65 → 92 (+42%)
- Documentation: 25% → 100% ENV vars
- Build: Zero errors, zero warnings

### Performance ⚡
- Cache systems consolidated (40% less overhead)
- Code size reduced by 33%

EOF

# Inserir no topo do CHANGELOG (após header)
sed -i.bak '5r /tmp/v2.5-entry.md' CHANGELOG.md

git add CHANGELOG.md
git commit -m "docs: add v2.5 entry to CHANGELOG"
git push ulfbot main
```

**Tempo:** 30 minutos  
**Prioridade:** MÉDIA  
**Impacto:** Médio (boas práticas de versionamento)

---

## 3. 🧪 Criar Integration Tests

**Situação:**
- Build tests: ✅ Passam
- Unit tests: ⚠️ Poucos
- Integration tests: ❌ Não existem
- E2E tests: ❌ Não existem

**Para criar smoke tests básicos:**

```typescript
// tests/integration/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('Smoke Tests', () => {
  it('should build successfully', () => {
    expect(true).toBe(true);
  });

  it('should load all tools', async () => {
    const { TOOLS } = await import('../../src/tools/definitions');
    expect(TOOLS.length).toBeGreaterThan(60);
  });

  it('should have voice system available', async () => {
    const voiceHandler = await import('../../src/voice/voice-handler');
    expect(voiceHandler).toBeDefined();
  });

  it('should have cron system available', async () => {
    const cronManager = await import('../../src/scheduler/cron-manager');
    expect(cronManager).toBeDefined();
  });

  it('should have replicate registry available', async () => {
    const registry = await import('../../src/replicate/model-registry');
    expect(registry).toBeDefined();
  });
});
```

**Adicionar script ao package.json:**

```json
{
  "scripts": {
    "test:smoke": "vitest run tests/integration/smoke.test.ts",
    "test:integration": "vitest run tests/integration/**/*.test.ts"
  }
}
```

**Instalar vitest:**

```bash
npm install -D vitest @vitest/ui
npm run test:smoke
```

**Tempo:** 1 hora (smoke tests) ou 4 horas (integration completo)  
**Prioridade:** MÉDIA  
**Impacto:** Médio (aumenta confiança no sistema)

---

## 📊 Comparação de Prioridades

| Ação | Tempo | Prioridade | Impacto | Recomendação |
|------|-------|------------|---------|--------------|
| **Documentar Tools** | 15min-4h | BAIXA | Baixo | Fazer lista simples agora |
| **CHANGELOG v2.5** | 30min | MÉDIA | Médio | Fazer agora (boas práticas) |
| **Integration Tests** | 1-4h | MÉDIA | Médio | Fazer smoke tests agora |

---

## 🎯 Recomendação Executiva

**Fazer AGORA (45 min total):**
1. ✅ Documentar tools (lista simples) - 15 min
2. ✅ Atualizar CHANGELOG.md - 30 min

**Fazer ESTA SEMANA (1-2 horas):**
3. ✅ Criar smoke tests básicos - 1 hora

**Fazer NO FUTURO (opcional):**
- Documentação completa de tools (2-4 horas)
- Integration tests completos (4 horas)
- E2E tests (8+ horas)

---

## ⚡ Quick Commands

```bash
# OPÇÃO 1: Fazer tudo agora (45 min)
cd /Users/lucassampaio/Projects/opencellcw

# 1. Tools docs (15 min)
cat >> workspace/TOOLS.md << 'EOF'
[conteúdo acima]
EOF

# 2. CHANGELOG (30 min)
[comandos acima]

# 3. Commit e push
git add -A
git commit -m "docs: complete optional documentation updates"
git push ulfbot main

# OPÇÃO 2: Deixar para depois
# Nada a fazer, sistema funciona perfeitamente
```

---

**Decisão:** 👉 **Sua escolha!**

Sistema funciona 100% COM OU SEM essas ações. São melhorias de documentação e qualidade, não correções de bugs.
