#!/bin/bash
#
# Deploy Security Auditor to GKE
#

set -e

PROJECT_ID="${PROJECT_ID:-opencellcw-k8s}"
REGION="${REGION:-us-central1}"
WEBHOOK_URL="${DISCORD_SECURITY_WEBHOOK}"

echo "🛡️  Deploying Ulfberht Security Auditor"
echo "========================================="
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# 1. Build Docker image
echo "📦 Building Docker image..."
gcloud builds submit --tag ${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/ulf-auditor:latest \
  --quiet .

# 2. Create/update Discord webhook secret
if [ -n "$WEBHOOK_URL" ]; then
  echo "🔐 Updating Discord webhook secret..."
  kubectl create secret generic auditor-secrets -n agents \
    --from-literal=DISCORD_SECURITY_WEBHOOK="$WEBHOOK_URL" \
    --dry-run=client -o yaml | kubectl apply -f -
else
  echo "⚠️  DISCORD_SECURITY_WEBHOOK not set. Skipping secret creation."
  echo "   Set it with: export DISCORD_SECURITY_WEBHOOK='https://discord.com/api/webhooks/...'"
fi

# 3. Deploy CronJob
echo "📅 Deploying CronJob..."
kubectl apply -f k8s/cronjob.yaml

# 4. Show status
echo ""
echo "✅ Deployment complete!"
echo ""
echo "To check status:"
echo "  kubectl get cronjobs -n agents"
echo "  kubectl get jobs -n agents"
echo ""
echo "To run manually:"
echo "  kubectl create job --from=cronjob/security-auditor manual-audit-1 -n agents"
echo ""
echo "To view logs:"
echo "  kubectl logs -n agents -l app=security-auditor"
echo ""
