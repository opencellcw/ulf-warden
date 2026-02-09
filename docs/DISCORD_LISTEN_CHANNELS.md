# 🎯 Discord Listen Channels - Guia de Configuração

**Feature:** Bot ouve TODAS as mensagens de canais específicos (sem precisar de @mention)

**Status:** ✅ Implementado e funcional

---

## 📋 Como Funciona

### Comportamento Padrão (SEM configuração):
- ✅ Responde a **DMs** (mensagens diretas)
- ✅ Responde quando **@mencionado** em qualquer canal
- ❌ Ignora mensagens normais em canais

### Com Listen Channels Configurado:
- ✅ Responde a **DMs**
- ✅ Responde quando **@mencionado** em qualquer canal
- ✅ Responde a **TODAS as mensagens** nos canais configurados

---

## 🔧 Configuração Passo-a-Passo

### 1. Ativar Developer Mode no Discord

1. Abra Discord
2. Settings (⚙️) → App Settings → Advanced
3. Ative **Developer Mode** ✅

### 2. Copiar IDs dos Canais

Para cada canal onde quer que o bot ouça tudo:

1. Botão direito no canal → **Copy Channel ID**
2. Anote o ID (ex: `123456789012345678`)

**Exemplo visual:**
```
#general            ← Botão direito aqui
#random             ← Copiar ID: 123456789012345678
#ulf-playground     ← Copiar ID: 987654321098765432
```

### 3. Configurar Variável de Ambiente

Adicione ao seu `.env`:

```bash
# Canais onde o bot responde sem @mention
DISCORD_LISTEN_CHANNELS=123456789012345678,987654321098765432
```

**Formato:**
- IDs separados por **vírgula**
- Sem espaços (ou com espaços, ambos funcionam)
- Múltiplos canais suportados

**Exemplos válidos:**
```bash
# Um canal
DISCORD_LISTEN_CHANNELS=123456789012345678

# Múltiplos canais (sem espaços)
DISCORD_LISTEN_CHANNELS=123456789012345678,987654321098765432

# Múltiplos canais (com espaços - também funciona)
DISCORD_LISTEN_CHANNELS=123456789012345678, 987654321098765432, 111222333444555666
```

### 4. Reiniciar o Bot

```bash
npm start
```

**Você verá no log:**
```
✓ Discord handler started (UlfBot#1234)
  • Listen channels: 123456789012345678, 987654321098765432
```

---

## 📊 Exemplos de Uso

### Cenário 1: Bot de Suporte em Canal Específico

```bash
# .env
DISCORD_LISTEN_CHANNELS=1234567890123456  # canal #suporte
```

**Resultado:**
- No `#suporte`: Bot responde a TODAS as mensagens
- Outros canais: Bot só responde com @mention

---

### Cenário 2: Múltiplos Canais de Trabalho

```bash
# .env
DISCORD_LISTEN_CHANNELS=111111111111111,222222222222222,333333333333333
```

**Canais:**
- `#ulf-dev` → Ouve tudo
- `#ulf-test` → Ouve tudo
- `#ulf-playground` → Ouve tudo
- `#general` → Só @mention

---

### Cenário 3: Sem Listen Channels (Padrão)

```bash
# .env
# DISCORD_LISTEN_CHANNELS não configurado
```

**Resultado:**
- Todos os canais: Só responde com @mention
- DMs: Sempre responde

---

## 🔍 Logs e Debugging

### No Startup

```
✓ Discord handler started (UlfBot#1234)
  • Listen channels: 123456789012345678, 987654321098765432
```

Ou se não configurado:
```
✓ Discord handler started (UlfBot#1234)
  • Listen channels: None (only DMs and @mentions)
```

### Por Mensagem

Cada mensagem recebida loga:
```json
{
  "userId": "discord_123456789",
  "isDM": false,
  "isMentioned": false,
  "isListenChannel": true,    ← TRUE se está em listen channel
  "channelId": "123456789012345678",
  "username": "usuario123"
}
```

---

## 🎯 Use Cases

### ✅ Bom para:
- Canal dedicado de suporte (#ulf-support)
- Canal de desenvolvimento/testes (#ulf-dev)
- Canal privado da equipe (#team-ai)
- Canal de integração com outros sistemas

### ⚠️ Cuidado com:
- Canais MUITO movimentados (rate limit)
- Canais públicos grandes (spam potencial)
- Múltiplos bots no mesmo canal (loops)

---

## 🔐 Segurança e Rate Limiting

O bot já tem **proteção contra spam** integrada:

```typescript
// Rate limit: 50 mensagens/hora por usuário (padrão)
const rateLimitCheck = await rateLimiter.checkLimit(userId);

if (!rateLimitCheck.allowed) {
  // Bloqueia temporariamente
}
```

**Isso significa:**
- Usuário spammando em listen channel: Bloqueado depois de 50 msgs/hora
- Rate limit é POR USUÁRIO, não por canal
- Proteção automática contra DDoS

---

## 📈 Monitoramento

### Verificar se está funcionando:

1. **Check startup log** - veja se IDs estão corretos
2. **Envie mensagem de teste** no canal configurado (SEM @mention)
3. **Check logs** - procure por `isListenChannel: true`

### Troubleshooting:

**Bot não responde no canal:**
```bash
# 1. Verifique se o ID está correto
echo $DISCORD_LISTEN_CHANNELS

# 2. Verifique o log de startup
# Deve mostrar: "Listen channels: SEU_ID_AQUI"

# 3. Teste com @mention primeiro
@UlfBot teste

# 4. Se @mention funciona, problema é na config do listen channel
```

**Bot responde em canais errados:**
```bash
# Verifique se não tem espaços extras ou IDs duplicados
DISCORD_LISTEN_CHANNELS=111111111111111,222222222222222  # Correto
```

---

## 🔄 Comparação com Slack

| Feature | Slack | Discord (Agora) |
|---------|-------|-----------------|
| Listen Channels | `SLACK_LISTEN_CHANNELS` | `DISCORD_LISTEN_CHANNELS` |
| Formato | Channel names | Channel IDs |
| DMs sempre | ✅ | ✅ |
| @Mention sempre | ✅ | ✅ |
| Múltiplos canais | ✅ | ✅ |

---

## 📝 Exemplo Completo

**.env:**
```bash
# Bot Discord
DISCORD_BOT_TOKEN=MTIzNDU2Nzg5MDEyMzQ1Njc4.AbCdEf.Gh1jKlMnOpQrStUvWxYz

# Admins
DISCORD_ADMIN_USER_IDS=123456789012345678,987654321098765432

# Listen Channels (bot responde SEM @mention)
DISCORD_LISTEN_CHANNELS=111111111111111,222222222222222

# WhatsApp QR Code
WHATSAPP_QR_CHANNEL_ID=333333333333333
```

**Resultado:**
- Canal `111111111111111` (#ulf-dev): Ouve tudo
- Canal `222222222222222` (#ulf-test): Ouve tudo
- Outros canais: Só @mention
- DMs: Sempre responde

---

## ✅ Checklist Final

Antes de fazer deploy:

- [ ] Developer Mode ativado no Discord
- [ ] Channel IDs copiados corretamente
- [ ] `.env` configurado com `DISCORD_LISTEN_CHANNELS`
- [ ] Build passou (`npm run build`)
- [ ] Testado em ambiente local
- [ ] Logs confirmam listen channels ativos
- [ ] Testado mensagem SEM @mention no canal configurado

---

## 🚀 Deploy

```bash
# 1. Commit changes
git add .
git commit -m "feat: add Discord listen channels support"

# 2. Push
git push origin main

# 3. Update production .env
# (adicione DISCORD_LISTEN_CHANNELS no servidor)

# 4. Restart bot
pm2 restart ulf  # ou seu processo
```

---

**Pronto!** 🎉 Seu bot agora ouve canais específicos sem precisar de @mention!
