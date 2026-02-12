# AgentOps Kubernetes Deployment Guide

Complete guide for deploying AgentOps observability platform alongside OpenCell in Kubernetes.

## 🎯 Overview

This guide covers deploying AgentOps self-hosted on your Kubernetes cluster (GKE, EKS, AKS, or any K8s) alongside OpenCell.

**What you'll deploy:**
- AgentOps Server (Backend API)
- AgentOps Dashboard (Web UI)
- Persistent storage (PVC)
- LoadBalancer/Ingress for external access

**Benefits:**
- 📊 Full observability of OpenCell bots
- 💰 Cost tracking per bot/user/platform
- 🐛 Debug sessions with timeline view
- 📈 Performance analytics
- 🔒 Self-hosted (full data control)

---

## 📋 Prerequisites

- Kubernetes cluster running (GKE, EKS, AKS, etc.)
- `kubectl` configured to access your cluster
- `helm` v3 installed
- OpenCell already deployed (or deploying together)

---

## 🚀 Quick Deploy (3 Commands)

```bash
# 1. Deploy AgentOps
./scripts/deploy-agentops.sh opencell agentops

# 2. Configure OpenCell to use AgentOps
./scripts/configure-opencell-agentops.sh opencell ulf-warden agentops

# 3. Get dashboard URL
kubectl get svc agentops-dashboard -n opencell

# Done! Open the URL and see your bots! 🎉
```

---

## 📖 Detailed Deployment

### Step 1: Deploy AgentOps

#### Option A: Using provided script (Recommended)

```bash
./scripts/deploy-agentops.sh opencell agentops
```

This script:
- Creates namespace if needed
- Installs Helm chart
- Shows service URLs
- Provides next steps

#### Option B: Manual Helm install

```bash
# Install with default values
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --create-namespace \
  --wait

# Or with custom values
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --values ./my-custom-values.yaml
```

### Step 2: Verify Deployment

```bash
# Check pods
kubectl get pods -n opencell -l app.kubernetes.io/name=agentops

# Should see:
# agentops-server-xxx      1/1     Running
# agentops-dashboard-xxx   1/1     Running

# Check services
kubectl get svc -n opencell | grep agentops

# Should see:
# agentops-server     ClusterIP      10.x.x.x    8080/TCP
# agentops-dashboard  LoadBalancer   10.x.x.x    3000/TCP
```

### Step 3: Access Dashboard

#### If using LoadBalancer (default):

```bash
# Get external IP
export DASHBOARD_IP=$(kubectl get svc agentops-dashboard -n opencell \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

# Open dashboard
echo "Dashboard: http://$DASHBOARD_IP:3000"
open "http://$DASHBOARD_IP:3000"  # macOS
# or
xdg-open "http://$DASHBOARD_IP:3000"  # Linux
```

#### If using NodePort:

```bash
# Get node IP and port
export NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
export NODE_PORT=$(kubectl get svc agentops-dashboard -n opencell \
  -o jsonpath='{.spec.ports[0].nodePort}')

# Open dashboard
echo "Dashboard: http://$NODE_IP:$NODE_PORT"
```

#### If using ClusterIP (internal only):

```bash
# Port forward to localhost
kubectl port-forward svc/agentops-dashboard -n opencell 3000:3000

# Open browser
open http://localhost:3000
```

### Step 4: Configure OpenCell

Update OpenCell deployment to send events to AgentOps:

#### Option A: Using provided script (Recommended)

```bash
./scripts/configure-opencell-agentops.sh opencell ulf-warden agentops
```

#### Option B: Manual kubectl

```bash
kubectl set env deployment/ulf-warden -n opencell \
  AGENTOPS_ENABLED=true \
  AGENTOPS_ENDPOINT=http://agentops-server:8080 \
  AGENTOPS_TAGS=opencell,production

# Wait for rollout
kubectl rollout status deployment/ulf-warden -n opencell
```

#### Option C: Via Helm (if using OpenCell Helm chart)

Edit `values.yaml`:

```yaml
env:
  AGENTOPS_ENABLED: "true"
  AGENTOPS_ENDPOINT: "http://agentops-server:8080"
  AGENTOPS_TAGS: "opencell,production"
```

Apply:

```bash
helm upgrade ulf-warden ./infra/helm/opencell \
  --namespace opencell \
  --values values.yaml
```

### Step 5: Verify Integration

```bash
# Check OpenCell logs
kubectl logs -n opencell deployment/ulf-warden -f | grep AgentOps

# Should see:
# [AgentOps] Initialized successfully
# [AgentOps] Session started { sessionId: ... }
```

### Step 6: Use and Monitor

1. **Interact with any OpenCell bot** (Discord, Slack, etc.)
2. **Open AgentOps dashboard**
3. **See the session in real-time!** 🎉

---

## ⚙️ Configuration Options

### Production Setup (PostgreSQL)

For production, use PostgreSQL instead of SQLite:

```bash
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --set postgresql.enabled=true \
  --set postgresql.auth.password=secure-password-here \
  --set server.env.DATABASE_URL="postgresql://agentops:secure-password-here@agentops-postgresql:5432/agentops" \
  --set server.persistence.enabled=false
```

### High Availability

Scale both components:

```bash
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --set server.replicaCount=3 \
  --set dashboard.replicaCount=2
```

### Resource Limits

Adjust resources for your workload:

```yaml
# custom-values.yaml
server:
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 4Gi

dashboard:
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
    limits:
      cpu: 1000m
      memory: 1Gi
```

```bash
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --values custom-values.yaml
```

### Ingress (HTTPS)

Expose via Ingress with TLS:

```yaml
# ingress-values.yaml
ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: agentops.example.com
      paths:
        - path: /
          pathType: Prefix
          backend: dashboard
        - path: /api
          pathType: Prefix
          backend: server
  tls:
    - secretName: agentops-tls
      hosts:
        - agentops.example.com
```

```bash
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --values ingress-values.yaml
```

Access: `https://agentops.example.com`

---

## 🔧 Management

### Upgrade

```bash
# Upgrade to new version
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell

# With new values
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --set server.replicaCount=2
```

### Restart

```bash
# Restart server
kubectl rollout restart deployment/agentops-server -n opencell

# Restart dashboard
kubectl rollout restart deployment/agentops-dashboard -n opencell
```

### View Logs

```bash
# Server logs (real-time)
kubectl logs -n opencell -l app.kubernetes.io/component=server -f

# Dashboard logs
kubectl logs -n opencell -l app.kubernetes.io/component=dashboard -f

# Last 100 lines
kubectl logs -n opencell -l app.kubernetes.io/name=agentops --tail=100
```

### Check Status

```bash
# Pods
kubectl get pods -n opencell -l app.kubernetes.io/name=agentops

# Services
kubectl get svc -n opencell -l app.kubernetes.io/name=agentops

# PVC (storage)
kubectl get pvc -n opencell -l app.kubernetes.io/name=agentops

# Describe for details
kubectl describe deployment agentops-server -n opencell
```

### Uninstall

```bash
# Remove AgentOps (keeps PVC)
helm uninstall agentops --namespace opencell

# Remove PVC too
kubectl delete pvc -n opencell -l app.kubernetes.io/name=agentops
```

---

## 🐛 Troubleshooting

### Pods not starting

```bash
# Check pod events
kubectl describe pod -n opencell -l app.kubernetes.io/name=agentops

# Common issues:
# - Image pull errors -> Check image exists
# - Insufficient resources -> Reduce requests/limits
# - PVC not binding -> Check storage class
```

### Dashboard can't connect to server

```bash
# Check dashboard env
kubectl get deploy agentops-dashboard -n opencell -o yaml | grep AGENTOPS_API_URL

# Should be: http://agentops-server:8080

# Test connectivity from dashboard pod
kubectl exec -it -n opencell deployment/agentops-dashboard -- \
  curl http://agentops-server:8080/health
```

### OpenCell not sending events

```bash
# Check OpenCell env vars
kubectl get deploy ulf-warden -n opencell -o yaml | grep AGENTOPS

# Must have:
# AGENTOPS_ENABLED=true
# AGENTOPS_ENDPOINT=http://agentops-server:8080

# Check logs
kubectl logs -n opencell deployment/ulf-warden | grep AgentOps
```

### LoadBalancer IP pending

```bash
# Check service
kubectl describe svc agentops-dashboard -n opencell

# If stuck, try NodePort instead:
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --set dashboard.service.type=NodePort
```

---

## 📊 What You'll See

### Dashboard Home

- **Session List**: All bot interactions
- **Filters**: By bot, user, platform, success/failure
- **Search**: By session ID or user ID

### Session Detail

- **Timeline**: Step-by-step execution
- **Tool Calls**: With args, results, duration
- **LLM Calls**: Token usage and cost
- **Errors**: Full stack traces
- **Metadata**: Bot info, platform, user

### Analytics

- **Total Sessions**: Per bot, per day/week/month
- **Success Rate**: Percentage of successful sessions
- **Average Duration**: Response time trends
- **Total Cost**: By bot, user, platform
- **Most Used Tools**: Frequency chart

### Cost Tracking

Real-time cost accumulation:

```
Today: $2.45
├─ guardian: $1.20 (450 sessions, 85% success)
├─ devops: $0.95 (320 sessions, 92% success)
└─ support: $0.30 (180 sessions, 98% success)

This Week: $15.80
This Month: $48.30
```

---

## 🎯 Best Practices

### 1. Use Persistent Storage

Always enable persistence for server:

```yaml
server:
  persistence:
    enabled: true
    size: 50Gi  # Adjust based on retention needs
```

### 2. Set Resource Limits

Prevent resource exhaustion:

```yaml
server:
  resources:
    limits:
      cpu: 2000m
      memory: 4Gi
```

### 3. Use PostgreSQL for Production

SQLite is great for dev/test, but use PostgreSQL for production:

```yaml
postgresql:
  enabled: true
  persistence:
    size: 100Gi
```

### 4. Enable Ingress with TLS

Secure external access:

```yaml
ingress:
  enabled: true
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  tls:
    - secretName: agentops-tls
```

### 5. Monitor AgentOps Itself

Set up monitoring for AgentOps components:

```bash
# Add Prometheus metrics (if available)
# Set up alerts for:
# - Pod restarts
# - High memory usage
# - Disk space (PVC)
```

---

## 📚 Additional Resources

- **Helm Chart README**: [./infra/helm/agentops/README.md](../infra/helm/agentops/README.md)
- **AgentOps Integration**: [./agentops-integration.md](./agentops-integration.md)
- **AgentOps GitHub**: https://github.com/AgentOps-AI/agentops
- **Kubernetes Docs**: https://kubernetes.io/docs/

---

## ✅ Summary

**Deployment Checklist:**
- [x] Deploy AgentOps (`./scripts/deploy-agentops.sh`)
- [x] Verify pods running
- [x] Access dashboard
- [x] Configure OpenCell
- [x] Verify integration
- [x] Monitor sessions

**You now have:**
- 📊 Full observability of OpenCell
- 💰 Real-time cost tracking
- 🐛 Session debugging
- 📈 Performance analytics
- 🔒 Self-hosted solution

**All running in your Kubernetes cluster!** 🚀

---

**Last Updated**: February 11, 2026  
**Version**: 1.0.0  
**Tested On**: GKE, EKS (others should work)
