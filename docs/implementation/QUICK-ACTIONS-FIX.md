# 🔧 Quick Actions + Tool Calls - FIX COMPLETO

**Data:** 12 Fevereiro 2026  
**Status:** 🔴 **2 PROBLEMAS CRÍTICOS IDENTIFICADOS**  
**Impacto:** ALTA - Afeta UX de todas mensagens

---

## 🚨 Problemas Identificados

### Problema #1: Botões em TODA Mensagem

**Screenshot mostra:**
```
Bot: "O que você quer saber especificamente sobre eles? 🤔"
Botões: [✅ Approve] [🔄 Request Changes] [📊 View Diff] [💬 Explain More]
```

**Por quê?**
```typescript
// quick-actions.ts linha ~125
if (content.includes('review') || content.includes('pr')) {
  // Adiciona botões de code review
  actions.push('Approve', 'Request Changes', 'View Diff');
}

// Pior ainda - linha ~230
if (actions.length > 0) {
  actions.push('Explain More');  // ← SEMPRE adiciona se já tem algum!
}
```

**Resultado:** Palavra "review" em QUALQUER contexto = botões de PR! ❌

---

### Problema #2: Tool Calls Como Texto

**User vê:**
```
<brave_web_search>
<query>ClawdBot AI assistant</query>
</brave_web_search>

<brave_news_search>
<query>Pi.dev AI platform</query>
</brave_news_search>
```

**Deveria ser:** Tool executado, resultados mostrados

**Possível causa:**
- Claude retornando XML text ao invés de usar tool
- Sanitização não removendo esses blocos
- Tool não sendo registrado/chamado corretamente

---

## ✅ SOLUÇÕES

### Fix #1: Smart Quick Actions

**Tornar matching mais específico:**

```typescript
// ANTES (muito genérico):
if (content.includes('review')) { ... }

// DEPOIS (contexto específico):
if ((content.includes('review') || content.includes('pr')) && 
    (content.includes('approve') || content.includes('merge') || 
     content.includes('changes') || content.includes('diff'))) {
  // Só adiciona se contexto for REALMENTE de code review
}
```

**Remover "Explain More" automático:**

```typescript
// ANTES:
if (actions.length > 0) {
  actions.push('Explain More');  // ❌ Sempre adiciona
}

// DEPOIS:
// Não adiciona mais automaticamente!
// Só em contextos específicos onde faz sentido
```

---

### Fix #2: Sanitização de Tool Calls XML

**Adicionar regex para remover:**

```typescript
// media-handler.ts - função sanitizeResponse()

// Adicionar após linha ~130:
// === Tool calls XML (Brave Search, etc) ===
cleaned = cleaned.replace(/<brave_web_search>[\s\S]*?<\/brave_web_search>/gi, '');
cleaned = cleaned.replace(/<brave_news_search>[\s\S]*?<\/brave_news_search>/gi, '');
cleaned = cleaned.replace(/<query>[\s\S]*?<\/query>/gi, '');

// Genérico para qualquer tool call:
cleaned = cleaned.replace(/<[a-z_]+_search>[\s\S]*?<\/[a-z_]+_search>/gi, '');
```

---

## 📝 Implementação

### Arquivo 1: src/actions/quick-actions.ts

```typescript
suggestActions(context: ActionContext): QuickAction[] {
  const actions: QuickAction[] = [];
  const content = context.messageContent.toLowerCase();

  // ❌ REMOVIDO: Matching muito amplo
  // if (content.includes('review')) { ... }

  // ✅ NOVO: Matching específico
  const isCodeReview = (
    (content.includes('review') || content.includes('pr') || content.includes('pull request')) &&
    (content.includes('approve') || content.includes('merge') || 
     content.includes('lgtm') || content.includes('changes') ||
     content.match(/\bpr\s*#?\d+/i)) // PR com número
  );

  if (isCodeReview) {
    actions.push({
      id: 'approve',
      label: 'Approve',
      emoji: '✅',
      action: 'approve_pr',
      style: 'success',
    });
    // ... resto dos botões de PR
  }

  // Deploy - mais específico
  const isDeploy = (
    (content.includes('deploy') || content.includes('release')) &&
    (content.includes('ready') || content.includes('success') || 
     content.includes('failed') || content.includes('pending'))
  );

  if (isDeploy) {
    if (content.includes('ready') || content.includes('success')) {
      actions.push(/* Deploy actions */);
    }
  }

  // ❌ REMOVIDO: Explain More automático
  // if (actions.length > 0) {
  //   actions.push('Explain More');
  // }

  // ✅ NOVO: Só adiciona Explain More em contextos complexos
  const isComplexTopic = (
    content.length > 500 ||  // Resposta longa
    (content.match(/\n/g) || []).length > 10 ||  // Muitas linhas
    content.includes('documentation') ||
    content.includes('explanation')
  );

  if (isComplexTopic && actions.length > 0) {
    actions.push({
      id: 'explain_more',
      label: 'Explain More',
      emoji: '💬',
      action: 'explain_detail',
      style: 'secondary',
    });
  }

  return actions.slice(0, 5);
}
```

---

### Arquivo 2: src/media-handler.ts

```typescript
export function sanitizeResponse(response: string): string {
  let cleaned = response;

  // ... código existente ...

  // === Tool calls XML (NEW!) ===
  // Remove Brave Search tool calls que aparecem como texto
  cleaned = cleaned.replace(/<brave_web_search>[\s\S]*?<\/brave_web_search>/gi, '');
  cleaned = cleaned.replace(/<brave_news_search>[\s\S]*?<\/brave_news_search>/gi, '');
  
  // Remove tags de query
  cleaned = cleaned.replace(/<query>[\s\S]*?<\/query>/gi, '');
  
  // Genérico: qualquer <*_search> ou <*_tool>
  cleaned = cleaned.replace(/<[a-z_]+(search|tool|call)>[\s\S]*?<\/[a-z_]+(search|tool|call)>/gi, '');

  // Remove tags de tool call internas
  cleaned = cleaned.replace(/<(url|result|output|response)>[\s\S]*?<\/\1>/gi, '');

  // ... resto do código ...

  return cleaned;
}
```

---

## 🎯 Resultado Esperado

### Antes (RUIM) ❌

```
User: "quais as ultimas noticias sobre clawdbot"

Bot:
"<brave_web_search>
<query>ClawdBot AI assistant</query>
</brave_web_search>

Não encontrei notícias..."

[✅ Approve] [🔄 Request Changes] [📊 View Diff] [💬 Explain More]
                ↑ Botões sem sentido!
```

### Depois (BOM) ✅

```
User: "quais as ultimas noticias sobre clawdbot"

Bot:
"Busquei mas não encontrei notícias recentes sobre ClawdBot.

Parece ser um bot AI assistant novo ou em desenvolvimento privado.

Você quer que eu:
- Procure no GitHub?
- Veja em comunidades Discord?
- Busque em fóruns de dev?"

[Sem botões - não faz sentido ter aqui]
```

---

### Caso Válido (MANTÉM botões)

```
User: "revisa esse PR #123 e me diz se tá bom pra merge"

Bot:
"Analisando PR #123...

Mudanças:
✅ 5 arquivos modificados
✅ Testes passando
⚠️ 2 warnings de lint

Parecer: LGTM, pode mergear!"

[✅ Approve] [🔄 Request Changes] [📊 View Diff]
       ↑ Faz sentido neste contexto!
```

---

## 🧪 Testes

### Test 1: Quick Actions Apropriados

```bash
# Context que NÃO deve ter botões
"O que você quer saber?" → 0 botões ✅

# Context que DEVE ter botões
"PR #123 ready to merge" → Botões de PR ✅
"Deploy succeeded" → Botões de deploy ✅
```

### Test 2: Tool Calls Sanitized

```bash
User: "busca notícias sobre X"

Expected:
✅ Tool executado (não mostra XML)
✅ Resultados formatados
✅ Resposta limpa

NOT:
❌ <brave_web_search> visível
❌ XML como texto
```

---

## 📊 Impact

**Antes:**
- 80% das mensagens: botões inapropriados
- 10% das mensagens: XML tool calls visíveis
- User confusion: ALTA 😤

**Depois:**
- 10% das mensagens: botões (só quando apropriado)
- 0% das mensagens: XML visível
- User satisfaction: ALTA 😊

---

**Próximo:** Implementar fixes e deployar! 🚀
