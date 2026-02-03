# Cloudflare Proxy + WAF + DDoS Protection Setup

## 🎯 Objetivo

Adicionar Cloudflare na frente do GKE Load Balancer para:
- 🛡️ DDoS Protection (194 Tbps capacity)
- 🔥 WAF (Web Application Firewall)
- ⚡ Rate Limiting global
- 📊 Analytics detalhado
- 🔒 Zero Trust Access (opcional)

---

## 📋 Pré-requisitos

- [x] Cloudflare account (já tem - usado para AI Gateway)
- [ ] Domínio (próprio ou registrar novo)
- [x] GKE Load Balancer IP: **34.72.79.4**
- [x] Port: **8080**

---

## 🚀 Passo a Passo

### **1. Preparar Domínio**

#### Opção A: Usar Domínio Existente (Recomendado)

Se você tem `cloudwalk.io` ou similar:

1. **No Cloudflare Dashboard:**
   - Vá para **Websites** → **Add a Site**
   - Digite: `cloudwalk.io` (ou seu domínio)
   - Escolha plan: **Free** (suficiente para começar)
   - Cloudflare vai escanear DNS records

2. **Atualizar Nameservers:**
   - Cloudflare vai mostrar 2 nameservers:
     ```
     name1.cloudflare.com
     name2.cloudflare.com
     ```
   - Vá no registrar do seu domínio (Google Domains, GoDaddy, etc)
   - Atualize os nameservers para apontar para Cloudflare
   - **Aguarde propagação:** 5 minutos a 24 horas

#### Opção B: Registrar Novo Domínio no Cloudflare

1. **No Cloudflare Dashboard:**
   - **Domain Registration** → **Register Domain**
   - Busque por domínio disponível (ex: `ulf-warden.com`)
   - Custo: ~$10-15/ano
   - Cloudflare configura nameservers automaticamente

#### Opção C: Usar IP Diretamente (Não Recomendado)

- Cloudflare proxy requer domínio
- Sem domínio = sem DDoS protection
- **Alternativa:** Usar apenas AI Gateway (já configurado)

---

### **2. Criar DNS Record Apontando para GKE**

1. **No Cloudflare Dashboard:**
   - Vá para seu domínio → **DNS** → **Records**
   - Clique **Add record**

2. **Configurar:**
   ```
   Type:    A
   Name:    bot (ou api, ou @)
   Content: 34.72.79.4
   Proxy:   ✅ Proxied (Orange cloud) ← IMPORTANTE!
   TTL:     Auto
   ```

3. **Resultado:**
   - Domínio: `bot.cloudwalk.io` (ou `bot.seudominio.com`)
   - Aponta para: GKE Load Balancer
   - Passa por: Cloudflare Proxy

---

### **3. Configurar SSL/TLS**

1. **No Cloudflare Dashboard:**
   - **SSL/TLS** → **Overview**
   - Escolha: **Flexible** (início) ou **Full** (produção)

2. **Opções:**
   - **Flexible:** Cloudflare ↔ User (HTTPS), Cloudflare ↔ GKE (HTTP)
     - ✅ Mais fácil (não precisa certificado no GKE)
     - ⚠️ Menos seguro (HTTP interno)

   - **Full (strict):** HTTPS end-to-end
     - ✅ Mais seguro
     - ⚠️ Requer certificado TLS no GKE

**Recomendação inicial:** Use **Flexible** para testar rapidamente.

---

### **4. Ativar WAF (Web Application Firewall)**

1. **No Cloudflare Dashboard:**
   - **Security** → **WAF**
   - Toggle: **Enable WAF** ✅

2. **Managed Rules (Automático):**
   - Cloudflare Managed Ruleset ✅
   - OWASP Core Ruleset ✅
   - Cloudflare Exposed Credentials Check ✅

3. **Custom Rules (Opcional):**
   ```
   Rule 1: Block SQL Injection
   Expression: (http.request.uri.query contains "UNION SELECT")
   Action: Block

   Rule 2: Block Path Traversal
   Expression: (http.request.uri.path contains "../")
   Action: Block

   Rule 3: Whitelist Health Check
   Expression: (http.request.uri.path eq "/health")
   Action: Allow
   ```

---

### **5. Configurar Rate Limiting (Global)**

**Nota:** Já temos rate limiting no código (30 req/min por usuário). Cloudflare adiciona camada adicional por IP.

1. **No Cloudflare Dashboard:**
   - **Security** → **WAF** → **Rate Limiting Rules**
   - Clique **Create rule**

2. **Regra de Rate Limit:**
   ```
   Rule name: Global API Rate Limit

   If incoming requests match:
   - URI Path: / or /health

   Then:
   - Rate: 100 requests per 1 minute
   - Action: Block
   - Duration: 60 seconds
   - Response: Custom (429 Too Many Requests)
   ```

3. **Exceções (Whitelist):**
   ```
   Rule name: Whitelist Health Checks

   If incoming requests match:
   - URI Path: /health
   - IP Address: [IPs dos monitores]

   Then: Allow (bypass rate limit)
   ```

---

### **6. Ativar DDoS Protection**

**Nota:** DDoS protection é automático quando proxy está ativado (orange cloud).

1. **Verificar Status:**
   - **Security** → **DDoS**
   - Status: **Protected** ✅

2. **Configurações Avançadas (Opcional):**
   - **HTTP DDoS Attack Protection:** Managed Ruleset ✅
   - **Network-layer DDoS Attack Protection:** Automatic ✅

---

### **7. (Opcional) Configurar Zero Trust Access**

**Use case:** Proteger endpoints administrativos com SSO/MFA.

1. **No Cloudflare Dashboard:**
   - **Zero Trust** → **Access** → **Applications**
   - Clique **Add an application**

2. **Configurar:**
   ```
   Application name: Ulf Admin
   Session Duration: 24 hours

   Application domain:
   - Subdomain: admin
   - Domain: seudominio.com

   Policies:
   - Name: Admins Only
   - Action: Allow
   - Includes:
     - Emails: admin@cloudwalk.io
     - Email domain: @cloudwalk.io
   ```

3. **Resultado:**
   - `admin.seudominio.com` → Requer login
   - SSO via Google/GitHub/Okta

---

### **8. Testar Configuração**

#### Teste 1: DNS Resolution

```bash
# Verificar se domínio aponta para Cloudflare
dig bot.seudominio.com

# Deve mostrar IPs do Cloudflare (não 34.72.79.4)
# Exemplo: 104.21.x.x, 172.67.x.x
```

#### Teste 2: HTTP Request

```bash
# Testar endpoint de health
curl https://bot.seudominio.com/health

# Esperado:
# {"status":"ok"}

# Headers de resposta devem incluir:
# cf-ray: xxx-XXX  (indica passou por Cloudflare)
# cf-cache-status: DYNAMIC
```

#### Teste 3: Rate Limiting

```bash
# Enviar 101 requests rápidas
for i in {1..101}; do
  curl https://bot.seudominio.com/health
done

# Request 101 deve retornar:
# 429 Too Many Requests
```

#### Teste 4: WAF

```bash
# Tentar SQL injection (deve ser bloqueado)
curl "https://bot.seudominio.com/?id=1' UNION SELECT * FROM users--"

# Esperado:
# 403 Forbidden (bloqueado pelo WAF)
```

---

### **9. Atualizar Configuração do Bot (Opcional)**

Se você quiser que o bot responda com o domínio novo:

```typescript
// src/index.ts
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: 'ulf',
    url: 'https://bot.cloudwalk.io', // ← Adicionar
    platforms: {
      slack: !!handlers.slack,
      discord: !!handlers.discord,
      telegram: !!handlers.telegram,
      whatsapp: !!handlers.whatsapp,
    }
  });
});
```

---

## 📊 Monitoramento

### Analytics no Cloudflare

1. **Traffic Analytics:**
   - **Analytics & Logs** → **Traffic**
   - Veja: Requests, Bandwidth, Threats blocked

2. **Security Analytics:**
   - **Security** → **Analytics**
   - Veja: WAF events, DDoS events, Rate limit hits

3. **Logs (Opcional - Paid):**
   - **Analytics & Logs** → **Logs**
   - Export para: Google Cloud Storage, S3, etc

---

## 🎯 Arquitetura Final

```
User Request
    ↓
DNS (bot.cloudwalk.io)
    ↓
Cloudflare Edge (Global)
    ├─ DDoS Protection (194 Tbps)
    ├─ WAF Rules (SQL injection, XSS, etc)
    ├─ Rate Limiting (100 req/min per IP)
    ├─ SSL/TLS Termination
    └─ Cache (static content)
    ↓
GKE Load Balancer (34.72.79.4:8080)
    ↓
Ulf Pod (agents namespace)
    ├─ Sanitizer (Prompt injection ✅)
    ├─ Vetter (Tool validation ✅)
    ├─ Rate Limiter (30 req/min per user ✅)
    └─ AI Gateway (Analytics ✅)
    ↓
Anthropic API
```

---

## 🔒 Níveis de Segurança

### Camada 1: Cloudflare (Edge)
- ✅ DDoS Protection (L3/L4/L7)
- ✅ WAF (OWASP Top 10)
- ✅ Rate Limiting (por IP)
- ✅ Bot Management
- ✅ SSL/TLS

### Camada 2: GKE (Network)
- ✅ Network Policies
- ✅ Private cluster
- ✅ VPC firewall rules

### Camada 3: Ulf (Application)
- ✅ Sanitizer (AI-specific)
- ✅ Vetter (Tool validation)
- ✅ Rate Limiter (per user)
- ✅ Secret Manager

### Camada 4: AI Gateway (API)
- ✅ Request logging
- ✅ Cost tracking
- ✅ Caching

**= Defesa em Profundidade!** 🛡️🛡️🛡️🛡️

---

## 💰 Custos

### Cloudflare (Para começar)

| Recurso | Free Plan | Pro Plan ($20/mo) |
|---------|-----------|-------------------|
| **DDoS Protection** | ✅ Ilimitado | ✅ Ilimitado |
| **WAF** | ✅ Basic | ✅ Advanced |
| **Rate Limiting** | 10,000 req/mo | ✅ Ilimitado |
| **Page Rules** | 3 rules | 20 rules |
| **Analytics** | 24h retention | 7 days |
| **Support** | Community | Email |

**Recomendação:** Comece com **Free Plan** (suficiente para início).

---

## ⚠️ Considerações Importantes

### 1. WebSocket Support

- ✅ Discord/WhatsApp usam WebSocket **OUTBOUND** (do pod para internet)
- ✅ Não passam pelo Cloudflare proxy (conexão direta)
- ✅ Cloudflare protege apenas HTTP endpoints (/ e /health)

### 2. Health Checks

- ✅ GKE Load Balancer health checks continuam funcionando
- ⚠️ Se Cloudflare cair, health checks falham (Load Balancer OK)
- **Solução:** Manter health checks direto no IP também

### 3. IP Whitelisting

- ⚠️ Cloudflare muda IPs de origem (vê IP do Cloudflare, não user)
- **Solução:** Use `CF-Connecting-IP` header para IP real:
  ```typescript
  const realIp = req.headers['cf-connecting-ip'] || req.ip;
  ```

---

## 🚀 Quick Start (Resumo)

```bash
# 1. Adicionar domínio no Cloudflare
# 2. Criar DNS record A apontando para 34.72.79.4
# 3. Ativar proxy (orange cloud)
# 4. Configurar SSL: Flexible
# 5. Ativar WAF
# 6. Criar rate limiting rule
# 7. Testar: curl https://bot.seudominio.com/health
```

**Tempo estimado:** 15-30 minutos (dependendo da propagação DNS)

---

## 📚 Recursos

- [Cloudflare DNS Setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/)
- [WAF Rules](https://developers.cloudflare.com/waf/)
- [Rate Limiting](https://developers.cloudflare.com/waf/rate-limiting-rules/)
- [Zero Trust Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/)

---

**Próximos Passos:** Configurar domínio e testar! 🚀
