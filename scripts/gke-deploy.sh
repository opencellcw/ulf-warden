#!/bin/bash
#
# Deploy Ulfberht-Warden no Google Kubernetes Engine (GKE)
# Usage: ./scripts/gke-deploy.sh [standalone|swarm]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Funções de logging
log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Verificar argumentos
DEPLOY_MODE=${1:-standalone}
if [[ ! "$DEPLOY_MODE" =~ ^(standalone|swarm)$ ]]; then
    log_error "Modo inválido: $DEPLOY_MODE"
    echo "Usage: $0 [standalone|swarm]"
    exit 1
fi

log_info "Iniciando deploy no modo: $DEPLOY_MODE"

# Verificar ferramentas
log_info "Verificando ferramentas necessárias..."
for tool in gcloud kubectl helm; do
    if ! command -v $tool &> /dev/null; then
        log_error "$tool não encontrado. Instale antes de continuar."
        exit 1
    fi
    log_info "$tool encontrado"
done

# Carregar .env se existir
if [ -f .env ]; then
    log_info "Carregando variáveis de .env"
    export $(grep -v '^#' .env | xargs)
fi

# Configurações
echo ""
echo "=== Configuração do Deploy ==="

# Se NON_INTERACTIVE estiver definido, pular prompts
if [ -z "$NON_INTERACTIVE" ]; then
    read -p "GCP Project ID [$PROJECT_ID]: " input_project
    PROJECT_ID=${input_project:-$PROJECT_ID}

    read -p "Cluster Name [${CLUSTER_NAME:-ulf-cluster}]: " input_cluster
    CLUSTER_NAME=${input_cluster:-${CLUSTER_NAME:-ulf-cluster}}

    read -p "Region [${REGION:-us-central1}]: " input_region
    REGION=${input_region:-${REGION:-us-central1}}

    read -p "Zone [${ZONE:-us-central1-a}]: " input_zone
    ZONE=${input_zone:-${ZONE:-us-central1-a}}

    if [ -z "$ANTHROPIC_API_KEY" ]; then
        read -p "Anthropic API Key: " ANTHROPIC_API_KEY
    fi
else
    log_info "Modo não-interativo: usando valores do .env"
    PROJECT_ID=${PROJECT_ID}
    CLUSTER_NAME=${CLUSTER_NAME:-ulf-cluster}
    REGION=${REGION:-us-central1}
    ZONE=${ZONE:-us-central1-a}
fi

if [ -z "$PROJECT_ID" ] || [ -z "$ANTHROPIC_API_KEY" ]; then
    log_error "Project ID e Anthropic API Key são obrigatórios"
    exit 1
fi

# Confirmar
echo ""
echo "=== Resumo do Deploy ==="
echo "Modo: $DEPLOY_MODE"
echo "Project: $PROJECT_ID"
echo "Cluster: $CLUSTER_NAME"
echo "Region: $REGION"
echo "Zone: $ZONE"
echo ""

if [ -z "$NON_INTERACTIVE" ]; then
    read -p "Continuar? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Deploy cancelado"
        exit 0
    fi
else
    log_info "Modo não-interativo: continuando automaticamente..."
fi

# 1. Configurar GCP
log_info "Configurando GCP project..."
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION
gcloud config set compute/zone $ZONE

# 2. Habilitar APIs
log_info "Habilitando APIs necessárias..."
gcloud services enable container.googleapis.com --quiet
gcloud services enable artifactregistry.googleapis.com --quiet
gcloud services enable compute.googleapis.com --quiet
gcloud services enable cloudbuild.googleapis.com --quiet

# 3. Verificar se cluster existe
if gcloud container clusters describe $CLUSTER_NAME --zone $ZONE &> /dev/null; then
    log_warn "Cluster $CLUSTER_NAME já existe"
    if [ -z "$USE_EXISTING_CLUSTER" ]; then
        read -p "Usar cluster existente? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_error "Crie um novo cluster manualmente ou delete o existente"
            exit 1
        fi
    else
        log_info "Usando cluster existente (USE_EXISTING_CLUSTER=$USE_EXISTING_CLUSTER)"
    fi
else
    # Criar cluster
    log_info "Criando cluster GKE..."

    if [ "$DEPLOY_MODE" = "standalone" ]; then
        # Cluster menor para standalone
        gcloud container clusters create $CLUSTER_NAME \
            --zone $ZONE \
            --num-nodes 1 \
            --machine-type e2-medium \
            --disk-size 30 \
            --disk-type pd-standard \
            --enable-autoscaling \
            --min-nodes 1 \
            --max-nodes 3 \
            --enable-autorepair \
            --enable-autoupgrade \
            --logging=SYSTEM,WORKLOAD \
            --monitoring=SYSTEM \
            --quiet
    else
        # Cluster maior para swarm
        gcloud container clusters create $CLUSTER_NAME \
            --zone $ZONE \
            --num-nodes 2 \
            --machine-type e2-standard-2 \
            --disk-size 50 \
            --disk-type pd-ssd \
            --enable-autoscaling \
            --min-nodes 1 \
            --max-nodes 5 \
            --enable-autorepair \
            --enable-autoupgrade \
            --enable-ip-alias \
            --logging=SYSTEM,WORKLOAD \
            --monitoring=SYSTEM \
            --addons HorizontalPodAutoscaling,HttpLoadBalancing,GcePersistentDiskCsiDriver \
            --quiet
    fi

    log_info "Cluster criado com sucesso"
fi

# 4. Conectar ao cluster
log_info "Conectando ao cluster..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone $ZONE

# 5. Verificar se Artifact Registry existe
REGISTRY_NAME="ulf-images"
if ! gcloud artifacts repositories describe $REGISTRY_NAME --location=$REGION &> /dev/null; then
    log_info "Criando Artifact Registry..."
    gcloud artifacts repositories create $REGISTRY_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Ulfberht Agent Docker images" \
        --quiet
fi

# 6. Build e Push da imagem usando Cloud Build
IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY_NAME}/ulf-warden:latest"
log_info "Building e pushing Docker image via Cloud Build..."
log_info "Isso pode levar alguns minutos na primeira vez..."
gcloud builds submit --tag $IMAGE_URL --quiet .

# 7. Criar namespace
log_info "Criando namespace 'agents'..."
kubectl create namespace agents --dry-run=client -o yaml | kubectl apply -f -

# 8. Setup Google Secret Manager
log_info "Configurando Google Secret Manager..."

# Habilitar API
gcloud services enable secretmanager.googleapis.com --quiet

# Criar secrets no Secret Manager
create_gcp_secret() {
    local secret_name=$1
    local secret_value=$2

    if [ -n "$secret_value" ] && [ "$secret_value" != "placeholder" ]; then
        if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
            log_info "Atualizando secret $secret_name..."
            echo -n "$secret_value" | gcloud secrets versions add $secret_name \
                --data-file=- \
                --project=$PROJECT_ID || log_warn "Falha ao atualizar $secret_name"
        else
            log_info "Criando secret $secret_name..."
            echo -n "$secret_value" | gcloud secrets create $secret_name \
                --data-file=- \
                --replication-policy="automatic" \
                --project=$PROJECT_ID || log_warn "Falha ao criar $secret_name"
        fi
    fi
}

create_gcp_secret "anthropic-api-key" "$ANTHROPIC_API_KEY"
create_gcp_secret "slack-bot-token" "${SLACK_BOT_TOKEN}"
create_gcp_secret "slack-app-token" "${SLACK_APP_TOKEN}"
create_gcp_secret "slack-signing-secret" "${SLACK_SIGNING_SECRET}"
create_gcp_secret "discord-bot-token" "${DISCORD_BOT_TOKEN}"
create_gcp_secret "telegram-bot-token" "${TELEGRAM_BOT_TOKEN}"
create_gcp_secret "replicate-api-token" "${REPLICATE_API_TOKEN}"
create_gcp_secret "openai-api-key" "${OPENAI_API_KEY}"
create_gcp_secret "elevenlabs-api-key" "${ELEVENLABS_API_KEY}"

# Criar GCP Service Account
SA_NAME="ulf-warden-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &> /dev/null; then
    log_info "Criando GCP Service Account..."
    gcloud iam service-accounts create $SA_NAME \
        --display-name="Ulfberht Warden" \
        --project=$PROJECT_ID
fi

# Dar permissões
log_info "Configurando permissões..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None --quiet || true

# Configurar Workload Identity
log_info "Configurando Workload Identity..."
gcloud container clusters update $CLUSTER_NAME \
    --workload-pool=$PROJECT_ID.svc.id.goog \
    --zone=$ZONE \
    --project=$PROJECT_ID \
    --quiet || log_warn "Workload Identity já habilitado"

# Bind GCP SA <-> K8s SA (ServiceAccount será criado pelo Helm)
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
    --role roles/iam.workloadIdentityUser \
    --member "serviceAccount:${PROJECT_ID}.svc.id.goog[agents/ulf-warden-ksa]" \
    --project=$PROJECT_ID \
    --quiet || true

# Instalar Secrets Store CSI Driver
log_info "Habilitando Secrets Store CSI Driver..."
gcloud container clusters update $CLUSTER_NAME \
    --update-addons=GcpSecretManagerCsiDriver=ENABLED \
    --zone=$ZONE \
    --project=$PROJECT_ID \
    --quiet || log_warn "CSI Driver já habilitado"

# 9. Deploy baseado no modo
if [ "$DEPLOY_MODE" = "standalone" ]; then
    log_info "Deploying standalone agent..."

    # Criar values file temporário
    cat > /tmp/ulf-standalone.yaml <<EOF
agent:
  name: "ulf-warden"
  role: "assistant"
  model: "sonnet"
  replicaCount: 1

  image:
    repository: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY_NAME}/ulf-warden
    pullPolicy: Always
    tag: "latest"

  api:
    enabled: true
    port: 8080
    protocol: "http"
    service:
      type: LoadBalancer

  channel:
    enabled: true
    type: "slack"
    slack:
      enabled: true
    discord:
      enabled: true

  taskSource:
    type: "api"

  env:
    - name: NODE_ENV
      value: "production"

# Google Secret Manager integration
secretManager:
  enabled: true
  projectID: "${PROJECT_ID}"
  serviceAccount: "${SA_EMAIL}"
  clusterLocation: "${ZONE}"
  clusterName: "${CLUSTER_NAME}"

# Service account with Workload Identity
serviceAccount:
  create: true
  name: "ulf-warden-ksa"

resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"

persistence:
  enabled: true
  storageClass: "standard-rwo"
  size: 5Gi
  mountPath: /data

autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 3
  targetCPUUtilizationPercentage: 70
EOF

    # Deploy com Helm
    helm upgrade --install ulf-warden ./infra/helm/agent \
        -f /tmp/ulf-standalone.yaml \
        --namespace agents \
        --wait \
        --timeout 5m

    rm /tmp/ulf-standalone.yaml

else
    log_info "Deploying agent swarm..."

    # Deploy coordinator
    log_info "Deploying coordinator with Redis..."
    helm upgrade --install coordinator ./infra/helm/coordinator \
        --namespace agents \
        --set redis.enabled=true \
        --set redis.auth.password=change-me-in-production \
        --set gateway.enabled=true \
        --set gateway.service.type=LoadBalancer \
        --wait \
        --timeout 5m

    # Wait for Redis
    log_info "Aguardando Redis ficar pronto..."
    kubectl wait --for=condition=ready pod \
        -l app.kubernetes.io/name=redis \
        -n agents \
        --timeout=300s

    # Deploy agents
    log_info "Deploying agent-lead..."
    cat > /tmp/agent-lead.yaml <<EOF
agent:
  name: "agent-lead"
  role: "coordinator"
  model: "opus"

  image:
    repository: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY_NAME}/ulf-warden
    tag: "latest"

  taskSource:
    type: "pubsub"
    redis:
      enabled: true
      host: "coordinator-redis-master.agents.svc.cluster.local"
      password: "change-me-in-production"
EOF

    helm upgrade --install agent-lead ./infra/helm/agent \
        -f /tmp/agent-lead.yaml \
        -f ./infra/examples/swarm.values.yaml \
        --namespace agents \
        --wait

    log_info "Deploying agent-coder..."
    cat > /tmp/agent-coder.yaml <<EOF
agent:
  name: "agent-coder"
  role: "specialist"
  model: "sonnet"
  replicaCount: 2

  image:
    repository: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY_NAME}/ulf-warden
    tag: "latest"

  taskSource:
    type: "pubsub"
    redis:
      enabled: true
      host: "coordinator-redis-master.agents.svc.cluster.local"
      password: "change-me-in-production"

resources:
  requests:
    memory: "1Gi"
    cpu: "500m"
  limits:
    memory: "4Gi"
    cpu: "2000m"

autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 5
EOF

    helm upgrade --install agent-coder ./infra/helm/agent \
        -f /tmp/agent-coder.yaml \
        --namespace agents \
        --wait

    log_info "Deploying agent-reviewer..."
    cat > /tmp/agent-reviewer.yaml <<EOF
agent:
  name: "agent-reviewer"
  role: "specialist"
  model: "sonnet"

  image:
    repository: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REGISTRY_NAME}/ulf-warden
    tag: "latest"

  taskSource:
    type: "pubsub"
    redis:
      enabled: true
      host: "coordinator-redis-master.agents.svc.cluster.local"
      password: "change-me-in-production"
EOF

    helm upgrade --install agent-reviewer ./infra/helm/agent \
        -f /tmp/agent-reviewer.yaml \
        --namespace agents \
        --wait

    rm /tmp/*.yaml
fi

# 10. Verificar deployment
log_info "Verificando deployment..."
kubectl get pods -n agents

# 11. Aguardar pods ficarem prontos
log_info "Aguardando todos os pods ficarem prontos..."
kubectl wait --for=condition=ready pod --all -n agents --timeout=300s || true

# 12. Mostrar status
echo ""
echo "=== Status do Deploy ==="
kubectl get all -n agents

# 13. Pegar IP externo (se LoadBalancer)
echo ""
echo "=== Informações de Acesso ==="
if [ "$DEPLOY_MODE" = "standalone" ]; then
    EXTERNAL_IP=$(kubectl get svc ulf-warden -n agents -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    echo "Service: ulf-warden"
    echo "External IP: $EXTERNAL_IP (pode levar alguns minutos)"
    echo "Health check: http://$EXTERNAL_IP:8080/health"
else
    COORDINATOR_IP=$(kubectl get svc coordinator -n agents -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    echo "Coordinator Gateway: $COORDINATOR_IP (pode levar alguns minutos)"
    echo "Health check: http://$COORDINATOR_IP:8080/health"
fi

# 14. Comandos úteis
echo ""
echo "=== Comandos Úteis ==="
echo "Ver logs:"
if [ "$DEPLOY_MODE" = "standalone" ]; then
    echo "  kubectl logs -f deployment/ulf-warden -n agents"
else
    echo "  kubectl logs -f deployment/agent-lead -n agents"
    echo "  kubectl logs -f deployment/agent-coder -n agents"
    echo "  kubectl logs -f deployment/agent-reviewer -n agents"
fi
echo ""
echo "Ver pods:"
echo "  kubectl get pods -n agents"
echo ""
echo "Port-forward (para testes locais):"
if [ "$DEPLOY_MODE" = "standalone" ]; then
    echo "  kubectl port-forward svc/ulf-warden 8080:8080 -n agents"
else
    echo "  kubectl port-forward svc/coordinator 8080:8080 -n agents"
fi
echo ""
echo "Deletar tudo:"
echo "  kubectl delete namespace agents"
echo "  gcloud container clusters delete $CLUSTER_NAME --zone $ZONE"
echo ""

log_info "Deploy completo! 🚀"
