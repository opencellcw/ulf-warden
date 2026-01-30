# 🚀 Guia Rápido - Llama Uncensored no Ulf

## ✅ O que foi feito

**Push:** ✅ Feito! Código está no GitHub
**Provider Ollama:** ✅ Criado em `src/llm/ollama.ts`
**Documentação:** ✅ Completa em `docs/UNCENSORED_MODELS.md`

## 🎯 Como usar (5 minutos)

### 1️⃣ Instalar Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Windows: https://ollama.com/download
```

### 2️⃣ Baixar modelo uncensored

```bash
# Recomendado (4GB, rápido)
ollama pull wizard-vicuna-uncensored:7b

# OU melhor qualidade (4.5GB)
ollama pull dolphin-mistral:7b
```

### 3️⃣ Testar

```bash
ollama run wizard-vicuna-uncensored:7b
```

### 4️⃣ Configurar Ulf

Adicione no `.env`:

```env
# Habilitar Ollama
OLLAMA_ENABLED=true
OLLAMA_MODEL=wizard-vicuna-uncensored:7b
OLLAMA_BASE_URL=http://localhost:11434

# Estratégia (usar Ollama para respostas simples)
LLM_STRATEGY=hybrid
```

### 5️⃣ Integrar ao Router

**Edite `src/llm/router.ts`:**

```typescript
// No topo do arquivo, adicione:
import { getOllamaProvider } from './ollama';

// No constructor da classe LLMRouter, adicione:
private ollamaProvider: LLMProvider;
private ollamaAvailable: boolean = false;

constructor() {
  this.claudeProvider = getClaudeProvider();
  this.localProvider = getLocalProvider();
  this.ollamaProvider = getOllamaProvider(); // ADICIONE ESTA LINHA

  // ... resto do código

  // Adicione também:
  this.checkOllamaAvailability();
}

// Adicione este método:
private async checkOllamaAvailability(): Promise<void> {
  this.ollamaAvailable = await this.ollamaProvider.isAvailable();
  log.info('[Router] Ollama availability checked', {
    available: this.ollamaAvailable
  });
}

// No método selectProviderHybrid, ANTES de retornar localProvider:
private selectProviderHybrid(taskType: TaskType): LLMProvider {
  const simpleTasksForLocal = [
    TaskType.SIMPLE_CHAT,
    TaskType.TEXT_CLASSIFICATION,
    TaskType.SUMMARIZATION
  ];

  // ADICIONE ESTA VERIFICAÇÃO:
  if (simpleTasksForLocal.includes(taskType) && this.ollamaAvailable) {
    log.info('[Router] Using Ollama (hybrid: simple task)', { taskType });
    return this.ollamaProvider;
  }

  // Código existente...
  if (simpleTasksForLocal.includes(taskType) && this.localAvailable) {
    log.info('[Router] Using local model (hybrid: simple task)', { taskType });
    return this.localProvider;
  }

  log.info('[Router] Using Claude (hybrid: complex task)', { taskType });
  return this.claudeProvider;
}
```

### 6️⃣ Build e Run

```bash
npm run build
npm start
```

## 🎮 Como funciona

**Com hybrid strategy:**

- "Oi!" → **Ollama** (uncensored, rápido)
- "Como você está?" → **Ollama** (sem filtros)
- "Crie uma API FastAPI" → **Claude** (complexo)
- "Execute comando" → **Claude** (tools)

## 📊 Estratégias disponíveis

```env
# Sempre Claude (padrão, seguro)
LLM_STRATEGY=claude_only

# Híbrido - simples=Ollama, complexo=Claude (recomendado)
LLM_STRATEGY=hybrid

# Tenta Ollama primeiro, fallback Claude
LLM_STRATEGY=local_fallback

# Sempre Ollama (sem custos API)
LLM_STRATEGY=local_only
```

## 🎯 Modelos Disponíveis

### Começar com (7B):
```bash
ollama pull wizard-vicuna-uncensored:7b
```
- **Tamanho:** ~4GB
- **RAM:** 8GB recomendado
- **Velocidade:** Rápido
- **Sem filtros:** ✅

### Melhor qualidade (7B):
```bash
ollama pull dolphin-mistral:7b
```
- **Tamanho:** ~4.5GB
- **RAM:** 8GB recomendado
- **Qualidade:** Excelente
- **Muito criativo:** ✅

### Llama 3 (8B):
```bash
ollama pull llama3-uncensored:8b
```
- **Tamanho:** ~5GB
- **RAM:** 10GB recomendado
- **Mais recente:** ✅

## 🔧 Comandos Úteis

```bash
# Ver modelos instalados
ollama list

# Remover modelo
ollama rm wizard-vicuna-uncensored:7b

# Ver info do Ollama
ollama info

# Iniciar servidor (se não estiver rodando)
ollama serve

# Rodar em background
ollama serve &
```

## ⚡ Quick Test

Depois de configurar:

```bash
# 1. Certifique-se que Ollama está rodando
ollama serve &

# 2. Build
npm run build

# 3. Start Ulf
npm start

# 4. Mande mensagem simples no Slack/Discord
# Deve usar Ollama (sem filtros)

# 5. Cheque os logs
# [Router] Using Ollama (hybrid: simple task)
```

## 🐛 Problemas?

### Ollama não conecta
```bash
# Verificar se está rodando
ollama list

# Se não, inicie
ollama serve
```

### Modelo não encontrado
```bash
# Baixe novamente
ollama pull wizard-vicuna-uncensored:7b
```

### Muito lento
- Use modelo 7B (não 13B)
- Feche outros programas
- Adicione mais RAM

## 💡 Dicas

1. **Privacidade total:** Ollama roda 100% local
2. **Sem custo API:** Grátis após download
3. **GPU opcional:** Funciona em CPU, melhor em GPU
4. **Múltiplos modelos:** Pode ter vários instalados
5. **Troca fácil:** Mude `OLLAMA_MODEL` no .env

## 📝 Resumo Final

**O que você tem agora:**
- ✅ Código completo no GitHub (pushed)
- ✅ Provider Ollama pronto (`src/llm/ollama.ts`)
- ✅ Documentação completa
- ✅ Suporte a modelos uncensored
- ✅ Roteamento inteligente
- ✅ 100% local (privacidade)
- ✅ Zero custo API

**Próximos passos:**
1. Instale Ollama
2. Baixe modelo uncensored
3. Configure .env
4. Integre ao router (edição manual)
5. Build e test

**Resultado:**
- Respostas sem filtros quando usar Ollama
- Custos de API reduzidos
- Privacidade total (local)
- Flexibilidade (escolhe qual modelo usar)

---

**Dúvidas?** Veja documentação completa em `docs/UNCENSORED_MODELS.md`

**Pronto para testar!** 🚀🔓
