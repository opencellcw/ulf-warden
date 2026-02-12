# 🎉 Cloudflare Tunnel - CONFIGURADO E FUNCIONANDO!

## ✅ Status

**TUDO PRONTO! 100% AUTOMÁTICO!** 🚀

- ✅ Tunnel conectado (4 conexões ativas)
- ✅ Configuração via arquivo (sem precisar dashboard)
- ✅ Bot configurado automaticamente
- ✅ URL pública funcionando

---

## 🌐 URL Pública

```
https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com
```

**Esta URL está configurada AUTOMATICAMENTE no bot!**

O bot vai usar essa URL para TUDO:
- ✅ Webhooks (Discord, Slack, Telegram, WhatsApp)
- ✅ Dashboard e APIs
- ✅ Integrações (n8n, etc)
- ✅ Qualquer link que precise ser público

---

## 📊 Informações Técnicas

### Tunnel ID
```
9733ce54-43c9-4bd7-a103-a825aca9c24c
```

### Configuração
- **Namespace**: agents
- **Deployment**: cloudflared (2 réplicas)
- **ConfigMap**: cloudflared-config
- **Secret**: cloudflared-config (credentials)
- **Service destino**: ulf-warden-agent.agents.svc.cluster.local:3000

### Conexões Ativas
- ord06 (Chicago)
- ord11 (Chicago)
- ord07 (Chicago)
- 4 conexões QUIC registradas

---

## 🔍 Verificar Status

### Ver pods do tunnel:
```bash
kubectl get pods -n agents -l app=cloudflared
```

### Ver logs do tunnel:
```bash
kubectl logs -n agents -l app=cloudflared --tail=50
```

### Ver URL configurada no bot:
```bash
kubectl get deployment ulf-warden-agent -n agents \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="PUBLIC_URL")].value}'
echo
```

### Testar URL:
```bash
curl -I https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com
```

---

## 🔧 Gerenciamento

### Reiniciar tunnel:
```bash
kubectl rollout restart deployment/cloudflared -n agents
```

### Atualizar configuração:
```bash
# Editar ConfigMap
kubectl edit configmap cloudflared-config -n agents

# Reiniciar para aplicar
kubectl rollout restart deployment/cloudflared -n agents
```

### Ver configuração atual:
```bash
kubectl get configmap cloudflared-config -n agents -o yaml
```

---

## 🎯 Como Funciona

1. **Tunnel conecta** ao Cloudflare com 4 conexões redundantes
2. **Cloudflare gera URL** baseada no Tunnel ID automaticamente
3. **Bot usa PUBLIC_URL** para todos os links externos
4. **Tráfego entra** pela URL pública do Cloudflare
5. **Tunnel roteia** para `ulf-warden-agent:3000` no K8s
6. **NUNCA precisa** mexer com firewall do GCP!

---

## 🔒 Segurança

- ✅ **Credentials**: Armazenadas em K8s Secret
- ✅ **Configuração**: ConfigMap (não sensível)
- ✅ **Conexões**: QUIC encriptado
- ✅ **Autenticação**: Via token/credentials do Cloudflare
- ✅ **Firewall**: Só conexões OUTBOUND (GCP firewall não bloqueia)

---

## 📝 Arquivos

```
infra/cloudflare-tunnel/
├── cloudflared-deployment.yaml  # Deployment do tunnel
├── TUNNEL-INFO.md              # Este arquivo
├── CONFIGURAR-HOSTNAME.md       # (obsoleto - não precisa mais)
└── update-bot-url.sh           # (obsoleto - automático agora)
```

---

## 🆘 Troubleshooting

### Tunnel DOWN?
```bash
# Ver logs
kubectl logs -n agents -l app=cloudflared --tail=100

# Reiniciar
kubectl rollout restart deployment/cloudflared -n agents
```

### Bot não usa URL?
```bash
# Verificar env var
kubectl describe deployment ulf-warden-agent -n agents | grep PUBLIC_URL

# Reconfigurar
kubectl set env deployment/ulf-warden-agent \
  PUBLIC_URL="https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com" \
  -n agents
```

### URL não funciona?
```bash
# Testar tunnel
curl -v https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com

# Verificar se bot está rodando
kubectl get pods -n agents -l app=ulf-warden-agent

# Ver logs do bot
kubectl logs -n agents -l app=ulf-warden-agent --tail=50
```

---

## 🎉 Resumo

**ESTÁ TUDO PRONTO E FUNCIONANDO!** ✅

Você não precisa fazer NADA!

O bot JÁ está configurado para usar o tunnel AUTOMATICAMENTE para qualquer coisa que precise de URL pública!

**NUNCA mais precisa mexer com:**
- ❌ Firewall do GCP
- ❌ IP externo
- ❌ Configurações de rede
- ❌ ngrok ou outros túneis temporários

**TUDO automático via Cloudflare Tunnel!** 🚀

---

## 📚 Mais Informações

- [Cloudflare Tunnel Docs](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Cloudflare Dashboard](https://one.dash.cloudflare.com/)
- Tunnel no dashboard: Networks → Connectors → ulf_warden_bot
