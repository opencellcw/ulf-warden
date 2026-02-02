# GKE Quick Start - 5 Minutos ⚡

Deploy automatizado do Ulfberht-Warden no GKE.

---

## 🚀 Setup Automático

### 1. Instalar ferramentas (se necessário)

```bash
# gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# kubectl
gcloud components install kubectl

# helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### 2. Configurar projeto GCP

```bash
# Login
gcloud auth login

# Criar projeto (ou usar existente)
gcloud projects create seu-projeto-id
gcloud config set project seu-projeto-id

# Habilitar billing (obrigatório)
# Vá em: https://console.cloud.google.com/billing
```

### 3. Deploy com 1 comando

```bash
# Standalone (bot simples)
./scripts/gke-deploy.sh standalone

# OU

# Multi-agent swarm
./scripts/gke-deploy.sh swarm
```

O script vai pedir:
- Project ID
- Cluster name (padrão: ulf-cluster)
- Region (padrão: us-central1)
- Anthropic API key

E vai fazer tudo automaticamente:
- ✅ Criar cluster GKE
- ✅ Configurar Artifact Registry
- ✅ Build e push da imagem Docker
- ✅ Configurar Google Secret Manager 🔐
- ✅ Configurar Workload Identity
- ✅ Criar namespace
- ✅ Deploy com Helm
- ✅ Configurar auto-scaling

**Nota:** Agora usa Google Secret Manager ao invés de K8s secrets (muito mais seguro!)

---

## 📋 Variáveis de Ambiente (Opcional)

Crie `.env.gke` para pular prompts:

```bash
# .env.gke
PROJECT_ID=seu-projeto-gcp
CLUSTER_NAME=ulf-cluster
REGION=us-central1
ZONE=us-central1-a
ANTHROPIC_API_KEY=sk-ant-xxx

# Opcional (para Slack/Discord/Telegram)
SLACK_BOT_TOKEN=xoxb-xxx
SLACK_APP_TOKEN=xapp-xxx
SLACK_SIGNING_SECRET=xxx
DISCORD_BOT_TOKEN=xxx
TELEGRAM_BOT_TOKEN=xxx
```

Depois:
```bash
source .env.gke
./scripts/gke-deploy.sh standalone
```

---

## 🔍 Verificar Status

```bash
# Ver pods
kubectl get pods -n agents

# Ver logs
kubectl logs -f deployment/ulf-warden -n agents

# Ver services
kubectl get svc -n agents

# Pegar IP externo
kubectl get svc ulf-warden -n agents -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

---

## 🧪 Testar Localmente

```bash
# Port-forward
kubectl port-forward svc/ulf-warden 8080:8080 -n agents

# Health check
curl http://localhost:8080/health

# Status
curl http://localhost:8080/status
```

---

## 📊 Monitorar

### Logs no Cloud Console

```bash
# Stream de logs
gcloud logging tail "resource.type=k8s_container AND resource.labels.namespace_name=agents"

# OU no console web
open "https://console.cloud.google.com/logs/query"
```

### Kubernetes Dashboard

```bash
# Instalar dashboard
kubectl apply -f https://raw.githubusercontent.com/kubernetes/dashboard/v2.7.0/aio/deploy/recommended.yaml

# Port-forward
kubectl port-forward -n kubernetes-dashboard svc/kubernetes-dashboard 8443:443

# Token de acesso
kubectl -n kubernetes-dashboard create token admin-user

# Acessar: https://localhost:8443
```

---

## 🔄 Atualizar Código

```bash
# Rebuild e redeploy
docker build -t ulf-warden:latest .

# Tag com nova versão
docker tag ulf-warden:latest \
  ${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-warden:v2

# Push
docker push ${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-warden:v2

# Update deployment
kubectl set image deployment/ulf-warden \
  ulf-warden=${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-warden:v2 \
  -n agents

# Verificar rollout
kubectl rollout status deployment/ulf-warden -n agents
```

---

## 💰 Custos

### Free Tier
GCP oferece $300 de crédito grátis por 90 dias + sempre grátis:
- **e2-micro** instance: sempre grátis (us-central1, us-west1, us-east1)
- **30 GB storage**: sempre grátis
- **1 GB network egress**: sempre grátis/mês

### Standalone (Mínimo)
- 1x e2-medium node
- 30GB storage
- **~$25-30/mês** (sem free tier)
- **$0/mês** (dentro do free tier de $300)

### Production
- 2x e2-standard-2 nodes
- 50GB SSD storage
- **~$70-90/mês**

### Calcular custos
```bash
# GCP Pricing Calculator
open "https://cloud.google.com/products/calculator"
```

---

## 🧹 Cleanup (Deletar Tudo)

```bash
# Deletar namespace (mantém cluster)
kubectl delete namespace agents

# Deletar cluster completo
gcloud container clusters delete ulf-cluster --zone us-central1-a

# Deletar artifact registry
gcloud artifacts repositories delete ulf-images --location=us-central1

# Verificar custos zero
gcloud billing accounts list
```

---

## 🆘 Troubleshooting

### Script falha no "Creating cluster"

**Problema**: Billing não habilitado

**Solução**:
```bash
open "https://console.cloud.google.com/billing"
# Adicionar método de pagamento
```

### Pods ficam em "ImagePullBackOff"

**Problema**: Docker não consegue pull da imagem

**Solução**:
```bash
# Verificar imagem existe
gcloud artifacts docker images list ${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images

# Verificar permissões
kubectl describe pod <pod-name> -n agents
```

### LoadBalancer sem IP (pending)

**Problema**: Pode demorar 2-3 minutos

**Solução**:
```bash
# Aguardar
kubectl get svc -n agents -w

# Se demorar muito, verificar quotas
gcloud compute project-info describe --project=$PROJECT_ID | grep -A 10 quotas
```

### Bot não responde no Slack

**Problema**: Secrets incorretos

**Solução**:
```bash
# Verificar secret
kubectl get secret agent-secrets -n agents -o yaml

# Recriar secret
kubectl delete secret agent-secrets -n agents
kubectl create secret generic agent-secrets \
  --from-literal=anthropic-api-key=sk-ant-xxx \
  --from-literal=slack-bot-token=xoxb-xxx \
  --from-literal=slack-app-token=xapp-xxx \
  --from-literal=slack-signing-secret=xxx \
  -n agents

# Restart pods
kubectl rollout restart deployment/ulf-warden -n agents
```

---

## 📚 Documentação Completa

- **[GKE_DEPLOY.md](./GKE_DEPLOY.md)** - Guia completo e detalhado
- **[infra/README.md](./infra/README.md)** - Arquitetura multi-agent
- **[README.md](./README.md)** - Documentação geral

---

## ✅ Checklist

- [ ] Ferramentas instaladas (gcloud, kubectl, helm, docker)
- [ ] Projeto GCP criado e billing habilitado
- [ ] API keys prontas (Anthropic + Slack/Discord/Telegram)
- [ ] Script executado com sucesso
- [ ] Pods em estado `Running`
- [ ] LoadBalancer com IP externo
- [ ] Bot respondendo nas plataformas

---

**Deploy completo em ~5-10 minutos!** 🚀

Se algo der errado, veja [GKE_DEPLOY.md](./GKE_DEPLOY.md) para troubleshooting detalhado.
