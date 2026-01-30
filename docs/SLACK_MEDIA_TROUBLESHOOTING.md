# 🔧 Troubleshooting: Mídia no Slack

## 🎯 Problema

Quando o Ulf gera imagens, vídeos ou áudios, aparece apenas um **link solto** ao invés do preview/player no Slack.

**Exemplo do problema:**
```
Ulf: URL: https://replicate.delivery/abc123.png
```

**Resultado esperado:**
```
Ulf: [IMAGEM APARECE COM PREVIEW]
     ✨ Generated content
```

---

## ✅ Solução: Verificar Permissões

### Passo 1: Acessar Slack API

```
https://api.slack.com/apps
→ Selecione seu app (Ulfberht-Warden)
→ Menu lateral: "OAuth & Permissions"
```

### Passo 2: Verificar Bot Token Scopes

Role até a seção **"Bot Token Scopes"** e verifique se tem:

#### ✅ Obrigatórios:
- `app_mentions:read` - Ler menções
- `chat:write` - Enviar mensagens
- `channels:history` - Ler histórico de canais
- `groups:history` - Ler histórico de grupos
- `im:history` - Ler histórico de DMs
- **`files:write`** ⭐ **CRÍTICO PARA UPLOAD**
- **`files:read`** ⭐ **RECOMENDADO**

### Passo 3: Adicionar Scopes Faltantes

Se não tiver `files:write`:

1. Clique em **"Add an OAuth Scope"**
2. Procure e adicione: `files:write`
3. Se quiser, adicione também: `files:read`

### Passo 4: Reinstalar App

**IMPORTANTE:** Após adicionar scopes, você **DEVE reinstalar o app**:

1. Na mesma página (OAuth & Permissions)
2. No topo, clique em **"Reinstall to Workspace"**
3. Autorize as novas permissões
4. Copie o novo **Bot User OAuth Token** (começa com `xoxb-`)
5. Atualize no `.env` ou Render:
   ```env
   SLACK_BOT_TOKEN=xoxb-SEU-NOVO-TOKEN
   ```

### Passo 5: Reiniciar Bot

**Localmente:**
```bash
npm run build
npm start
```

**No Render:**
- Render redesigna automaticamente ao detectar mudança no código
- Ou force restart: Settings → Manual Deploy → Deploy Latest Commit

---

## 🧪 Testar

### Teste 1: Imagem (Replicate)
```
@Ulf gera uma imagem de um gato astronauta
```

**Esperado:**
- ✅ Imagem aparece direto no chat com preview
- ✅ Sem link solto

**Se falhar:**
- Você verá mensagem de erro clara
- Verifique os logs para detalhes

### Teste 2: Áudio (ElevenLabs)
```
@Ulf converte "teste de áudio" para voz rachel
```

**Esperado:**
- ✅ Player de áudio aparece
- ✅ Pode tocar direto no Slack

### Teste 3: Vídeo (Replicate)
```
@Ulf cria um vídeo de ondas na praia
```

**Esperado:**
- ✅ Player de vídeo aparece
- ✅ Pode assistir direto no Slack

---

## 🔍 Erros Comuns

### Erro: "missing_scope: files:write"

**Causa:** Bot não tem permissão para fazer upload.

**Solução:** Siga os passos acima para adicionar o scope e reinstalar.

---

### Erro: "channel_not_found"

**Causa:** Bot não está no canal ou channel ID inválido.

**Solução:**
1. Convide o bot pro canal: `/invite @ulfberht-warden`
2. Tente novamente

---

### Erro: "NoSuchKey" ou "404" no link

**Causa:** Links do Replicate/OpenAI expiram rapidamente (minutos).

**Solução:** Isso é normal! O bot deveria fazer upload antes do link expirar. Se você está vendo o link, significa que o upload falhou. Verifique permissões.

---

### Link solto continua aparecendo

**Possíveis causas:**
1. ❌ Falta scope `files:write`
2. ❌ Não reinstalou o app após adicionar scope
3. ❌ Token antigo (sem permissão)
4. ❌ Bot não está no canal

**Debug:**
```bash
# Ver logs detalhados
npm start

# Procure por:
[MediaHandler] Media detected in response
[MediaHandler] Downloading from URL
[MediaHandler] Uploading to Slack
[MediaHandler] Media uploaded successfully

# Se aparecer erro, veja a mensagem exata
```

---

## 📊 Checklist Completo

- [ ] Scope `files:write` adicionado
- [ ] Scope `files:read` adicionado (opcional)
- [ ] App reinstalado no workspace
- [ ] Token atualizado no `.env` ou Render
- [ ] Bot reiniciado
- [ ] Bot convidado pro canal (`/invite @ulfberht-warden`)
- [ ] Testado com `@Ulf gera uma imagem de um gato`
- [ ] Preview aparece (não link solto)

---

## 🎯 Resultado Esperado

### Antes (com problema):
```
Você: @Ulf gera uma imagem de um gato
Ulf: ✅ Image generated!
     URL: https://replicate.delivery/abc123.png
     [LINK SOLTO, SEM PREVIEW]
```

### Depois (corrigido):
```
Você: @Ulf gera uma imagem de um gato
Ulf: [IMAGEM APARECE COM PREVIEW BONITINHO]
     ✅ Image generated! 🎨
```

---

## 💡 Dicas

### Verificar se upload funcionou

No Slack, arquivos uploadados aparecem com:
- ✅ Preview/thumbnail
- ✅ Botão de download
- ✅ Player inline (vídeo/áudio)
- ✅ Mostra tamanho do arquivo

Links soltos aparecem com:
- ❌ Só texto azul clicável
- ❌ Sem preview
- ❌ Sem player

### Logs úteis

```bash
# Localmente
npm start

# Você deve ver:
[Slack] Media detected in response { type: 'image', channel: 'C123...' }
[MediaHandler] Downloading from URL
[MediaHandler] Downloaded file { size: '256KB', filename: 'image.png' }
[MediaHandler] Uploading to Slack { filename: 'image.png', filetype: 'png' }
[MediaHandler] Media uploaded successfully { ok: true }
[Slack] Media sent successfully
```

Se aparecer `[Slack] Upload failed`, veja o erro detalhado no log.

---

## 🚀 TL;DR

1. Acesse: https://api.slack.com/apps → Seu App → OAuth & Permissions
2. Adicione scope: `files:write`
3. Clique: "Reinstall to Workspace"
4. Copie novo token: `xoxb-...`
5. Atualize `.env`: `SLACK_BOT_TOKEN=xoxb-novo-token`
6. Restart bot: `npm run build && npm start`
7. Convide bot: `/invite @ulfberht-warden`
8. Teste: `@Ulf gera uma imagem de um gato`

**Agora deve funcionar com preview/player! 🎉**
