# 🎙️ Voice-to-Voice Conversation System

**Status:** ✅ **IMPLEMENTADO E FUNCIONAL**  
**Version:** 1.0  
**Data:** 12 Fevereiro 2026

---

## 🎯 O Que É

Sistema de **conversa fluida por voz** no Discord. O bot:

1. 🎧 **Entra no canal de voz** e começa a ouvir
2. 🎤 **Detecta automaticamente** quando você para de falar (silêncio)
3. 📝 **Transcreve sua fala** para texto (Whisper via Groq)
4. 🤖 **Processa com Claude** Opus 4
5. 🔊 **Gera resposta em voz** (ElevenLabs TTS)
6. 📢 **Fala a resposta** no canal de voz
7. 🔄 **Continua ouvindo** automaticamente (loop infinito)

**= CONVERSA NATURAL E FLUIDA!** Como falar com uma pessoa real! 🗣️

---

## 🚀 Quick Start

### 1. Configure API Keys

```bash
# .env
GROQ_API_KEY=gsk_...           # Whisper (Speech-to-Text)
ELEVENLABS_API_KEY=sk_...      # TTS (Text-to-Speech)
ANTHROPIC_API_KEY=sk-ant-...   # Claude (LLM)
```

### 2. Compile

```bash
npm run build
npm start
```

### 3. Use no Discord

```
1. Entre em um canal de voz
2. Digite: "Ulf, entrar no canal" ou "conversa de voz"
3. Fale normalmente!
4. Bot vai ouvir → processar → responder em voz
5. Continue falando, é um loop!
```

**Pronto!** Você está conversando por voz com o bot! 🎉

---

## 🎤 Comandos

### Entrar no Canal

```
"Ulf, entrar no canal"
"Ulf, join voice"
"Ulf, conversa de voz"
"Ulf, vem no voice"
"Ulf, vem aqui"
```

**O que acontece:**
- ✅ Bot entra no seu canal de voz
- ✅ Começa a ouvir tudo que você fala
- ✅ Responde automaticamente por voz
- ✅ Loop contínuo (não precisa chamar de novo)

### Sair do Canal

```
"Ulf, sair do canal"
"Ulf, leave voice"
"Ulf, desconectar"

Ou fale no canal de voz:
"Sair do canal"
"Desconectar"
```

---

## 🔄 Fluxo de Conversa

```
Você: [Fala no voice] "Oi Ulf, como você está?"

Bot:
  1. 🎧 Detecta que você falou
  2. ⏱️ Aguarda 1s de silêncio (você terminou)
  3. 📝 Transcreve: "Oi Ulf, como você está?"
  4. 💬 Envia no chat: "🎤 User: Oi Ulf, como você está?"
  5. 🤖 Claude processa
  6. 💭 Gera resposta: "Oi! Estou bem, obrigado! E você?"
  7. 💬 Envia no chat: "🤖 Bot: Oi! Estou bem, obrigado! E você?"
  8. 🔊 Gera TTS (ElevenLabs)
  9. 📢 Fala no canal: "Oi! Estou bem, obrigado! E você?"
  10. 🔄 Volta a ouvir automaticamente

Você: [Fala de novo] "Tudo certo! Você pode me ajudar com algo?"

Bot: [Repete o ciclo...]
```

**Loop infinito!** Conversa natural e fluida! 🎙️

---

## ⚙️ Configuração

### FluentVoiceConfig

```typescript
{
  language: 'pt',           // 'pt' ou 'en'
  ttsVoice: 'Rachel',       // ElevenLabs voice ID
  vadSensitivity: 0.6,      // 0-1 (sensitivity)
  responseDelay: 500        // ms antes de responder
}
```

### Ajustar Sensibilidade

```typescript
// Mais sensível (detecta falas mais baixas)
const conversation = new FluentVoiceConversation(claude, {
  vadSensitivity: 0.8
});

// Menos sensível (só detecta falas mais altas)
const conversation = new FluentVoiceConversation(claude, {
  vadSensitivity: 0.4
});
```

### Delay de Resposta

```typescript
// Responde imediatamente (pode parecer robótico)
responseDelay: 0

// Responde após 0.5s (mais natural)
responseDelay: 500

// Responde após 1s (muito natural)
responseDelay: 1000
```

---

## 🏗️ Arquitetura

### Componentes

```
┌─────────────────────────────────────────────┐
│     FluentVoiceConversation                 │
│  (Orchestrator - gerencia tudo)             │
└─────────┬───────────────────────┬───────────┘
          │                       │
    ┌─────▼────────┐      ┌──────▼─────────┐
    │ VoiceHandler │      │  SpeechToText  │
    │  (Discord)   │      │   (Groq)       │
    └──────┬───────┘      └────────────────┘
           │
    ┌──────▼───────┐
    │ AudioPlayer  │
    │ (ElevenLabs) │
    └──────────────┘
```

### Fluxo de Dados

```
User Voice (Discord)
  ↓
Opus Stream
  ↓
PCM Decoder (prism-media)
  ↓
PCM File
  ↓
FFmpeg (PCM → WAV)
  ↓
WAV File
  ↓
Groq Whisper API (STT)
  ↓
Text Transcription
  ↓
Claude Opus 4 (LLM)
  ↓
Response Text
  ↓
ElevenLabs API (TTS)
  ↓
MP3 Audio
  ↓
Audio Player
  ↓
Voice Channel (Discord)
```

---

## 💰 Custos

### Groq Whisper (STT)
- **Preço:** $0.11 por hora de áudio
- **Exemplo:** 10 minutos de conversa = $0.018 (~2 centavos)
- **Muito barato!** ✅

### ElevenLabs (TTS)
- **Preço:** $0.30 por 1k characters
- **Exemplo:** Resposta de 100 chars = $0.03 (3 centavos)
- **10 respostas:** ~$0.30

### Claude Opus 4 (LLM)
- **Preço:** $15 por 1M tokens
- **Exemplo:** 100 tokens input + 50 output = $0.002 (0.2 centavos)
- **Muito barato!** ✅

### Total por Conversa (10 min, 10 turnos)
```
STT:  $0.018
TTS:  $0.30
LLM:  $0.02
──────────────
Total: $0.34 por conversa de 10 minutos
```

**~$0.034 por minuto** de conversa fluida! 💰

---

## 🧪 Testando

### Teste 1: Conversa Básica

```
1. Entre em canal de voz
2. Digite: "@Ulf entrar no canal"
3. Fale: "Oi Ulf, tudo bem?"
4. Bot responde em voz: "Oi! Tudo ótimo! E você?"
5. Continue conversando naturalmente
```

### Teste 2: Perguntas e Respostas

```
Você: "Qual a capital do Brasil?"
Bot: "A capital do Brasil é Brasília!"

Você: "E qual a população?"
Bot: "Brasília tem cerca de 3 milhões de habitantes!"
```

### Teste 3: Comandos em Voz

```
Você: "Sair do canal"
Bot: [Sai do canal e para de ouvir]
```

---

## 🎵 Vozes Disponíveis (ElevenLabs)

### Inglês
- **Rachel** - Mulher, clara, profissional
- **Domi** - Mulher, jovem, casual
- **Bella** - Mulher, soft, gentle
- **Antoni** - Homem, warm, friendly
- **Elli** - Mulher, conversational
- **Josh** - Homem, deep, authoritative
- **Arnold** - Homem, crisp, formal
- **Adam** - Homem, deep, broadcast

### Português (Multilingual)
Todas as vozes acima funcionam com português usando model_id: `eleven_multilingual_v2`

### Trocar Voz

```typescript
const conversation = new FluentVoiceConversation(claude, {
  ttsVoice: 'Adam'  // Voz masculina profunda
});
```

---

## 🐛 Troubleshooting

### Bot não entra no canal

**Causa:** Sem permissões  
**Solução:**
```
Bot precisa das permissões:
- Connect (Conectar)
- Speak (Falar)
- Use Voice Activity (VAD)
```

### Bot não ouve você

**Causa:** selfDeaf = true  
**Solução:** Já está correto no código (selfDeaf: false)

### Transcrição errada

**Causa:** Áudio muito baixo ou com ruído  
**Solução:**
- Fale mais perto do microfone
- Use headset (menos eco)
- Aumente volume do microfone

### Bot demora a responder

**Causa:** APIs lentas (Groq, ElevenLabs)  
**Normal:** 2-5 segundos total
- STT (Groq): ~1s
- LLM (Claude): ~1-2s
- TTS (ElevenLabs): ~1-2s

### Áudio entrecortado

**Causa:** Internet lenta  
**Solução:** Bot precisa boa conexão para streaming

---

## 🔧 Limitações

### Técnicas
1. **Detecção de silêncio:** 1 segundo (não configurável)
2. **Máximo duração:** Discord limita ~10 minutos
3. **Formato audio:** Opus (Discord) → PCM → WAV → Whisper
4. **Conversão:** Requer FFmpeg instalado

### Discord API
1. **Permissions:** Bot precisa Connect + Speak
2. **Rate limits:** Não abuse (pausas entre mensagens)
3. **Voice regions:** Latência varia por região

### APIs Externas
1. **Groq:** 60 requests/min (suficiente)
2. **ElevenLabs:** Depende do plano
3. **Claude:** Depende do tier

---

## 📚 Arquivos

### Source Code (4 files)

```
src/voice/
├── speech-to-text.ts                 (4.6 KB)
│   └─ SpeechToText class (Groq Whisper)
│
├── voice-handler.ts                  (9.0 KB)
│   └─ VoiceHandler class (Discord voice)
│
├── fluent-voice-conversation.ts      (12.3 KB)
│   └─ FluentVoiceConversation class (Main)
│
├── discord-voice-commands.ts         (4.4 KB)
│   └─ VoiceCommands class (Commands)
│
└── index.ts                          (372 B)
    └─ Exports
```

**Total:** ~31 KB de código

### Documentation

- `docs/VOICE-TO-VOICE-SYSTEM.md` - Este arquivo

---

## 🎯 Use Cases

### Use Case 1: Tutoring/Education

```
Student: "Ulf, me explica como funciona Docker"
Bot: [Explica por voz de forma clara e concisa]
Student: "E Kubernetes?"
Bot: [Continua explicando...]
```

### Use Case 2: Brainstorming

```
User: "Preciso de ideias para meu projeto"
Bot: "Claro! Me fala mais sobre o projeto..."
User: "É um app de delivery"
Bot: "Legal! Que tal integrar com..."
```

### Use Case 3: Companionship

```
User: "Ulf, tô entediado"
Bot: "Vamos conversar! Sobre o que você quer falar?"
User: "Sei lá, qualquer coisa"
Bot: "Tudo bem! Viu algum filme bom recentemente?"
```

### Use Case 4: Language Practice

```
User: "Vamos praticar inglês?"
Bot: "Sure! Let's practice English together!"
User: "What's your favorite movie?"
Bot: "I really enjoy sci-fi movies! What about you?"
```

---

## 🚀 Roadmap

### v1.1 (Próxima semana)
- [ ] Multi-user support (detectar quem está falando)
- [ ] Wake word ("Oi Ulf" para ativar)
- [ ] Mute/unmute dinâmico
- [ ] Voice activity visualization

### v1.2 (Próximo mês)
- [ ] Real-time translation (fala em PT, responde em EN)
- [ ] Voice effects (pitch, speed)
- [ ] Background music support
- [ ] Voice cloning (falar com voz do usuário)

### v2.0 (Futuro)
- [ ] Video support (webcam + screen share)
- [ ] Multi-language simultaneous
- [ ] Voice emotions detection
- [ ] 3D audio (spatial)

---

## 🎓 Exemplos

### Exemplo 1: Conversa Casual

```
User: "E aí Ulf, beleza?"
Bot: "E aí! Tudo tranquilo! E você?"
User: "Tô de boa. O que você tá fazendo?"
Bot: "Tô aqui escutando você! Pronto pra conversar!"
```

### Exemplo 2: Perguntas Técnicas

```
User: "Como eu faço um deploy no Kubernetes?"
Bot: "Para fazer deploy no K8s, você usa o kubectl apply..."
User: "E se der erro?"
Bot: "Você pode verificar os logs com kubectl logs..."
```

### Exemplo 3: Histórico Mantido

```
User: "Qual a capital da França?"
Bot: "A capital da França é Paris!"
User: "E quantos habitantes tem?"
Bot: "Paris tem cerca de 2.2 milhões de habitantes!"
        ^-- Bot lembra do contexto (Paris)
```

---

## ✅ Checklist de Ativação

Antes de usar em produção:

- [ ] `GROQ_API_KEY` configurada
- [ ] `ELEVENLABS_API_KEY` configurada
- [ ] `ANTHROPIC_API_KEY` configurada
- [ ] Bot tem permissões no Discord (Connect + Speak)
- [ ] FFmpeg instalado (para conversão de áudio)
- [ ] Testado em staging primeiro
- [ ] Rate limits configurados
- [ ] Monitoring ativo (custos, usage)

---

## 💡 Tips

### Para Melhor Qualidade de Áudio

1. **Use headset** - Evita eco e feedback
2. **Fale claramente** - Facilita transcrição
3. **Ambiente silencioso** - Menos ruído de fundo
4. **Bom microfone** - Qualidade de áudio melhor

### Para Conversas Mais Naturais

1. **Pausas curtas** - Deixe bot responder
2. **Frases concisas** - Bot responde melhor
3. **Um tópico por vez** - Evita confusão
4. **Feedback verbal** - "Ok", "Entendi", "Continue"

### Para Economizar

1. **Respostas curtas** - Configure max_tokens baixo
2. **Cache de TTS** - Reutilize respostas comuns
3. **Smart Router** - Use Gemini Flash quando possível
4. **Batch processing** - Combine múltiplas perguntas

---

## 🎉 Conclusão

**Voice-to-Voice está PRONTO!** 🚀

- ✅ Conversa fluida e natural
- ✅ Detecção automática de silêncio
- ✅ Loop contínuo (sem reativar)
- ✅ Multi-turn conversation com histórico
- ✅ Custo baixo (~$0.034/min)
- ✅ Produção ready

**Próximo passo:** Entre no canal e comece a falar! 🎤

---

**Última atualização:** 12 Fevereiro 2026  
**Mantido por:** Lucas (OpenCell/CloudWalk)  
**Status:** ✅ Production Ready

**Converse por voz com o bot AGORA!** 🗣️🤖
