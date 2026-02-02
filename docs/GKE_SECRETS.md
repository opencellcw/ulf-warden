# Google Secret Manager no GKE

Guia completo para usar Google Secret Manager ao invés de secrets do Kubernetes.

---

## 🎯 Por que Secret Manager?

### Vantagens

**Kubernetes Secrets (padrão)**:
- ❌ Base64 apenas (não é criptografia real)
- ❌ Secrets visíveis com `kubectl get secret`
- ❌ Difícil gerenciar rotação
- ❌ Sem auditoria de acesso
- ❌ Backups manuais

**Google Secret Manager**:
- ✅ Criptografia real (AES-256)
- ✅ Auditoria completa (quem acessou, quando)
- ✅ Rotação automática
- ✅ Versionamento de secrets
- ✅ Backup automático
- ✅ IAM granular
- ✅ Integração com Workload Identity

---

## 🚀 Setup (15 minutos)

### 1. Habilitar APIs e criar secrets

```bash
# Run o script automatizado
./scripts/gke-setup-secrets.sh
```

O script vai:
1. Habilitar Secret Manager API
2. Criar secrets no Secret Manager
3. Criar Service Account com permissões
4. Configurar Workload Identity
5. Configurar K8s Service Account

### 2. Instalar Secrets Store CSI Driver (se não tiver)

```bash
# Verificar se já está instalado
kubectl get pods -n kube-system | grep secrets-store

# Se não estiver, instalar
gcloud container clusters update ulf-cluster \
  --update-addons=GcpSecretManagerCsiDriver=ENABLED \
  --zone=us-central1-a

# Verificar instalação
kubectl get pods -n kube-system | grep secrets-store
# Deve mostrar: secrets-store-csi-driver-xxx
```

### 3. Deploy com Secret Manager habilitado

```bash
# Deploy standalone
helm upgrade --install ulf-warden ./infra/helm/agent \
  -f values-with-secretmanager.yaml \
  --namespace agents

# OU atualizar deploy existente
helm upgrade ulf-warden ./infra/helm/agent \
  --set secretManager.enabled=true \
  --set secretManager.projectID=seu-projeto \
  --set secretManager.serviceAccount=ulf-warden-sa@seu-projeto.iam.gserviceaccount.com \
  --namespace agents
```

### 4. Verificar

```bash
# Ver se secret foi criada
kubectl get secret ulf-warden-secrets -n agents

# Ver se volume está montado
kubectl describe pod -l app.kubernetes.io/name=agent -n agents | grep "secrets-store"

# Verificar se secrets estão sendo carregadas
kubectl logs deployment/ulf-warden -n agents | grep -i "api key"
```

---

## 📝 Configuração Manual Detalhada

Se preferir fazer manualmente ao invés do script:

### 1. Habilitar Secret Manager API

```bash
gcloud services enable secretmanager.googleapis.com
```

### 2. Criar secrets

```bash
# Anthropic API Key (obrigatório)
echo -n "sk-ant-api03-xxx" | gcloud secrets create anthropic-api-key \
  --data-file=- \
  --replication-policy="automatic"

# Slack (opcional)
echo -n "xoxb-xxx" | gcloud secrets create slack-bot-token \
  --data-file=- \
  --replication-policy="automatic"

echo -n "xapp-xxx" | gcloud secrets create slack-app-token \
  --data-file=- \
  --replication-policy="automatic"

echo -n "xxx" | gcloud secrets create slack-signing-secret \
  --data-file=- \
  --replication-policy="automatic"

# Discord (opcional)
echo -n "xxx" | gcloud secrets create discord-bot-token \
  --data-file=- \
  --replication-policy="automatic"

# Telegram (opcional)
echo -n "xxx" | gcloud secrets create telegram-bot-token \
  --data-file=- \
  --replication-policy="automatic"
```

### 3. Criar GCP Service Account

```bash
export PROJECT_ID="seu-projeto"
export SA_NAME="ulf-warden-sa"
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Criar SA
gcloud iam service-accounts create $SA_NAME \
  --display-name="Ulfberht Warden" \
  --project=$PROJECT_ID

# Dar permissão para acessar secrets
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Configurar Workload Identity

```bash
export CLUSTER_NAME="ulf-cluster"
export ZONE="us-central1-a"

# Habilitar Workload Identity no cluster
gcloud container clusters update $CLUSTER_NAME \
  --workload-pool=$PROJECT_ID.svc.id.goog \
  --zone=$ZONE

# Criar K8s namespace
kubectl create namespace agents

# Criar K8s Service Account
kubectl create serviceaccount ulf-warden-ksa -n agents

# Anotar K8s SA com GCP SA
kubectl annotate serviceaccount ulf-warden-ksa \
  -n agents \
  iam.gke.io/gcp-service-account=$SA_EMAIL

# Bind GCP SA <-> K8s SA
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:${PROJECT_ID}.svc.id.goog[agents/ulf-warden-ksa]"
```

### 5. Instalar Secrets Store CSI Driver

```bash
gcloud container clusters update $CLUSTER_NAME \
  --update-addons=GcpSecretManagerCsiDriver=ENABLED \
  --zone=$ZONE
```

### 6. Deploy Helm Chart

```bash
cat > values-secretmanager.yaml <<EOF
agent:
  name: "ulf-warden"
  image:
    repository: us-central1-docker.pkg.dev/seu-projeto/ulf-images/ulf-warden
    tag: "latest"

  channel:
    enabled: true
    type: "slack"
    slack:
      enabled: true

secretManager:
  enabled: true
  projectID: "seu-projeto"
  serviceAccount: "ulf-warden-sa@seu-projeto.iam.gserviceaccount.com"
  clusterLocation: "us-central1-a"
  clusterName: "ulf-cluster"

serviceAccount:
  create: true
  name: "ulf-warden-ksa"
EOF

helm install ulf-warden ./infra/helm/agent \
  -f values-secretmanager.yaml \
  --namespace agents
```

---

## 🔄 Gerenciar Secrets

### Ver secrets

```bash
# Listar todas
gcloud secrets list

# Ver metadados
gcloud secrets describe anthropic-api-key

# Ver versões
gcloud secrets versions list anthropic-api-key
```

### Atualizar secret

```bash
# Nova versão
echo -n "novo-valor" | gcloud secrets versions add anthropic-api-key \
  --data-file=-

# Pods vão recarregar automaticamente após alguns minutos
# Ou forçar restart
kubectl rollout restart deployment/ulf-warden -n agents
```

### Deletar versão antiga

```bash
# Listar versões
gcloud secrets versions list anthropic-api-key

# Deletar versão específica
gcloud secrets versions destroy 1 \
  --secret=anthropic-api-key
```

### Rotação automática

```bash
# Exemplo: rotacionar API key a cada 90 dias
# (implementar com Cloud Scheduler + Cloud Functions)

# 1. Cloud Function para gerar nova key e atualizar secret
# 2. Cloud Scheduler para rodar a cada 90 dias
# 3. Notificar time via Slack/Email
```

---

## 🔐 Segurança

### IAM Permissions

```bash
# Ver quem tem acesso
gcloud secrets get-iam-policy anthropic-api-key

# Adicionar acesso para outro SA
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:outro-sa@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# Remover acesso
gcloud secrets remove-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:outro-sa@project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Auditoria

```bash
# Ver logs de acesso às secrets
gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com" \
  --limit=50 \
  --format=json

# Filtrar por secret específica
gcloud logging read "protoPayload.serviceName=secretmanager.googleapis.com AND protoPayload.resourceName:anthropic-api-key" \
  --limit=10
```

### Alertas

```bash
# Criar alerta para acesso à secret
# Cloud Console → Logging → Logs-based Metrics → Create Metric

# Exemplo de filtro:
protoPayload.serviceName="secretmanager.googleapis.com"
protoPayload.methodName="google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion"
protoPayload.resourceName=~"anthropic-api-key"

# Criar alerta quando metric > 100 acessos/hora
```

---

## 🧪 Testar Localmente

### Com gcloud CLI

```bash
# Ler secret
gcloud secrets versions access latest \
  --secret=anthropic-api-key

# Usar em script
export ANTHROPIC_API_KEY=$(gcloud secrets versions access latest --secret=anthropic-api-key)
echo $ANTHROPIC_API_KEY
```

### Com Docker local (simulando Workload Identity)

```bash
# Criar service account key (APENAS para desenvolvimento local)
gcloud iam service-accounts keys create ~/ulf-sa-key.json \
  --iam-account=ulf-warden-sa@$PROJECT_ID.iam.gserviceaccount.com

# Rodar container com credenciais
docker run -it \
  -v ~/ulf-sa-key.json:/app/credentials.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json \
  -e PROJECT_ID=seu-projeto \
  ulf-warden:latest

# ⚠️ IMPORTANTE: Deletar a key depois
gcloud iam service-accounts keys list \
  --iam-account=ulf-warden-sa@$PROJECT_ID.iam.gserviceaccount.com

gcloud iam service-accounts keys delete <KEY_ID> \
  --iam-account=ulf-warden-sa@$PROJECT_ID.iam.gserviceaccount.com

rm ~/ulf-sa-key.json
```

---

## 📊 Comparação: K8s Secrets vs Secret Manager

| Feature | K8s Secrets | Secret Manager |
|---------|-------------|----------------|
| **Criptografia** | Base64 (não é criptografia) | AES-256 |
| **Auditoria** | Não | Sim (Cloud Audit Logs) |
| **Versionamento** | Não | Sim |
| **Rotação** | Manual | Manual/Automática |
| **Custo** | Grátis | $0.06 por 10k ops |
| **Acesso** | Qualquer pod no cluster | IAM granular |
| **Backup** | Manual | Automático |
| **Compliance** | Não | Sim (SOC 2, ISO, etc) |
| **Multi-cluster** | Não | Sim |

---

## 💰 Custos

### Secret Manager Pricing

- **Storage**: $0.06 / secret / mês
- **Access**: $0.03 / 10,000 acessos
- **Replication** (regional): Free

### Exemplo de uso

```
Secrets: 6 (anthropic, slack x3, discord, telegram)
Acessos: ~1000/dia (pods reiniciando, etc)

Custo mensal:
- Storage: 6 x $0.06 = $0.36
- Access: 30k/mês ÷ 10k x $0.03 = $0.09
Total: ~$0.45/mês
```

**Basicamente de graça comparado aos benefícios de segurança.**

---

## 🔄 Migração de K8s Secrets

Se já tem secrets no K8s e quer migrar:

```bash
# 1. Exportar secrets existentes
kubectl get secret agent-secrets -n agents -o json | \
  jq -r '.data | to_entries[] | "\(.key)=\(.value | @base64d)"'

# 2. Criar no Secret Manager
echo -n "valor-decodificado" | gcloud secrets create nome-secret --data-file=-

# 3. Atualizar deployment para usar Secret Manager
helm upgrade ulf-warden ./infra/helm/agent \
  --set secretManager.enabled=true \
  --namespace agents

# 4. Deletar K8s secret antiga (opcional)
kubectl delete secret agent-secrets -n agents
```

---

## 🆘 Troubleshooting

### Pod não inicia: "failed to get secret"

**Problema**: Workload Identity não configurado

**Solução**:
```bash
# Verificar annotation no K8s SA
kubectl get sa ulf-warden-ksa -n agents -o yaml | grep iam.gke.io

# Verificar binding
gcloud iam service-accounts get-iam-policy \
  ulf-warden-sa@$PROJECT_ID.iam.gserviceaccount.com

# Re-aplicar binding
gcloud iam service-accounts add-iam-policy-binding \
  ulf-warden-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:$PROJECT_ID.svc.id.goog[agents/ulf-warden-ksa]"
```

### Secrets não aparecem no pod

**Problema**: CSI Driver não instalado

**Solução**:
```bash
# Verificar pods do CSI driver
kubectl get pods -n kube-system | grep secrets-store

# Reinstalar addon
gcloud container clusters update ulf-cluster \
  --update-addons=GcpSecretManagerCsiDriver=ENABLED \
  --zone=us-central1-a
```

### "Permission denied" ao acessar secret

**Problema**: Service Account sem permissão

**Solução**:
```bash
# Dar permissão
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:ulf-warden-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## ✅ Checklist

- [ ] Secret Manager API habilitada
- [ ] Secrets criadas no Secret Manager
- [ ] GCP Service Account criada
- [ ] Permissões configuradas (secretAccessor)
- [ ] Workload Identity habilitado no cluster
- [ ] K8s Service Account criada e anotada
- [ ] IAM binding GCP SA <-> K8s SA
- [ ] CSI Driver instalado
- [ ] Helm chart deployado com `secretManager.enabled=true`
- [ ] Pods rodando e secrets carregadas

---

**Secrets gerenciadas de forma segura com Google Secret Manager!** 🔐

Custo: ~$0.50/mês
Segurança: ⭐⭐⭐⭐⭐
