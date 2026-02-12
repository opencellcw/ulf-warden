# 🚀 Configuração Final do Cloudflare Tunnel

## ✅ Status Atual

- ✅ Tunnel conectado (4 conexões ativas)
- ✅ Tunnel ID: 9733ce54-43c9-4bd7-a103-a825aca9c24c
- ⏳ **FALTA**: Configurar hostname público

---

## 📋 Configurar Hostname no Dashboard (1 ÚNICA VEZ!)

### Passo 1: Deletar rota incompleta (se existir)

1. Vá em **Networks → Routes**
2. Se ver "ulf-bot" na lista:
   - Clique nos **três pontinhos (⋮)**
   - Clique **Delete**

### Passo 2: Criar nova rota COMPLETA

1. Clique em **"Create hostname route"**
2. Preencha:
   ```
   Hostname: ulf-bot
   Description: Bot webhook endpoint
   Tunnel: ulf_warden_bot
   ```
3. **ROLE A PÁGINA PARA BAIXO** ↓

4. Procure por **"Service"** ou **"Origin"** ou **"Path"**

5. Configure:
   ```
   Type: HTTP
   Service: ulf-warden-agent.agents.svc.cluster.local:3000
   
   OU (mais simples):
   
   Type: HTTP  
   Service: ulf-warden-agent:3000
   ```

6. Clique **"Save"**

---

## 🎯 Após Salvar

O Cloudflare vai gerar uma URL tipo:
- `https://ulf-bot-abc123.trycloudflare.com`

**COPIE essa URL!**

---

## 🤖 Atualizar o Bot Automaticamente

### Execute este comando (COLE A URL REAL):

```bash
kubectl set env deployment/ulf-warden-agent \
  PUBLIC_URL="https://SUA-URL-AQUI.trycloudflare.com" \
  -n agents
```

**Exemplo:**
```bash
kubectl set env deployment/ulf-warden-agent \
  PUBLIC_URL="https://ulf-bot-abc123.trycloudflare.com" \
  -n agents
```

---

## ✅ Pronto!

Agora o bot **SEMPRE** vai usar essa URL para:
- ✅ Webhooks do Discord
- ✅ Links de dashboard
- ✅ APIs externas  
- ✅ Integrações com n8n
- ✅ Qualquer link que precise ser público

**NUNCA mais vai esquecer!** 🔒

---

## 🔍 Ver URL Configurada

```bash
kubectl get deployment ulf-warden-agent -n agents \
  -o jsonpath='{.spec.template.spec.containers[0].env[?(@.name=="PUBLIC_URL")].value}'
```

---

## 🔄 Atualizar URL (se precisar trocar)

```bash
kubectl set env deployment/ulf-warden-agent \
  PUBLIC_URL="https://NOVA-URL.trycloudflare.com" \
  -n agents
```

---

## 📝 Resumo

1. **Configure no dashboard** → Service: `ulf-warden-agent:3000`
2. **Copie a URL gerada** → `https://ulf-bot-xyz.trycloudflare.com`
3. **Rode o comando** → `kubectl set env ...`
4. **Pronto!** → Bot sempre usa tunnel automaticamente

---

## 🆘 Troubleshooting

### URL não funciona?
```bash
# Testar tunnel
curl -I https://SUA-URL.trycloudflare.com

# Ver logs do tunnel
kubectl logs -n agents -l app=cloudflared --tail=50

# Ver logs do bot
kubectl logs -n agents -l app=ulf-warden-agent --tail=50
```

### Bot não está usando URL?
```bash
# Verificar variável de ambiente
kubectl describe deployment ulf-warden-agent -n agents | grep PUBLIC_URL

# Reiniciar bot
kubectl rollout restart deployment/ulf-warden-agent -n agents
```

---

## 📚 Documentação

- Tunnel conectado em: `infra/cloudflare-tunnel/cloudflared-deployment.yaml`
- ConfigMap hostname: `tunnel-hostname` (namespace: agents)
- Variável do bot: `PUBLIC_URL` (no deployment ulf-warden-agent)
