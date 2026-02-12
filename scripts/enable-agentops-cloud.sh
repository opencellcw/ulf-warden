#!/bin/bash

# Enable AgentOps Cloud integration
# Usage: ./scripts/enable-agentops-cloud.sh <API_KEY>

set -e

API_KEY=$1
NAMESPACE=${2:-agents}
DEPLOYMENT=${3:-ulf-warden-agent}

if [ -z "$API_KEY" ]; then
  echo "❌ Error: API KEY required"
  echo ""
  echo "Usage: $0 <API_KEY> [namespace] [deployment]"
  echo ""
  echo "Example:"
  echo "  $0 ak-xxxxx agents ulf-warden-agent"
  echo ""
  echo "📋 Steps:"
  echo "1. Sign up at https://www.agentops.ai"
  echo "2. Get your API key from dashboard"
  echo "3. Run this script with the API key"
  echo ""
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 Enabling AgentOps Cloud Integration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Namespace:  $NAMESPACE"
echo "Deployment: $DEPLOYMENT"
echo "API Key:    ${API_KEY:0:8}..."
echo ""

# Check if deployment exists
if ! kubectl get deployment $DEPLOYMENT -n $NAMESPACE &> /dev/null; then
  echo "❌ Deployment '$DEPLOYMENT' not found in namespace '$NAMESPACE'"
  echo ""
  echo "Available deployments:"
  kubectl get deployments -n $NAMESPACE
  exit 1
fi

echo "✅ Deployment found"
echo ""

# Set environment variables
echo "📝 Setting environment variables..."
kubectl set env deployment/$DEPLOYMENT -n $NAMESPACE \
  AGENTOPS_ENABLED=true \
  AGENTOPS_API_KEY="$API_KEY" \
  AGENTOPS_TAGS="opencell,production"

echo "✅ Environment variables set"
echo ""

# Wait for rollout
echo "🔄 Waiting for rollout to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=5m

echo ""
echo "✅ Rollout complete!"
echo ""

# Get pod name
POD=$(kubectl get pods -n $NAMESPACE -l app=$DEPLOYMENT -o jsonpath='{.items[0].metadata.name}')

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 AgentOps Cloud Enabled Successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Dashboard: https://app.agentops.ai"
echo ""
echo "🔍 Verification:"
echo "  1. Check logs:"
echo "     kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT | grep AgentOps"
echo ""
echo "  2. You should see:"
echo "     [AgentOps] Initialized successfully"
echo ""
echo "  3. Use any bot (Discord, Slack, etc.)"
echo ""
echo "  4. Check AgentOps dashboard for sessions!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check logs for AgentOps
echo "📋 Recent logs (checking for AgentOps):"
echo ""
kubectl logs -n $NAMESPACE $POD --tail=50 | grep -i agentops || echo "⏳ Waiting for AgentOps to initialize..."
echo ""
echo "💡 Keep watching logs:"
echo "   kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT -f | grep AgentOps"
echo ""
