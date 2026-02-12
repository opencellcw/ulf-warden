# 🌐 URL Manager - Guia de Uso

## 🚨 IMPORTANTE: Consciência de Firewall

**O bot está atrás de um firewall GCP que SÓ permite conexões OUTBOUND!**

Isso significa:
- ❌ **NUNCA** enviar links `localhost` ou IPs internos para serviços externos
- ❌ **NUNCA** usar `http://` (sempre HTTPS)
- ❌ **NUNCA** usar IPs privados (10.x.x.x, 192.168.x.x, 172.16.x.x)
- ✅ **SEMPRE** usar URLs públicas via Cloudflare Tunnel

**Se você enviar um link localhost para Discord/Slack/Telegram, NÃO VAI FUNCIONAR!**

---

## 📋 Como Usar

### 1. Importar o URLManager

```typescript
import { getURLManager } from '../utils/url-manager';

// Obter instância global
const urlManager = getURLManager();
```

### 2. No BotRuntime

```typescript
// Dentro de um handler ou método do bot
const runtime = getBotRuntime(botId);
const urlManager = runtime.getURLManager();
```

---

## 🎯 Métodos Disponíveis

### URLs Principais

```typescript
// URL pública base (via Cloudflare Tunnel)
const publicUrl = urlManager.getPublicUrl();
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com

// URL de webhook (para configurar Discord/Slack/etc)
const webhookUrl = urlManager.getWebhookUrl();
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/webhook

// URL de webhook com path customizado
const discordWebhook = urlManager.getWebhookUrl('/discord/guild/123');
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/webhook/discord/guild/123

// URL do dashboard
const dashboardUrl = urlManager.getDashboardUrl();
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/dashboard

// URL da API
const apiUrl = urlManager.getApiUrl('/v1/users');
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/api/v1/users
```

### URLs de Serviços Integrados

```typescript
// n8n
const n8nUrl = urlManager.getN8nUrl('/webhook/test');
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/n8n/webhook/test

// AgentOps
const agentOpsUrl = urlManager.getAgentOpsUrl('/api/sessions');
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/agentops/api/sessions

// Langfuse
const langfuseUrl = urlManager.getLangfuseUrl('/api/traces');
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/langfuse/api/traces
```

### Construir URLs Customizadas

```typescript
// Construir URL com path e parâmetros
const url = urlManager.buildUrl(
  urlManager.getPublicUrl(),
  '/callback',
  { token: 'abc123', user: 'john' }
);
// Retorna: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/callback?token=abc123&user=john
```

### Validar URLs (Segurança)

```typescript
// Validar uma URL antes de usar
try {
  const validUrl = urlManager.validateAndConvertUrl(
    'http://localhost:3000/webhook',
    'Discord webhook setup'
  );
} catch (error) {
  // Erro! URL localhost será bloqueada pelo firewall!
  // O método vai logar erro detalhado e throw exception
}
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Configurar Webhook do Discord

```typescript
// ❌ ERRADO - Vai ser bloqueado pelo firewall!
await discord.setupWebhook('http://localhost:3000/webhook');

// ✅ CERTO - Usa Cloudflare Tunnel
import { getURLManager } from '../utils/url-manager';

const urlManager = getURLManager();
const webhookUrl = urlManager.getWebhookUrl('/discord');
await discord.setupWebhook(webhookUrl);
```

### Exemplo 2: Enviar Link de Dashboard

```typescript
// ❌ ERRADO - IP interno não funciona externamente!
const dashboardLink = 'http://10.100.5.20:3000/dashboard';
await message.reply(`Acesse o dashboard: ${dashboardLink}`);

// ✅ CERTO - URL pública via tunnel
const urlManager = getURLManager();
const dashboardLink = urlManager.getDashboardUrl();
await message.reply(`Acesse o dashboard: ${dashboardLink}`);
```

### Exemplo 3: Integração com n8n

```typescript
// ❌ ERRADO - Localhost não acessível externamente
const n8nWebhook = 'http://localhost:5678/webhook/test';

// ✅ CERTO - URL pública do n8n via tunnel
const urlManager = getURLManager();
const n8nWebhook = urlManager.getN8nUrl('/webhook/test');

// Enviar para serviço externo
await axios.post('https://external-service.com/configure', {
  webhook_url: n8nWebhook
});
```

### Exemplo 4: Handler de Bot Factory

```typescript
// src/bot-factory/discord-handler.ts

import { getURLManager } from '../utils/url-manager';

export async function handleBotCreation(message: Message) {
  const urlManager = getURLManager();
  
  // Criar bot com URLs corretas
  const bot = await createBot({
    name: 'MyBot',
    webhookUrl: urlManager.getWebhookUrl(`/bot/${botId}`),
    dashboardUrl: urlManager.getDashboardUrl(`/bot/${botId}`)
  });
  
  // Enviar links para o usuário
  await message.reply(
    `Bot criado! 🎉\n` +
    `Webhook: ${bot.webhookUrl}\n` +
    `Dashboard: ${bot.dashboardUrl}`
  );
}
```

### Exemplo 5: Debugging/Status

```typescript
// Ver informações do ambiente
const urlManager = getURLManager();
const info = urlManager.getEnvironmentInfo();

console.log('Environment Info:', info);
// {
//   hostname: 'ulf-warden-agent-abc123',
//   platform: 'linux',
//   inKubernetes: true,
//   publicUrl: 'https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com',
//   firewallMode: 'outbound-only (GCP firewall)'
// }
```

---

## 🚫 Anti-Patterns (NÃO FAÇA ISSO!)

### ❌ Anti-Pattern 1: Hardcoded localhost

```typescript
// NÃO FAÇA ISSO!
const webhookUrl = 'http://localhost:3000/webhook';
await setupWebhook(webhookUrl); // Vai falhar!
```

### ❌ Anti-Pattern 2: IP interno

```typescript
// NÃO FAÇA ISSO!
const apiUrl = 'http://10.100.5.20:3000/api';
await fetch(apiUrl); // Vai ser bloqueado!
```

### ❌ Anti-Pattern 3: process.env direto

```typescript
// NÃO FAÇA ISSO!
// Pode estar vazio ou com valor incorreto
const url = process.env.PUBLIC_URL || 'http://localhost:3000';
```

### ❌ Anti-Pattern 4: Sem validação

```typescript
// NÃO FAÇA ISSO!
function sendLink(url: string) {
  // Não valida se é localhost ou IP interno!
  await externalService.configure({ url });
}
```

---

## ✅ Best Practices

### ✅ Sempre use URLManager

```typescript
// BOM!
const urlManager = getURLManager();
const url = urlManager.getWebhookUrl();
```

### ✅ Valide URLs suspeitas

```typescript
// BOM!
const url = urlManager.validateAndConvertUrl(userProvidedUrl, 'user input');
```

### ✅ Use no BotRuntime

```typescript
// BOM!
const runtime = getBotRuntime(botId);
const urlManager = runtime.getURLManager();
```

### ✅ Documente o uso

```typescript
/**
 * Configura webhook do bot
 * 
 * IMPORTANTE: Usa URLManager para garantir que o webhook
 * seja acessível externamente via Cloudflare Tunnel.
 * NUNCA use localhost ou IPs internos!
 */
async function setupBotWebhook(botId: string) {
  const urlManager = getURLManager();
  const webhookUrl = urlManager.getWebhookUrl(`/bot/${botId}`);
  // ...
}
```

---

## 🔍 Debugging

### Ver URLs configuradas

```bash
# No pod do bot
kubectl exec -it -n agents ulf-warden-agent-xxx -- env | grep URL
```

### Testar URLs

```bash
# Testar URL pública
curl -I https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/webhook

# Ver logs do URLManager
kubectl logs -n agents -l app=ulf-warden-agent | grep "URL Manager"
```

### Verificar inicialização

No startup do bot, você verá:
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🌐 URL Manager - Consciência de Firewall 🌐       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

🔒 FIREWALL STATUS:
   - Estamos atrás do firewall GCP
   - Apenas conexões OUTBOUND permitidas
   - INBOUND bloqueado (exceto via Cloudflare Tunnel)

🌐 URL PÚBLICA (via Cloudflare Tunnel):
   https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com

✅ URLS CONFIGURADAS:
   Webhook:   https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/webhook
   Dashboard: https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/dashboard
   API:       https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/api
```

---

## 🎓 Resumo

**SEMPRE:**
- ✅ Use `getURLManager()` para obter URLs
- ✅ Use métodos do URLManager (`getWebhookUrl()`, etc)
- ✅ Valide URLs externas antes de usar
- ✅ Documente uso de URLs públicas no código

**NUNCA:**
- ❌ Use `localhost` ou IPs internos em links externos
- ❌ Use `http://` (sempre HTTPS)
- ❌ Hardcode URLs
- ❌ Assuma que `process.env.PUBLIC_URL` está correto sem validar

**LEMBRE-SE:**
O firewall GCP **SÓ permite OUTBOUND**. Qualquer link que você enviar para serviços externos (Discord, Slack, APIs, etc) **DEVE** usar o Cloudflare Tunnel, senão **NÃO VAI FUNCIONAR**!

---

## 📚 Arquivos Relacionados

- `src/utils/url-manager.ts` - Implementação do URLManager
- `src/bot-factory/bot-runtime.ts` - Integração no BotRuntime
- `infra/cloudflare-tunnel/SERVICOS-VIA-TUNNEL.md` - Configuração de serviços
- `infra/cloudflare-tunnel/TUNNEL-INFO.md` - Informações do tunnel

---

## 🆘 Troubleshooting

### Erro: "PUBLIC_URL não configurado!"

```bash
# Verificar env var
kubectl get deployment ulf-warden-agent -n agents -o yaml | grep PUBLIC_URL

# Se não estiver configurado, rodar:
kubectl set env deployment/ulf-warden-agent \
  PUBLIC_URL="https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com" \
  -n agents
```

### Erro: "URL bloqueada detectada!"

O URLManager detectou tentativa de uso de localhost ou IP interno.

**Solução:** Use o método apropriado do URLManager em vez de construir a URL manualmente.

### Webhook não funciona

1. Verificar se usa URLManager:
   ```typescript
   const url = urlManager.getWebhookUrl(); // ✅
   // NÃO: const url = 'http://localhost:3000'; // ❌
   ```

2. Testar URL manualmente:
   ```bash
   curl -I https://9733ce54-43c9-4bd7-a103-a825aca9c24c.cfargotunnel.com/webhook
   ```

3. Ver logs do tunnel:
   ```bash
   kubectl logs -n agents -l app=cloudflared --tail=50
   ```
