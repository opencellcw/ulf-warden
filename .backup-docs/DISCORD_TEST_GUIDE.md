# 🧪 DISCORD TEST GUIDE - Complete Testing Protocol

## 🎯 OBJETIVO:
Testar todas as novas features no Discord em produção.

---

## ✅ PRÉ-REQUISITOS:

1. **Bot Online:**
   ```bash
   kubectl logs -f ulf-warden-agent-dcbb84dc7-lfcdf -n agents
   # Verificar: "✓ Discord handler started (ulf#5291)"
   ```

2. **Você está no Discord:**
   - Server com o bot
   - Permissão para usar comandos
   - DM com o bot aberta

3. **Seu User ID é admin:**
   ```
   DISCORD_ADMIN_USER_IDS contém seu ID
   ```

---

## 📋 TESTES A EXECUTAR:

### **TEST 1: Help Command (Atualizado)**
Verificar se o /help está profissional e completo.

**Comando:**
```
/help
```

**Expected:**
```
✅ Embed aparece com:
   - Título: "🤖 ULF - Advanced AI Assistant"
   - Destaque para novas features
   - Seções organizadas:
     * Unique Features
     * Essential Commands
     * Content Creation (com clone!)
     * Productivity
     * Customization
     * Interactive Features (botões!)
   - Footer profissional
```

**Verificar:**
- [ ] Embed aparece bonito
- [ ] Menciona "Video Clone"
- [ ] Menciona "Interactive Studio"
- [ ] Lista os 6 botões (🔄🎨📐🎬⬆️⬇️)
- [ ] Footer diz "OpenCell v2.5"

---

### **TEST 2: YouTube Video Clone**
Testar análise completa de vídeos.

**Comando:**
```
@ulf clone https://youtube.com/watch?v=dQw4w9WgXcQ
```

**Expected (aguardar 30-60s):**
```
✅ Bot responde com análise completa:
   
# 🎬 VIDEO CLONE ANALYSIS

## 📊 Overview
- Video ID: dQw4w9WgXcQ
- Duration: X:XX
- Scenes: 10

## 🎨 Style Analysis
- Visual Style: ...
- Color Palette: ...
- Editing Style: ...
- Target Audience: ...

## 🎬 Scene Breakdown
[10 cenas detalhadas]

## 📝 Recreation Script
[Script completo]

## 📄 Full Transcript
[Transcript completo]
```

**Verificar:**
- [ ] Resposta chega (30-60s)
- [ ] Contém overview
- [ ] Contém 10 scenes
- [ ] Contém style analysis
- [ ] Contém recreation script
- [ ] Contém transcript
- [ ] Nenhum erro aparece

**Se falhar:**
```bash
# Ver logs
kubectl logs -f ulf-warden-agent-dcbb84dc7-lfcdf -n agents | grep -i "video\|clone\|youtube"

# Procurar por:
# - "[VideoClone] Starting video analysis"
# - "[VideoClone] Fetching transcript"
# - Erros de YouTube API
```

---

### **TEST 3: Image Generation with UI**
Testar geração de imagem + botões automáticos.

**Comando:**
```
@ulf gera um gato pirata com nanobanana pro
```

**Expected (aguardar 5-10s):**
```
✅ Bot responde com:

✅ Image generated! | Nanobanana Pro | $0.0200

https://replicate.delivery/xyz.png

🎨 Content Creation Studio:
Use buttons below to enhance, remix, or animate!

[🔄 Regenerate] [🎨 Remix] [🎬 Create Video]
[📐 Change Ratio] [⬆️ Upscale 4x] [⬇️ Download HD]
```

**Verificar:**
- [ ] Mensagem curta (não verbosa)
- [ ] Contém URL da imagem
- [ ] Imagem aparece (preview)
- [ ] 6 botões aparecem
- [ ] Botões estão em 2 rows
- [ ] Texto dos botões correto

**Se falhar:**
```bash
# Ver logs
kubectl logs -f ulf-warden-agent-dcbb84dc7-lfcdf -n agents | grep -i "replicate\|enhance\|button"

# Procurar por:
# - "[Replicate] Generating image"
# - "[ReplicateEnhancer] Adding UI buttons"
# - Erros de pattern detection
```

---

### **TEST 4: Button - Regenerate**
Testar botão de regenerar.

**Ação:**
```
1. Após TEST 3, clicar [🔄 Regenerate]
```

**Expected (aguardar 5-10s):**
```
✅ Bot responde:

✅ Image generated! | Nanobanana Pro | $0.0200

https://replicate.delivery/xyz-NEW.png

🎨 Content Creation Studio:
Use buttons below to enhance, remix, or animate!

[🔄 Regenerate] [🎨 Remix] [🎬 Create Video]
[📐 Change Ratio] [⬆️ Upscale 4x] [⬇️ Download HD]
```

**Verificar:**
- [ ] Nova imagem diferente da anterior
- [ ] URL mudou
- [ ] Novos botões aparecem
- [ ] Mesmo prompt mantido

---

### **TEST 5: Button - Remix**
Testar menu de remix com estilos.

**Ação:**
```
1. Após TEST 3, clicar [🎨 Remix]
```

**Expected (imediato):**
```
✅ Bot mostra menu dropdown:

🎨 Choose a style for your remix:

[Anime] [Oil Painting] [Cyberpunk] [Watercolor]
[Sketch] [3D Render] [Photorealistic] [Pop Art]
[Studio Ghibli] [Dark Fantasy]
```

**Verificar:**
- [ ] Menu aparece
- [ ] 10 opções visíveis
- [ ] Cada opção tem nome + emoji
- [ ] Menu é selecionável

**Ação 2:**
```
2. Selecionar "Cyberpunk"
```

**Expected (aguardar 5-10s):**
```
✅ Bot responde:

✅ Image generated! | Nanobanana Pro | $0.0200

https://replicate.delivery/xyz-CYBERPUNK.png

[Nova imagem com estilo cyberpunk + botões]
```

**Verificar:**
- [ ] Nova imagem tem estilo cyberpunk
- [ ] Neon, futurístico visível
- [ ] Botões aparecem novamente

---

### **TEST 6: Button - Change Ratio**
Testar mudança de aspect ratio.

**Ação:**
```
1. Após TEST 3, clicar [📐 Change Ratio]
```

**Expected (imediato):**
```
✅ Bot mostra menu:

📐 Choose a new aspect ratio:

[⬛ 1:1 Square - Instagram posts]
[🖼️ 16:9 Landscape - YouTube thumbnails]
[📱 9:16 Portrait - Stories, TikTok]
[📺 4:3 Classic - Classic photo]
[🖼️ 3:4 Portrait - Portrait photos]
[🎬 21:9 Cinematic - Ultra-wide]
```

**Verificar:**
- [ ] Menu aparece
- [ ] 6 opções visíveis
- [ ] Cada uma tem descrição

**Ação 2:**
```
2. Selecionar "16:9 Landscape"
```

**Expected (aguardar 5-10s):**
```
✅ Nova imagem em formato wide (16:9)
```

**Verificar:**
- [ ] Imagem claramente mais larga
- [ ] Aspect ratio 16:9
- [ ] Botões aparecem

---

### **TEST 7: Button - Create Video**
Testar animação de imagem.

**Ação:**
```
1. Após TEST 3, clicar [🎬 Create Video]
```

**Expected (aguardar 60-90s - é lento!):**
```
🎬 Creating video from image... This may take 1-2 minutes.

[Aguardar...]

✅ Video Created Successfully!

🎬 Duration: 3s
💰 Cost: $0.0200

🔗 URL: https://replicate.delivery/video.mp4
```

**Verificar:**
- [ ] Mensagem de loading aparece
- [ ] Após ~90s, vídeo chega
- [ ] URL é .mp4
- [ ] Vídeo é 3 segundos
- [ ] Vídeo é animação da imagem

---

### **TEST 8: Button - Upscale**
Testar upscaling 4x.

**Ação:**
```
1. Após TEST 3, clicar [⬆️ Upscale 4x]
```

**Expected (aguardar 10-15s):**
```
⬆️ Upscaling image to 4x resolution...

[Aguardar...]

✅ Image Upscaled Successfully!

⬆️ Scale: 4x (4x resolution!)
💰 Cost: $0.0020

🔗 High-Res URL: https://replicate.delivery/upscaled.png
```

**Verificar:**
- [ ] Mensagem de loading
- [ ] Após ~15s, imagem chega
- [ ] URL nova
- [ ] Imagem maior (4x resolução)
- [ ] Custo $0.002 (barato)

---

### **TEST 9: Button - Download**
Testar link de download.

**Ação:**
```
1. Após TEST 3, clicar [⬇️ Download HD]
```

**Expected (imediato):**
```
⬇️ Download HD Image

🔗 Direct link: https://replicate.delivery/xyz.png

Right-click → Save Image As...
Or click the link to open in browser.

Original settings:
- Model: Nanobanana Pro
- Ratio: 1:1
- Prompt: gato pirata...
```

**Verificar:**
- [ ] Resposta imediata (não gera nada)
- [ ] URL clicável
- [ ] Metadata presente

---

### **TEST 10: Session Persistence**
Testar se sessões funcionam.

**Ação:**
```
1. Gerar imagem (TEST 3)
2. Aguardar 5 minutos
3. Clicar em qualquer botão
```

**Expected:**
```
✅ Botão ainda funciona (sessão persiste por 1h)
```

**Ação 2:**
```
4. Aguardar 1+ hora
5. Clicar em qualquer botão
```

**Expected:**
```
❌ Session expired. Please generate a new image.
```

**Verificar:**
- [ ] Sessões duram 1 hora
- [ ] Após expirar, mensagem clara

---

## 🐛 TROUBLESHOOTING:

### **Problem: Video clone não funciona**
```bash
# Check logs
kubectl logs -f ulf-warden-agent-dcbb84dc7-lfcdf -n agents | grep -i youtube

# Look for:
# - "youtube-transcript-plus" import errors
# - "Could not fetch transcript"
# - YouTube API rate limits

# Fix:
# - Check if youtube-transcript-plus is installed in production
# - Try different video (some don't have captions)
# - Check network connectivity
```

### **Problem: Botões não aparecem**
```bash
# Check logs
kubectl logs -f ulf-warden-agent-dcbb84dc7-lfcdf -n agents | grep -i "enhance\|button"

# Look for:
# - "[ReplicateEnhancer] Adding UI buttons"
# - Pattern detection errors
# - "Session saved"

# Debug:
# - Check if message matches pattern exactly
# - Verify Redis is connected
# - Check session creation logs
```

### **Problem: Botões não respondem**
```bash
# Check logs when clicking button
kubectl logs -f ulf-warden-agent-dcbb84dc7-lfcdf -n agents | grep -i "interaction\|button"

# Look for:
# - "[ReplicateUI] Button interaction"
# - "Session not found"
# - Handler errors

# Fix:
# - Verify session exists in Redis
# - Check button customId format
# - Verify handler is registered
```

### **Problem: Session expired**
```bash
# Expected after 1 hour
# User should generate new image

# If expiring too fast:
# - Check Redis TTL setting (should be 3600s)
# - Check server time sync
```

---

## 📊 CHECKLIST FINAL:

Após completar todos os testes, preencha:

```
✅ Test 1: /help atualizado e profissional
✅ Test 2: Video clone funcionando
✅ Test 3: Image generation com botões
✅ Test 4: Regenerate funciona
✅ Test 5: Remix com estilos funciona
✅ Test 6: Change ratio funciona
✅ Test 7: Create video funciona
✅ Test 8: Upscale funciona
✅ Test 9: Download funciona
✅ Test 10: Session persistence funciona

Status: ___% (10/10 = 100%)
```

---

## 🎯 SUCCESS CRITERIA:

**Mínimo para passar:**
- [ ] /help mostra novas features ✅
- [ ] Video clone funciona ✅
- [ ] Image generation com botões ✅
- [ ] Pelo menos 4/6 botões funcionam ✅

**Ideal:**
- [ ] Todos os 10 testes passam ✅
- [ ] Nenhum erro nos logs ✅
- [ ] UX é smooth ✅
- [ ] Performance é boa ✅

---

## 📝 REPORTING:

Após testes, criar report:

```markdown
# Test Report - [Data]

## Summary
- Tests executed: X/10
- Tests passed: Y/10
- Success rate: Z%

## Issues Found
1. [Descrever problema]
2. [Descrever problema]

## Logs
[Anexar logs relevantes]

## Next Steps
[O que fazer]
```

---

🧪 **READY TO TEST!** Execute na ordem e registre resultados! 🚀
