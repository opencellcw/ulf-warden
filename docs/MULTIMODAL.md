# 🎨 Capacidades Multimodais - Ulfberht-Warden

## 🎯 Visão Geral

O Ulf agora tem **superpoderes multimodais** com 3 APIs integradas:

1. **🎨 Replicate** - Geração de imagens, vídeos, e centenas de modelos
2. **🎤 ElevenLabs** - Text-to-Speech de alta qualidade
3. **🤖 OpenAI** - GPT-4, DALL-E, Whisper, Vision

**Total: 13 novos tools!**

---

## 🎨 Replicate (5 tools)

### `replicate_generate_image`
Gera imagens com IA usando vários modelos.

**Modelos disponíveis:**
- **flux-schnell** - Super rápido (padrão)
- **sdxl** - Alta qualidade, realista
- **stable-diffusion** - Clássico

**Exemplos de uso:**
```
Prompt: "Gera uma imagem de um gato astronauta"
Prompt: "Create a futuristic city with neon lights"
Prompt: "Abstract art with vibrant colors", model="sdxl"
```

### `replicate_generate_video`
Gera vídeos a partir de texto ou imagens.

**Funcionalidades:**
- Text-to-video: Descrição → Vídeo
- Image-to-video: Anima imagens estáticas

**Exemplos:**
```
Prompt: "Cria um vídeo de ondas na praia"
Prompt: "Animate this image", image_url="https://..."
```

### `replicate_run_model`
Executa **qualquer modelo** do Replicate com parâmetros customizados.

**Exemplos:**
```
model="meta/llama-3-70b-instruct"
input={"prompt": "Hello world"}

model="stability-ai/sdxl"
input={"prompt": "a cat", "width": 1024, "height": 1024}
```

**Explore modelos:** https://replicate.com/explore

### `replicate_upscale_image`
Aumenta a resolução de imagens com IA.

**Escalas:** 2x, 4x, 8x

**Exemplo:**
```
image_url="https://example.com/small.jpg"
scale=4
```

### `replicate_remove_background`
Remove fundo de imagens automaticamente.

**Exemplo:**
```
image_url="https://example.com/photo.jpg"
```

Retorna PNG com fundo transparente.

---

## 🎤 ElevenLabs (3 tools)

### `elevenlabs_text_to_speech`
Converte texto em fala natural.

**Vozes disponíveis:**
- `rachel` (padrão) - Feminina, clara
- `adam` - Masculina, profunda
- `bella` - Feminina, jovem
- `josh` - Masculina, amigável
- `matilda` - Feminina, britânica
- E mais...

**Modelos:**
- `eleven_multilingual_v2` (padrão) - Multi-idioma
- `eleven_turbo_v2` - Mais rápido

**Exemplos:**
```
text="Olá, como está?"
text="Welcome to our podcast", voice="adam"
text="This is a test", voice="bella", model="eleven_turbo_v2"
```

### `elevenlabs_list_voices`
Lista todas as vozes disponíveis.

### `elevenlabs_get_voice_info`
Detalhes sobre uma voz específica.

---

## 🤖 OpenAI (4 tools)

### `openai_generate_image`
Gera imagens com DALL-E 2 ou DALL-E 3.

**Modelos:**
- `dall-e-3` - Melhor qualidade (padrão)
- `dall-e-2` - Mais rápido, mais barato

**Tamanhos:**
- `1024x1024` (padrão)
- `1024x1792` (vertical)
- `1792x1024` (horizontal)
- `256x256`, `512x512` (DALL-E 2)

**Qualidade (DALL-E 3):**
- `standard` (padrão)
- `hd` - Alta definição

**Exemplos:**
```
prompt="A cat wearing sunglasses"
prompt="Futuristic city", size="1792x1024", quality="hd"
prompt="Coffee shop interior", model="dall-e-2"
```

### `openai_gpt_chat`
Usa GPT-4 ou GPT-3.5 para tarefas complexas.

**Modelos:**
- `gpt-4-turbo` (padrão)
- `gpt-4`
- `gpt-3.5-turbo`

**Quando usar:**
- Perspectiva diferente do Claude
- Comparar respostas
- Tarefas específicas do GPT

**Exemplos:**
```
prompt="Explain quantum physics simply"
prompt="Write a poem about the ocean", model="gpt-4"
prompt="Summarize this article", max_tokens=500
```

### `openai_transcribe_audio`
Converte áudio em texto com Whisper.

**Formatos suportados:**
- MP3, MP4, WAV, M4A, e mais

**Idiomas:**
- Auto-detecção
- Ou especifique: `language="pt"`

**Exemplos:**
```
file_url="https://example.com/audio.mp3"
file_path="/path/to/audio.wav"
file_url="...", language="pt"
```

### `openai_analyze_image`
Analisa imagens com GPT-4 Vision.

**O que pode fazer:**
- Descrever imagens
- Responder perguntas sobre imagens
- Ler texto em imagens
- Identificar objetos, pessoas, cenas

**Exemplos:**
```
image_url="https://example.com/photo.jpg"
image_url="...", prompt="What's happening in this image?"
image_url="...", prompt="Read the text from this screenshot"
image_url="...", prompt="Is there a dog in this photo?"
```

---

## 🚀 Como Usar

### 1. Configurar API Keys

Adicione no `.env`:

```env
# OpenAI (GPT, DALL-E, Whisper)
OPENAI_API_KEY=sk-proj-...

# Replicate (Imagens, Vídeos)
REPLICATE_API_TOKEN=r8_...

# ElevenLabs (Text-to-Speech)
ELEVENLABS_API_KEY=sk_...
```

### 2. Restart o Bot

```bash
npm run build
npm start
```

### 3. Usar no Slack/Discord

```
# Gerar Imagem
@Ulf gera uma imagem de um cachorro surfando

# Gerar Vídeo
@Ulf cria um vídeo de um pôr do sol

# Text-to-Speech
@Ulf converte "Hello world" para áudio com voz rachel

# Análise de Imagem
@Ulf analisa essa imagem: https://example.com/photo.jpg

# DALL-E
@Ulf usa DALL-E 3 para criar uma arte abstrata

# GPT-4
@Ulf pergunta pro GPT-4: o que é mecânica quântica?

# Transcrever Áudio
@Ulf transcreve esse áudio: https://example.com/speech.mp3
```

---

## 💡 Exemplos Práticos

### Criar Thumbnail de Vídeo
```
1. @Ulf gera uma imagem: "YouTube thumbnail for tech video, vibrant colors"
2. @Ulf remove o fundo dessa imagem
3. @Ulf aumenta 4x a resolução
```

### Criar Podcast
```
1. @Ulf escreve um roteiro de podcast sobre IA
2. @Ulf converte para áudio com voz adam
3. Resultado: MP3 pronto para usar!
```

### Animar Logo
```
1. @Ulf remove fundo do logo
2. @Ulf cria vídeo animando essa imagem
3. Resultado: Vídeo de logo animado
```

### Transcrever e Resumir Reunião
```
1. @Ulf transcreve essa gravação: [URL]
2. @Ulf resume a transcrição em bullet points
```

---

## 📊 Custos

### Replicate
- Imagem (Flux): ~$0.003/imagem
- Vídeo: ~$0.02-0.10/vídeo
- Upscale: ~$0.01/imagem

### ElevenLabs
- TTS: ~$0.30/1K caracteres
- Voices: Ilimitado (listar)

### OpenAI
- DALL-E 3 (HD): $0.080/imagem
- DALL-E 3 (standard): $0.040/imagem
- GPT-4 Turbo: $0.01/1K tokens input
- Whisper: $0.006/minuto

**Total:** Super acessível! 🎉

---

## 🎯 Modelos Populares do Replicate

### Imagens
```
stability-ai/sdxl
black-forest-labs/flux-schnell
stability-ai/stable-diffusion
```

### Vídeos
```
stability-ai/stable-video-diffusion
lucataco/animate-diff
```

### Utilidades
```
nightmareai/real-esrgan (upscale)
cjwbw/rembg (remove background)
```

### Outros
```
meta/llama-3-70b-instruct (LLM)
fofr/face-to-sticker (criar stickers)
replicate/all-mpnet-base-v2 (embeddings)
```

**Browse:** https://replicate.com/explore

---

## 🔧 Troubleshooting

### "API key not configured"
```env
# Verifique .env:
REPLICATE_API_TOKEN=r8_...
ELEVENLABS_API_KEY=sk_...
OPENAI_API_KEY=sk-proj-...
```

### Geração de imagem falha
- Verifique créditos da API
- Prompt pode violar políticas
- Tente modelo diferente

### Áudio não salva
- Verifique permissões do diretório `./data/audio/`
- Espaço em disco disponível

### Transcrição falha
- Arquivo deve ser < 25MB
- Formato suportado (MP3, WAV, etc)
- URL deve ser acessível

---

## 🎉 Resumo

**O Ulf agora pode:**
- ✅ Gerar imagens (3 métodos: Replicate, DALL-E 2, DALL-E 3)
- ✅ Gerar vídeos
- ✅ Converter texto em fala (9 vozes+)
- ✅ Transcrever áudio
- ✅ Analisar imagens
- ✅ Upscale imagens
- ✅ Remover fundos
- ✅ Rodar centenas de modelos customizados
- ✅ Usar GPT-4 para tarefas específicas

**13 novos tools multimodais! 🚀**

---

## 📚 Referências

- [Replicate](https://replicate.com)
- [ElevenLabs](https://elevenlabs.io)
- [OpenAI](https://openai.com)
- [Replicate Models](https://replicate.com/explore)
- [ElevenLabs Voices](https://elevenlabs.io/voice-library)
