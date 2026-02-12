# 🌐 Todos os Serviços Via Cloudflare Tunnel

## ✅ Configuração Completa

**TODOS os serviços agora rodam pelo Cloudflare Tunnel!**

Nenhum serviço precisa de IP externo ou firewall do GCP aberto! 🔒

---

## 🌍 URLs Públicas

**Base URL:**
```
https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com
```

### URLs por Serviço:

| Serviço | URL Pública | Service Interno |
|---------|------------|-----------------|
| **Bot (Webhook)** | `/webhook`, `/bot` | `ulf-warden-agent:3000` |
| **n8n** | `/n8n` | `n8n:5678` |
| **AgentOps** | `/agentops` | `agentops-server:8000` |
| **Langfuse** | `/langfuse` | `langfuse:3000` |
| **Dashboard** | `/dashboard` | `agentops-dashboard:3001` |
| **API** | `/api` | `ulf-warden-agent:3000` |
| **Catch-all** | `/` (qualquer outro) | `ulf-warden-agent:3000` |

---

## 🤖 Bot (OpenCell/Ulf-Warden)

### Variáveis de Ambiente Configuradas:

```bash
PUBLIC_URL=https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com
WEBHOOK_URL=https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/webhook
N8N_WEBHOOK_URL=https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/n8n
AGENTOPS_BASE_URL=https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/agentops
LANGFUSE_BASE_URL=https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/langfuse
DASHBOARD_URL=https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/dashboard
API_BASE_URL=https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/api
```

### No código do bot:

```typescript
// Usar sempre process.env.PUBLIC_URL para links externos
const webhookUrl = `${process.env.PUBLIC_URL}/webhook`;
const dashboardUrl = `${process.env.DASHBOARD_URL}`;

// Webhooks do Discord/Slack/etc sempre usam PUBLIC_URL
await discord.setupWebhook(process.env.WEBHOOK_URL);
```

---

## 🔗 n8n (Automação)

### Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: n8n
  namespace: agents
spec:
  template:
    spec:
      containers:
      - name: n8n
        image: n8nio/n8n:latest
        env:
        # Usar URL do tunnel
        - name: WEBHOOK_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: N8N_URL
        - name: N8N_HOST
          value: "9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com"
        - name: N8N_PATH
          value: "/n8n"
        - name: N8N_PROTOCOL
          value: "https"
        ports:
        - containerPort: 5678
---
apiVersion: v1
kind: Service
metadata:
  name: n8n
  namespace: agents
spec:
  selector:
    app: n8n
  ports:
  - port: 5678
    targetPort: 5678
```

### Acessar:
```
https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/n8n
```

---

## 📊 AgentOps (Observabilidade)

### Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentops-server
  namespace: agents
spec:
  template:
    spec:
      containers:
      - name: agentops
        image: agentops/server:latest
        env:
        # Usar URL do tunnel
        - name: PUBLIC_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: AGENTOPS_URL
        - name: API_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: AGENTOPS_API_URL
        ports:
        - containerPort: 8000
---
apiVersion: v1
kind: Service
metadata:
  name: agentops-server
  namespace: agents
spec:
  selector:
    app: agentops-server
  ports:
  - port: 8000
    targetPort: 8000
```

### Acessar:
```
https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/agentops
```

---

## 📈 Langfuse (LLM Tracking)

### Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: langfuse
  namespace: agents
spec:
  template:
    spec:
      containers:
      - name: langfuse
        image: langfuse/langfuse:latest
        env:
        # Usar URL do tunnel
        - name: NEXTAUTH_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: LANGFUSE_URL
        - name: LANGFUSE_PUBLIC_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: LANGFUSE_URL
        ports:
        - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: langfuse
  namespace: agents
spec:
  selector:
    app: langfuse
  ports:
  - port: 3000
    targetPort: 3000
```

### Acessar:
```
https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/langfuse
```

---

## 🎨 Dashboard (AgentOps UI)

### Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: agentops-dashboard
  namespace: agents
spec:
  template:
    spec:
      containers:
      - name: dashboard
        image: agentops/dashboard:latest
        env:
        - name: PUBLIC_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: DASHBOARD_URL
        - name: API_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: AGENTOPS_API_URL
        ports:
        - containerPort: 3001
---
apiVersion: v1
kind: Service
metadata:
  name: agentops-dashboard
  namespace: agents
spec:
  selector:
    app: agentops-dashboard
  ports:
  - port: 3001
    targetPort: 3001
```

### Acessar:
```
https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/dashboard
```

---

## 🔌 Usando as URLs em Qualquer Serviço

### Método 1: ConfigMap (Recomendado)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meu-servico
spec:
  template:
    spec:
      containers:
      - name: app
        envFrom:
        - configMapRef:
            name: tunnel-urls  # Todas as URLs disponíveis!
```

### Método 2: Variáveis Específicas

```yaml
env:
- name: PUBLIC_URL
  valueFrom:
    configMapKeyRef:
      name: tunnel-urls
      key: BASE_URL
- name: N8N_URL
  valueFrom:
    configMapKeyRef:
      name: tunnel-urls
      key: N8N_URL
```

### Método 3: No Código

```bash
# Ver todas as URLs disponíveis
kubectl get configmap tunnel-urls -n agents -o yaml
```

```typescript
// No código TypeScript/JavaScript
const BASE_URL = process.env.BASE_URL;
const N8N_URL = process.env.N8N_URL;
const AGENTOPS_URL = process.env.AGENTOPS_URL;
```

---

## ➕ Adicionar Novo Serviço

### 1. Adicionar rota no tunnel:

```bash
kubectl edit configmap cloudflared-config -n agents
```

Adicione:
```yaml
# Novo serviço
- hostname: "9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com"
  path: ^/meu-servico
  service: http://meu-servico.agents.svc.cluster.local:8080
```

### 2. Adicionar URL no ConfigMap:

```bash
kubectl edit configmap tunnel-urls -n agents
```

Adicione:
```yaml
MEU_SERVICO_URL: "https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/meu-servico"
```

### 3. Reiniciar tunnel:

```bash
kubectl rollout restart deployment/cloudflared -n agents
```

### 4. Deploy do serviço:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: meu-servico
  namespace: agents
spec:
  template:
    spec:
      containers:
      - name: app
        image: meu-servico:latest
        env:
        - name: PUBLIC_URL
          valueFrom:
            configMapKeyRef:
              name: tunnel-urls
              key: MEU_SERVICO_URL
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: meu-servico
  namespace: agents
spec:
  selector:
    app: meu-servico
  ports:
  - port: 8080
    targetPort: 8080
```

---

## 🔍 Ver URLs Configuradas

```bash
# Ver todas as URLs
kubectl get configmap tunnel-urls -n agents -o yaml

# Ver URLs do bot
kubectl get deployment ulf-warden-agent -n agents \
  -o jsonpath='{.spec.template.spec.containers[0].env[*].name}{"\n"}{.spec.template.spec.containers[0].env[*].value}'
```

---

## 🧪 Testar Rotas

```bash
BASE_URL="https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com"

# Bot
curl -I $BASE_URL/webhook

# n8n
curl -I $BASE_URL/n8n

# AgentOps
curl -I $BASE_URL/agentops

# Langfuse
curl -I $BASE_URL/langfuse

# Dashboard
curl -I $BASE_URL/dashboard

# API
curl -I $BASE_URL/api
```

---

## 🔒 Segurança

✅ **Todas as conexões são HTTPS** (automático via Cloudflare)  
✅ **Firewall do GCP não precisa estar aberto** (só outbound)  
✅ **Sem IPs públicos** expostos  
✅ **DDoS protection** automático do Cloudflare  
✅ **Rate limiting** pode ser configurado no Cloudflare  

---

## 📚 Resumo

**TODOS os serviços agora:**
- ✅ Rodam pelo Cloudflare Tunnel
- ✅ Têm URLs públicas funcionando
- ✅ Não precisam de firewall aberto
- ✅ Não precisam de IP externo
- ✅ Estão protegidos pelo Cloudflare
- ✅ Usam HTTPS automaticamente

**NUNCA mais precisa:**
- ❌ Mexer com firewall do GCP
- ❌ Configurar LoadBalancer
- ❌ Pagar por IP externo
- ❌ Usar ngrok ou similares
- ❌ Se preocupar com segurança de rede

**TUDO automático via Cloudflare Tunnel!** 🚀
