# 🔧 GitHub Workflows Setup

Este repositório não inclui workflows do GitHub Actions por questões de permissões OAuth. Este guia explica como criar os workflows manualmente se você precisar deles.

## 📋 Por que os workflows não estão incluídos?

Os workflows foram removidos do repositório porque:
- ❌ GitHub bloqueia modificações em `.github/workflows/` sem o scope OAuth `workflow`
- ✅ Evita problemas de permissão em repositórios com branch protection rules
- ✅ Permite que cada time configure seus próprios pipelines de deploy

## 🚀 Workflows Disponíveis

### 1. GKE Deploy Workflow
**Arquivo**: `.github/workflows/gke-deploy.yml`
**Função**: Deploy automatizado para Google Kubernetes Engine (GKE)

**Quando usar:**
- Deploy em produção no GKE
- Integração contínua com Google Cloud
- Necessita de service account GCP configurado

### 2. Security Audit Workflow
**Arquivo**: `.github/workflows/security-audit.yml`
**Função**: Auditoria de segurança automatizada (gitleaks)

**Quando usar:**
- Escanear commits em busca de chaves expostas
- Pre-commit checks em PRs
- Compliance de segurança

## 📦 Como Criar os Workflows

### Opção 1: Via Interface Web do GitHub (Recomendado)

1. Vá até o repositório no GitHub
2. Navegue para `.github/workflows/`
3. Clique em **"Add file" → "Create new file"**
4. Nomeie o arquivo: `gke-deploy.yml` ou `security-audit.yml`
5. Cole o conteúdo abaixo
6. Commit com mensagem: `ci: add [nome] workflow`

### Opção 2: Via Git Local

```bash
# 1. Criar diretório (se não existir)
mkdir -p .github/workflows

# 2. Remover do .gitignore temporariamente
# Comente a linha ".github/workflows/" no .gitignore

# 3. Criar arquivo
cat > .github/workflows/gke-deploy.yml << 'EOF'
# Cole o conteúdo aqui
EOF

# 4. Commit e push
git add .github/workflows/gke-deploy.yml
git commit -m "ci: add GKE deploy workflow"
git push
```

## 📄 Conteúdo dos Workflows

### gke-deploy.yml

```yaml
name: Deploy to GKE

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GKE_CLUSTER: opencell-cluster
  GKE_ZONE: us-central1-a
  DEPLOYMENT_NAME: ulfberht-agent

jobs:
  deploy:
    name: Deploy to GKE
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Authenticate to Google Cloud
      uses: google-github-actions/auth@v2
      with:
        credentials_json: ${{ secrets.GCP_SA_KEY }}

    - name: Set up Cloud SDK
      uses: google-github-actions/setup-gcloud@v2

    - name: Configure Docker
      run: |
        gcloud auth configure-docker

    - name: Get GKE credentials
      run: |
        gcloud container clusters get-credentials $GKE_CLUSTER \
          --zone $GKE_ZONE \
          --project $PROJECT_ID

    - name: Build Docker image
      run: |
        docker build -t gcr.io/$PROJECT_ID/ulfberht-agent:$GITHUB_SHA .

    - name: Push to GCR
      run: |
        docker push gcr.io/$PROJECT_ID/ulfberht-agent:$GITHUB_SHA

    - name: Deploy to GKE
      run: |
        kubectl set image deployment/$DEPLOYMENT_NAME \
          ulfberht-agent=gcr.io/$PROJECT_ID/ulfberht-agent:$GITHUB_SHA \
          --namespace=agents

    - name: Verify deployment
      run: |
        kubectl rollout status deployment/$DEPLOYMENT_NAME \
          --namespace=agents \
          --timeout=5m
```

### security-audit.yml

```yaml
name: Security Audit

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  gitleaks:
    name: Scan for secrets
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v4
      with:
        fetch-depth: 0

    - name: Run Gitleaks
      uses: gitleaks/gitleaks-action@v2
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        GITLEAKS_LICENSE: ${{ secrets.GITLEAKS_LICENSE }}

    - name: Upload results
      if: failure()
      uses: actions/upload-artifact@v3
      with:
        name: gitleaks-report
        path: gitleaks-report.json

  auditor:
    name: Run security auditor
    runs-on: ubuntu-latest

    steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'

    - name: Install dependencies
      working-directory: auditor
      run: |
        pip install -r requirements.txt

    - name: Run auditor
      working-directory: auditor
      run: |
        python src/main.py --path .. --once

    - name: Check results
      run: |
        if [ $? -eq 2 ]; then
          echo "❌ CRITICAL violations found"
          exit 1
        elif [ $? -eq 1 ]; then
          echo "⚠️  HIGH violations found"
          exit 1
        else
          echo "✅ No critical violations"
        fi
```

## 🔐 Secrets Necessários

Configure estes secrets no GitHub (Settings → Secrets and variables → Actions):

### Para GKE Deploy:
```bash
GCP_PROJECT_ID       # ID do projeto GCP
GCP_SA_KEY          # JSON da service account GCP
```

### Para Security Audit:
```bash
GITLEAKS_LICENSE    # (Opcional) Licença do Gitleaks Pro
```

## ⚙️ Configuração

### 1. Criar Service Account GCP

```bash
# Criar service account
gcloud iam service-accounts create github-actions \
    --display-name="GitHub Actions Deploy"

# Dar permissões
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:github-actions@$PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/container.developer"

# Criar chave
gcloud iam service-accounts keys create key.json \
    --iam-account=github-actions@$PROJECT_ID.iam.gserviceaccount.com
```

### 2. Adicionar Secrets no GitHub

```bash
# Via GitHub CLI
gh secret set GCP_PROJECT_ID --body "your-project-id"
gh secret set GCP_SA_KEY < key.json

# Remover chave local
rm key.json
```

### 3. Testar Workflow

```bash
# Trigger manual
gh workflow run "Deploy to GKE"

# Verificar status
gh run list --workflow="Deploy to GKE"
```

## 🚨 Importante

- ⚠️ **Nunca commite** `key.json` ou credenciais no repositório
- ✅ Sempre use GitHub Secrets para informações sensíveis
- ✅ Teste workflows em branch separada primeiro
- ✅ Configure branch protection rules para main/develop

## 📚 Referências

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Google Cloud GitHub Actions](https://github.com/google-github-actions)
- [Gitleaks Action](https://github.com/gitleaks/gitleaks-action)

## 🤝 Dúvidas?

Se você não precisa de CI/CD automatizado, pode ignorar este guia completamente. Os workflows são opcionais e o projeto funciona perfeitamente sem eles.

---

**Última atualização**: 2026-02-02
