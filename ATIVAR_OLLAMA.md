# 🚀 Como Ativar o Ollama no Seu Bot

## ✅ Status Atual

**O que já está feito:**
- ✅ Ollama provider implementado
- ✅ Router integrado com Ollama
- ✅ Build compilado com sucesso
- ✅ Código no GitHub (pushed)
- ✅ **Pronto para usar!**

**Por que o bot disse "não tenho acesso"?**
- Bot está usando Claude porque `OLLAMA_ENABLED=false` (padrão)
- Ollama está na sua máquina mas não conectado ao bot
- Precisa ativar nas configurações

---

## 🔧 Ativar Ollama - 3 Passos Simples

### Passo 1: Verificar Ollama

```bash
# Verificar se Ollama está rodando
ollama list

# Se não aparecer nada, instalar:
curl -fsSL https://ollama.com/install.sh | sh

# Baixar modelo uncensored
ollama pull wizard-vicuna-uncensored:7b
```

### Passo 2: Configurar .env

Edite o arquivo `.env` do projeto:

```bash
# Habilitar Ollama
OLLAMA_ENABLED=true
OLLAMA_MODEL=wizard-vicuna-uncensored:7b
OLLAMA_BASE_URL=http://localhost:11434

# Escolher estratégia
LLM_STRATEGY=hybrid
```

**Estratégias disponíveis:**
- `claude_only` - Sempre Claude (atual)
- `hybrid` - Simples → Ollama, Complexo → Claude ⭐ **Recomendado**
- `local_fallback` - Tenta Ollama, fallback Claude
- `local_only` - Sempre Ollama

### Passo 3: Restart o Bot

```bash
# Se estiver rodando localmente:
# Ctrl+C para parar
npm start

# Se estiver no Render:
# Deploy de novo OU restart manual no dashboard
```

---

## 🎯 Como Testar

Após restart, teste no Slack/Discord:

### Teste 1: Mensagem Simples
```
Você: Oi Ulf!
```

**Esperado nos logs:**
```
[Router] Using Ollama (hybrid: simple task) taskType=simple_chat
[Ollama] Generated response model=wizard-vicuna-uncensored:7b
```

**Resposta:** Deve vir do Ollama (sem filtros)

### Teste 2: Tarefa Complexa
```
Você: @Ulf cria uma API FastAPI
```

**Esperado nos logs:**
```
[Router] Using Claude (hybrid: complex task) taskType=code_generation
```

**Resposta:** Deve vir do Claude (com tools)

### Teste 3: Verificar Status

Adicione no código de teste:

```typescript
const router = getRouter();
const status = await router.getStatus();
console.log('Status:', status);
```

**Esperado:**
```json
{
  "claude": { "available": true, "model": "claude-sonnet-4-20250514" },
  "local": { "available": false },
  "ollama": { "available": true, "model": "wizard-vicuna-uncensored:7b" },
  "strategy": "hybrid"
}
```

---

## 📊 Comportamento por Estratégia

### `hybrid` (Recomendado)

| Tipo de Mensagem | Modelo Usado | Por quê |
|-----------------|--------------|---------|
| "Oi", "Olá" | Ollama | Simples, uncensored |
| "Como está?" | Ollama | Simples |
| "Resuma este texto" | Ollama | Simples |
| "Crie uma API" | Claude | Complexo |
| "Execute comando" | Claude | Tools requeridos |

### `local_fallback`

Tenta Ollama para **tudo**, fallback Claude se falhar.

### `local_only`

**Tudo** via Ollama (exceto tools que sempre usam Claude).

---

## 🐛 Troubleshooting

### Bot ainda responde "não tenho acesso"

**Causa:** Ollama não conectado

**Solução:**
```bash
# 1. Verificar se Ollama está rodando
ollama list

# 2. Iniciar se necessário
ollama serve &

# 3. Verificar .env
cat .env | grep OLLAMA

# Deve ter:
# OLLAMA_ENABLED=true
# OLLAMA_MODEL=wizard-vicuna-uncensored:7b

# 4. Restart bot
npm start
```

### Logs mostram "Ollama not available"

**Causa:** Servidor Ollama não está rodando OU modelo não baixado

**Solução:**
```bash
# Iniciar Ollama
ollama serve

# Baixar modelo
ollama pull wizard-vicuna-uncensored:7b

# Verificar
ollama list
```

### Bot usa Claude mesmo com Ollama habilitado

**Causa:** Tarefa é complexa ou requer tools

**Verificar logs:**
```
[Router] Using Claude (hybrid: complex task)
# Isso é normal - tarefa complexa usa Claude
```

**Para forçar Ollama:**
```env
LLM_STRATEGY=local_only
```

---

## 🎮 Exemplo Prático

### Antes (Claude Only):
```
Você: Oi!
[Router] Using Claude (strategy: claude_only)
Ulf: Olá! Como posso ajudar? [com filtros]
```

### Depois (Ollama Hybrid):
```
Você: Oi!
[Router] Using Ollama (hybrid: simple task)
[Ollama] Generated response model=wizard-vicuna-uncensored:7b
Ulf: [resposta sem filtros, mais natural]
```

---

## 📋 Checklist de Ativação

- [ ] Ollama instalado (`ollama --version`)
- [ ] Modelo baixado (`ollama list`)
- [ ] Ollama rodando (`ollama serve`)
- [ ] `.env` configurado com `OLLAMA_ENABLED=true`
- [ ] Estratégia definida (`LLM_STRATEGY=hybrid`)
- [ ] Bot restartado
- [ ] Teste com mensagem simples
- [ ] Verificar logs (`[Router] Using Ollama`)

---

## 🚀 Deploy no Render

**⚠️ Limitação:** Ollama precisa rodar em servidor separado.

### Opção 1: Dev Local + Prod Claude

```bash
# .env local (dev)
OLLAMA_ENABLED=true
LLM_STRATEGY=hybrid

# Render (prod)
OLLAMA_ENABLED=false
LLM_STRATEGY=claude_only
```

### Opção 2: Servidor Dedicado

1. Deploy Ollama em VPS (DigitalOcean, AWS, etc)
2. Configure URL:
```env
OLLAMA_BASE_URL=http://seu-servidor:11434
OLLAMA_ENABLED=true
```

3. Deploy bot no Render com estas configs

---

## 💡 Dicas

**Para máxima liberdade (uncensored):**
```env
LLM_STRATEGY=local_only
OLLAMA_ENABLED=true
```

**Para economia + qualidade:**
```env
LLM_STRATEGY=hybrid
OLLAMA_ENABLED=true
```

**Para produção (seguro):**
```env
LLM_STRATEGY=claude_only
OLLAMA_ENABLED=false
```

---

## 🎉 Resultado Final

**Com Ollama ativado:**
- ✅ Conversas simples sem filtros
- ✅ Respostas mais naturais
- ✅ 100% privacidade (local)
- ✅ Zero custo API para chats simples
- ✅ Claude ainda disponível para tarefas complexas

**Basta seguir os 3 passos acima!** 🚀
