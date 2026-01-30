# Usando Modelos Llama Uncensored

## 🔓 O que são modelos Uncensored?

Modelos "uncensored" são versões sem filtros de segurança, permitindo respostas mais livres sem restrições éticas pré-programadas.

**⚠️ AVISO IMPORTANTE:**
- Use com responsabilidade
- Ciente das implicações éticas
- Respeite leis locais
- Não recomendado para produção pública

## 🎯 Recomendação: Usar Ollama

Para modelos uncensored, **Ollama é a melhor opção** porque:
- ✅ Suporta GGUF nativo (formato dos Llamas)
- ✅ Mais rápido que transformers.js
- ✅ Maior seleção de modelos uncensored
- ✅ Fácil instalação e gerenciamento
- ✅ Funciona localmente (privacidade total)

## 📦 Setup Completo - 5 Passos

### Passo 1: Instalar Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Baixe em: https://ollama.com/download

**Verificar:**
```bash
ollama --version
```

### Passo 2: Baixar Modelo Uncensored

**Recomendado para começar:**
```bash
ollama pull wizard-vicuna-uncensored:7b
```

**Outros modelos disponíveis:**
```bash
# Dolphin Mistral (excelente)
ollama pull dolphin-mistral:7b

# Llama 3 Uncensored (mais recente)
ollama pull llama3-uncensored:8b

# Neural Chat (rápido)
ollama pull neural-chat-uncensored:7b
```

### Passo 3: Testar

```bash
ollama run wizard-vicuna-uncensored:7b
```

### Passo 4: Configurar Ulf

**Edite `.env`:**
```env
# Habilitar Ollama
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=wizard-vicuna-uncensored:7b

# Estratégia
LLM_STRATEGY=hybrid
```

### Passo 5: Integrar Provider

O provider Ollama já foi criado em `src/llm/ollama.ts`!

**Agora precisa integrar ao router:**

Edite `src/llm/router.ts` - adicione no início:
```typescript
import { getOllamaProvider } from './ollama';
```

No constructor, adicione:
```typescript
private ollamaProvider: LLMProvider;

constructor() {
  this.claudeProvider = getClaudeProvider();
  this.localProvider = getLocalProvider();
  this.ollamaProvider = getOllamaProvider(); // ADICIONE
  // ...
}
```

Rebuild e restart:
```bash
npm run build
npm start
```

## 🎮 Como Usar

### Modo 1: Híbrido (Recomendado)

```env
LLM_STRATEGY=hybrid
OLLAMA_ENABLED=true
```

- Conversas simples → Ollama (uncensored)
- Tarefas complexas → Claude
- Tools → Claude

### Modo 2: Ollama Prioritário

```env
LLM_STRATEGY=local_fallback
OLLAMA_ENABLED=true
```

- Tenta Ollama primeiro
- Fallback para Claude se falhar
- Máxima liberdade

### Modo 3: Somente Ollama

```env
LLM_STRATEGY=local_only
OLLAMA_ENABLED=true
```

- Todas respostas via Ollama
- Zero custo API
- 100% uncensored

## 📊 Modelos Recomendados

### ⭐ Melhor Custo-Benefício
**wizard-vicuna-uncensored:7b**
- Tamanho: ~4GB
- RAM: 8GB recomendado
- Velocidade: Rápido
- Qualidade: Boa

### 🏆 Melhor Qualidade
**dolphin-mistral:7b**
- Tamanho: ~4.5GB
- RAM: 8GB recomendado
- Velocidade: Rápido
- Qualidade: Excelente

### 🆕 Mais Recente
**llama3-uncensored:8b**
- Tamanho: ~5GB
- RAM: 10GB recomendado
- Velocidade: Moderado
- Qualidade: Excelente

### 💪 Alta Performance
**wizard-vicuna-uncensored:13b**
- Tamanho: ~8GB
- RAM: 16GB+ recomendado
- Velocidade: Lento
- Qualidade: Melhor possível

## 🚀 Deploy no Render

**⚠️ Limitação:** Ollama requer servidor rodando localmente ou em servidor dedicado.

**Opções:**

### Opção 1: Desenvolvimento Local
- Ollama roda na sua máquina
- Ulf se conecta via localhost
- Melhor para testes

### Opção 2: Servidor Dedicado
- Deploy Ollama em VPS separado
- Ulf se conecta via URL
- Melhor para produção

```env
OLLAMA_BASE_URL=http://seu-servidor:11434
```

### Opção 3: Híbrido (Recomendado)
- Desenvolvimento: Ollama local
- Produção: Claude only
- Troque via env var

## 🐛 Troubleshooting

### "Ollama not available"

```bash
# Iniciar Ollama
ollama serve
```

### "Model not found"

```bash
# Listar modelos
ollama list

# Baixar
ollama pull wizard-vicuna-uncensored:7b
```

### Muito lento

- Use modelo 7B em vez de 13B
- Adicione mais RAM
- Use GPU se disponível

## 📝 Resumo Rápido

```bash
# 1. Instalar
curl -fsSL https://ollama.com/install.sh | sh

# 2. Baixar modelo
ollama pull wizard-vicuna-uncensored:7b

# 3. Testar
ollama run wizard-vicuna-uncensored:7b

# 4. Configurar .env
echo "OLLAMA_ENABLED=true" >> .env
echo "OLLAMA_MODEL=wizard-vicuna-uncensored:7b" >> .env

# 5. Integrar ao router (manual)
# Edite src/llm/router.ts como mostrado acima

# 6. Build e run
npm run build
npm start
```

**Pronto!** Agora Ulf usa Llama uncensored para respostas sem filtros! 🎉

## 🔗 Links Úteis

- [Ollama](https://ollama.com)
- [Modelos](https://ollama.com/library)
- [Wizard Vicuna](https://huggingface.co/TheBloke/Wizard-Vicuna-7B-Uncensored-GGUF)
- [Dolphin Mistral](https://huggingface.co/cognitivecomputations/dolphin-2.2.1-mistral-7b)
