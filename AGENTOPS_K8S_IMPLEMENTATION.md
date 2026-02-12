# AgentOps Kubernetes Deployment - Implementation Summary

## ✅ IMPLEMENTATION COMPLETE

Full Helm chart and deployment scripts for running AgentOps self-hosted on Kubernetes alongside OpenCell.

---

## 📦 What Was Implemented

### Helm Chart (`infra/helm/agentops/`)

#### 1. **Chart Definition** (`Chart.yaml`)
- Chart metadata and versioning
- Keywords and maintainers

#### 2. **Values Configuration** (`values.yaml`)
- Server configuration (backend API)
- Dashboard configuration (frontend UI)
- PostgreSQL configuration (optional)
- Ingress configuration (optional)
- Resource limits and requests
- Service types (LoadBalancer, NodePort, ClusterIP)
- Persistence configuration (PVC)

#### 3. **Kubernetes Manifests** (`templates/`)
- `server-deployment.yaml` - AgentOps server deployment
- `dashboard-deployment.yaml` - AgentOps dashboard deployment
- `services.yaml` - Services for both components
- `pvc.yaml` - Persistent volume claim
- `serviceaccount.yaml` - Service account
- `ingress.yaml` - Ingress (optional)
- `_helpers.tpl` - Helm template helpers

### Deployment Scripts

#### 4. **Deploy Script** (`scripts/deploy-agentops.sh`)
- Automated deployment to K8s
- Namespace creation
- Helm install/upgrade
- Service information display
- Next steps guidance

#### 5. **Configuration Script** (`scripts/configure-opencell-agentops.sh`)
- Configure OpenCell to use AgentOps
- Set environment variables
- Trigger deployment rollout
- Verification steps

### Documentation

#### 6. **Helm Chart README** (`infra/helm/agentops/README.md`)
- Quick start guide
- Configuration options
- Values reference
- Upgrade/uninstall instructions
- Troubleshooting

#### 7. **K8s Deployment Guide** (`docs/agentops-k8s-deployment.md`)
- Complete deployment walkthrough
- Step-by-step instructions
- Production configurations
- Best practices
- Troubleshooting guide

---

## 🚀 Quick Start

### 3 Commands to Deploy

```bash
# 1. Deploy AgentOps to Kubernetes
./scripts/deploy-agentops.sh opencell agentops

# 2. Configure OpenCell to use AgentOps
./scripts/configure-opencell-agentops.sh opencell ulf-warden agentops

# 3. Get dashboard URL
kubectl get svc agentops-dashboard -n opencell
```

### What Gets Deployed

```
┌─────────────────────────────────────┐
│         Kubernetes Cluster          │
│                                     │
│  Namespace: opencell                │
│  ┌───────────────────────────────┐ │
│  │  AgentOps Server              │ │
│  │  - Backend API (port 8080)    │ │
│  │  - ClusterIP service          │ │
│  │  - PVC for data (10Gi)        │ │
│  └─────────────┬─────────────────┘ │
│                │                     │
│                │ REST API            │
│                │                     │
│  ┌─────────────▼─────────────────┐ │
│  │  AgentOps Dashboard           │ │
│  │  - Web UI (port 3000)         │ │
│  │  - LoadBalancer service       │ │
│  │  - External access            │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  OpenCell (Ulf-Warden)        │ │
│  │  - AGENTOPS_ENABLED=true      │ │
│  │  - AGENTOPS_ENDPOINT=         │ │
│  │    server:8080                │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

---

## 📊 Features

### Helm Chart Features

- ✅ **Modular deployment** - Enable/disable components
- ✅ **Multiple service types** - LoadBalancer, NodePort, ClusterIP
- ✅ **Persistent storage** - PVC for data retention
- ✅ **Resource management** - CPU/memory requests and limits
- ✅ **Health checks** - Liveness and readiness probes
- ✅ **PostgreSQL support** - Optional database for production
- ✅ **Ingress support** - HTTPS with cert-manager
- ✅ **High availability** - Replica scaling
- ✅ **ConfigMap/Secrets** - Environment variable management

### Deployment Features

- ✅ **Automated scripts** - One-command deployment
- ✅ **Status checking** - Verify deployment success
- ✅ **Service discovery** - Automatic URL retrieval
- ✅ **OpenCell integration** - Automatic configuration
- ✅ **Rollout management** - Wait for deployment completion

---

## ⚙️ Configuration Options

### Basic (Dev/Test)

```bash
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --create-namespace
```

**Includes:**
- Server with SQLite
- Dashboard with LoadBalancer
- 10Gi PVC
- Default resources

### Production

```bash
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --set postgresql.enabled=true \
  --set postgresql.auth.password=secure-password \
  --set server.replicaCount=3 \
  --set dashboard.replicaCount=2 \
  --set server.persistence.size=50Gi
```

**Includes:**
- PostgreSQL database
- High availability (3 servers, 2 dashboards)
- 50Gi storage
- Increased resources

### With Ingress (HTTPS)

```bash
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=agentops.example.com \
  --set ingress.tls[0].secretName=agentops-tls
```

**Includes:**
- HTTPS access via Ingress
- TLS certificate (via cert-manager)
- Custom domain

---

## 📁 Files Created

```
infra/helm/agentops/
├── Chart.yaml                          # Helm chart definition
├── values.yaml                         # Default values
├── README.md                           # Chart documentation
└── templates/
    ├── _helpers.tpl                    # Template helpers
    ├── server-deployment.yaml          # Server deployment
    ├── dashboard-deployment.yaml       # Dashboard deployment
    ├── services.yaml                   # Services
    ├── pvc.yaml                        # Persistent volume claim
    ├── serviceaccount.yaml             # Service account
    └── ingress.yaml                    # Ingress (optional)

scripts/
├── deploy-agentops.sh                  # Deployment script
└── configure-opencell-agentops.sh      # Configuration script

docs/
└── agentops-k8s-deployment.md          # Complete guide

AGENTOPS_K8S_IMPLEMENTATION.md          # This file
```

**Total**: ~15 files, ~30 KB

---

## 🎯 Usage Examples

### Deploy to GKE

```bash
# Configure kubectl for GKE
gcloud container clusters get-credentials my-cluster \
  --region us-central1 \
  --project my-project

# Deploy
./scripts/deploy-agentops.sh opencell agentops

# Configure OpenCell
./scripts/configure-opencell-agentops.sh opencell ulf-warden agentops

# Get LoadBalancer IP
export DASHBOARD_IP=$(kubectl get svc agentops-dashboard -n opencell \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Open dashboard
open "http://$DASHBOARD_IP:3000"
```

### Deploy to EKS

```bash
# Configure kubectl for EKS
aws eks update-kubeconfig \
  --region us-east-1 \
  --name my-cluster

# Deploy (same commands as GKE)
./scripts/deploy-agentops.sh opencell agentops
./scripts/configure-opencell-agentops.sh opencell ulf-warden agentops
```

### Deploy to AKS

```bash
# Configure kubectl for AKS
az aks get-credentials \
  --resource-group my-rg \
  --name my-cluster

# Deploy (same commands)
./scripts/deploy-agentops.sh opencell agentops
./scripts/configure-opencell-agentops.sh opencell ulf-warden agentops
```

### Local Development (Minikube/Kind)

```bash
# Start Minikube
minikube start

# Deploy with NodePort
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --create-namespace \
  --set dashboard.service.type=NodePort

# Get URL
minikube service agentops-dashboard -n opencell --url

# Or port forward
kubectl port-forward svc/agentops-dashboard -n opencell 3000:3000
```

---

## 🔧 Management

### View Resources

```bash
# All AgentOps resources
kubectl get all -n opencell -l app.kubernetes.io/name=agentops

# Pods
kubectl get pods -n opencell -l app.kubernetes.io/name=agentops

# Services
kubectl get svc -n opencell -l app.kubernetes.io/name=agentops

# PVC
kubectl get pvc -n opencell -l app.kubernetes.io/name=agentops
```

### Scale

```bash
# Scale server
kubectl scale deployment agentops-server -n opencell --replicas=3

# Scale dashboard
kubectl scale deployment agentops-dashboard -n opencell --replicas=2

# Or via Helm
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --set server.replicaCount=3 \
  --set dashboard.replicaCount=2
```

### Update

```bash
# Update chart
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell

# With new values
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --values new-values.yaml
```

### Logs

```bash
# Server logs
kubectl logs -n opencell -l app.kubernetes.io/component=server -f

# Dashboard logs
kubectl logs -n opencell -l app.kubernetes.io/component=dashboard -f

# All logs
kubectl logs -n opencell -l app.kubernetes.io/name=agentops -f
```

### Cleanup

```bash
# Remove AgentOps
helm uninstall agentops --namespace opencell

# Remove PVC
kubectl delete pvc -n opencell -l app.kubernetes.io/name=agentops

# Remove namespace (if empty)
kubectl delete namespace opencell
```

---

## 📊 Resource Requirements

### Minimum (Dev/Test)

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| Server | 100m | 256Mi | 10Gi |
| Dashboard | 50m | 128Mi | - |
| **Total** | **150m** | **384Mi** | **10Gi** |

### Recommended (Production)

| Component | CPU | Memory | Storage |
|-----------|-----|--------|---------|
| Server (x3) | 500m | 1Gi | 50Gi |
| Dashboard (x2) | 200m | 512Mi | - |
| PostgreSQL | 500m | 1Gi | 100Gi |
| **Total** | **2.4 CPU** | **5Gi** | **150Gi** |

---

## 🐛 Troubleshooting

### Pods not starting

```bash
kubectl describe pod -n opencell -l app.kubernetes.io/name=agentops
# Check Events section for errors
```

### Service not accessible

```bash
# Check service
kubectl get svc agentops-dashboard -n opencell

# Port forward for testing
kubectl port-forward svc/agentops-dashboard -n opencell 3000:3000
```

### PVC not binding

```bash
# Check PVC status
kubectl get pvc -n opencell

# Check storage class
kubectl get storageclass
```

### Integration not working

```bash
# Check OpenCell env vars
kubectl get deploy ulf-warden -n opencell -o yaml | grep AGENTOPS

# Check connectivity
kubectl exec -it -n opencell deployment/ulf-warden -- \
  curl http://agentops-server:8080/health
```

---

## ✅ Verification Checklist

- [ ] AgentOps pods running
- [ ] Services accessible
- [ ] PVC bound
- [ ] Dashboard reachable
- [ ] OpenCell configured
- [ ] Events appearing in dashboard
- [ ] Sessions tracked
- [ ] Costs calculated

---

## 🎉 Summary

**Kubernetes deployment provides:**
- ✅ **Self-hosted** - Full control over data
- ✅ **Scalable** - Replicas for high availability
- ✅ **Persistent** - Data retention with PVC
- ✅ **Secure** - Internal ClusterIP for server
- ✅ **Accessible** - LoadBalancer/Ingress for dashboard
- ✅ **Automated** - One-command deployment
- ✅ **Production-ready** - Resource limits, health checks
- ✅ **Flexible** - Multiple configuration options

**Deploy AgentOps on K8s in 3 commands!** 🚀

---

**Implementation Date**: February 11, 2026  
**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Tested On**: GKE (should work on any K8s)  
**Files**: 15 new files  
**Lines of Code**: ~600 (YAML) + ~300 (scripts)
