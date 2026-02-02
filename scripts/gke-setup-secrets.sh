#!/bin/bash
#
# Setup Google Secret Manager para Ulfberht-Warden
# Usage: ./scripts/gke-setup-secrets.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Carregar .env se existir
if [ -f .env ]; then
    log_info "Carregando variáveis de .env"
    export $(grep -v '^#' .env | xargs)
fi

# Configurações
echo "=== Google Secret Manager Setup ==="
read -p "GCP Project ID [$PROJECT_ID]: " input_project
PROJECT_ID=${input_project:-$PROJECT_ID}

read -p "Region [us-central1]: " input_region
REGION=${input_region:-us-central1}

if [ -z "$PROJECT_ID" ]; then
    log_error "Project ID é obrigatório"
    exit 1
fi

log_info "Configurando projeto..."
gcloud config set project $PROJECT_ID

# 1. Habilitar API do Secret Manager
log_info "Habilitando Secret Manager API..."
gcloud services enable secretmanager.googleapis.com --quiet

# 2. Criar secrets no Secret Manager
echo ""
echo "=== Criar Secrets ==="
echo "Vou solicitar os valores das secrets. Deixe em branco se não usar."
echo ""

create_secret() {
    local secret_name=$1
    local secret_label=$2
    local secret_value=$3
    local required=$4

    # Se valor já foi passado como argumento, usar ele
    if [ -n "$secret_value" ]; then
        value=$secret_value
    else
        # Senão, perguntar
        if [ "$required" = "true" ]; then
            read -p "$secret_label (obrigatório): " value
            while [ -z "$value" ]; do
                log_warn "$secret_label é obrigatório"
                read -p "$secret_label: " value
            done
        else
            read -p "$secret_label (opcional): " value
        fi
    fi

    if [ -n "$value" ]; then
        # Verificar se secret já existe
        if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
            log_warn "Secret $secret_name já existe, criando nova versão..."
            echo -n "$value" | gcloud secrets versions add $secret_name \
                --data-file=- \
                --project=$PROJECT_ID
        else
            log_info "Criando secret $secret_name..."
            echo -n "$value" | gcloud secrets create $secret_name \
                --data-file=- \
                --replication-policy="automatic" \
                --project=$PROJECT_ID
        fi
        log_info "Secret $secret_name criada/atualizada"
    else
        log_warn "Pulando $secret_name (não fornecido)"
    fi
}

# Criar todas as secrets
create_secret "anthropic-api-key" "Anthropic API Key" "$ANTHROPIC_API_KEY" "true"
create_secret "slack-bot-token" "Slack Bot Token" "$SLACK_BOT_TOKEN" "false"
create_secret "slack-app-token" "Slack App Token" "$SLACK_APP_TOKEN" "false"
create_secret "slack-signing-secret" "Slack Signing Secret" "$SLACK_SIGNING_SECRET" "false"
create_secret "discord-bot-token" "Discord Bot Token" "$DISCORD_BOT_TOKEN" "false"
create_secret "telegram-bot-token" "Telegram Bot Token" "$TELEGRAM_BOT_TOKEN" "false"
create_secret "openai-api-key" "OpenAI API Key (opcional)" "$OPENAI_API_KEY" "false"

# 3. Criar Service Account para o workload
echo ""
log_info "Criando Service Account para workload..."

SA_NAME="ulf-warden-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Criar SA se não existir
if ! gcloud iam service-accounts describe $SA_EMAIL --project=$PROJECT_ID &> /dev/null; then
    gcloud iam service-accounts create $SA_NAME \
        --display-name="Ulfberht Warden Service Account" \
        --project=$PROJECT_ID
    log_info "Service Account criada"
else
    log_warn "Service Account já existe"
fi

# 4. Dar permissões para acessar secrets
log_info "Configurando permissões..."

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None

log_info "Permissões configuradas"

# 5. Configurar Workload Identity (se cluster existir)
echo ""
read -p "Nome do cluster GKE [ulf-cluster]: " CLUSTER_NAME
CLUSTER_NAME=${CLUSTER_NAME:-ulf-cluster}

read -p "Zone do cluster [us-central1-a]: " ZONE
ZONE=${ZONE:-us-central1-a}

if gcloud container clusters describe $CLUSTER_NAME --zone=$ZONE --project=$PROJECT_ID &> /dev/null; then
    log_info "Cluster encontrado, configurando Workload Identity..."

    # Habilitar Workload Identity no cluster (se não estiver)
    gcloud container clusters update $CLUSTER_NAME \
        --workload-pool=$PROJECT_ID.svc.id.goog \
        --zone=$ZONE \
        --project=$PROJECT_ID \
        --quiet || log_warn "Workload Identity já habilitado"

    # Criar Kubernetes Service Account
    log_info "Criando Kubernetes Service Account..."
    kubectl create namespace agents --dry-run=client -o yaml | kubectl apply -f -

    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ulf-warden-ksa
  namespace: agents
  annotations:
    iam.gke.io/gcp-service-account: ${SA_EMAIL}
EOF

    # Bind do GCP SA com K8s SA
    log_info "Configurando Workload Identity binding..."
    gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
        --role roles/iam.workloadIdentityUser \
        --member "serviceAccount:${PROJECT_ID}.svc.id.goog[agents/ulf-warden-ksa]" \
        --project=$PROJECT_ID

    log_info "Workload Identity configurado"
else
    log_warn "Cluster não encontrado. Configure Workload Identity após criar o cluster."
fi

# 6. Mostrar resumo
echo ""
echo "=== Resumo ==="
log_info "Secrets criadas no Secret Manager:"
gcloud secrets list --project=$PROJECT_ID --filter="name:anthropic OR name:slack OR name:discord OR name:telegram OR name:openai"

echo ""
log_info "Service Account: $SA_EMAIL"
log_info "Kubernetes SA: ulf-warden-ksa (namespace: agents)"

echo ""
echo "=== Próximos Passos ==="
echo "1. Deploy no GKE:"
echo "   ./scripts/gke-deploy.sh standalone"
echo ""
echo "2. Ou atualizar deployment existente:"
echo "   kubectl rollout restart deployment/ulf-warden -n agents"
echo ""
echo "3. Verificar secrets sendo carregadas:"
echo "   kubectl logs deployment/ulf-warden -n agents | grep -i secret"
echo ""

log_info "Setup completo! ✅"
