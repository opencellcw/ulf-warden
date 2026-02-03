#!/bin/bash

# Setup Cloudflare AI Gateway for Ulf Warden in GKE
# Usage: ./scripts/setup-ai-gateway.sh YOUR_ACCOUNT_ID

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Cloudflare Account ID required"
  echo ""
  echo "Usage: ./scripts/setup-ai-gateway.sh YOUR_ACCOUNT_ID"
  echo ""
  echo "Get your Account ID from: https://dash.cloudflare.com → AI Gateway → (your gateway)"
  exit 1
fi

ACCOUNT_ID=$1
GATEWAY_SLUG="ulf-gateway"
PROJECT_ID=${PROJECT_ID:-"opencellcw-k8s"}

echo "🔧 Setting up Cloudflare AI Gateway for Ulf Warden"
echo "=================================================="
echo ""
echo "Account ID: ${ACCOUNT_ID:0:8}..."
echo "Gateway Slug: $GATEWAY_SLUG"
echo "GCP Project: $PROJECT_ID"
echo ""

# Step 1: Create secrets in Google Secret Manager
echo "📦 Creating secrets in Google Secret Manager..."
echo ""

echo -n "$ACCOUNT_ID" | gcloud secrets create cloudflare-account-id \
  --data-file=- \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  2>/dev/null || echo "ℹ️  Secret cloudflare-account-id already exists, updating..."

if [ $? -ne 0 ]; then
  echo -n "$ACCOUNT_ID" | gcloud secrets versions add cloudflare-account-id \
    --data-file=- \
    --project=$PROJECT_ID
fi

echo -n "$GATEWAY_SLUG" | gcloud secrets create cloudflare-gateway-slug \
  --data-file=- \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  2>/dev/null || echo "ℹ️  Secret cloudflare-gateway-slug already exists, updating..."

if [ $? -ne 0 ]; then
  echo -n "$GATEWAY_SLUG" | gcloud secrets versions add cloudflare-gateway-slug \
    --data-file=- \
    --project=$PROJECT_ID
fi

echo "✓ Secrets created/updated"
echo ""

# Step 2: Show instructions for updating SecretProviderClass
echo "📝 Next steps - Update Kubernetes configuration:"
echo ""
echo "1. Update SecretProviderClass:"
echo "   kubectl edit secretproviderclass ulf-warden-agent-secrets -n agents"
echo ""
echo "   Add these entries to 'parameters.secrets':"
echo ""
echo "   - secretPath: \"projects/$PROJECT_ID/secrets/cloudflare-account-id/versions/latest\""
echo "     fileName: \"cloudflare-account-id\""
echo "   - secretPath: \"projects/$PROJECT_ID/secrets/cloudflare-gateway-slug/versions/latest\""
echo "     fileName: \"cloudflare-gateway-slug\""
echo ""
echo "2. Update Deployment:"
echo "   kubectl edit deployment ulf-warden-agent -n agents"
echo ""
echo "   Add these environment variables to 'spec.template.spec.containers[0].env':"
echo ""
echo "   - name: CLOUDFLARE_ACCOUNT_ID"
echo "     valueFrom:"
echo "       secretKeyRef:"
echo "         name: ulf-warden-agent-secrets"
echo "         key: cloudflare-account-id"
echo "   - name: CLOUDFLARE_GATEWAY_SLUG"
echo "     valueFrom:"
echo "       secretKeyRef:"
echo "         name: ulf-warden-agent-secrets"
echo "         key: cloudflare-gateway-slug"
echo ""
echo "3. Restart deployment:"
echo "   kubectl rollout restart deployment/ulf-warden-agent -n agents"
echo ""
echo "4. Verify Gateway is active:"
echo "   kubectl logs -n agents deployment/ulf-warden-agent | grep Gateway"
echo ""
echo "   Expected output:"
echo "   [Claude] Cloudflare AI Gateway enabled { accountId: '${ACCOUNT_ID:0:8}...', gatewaySlug: '$GATEWAY_SLUG' }"
echo ""
echo "=================================================="
echo "✓ Setup script complete!"
echo ""
echo "⚠️  IMPORTANT: You still need to manually update Kubernetes resources (steps 1-2 above)"
echo ""
