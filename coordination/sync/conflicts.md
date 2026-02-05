# ⚠️ Conflict Prevention & Resolution

Avisos de possíveis conflitos entre branches e coordenação para arquivos compartilhados.

---

## 🚦 Status Atual

**Status geral:** 🟢 Verde - Sem conflitos ativos

---

## 📂 Arquivos Compartilhados (Coordenar)

Estes arquivos podem ser editados por ambas branches. **Sempre comunique antes de editar.**

### 🟡 Atenção Necessária

#### `src/index.ts`
- **Status:** 🟢 Livre para editar
- **Última edição:** 2026-02-03 (Phase 3)
- **Quem editou:** Setup inicial
- **Próxima edição planejada:** Nenhuma no momento

**Regras:**
- Avisar em `sync/messages.md` antes de editar
- Fazer edições incrementais e pequenas
- Commit imediatamente após edição
- Sync com main antes de editar

---

#### `package.json`
- **Status:** 🟢 Livre para editar
- **Última edição:** 2026-02-03
- **Dependências atuais:** ~50 packages

**Regras:**
- Avisar em `sync/messages.md` ao adicionar dependencies
- Usar mensagem de commit clara: "deps: add [package] for [purpose]"
- Run `npm install` após merge
- Verificar se não quebrou nada

**Próximas adições planejadas:**
- Redis/ioredis (Claude #2, performance-specialist)
- Bull/BullMQ (Claude #2, performance-specialist)
- prom-client (Claude #2, monitoring-specialist)

---

#### `README.md`
- **Status:** 🟢 Livre para editar
- **Última edição:** 2026-02-04
- **Última seção editada:** Discord Formatting

**Regras:**
- Editar apenas SUA seção (Platform ou Core)
- Não remover conteúdo do outro Claude
- Usar markdown consistente
- Commit com mensagem clara

**Seções por responsabilidade:**
- Platform (Claude #1): Discord, Slack, Telegram, WhatsApp sections
- Core (Claude #2): Architecture, Performance, Tools sections
- Shared: Getting Started, Installation, Configuration

---

#### `.env.example`
- **Status:** 🟢 Livre para editar
- **Última edição:** 2026-02-05 (Cloudflare + Security config)

**Regras:**
- Apenas adicionar novas vars, não remover
- Adicionar comentários explicativos
- Valores devem ser EXEMPLOS, não secrets reais
- Avisar em sync/messages.md

**Próximas adições planejadas:**
- REDIS_URL (Claude #2)
- QUEUE_NAME (Claude #2)
- PROMETHEUS_PORT (Claude #2)

---

## 🔴 Arquivos com Conflito Ativo

**Nenhum conflito ativo no momento.**

---

## 🛡️ Regras de Prevenção

### ✅ DO:
1. **Sempre** avise em `sync/messages.md` antes de editar arquivo compartilhado
2. **Sempre** commit imediatamente após editar arquivo compartilhado
3. **Sempre** faça pull/merge antes de começar trabalho
4. Use commits pequenos e frequentes
5. Mensagens de commit descritivas

### ❌ DON'T:
1. **Nunca** edite arquivo do outro Claude sem avisar
2. **Nunca** faça commits grandes com muitos arquivos compartilhados
3. **Nunca** force push sem coordenar
4. **Nunca** remova código do outro Claude
5. **Nunca** demore para commitar arquivo compartilhado

---

## 🚨 Protocolo de Conflito

Se encontrar conflito ao fazer merge:

### 1. Identificar Conflito
```bash
git merge origin/main
# CONFLICT em arquivo X
```

### 2. Analisar
```bash
git diff --merge
cat <<arquivo-com-conflito>>
```

### 3. Comunicar
```bash
echo "🚨 $(date): [seu-nome] - CONFLITO em [arquivo]" >> coordination/sync/conflicts.md
```

### 4. Resolver
- Discutir com outro Claude via messages.md
- Resolver conflito mantendo ambas funcionalidades
- Testar após resolução
- Commit com mensagem clara

### 5. Avisar Resolução
```bash
echo "✅ $(date): [seu-nome] - Conflito resolvido em [arquivo]" >> coordination/sync/conflicts.md
```

---

## 📋 Histórico de Conflitos

### Nenhum conflito registrado ainda

---

## 🔍 Verificar Conflitos Potenciais

Antes de começar trabalho grande:

```bash
# Ver diferenças com main
git diff main

# Ver diferenças com outra branch
git diff feature/core-architecture

# Ver arquivos que ambos editaram
git log --oneline --all --graph
```

---

## 📊 Estatísticas

| Métrica | Valor |
|---------|-------|
| Conflitos totais | 0 |
| Conflitos resolvidos | 0 |
| Conflitos ativos | 0 |
| Arquivos compartilhados | 4 |
| Status geral | 🟢 Verde |

---

## 💡 Dicas

1. **Comunique cedo e frequentemente** - Melhor avisar demais do que de menos
2. **Commits pequenos** - Mais fácil de resolver conflitos
3. **Pull frequentemente** - Mantenha-se atualizado com mudanças
4. **Teste antes de commit** - Evite quebrar build
5. **Seja específico** - Mensagens claras ajudam na resolução

---

**Última atualização:** 2026-02-05
**Status:** 🟢 Sem conflitos
**Próxima verificação:** Antes de cada merge
