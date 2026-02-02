#!/bin/bash
#
# Sync .env com Google Secret Manager
# Usage: ./scripts/sync-secrets.sh [push|pull]
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_step() {
    echo -e "${BLUE}→${NC} $1"
}

# Verificar se .env existe
if [ ! -f .env ]; then
    log_error ".env não encontrado!"
    echo ""
    echo "Crie um arquivo .env com suas secrets:"
    echo "  cp .env.example .env"
    echo "  # Edite .env com valores reais"
    exit 1
fi

# Carregar .env
log_info "Carregando .env..."
export $(grep -v '^#' .env | grep -v '^$' | xargs)

# Verificar PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
    log_error "PROJECT_ID não definido no .env"
    exit 1
fi

# Configurar gcloud
gcloud config set project $PROJECT_ID --quiet

# Verificar Secret Manager API
log_step "Verificando Secret Manager API..."
if ! gcloud services list --enabled | grep -q secretmanager.googleapis.com; then
    log_warn "Habilitando Secret Manager API..."
    gcloud services enable secretmanager.googleapis.com --quiet
fi

# Determinar ação
ACTION=${1:-push}

if [ "$ACTION" = "push" ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  📤 PUSH: .env → Google Secret Manager"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    log_warn "Isso vai atualizar as secrets no Google Secret Manager"
    log_warn "com os valores do seu .env local."
    echo ""
    read -p "Continuar? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Cancelado"
        exit 0
    fi

    # Função para criar/atualizar secret
    update_secret() {
        local secret_name=$1
        local secret_value=$2

        if [ -z "$secret_value" ]; then
            log_warn "Pulando $secret_name (vazio)"
            return
        fi

        if gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
            # Secret existe - adicionar nova versão
            log_step "Atualizando $secret_name..."
            echo -n "$secret_value" | gcloud secrets versions add $secret_name \
                --data-file=- \
                --project=$PROJECT_ID 2>&1 | grep -v "Created version"
            log_info "$secret_name atualizado"
        else
            # Secret não existe - criar
            log_step "Criando $secret_name..."
            echo -n "$secret_value" | gcloud secrets create $secret_name \
                --data-file=- \
                --replication-policy="automatic" \
                --project=$PROJECT_ID 2>&1 | grep -v "Created secret"
            log_info "$secret_name criado"
        fi
    }

    # Atualizar todas as secrets
    echo ""
    log_step "Sincronizando secrets..."
    echo ""

    update_secret "anthropic-api-key" "$ANTHROPIC_API_KEY"
    update_secret "slack-bot-token" "$SLACK_BOT_TOKEN"
    update_secret "slack-app-token" "$SLACK_APP_TOKEN"
    update_secret "slack-signing-secret" "$SLACK_SIGNING_SECRET"
    update_secret "discord-bot-token" "$DISCORD_BOT_TOKEN"
    update_secret "telegram-bot-token" "$TELEGRAM_BOT_TOKEN"
    update_secret "openai-api-key" "$OPENAI_API_KEY"

    echo ""
    log_info "Sync completo! ✅"
    echo ""
    log_step "Próximo passo:"
    echo "  kubectl rollout restart deployment/ulf-warden -n agents"

elif [ "$ACTION" = "pull" ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  📥 PULL: Google Secret Manager → .env"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    log_warn "Isso vai sobrescrever seu .env local"
    log_warn "com os valores do Google Secret Manager."
    echo ""
    read -p "Continuar? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_warn "Cancelado"
        exit 0
    fi

    # Backup do .env atual
    if [ -f .env ]; then
        cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
        log_info "Backup criado: .env.backup.$(date +%Y%m%d_%H%M%S)"
    fi

    # Função para ler secret
    get_secret() {
        local secret_name=$1
        gcloud secrets versions access latest \
            --secret=$secret_name \
            --project=$PROJECT_ID 2>/dev/null || echo ""
    }

    # Criar novo .env
    log_step "Baixando secrets..."
    echo ""

    cat > .env << EOF
# Google Cloud Platform
PROJECT_ID=$PROJECT_ID
REGION=${REGION:-us-central1}
ZONE=${ZONE:-us-central1-a}
CLUSTER_NAME=${CLUSTER_NAME:-ulf-cluster}

# Anthropic (obrigatório)
ANTHROPIC_API_KEY=$(get_secret "anthropic-api-key")

# Slack (opcional)
SLACK_BOT_TOKEN=$(get_secret "slack-bot-token")
SLACK_APP_TOKEN=$(get_secret "slack-app-token")
SLACK_SIGNING_SECRET=$(get_secret "slack-signing-secret")

# Discord (opcional)
DISCORD_BOT_TOKEN=$(get_secret "discord-bot-token")

# Telegram (opcional)
TELEGRAM_BOT_TOKEN=$(get_secret "telegram-bot-token")

# OpenAI (opcional)
OPENAI_API_KEY=$(get_secret "openai-api-key")
EOF

    log_info ".env atualizado com secrets do Secret Manager ✅"
    echo ""
    log_step "Verifique o arquivo .env para confirmar"

elif [ "$ACTION" = "diff" ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  🔍 DIFF: .env vs Google Secret Manager"
    echo "═══════════════════════════════════════════════════════"
    echo ""

    # Função para comparar secret
    compare_secret() {
        local secret_name=$1
        local local_value=$2
        local display_name=$3

        if [ -z "$local_value" ]; then
            echo -e "${YELLOW}⊘${NC} $display_name: não definido localmente"
            return
        fi

        if ! gcloud secrets describe $secret_name --project=$PROJECT_ID &> /dev/null; then
            echo -e "${RED}✗${NC} $display_name: não existe no Secret Manager"
            return
        fi

        local remote_value=$(gcloud secrets versions access latest \
            --secret=$secret_name \
            --project=$PROJECT_ID 2>/dev/null)

        if [ "$local_value" = "$remote_value" ]; then
            echo -e "${GREEN}✓${NC} $display_name: sincronizado"
        else
            echo -e "${YELLOW}≠${NC} $display_name: DIFERENTE"
            echo "  Local:  ${local_value:0:20}..."
            echo "  Remote: ${remote_value:0:20}..."
        fi
    }

    compare_secret "anthropic-api-key" "$ANTHROPIC_API_KEY" "Anthropic API Key"
    compare_secret "slack-bot-token" "$SLACK_BOT_TOKEN" "Slack Bot Token"
    compare_secret "slack-app-token" "$SLACK_APP_TOKEN" "Slack App Token"
    compare_secret "slack-signing-secret" "$SLACK_SIGNING_SECRET" "Slack Signing Secret"
    compare_secret "discord-bot-token" "$DISCORD_BOT_TOKEN" "Discord Bot Token"
    compare_secret "telegram-bot-token" "$TELEGRAM_BOT_TOKEN" "Telegram Bot Token"
    compare_secret "openai-api-key" "$OPENAI_API_KEY" "OpenAI API Key"

    echo ""

else
    log_error "Ação inválida: $ACTION"
    echo ""
    echo "Usage: $0 [push|pull|diff]"
    echo ""
    echo "  push  - Envia .env → Google Secret Manager"
    echo "  pull  - Baixa Google Secret Manager → .env"
    echo "  diff  - Compara .env vs Google Secret Manager"
    exit 1
fi

echo ""
log_info "Pronto! 🎉"
