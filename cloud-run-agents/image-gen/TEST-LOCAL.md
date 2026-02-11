# 🧪 Teste Local - Image Gen Agent

Antes de fazer deploy no Cloud Run, teste o agente localmente.

## 1. Setup Local

```bash
cd cloud-run-agents/image-gen

# Instalar dependências
npm install

# Criar .env local
cat > .env << EOF
PORT=8080
NODE_ENV=development
REPLICATE_API_TOKEN=r8_seu_token_aqui
EOF
```

## 2. Rodar Localmente

```bash
# Desenvolvimento com hot-reload
npm run dev

# Ou build + start
npm run build
npm start
```

O servidor vai iniciar em `http://localhost:8080`

## 3. Testar Endpoints

### Health Check

```bash
curl http://localhost:8080/
```

Esperado:
```json
{
  "service": "image-gen-agent",
  "status": "online",
  "version": "1.0.0"
}
```

### Gerar Imagem (Realistic)

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a majestic lion in the savanna at sunset",
    "userId": "test-user-123",
    "style": "realistic"
  }' | jq .
```

### Gerar Imagem (Anime)

```bash
curl -X POST http://localhost:8080/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a cute anime girl with pink hair",
    "userId": "test-user-123",
    "style": "anime"
  }' | jq .
```

### Enhance Imagem

```bash
curl -X POST http://localhost:8080/enhance \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://url-da-imagem.jpg",
    "userId": "test-user-123"
  }' | jq .
```

## 4. Testar Integração com Bot (Local)

### 4.1. Atualizar .env do bot principal

No arquivo `.env` do projeto raiz:

```bash
# Use localhost ao invés da URL do Cloud Run
IMAGE_GEN_AGENT_URL=http://localhost:8080
```

### 4.2. Rodar bot e agente simultaneamente

**Terminal 1 - Agent:**
```bash
cd cloud-run-agents/image-gen
npm run dev
```

**Terminal 2 - Bot:**
```bash
cd /Users/lucassampaio/Projects/opencellcw
npm run dev
```

### 4.3. Testar no Discord

Envie mensagens para o bot:

```
!generate a beautiful landscape with mountains
```

```
!generate style:anime a magical girl transformation
```

## 5. Build Docker (Local)

Testar se o Dockerfile funciona:

```bash
# Build
docker build -t image-gen-agent:test .

# Run
docker run -p 8080:8080 \
  -e REPLICATE_API_TOKEN=r8_seu_token \
  image-gen-agent:test

# Testar
curl http://localhost:8080/
```

## 6. Troubleshooting

### Erro: "Missing REPLICATE_API_TOKEN"

Verifique se o token está no `.env`:
```bash
cat .env | grep REPLICATE
```

### Erro: "Cannot find module..."

Reinstale dependências:
```bash
rm -rf node_modules package-lock.json
npm install
```

### Timeout ao gerar imagem

Primeira geração demora ~30s (cold start do modelo Replicate). Seja paciente!

### Porta já em uso

```bash
# Ver o que está usando porta 8080
lsof -i :8080

# Matar processo
kill -9 <PID>

# Ou usar outra porta
PORT=3000 npm run dev
```

## 7. Next Steps

Após confirmar que funciona localmente:

1. ✅ Teste local OK → Prosseguir para deploy no Cloud Run
2. 📝 Ver `DEPLOY.md` para instruções de deploy
3. 🔄 Deploy → Atualizar `IMAGE_GEN_AGENT_URL` no `.env` com URL real
