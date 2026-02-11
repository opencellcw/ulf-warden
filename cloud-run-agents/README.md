# Cloud Run Agents - Arquitetura Híbrida

## 🎯 Conceito

**Bot principal (GKE Spot)** coordena agentes especializados rodando em **Cloud Run**.

### Vantagens
- ✅ **Economia**: Agentes só cobrados quando executam
- ✅ **Escalabilidade**: Cloud Run escala automaticamente (0→N)
- ✅ **Isolamento**: Cada agente tem suas dependências próprias
- ✅ **Performance**: Agentes podem usar GPUs/mais memória quando necessário

---

## 📁 Estrutura

```
cloud-run-agents/
├── image-gen/          # Geração de imagens (Replicate, DALL-E)
├── web-scraper/        # Web scraping pesado (Playwright)
├── data-analysis/      # Análise de dados (Python, pandas)
├── audio-video/        # Processamento A/V (FFmpeg)
└── shared/             # Código compartilhado
```

---

## 🚀 Como Usar

### Do Bot Discord

```typescript
// src/handlers/discord.ts

import { invokeCloudRunAgent } from '../cloud-run-client';

// Quando usuário pede geração de imagem
if (message.content.startsWith('!generate')) {
  const prompt = message.content.replace('!generate', '').trim();

  // Invoca agente Cloud Run
  const result = await invokeCloudRunAgent('image-gen', {
    prompt,
    userId: message.author.id
  });

  await message.reply({
    files: [result.imageUrl]
  });
}
```

### Agente Cloud Run (Recebe Request)

```typescript
// cloud-run-agents/image-gen/src/index.ts

import express from 'express';
import Replicate from 'replicate';

const app = express();
app.use(express.json());

app.post('/generate', async (req, res) => {
  const { prompt, userId } = req.body;

  // Gera imagem
  const replicate = new Replicate();
  const output = await replicate.run(
    "stability-ai/sdxl:...",
    { input: { prompt } }
  );

  res.json({ imageUrl: output[0] });
});

app.listen(8080);
```

---

## 💰 Custos Estimados

### Cloud Run Pricing (us-central1)

**CPU (vCPU-seconds):**
- Free tier: 180,000 vCPU-seconds/mês
- Pago: $0.00002400/vCPU-second

**Memory (GiB-seconds):**
- Free tier: 360,000 GiB-seconds/mês
- Pago: $0.00000250/GiB-second

**Requests:**
- Free tier: 2 milhões requests/mês
- Pago: $0.40/milhão requests

### Exemplo: Image Gen Agent

```
Uso mensal: 100 gerações
Tempo médio: 15 segundos
CPU: 2 vCPU
Memory: 2 GiB

Cálculo:
- vCPU-seconds: 100 × 15s × 2 = 3,000 (dentro do free tier!)
- GiB-seconds: 100 × 15s × 2 = 3,000 (dentro do free tier!)
- Requests: 100 (dentro do free tier!)

Custo: R$ 0,00 🎉
```

Se passar do free tier:
```
1000 gerações/mês:
- vCPU-seconds: 30,000 → $0.72
- GiB-seconds: 30,000 → $0.075
- Requests: 1,000 → $0.0004

Custo total: ~$0.80/mês (~R$ 4,00) 💰
```

---

## 🎯 Agentes Recomendados

### 1. **Image Generator** 🖼️
```yaml
Service: image-gen
Trigger: HTTP
Resources:
  CPU: 2
  Memory: 2Gi
  Timeout: 60s
Min instances: 0
Max instances: 10

Use cases:
- !generate [prompt]
- !enhance [image]
- !style-transfer
```

### 2. **Web Scraper** 🌐
```yaml
Service: web-scraper
Trigger: HTTP
Resources:
  CPU: 2
  Memory: 4Gi
  Timeout: 300s
Min instances: 0
Max instances: 5

Use cases:
- !scrape [url]
- !monitor [url]
- !extract [url] [selector]
```

### 3. **Data Analysis** 📊
```yaml
Service: data-analysis
Trigger: HTTP
Resources:
  CPU: 4
  Memory: 8Gi
  Timeout: 600s
Min instances: 0
Max instances: 3

Use cases:
- !analyze [csv]
- !chart [data]
- !predict [dataset]
```

### 4. **Audio/Video** 🎵
```yaml
Service: audio-video
Trigger: HTTP
Resources:
  CPU: 4
  Memory: 4Gi
  Timeout: 300s
Min instances: 0
Max instances: 5

Use cases:
- !transcribe [audio]
- !tts [text]
- !convert [video]
```

---

## 🔧 Deploy

```bash
# Deploy single agent
cd cloud-run-agents/image-gen
gcloud run deploy image-gen \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 60s \
  --min-instances 0 \
  --max-instances 10

# Get URL
gcloud run services describe image-gen \
  --region us-central1 \
  --format 'value(status.url)'
```

---

## 🔒 Segurança

### Autenticação

```typescript
// Bot usa service account para invocar Cloud Run
import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();

async function invokeCloudRunAgent(service: string, payload: any) {
  const client = await auth.getIdTokenClient(
    `https://${service}-xxxxx.run.app`
  );

  const response = await client.request({
    url: `https://${service}-xxxxx.run.app/process`,
    method: 'POST',
    data: payload
  });

  return response.data;
}
```

### Rate Limiting

```typescript
// Agente Cloud Run
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15min
  max: 100, // 100 requests per IP
  message: 'Too many requests'
});

app.use('/process', limiter);
```

---

## 📈 Monitoring

```bash
# Ver logs em tempo real
gcloud run services logs read image-gen --region us-central1

# Métricas
gcloud run services describe image-gen \
  --region us-central1 \
  --format json | jq '.status.traffic'
```

---

## 🎯 Próximos Passos

1. ✅ Criar agente exemplo (image-gen)
2. ✅ Integrar no bot Discord
3. ✅ Deploy e testar
4. ✅ Adicionar mais agentes conforme necessidade

**Custo esperado:** R$ 5-15/mês (vs R$ 60/mês se tudo no GKE) 💰
