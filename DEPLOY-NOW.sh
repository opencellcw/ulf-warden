#!/bin/bash

# Quick Deploy Script
# Executes complete deployment after cleanup

set -e  # Exit on error

COMMIT_SHA="0991e97"
IMAGE_NAME="gcr.io/opencellcw-k8s/ulf-warden-agent:${COMMIT_SHA}"
NAMESPACE="agents"
DEPLOYMENT="ulf-warden-agent"

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║              DEPLOY ULF WARDEN - POST CLEANUP                    ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Image: ${IMAGE_NAME}"
echo "🎯 Namespace: ${NAMESPACE}"
echo "🚀 Deployment: ${DEPLOYMENT}"
echo ""

# Step 1: Build Docker Image
echo "═══════════════════════════════════════════════════════════════════"
echo "1️⃣  BUILDING DOCKER IMAGE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

docker build -t "${IMAGE_NAME}" .

if [ $? -eq 0 ]; then
  echo "✅ Docker image built successfully!"
else
  echo "❌ Docker build failed!"
  exit 1
fi

echo ""

# Step 2: Push to GCR
echo "═══════════════════════════════════════════════════════════════════"
echo "2️⃣  PUSHING TO GOOGLE CONTAINER REGISTRY"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

docker push "${IMAGE_NAME}"

if [ $? -eq 0 ]; then
  echo "✅ Image pushed to GCR successfully!"
else
  echo "❌ Push to GCR failed!"
  exit 1
fi

echo ""

# Step 3: Deploy to K8s
echo "═══════════════════════════════════════════════════════════════════"
echo "3️⃣  DEPLOYING TO KUBERNETES"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

kubectl set image deployment/${DEPLOYMENT} \
  agent=${IMAGE_NAME} \
  -n ${NAMESPACE}

if [ $? -eq 0 ]; then
  echo "✅ Deployment updated successfully!"
else
  echo "❌ Deployment update failed!"
  exit 1
fi

echo ""

# Step 4: Wait for Rollout
echo "═══════════════════════════════════════════════════════════════════"
echo "4️⃣  WAITING FOR ROLLOUT TO COMPLETE"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

kubectl rollout status deployment/${DEPLOYMENT} -n ${NAMESPACE}

if [ $? -eq 0 ]; then
  echo "✅ Rollout completed successfully!"
else
  echo "❌ Rollout failed!"
  exit 1
fi

echo ""

# Step 5: Verify Deployment
echo "═══════════════════════════════════════════════════════════════════"
echo "5️⃣  VERIFYING DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Get pod name
POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=ulf-warden-agent -o jsonpath='{.items[0].metadata.name}')

echo "📦 Pod: ${POD_NAME}"
echo ""

# Check pod status
kubectl get pod ${POD_NAME} -n ${NAMESPACE}
echo ""

# Check recent logs
echo "📄 Recent logs:"
echo "───────────────────────────────────────────────────────────────────"
kubectl logs ${POD_NAME} -n ${NAMESPACE} --tail=20
echo "───────────────────────────────────────────────────────────────────"
echo ""

# Check for errors
ERROR_COUNT=$(kubectl logs ${POD_NAME} -n ${NAMESPACE} --tail=100 | grep -i "error\|failed\|exception" | wc -l)

if [ ${ERROR_COUNT} -gt 0 ]; then
  echo "⚠️  WARNING: ${ERROR_COUNT} errors found in logs!"
  echo ""
  echo "Recent errors:"
  kubectl logs ${POD_NAME} -n ${NAMESPACE} --tail=100 | grep -i "error\|failed\|exception" | tail -10
else
  echo "✅ No errors found in recent logs!"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "✅ Image: ${IMAGE_NAME}"
echo "✅ Pod: ${POD_NAME}"
echo "✅ Status: Running"
echo ""
echo "📋 Next steps:"
echo "  1. Test Voice System: Discord -> 'entrar no canal'"
echo "  2. Monitor logs: kubectl logs -f ${POD_NAME} -n ${NAMESPACE}"
echo "  3. Check health: kubectl get pod ${POD_NAME} -n ${NAMESPACE}"
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║                  DEPLOY SUCCESSFUL! 🚀                           ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
