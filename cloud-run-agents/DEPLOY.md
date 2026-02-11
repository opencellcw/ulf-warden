# 🚀 Deploy Guide - Cloud Run Agents

Este guia mostra como fazer deploy e testar os agentes especializados no Cloud Run.

## 📋 Pré-requisitos

1. **Google Cloud SDK** instalado
2. **Projeto GCP** configurado (`opencellcw-k8s`)
3. **Secret Manager** com secrets necessários

## 🔧 Setup Inicial

### 1. Criar secrets no Google Secret Manager

```bash
# Image Gen Agent - Replicate API Token
echo -n "r8_seu_token_aqui" | gcloud secrets create REPLICATE_API_TOKEN \
  --project=opencellcw-k8s \
  --replication-policy="automatic" \
  --data-file=-

# Verificar secret criado
gcloud secrets list --project=opencellcw-k8s
```

## 🎨 Deploy: Image Gen Agent

### 1. Ir para o diretório do agente

```bash
cd cloud-run-agents/image-gen
```

### 2. Fazer deploy

```bash
# Tornar script executável
chmod +x deploy.sh

# Executar deploy
./deploy.sh
```

**Ou manualmente:**

```bash
gcloud run deploy image-gen-agent \
  --source . \
  --platform managed \
  --region us-central1 \
  --project opencellcw-k8s \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 120s \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "REPLICATE_API_TOKEN=REPLICATE_API_TOKEN:latest"
```

### 3. Obter URL do serviço

```bash
gcloud run services describe image-gen-agent \
  --region us-central1 \
  --format 'value(status.url)'
```

Exemplo de output:
```
https://image-gen-agent-xxx-uc.a.run.app
```

### 4. Testar o agente

```bash
# Health check
curl https://image-gen-agent-xxx-uc.a.run.app/

# Gerar imagem
curl -X POST https://image-gen-agent-xxx-uc.a.run.app/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a beautiful sunset over the ocean",
    "userId": "test-user",
    "style": "realistic"
  }'
```

## 🤖 Configurar Bot Principal

### 1. Adicionar URL no .env

Após o deploy, adicione a URL obtida no arquivo `.env`:

```bash
# Cloud Run Agents
IMAGE_GEN_AGENT_URL=https://image-gen-agent-xxx-uc.a.run.app
```

### 2. Rebuild e deploy do bot principal

```bash
# No diretório raiz do projeto
npm run build

# Build nova imagem
podman build --platform=linux/amd64 -t gcr.io/opencellcw-k8s/ulf-warden-agent:latest .

# Push para GCR
podman push gcr.io/opencellcw-k8s/ulf-warden-agent:latest

# Restart deployment
kubectl rollout restart deployment/ulf-warden-agent -n agents
```

## 🎮 Como Usar no Discord

### Comandos disponíveis:

**1. Gerar imagem (style: realistic)**
```
!generate a beautiful sunset over the ocean
```

**2. Gerar imagem (style: anime)**
```
!generate style:anime a cute cat with blue eyes
```

**3. Melhorar imagem existente**
```
!enhance https://url-da-imagem.jpg
```

## 📊 Monitoramento

### Ver logs do agente

```bash
gcloud run services logs read image-gen-agent \
  --region us-central1 \
  --limit 50
```

### Ver métricas e custos

```bash
# Acesse o Cloud Console:
# https://console.cloud.google.com/run/detail/us-central1/image-gen-agent/metrics

# Ou via CLI:
gcloud run services describe image-gen-agent \
  --region us-central1 \
  --format="table(status.url,status.traffic)"
```

### Health check automático

```bash
# Script para testar health
curl https://image-gen-agent-xxx-uc.a.run.app/ | jq .
```

Output esperado:
```json
{
  "service": "image-gen-agent",
  "status": "online",
  "version": "1.0.0"
}
```

## 🔄 Update do Agente

Quando fizer alterações no código:

```bash
cd cloud-run-agents/image-gen

# Deploy (Cloud Run detecta mudanças e faz rebuild automático)
./deploy.sh
```

## 🗑️ Deletar Agente

Se precisar remover o agente:

```bash
gcloud run services delete image-gen-agent \
  --region us-central1 \
  --project opencellcw-k8s
```

## 💰 Custos Estimados

**Configuração atual:**
- Memory: 2Gi
- CPU: 2
- Min instances: 0 (scale-to-zero)
- Max instances: 10

**Estimativa mensal:**
- Uso leve (50 gerações/dia): ~R$ 5-10/mês
- Uso moderado (200 gerações/dia): ~R$ 15-25/mês
- Uso pesado (500 gerações/dia): ~R$ 30-40/mês

**Nota:** Replicate API cobra separadamente (~$0.008/imagem SDXL, ~$0.002/enhance)

## 🚨 Troubleshooting

### Erro: "Secret not found"

```bash
# Verificar se secret existe
gcloud secrets list --project=opencellcw-k8s

# Dar permissão ao Cloud Run para acessar secret
gcloud projects add-iam-policy-binding opencellcw-k8s \
  --member=serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
```

### Erro: "Insufficient memory"

Aumente a memória no deploy.sh:
```bash
--memory 4Gi \  # ao invés de 2Gi
```

### Timeout ao gerar imagens

Aumente o timeout:
```bash
--timeout 300s \  # ao invés de 120s
```

### Bot não reconhece comandos

1. Verifique se `IMAGE_GEN_AGENT_URL` está no `.env`
2. Verifique se o bot foi reconstruído após adicionar a URL
3. Verifique logs: `kubectl logs -n agents deployment/ulf-warden-agent`

## 📚 Próximos Agentes

Outros agentes que podem ser criados:

1. **web-scraper-agent** - Extrair dados de sites
2. **data-analysis-agent** - Análise de dados com Pandas
3. **audio-video-agent** - Edição de mídia com FFmpeg
4. **code-review-agent** - Review automático de código

Cada agente segue o mesmo padrão:
- Express HTTP server
- Dockerfile
- deploy.sh
- Integração via cloud-run-client.ts
