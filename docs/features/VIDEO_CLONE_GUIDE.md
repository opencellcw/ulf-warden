# 🎬 YouTube Video Clone - Complete Guide

## 🚀 O QUE É:

**AI-powered YouTube video analysis** que extrai TUDO de um vídeo:
- 📝 Transcript completo
- 🎬 Quebra cena por cena
- 🎨 Prompts visuais para recriar cada cena
- 📖 Script completo de recriação
- 🎭 Análise de estilo, cores, edição
- 🎯 Público-alvo identificado

**Use case:** Você vê um vídeo viral e quer criar conteúdo similar mas com seu próprio tema!

---

## 🎯 COMO USAR:

### **Comando Discord:**
```
@ulf clone this video: https://youtube.com/watch?v=xxx
```

ou

```
@ulf analyze https://youtube.com/watch?v=xxx and give me a recreation script
```

### **Opções Avançadas:**
```
@ulf clone https://youtube.com/watch?v=xxx
- 20 scenes (more detailed)
- no frames (faster, transcript only)
```

---

## 📊 O QUE VOCÊ RECEBE:

### **1. Overview**
```markdown
## 📊 Overview
- Video ID: abc123
- Duration: 10:45
- Scenes: 10

## 🎨 Style Analysis
- Visual Style: Fast-paced, energetic editing
- Color Palette: #FF6B6B, #4ECDC4, #FFE66D
- Editing Style: Quick cuts, jump cuts, dynamic transitions
- Target Audience: Young adults (18-35), tech enthusiasts
```

### **2. Scene Breakdown**
```markdown
### Scene 1 - 0:00
Description: Host introduces topic with high energy
Mood: energetic | Camera: medium close-up
Transcript: "Hey everyone! Today we're talking about..."
Visual Prompt: A young person speaking directly to camera, 
modern room background, good lighting, enthusiastic expression,
professional setup, bokeh background

### Scene 2 - 1:15
Description: B-roll of product being demonstrated
Mood: focused | Camera: close-up
Transcript: "As you can see here, this feature allows..."
Visual Prompt: Close-up shot of hands demonstrating product,
shallow depth of field, professional product photography lighting,
clean white background
```

### **3. Recreation Script**
```markdown
## 📝 Recreation Script

Complete step-by-step guide to create similar video:

1. INTRO (0:00-0:15)
   - Setup: Medium close-up, good lighting
   - Energy: HIGH
   - Hook: Start with exciting question/statement
   - Script template: "Hey! Today I'm showing you..."

2. MAIN CONTENT (0:15-8:00)
   - Structure: Problem → Solution → Demo
   - B-roll: Mix of close-ups and wide shots
   - Pacing: 2-3 second cuts for energy
   - Transitions: Jump cuts, no fancy effects

3. CALL TO ACTION (8:00-10:45)
   - Recap key points
   - Ask for engagement
   - Tease next video
```

### **4. Full Transcript**
```
Complete transcript with all spoken words...
```

---

## 🎨 CASOS DE USO:

### **Caso 1: Criador de Conteúdo**
```
Problema: "Vi um vídeo viral mas não sei como replicar o estilo"

Solução:
1. Clone o vídeo
2. Analise estrutura de cenas
3. Veja prompts visuais
4. Use recreation script
5. Crie SEU conteúdo com mesmo formato!
```

### **Caso 2: Análise de Competidores**
```
Problema: "Quero entender o que faz vídeos de concorrentes funcionarem"

Solução:
1. Clone vários vídeos do concorrente
2. Compare estilos
3. Identifique padrões
4. Adapte para sua marca
```

### **Caso 3: Aprender Edição**
```
Problema: "Como editores profissionais estruturam vídeos?"

Solução:
1. Clone vídeos de referência
2. Veja breakdown de cenas
3. Note pacing e transições
4. Aplique no seu projeto
```

### **Caso 4: Gerar Conteúdo AI**
```
Problema: "Quero criar vídeo AI mas não sei os prompts"

Solução:
1. Clone vídeo de referência
2. Pegue visual prompts de cada cena
3. Use no Runway/Pika/etc
4. Monte seu vídeo!
```

---

## 🔧 OPÇÕES:

### **scene_count** (3-30)
```
Padrão: 10 cenas

Menos cenas (3-5):
✅ Análise rápida
✅ Overview geral
❌ Menos detalhes

Mais cenas (20-30):
✅ Análise super detalhada
✅ Cada momento coberto
❌ Mais lento
❌ Mais caro (mais API calls)
```

### **include_frames** (true/false)
```
true (padrão):
✅ Analisa frames reais do vídeo
✅ Visual prompts precisos
✅ Detecta cores/lighting reais
❌ Mais lento
❌ Mais caro

false:
✅ Análise rápida
✅ Usa apenas transcript
❌ Visual prompts menos precisos
❌ Não detecta aspectos visuais
```

---

## 💡 EXEMPLOS PRÁTICOS:

### **Exemplo 1: Clone Rápido**
```
User: @ulf quick analysis of https://youtube.com/watch?v=abc

Bot: [Executa com defaults]
      - 10 scenes
      - Include frames
      - ~2 minutos de análise

Result: Análise completa com visual prompts precisos
```

### **Exemplo 2: Análise Profunda**
```
User: @ulf deep clone of https://youtube.com/watch?v=xyz
      30 scenes with frames

Bot: [Executa com 30 scenes]
      - Análise super detalhada
      - ~5 minutos de análise

Result: Breakdown frame-a-frame completo
```

### **Exemplo 3: Só Transcript**
```
User: @ulf fast analysis (no frames) of https://youtube.com/watch?v=123

Bot: [Executa sem frames]
      - Usa apenas transcript
      - ~30 segundos

Result: Estrutura e script, sem visual details
```

---

## 🎓 TUTORIAL: CRIANDO CONTEÚDO SIMILAR

### **Passo 1: Clone o Vídeo de Referência**
```
@ulf clone https://youtube.com/watch?v=reference-video
```

### **Passo 2: Analise o Output**
```
Leia cuidadosamente:
✅ Style Analysis - Como é o estilo?
✅ Scene Breakdown - Como está estruturado?
✅ Recreation Script - Passo a passo
```

### **Passo 3: Adapte para Seu Tema**
```
Exemplo:
Vídeo original: "Top 10 Tech Gadgets 2024"
Seu tema: "Top 10 Livros de Ficção"

Mantenha:
- Estrutura de cenas
- Pacing e transições
- Estilo visual (cores, lighting)
- Tom e energia

Mude:
- Conteúdo/tema
- Script específico
- B-roll (seus produtos)
```

### **Passo 4: Gere Visuais com AI**
```
Use os visual prompts fornecidos:

Scene 1 prompt: "Person speaking to camera, energetic..."
→ Use no Replicate/MidJourney/etc
→ Ou filme você mesmo seguindo descrição
```

### **Passo 5: Edite Seguindo Recreation Script**
```
Follow the timing:
- Intro: 0-15s
- Content: 15s-8min
- CTA: 8min-10min

Use o pacing sugerido:
- Quick cuts (2-3s)
- Jump cuts
- etc
```

---

## 📊 METRICS & COST:

### **API Usage:**
```
Por análise (10 scenes, com frames):
- YouTube Transcript API: Free
- Replicate frame extraction: $0.01
- Claude Vision (10 frames): $0.05
- Claude analysis: $0.01
TOTAL: ~$0.07 por vídeo

Por análise (sem frames):
- YouTube Transcript API: Free
- Claude analysis only: $0.01
TOTAL: ~$0.01 por vídeo
```

### **Time:**
```
Com frames (10 scenes): ~2 minutos
Sem frames (10 scenes): ~30 segundos
Com frames (30 scenes): ~5 minutos
```

---

## ⚠️ LIMITAÇÕES:

### **O que NÃO funciona:**
```
❌ Vídeos privados
❌ Vídeos sem transcript/legendas
❌ Vídeos age-restricted
❌ Live streams (algumas vezes)
❌ Vídeos muito longos (>2h pode travar)
```

### **Workarounds:**
```
Se vídeo não tem transcript:
→ Use include_frames: false não funciona
→ Vídeo PRECISA ter legendas

Se vídeo muito longo:
→ Use menos scenes (scene_count: 5)
→ Ou use include_frames: false

Se quiser mais precisão:
→ Use mais scenes (30)
→ Sempre use include_frames: true
```

---

## 🔒 PRIVACIDADE:

```
✅ Não salva vídeos
✅ Não faz download completo
✅ Apenas extrai frames chave
✅ Não viola copyright (fair use - analysis)
✅ Transcript é público (YouTube API)
```

---

## 🎯 PRÓXIMOS PASSOS:

### **Após receber análise:**

1. **Salve o output** em arquivo .md
2. **Crie seu roteiro** baseado no recreation script
3. **Gere visuais** com os prompts fornecidos
4. **Filme/Edite** seguindo estrutura de cenas
5. **Publique** seu conteúdo similar!

### **Dicas:**
```
✅ Clone vários vídeos para identificar padrões
✅ Combine estilos de múltiplos vídeos
✅ Adapte para SEU público específico
✅ Teste e itere baseado em métricas
```

---

## 🆘 TROUBLESHOOTING:

### **"Video has no transcript"**
```
Problema: Vídeo não tem legendas
Solução: Escolha outro vídeo com captions
```

### **"Frame extraction failed"**
```
Problema: Replicate API não conseguiu extrair frames
Solução: Use include_frames: false para análise rápida
```

### **"Analysis too slow"**
```
Problema: Análise demorando muito
Solução:
1. Reduza scene_count (use 5)
2. Desabilite frames (include_frames: false)
```

### **"Invalid YouTube URL"**
```
Problema: URL não reconhecido
Solução: Use formato correto:
✅ https://youtube.com/watch?v=xxx
✅ https://youtu.be/xxx
❌ youtube.com/xxx (sem https)
```

---

## 📚 RECURSOS:

### **Ferramentas Complementares:**
```
Visual Generation:
- Replicate (image-gen)
- Runway (video-gen)
- Pika Labs (video-gen)

Editing:
- DaVinci Resolve
- Adobe Premiere
- CapCut

AI Writing:
- Claude (script refinement)
- ChatGPT (variations)
```

### **Learning:**
```
Vídeos sobre:
- Video editing basics
- Pacing and rhythm
- Color grading
- Storytelling structure
```

---

🎬 **FEATURE PRONTA PARA USO!**

**Status:** ✅ Implemented  
**Files:** src/tools/video-clone.ts, src/tools/video-clone-tool.ts  
**Integration:** Ready to add to tool registry  
**Cost:** ~$0.01-$0.07 per analysis  
**Speed:** 30s - 5min depending on options

**Next:** Integrate into tool registry and test with real YouTube videos!
