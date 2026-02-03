#!/bin/bash
#
# Build e Deploy usando Google Cloud Build
# Usage: ./scripts/cloud-build-deploy.sh
#

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🏗️  Building with Google Cloud Build${NC}"
echo "========================================"
echo ""

# Load .env
if [ -f .env ]; then
    export $(grep -v '^#' .env | xargs)
fi

PROJECT_ID=${GCP_PROJECT_ID:-opencellcw-k8s}
REGION=${GCP_REGION:-us-central1}
IMAGE_NAME="ulf-warden"
IMAGE_TAG="latest"
FULL_IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/ulf-images/${IMAGE_NAME}:${IMAGE_TAG}"

echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Image: $FULL_IMAGE"
echo ""

# Build with Cloud Build
echo -e "${YELLOW}⏳ Building image...${NC}"
gcloud builds submit \
  --project=$PROJECT_ID \
  --region=$REGION \
  --tag=$FULL_IMAGE \
  --timeout=10m \
  .

echo -e "${GREEN}✓${NC} Image built successfully!"
echo ""

# Restart deployment
echo -e "${YELLOW}⏳ Restarting deployment...${NC}"
kubectl rollout restart deployment/ulf-warden-agent -n agents

echo -e "${GREEN}✓${NC} Deployment restarted!"
echo ""

# Wait for rollout
echo -e "${YELLOW}⏳ Waiting for rollout...${NC}"
kubectl rollout status deployment/ulf-warden-agent -n agents --timeout=5m

echo ""
echo -e "${GREEN}✓${NC} Deployment complete!"
echo ""

# Show pod info
POD=$(kubectl get pods -n agents -l app.kubernetes.io/name=agent -o jsonpath='{.items[0].metadata.name}')
echo "New pod: $POD"
echo ""

# Verify security files
echo -e "${YELLOW}🔍 Verifying security files...${NC}"
kubectl exec $POD -n agents -- ls -la dist/security/ | grep -E "(sanitizer|vetter)" || echo -e "${RED}⚠️  Security files not found${NC}"
echo ""

echo -e "${GREEN}✓${NC} Build and deploy complete!"
echo ""
echo "Next steps:"
echo "  • View logs: kubectl logs -f $POD -n agents"
echo "  • Run tests: ./scripts/test-security.sh"
echo "  • Check security: kubectl logs $POD -n agents | grep -E '(Vetter|Sanitizer)'"
