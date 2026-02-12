# Cloudflare Tunnel Setup Guide

Complete guide to setup Cloudflare Tunnel for Ulf-Warden bot, bypassing GCP firewall restrictions.

## Why Cloudflare Tunnel?

✅ **100% Free** - No costs, unlimited bandwidth  
✅ **Bypasses Firewall** - Outbound connection, no firewall rules needed  
✅ **Enterprise Security** - DDoS protection, SSL/TLS, WAF included  
✅ **Production Ready** - 99.99% uptime SLA  
✅ **K8s Native** - Easy deployment and management  

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Internet (Discord, Slack, etc.)                           │
│         │                                                   │
│         ↓                                                   │
│  ┌──────────────────┐                                      │
│  │  Cloudflare CDN  │  (receives requests)                 │
│  └──────────────────┘                                      │
│         │                                                   │
│         ↓ (via secure tunnel)                              │
│  ┌──────────────────┐                                      │
│  │  Cloudflared Pod │  (running in K8s)                    │
│  │  (agents ns)     │                                      │
│  └──────────────────┘                                      │
│         │                                                   │
│         ↓ (internal K8s network)                           │
│  ┌──────────────────┐                                      │
│  │  Ulf-Warden Bot  │  (your bot service)                  │
│  │  :3000           │                                      │
│  └──────────────────┘                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

✅ GCP Firewall: NO IMPACT (outbound connections allowed)
✅ Public IP: NOT NEEDED
✅ LoadBalancer: NOT NEEDED (saves $18-25/month)
```

## Setup Steps

### 1. Create Cloudflare Account

If you don't have one:

1. Go to https://dash.cloudflare.com/
2. Click "Sign Up"
3. Use your email and create password
4. Verify email
5. Login

### 2. Create Tunnel

1. In Cloudflare Dashboard, go to **Zero Trust** (left menu)
2. Navigate to **Networks** > **Tunnels**
3. Click **Create a tunnel**
4. Choose **Cloudflared** (the connector type)
5. Name it: `ulf-warden-bot`
6. Click **Save tunnel**
7. **Copy the tunnel token** (looks like: `eyJhIjoi...`)

### 3. Deploy to Kubernetes

Run the setup script with your tunnel token:

```bash
cd infra/cloudflare-tunnel
./setup-tunnel.sh <YOUR_TUNNEL_TOKEN>
```

Example:
```bash
./setup-tunnel.sh eyJhIjoiYmY4ZGU3MGU5YzQ5NDNkMWI5ZDYwNzg1MTZlMWJlMDUiLCJ0IjoiYjMwMTNkMTUtNjU0Yy00MTU3LWI3YjItZGU3YTBiOGFhYWViIiwicyI6Ik9HRmhNREF4WkdJdE1ERXhNaTAwWkRjNExXRmhNakl0WXpZd01HRXhZV0ZoWWpBMyJ9
```

The script will:
- ✅ Create K8s secret with tunnel token
- ✅ Deploy cloudflared pods (2 replicas for HA)
- ✅ Wait for pods to be ready
- ✅ Show logs and status

### 4. Configure Public Hostname

Back in Cloudflare Dashboard (Tunnels page):

1. Click on your tunnel (`ulf-warden-bot`)
2. Go to **Public Hostname** tab
3. Click **Add a public hostname**
4. Configure:
   - **Subdomain**: `bot` (or whatever you want)
   - **Domain**: Choose your domain or use Cloudflare's free domain
   - **Service**:
     - Type: `HTTP`
     - URL: `ulf-warden-agent.agents.svc.cluster.local:3000`
       (or just `ulf-warden-agent:3000` if same namespace)
5. Click **Save hostname**

Now your bot will be accessible at: `https://bot.yourdomain.com`

**No domain?** Cloudflare provides a free `*.trycloudflare.com` subdomain!

### 5. Verify Connection

Test the tunnel:

```bash
# Get your tunnel URL
TUNNEL_URL="https://bot.yourdomain.com"  # Replace with your actual URL

# Test health endpoint
curl $TUNNEL_URL/health

# Should return bot status
```

Check logs:

```bash
kubectl logs -n agents -l app=cloudflared -f
```

You should see:
```
Registered tunnel connection
Connection established
```

### 6. Update Bot Configuration

Update bot to use tunnel URL for webhooks:

```bash
# Add to .env or K8s secret
PUBLIC_URL=https://bot.yourdomain.com

# Restart bot deployment
kubectl rollout restart deployment/ulf-warden-agent -n agents
```

## Verification

### Check Pods

```bash
kubectl get pods -n agents -l app=cloudflared

# Expected output:
# NAME                           READY   STATUS    RESTARTS   AGE
# cloudflared-5d8f9c8b9c-abc12   1/1     Running   0          2m
# cloudflared-5d8f9c8b9c-def34   1/1     Running   0          2m
```

### Check Logs

```bash
kubectl logs -n agents -l app=cloudflared --tail=50
```

Look for:
- ✅ `Registered tunnel connection`
- ✅ `Connection established`
- ❌ No error messages

### Test Webhook

Discord webhook test:

```bash
curl -X POST https://bot.yourdomain.com/webhook/discord \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl describe pod -n agents -l app=cloudflared

# Check secret
kubectl get secret cloudflared-secret -n agents -o yaml
```

### Connection issues

```bash
# Check logs
kubectl logs -n agents -l app=cloudflared --tail=100

# Common issues:
# - Invalid token: Re-create secret with correct token
# - Network issues: Check cluster network connectivity
```

### Tunnel not accessible

1. Check Cloudflare Dashboard > Tunnels > Status (should be "Active")
2. Verify public hostname configuration
3. Check service is running: `kubectl get svc -n agents`
4. Test internal connectivity:
   ```bash
   kubectl run -it --rm debug --image=curlimages/curl -- \
     curl http://ulf-warden-agent.agents.svc.cluster.local:3000/health
   ```

## Maintenance

### Update Cloudflared

```bash
# Deployment uses :latest tag, just restart
kubectl rollout restart deployment/cloudflared -n agents
```

### Rotate Tunnel Token

1. Create new tunnel in Cloudflare Dashboard
2. Get new token
3. Update secret:
   ```bash
   kubectl create secret generic cloudflared-secret \
     --from-literal=token="NEW_TOKEN" \
     --namespace=agents \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
4. Restart deployment:
   ```bash
   kubectl rollout restart deployment/cloudflared -n agents
   ```

### Monitor

```bash
# Watch pods
kubectl get pods -n agents -l app=cloudflared -w

# Stream logs
kubectl logs -n agents -l app=cloudflared -f

# Check tunnel status in Cloudflare Dashboard
```

## Cleanup

To remove Cloudflare Tunnel:

```bash
# Delete deployment
kubectl delete -f cloudflared-deployment.yaml

# Delete secret
kubectl delete secret cloudflared-secret -n agents

# Delete tunnel in Cloudflare Dashboard
```

## Cost Comparison

| Solution | Monthly Cost | Annual Cost | Notes |
|----------|--------------|-------------|-------|
| **Cloudflare Tunnel** | **$0** | **$0** | ✅ Unlimited, free forever |
| GCP LoadBalancer | $18-25 | $216-300 | ❌ Plus egress costs |
| ngrok Pro | $20 | $240 | ❌ Required for production |
| Tailscale | $0 | $0 | ⚠️ Not for public webhooks |

**Savings with Cloudflare Tunnel: $216-300/year** 💰

## Security Benefits

✅ **DDoS Protection** - Cloudflare's network protects you  
✅ **SSL/TLS** - Automatic HTTPS with valid certificates  
✅ **WAF** - Web Application Firewall (optional)  
✅ **Rate Limiting** - Built-in protection  
✅ **Zero-Trust** - No exposed ports or IPs  
✅ **Audit Logs** - See all access in Cloudflare Dashboard  

## Performance

- **Latency**: +10-30ms average (Cloudflare's global network)
- **Bandwidth**: Unlimited
- **Uptime**: 99.99% SLA
- **Locations**: 275+ data centers worldwide

## Support

- **Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Community**: https://community.cloudflare.com/
- **Status**: https://www.cloudflarestatus.com/

## FAQ

**Q: Do I need a domain?**  
A: No! Cloudflare provides free `*.trycloudflare.com` subdomains.

**Q: Can I use my existing domain?**  
A: Yes! Just add it to Cloudflare (free) and use it for the tunnel.

**Q: Is this safe for production?**  
A: Yes! Used by Discord, Shopify, Atlassian, and thousands of companies.

**Q: What about the firewall?**  
A: Tunnel uses outbound connection from K8s → Cloudflare. GCP firewall allows outbound!

**Q: Can I have multiple services?**  
A: Yes! One tunnel can serve multiple services/hostnames.

**Q: What if Cloudflare goes down?**  
A: Cloudflare has 99.99% uptime. For critical services, use multiple ingress methods.

---

**Last Updated**: February 12, 2026  
**Status**: ✅ Production Ready  
**Tested On**: GKE 1.28+
