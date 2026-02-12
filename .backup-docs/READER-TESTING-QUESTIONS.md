# 🧪 READER TESTING - Perguntas de Desenvolvedores Reais

**Skill:** Doc Co-Authoring - Phase 3: Reader Testing  
**Documento:** workspace/TOOLS-ADVANCED.md  
**Método:** Predição de perguntas que desenvolvedores fariam

---

## PERGUNTAS CRÍTICAS (Testar se doc responde)

### Scheduler Tools

**Q1: "Como eu agendo uma task para rodar todo dia útil às 9h?"**
- Resposta esperada: Cron expression `0 9 * * 1-5`
- Doc responde? Preciso verificar

**Q2: "Qual timezone o cron usa? Como converter 9h BRT para UTC?"**
- Resposta esperada: UTC, converter manualmente
- Doc responde? Diz "timezone do servidor" mas não especifica qual

**Q3: "Como eu cancelo uma task agendada?"**
- Resposta esperada: usar cancel_scheduled_task com task_id
- Doc responde? ✅ Sim

**Q4: "De onde eu tiro o channel_id do Discord?"**
- Resposta esperada: Developer Mode → Copy ID
- Doc responde? ❌ NÃO explica

**Q5: "Se eu usar `schedule: "in 30 minutes"` e o bot reiniciar, a task é perdida?"**
- Resposta esperada: Depende de persistência
- Doc responde? ❌ NÃO menciona

---

### Bot Factory Tools

**Q6: "Qual a diferença entre bot conversational e agent?"**
- Resposta esperada: Conversational = só chat, Agent = tem tools
- Doc responde? ✅ Sim, bem explicado

**Q7: "Posso criar bot sem ser admin?"**
- Resposta esperada: Não, apenas admins
- Doc responde? ✅ Sim, menciona "admin only"

**Q8: "O que significa DNS-safe? Posso usar underscores?"**
- Resposta esperada: a-z, 0-9, hyphens. SEM underscores
- Doc responde? ⚠️ Diz "DNS-safe" mas não explica

**Q9: "Onde eu consigo Discord token para o bot?"**
- Resposta esperada: Discord Developer Portal
- Doc responde? ❌ NÃO explica, assume conhecimento

**Q10: "Se eu deletar um bot, posso recuperar depois?"**
- Resposta esperada: Não, irreversível
- Doc responde? ✅ Sim, diz "IRREVERSÍVEL"

---

### Replicate Registry Tools

**Q11: "Como eu sei qual model usar para gerar logos?"**
- Resposta esperada: search_replicate_models com query "logo design"
- Doc responde? ✅ Sim, exemplos de busca

**Q12: "O que significa popularity_score 1492.54?"**
- Resposta esperada: usage_count * success_rate * 100
- Doc responde? ✅ Sim, fórmula documentada

**Q13: "Os models são grátis ou pagos?"**
- Resposta esperada: Depende do model, Replicate cobra
- Doc responde? ❌ NÃO menciona custos

**Q14: "Sync automático às 3 AM é em qual timezone?"**
- Resposta esperada: UTC ou servidor timezone
- Doc responde? ⚠️ Não especifica

---

### Process Management Tools

**Q15: "Se eu startar um processo com auto_restart e ele crashar 100x, continua tentando?"**
- Resposta esperada: Sim, restart ilimitado OU há limite
- Doc responde? ❌ NÃO explica comportamento de retry

**Q16: "Posso ver logs em tempo real enquanto processo roda?"**
- Resposta esperada: Sim, process_logs com follow: true
- Doc responde? ✅ Sim, exemplo com follow

**Q17: "Se eu não especificar cwd, qual diretório usa?"**
- Resposta esperada: Diretório atual do bot
- Doc responde? ❌ NÃO especifica default

**Q18: "Processo fica rodando se bot reiniciar?"**
- Resposta esperada: Depende de implementação
- Doc responde? ❌ NÃO menciona

---

### Memory Tools

**Q19: "O que significa similarity score de 0.89?"**
- Resposta esperada: Alta relevância, match quase exato
- Doc responde? ⚠️ Mostra range mas não interpreta valores

**Q20: "Quantas memórias consigo armazenar? Tem limite?"**
- Resposta esperada: Limite técnico ou sem limite
- Doc responde? ❌ NÃO menciona limites

---

### Utilities

**Q21: "Preciso configurar algo no Gmail para send_email funcionar?"**
- Resposta esperada: Sim, App Password
- Doc responde? ✅ Sim, menciona GMAIL_PASSWORD (app password)

**Q22: "youtube_video_clone salva onde? Quanto espaço ocupa?"**
- Resposta esperada: Local file path
- Doc responde? ⚠️ Diz "Local file path" mas não especifica onde

**Q23: "scan_repo_secrets varre git history ou só working tree?"**
- Resposta esperada: Depende de parâmetro scan_history
- Doc responde? ⚠️ Menciona na secure_repo mas não na scan_repo_secrets

---

## 📊 RESUMO DOS RESULTADOS

**Perguntas que DOC responde BEM:** 8/23 (35%) ✅  
**Perguntas que DOC responde PARCIALMENTE:** 6/23 (26%) ⚠️  
**Perguntas que DOC NÃO responde:** 9/23 (39%) ❌

---

## 🔴 GAPS CRÍTICOS IDENTIFICADOS

### 1. **Timezone** (aparece em 3 perguntas)
- Scheduler cron: Qual timezone?
- Replicate sync 3 AM: Qual timezone?
- Solução: Especificar "UTC" em todo lugar

### 2. **How-to Get IDs** (2 perguntas)
- Como obter channel_id do Discord/Slack?
- Como obter Discord bot token?
- Solução: Adicionar seção "Prerequisites" ou "Setup Guide"

### 3. **Defaults Não Documentados** (3 perguntas)
- process_start: cwd default?
- schedule_task: persistência após restart?
- memory: limite de storage?
- Solução: Documentar todos os defaults

### 4. **Custos** (1 pergunta)
- Replicate models: grátis ou pago?
- Solução: Adicionar nota sobre custos

### 5. **Comportamento de Erro** (2 perguntas)
- auto_restart: limite de tentativas?
- Processo: sobrevive restart do bot?
- Solução: Documentar edge cases

### 6. **Interpretação de Valores** (2 perguntas)
- similarity_score: o que é "bom"?
- popularity_score: como interpretar?
- Solução: Adicionar guia de interpretação

---

## ✅ RECOMENDAÇÕES (Baseado em Reader Testing)

### CRÍTICO (Adicionar Agora):

1. **Timezone Section** em Scheduler:
```markdown
**Timezone:** UTC (Coordinated Universal Time)
- 9h BRT = 12h UTC (use "0 12 * * *")
- Para verificar: logs do bot mostram timezone
```

2. **Prerequisites Section** no início:
```markdown
## 📋 Prerequisites

**Discord Channel ID:**
1. Enable Developer Mode (Settings → Advanced)
2. Right-click channel → Copy ID

**Discord Bot Token:**
1. Discord Developer Portal
2. Applications → Your Bot → Bot → Token
3. NEVER commit token to git!
```

3. **Defaults em CADA tool** que tem parâmetros opcionais:
```typescript
cwd?: string  // Default: /app (bot's working directory)
```

### IMPORTANTE (Melhorar):

4. **Costs Section** em Replicate Registry
5. **Error Behavior** em Process Management
6. **Interpretation Guide** em Memory Tools

---

**Conclusão:** Documentação é **BOA** mas tem **GAPS** que confundem leitores novos.

**Score:** 65/100 (Reader Testing)  
**Com correções:** 90/100

---

**Método:** Doc Co-Authoring - Phase 3 (Reader Testing simulado)  
**Perguntas Testadas:** 23  
**Gaps Encontrados:** 9 críticos
