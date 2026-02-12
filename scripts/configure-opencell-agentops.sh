#!/bin/bash

# Configure OpenCell to use AgentOps
# Usage: ./scripts/configure-opencell-agentops.sh [namespace] [deployment] [agentops-release]

set -e

NAMESPACE=${1:-opencell}
DEPLOYMENT=${2:-ulf-warden}
AGENTOPS_RELEASE=${3:-agentops}

echo "⚙️  Configuring OpenCell to use AgentOps"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Namespace:  $NAMESPACE"
echo "Deployment: $DEPLOYMENT"
echo "AgentOps:   $AGENTOPS_RELEASE"
echo ""

# Check if deployment exists
if ! kubectl get deployment $DEPLOYMENT -n $NAMESPACE &> /dev/null; then
  echo "❌ Deployment '$DEPLOYMENT' not found in namespace '$NAMESPACE'"
  exit 1
fi

# Check if AgentOps server service exists
if ! kubectl get svc ${AGENTOPS_RELEASE}-server -n $NAMESPACE &> /dev/null; then
  echo "❌ AgentOps server service not found"
  echo "   Please deploy AgentOps first: ./scripts/deploy-agentops.sh"
  exit 1
fi

AGENTOPS_ENDPOINT="http://${AGENTOPS_RELEASE}-server:8080"

echo "📝 Setting environment variables..."
kubectl set env deployment/$DEPLOYMENT -n $NAMESPACE \
  AGENTOPS_ENABLED=true \
  AGENTOPS_ENDPOINT="$AGENTOPS_ENDPOINT" \
  AGENTOPS_TAGS="opencell,production"

echo ""
echo "✅ Environment variables set!"
echo ""
echo "🔄 Waiting for rollout to complete..."
kubectl rollout status deployment/$DEPLOYMENT -n $NAMESPACE --timeout=5m

echo ""
echo "✅ OpenCell configured successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎯 Verification:"
echo ""
echo "1. Check OpenCell logs:"
echo "   kubectl logs -n $NAMESPACE deployment/$DEPLOYMENT -f | grep AgentOps"
echo ""
echo "2. You should see:"
echo "   [AgentOps] Initialized successfully"
echo ""
echo "3. Open AgentOps dashboard:"

DASHBOARD_TYPE=$(kubectl get svc ${AGENTOPS_RELEASE}-dashboard -n $NAMESPACE -o jsonpath='{.spec.type}')
if [ "$DASHBOARD_TYPE" = "LoadBalancer" ]; then
  DASHBOARD_IP=$(kubectl get svc ${AGENTOPS_RELEASE}-dashboard -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  if [ -n "$DASHBOARD_IP" ]; then
    echo "   http://$DASHBOARD_IP:3000"
  else
    echo "   <LoadBalancer IP pending>"
  fi
elif [ "$DASHBOARD_TYPE" = "NodePort" ]; then
  NODE_PORT=$(kubectl get svc ${AGENTOPS_RELEASE}-dashboard -n $NAMESPACE -o jsonpath='{.spec.ports[0].nodePort}')
  NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
  echo "   http://$NODE_IP:$NODE_PORT"
else
  echo "   kubectl port-forward svc/${AGENTOPS_RELEASE}-dashboard -n $NAMESPACE 3000:3000"
  echo "   Then: http://localhost:3000"
fi

echo ""
echo "4. Use a bot and check dashboard for sessions!"
echo ""
