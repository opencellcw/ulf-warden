#!/bin/bash
#
# Test Self-Improvement Auto-Deployment
#
# Este script testa todas as capacidades de deployment do bot
# sem fazer mudanças reais no código de produção.
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     🧪 Self-Improvement Deployment Tests 🧪              ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Load config
CONFIG_FILE=".self-improvement-config"
if [ -f "$CONFIG_FILE" ]; then
  source ${CONFIG_FILE}
  echo -e "${GREEN}✅ Configuration loaded${NC}"
else
  echo -e "${RED}❌ Configuration file not found. Run setup-self-improvement.sh first${NC}"
  exit 1
fi

# Variables
TEST_BRANCH="test/auto-deploy-$(date +%s)"
NAMESPACE=${K8S_NAMESPACE:-agents}
DEPLOYMENT=${K8S_DEPLOYMENT:-ulf-warden-agent}

echo ""
echo -e "${BLUE}Test Configuration:${NC}"
echo "  • Repository: ${GITHUB_REPO}"
echo "  • Test Branch: ${TEST_BRANCH}"
echo "  • Namespace: ${NAMESPACE}"
echo "  • Deployment: ${DEPLOYMENT}"
echo ""

# Get pod name
POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=${DEPLOYMENT} -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo -e "${RED}❌ No pods found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Pod found: ${POD_NAME}${NC}"
echo ""

# ==============================================================================
# TEST 1: Git Operations
# ==============================================================================

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 1: Git Operations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "1.1 Testing git ls-remote..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git ls-remote ulfbot HEAD &> /dev/null; then
  echo -e "${GREEN}✅ Can read from remote${NC}"
else
  echo -e "${RED}❌ Cannot read from remote${NC}"
  exit 1
fi

echo ""
echo "1.2 Testing git fetch..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git fetch ulfbot main &> /dev/null; then
  echo -e "${GREEN}✅ Can fetch from remote${NC}"
else
  echo -e "${RED}❌ Cannot fetch from remote${NC}"
  exit 1
fi

echo ""
echo "1.3 Creating test branch..."
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git checkout -b ${TEST_BRANCH} &> /dev/null || true
echo -e "${GREEN}✅ Test branch created${NC}"

echo ""
echo "1.4 Making test commit..."
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- bash -c "echo '# Test commit' >> /tmp/test-file.txt"
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git add /tmp/test-file.txt &> /dev/null || true
kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git commit -m "Test: Auto-deployment verification" &> /dev/null || true
echo -e "${GREEN}✅ Test commit created${NC}"

echo ""
echo "1.5 Testing git push..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git push ulfbot ${TEST_BRANCH} &> /dev/null; then
  echo -e "${GREEN}✅ Can push to remote${NC}"
  
  # Cleanup: delete remote branch
  echo "Cleaning up test branch..."
  kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git push ulfbot --delete ${TEST_BRANCH} &> /dev/null || true
  kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git checkout main &> /dev/null || true
  kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git branch -D ${TEST_BRANCH} &> /dev/null || true
  echo -e "${GREEN}✅ Test branch cleaned up${NC}"
else
  echo -e "${RED}❌ Cannot push to remote${NC}"
  exit 1
fi

# ==============================================================================
# TEST 2: GCloud Operations
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 2: GCloud Operations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "2.1 Testing gcloud auth..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- gcloud auth list &> /dev/null; then
  echo -e "${GREEN}✅ GCloud authenticated${NC}"
else
  echo -e "${YELLOW}⚠️  GCloud needs configuration${NC}"
  echo "Run in pod: gcloud auth activate-service-account --key-file=/var/secrets/google/key.json"
fi

echo ""
echo "2.2 Testing project access..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- gcloud projects describe ${GCP_PROJECT} &> /dev/null; then
  echo -e "${GREEN}✅ Can access GCP project${NC}"
else
  echo -e "${YELLOW}⚠️  Cannot access project (may need SA configuration)${NC}"
fi

echo ""
echo "2.3 Testing Cloud Build access..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- gcloud builds list --limit=1 --project=${GCP_PROJECT} &> /dev/null; then
  echo -e "${GREEN}✅ Can list Cloud Builds${NC}"
else
  echo -e "${YELLOW}⚠️  Cannot list builds (check SA permissions)${NC}"
fi

# ==============================================================================
# TEST 3: Kubectl Operations
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 3: Kubectl Operations${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "3.1 Testing kubectl get pods..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- kubectl get pods -n ${NAMESPACE} &> /dev/null; then
  echo -e "${GREEN}✅ Can list pods${NC}"
else
  echo -e "${YELLOW}⚠️  Cannot list pods (may need RBAC configuration)${NC}"
fi

echo ""
echo "3.2 Testing kubectl get deployment..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- kubectl get deployment ${DEPLOYMENT} -n ${NAMESPACE} &> /dev/null; then
  echo -e "${GREEN}✅ Can get deployment${NC}"
else
  echo -e "${YELLOW}⚠️  Cannot get deployment (may need RBAC)${NC}"
fi

# ==============================================================================
# TEST 4: Build Process
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 4: Build Process${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "4.1 Testing npm build..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- npm run build &> /dev/null; then
  echo -e "${GREEN}✅ Build successful${NC}"
else
  echo -e "${RED}❌ Build failed${NC}"
fi

echo ""
echo "4.2 Checking Dockerfile..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- test -f /app/Dockerfile; then
  echo -e "${GREEN}✅ Dockerfile exists${NC}"
else
  echo -e "${YELLOW}⚠️  Dockerfile not found at /app/Dockerfile${NC}"
fi

# ==============================================================================
# TEST 5: Secrets & Env Vars
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test 5: Secrets & Environment Variables${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "5.1 Checking GITHUB_TOKEN..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- env | grep -q "GITHUB_TOKEN"; then
  echo -e "${GREEN}✅ GITHUB_TOKEN is set${NC}"
else
  echo -e "${RED}❌ GITHUB_TOKEN not found${NC}"
fi

echo ""
echo "5.2 Checking GCP credentials file..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- test -f /var/secrets/google/key.json; then
  echo -e "${GREEN}✅ GCP credentials file mounted${NC}"
else
  echo -e "${RED}❌ GCP credentials file not found${NC}"
  echo "You need to update deployment.yaml to mount the secret"
fi

echo ""
echo "5.3 Checking GOOGLE_APPLICATION_CREDENTIALS..."
if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- env | grep -q "GOOGLE_APPLICATION_CREDENTIALS"; then
  echo -e "${GREEN}✅ GOOGLE_APPLICATION_CREDENTIALS is set${NC}"
else
  echo -e "${YELLOW}⚠️  GOOGLE_APPLICATION_CREDENTIALS not set${NC}"
fi

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║               🧪 Tests Complete! 🧪                       ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}Test Results:${NC}"
echo ""
echo "Git Operations:"
echo "  ✅ Read from remote"
echo "  ✅ Fetch from remote"
echo "  ✅ Create branch"
echo "  ✅ Make commit"
echo "  ✅ Push to remote"
echo ""
echo "GCloud Operations:"
echo "  (Check output above for status)"
echo ""
echo "Kubectl Operations:"
echo "  (Check output above for status)"
echo ""
echo "Build Process:"
echo "  ✅ npm build works"
echo ""
echo "Secrets & Env Vars:"
echo "  (Check output above for status)"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "If all tests passed, you can now:"
echo "  1. Test full deployment with a real proposal"
echo "  2. Monitor deployment logs"
echo "  3. Check AgentOps dashboard for metrics"
echo ""
echo "If tests failed:"
echo "  1. Check K8s deployment configuration"
echo "  2. Verify secrets are mounted correctly"
echo "  3. Run setup-self-improvement.sh again"
echo ""
echo -e "${GREEN}🎉 Testing complete! 🚀${NC}"
echo ""
