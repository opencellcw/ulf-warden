#!/bin/bash

# Deploy AgentOps to Kubernetes
# Usage: ./scripts/deploy-agentops.sh [namespace] [release-name]

set -e

NAMESPACE=${1:-opencell}
RELEASE=${2:-agentops}
CHART_DIR="./infra/helm/agentops"

echo "🚀 Deploying AgentOps to Kubernetes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Namespace: $NAMESPACE"
echo "Release:   $RELEASE"
echo ""

# Check if namespace exists
if ! kubectl get namespace $NAMESPACE &> /dev/null; then
  echo "📦 Creating namespace: $NAMESPACE"
  kubectl create namespace $NAMESPACE
fi

# Check if Helm is installed
if ! command -v helm &> /dev/null; then
  echo "❌ Helm is not installed. Please install Helm first."
  exit 1
fi

# Check if chart exists
if [ ! -d "$CHART_DIR" ]; then
  echo "❌ Chart directory not found: $CHART_DIR"
  exit 1
fi

# Check if release already exists
if helm list -n $NAMESPACE | grep -q "^$RELEASE"; then
  echo "⚠️  Release '$RELEASE' already exists. Upgrading..."
  helm upgrade $RELEASE $CHART_DIR \
    --namespace $NAMESPACE \
    --wait \
    --timeout 5m
else
  echo "📦 Installing AgentOps..."
  helm install $RELEASE $CHART_DIR \
    --namespace $NAMESPACE \
    --create-namespace \
    --wait \
    --timeout 5m
fi

echo ""
echo "✅ AgentOps deployed successfully!"
echo ""

# Get service information
echo "📊 Service Information:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Server service
SERVER_TYPE=$(kubectl get svc ${RELEASE}-server -n $NAMESPACE -o jsonpath='{.spec.type}')
echo "Server (Backend API):"
echo "  Type: $SERVER_TYPE"
echo "  Port: 8080"

if [ "$SERVER_TYPE" = "LoadBalancer" ]; then
  SERVER_IP=$(kubectl get svc ${RELEASE}-server -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  if [ -n "$SERVER_IP" ]; then
    echo "  External URL: http://$SERVER_IP:8080"
  else
    echo "  External IP: <pending>"
  fi
else
  echo "  Internal URL: http://${RELEASE}-server:8080"
fi

echo ""

# Dashboard service
DASHBOARD_TYPE=$(kubectl get svc ${RELEASE}-dashboard -n $NAMESPACE -o jsonpath='{.spec.type}')
echo "Dashboard (Web UI):"
echo "  Type: $DASHBOARD_TYPE"
echo "  Port: 3000"

if [ "$DASHBOARD_TYPE" = "LoadBalancer" ]; then
  DASHBOARD_IP=$(kubectl get svc ${RELEASE}-dashboard -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
  if [ -n "$DASHBOARD_IP" ]; then
    echo "  External URL: http://$DASHBOARD_IP:3000"
    echo ""
    echo "🌐 Open dashboard at: http://$DASHBOARD_IP:3000"
  else
    echo "  External IP: <pending>"
    echo ""
    echo "⏳ Waiting for LoadBalancer IP..."
    echo "   Run: kubectl get svc ${RELEASE}-dashboard -n $NAMESPACE -w"
  fi
elif [ "$DASHBOARD_TYPE" = "NodePort" ]; then
  NODE_PORT=$(kubectl get svc ${RELEASE}-dashboard -n $NAMESPACE -o jsonpath='{.spec.ports[0].nodePort}')
  NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
  echo "  Node URL: http://$NODE_IP:$NODE_PORT"
  echo ""
  echo "🌐 Open dashboard at: http://$NODE_IP:$NODE_PORT"
else
  echo "  Internal URL: http://${RELEASE}-dashboard:3000"
  echo ""
  echo "💡 To access dashboard locally:"
  echo "   kubectl port-forward svc/${RELEASE}-dashboard -n $NAMESPACE 3000:3000"
  echo "   Then open: http://localhost:3000"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check pod status
echo "📦 Pod Status:"
kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=agentops

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Next steps
echo "🎯 Next Steps:"
echo ""
echo "1. Configure OpenCell to use AgentOps:"
echo "   kubectl set env deployment/ulf-warden -n $NAMESPACE \\"
echo "     AGENTOPS_ENABLED=true \\"
echo "     AGENTOPS_ENDPOINT=http://${RELEASE}-server:8080"
echo ""
echo "2. Restart OpenCell:"
echo "   kubectl rollout restart deployment/ulf-warden -n $NAMESPACE"
echo ""
echo "3. Access the dashboard and start monitoring!"
echo ""
echo "📖 For more info: ./infra/helm/agentops/README.md"
echo ""
