# Ulfberht Agent Infrastructure

Deploy distributed AI agent swarms on Kubernetes with platform-agnostic communication.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    External Client (Optional)               │
│                  (Human via Slack/Discord/Web)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Coordinator Service                      │
│  • Agent discovery (Kubernetes service)                     │
│  • Message routing (Redis pub/sub or NATS)                 │
│  • Load balancing                                           │
│  • Health monitoring                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Agent Lead   │   │ Agent Coder  │   │ Agent Review │
│              │   │              │   │              │
│ Role: coord  │   │ Role: spec   │   │ Role: spec   │
│ Model: opus  │   │ Model: sonnet│   │ Model: sonnet│
│              │   │              │   │              │
│ Tasks:       │◄─►│ Tasks:       │◄─►│ Tasks:       │
│ • Planning   │   │ • Implement  │   │ • Review     │
│ • Coordinate │   │ • Git ops    │   │ • QA         │
│ • Delegate   │   │ • Testing    │   │ • Security   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │    Redis Pub/Sub        │
              │  • agent:tasks          │
              │  • agent:status         │
              │  • agent:results        │
              └─────────────────────────┘
```

## Key Features

### 🚀 Platform Agnostic
- No dependency on Slack, Discord, or any external platform
- Agents communicate via internal API (HTTP/gRPC)
- Optional external channels for human monitoring

### 🔄 Multiple Communication Patterns
- **Redis Pub/Sub**: For event-driven architecture
- **NATS**: For high-performance messaging
- **HTTP Direct**: For simple request/response

### 🎯 Flexible Deployment
- Single agent: Simple task automation
- Swarm: Coordinated multi-agent workflows
- Hybrid: Mix standalone and coordinated agents

### 🛡️ Production Ready
- Health checks and readiness probes
- Auto-scaling with HPA
- Persistent storage for state
- RBAC for security
- Resource limits

## Quick Start

### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Helm 3.x
- Secret with Anthropic API key

### 1. Create Secrets

```bash
# Create namespace
kubectl create namespace agents

# Create Anthropic API key secret
kubectl create secret generic agent-secrets \
  --from-literal=anthropic-api-key=sk-ant-xxx \
  -n agents
```

### 2. Deploy Coordinator

```bash
# Install coordinator with Redis
helm install coordinator ./helm/coordinator \
  --namespace agents \
  --create-namespace
```

### 3. Deploy Agent Swarm

```bash
# Deploy lead coordinator agent
helm install agent-lead ./helm/agent \
  -f examples/swarm.values.yaml \
  --set agent.name=agent-lead \
  --set agent.role=coordinator \
  --set agent.model=opus \
  --namespace agents

# Deploy coder specialist
helm install agent-coder ./helm/agent \
  -f examples/swarm.values.yaml \
  --set agent.name=agent-coder \
  --set agent.role=specialist \
  --set agent.model=sonnet \
  --namespace agents

# Deploy reviewer specialist
helm install agent-reviewer ./helm/agent \
  -f examples/swarm.values.yaml \
  --set agent.name=agent-reviewer \
  --set agent.role=specialist \
  --set agent.model=sonnet \
  --namespace agents
```

### 4. Verify Deployment

```bash
# Check pods
kubectl get pods -n agents

# Check services
kubectl get svc -n agents

# Check agent logs
kubectl logs -f deployment/agent-lead -n agents
```

### 5. Test Communication

```bash
# Port forward to coordinator
kubectl port-forward svc/coordinator 8080:8080 -n agents

# Submit a task to agent-lead
curl -X POST http://localhost:8080/task \
  -H "Content-Type: application/json" \
  -d '{
    "to": "agent-lead",
    "type": "PLAN",
    "payload": "{\"task\": \"Implement user authentication\"}"
  }'
```

## Configuration Guide

### Agent Roles

#### Coordinator
- Orchestrates multiple specialist agents
- Breaks down complex tasks
- Consolidates results
- Model: Opus (most capable)

```yaml
agent:
  role: "coordinator"
  model: "opus"
```

#### Specialist
- Focused on specific domain (coding, review, testing)
- Executes delegated tasks
- Reports results back
- Model: Sonnet (balanced)

```yaml
agent:
  role: "specialist"
  model: "sonnet"
```

#### Reviewer
- Quality assurance and code review
- Security scanning
- Performance analysis
- Model: Sonnet or Haiku (fast)

```yaml
agent:
  role: "reviewer"
  model: "sonnet"
```

### Communication Modes

#### API Mode (Standalone)
Agent exposes HTTP API, receives tasks directly.

```yaml
agent:
  taskSource:
    type: "api"
  api:
    enabled: true
    port: 8080
    protocol: "http"
```

#### Queue Mode (Redis)
Agent subscribes to Redis channels for tasks.

```yaml
agent:
  taskSource:
    type: "queue"
    redis:
      enabled: true
      host: "redis.default.svc"
      channels:
        tasks: "agent:tasks"
```

#### Pub/Sub Mode (NATS)
Agent subscribes to NATS subjects.

```yaml
agent:
  taskSource:
    type: "pubsub"
    nats:
      enabled: true
      url: "nats://nats.default.svc:4222"
      subjects:
        tasks: "agent.tasks"
```

### External Channels (Optional)

Enable human monitoring via external platforms:

#### Slack
```yaml
agent:
  channel:
    enabled: true
    type: "slack"
    slack:
      enabled: true
      botToken: "xoxb-..."
      appToken: "xapp-..."
```

#### Discord
```yaml
agent:
  channel:
    enabled: true
    type: "discord"
    discord:
      enabled: true
      botToken: "..."
```

#### Webhook
```yaml
agent:
  channel:
    enabled: true
    type: "webhook"
    webhook:
      enabled: true
      url: "https://your-webhook.com"
```

## Agent Configuration Files

### SOUL.md
Defines agent personality, role, and behavior.

```markdown
# Agent Soul

## Identity
You are a specialist in [domain].

## Responsibilities
- Task 1
- Task 2

## Communication Protocol
- Listen on channel X
- Report results to channel Y
```

### TOOLS.md
Lists available tools for the agent.

```markdown
# Available Tools

## Code Operations
- execute_shell
- read_file
- write_file

## Git Operations
- git_clone
- git_commit
```

### AGENTS.md
Directory of other agents in the swarm.

```markdown
# Agent Directory

## agent-coder
- URL: http://agent-coder.default.svc:8080
- Role: specialist
- Capabilities: coding, git
```

## Workflow Examples

### Simple Task Execution

```
1. Human → Coordinator: POST /task {"type": "implement", "spec": "..."}
2. Coordinator → Agent-Lead: Route to lead
3. Agent-Lead analyzes task
4. Agent-Lead → Agent-Coder: Delegate implementation
5. Agent-Coder executes and returns result
6. Agent-Lead → Coordinator: Final result
7. Coordinator → Human: Response
```

### Complex Multi-Step Workflow

```
1. Human: "Build authentication system"

2. Agent-Lead receives task:
   - Plans: [implement, review, test, deploy]
   - Creates subtasks

3. Agent-Lead → Agent-Coder:
   Task: Implement auth endpoints

4. Agent-Coder:
   - Writes code
   - Creates tests
   - Commits to git
   - Returns: code_url, test_results

5. Agent-Lead → Agent-Reviewer:
   Task: Review code at {code_url}

6. Agent-Reviewer:
   - Analyzes code quality
   - Runs security scan
   - Returns: review_report, issues[]

7. Agent-Lead consolidates:
   - If issues: Send back to Coder
   - If approved: Continue to deployment

8. Agent-Lead → Human: Complete report
```

## Monitoring

### Prometheus Metrics
Agents expose metrics at `/metrics`:

```
# Task metrics
agent_tasks_total{agent="agent-coder",status="completed"}
agent_tasks_duration_seconds{agent="agent-coder"}

# Resource metrics
agent_cpu_usage{agent="agent-coder"}
agent_memory_usage{agent="agent-coder"}

# Queue metrics
agent_queue_size{agent="agent-coder"}
```

### Logging
Structured JSON logs with correlation IDs:

```json
{
  "timestamp": "2026-01-30T...",
  "level": "info",
  "agent": "agent-coder",
  "task_id": "123",
  "message": "Task completed",
  "duration_ms": 1234
}
```

### Health Checks
- `/health`: Liveness probe
- `/ready`: Readiness probe
- `/status`: Detailed status (tasks, resources, queue)

## Scaling

### Horizontal Pod Autoscaling
```yaml
autoscaling:
  enabled: true
  minReplicas: 1
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### Load Distribution
Multiple replicas of the same agent share the task queue:

```
                 ┌─────────────┐
     Tasks ─────►│ Redis Queue │
                 └──────┬──────┘
                        │
            ┌───────────┼───────────┐
            │           │           │
            ▼           ▼           ▼
       ┌────────┐  ┌────────┐  ┌────────┐
       │Agent-1 │  │Agent-2 │  │Agent-3 │
       └────────┘  └────────┘  └────────┘
```

## Security

### RBAC
Agents run with minimal permissions:

```yaml
rbac:
  create: true
  rules:
    - apiGroups: [""]
      resources: ["pods"]
      verbs: ["get", "list"]
```

### Network Policies
Restrict communication between pods:

```yaml
networkPolicy:
  enabled: true
  ingress:
    - from:
      - podSelector:
          matchLabels:
            app: agent
```

### Secrets Management
Use Kubernetes secrets or external secret managers:

```yaml
env:
  - name: ANTHROPIC_API_KEY
    valueFrom:
      secretKeyRef:
        name: agent-secrets
        key: anthropic-api-key
```

## Troubleshooting

### Agent not receiving tasks
1. Check Redis connection:
   ```bash
   kubectl exec -it deployment/agent-coder -- redis-cli -h redis PING
   ```

2. Verify Redis channels:
   ```bash
   redis-cli PUBSUB CHANNELS "agent:*"
   ```

3. Check agent logs:
   ```bash
   kubectl logs deployment/agent-coder | grep -i redis
   ```

### Agent crashing (OOMKilled)
Increase memory limits:

```yaml
resources:
  limits:
    memory: "2Gi"
```

### High latency
1. Check API response times in metrics
2. Scale up replicas
3. Use faster model (Sonnet → Haiku)

## Advanced Topics

### Custom Protocol Buffers
Modify `proto/agent.proto` and regenerate:

```bash
protoc --go_out=. --go-grpc_out=. proto/agent.proto
```

### Multi-Cluster Deployment
Deploy coordinator in one cluster, agents in another:

```yaml
coordinator:
  redis:
    external:
      enabled: true
      host: "redis.shared.svc"
```

### Hybrid Cloud
Mix on-premise and cloud agents:

```yaml
agent:
  taskSource:
    redis:
      host: "redis.public-ip.com"
      tls: true
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.

## Support

- GitHub Issues: https://github.com/ulfberht/warden/issues
- Discord: https://discord.gg/ulfberht
- Email: support@ulfberht.dev
