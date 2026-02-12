#!/bin/bash

# Cloudflare Tunnel Setup Script
# This script helps configure Cloudflare Tunnel for the bot

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║         CLOUDFLARE TUNNEL SETUP FOR ULF-WARDEN            ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if tunnel token is provided
if [ -z "$1" ]; then
  echo "❌ Error: Tunnel token is required"
  echo ""
  echo "Usage: $0 <TUNNEL_TOKEN>"
  echo ""
  echo "Steps to get tunnel token:"
  echo "1. Go to https://dash.cloudflare.com/"
  echo "2. Navigate to Zero Trust > Networks > Tunnels"
  echo "3. Click 'Create a tunnel'"
  echo "4. Choose 'Cloudflared'"
  echo "5. Name it 'ulf-warden-bot'"
  echo "6. Copy the tunnel token"
  echo "7. Run this script with the token"
  echo ""
  exit 1
fi

TUNNEL_TOKEN="$1"
NAMESPACE="agents"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Namespace: $NAMESPACE"
echo "Token: ${TUNNEL_TOKEN:0:20}..."
echo ""

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo "📦 Creating namespace: $NAMESPACE"
  kubectl create namespace $NAMESPACE
else
  echo "✅ Namespace exists: $NAMESPACE"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Creating/Updating Secret"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Create or update secret
kubectl create secret generic cloudflared-secret \
  --from-literal=token="$TUNNEL_TOKEN" \
  --namespace=$NAMESPACE \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✅ Secret created/updated"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Deploying Cloudflared"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Apply deployment
kubectl apply -f cloudflared-deployment.yaml

echo "✅ Deployment created"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⏳ Waiting for pods to be ready..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

kubectl wait --for=condition=ready pod \
  -l app=cloudflared \
  -n $NAMESPACE \
  --timeout=60s

echo ""
echo "✅ Cloudflared is running!"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Status"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

kubectl get pods -n $NAMESPACE -l app=cloudflared

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Logs (last 20 lines)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

POD=$(kubectl get pods -n $NAMESPACE -l app=cloudflared -o jsonpath='{.items[0].metadata.name}')
kubectl logs -n $NAMESPACE $POD --tail=20

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║           ✅ CLOUDFLARE TUNNEL CONFIGURED! 🎉             ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "1. Go to Cloudflare Dashboard > Tunnels"
echo "2. Configure public hostname:"
echo "   - Public Hostname: bot.yourdomain.com (or use Cloudflare's URL)"
echo "   - Service: http://ulf-warden-agent:3000"
echo "3. Save configuration"
echo "4. Test with: curl https://bot.yourdomain.com/health"
echo ""
echo "Your bot webhooks will now work through the tunnel! 🚀"
echo "Firewall? No problem! Tunnel bypasses it! 💪"
echo ""
