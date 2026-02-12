# 🎭 Copy My Style - User Guide

## 🤯 O QUE É?

**Copy My Style** é uma IA que aprende SEU jeito único de escrever e replica perfeitamente!

### Como funciona:

1. **Você conversa normalmente** 💬
2. **Bot analisa tudo automaticamente** 🧠
   - Seu vocabulário
   - Tom e formalidade
   - Estrutura de frases
   - Uso de emojis
   - Padrões de escrita

3. **Depois de 5+ mensagens** 📊
   - Bot já conhece seu estilo
   - Pode escrever EXATAMENTE como você

4. **Você pede para escrever algo** ✍️
   - Bot escreve no SEU estilo
   - Parece que FOI você quem escreveu!

---

## 📝 COMANDOS

### `/copystyle` ou `/copystyle status`
Ver progresso do aprendizado

**Exemplo:**
```
User: /copystyle

Bot: 🎭 Copy My Style - Status

     ⏳ Learning your style...

     📊 Samples collected: 3/5
     💡 I need 2 more samples to learn your style.

     How it works:
     I'm learning from every message you send!
     • Your vocabulary & tone
     • Sentence structure
     • Emoji usage
     • Writing patterns

     Keep chatting normally, I'll learn automatically! 🚀
```

### `/copystyle write <prompt>`
Gerar conteúdo no seu estilo

**Exemplo 1: Email Profissional**
```
User: /copystyle write email to team announcing new feature

Bot: 🎭 Written in your style:

     Subject: New Feature Launch 🚀

     Hey team,

     Wanted to give you a heads up - we're launching the new 
     dashboard feature next Tuesday. It's pretty sick, btw.

     Quick overview:
     • Real-time metrics
     • Custom filters  
     • Mobile-friendly

     Lmk if you have questions!

     Cheers,
     [Your Name]

     _This was generated to match your writing patterns!_
```

**Exemplo 2: Slack Message**
```
User: /copystyle write slack message about deployment success

Bot: 🎭 Written in your style:

     🎉 Deploy successful!

     Production is live with the new changes. Everything 
     looking good so far.

     Zero errors in the logs, response times looking solid 👌

     Nice work team! 🚀

     _This was generated to match your writing patterns!_
```

**Exemplo 3: Código**
```
User: /copystyle write function to validate email

Bot: 🎭 Written in your style:

     // Email validation - keeping it simple 🎯
     function isValidEmail(email: string): boolean {
       // Regex magic ✨
       const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
       return pattern.test(email);
     }

     _This was generated to match your writing patterns!_
```

### `/copystyle analyze`
Ver análise detalhada do seu estilo

**Exemplo:**
```
User: /copystyle analyze

Bot: 🎭 Your Style Analysis

     📊 Based on 47 samples

     Writing Patterns:
     • Formality: Professional/Casual mix
     • Sentence length: Varies naturally
     • Emoji usage: Context-appropriate ✨
     • Tone markers: Friendly and engaging

     What makes you unique:
     Your style combines technical clarity with a 
     conversational tone. You use emojis strategically 
     and keep messages concise but informative.

     Try: /copystyle write <prompt> to see it in action!
```

---

## 🎯 CASOS DE USO

### 1. **Delegar Emails** 📧
```
/copystyle write email to client about project delay
→ Bot escreve como VOCÊ escreveria
→ Você só precisa revisar e enviar
→ Cliente não nota diferença!
```

### 2. **Mensagens Rápidas** 💬
```
/copystyle write slack update about bug fix
→ Mensagem instantânea no seu tom
→ Economiza 5 minutos toda vez
→ Mantém consistência
```

### 3. **Documentação** 📝
```
/copystyle write README for new project
→ Doc escrita no seu estilo
→ Parece que você escreveu
→ Mais rápido e consistente
```

### 4. **Respostas Padrão** 🤖
```
/copystyle write response to meeting request
→ Responde como você responderia
→ Sem perder tempo pensando
→ 100% autêntico
```

### 5. **Brainstorming** 💡
```
/copystyle write 3 ideas for marketing campaign
→ Ideias no SEU estilo de pensar
→ Alinhadas com seu tom
→ Prontas para apresentar
```

---

## 🧠 O QUE O BOT APRENDE

### Escrita:
- ✅ Vocabulário favorito
- ✅ Frases marcantes ("btw", "lol", "fyi")
- ✅ Tamanho de frases (curtas/longas)
- ✅ Nível de formalidade
- ✅ Uso de emojis
- ✅ Estilo de pontuação ("...", "!!!")

### Código:
- ✅ Indentação (tabs/spaces)
- ✅ Naming (camelCase/snake_case)
- ✅ Frequência de comments
- ✅ Tamanho de funções
- ✅ Padrões preferidos

### Decisões:
- ✅ Tolerância a risco
- ✅ Nível de detalhe
- ✅ Bias para ação/análise

---

## 📊 PROGRESSO

### Fase 1: Coleta (0-5 mensagens)
```
⏳ Learning...
Keep chatting normally!
```

### Fase 2: Pronto (5+ mensagens)
```
✅ Ready!
Can write in your style now!
```

### Fase 3: Melhoria (10+ mensagens)
```
🔥 Optimized!
Style replication getting better!
```

### Fase 4: Expert (50+ mensagens)
```
🎯 Master!
Writes EXACTLY like you!
```

---

## 🎭 ANTES vs DEPOIS

### ANTES (Bot genérico):
```
User: Write email about new feature

Bot: Dear Team,

     I am writing to inform you about the new feature 
     that will be released next week. This feature 
     includes several improvements to the dashboard.

     Please let me know if you have any questions.

     Best regards
```

**Problema:** Formal demais, não parece com você!

### DEPOIS (Copy My Style):
```
User: /copystyle write email about new feature

Bot: Hey team! 🚀

     Quick update - we're shipping the new dashboard 
     feature next week and it's looking pretty sick.

     Main highlights:
     • Real-time data (finally!)
     • Way faster UX
     • Mobile works great now

     Lmk if you wanna see a demo before launch!

     Cheers
```

**Resultado:** Parece QUE VOCÊ escreveu! 🎉

---

## 🔒 PRIVACIDADE

### O que é armazenado:
- ✅ Padrões de escrita (vocabulário, tom)
- ✅ Estrutura de frases
- ✅ Preferências de estilo

### O que NÃO é armazenado:
- ❌ Conteúdo específico das mensagens
- ❌ Informações sensíveis
- ❌ Dados pessoais

**Dados ficam:**
- Em memória local do bot
- Associados ao seu user ID
- Só você tem acesso

---

## 💡 DICAS PRO

### 1. Varie o conteúdo
Mande mensagens diferentes para o bot aprender melhor:
- Mensagens curtas e longas
- Casual e formal
- Com e sem emojis
- Perguntas e afirmações

### 2. Seja você mesmo
Não tente "treinar" o bot:
- Escreva naturalmente
- Use seu vocabulário normal
- Mantenha seu tom habitual

### 3. Ajuste o output
Depois que o bot gera, você pode pedir ajustes:
```
/copystyle write email about meeting
→ Bot gera
→ "Make it more formal"
→ Bot ajusta no seu estilo formal
```

### 4. Use para templates
Crie templates no seu estilo:
```
/copystyle write meeting follow-up template
→ Salva como template
→ Usa sempre que precisar
```

### 5. Combine com outros comandos
```
/search kubernetes error
→ Encontra resultados
→ /copystyle write summary of search results
→ Summary no seu estilo!
```

---

## 🚀 PRÓXIMAS FEATURES

### Em desenvolvimento:
- [ ] Copy code style (replicar seu estilo de código)
- [ ] Copy decision style (replicar decisões)
- [ ] Multi-style (diferentes estilos para diferentes contextos)
- [ ] Style sharing (compartilhar style profiles)
- [ ] Style evolution (ver como seu estilo muda)

---

## ❓ FAQ

**Q: Quantas mensagens preciso enviar?**
A: Mínimo 5 para começar. Quanto mais, melhor!

**Q: Posso ter múltiplos estilos?**
A: Atualmente não, mas está nos planos!

**Q: O bot aprende de mensagens antigas?**
A: Sim, de todas as mensagens que você mandar a partir de agora.

**Q: Posso resetar meu estilo?**
A: Sim! Use `/copystyle reset` (futuro).

**Q: Funciona para código?**
A: Sim! Bot aprende seu estilo de código também.

**Q: É privado?**
A: 100%! Dados ficam locais e só você acessa.

---

## 🎯 CONCLUSÃO

**Copy My Style = Seu Clone de IA! 🤯**

- ✅ Aprende automaticamente
- ✅ Escreve como você
- ✅ Economiza tempo
- ✅ Mantém consistência
- ✅ 100% privado

**Start usando:**
```bash
1. Converse normalmente (5+ mensagens)
2. /copystyle status (ver progresso)
3. /copystyle write <prompt> (testar!)
4. Profit! 🚀
```

---

**Status:** ✅ FUNCIONANDO
**Privacy:** 🔒 100% Seguro
**Magic:** 🎭 Indistinguível de você!
