# 🧠 Sistema de Memória Inteligente - Ulf AI

## 🎯 Visão Geral

Sistema de memória persistente e inteligente com **duas estratégias complementares**:

1. **Vector Store (ChromaDB)** - Busca semântica local
2. **Slack-Native Memory** - Usa canais Slack como backend

---

## 🗂️ Arquitetura

```
src/memory/
├── types.ts           # Tipos de memória (fact, learning, conversation, context)
├── vector-store.ts    # ChromaDB + OpenAI embeddings
├── session-manager.ts # Sessões com auto-save e compressão
├── internet-bridge.ts # Web search (Tavily, Perplexity)
├── slack-memory.ts    # Slack-native memory
└── manager.ts         # Orquestrador principal
```

---

## 🔥 Estratégia 1: Vector Store (ChromaDB)

### Recursos:
- ✅ Busca semântica com embeddings do OpenAI
- ✅ Persistência local em SQLite
- ✅ Auto-extração de fatos/learnings
- ✅ Session management com compressão
- ✅ Internet bridge (web search, docs)

### Tipos de Memória:

```typescript
MemoryType.FACT          // Fatos sobre usuário
MemoryType.LEARNING      // Lições aprendidas
MemoryType.CONVERSATION  // Conversas importantes
MemoryType.CONTEXT       // Contexto de projetos
MemoryType.INSIGHT       // Insights auto-gerados
MemoryType.TOOL_USAGE    // Como tools foram usados
```

### Uso:

```typescript
import { getMemoryManager } from './memory/manager';

const memory = getMemoryManager();
await memory.init();

// Armazenar fato
await memory.storeFact("Lucas prefere FastAPI", "user_123", ["backend", "python"]);

// Busca semântica
const results = await memory.recall("qual framework backend o Lucas usa?");

// Sessões
const sessionId = memory.createSession("user_123");
await memory.saveSession(sessionId, messages);

// Web search
const webResults = await memory.searchWeb("Python async best practices");
```

---

## 🚀 Estratégia 2: Slack-Native Memory

### Recursos:
- ✅ Usa canais Slack como storage
- ✅ Busca nativa do Slack
- ✅ Threads como sessões
- ✅ Pins para mensagens importantes
- ✅ Slash commands integrados
- ✅ Export para arquivos

### Estrutura de Canais:

```
#ulf-memory    → Fatos e learnings
#ulf-logs      → Logs técnicos
#ulf-projects  → Contexto de projetos
```

### Slash Commands:

```bash
# Salvar fato
/ulf-remember Lucas prefere VS Code com Vim keybindings

# Buscar na memória
/ulf-recall python async

# Resumir thread atual
/ulf-summary
```

### Uso no Código:

```typescript
import { SlackMemory, setupSlackMemoryCommands } from './memory/slack-memory';

const slackMemory = new SlackMemory(app);

// Armazenar fato
await slackMemory.storeFact("Lucas prefere FastAPI", userId);

// Buscar
const results = await slackMemory.searchMemory("FastAPI", 5);

// Resumir thread
const summary = await slackMemory.summarizeThread(channel, threadTs);

// Setup slash commands
setupSlackMemoryCommands(app, slackMemory);
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

```env
# OpenAI (para embeddings e resumos)
OPENAI_API_KEY=sk-proj-...

# ChromaDB (usa DATA_DIR automaticamente)
DATA_DIR=./data

# Slack Memory Channels
SLACK_MEMORY_CHANNEL=ulf-memory
SLACK_LOGS_CHANNEL=ulf-logs
SLACK_PROJECTS_CHANNEL=ulf-projects

# Internet Bridge (opcional)
TAVILY_API_KEY=...
PERPLEXITY_API_KEY=...
```

### 2. Criar Canais no Slack

```bash
# Canais privados
/create ulf-memory private
/create ulf-logs private
/create ulf-projects private

# Convidar bot
/invite @ulfberht-warden
```

### 3. Inicializar

```typescript
// No src/index.ts
import { getMemoryManager } from './memory/manager';

async function initialize() {
  // ... existing code ...

  // Initialize memory system
  const memory = getMemoryManager();
  await memory.init();

  log.info('Memory system ready');
}
```

---

## 📊 Auto-Save & Compression

### Auto-Save:
- Salva sessões a cada 5 minutos
- Trigger em conversas longas (>20 mensagens)
- Backup incremental

### Auto-Extraction:
Detecta padrões e salva automaticamente:

```typescript
// Detecta fatos
"prefiro FastAPI" → MemoryType.FACT

// Detecta learnings
"aprendi que async é melhor" → MemoryType.LEARNING
```

### Compression:
- Sessões > 7 dias → Resumidas com GPT
- Sessões > 30 dias → Compactadas
- Background task automático

---

## 🔍 Busca Semântica

### Vector Store (melhor qualidade):

```typescript
// Busca por similaridade semântica
const results = await memory.recall("como fazer API em Python?");

// Filtra por tipo
const facts = await memory.recallByType(
  "preferências de Lucas",
  MemoryType.FACT,
  "user_123"
);
```

### Slack Search (mais rápido):

```typescript
// Busca no histórico do Slack
const results = await slackMemory.searchMemory("FastAPI OR Flask");

// Aproveita search operators do Slack
"in:ulf-memory from:lucas after:2024-01-01"
```

---

## 🌐 Internet Bridge

### Web Search:

```typescript
// Via Tavily (melhor)
const results = await memory.searchWeb("Python async patterns");

// Retorna:
// - AI-generated answer
// - Top 5 search results
// - Snippets
```

### Fetch Docs:

```typescript
// Buscar e parsear documentação
const docs = await memory.fetchDocs("https://fastapi.tiangolo.com");

// Retorna texto limpo (10k chars max)
```

### GitHub Code Search:

```typescript
// Buscar exemplos de código
const examples = await memory.searchGitHub("FastAPI websocket", "python");
```

---

## 💾 Session Management

### Criar Sessão:

```typescript
const sessionId = memory.createSession(userId);
```

### Salvar:

```typescript
await memory.saveSession(sessionId, messages);
```

### Carregar:

```typescript
const loaded = await memory.loadSession(sessionId);
// Returns: { session, messages }
```

### Resumir:

```typescript
const summary = await memory.summarizeSession(sessionId, messages);
```

### Listar:

```typescript
const sessions = memory.listSessions();
// Ordenado por lastActivity (mais recente primeiro)
```

---

## 🎯 Casos de Uso

### 1. Lembrar Preferências

```typescript
// Usuário diz: "Prefiro usar TypeScript"
await memory.storeFact("Prefere TypeScript over JavaScript", userId, ["languages"]);

// Depois, buscar:
const prefs = await memory.recallByType("preferências", MemoryType.FACT, userId);
```

### 2. Contexto de Projeto

```typescript
// Salvar contexto
await memory.storeContext(
  "API: FastAPI + PostgreSQL + Redis. Deploy: Render",
  userId,
  "my-api-project"
);

// Buscar depois
const context = await memory.recall("meu projeto de API");
```

### 3. Sessões Longas

```typescript
// Auto-save a cada 5 min
memory.sessionManager.startAutoSave(300000);

// Resumir ao final
const summary = await memory.summarizeSession(sessionId, messages);

// Exportar insights
const insights = await memory.sessionManager.exportInsights(sessionId);
```

### 4. Web Research

```typescript
// Usuário: "Busca como fazer WebSockets no FastAPI"
const results = await memory.searchWeb("FastAPI WebSockets tutorial");

// Fetch docs específicos
const docs = await memory.fetchDocs("https://fastapi.tiangolo.com/advanced/websockets/");
```

---

## 📈 Estatísticas

```typescript
const stats = await memory.getStats();

// Retorna:
// {
//   totalMemories: 142,
//   byType: {
//     fact: 45,
//     learning: 32,
//     conversation: 40,
//     context: 15,
//     insight: 10
//   }
// }
```

---

## 🔧 Integração com Agent

```typescript
// src/agent.ts
import { getMemoryManager } from './memory/manager';

export async function runAgent(options: AgentOptions): Promise<string> {
  const memory = getMemoryManager();

  // Buscar contexto relevante
  const context = await memory.recall(options.userMessage, options.userId, 3);

  // Adicionar ao system prompt
  const contextText = context
    .map(r => `[Memory] ${r.memory.content}`)
    .join('\n');

  const systemPrompt = workspace.getSystemPrompt() + `\n\n${contextText}`;

  // ... rest of agent logic ...

  // Auto-extract memories após resposta
  await memory.autoExtractMemories(messages, options.userId, sessionId);
}
```

---

## 🚀 Roadmap

### Implementado: ✅
- ChromaDB vector store
- OpenAI embeddings
- Session manager com auto-save
- Internet bridge (Tavily, Perplexity, GitHub)
- Slack-native memory
- Auto-extraction
- Compression
- Slash commands

### TODO:
- [ ] CLI para gestão (`ulf-memory` command)
- [ ] Integration com agent (auto-recall)
- [ ] Memory analytics dashboard
- [ ] Multi-user memory sharing
- [ ] Memory export/import
- [ ] Advanced compression strategies

---

## 📚 API Reference

### MemoryManager

```typescript
class MemoryManager {
  // Storage
  async storeFact(content: string, userId: string, tags?: string[]): Promise<string>
  async storeLearning(content: string, userId: string, project?: string): Promise<string>
  async storeContext(content: string, userId: string, project: string): Promise<string>

  // Retrieval
  async recall(query: string, userId?: string, limit?: number): Promise<SearchResult[]>
  async recallByType(query: string, type: MemoryType, userId?: string): Promise<SearchResult[]>

  // Sessions
  createSession(userId: string): string
  async saveSession(sessionId: string, messages: MessageParam[]): Promise<void>
  async loadSession(sessionId: string): Promise<{ session, messages } | null>
  listSessions(): SessionContext[]
  async summarizeSession(sessionId: string, messages: MessageParam[]): Promise<string>

  // Internet
  async searchWeb(query: string, maxResults?: number): Promise<SearchResult[]>
  async fetchDocs(url: string): Promise<string>
  async searchGitHub(query: string, language?: string): Promise<CodeSearchResult[]>

  // Maintenance
  async compressOldSessions(): Promise<number>
  async getStats(): Promise<{ totalMemories, byType }>
}
```

### SlackMemory

```typescript
class SlackMemory {
  async storeFact(content: string, userId: string, threadTs?: string): Promise<void>
  async storeLearning(content: string, userId: string, project?: string): Promise<void>
  async storeProjectContext(projectName: string, context: string, userId: string): Promise<void>
  async searchMemory(query: string, limit?: number): Promise<SlackSearchResult[]>
  async summarizeThread(channel: string, threadTs: string): Promise<string>
  async pinMessage(channel: string, timestamp: string): Promise<void>
  async scheduleReminder(channel: string, text: string, postAt: number): Promise<void>
  async exportMemory(channel: string, userId: string): Promise<string>
}
```

---

## 🎉 Resultado

**Ulf agora tem:**
- 🧠 Memória persistente e inteligente
- 🔍 Busca semântica com embeddings
- 💾 Sessões com auto-save
- 🌐 Acesso à internet (search, docs, GitHub)
- ⚡ Auto-extração de insights
- 📦 Compressão automática
- 💬 Integração nativa com Slack
- 🛠️ Slash commands

**Próxima evolução: Assistente pessoal com memória de longo prazo!** 🚀
