# 🔥 Ollama Uncensored no RunPod + Ulf no Render

## Arquitetura

```
┌─────────────┐      ┌──────────────┐      ┌─────────────────────┐
│    Slack    │─────▶│ Ulf (Render) │─────▶│ Ollama (RunPod GPU) │
└─────────────┘      └──────────────┘      └─────────────────────┘
                            │
                            └──────────────▶ Claude API (backup)
```

**Vantagens:**
- ✅ Ollama roda em GPU potente (RunPod)
- ✅ Ulf roda 24/7 barato (Render free tier)
- ✅ Sem censura nos modelos locais
- ✅ Fallback para Claude em tasks complexas

---

## 📦 PARTE 1: Setup Ollama no RunPod

### 1.1 Criar Pod no RunPod

1. Acesse [runpod.io](https://runpod.io)
2. **Deploy** → **GPU Pods**
3. Escolha template:
   - **PyTorch** ou **Ubuntu + CUDA**
   - GPU: **RTX 3090** (24GB VRAM) ou **A4000** (16GB VRAM)
   - Custo: ~$0.30-0.50/hora
4. Configurar:
   - Volume persistente: **20GB** (para modelo + cache)
   - Expose HTTP ports: `11434`
   - Container Disk: **50GB**

### 1.2 Instalar Ollama no RunPod

Conecte via SSH ou Web Terminal:

```bash
# 1. Instalar Ollama
curl -fsSL https://ollama.com/install.sh | sh

# 2. Iniciar Ollama (expor para rede externa)
OLLAMA_HOST=0.0.0.0:11434 ollama serve &

# 3. Baixar modelo uncensored
ollama pull wizard-vicuna-uncensored:7b

# Ou modelo maior (precisa mais VRAM):
# ollama pull wizard-vicuna-uncensored:13b

# 4. Testar
ollama run wizard-vicuna-uncensored:7b "Oi, você está funcionando?"
```

### 1.3 Manter Ollama Rodando (PM2)

```bash
# Instalar PM2
npm install -g pm2

# Criar script de inicialização
cat > ~/start-ollama.sh << 'EOF'
#!/bin/bash
export OLLAMA_HOST=0.0.0.0:11434
ollama serve
EOF

chmod +x ~/start-ollama.sh

# Rodar com PM2
pm2 start ~/start-ollama.sh --name ollama

# Auto-start no boot
pm2 startup
pm2 save

# Verificar status
pm2 status
pm2 logs ollama
```

### 1.4 Expor Ollama para Internet

**Opção A: Usar RunPod Proxy (mais fácil)**

RunPod automaticamente expõe portas. Anote a URL:
```
https://<pod-id>-11434.proxy.runpod.net
```

**Opção B: Cloudflare Tunnel (mais seguro)**

```bash
# Instalar cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# Criar túnel
cloudflared tunnel --url http://localhost:11434
# Anote a URL gerada (ex: https://random-name.trycloudflare.com)
```

---

## 🤖 PARTE 2: Conectar Ulf (Render) ao Ollama (RunPod)

### 2.1 Configurar .env no Render

No dashboard do Render, adicione as variáveis:

```env
# Ollama remoto (RunPod)
OLLAMA_ENABLED=true
OLLAMA_BASE_URL=https://<pod-id>-11434.proxy.runpod.net
OLLAMA_MODEL=wizard-vicuna-uncensored:7b

# Ou se usar Cloudflare:
# OLLAMA_BASE_URL=https://random-name.trycloudflare.com

# Manter Claude como backup
ANTHROPIC_API_KEY=sk-ant-api03-xxx
```

### 2.2 Testar Conexão

Após configurar, verifique os logs do Render:

```
[info]: [Router] Ollama availability checked {"available":true}
[info]: [Ollama] Connected to remote Ollama at https://...
```

### 2.3 Como Funciona

O router (`src/llm/router.ts`) decide automaticamente:

| Tipo de Task | LLM Usado |
|--------------|-----------|
| Chat simples, perguntas básicas | **Ollama uncensored** 🔥 |
| Código, análise, ferramentas | **Claude API** 🧠 |
| Ollama offline/erro | **Claude API** (fallback) |

---

## 🧪 PARTE 3: Testar

### 3.1 No Slack

```
# Task simples (vai pro Ollama uncensored)
@Ulf me conta uma piada sem censura

# Task complexa (vai pro Claude)
@Ulf analisa esse código e sugere melhorias: [código]

# Com tool use (sempre Claude)
@Ulf gera uma imagem de uma espada viking
```

### 3.2 Verificar Logs

**No Render:**
```
[info]: [Router] Selected provider: ollama (task: simple_chat)
[info]: [Ollama] Generating response...
```

**No RunPod:**
```bash
pm2 logs ollama

# Deve mostrar requests chegando:
# POST /api/generate
```

---

## 💰 Custos

| Serviço | Custo |
|---------|-------|
| **Render** (Ulf bot) | Grátis (free tier) |
| **RunPod** (Ollama GPU) | $0.30-0.50/hora (~$7-15/mês se 24/7) |
| **Claude API** | Pay-per-use (backup) |

**💡 Dica:** Configure auto-shutdown no RunPod quando não estiver usando (horário noturno, finais de semana).

---

## 🔧 Troubleshooting

### Ollama não conecta

```bash
# No RunPod, verificar se está rodando:
pm2 status

# Testar localmente no RunPod:
curl http://localhost:11434/api/tags

# Deve retornar lista de modelos
```

### Render não alcança RunPod

```bash
# Verificar se porta está exposta:
# No dashboard RunPod: TCP Port Mappings → 11434

# Testar URL pública:
curl https://<pod-id>-11434.proxy.runpod.net/api/tags
```

### Modelo muito lento

- Trocar para GPU mais potente (RTX 4090, A6000)
- Usar modelo menor: `wizard-vicuna-uncensored:7b` em vez de `:13b`
- Aumentar `num_gpu` no Ollama

### Out of Memory

```bash
# Verificar VRAM:
nvidia-smi

# Limpar cache:
ollama rm wizard-vicuna-uncensored:7b
ollama pull wizard-vicuna-uncensored:7b
```

---

## 🚀 Melhorias Futuras

### 1. Load Balancer (múltiplos RunPods)

Se tiver tráfego alto, rode múltiplas instâncias:

```env
OLLAMA_BASE_URL=https://runpod1.com,https://runpod2.com,https://runpod3.com
```

Adicionar round-robin em `src/llm/router.ts`.

### 2. Cache de Respostas

Adicionar Redis para cachear respostas comuns:

```typescript
// Evita chamar Ollama pra mesma pergunta
const cached = await redis.get(`ollama:${prompt_hash}`);
```

### 3. Monitoria

Adicionar health check:

```typescript
// src/llm/ollama.ts
async healthCheck(): Promise<boolean> {
  try {
    const response = await axios.get(`${this.baseUrl}/api/tags`);
    return response.status === 200;
  } catch {
    return false;
  }
}
```

---

## 📊 Status Atual

Depois de configurado, verifique em `/health`:

```json
{
  "status": "healthy",
  "llm": {
    "ollama": {
      "available": true,
      "url": "https://xxx-11434.proxy.runpod.net",
      "model": "wizard-vicuna-uncensored:7b"
    },
    "claude": {
      "available": true,
      "fallback": true
    }
  }
}
```

---

## ✅ Checklist de Setup

- [ ] RunPod Pod criado com GPU
- [ ] Ollama instalado no RunPod
- [ ] Modelo `wizard-vicuna-uncensored:7b` baixado
- [ ] Ollama exposto na porta 11434
- [ ] PM2 rodando Ollama (auto-restart)
- [ ] URL pública do RunPod anotada
- [ ] Variáveis de ambiente no Render configuradas
- [ ] Ulf reiniciado no Render
- [ ] Logs mostram `[Ollama] available: true`
- [ ] Teste no Slack funcionando

---

## 🎯 Resultado Final

Agora você tem:
- ✅ Ulf respondendo 24/7 (Render)
- ✅ Ollama uncensored em GPU potente (RunPod)
- ✅ Claude como backup para tasks complexas
- ✅ Custo otimizado ($7-15/mês vs $100+ de API calls)
- ✅ Sem censura, sem limites 🔥

**Divirta-se com seu Ulf turbinado!** ⚔️
