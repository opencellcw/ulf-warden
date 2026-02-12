# AgentOps Helm Chart

Deploys AgentOps observability platform alongside OpenCell in Kubernetes.

## Components

- **Server** - Backend API for data collection (port 8080)
- **Dashboard** - Web UI for visualization (port 3000)
- **PostgreSQL** - Optional database (uses SQLite by default)

## Quick Start

### 1. Install AgentOps

```bash
# Install with default values (SQLite, LoadBalancer)
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --create-namespace

# Or with custom values
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --values ./infra/helm/agentops/custom-values.yaml
```

### 2. Get Dashboard URL

```bash
# If using LoadBalancer
export DASHBOARD_IP=$(kubectl get svc agentops-dashboard -n opencell \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Dashboard: http://$DASHBOARD_IP:3000"

# If using NodePort
export NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
export NODE_PORT=$(kubectl get svc agentops-dashboard -n opencell \
  -o jsonpath='{.spec.ports[0].nodePort}')
echo "Dashboard: http://$NODE_IP:$NODE_PORT"
```

### 3. Configure OpenCell

Update OpenCell deployment to use AgentOps:

```bash
kubectl set env deployment/ulf-warden -n opencell \
  AGENTOPS_ENABLED=true \
  AGENTOPS_ENDPOINT=http://agentops-server:8080
```

Or update via Helm values:

```yaml
# opencell/values.yaml
env:
  AGENTOPS_ENABLED: "true"
  AGENTOPS_ENDPOINT: "http://agentops-server:8080"
```

### 4. Access Dashboard

Open browser: `http://<DASHBOARD_IP>:3000`

You'll see all OpenCell bot sessions, costs, and metrics! 🎉

---

## Configuration

### Production Setup (with PostgreSQL)

```bash
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --set postgresql.enabled=true \
  --set postgresql.auth.password=secure-password \
  --set server.env.DATABASE_URL="postgresql://agentops:secure-password@agentops-postgresql:5432/agentops"
```

### With Ingress (for HTTPS)

```bash
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=agentops.example.com \
  --set ingress.hosts[0].paths[0].path=/ \
  --set ingress.hosts[0].paths[0].backend=dashboard \
  --set ingress.tls[0].secretName=agentops-tls \
  --set ingress.tls[0].hosts[0]=agentops.example.com
```

### Custom Resources

```yaml
# custom-values.yaml
server:
  resources:
    requests:
      cpu: 500m
      memory: 1Gi
    limits:
      cpu: 2000m
      memory: 2Gi
  
  persistence:
    size: 50Gi

dashboard:
  replicaCount: 2
  resources:
    requests:
      cpu: 200m
      memory: 512Mi
```

```bash
helm install agentops ./infra/helm/agentops \
  --namespace opencell \
  --values custom-values.yaml
```

---

## Values Reference

### Server

| Key | Description | Default |
|-----|-------------|---------|
| `server.enabled` | Enable server deployment | `true` |
| `server.replicaCount` | Number of replicas | `1` |
| `server.image.repository` | Docker image | `agentops/server` |
| `server.image.tag` | Image tag | `latest` |
| `server.service.type` | Service type | `ClusterIP` |
| `server.service.port` | Service port | `8080` |
| `server.resources` | Resource requests/limits | See values.yaml |
| `server.persistence.enabled` | Enable persistent storage | `true` |
| `server.persistence.size` | Storage size | `10Gi` |

### Dashboard

| Key | Description | Default |
|-----|-------------|---------|
| `dashboard.enabled` | Enable dashboard deployment | `true` |
| `dashboard.replicaCount` | Number of replicas | `1` |
| `dashboard.image.repository` | Docker image | `agentops/dashboard` |
| `dashboard.image.tag` | Image tag | `latest` |
| `dashboard.service.type` | Service type | `LoadBalancer` |
| `dashboard.service.port` | Service port | `3000` |
| `dashboard.resources` | Resource requests/limits | See values.yaml |

### PostgreSQL

| Key | Description | Default |
|-----|-------------|---------|
| `postgresql.enabled` | Enable PostgreSQL | `false` |
| `postgresql.auth.username` | DB username | `agentops` |
| `postgresql.auth.password` | DB password | `changeme` |
| `postgresql.auth.database` | DB name | `agentops` |

### Ingress

| Key | Description | Default |
|-----|-------------|---------|
| `ingress.enabled` | Enable Ingress | `false` |
| `ingress.className` | Ingress class | `nginx` |
| `ingress.hosts` | Ingress hosts config | See values.yaml |

---

## Upgrade

```bash
# Upgrade to new version
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell

# With value changes
helm upgrade agentops ./infra/helm/agentops \
  --namespace opencell \
  --set server.replicaCount=2
```

## Uninstall

```bash
helm uninstall agentops --namespace opencell
```

---

## Troubleshooting

### Check Pod Status

```bash
kubectl get pods -n opencell -l app.kubernetes.io/name=agentops
```

### View Logs

```bash
# Server logs
kubectl logs -n opencell -l app.kubernetes.io/component=server -f

# Dashboard logs
kubectl logs -n opencell -l app.kubernetes.io/component=dashboard -f
```

### Check Services

```bash
kubectl get svc -n opencell | grep agentops
```

### Test Connectivity

```bash
# From within cluster
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -- \
  curl http://agentops-server:8080/health

# Port forward for local testing
kubectl port-forward svc/agentops-dashboard -n opencell 3000:3000
# Open http://localhost:3000
```

### Common Issues

#### Dashboard can't connect to server

Check `AGENTOPS_API_URL` in dashboard deployment:

```bash
kubectl get deploy agentops-dashboard -n opencell -o yaml | grep AGENTOPS_API_URL
```

Should be: `http://agentops-server:8080`

#### OpenCell can't send events

Check OpenCell env vars:

```bash
kubectl get deploy ulf-warden -n opencell -o yaml | grep AGENTOPS
```

Should have:
- `AGENTOPS_ENABLED=true`
- `AGENTOPS_ENDPOINT=http://agentops-server:8080`

---

## Architecture

```
┌─────────────────┐
│   OpenCell      │
│   (Ulf-Warden)  │
│                 │
│ AGENTOPS_       │
│ ENDPOINT=       │
│ server:8080     │
└────────┬────────┘
         │ Events
         │
         ▼
┌─────────────────┐     ┌──────────────┐
│  AgentOps       │────▶│ PostgreSQL/  │
│  Server         │     │ SQLite       │
│  (Backend API)  │     │ (Data Store) │
│  Port: 8080     │     └──────────────┘
└────────┬────────┘
         │
         │ REST API
         │
         ▼
┌─────────────────┐
│  AgentOps       │
│  Dashboard      │
│  (Web UI)       │
│  Port: 3000     │◀────── Users
└─────────────────┘
```

---

## Next Steps

1. **Deploy AgentOps** (this chart)
2. **Configure OpenCell** to send events
3. **Access Dashboard** to view metrics
4. **Setup Ingress** for HTTPS access (optional)
5. **Enable PostgreSQL** for production (optional)

---

**For more information:**
- AgentOps GitHub: https://github.com/AgentOps-AI/agentops
- OpenCell AgentOps Integration: ../../docs/agentops-integration.md
