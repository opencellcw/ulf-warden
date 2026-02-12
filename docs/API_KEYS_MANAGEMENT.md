# 🔐 API Keys Management Guide

## ⚠️ REGRAS DE OURO:

1. **NUNCA** escreva API keys em arquivos `.md`
2. **NUNCA** commite keys para git
3. **NUNCA** coloque keys em logs ou error messages
4. **SEMPRE** use `.env` (gitignored)
5. **SEMPRE** use Google Secret Manager para production

---

## 📍 ONDE AS KEYS DEVEM ESTAR:

### ✅ CORRETO:
```
✅ .env (local development) - gitignored
✅ Google Secret Manager (production)
✅ Kubernetes Secrets (GKE)
✅ 1Password/Vault (team sharing)
```

### ❌ ERRADO:
```
❌ Qualquer arquivo .md
❌ Qualquer arquivo commitado no git
❌ README.md
❌ Documentação
❌ Comentários no código
❌ Logs
❌ Error messages
```

---

## 🔧 CONFIGURAÇÃO:

### **Local Development (.env):**
```bash
# .env (NUNCA commitar!)
BRAVE_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
REPLICATE_API_TOKEN=your_key_here
# ... etc
```

### **Production (Google Secret Manager):**
```bash
# Create secret
gcloud secrets create brave-api-key \
  --data-file=- <<< "your_key_here"

# Access secret
gcloud secrets versions access latest --secret="brave-api-key"
```

### **Kubernetes (GKE):**
```bash
# Create secret
kubectl create secret generic ulf-secrets \
  --from-literal=BRAVE_API_KEY="your_key_here" \
  --namespace=agents

# Use in deployment
env:
  - name: BRAVE_API_KEY
    valueFrom:
      secretKeyRef:
        name: ulf-secrets
        key: BRAVE_API_KEY
```

---

## 🧪 VERIFICAÇÃO DE SEGURANÇA:

### **Check 1: .env is gitignored**
```bash
grep "^\.env$" .gitignore
# Should output: .env
```

### **Check 2: No keys in git**
```bash
git log --all --source --full-history -S "sk-ant" -S "BSA"
# Should be empty
```

### **Check 3: No keys in staged files**
```bash
git diff --cached | grep -E "sk-|BSA|gsk_"
# Should be empty
```

### **Check 4: No keys in docs**
```bash
grep -r "sk-ant\|BSA\|gsk_" docs/ *.md
# Should be empty
```

---

## 🔄 ROTAÇÃO DE KEYS:

### **Quando rotacionar:**
- Key vazada (IMEDIATAMENTE!)
- A cada 90 dias (best practice)
- Quando membro sai da equipe
- Após incident de segurança

### **Como rotacionar:**

1. **Gerar nova key no provider**
2. **Atualizar .env local:**
   ```bash
   vim .env
   # Update key
   ```
3. **Atualizar Google Secret Manager:**
   ```bash
   echo "new_key" | gcloud secrets versions add my-secret --data-file=-
   ```
4. **Atualizar Kubernetes:**
   ```bash
   kubectl delete secret ulf-secrets
   kubectl create secret generic ulf-secrets --from-literal=KEY=new_value
   kubectl rollout restart deployment/ulf-warden-agent
   ```
5. **Revogar key antiga no provider**
6. **Testar tudo**

---

## 📊 APIS CONFIGURADAS:

### **Brave Search**
- **Provider:** https://brave.com/search/api/
- **Location:** `.env` → `BRAVE_API_KEY`
- **Usage:** `src/tools/brave-search.ts`
- **Rate Limit:** 2,000 queries/month (free)

### **Anthropic (Claude)**
- **Provider:** https://console.anthropic.com/
- **Location:** `.env` → `ANTHROPIC_API_KEY`
- **Usage:** Primary LLM
- **Rate Limit:** Tier-based

### **Replicate**
- **Provider:** https://replicate.com/
- **Location:** `.env` → `REPLICATE_API_TOKEN`
- **Usage:** Image/video generation
- **Cost:** Pay-per-use

### **ElevenLabs**
- **Provider:** https://elevenlabs.io/
- **Location:** `.env` → `ELEVENLABS_API_KEY`
- **Usage:** Text-to-speech
- **Rate Limit:** 10,000 chars/month (free)

### **Groq**
- **Provider:** https://console.groq.com/
- **Location:** `.env` → `GROQ_API_KEY`
- **Usage:** Fast LLM, Whisper
- **Rate Limit:** Generous free tier

### **Langfuse**
- **Provider:** https://cloud.langfuse.com/
- **Location:** `.env` → `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`
- **Usage:** LLM observability
- **Cost:** Free tier available

### **Pinecone**
- **Provider:** https://www.pinecone.io/
- **Location:** `.env` → `PINECONE_API_KEY`
- **Usage:** Vector database
- **Cost:** Free tier (1 index)

### **Supabase**
- **Provider:** https://supabase.com/
- **Location:** `.env` → `SUPABASE_URL`, `SUPABASE_KEY`
- **Usage:** Database, sessions
- **Cost:** Free tier generous

---

## 🧪 TESTING:

### **Test API Key (example):**
```bash
# Test Brave Search
curl -H "Accept: application/json" \
     -H "X-Subscription-Token: $BRAVE_API_KEY" \
     "https://api.search.brave.com/res/v1/web/search?q=test"
```

### **Test All Integrations:**
```bash
./scripts/verify-integrations.sh
```

---

## 🆘 KEY VAZOU! O QUE FAZER:

### **Checklist de Emergência:**

1. ⚡ **REVOCAR IMEDIATAMENTE**
   - Vá no dashboard do provider
   - Revoke/Delete a key vazada

2. 🔄 **GERAR NOVA KEY**
   - Gere nova key no provider
   - Anote em lugar seguro (1Password)

3. 🔧 **ATUALIZAR SISTEMAS**
   - Atualize `.env` local
   - Atualize Google Secret Manager
   - Atualize Kubernetes Secrets
   - Restart deployments

4. 🔍 **INVESTIGAR**
   - Como vazou?
   - Onde vazou?
   - Quem teve acesso?

5. 📝 **DOCUMENTAR**
   - Registre incident
   - Aprenda com erro
   - Atualize processos

6. 🧪 **TESTAR**
   - Confirme nova key funciona
   - Confirme key antiga NÃO funciona
   - Monitor logs por 24h

---

## 💡 BEST PRACTICES:

### **Development:**
- ✅ Use `.env` files (gitignored)
- ✅ Use `.env.example` com placeholders
- ✅ Never hardcode keys
- ✅ Use environment variables
- ✅ Test with valid keys locally

### **Production:**
- ✅ Use Google Secret Manager
- ✅ Use Kubernetes Secrets
- ✅ Rotate keys every 90 days
- ✅ Monitor usage and anomalies
- ✅ Set up alerts for unusual activity

### **Team:**
- ✅ Share keys via 1Password/Vault
- ✅ Never send keys via Slack/email
- ✅ Document who has access
- ✅ Revoke when team member leaves
- ✅ Audit access regularly

---

## 📝 TEMPLATE .env:

```bash
# ============================================
# API KEYS - NEVER COMMIT THIS FILE!
# ============================================

# Brave Search API
BRAVE_API_KEY=

# Anthropic Claude
ANTHROPIC_API_KEY=

# Replicate (Image/Video)
REPLICATE_API_TOKEN=

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=

# Groq (Fast LLM)
GROQ_API_KEY=

# Langfuse (Observability)
LANGFUSE_PUBLIC_KEY=
LANGFUSE_SECRET_KEY=
LANGFUSE_HOST=https://cloud.langfuse.com

# Pinecone (Vector DB)
PINECONE_API_KEY=
PINECONE_ENVIRONMENT=
PINECONE_INDEX=

# Supabase (Database)
SUPABASE_URL=
SUPABASE_KEY=

# Discord Bot
DISCORD_BOT_TOKEN=
DISCORD_ADMIN_USER_IDS=
```

---

🔐 **LEMBRE-SE:**
- **KEYS são como senhas** - trate com extremo cuidado
- **Vazou? Revoke IMEDIATAMENTE**
- **Dúvida? Pergunte ao time de segurança**
- **NUNCA coloque keys em .md files!** ❌❌❌
