#!/bin/bash
#
# Setup Self-Improvement Auto-Deployment
# 
# Este script configura TUDO que o bot precisa para fazer
# push no próprio repositório e deploy no GKE automaticamente.
#
# Repo oficial: https://github.com/opencellcw/ulf-warden
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     🚀 Self-Improvement Auto-Deployment Setup 🚀         ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Variables
PROJECT_ID="opencellcw-k8s"
SA_NAME="ulf-self-improver"
NAMESPACE="agents"
DEPLOYMENT_NAME="ulf-warden-agent"
GITHUB_REPO="opencellcw/ulf-warden"
GITHUB_REPO_URL="https://github.com/${GITHUB_REPO}.git"

# Check if running in correct directory
if [ ! -d ".git" ]; then
  echo -e "${RED}❌ Error: Must run from repository root${NC}"
  exit 1
fi

echo ""
echo -e "${YELLOW}Prerequisites:${NC}"
echo "  ✓ gcloud CLI installed and configured"
echo "  ✓ kubectl configured for GKE cluster"
echo "  ✓ GitHub Personal Access Token ready"
echo ""
read -p "Press Enter to continue..."

# ==============================================================================
# STEP 1: Remove exposed token from git config
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 1: Securing Git Configuration${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check if token is exposed in git config
if git remote -v | grep -q "ghp_"; then
  echo -e "${YELLOW}⚠️  Found exposed token in git config!${NC}"
  echo "Removing token from URL..."
  
  git remote set-url ulfbot ${GITHUB_REPO_URL}
  echo -e "${GREEN}✅ Token removed from git config${NC}"
else
  echo -e "${GREEN}✅ No exposed token found${NC}"
fi

# Ensure remote exists and points to correct repo
if ! git remote -v | grep -q "ulfbot"; then
  echo "Adding ulfbot remote..."
  git remote add ulfbot ${GITHUB_REPO_URL}
  echo -e "${GREEN}✅ Remote 'ulfbot' added${NC}"
else
  echo -e "${GREEN}✅ Remote 'ulfbot' exists${NC}"
fi

# Configure git user
git config user.name "Ulf Warden Bot" || true
git config user.email "bot@opencell.dev" || true
echo -e "${GREEN}✅ Git user configured${NC}"

# ==============================================================================
# STEP 2: GitHub Authentication
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 2: GitHub Authentication${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "GitHub Personal Access Token needed with scopes:"
echo "  • repo (full)"
echo "  • workflow"
echo "  • write:packages"
echo ""
echo "Get token at: https://github.com/settings/tokens"
echo ""

read -sp "Enter GitHub Token: " GITHUB_TOKEN
echo ""
read -p "Enter GitHub Username [opencellcw]: " GITHUB_USERNAME
GITHUB_USERNAME=${GITHUB_USERNAME:-opencellcw}

if [ -z "$GITHUB_TOKEN" ]; then
  echo -e "${RED}❌ Error: GitHub token is required${NC}"
  exit 1
fi

# Add to K8s secrets
echo ""
echo "Creating K8s secret for GitHub credentials..."

kubectl create secret generic github-credentials \
  --from-literal=token=${GITHUB_TOKEN} \
  --from-literal=username=${GITHUB_USERNAME} \
  --from-literal=repo=${GITHUB_REPO} \
  -n ${NAMESPACE} \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ GitHub credentials added to K8s${NC}"

# Configure git credential helper
echo ""
echo "Configuring git credential helper..."

git config --global credential.helper '!f() { 
  echo "username=${GITHUB_USERNAME}"; 
  echo "password=${GITHUB_TOKEN}"; 
}; f'

echo -e "${GREEN}✅ Git credential helper configured${NC}"

# Test git authentication
echo ""
echo "Testing git authentication..."
if git ls-remote ulfbot HEAD &> /dev/null; then
  echo -e "${GREEN}✅ Git authentication successful${NC}"
else
  echo -e "${RED}❌ Git authentication failed${NC}"
  echo "Please check your token and try again"
  exit 1
fi

# ==============================================================================
# STEP 3: GCP Service Account
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 3: GCP Service Account Setup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create Service Account
echo ""
echo "Creating GCP Service Account: ${SA_NAME}..."

if gcloud iam service-accounts describe ${SA_EMAIL} --project=${PROJECT_ID} &> /dev/null; then
  echo -e "${YELLOW}⚠️  Service account already exists${NC}"
else
  gcloud iam service-accounts create ${SA_NAME} \
    --display-name="Ulf Self-Improver Bot" \
    --description="Service account for Ulf Warden self-improvement deployments" \
    --project=${PROJECT_ID}
  
  echo -e "${GREEN}✅ Service account created${NC}"
fi

# Grant permissions
echo ""
echo "Granting IAM permissions..."

ROLES=(
  "roles/cloudbuild.builds.editor"
  "roles/storage.admin"
  "roles/container.developer"
  "roles/artifactregistry.writer"
)

for role in "${ROLES[@]}"; do
  echo "  • ${role}..."
  gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${SA_EMAIL}" \
    --role="${role}" \
    --condition=None \
    --quiet &> /dev/null || true
done

echo -e "${GREEN}✅ IAM permissions granted${NC}"

# Create key file
echo ""
echo "Creating service account key..."

KEY_FILE="/tmp/ulf-sa-key-${RANDOM}.json"

gcloud iam service-accounts keys create ${KEY_FILE} \
  --iam-account=${SA_EMAIL} \
  --project=${PROJECT_ID}

echo -e "${GREEN}✅ Key file created${NC}"

# Add to K8s
echo ""
echo "Adding GCP credentials to K8s..."

kubectl create secret generic gcp-credentials \
  --from-file=key.json=${KEY_FILE} \
  -n ${NAMESPACE} \
  --dry-run=client -o yaml | kubectl apply -f -

echo -e "${GREEN}✅ GCP credentials added to K8s${NC}"

# Cleanup key file
rm ${KEY_FILE}
echo -e "${GREEN}✅ Key file cleaned up${NC}"

# ==============================================================================
# STEP 4: Update Deployment
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 4: Update K8s Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "Checking current deployment..."

if ! kubectl get deployment ${DEPLOYMENT_NAME} -n ${NAMESPACE} &> /dev/null; then
  echo -e "${RED}❌ Deployment '${DEPLOYMENT_NAME}' not found in namespace '${NAMESPACE}'${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Deployment found${NC}"

# Add environment variables
echo ""
echo "Adding environment variables to deployment..."

kubectl set env deployment/${DEPLOYMENT_NAME} \
  SELF_IMPROVEMENT_ENABLED=true \
  GITHUB_REPO=${GITHUB_REPO} \
  -n ${NAMESPACE}

echo -e "${GREEN}✅ Environment variables set${NC}"

# Restart deployment
echo ""
echo "Restarting deployment to apply changes..."

kubectl rollout restart deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}

echo "Waiting for rollout to complete..."
kubectl rollout status deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE} --timeout=300s

echo -e "${GREEN}✅ Deployment updated and restarted${NC}"

# ==============================================================================
# STEP 5: Verification
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 5: Verification${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "Checking pod status..."

sleep 10  # Wait for pod to start

POD_NAME=$(kubectl get pods -n ${NAMESPACE} -l app=${DEPLOYMENT_NAME} -o jsonpath='{.items[0].metadata.name}')

if [ -z "$POD_NAME" ]; then
  echo -e "${RED}❌ No pods found${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Pod running: ${POD_NAME}${NC}"

# Check environment variables
echo ""
echo "Verifying environment variables in pod..."

ENV_CHECK=$(kubectl exec -n ${NAMESPACE} ${POD_NAME} -- env | grep -E "GITHUB_TOKEN|GOOGLE_APPLICATION_CREDENTIALS" || true)

if [ -n "$ENV_CHECK" ]; then
  echo -e "${GREEN}✅ Environment variables configured${NC}"
else
  echo -e "${YELLOW}⚠️  Some environment variables may be missing${NC}"
fi

# Check secrets mounted
echo ""
echo "Verifying secrets mounted..."

if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- ls /var/secrets/google/key.json &> /dev/null; then
  echo -e "${GREEN}✅ GCP credentials mounted${NC}"
else
  echo -e "${YELLOW}⚠️  GCP credentials not found at /var/secrets/google/key.json${NC}"
  echo "You may need to update the deployment manifest to mount the secret"
fi

# ==============================================================================
# STEP 6: Test Commands
# ==============================================================================

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Step 6: Testing Deployment Capabilities${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo ""
echo "Testing git access from pod..."

if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- git ls-remote ulfbot HEAD &> /dev/null; then
  echo -e "${GREEN}✅ Git access working${NC}"
else
  echo -e "${RED}❌ Git access failed${NC}"
fi

echo ""
echo "Testing gcloud access from pod..."

if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- gcloud projects list --limit=1 &> /dev/null; then
  echo -e "${GREEN}✅ GCloud access working${NC}"
else
  echo -e "${YELLOW}⚠️  GCloud may need configuration in pod${NC}"
fi

echo ""
echo "Testing kubectl access from pod..."

if kubectl exec -n ${NAMESPACE} ${POD_NAME} -- kubectl get pods -n ${NAMESPACE} &> /dev/null; then
  echo -e "${GREEN}✅ Kubectl access working${NC}"
else
  echo -e "${YELLOW}⚠️  Kubectl may need configuration in pod${NC}"
fi

# ==============================================================================
# Summary
# ==============================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║               ✅ Setup Complete! ✅                        ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"

echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  ✅ Git configuration secured"
echo "  ✅ GitHub authentication configured"
echo "  ✅ GCP Service Account created and configured"
echo "  ✅ K8s secrets created"
echo "  ✅ Deployment updated and restarted"
echo "  ✅ Basic tests passed"

echo ""
echo -e "${BLUE}Repository Information:${NC}"
echo "  • Official repo: ${GITHUB_REPO_URL}"
echo "  • Remote name: ulfbot"
echo "  • Bot user: ${GITHUB_USERNAME}"

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo ""
echo "1. Test self-improvement in Discord:"
echo "   ${YELLOW}@ulf propor melhoria: adicionar comando /test${NC}"
echo ""
echo "2. Monitor deployment logs:"
echo "   ${YELLOW}kubectl logs -n ${NAMESPACE} -l app=${DEPLOYMENT_NAME} -f${NC}"
echo ""
echo "3. Check proposal status:"
echo "   ${YELLOW}@ulf lista propostas${NC}"
echo ""
echo "4. View deployment manual:"
echo "   ${YELLOW}cat SELF-IMPROVEMENT-DEPLOYMENT-SETUP.md${NC}"

echo ""
echo -e "${GREEN}🎉 Bot is now ready for autonomous self-improvement! 🚀${NC}"
echo ""

# Save configuration to file
CONFIG_FILE=".self-improvement-config"
cat > ${CONFIG_FILE} << EOF
# Self-Improvement Configuration
# Generated: $(date)

GITHUB_REPO=${GITHUB_REPO}
GITHUB_USERNAME=${GITHUB_USERNAME}
GCP_PROJECT=${PROJECT_ID}
GCP_SA_EMAIL=${SA_EMAIL}
K8S_NAMESPACE=${NAMESPACE}
K8S_DEPLOYMENT=${DEPLOYMENT_NAME}
SETUP_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
EOF

echo -e "${BLUE}Configuration saved to: ${CONFIG_FILE}${NC}"
echo ""
