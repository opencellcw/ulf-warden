#!/bin/bash
#
# Deploy WhatsApp no Kubernetes (GKE)
# Faz sync de secrets, build, deploy e mostra QR Code
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

echo ""
echo "════════════════════════════════════════════════════════"
echo "📱 DEPLOY WHATSAPP NO KUBERNETES"
echo "════════════════════════════════════════════════════════"
echo ""

# Carregar .env
if [ ! -f .env ]; then
    log_error ".env não encontrado!"
    exit 1
fi

export $(grep -v '^#' .env | xargs)

if [ -z "$PROJECT_ID" ]; then
    log_error "PROJECT_ID não definido no .env"
    exit 1
fi

REGION=${REGION:-us-central1}
NAMESPACE=${NAMESPACE:-ulf}

log_info "Project: $PROJECT_ID"
log_info "Region: $REGION"
log_info "Namespace: $NAMESPACE"
echo ""

# 1. SYNC SECRETS
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  SYNCING SECRETS (.env → Secret Manager)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f scripts/sync-secrets.sh ]; then
    ./scripts/sync-secrets.sh
    log_info "Secrets sincronizados"
else
    log_warn "sync-secrets.sh não encontrado, pulando..."
fi

echo ""

# 2. BUILD IMAGEM
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  BUILDING DOCKER IMAGE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

IMAGE_URL="${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-warden:latest"
log_info "Building: $IMAGE_URL"

gcloud builds submit --tag "$IMAGE_URL" --quiet

log_info "Imagem criada com sucesso"
echo ""

# 3. VERIFICAR CLUSTER
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  VERIFICANDO CLUSTER K8S"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ! kubectl get deployment -n $NAMESPACE ulf-warden &>/dev/null; then
    log_error "Deployment ulf-warden não encontrado no namespace $NAMESPACE"
    log_warn "Execute primeiro: ./scripts/gke-deploy.sh"
    exit 1
fi

log_info "Deployment encontrado"
echo ""

# 4. ENABLE WHATSAPP
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  ENABLING WHATSAPP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

kubectl set env deployment/ulf-warden -n $NAMESPACE \
    WHATSAPP_ENABLED=true \
    WHATSAPP_AUTH_PATH=/app/data/whatsapp-auth \
    DISCORD_CHANNEL_ID="${DISCORD_CHANNEL_ID}"

log_info "WhatsApp habilitado"
log_info "Discord Channel ID configurado: ${DISCORD_CHANNEL_ID}"
echo ""

# 5. UPDATE IMAGE E RESTART
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  UPDATING & RESTARTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

kubectl set image deployment/ulf-warden -n $NAMESPACE \
    ulf-warden="$IMAGE_URL"

kubectl rollout restart deployment/ulf-warden -n $NAMESPACE

log_info "Aguardando pod..."
kubectl rollout status deployment/ulf-warden -n $NAMESPACE --timeout=300s

log_info "Pod pronto"
echo ""

# 6. AGUARDAR QR CODE
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  AGUARDANDO QR CODE..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
log_warn "O QR Code aparecerá nos logs abaixo"
log_warn "FIQUE PRONTO COM SEU CELULAR!"
echo ""
sleep 5

# 7. MOSTRAR LOGS COM QR CODE
echo "════════════════════════════════════════════════════════"
echo "📱 ESCANEIE O QR CODE ABAIXO"
echo "════════════════════════════════════════════════════════"
echo ""

# Follow logs e filtrar WhatsApp
kubectl logs -n $NAMESPACE deployment/ulf-warden -f --tail=50 | grep -A 35 "WhatsApp\|QR"

# Se chegou aqui sem erros
log_info "Deploy completo!"
