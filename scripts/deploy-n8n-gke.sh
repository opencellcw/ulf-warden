#!/bin/bash

###############################################################################
# n8n GKE Deployment Script
# 
# Deploys n8n to Google Kubernetes Engine (GKE)
# Usage: ./scripts/deploy-n8n-gke.sh
###############################################################################

set -e

echo "🚀 Deploying n8n to GKE..."

# Check if kubectl is configured
if ! kubectl cluster-info &> /dev/null; then
  echo "❌ kubectl is not configured. Please configure kubectl first."
  echo "Run: gcloud container clusters get-credentials YOUR_CLUSTER --region YOUR_REGION"
  exit 1
fi

# Variables
NAMESPACE="n8n"
RELEASE_NAME="n8n"
CHART_VERSION="0.20.0"  # Update to latest version

# Check if namespace exists
if ! kubectl get namespace "$NAMESPACE" &> /dev/null; then
  echo "📦 Creating namespace: $NAMESPACE"
  kubectl create namespace "$NAMESPACE"
else
  echo "✅ Namespace already exists: $NAMESPACE"
fi

# Create secrets if they don't exist
if ! kubectl get secret n8n-secrets -n "$NAMESPACE" &> /dev/null; then
  echo "🔐 Creating secrets..."
  
  # Generate random password and encryption key
  N8N_PASSWORD=$(openssl rand -base64 32)
  N8N_ENCRYPTION_KEY=$(openssl rand -base64 32)
  
  kubectl create secret generic n8n-secrets \
    --from-literal=N8N_BASIC_AUTH_PASSWORD="$N8N_PASSWORD" \
    --from-literal=N8N_ENCRYPTION_KEY="$N8N_ENCRYPTION_KEY" \
    -n "$NAMESPACE"
  
  echo "✅ Secrets created"
  echo "📝 Save these credentials:"
  echo "   Username: admin"
  echo "   Password: $N8N_PASSWORD"
  echo "   Encryption Key: $N8N_ENCRYPTION_KEY"
  echo ""
  echo "⚠️  IMPORTANT: Save these credentials securely!"
  echo ""
else
  echo "✅ Secrets already exist"
fi

# Add n8n Helm repository
echo "📦 Adding n8n Helm repository..."
helm repo add n8n https://8gears.com/n8n-helm-chart/ || true
helm repo update

# Deploy n8n
echo "☸️  Deploying n8n..."
helm upgrade --install "$RELEASE_NAME" n8n/n8n \
  --namespace "$NAMESPACE" \
  --version "$CHART_VERSION" \
  --values infra/helm/n8n/values.yaml \
  --wait \
  --timeout 5m

# Wait for pod to be ready
echo "⏳ Waiting for n8n pod to be ready..."
kubectl wait --for=condition=ready pod \
  -l app.kubernetes.io/name=n8n \
  -n "$NAMESPACE" \
  --timeout=300s

# Get service details
echo ""
echo "✅ n8n deployed successfully!"
echo ""
echo "📊 Deployment details:"
kubectl get pods,svc,ingress -n "$NAMESPACE"
echo ""

# Get ingress URL
INGRESS_URL=$(kubectl get ingress -n "$NAMESPACE" -o jsonpath='{.items[0].spec.rules[0].host}' 2>/dev/null || echo "not-configured")

if [ "$INGRESS_URL" != "not-configured" ]; then
  echo "🌐 n8n URL: https://$INGRESS_URL"
  echo ""
  echo "⏳ Note: It may take a few minutes for SSL certificate to be issued."
else
  echo "⚠️  Ingress not configured. Access via port-forward:"
  echo "   kubectl port-forward svc/n8n -n n8n 5678:5678"
  echo "   Then open: http://localhost:5678"
fi

echo ""
echo "📝 Useful commands:"
echo "  View logs:    kubectl logs -f -l app.kubernetes.io/name=n8n -n n8n"
echo "  Port-forward: kubectl port-forward svc/n8n -n n8n 5678:5678"
echo "  Get password: kubectl get secret n8n-secrets -n n8n -o jsonpath='{.data.N8N_BASIC_AUTH_PASSWORD}' | base64 -d"
echo "  Delete:       helm uninstall n8n -n n8n"
echo ""

# Export workflows from local to GKE (optional)
echo "💡 To migrate workflows from local Docker to GKE:"
echo "  1. Export workflows from local: http://localhost:5678/workflows → Settings → Export"
echo "  2. Import to GKE: https://$INGRESS_URL/workflows → Settings → Import"
echo ""
