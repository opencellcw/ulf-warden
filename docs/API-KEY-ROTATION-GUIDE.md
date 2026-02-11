# 🔑 Guia de Rotação de Chave API (24h)

Sistema de rotação automática de chave Anthropic com expiração de 24 horas.

## 🎯 Objetivo

Manter segurança máxima usando chaves API de curta duração (24h) que são rotacionadas automaticamente via Discord.

## ✅ Benefícios

- **Segurança:** Chaves comprometidas expiram em 24h
- **Rastreabilidade:** Histórico completo de rotações
- **Automação:** Lembretes automáticos antes da expiração
- **Simplicidade:** Rotação via comando Discord em DM privada

## 🚀 Como Usar

### 1. Gerar Nova Chave no Dashboard Anthropic

1. Acesse: https://console.anthropic.com/settings/keys
2. Clique em "Create Key"
3. Defina expiração: **24 horas**
4. Copie a chave (formato: `sk-ant-api03-...`)

### 2. Rotacionar via Discord (DM Privada)

**⚠️ IMPORTANTE:** Use apenas em **DM privada** com o bot, nunca em canais públicos!

```
/rotate-key sk-ant-api03-[sua-nova-chave-aqui]
```

**O sistema irá:**
1. ✅ Validar o formato da chave
2. ✅ Atualizar o secret no Kubernetes
3. ✅ Atualizar o arquivo `.env` local
4. ✅ Reiniciar o deployment
5. ✅ Agendar lembrete 23h depois
6. ✅ **Deletar sua mensagem** (por segurança)

### 3. Deletar Chave Antiga

**CRÍTICO:** Após rotação bem-sucedida, **delete a chave antiga** no dashboard Anthropic!

1. Volte para https://console.anthropic.com/settings/keys
2. Encontre a chave anterior
3. Clique em "Delete" ou "Revoke"

## 📊 Verificar Status da Chave

```
/key-status
```

ou

```
/chave-status
```

**Retorna:**
- ✅ Status atual (válida/expirando/expirada)
- 📅 Data de configuração
- ⏰ Tempo restante até expiração
- 🔄 Total de rotações realizadas
- 👤 Quem fez a última rotação

## ⏰ Sistema de Lembretes

Você receberá um DM automático **1 hora antes** da chave expirar:

```
🔑 Lembrete: Rotação de Chave API

⏰ Tempo Restante: Menos de 1 hora
🔄 Ação Necessária: Gere uma nova chave e use /rotate-key

Sistema de Rotação Automática de Chaves
```

## 🔐 Segurança

### Quem Pode Rotacionar?

Apenas usuários listados em `AUTHORIZED_ADMIN_USERS` no `.env`:

```env
AUTHORIZED_ADMIN_USERS=665994193750982706,outro-user-id
```

Para adicionar mais usuários:
1. Pegue o Discord User ID (Dev Mode > Clique direito > Copy ID)
2. Adicione ao `.env` separado por vírgula
3. Reinicie o bot

### Proteções Implementadas

1. ✅ **DM Only:** Comando só funciona em DM privada
2. ✅ **Whitelist:** Apenas usuários autorizados
3. ✅ **Validação:** Formato da chave é validado
4. ✅ **Auto-delete:** Mensagem com chave é deletada
5. ✅ **Audit Log:** Todas rotações são registradas
6. ✅ **Rate Limit:** Máximo 5 rotações por dia (configurável)

## 📈 Histórico de Rotações

O sistema mantém histórico em `/data/key-rotation.json`:

```json
{
  "currentKeySet": "2026-02-10T22:30:00.000Z",
  "expiresAt": "2026-02-11T22:30:00.000Z",
  "rotationCount": 15,
  "lastRotatedBy": "665994193750982706"
}
```

## 🔧 Configuração Avançada

### Mudar Tempo de Expiração

Edite `src/commands/rotate-key.ts`:

```typescript
const KEY_LIFETIME_HOURS = 24; // Mude para 48, 72, etc.
```

### Ajustar Tempo do Lembrete

```typescript
// Lembrete X horas antes da expiração
scheduleReminder(message.client, message.author.id, KEY_LIFETIME_HOURS - 1); // -1 = 1h antes
```

### Adicionar Notificações Slack

```typescript
// No scheduleReminder, adicione:
await slack.chat.postMessage({
  channel: 'ops-alerts',
  text: `⚠️ Chave API expira em 1 hora!`
});
```

## 🚨 Troubleshooting

### "Você não tem permissão"

✅ **Solução:** Adicione seu User ID ao `AUTHORIZED_ADMIN_USERS` no `.env`

### "Formato de Chave Inválido"

✅ **Solução:** Verifique se copiou a chave completa:
- Deve começar com `sk-ant-api03-`
- Deve ter exatamente 95 caracteres após o prefixo
- Total: 110 caracteres

### "Erro ao atualizar K8s secret"

✅ **Solução:** Verifique conexão com cluster:
```bash
kubectl get secrets -n agents
gcloud container clusters get-credentials ulf-cluster --zone=us-central1-a
```

### Deployment não reiniciou

✅ **Solução:** Reinicie manualmente:
```bash
kubectl rollout restart deployment ulf-warden-agent -n agents
kubectl rollout status deployment ulf-warden-agent -n agents
```

## 📝 Checklist de Rotação

Use este checklist a cada rotação:

- [ ] Gerei nova chave no dashboard Anthropic (24h)
- [ ] Copiei a chave completa
- [ ] Abri DM privada com o bot
- [ ] Executei `/rotate-key sk-ant-api03-...`
- [ ] Bot confirmou sucesso ✅
- [ ] Deletei a chave antiga no dashboard
- [ ] Verifiquei status com `/key-status`
- [ ] Bot está rodando normalmente

## 🔄 Fluxo Completo

```mermaid
graph TD
    A[Gerar Nova Chave<br/>Dashboard Anthropic] --> B[/rotate-key no Discord DM]
    B --> C{Validar Chave}
    C -->|Inválida| D[Erro: Formato Incorreto]
    C -->|Válida| E[Atualizar K8s Secret]
    E --> F[Atualizar .env Local]
    F --> G[Reiniciar Deployment]
    G --> H[Agendar Lembrete 23h]
    H --> I[Deletar Mensagem]
    I --> J[✅ Rotação Completa]
    J --> K[Deletar Chave Antiga<br/>Dashboard Anthropic]

    H -.-> L[23h depois]
    L --> M[Enviar Lembrete DM]
    M --> A
```

## 💰 Custo Estimado

Com rotação a cada 24h:

- **Rotações por mês:** ~30
- **Custo por rotação:** $0 (apenas API calls do bot)
- **Overhead:** Insignificante (~$0.01/mês)

**Economia vs Incidente:**
- Custo de chave comprometida: Potencialmente milhares de dólares
- Custo deste sistema: ~$0.01/mês
- **ROI:** Infinito 🚀

## 📚 Referências

- **Código:** `src/commands/rotate-key.ts`
- **Handler:** `src/handlers/discord.ts`
- **Estado:** `/data/key-rotation.json`
- **Anthropic Dashboard:** https://console.anthropic.com/settings/keys

## 🎓 Melhores Práticas

1. **Rotacione regularmente:** Configure alarme diário
2. **Nunca compartilhe chaves:** Mesmo temporariamente
3. **Use DM sempre:** Nunca em canais públicos
4. **Delete chaves antigas:** Imediatamente após rotação
5. **Monitore logs:** Verifique `/data/key-rotation.json` periodicamente
6. **Backup do estado:** Inclua `key-rotation.json` em backups
7. **Teste antes de produção:** Teste rotação em staging primeiro

## 🆘 Suporte

Se encontrar problemas:

1. Verifique logs: `kubectl logs -n agents deployment/ulf-warden-agent`
2. Verifique secret: `kubectl get secret ulf-warden-agent-secrets -n agents -o yaml`
3. Teste conexão: `kubectl get pods -n agents`
4. Abra issue: https://github.com/seu-repo/issues

---

**Última atualização:** 2026-02-10
**Versão:** 1.0.0
**Autor:** Sistema de Rotação Automática
