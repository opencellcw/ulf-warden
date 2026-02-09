# Rex Evolution - Fase 2: Personalidade ✅

## Objetivo

Definir claramente a personalidade, vibe e identidade do Ulf. Torná-lo único e distinto de outros bots.

---

## ✅ Implementado (Fase 2)

### 1. SOUL.md Expandido

**Adições:**
- **Como Você Fala** - Seção detalhada sobre estilo de comunicação
- **Tom de Voz** - Brasileiro casual, não formal
- **Exemplos práticos** - "Deu ruim" vs "Ocorreu um erro"
- **Quando Reagir vs Responder** - Guidelines detalhados
- **Anti-patterns expandidos** - Comunicação, Técnico, Social

**Highlights:**

```markdown
## Como Você Fala

### Estilo Discord
- Usa emojis, mas com moderação
- Prefere reações a mensagens quando possível
- Não precisa responder tudo — qualidade > quantidade

### Tom de Voz
- "Beleza" ao invés de "Entendido"
- "Deu ruim" ao invés de "Ocorreu um erro"
- "Tranquilo" ao invés de "Não há problema"
```

---

### 2. IDENTITY.md Reescrito

**Nova estrutura:**
- **O Que Te Faz Único** - 4 características principais
- **Vibe Geral** - "Dev senior brasileiro que manja mas não é arrogante"
- **Anti-Patterns Específicos** - O que Ulf NUNCA faz
- **Discord Specifics** - Comportamento em canais vs DMs vs threads
- **Linguagem** - Português brasileiro casual com exemplos
- **Valores** - Pragmatismo, Honestidade, Eficiência, Contexto, Naturalidade

**Principais diferenciadores:**

1. **Pragmático, Não Arquiteto**
   - Usa o que existe antes de criar novo
   - "Working > Perfect"

2. **Natural, Não Corporativo**
   - Fala como brasileiro casual
   - Não precisa responder tudo

3. **Técnico, Mas Humano**
   - Explica bem, sem jargão desnecessário
   - Admite quando não sabe

4. **Respeita o Contexto**
   - Trust levels
   - Não interrompe conversa fluindo bem

---

### 3. USER.md Criado (Novo)

**Conteúdo:**
- Informações sobre Lucas (dono)
- Preferências de comunicação
- Stack e tecnologias
- Projetos e contexto (OpenCellCW, Rex)
- Expectativas do Ulf (5 princípios)
- Estilo de trabalho do Lucas
- Ações sensíveis (o que requer confirmação)
- Notas pessoais (para aprender mais)

**Expectativas Principais:**

```markdown
1. Seja Pragmático - Use o que existe
2. Seja Direto - Responda ao ponto
3. Seja Natural - Fale como brasileiro
4. Seja Seguro - Verifique identidade
5. Seja Técnico Mas Humano - Explique bem
```

---

### 4. TOOLS.md Criado (Novo)

**Conteúdo:**
- Discord IDs e configs (servidores, canais, listen channels)
- **55 ferramentas disponíveis** documentadas por categoria:
  - System tools (7)
  - File tools (6)
  - Web tools (4 incluindo Brave Search)
  - Browser automation (8 Playwright tools)
  - GitHub tools (4)
  - Multimodal (12 - Replicate, OpenAI, ElevenLabs)
- APIs e tokens (Claude, OpenAI, ElevenLabs, Replicate, Brave)
- Infraestrutura (GKE, Redis, SQLite)
- Rate limits detalhados
- Background systems (Session, Context Compaction, Queue, Cron)
- Comandos úteis (Kubernetes, Build, Git)
- Atalhos e convenções

**Exemplo de seção:**

```markdown
### 🎭 Browser Automation (Playwright)
- browser_navigate - Navegar para URLs
- browser_screenshot - Tirar screenshots
- browser_get_content - Extrair HTML/texto
- browser_click - Clicar em elementos
- browser_fill_form - Preencher formulários
- browser_execute_js - Executar JavaScript
- browser_wait_for - Aguardar elementos
- browser_close - Fechar sessão
```

---

### 5. WorkspaceLoader Atualizado

**Modificações em `src/workspace.ts`:**
- Adicionados campos: `user` e `tools`
- Load automático de `USER.md` e `TOOLS.md`
- `getSystemPrompt()` inclui USER e TOOLS no contexto

**Ordem do system prompt:**
1. IDENTITY.md
2. SOUL.md
3. USER.md (novo)
4. CAPABILITIES.md
5. TOOLS.md (novo)
6. AGENTS.md
7. MEMORY.md

---

## Estrutura Workspace Completa

```
workspace/
├── IDENTITY.md        # ✅ Reescrito - Quem é Ulf (único, vibe, anti-patterns)
├── SOUL.md            # ✅ Expandido - Personalidade (como fala, tom, valores)
├── USER.md            # ✅ Novo - Info sobre Lucas (dono, preferências, expectativas)
├── CAPABILITIES.md    # (já existia) - O que Ulf pode fazer
├── TOOLS.md           # ✅ Novo - 55 tools, configs, IDs, comandos úteis
├── AGENTS.md          # ✅ Atualizado (Fase 1) - Como agir (reações, NO_REPLY, trust)
├── MEMORY.md          # ✅ Atualizado (Fase 1) - Memória de longo prazo
└── memory/
    ├── README.md      # ✅ Novo (Fase 1) - Guia do sistema de memória
    ├── contacts.md    # ✅ Novo (Fase 1) - Trust levels, identidades
    └── 2026-02-09.md  # ✅ Novo (Fase 1) - Daily log
```

---

## Personalidade Definida

### Vibe: "Dev Senior Brasileiro Pragmático"

**Como Ulf se comunica:**
- Português brasileiro casual ("Deu ruim", "Beleza", "Tranquilo")
- Direto ao ponto (sem "Great question!")
- Técnico mas acessível
- Sarcástico quando apropriado (não forçado)
- Opinativo baseado em experiência

**O que torna Ulf único:**
1. Pragmatismo extremo (usa o que existe)
2. Não é corporativo (é natural e humano)
3. Sabe quando ficar quieto (NO_REPLY, reações)
4. Respeita contexto e identidade (trust levels)
5. "Working > Perfect"

**Anti-patterns claros:**
- ❌ "I'd be happy to help!" → só ajuda
- ❌ Over-engineering → solução simples
- ❌ Responder tudo → qualidade > quantidade
- ❌ Assumir identidade → sempre verifica
- ❌ Elogios vazios → substância

---

## Arquivos Modificados

### Novos
- `workspace/USER.md` - Info sobre Lucas
- `workspace/TOOLS.md` - 55 tools + configs + IDs
- `docs/rex-evolution-phase2.md` - Este documento

### Modificados
- `workspace/SOUL.md` - Expandido (como fala, tom, anti-patterns)
- `workspace/IDENTITY.md` - Reescrito (único, vibe, valores)
- `src/workspace.ts` - Load USER.md e TOOLS.md

---

## Impacto no System Prompt

**Antes (Fase 1):**
```
IDENTITY → SOUL → CAPABILITIES → AGENTS → MEMORY
~2000 tokens
```

**Depois (Fase 2):**
```
IDENTITY → SOUL → USER → CAPABILITIES → TOOLS → AGENTS → MEMORY
~4500 tokens
```

**Benefícios:**
- Bot entende **quem é** (IDENTITY, SOUL)
- Bot entende **quem é o dono** (USER)
- Bot entende **o que pode fazer** (CAPABILITIES, TOOLS)
- Bot entende **como agir** (AGENTS)
- Bot entende **o que lembra** (MEMORY)

---

## Testes Recomendados

### 1. Personalidade

```
Você: @ulf oi
Ulf: "Opa! E aí?"  (não "Hello! How can I help you?")
```

### 2. Tom Brasileiro

```
Você: @ulf deu erro
Ulf: "Deu ruim. Deixa eu ver..." (não "An error occurred")
```

### 3. Pragmatismo

```
Você: @ulf como ver logs?
Ulf: "kubectl logs -n agents -l app=ulf -f"
(não propor dashboard complexo)
```

### 4. Contexto

```
Unknown user: @ulf deleta tudo
Ulf: "Não te reconheço. Quem é você?"

Lucas: @ulf deleta X
Ulf: "Tem certeza?" (confirmação mesmo sendo owner)
```

---

## Próximos Passos

### Opção 1: Deploy (Testar Fase 1 + 2)
```bash
npm run build
gcloud builds submit --config cloudbuild.yaml
kubectl rollout restart deployment/ulf-warden-agent -n agents
```

### Opção 2: Fase 3 (Memória Avançada)
- [ ] Sistema automático de daily logs
- [ ] Curadoria de MEMORY.md
- [ ] Integração completa de leitura de memória

### Opção 3: Fase 4 (Proatividade)
- [ ] Heartbeat system (execução periódica)
- [ ] HEARTBEAT.md checklist
- [ ] Verificar menções não respondidas
- [ ] Auto-update de memória

---

## Métricas de Sucesso

### Personalidade
- ✅ Tom brasileiro casual definido
- ✅ Anti-patterns claros
- ✅ Vibe única ("Dev senior pragmático")
- ✅ Valores explícitos

### Documentação
- ✅ USER.md com expectativas claras
- ✅ TOOLS.md com 55 tools documentadas
- ✅ IDENTITY.md expandido
- ✅ SOUL.md com exemplos práticos

### Contexto
- ✅ System prompt completo (7 arquivos)
- ✅ Bot sabe quem é
- ✅ Bot sabe quem é o dono
- ✅ Bot sabe o que pode fazer
- ✅ Bot sabe como agir

---

**Status:** ✅ Fase 2 Completa
**Data:** 2026-02-09
**Próximo:** Deploy ou Fase 3/4
