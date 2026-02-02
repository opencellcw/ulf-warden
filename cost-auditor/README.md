# 💰 Cost Auditor - Multi-Platform Cost Monitoring

Complete cost monitoring system for:
- **Anthropic API** (Claude)
- **Google Cloud** (GKE/Kubernetes)
- **ElevenLabs API**
- **Replicate API**
- **OpenAI API**

## 🎯 Features

### 1. Real-time Cost Tracking
- Current costs across all services
- Hourly/daily/monthly breakdowns
- Cost per feature/endpoint
- Historical data visualization

### 2. Budget Management
- Set monthly limits per service
- Alert thresholds (default: 80%)
- Hard limits with auto-disable
- Multi-service budget tracking

### 3. Intelligent Alerts
- Threshold alerts (80%, 90%, 100%)
- Spike detection (300% above normal)
- End-of-month projections
- Anomaly detection

### 4. Optimization Suggestions
- Model selection recommendations
- Caching opportunities
- Batching suggestions
- Cost efficiency analysis

### 5. Detailed Analytics
- Cost breakdown by service
- Usage patterns over time
- Top cost drivers
- ROI per feature

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd cost-auditor/backend
pip install -r requirements.txt
```

### 2. Configure Environment Variables

```bash
# API Keys
export ANTHROPIC_API_KEY="your-key"
export REPLICATE_API_TOKEN="your-token"
export ELEVENLABS_API_KEY="your-key"
export OPENAI_API_KEY="your-key"

# GCP
export GCP_PROJECT_ID="opencellcw-k8s"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# Optional
export DISCORD_WEBHOOK_URL="your-webhook"
export SLACK_WEBHOOK_URL="your-webhook"
```

### 3. Initialize Database

```bash
python3 -c "from models import init_db; init_db()"
```

### 4. Start API Server

```bash
python3 main.py
```

Server runs on: `http://localhost:9000`

## 📊 API Endpoints

### Current Costs
```bash
# All services
GET /costs/current

# Specific service
GET /costs/service/{service_name}
```

### Budgets
```bash
# List budgets
GET /budgets

# Create/update budget
POST /budgets
{
  "service": "anthropic",
  "monthly_limit": 50.0,
  "alert_threshold": 0.8,
  "hard_limit": 60.0
}

# Budget status
GET /budgets/status
```

### Alerts
```bash
# Recent alerts
GET /alerts

# Trigger alert check
POST /alerts/check
```

### Projections
```bash
# End of month projections
GET /projections/end-of-month
```

### Optimizations
```bash
# Get suggestions
GET /optimizations

# Apply optimization
POST /optimizations/{opt_id}/apply
```

### Historical Data
```bash
# Get history (default: 30 days)
GET /history?service=anthropic&days=30
```

## 💡 Usage Examples

### Set Budget Limits

```python
import requests

# Set Anthropic budget
requests.post('http://localhost:9000/budgets', json={
    'service': 'anthropic',
    'monthly_limit': 50.0,  # $50/month
    'alert_threshold': 0.8,  # Alert at 80%
    'hard_limit': 60.0  # Hard stop at $60
})
```

### Check Current Costs

```python
costs = requests.get('http://localhost:9000/costs/current').json()
print(f"Total: ${costs['total']:.2f}")
for service, cost in costs['by_service'].items():
    print(f"  {service}: ${cost:.2f}")
```

### Get Budget Status

```python
status = requests.get('http://localhost:9000/budgets/status').json()
for service in status:
    print(f"{service['service']}: {service['percent_used']:.1f}% used")
    if service['alert_level'] == 'warning':
        print(f"  ⚠️ Approaching limit!")
    elif service['alert_level'] == 'critical':
        print(f"  🚨 LIMIT EXCEEDED!")
```

## 🔧 Configuration

### Budget Limits

Edit `config/limits.yaml`:

```yaml
anthropic:
  monthly_limit: 50.0
  alert_threshold: 0.8
  hard_limit: 60.0

replicate:
  monthly_limit: 30.0
  alert_threshold: 0.75
  hard_limit: 40.0

elevenlabs:
  monthly_limit: 22.0  # Creator tier
  alert_threshold: 0.9
  hard_limit: null  # No hard limit

openai:
  monthly_limit: 100.0
  alert_threshold: 0.85
  hard_limit: 120.0

gcp:
  monthly_limit: 200.0
  alert_threshold: 0.8
  hard_limit: 250.0
```

### Alert Rules

Edit `config/alerts.yaml`:

```yaml
threshold_alerts:
  enabled: true
  thresholds: [0.5, 0.75, 0.9, 1.0]

spike_detection:
  enabled: true
  multiplier: 3.0  # Alert if 300% above average

projection_alerts:
  enabled: true
  forecast_days_ahead: 7

notifications:
  discord:
    enabled: true
    webhook_url: env:DISCORD_WEBHOOK_URL
  slack:
    enabled: true
    webhook_url: env:SLACK_WEBHOOK_URL
```

## 📈 Dashboard (Future)

React dashboard with:
- Real-time cost graphs
- Service comparison charts
- Alert history timeline
- Optimization recommendations
- Export reports (PDF/CSV)

## 🔒 Security

- API keys stored in environment variables
- Database encryption at rest
- Audit log of all cost-related actions
- Read-only API endpoints by default
- Rate limiting on writes

## 🐳 Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9000

CMD ["python3", "main.py"]
```

```bash
docker build -t cost-auditor .
docker run -p 9000:9000 --env-file .env cost-auditor
```

## ☸️ Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-auditor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cost-auditor
  template:
    metadata:
      labels:
        app: cost-auditor
    spec:
      containers:
      - name: cost-auditor
        image: us-central1-docker.pkg.dev/opencellcw-k8s/ulf-images/cost-auditor:latest
        ports:
        - containerPort: 9000
        env:
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: api-secrets
              key: anthropic-key
        # ... more env vars
---
apiVersion: v1
kind: Service
metadata:
  name: cost-auditor
spec:
  type: LoadBalancer
  ports:
  - port: 9000
    targetPort: 9000
  selector:
    app: cost-auditor
```

## 📊 Integration with Ulf

Ulf can query his own costs:

```typescript
// src/tools/cost-checker.ts
export async function checkCosts() {
  const response = await fetch('http://cost-auditor:9000/costs/current');
  const data = await response.json();
  return `Current total cost: $${data.total.toFixed(2)}`;
}
```

## 🎯 Optimization Strategies

The system automatically suggests:

1. **Model Selection**
   - "Use Claude Haiku for simple tasks instead of Sonnet"
   - "GPT-3.5 Turbo sufficient for 80% of your queries"

2. **Caching**
   - "Enable prompt caching for repeated system prompts"
   - "Cache Replicate results for 24h"

3. **Batching**
   - "Batch ElevenLabs requests to reduce overhead"
   - "Combine multiple API calls into single requests"

4. **Usage Patterns**
   - "Peak usage at 2PM - consider rate limiting"
   - "80% of costs from feature X - optimize or monetize"

## 📝 Pricing Reference (2026)

### Anthropic
- Claude Opus 4.5: $15/$75 per Mtok (in/out)
- Claude Sonnet 4.5: $3/$15 per Mtok
- Claude Haiku: $0.25/$1.25 per Mtok

### OpenAI
- GPT-4 Turbo: $10/$30 per Mtok
- DALL-E 3: $0.04-$0.12 per image
- Whisper: $0.006 per minute

### Replicate
- Varies by model and hardware
- ~$0.003 per image (Flux)
- ~$0.05 per video

### ElevenLabs
- Creator: $22/month (100k characters)
- Pro: $99/month (500k characters)

### GCP
- e2-medium node: ~$25/month
- Persistent disk: ~$0.04/GB/month
- Network egress: ~$0.12/GB

## 🚀 Roadmap

- [ ] Real-time WebSocket updates
- [ ] Advanced ML-based anomaly detection
- [ ] Auto-optimization (with approval)
- [ ] Cost allocation by feature/user
- [ ] Integration with billing systems
- [ ] Mobile app
- [ ] Slack/Discord bot commands

---

**Created by**: Ulfberht-Warden System
**Version**: 1.0.0
**Date**: 2026-02-02
