# Local LLM Integration

## Overview

Ulfberht-Warden now supports a **dual-model architecture** with intelligent routing between:
- **Claude API** (primary) - Full-featured, tool support, complex reasoning
- **Local models** (secondary) - Lightweight, CPU inference, simple tasks

## Architecture

```
┌─────────────────────────────────────────┐
│           LLM Router                     │
│  (Intelligent Task Classification)       │
└─────────────┬───────────────────────────┘
              │
       ┌──────┴──────┐
       │             │
   ┌───▼────┐   ┌───▼────┐
   │ Claude │   │ Local  │
   │  API   │   │  Model │
   └────────┘   └────────┘
```

## Routing Strategies

### 1. Claude Only (Default)
```env
LLM_STRATEGY=claude_only
LOCAL_LLM_ENABLED=false
```
- Always uses Claude API
- Best quality, full features
- Requires API key and credits

### 2. Hybrid (Recommended)
```env
LLM_STRATEGY=hybrid
LOCAL_LLM_ENABLED=true
```
- Simple tasks → Local model
- Complex tasks → Claude API
- Tool use → Always Claude
- Best balance of cost and quality

**Simple tasks handled locally:**
- Greetings and casual chat
- Simple Q&A
- Text summarization
- Basic classification

**Complex tasks use Claude:**
- Code generation
- Tool execution
- Complex reasoning
- Multi-step tasks

### 3. Local Fallback
```env
LLM_STRATEGY=local_fallback
LOCAL_LLM_ENABLED=true
```
- Try local model first
- Fallback to Claude on error
- Minimize API costs
- May have quality trade-offs

### 4. Local Only
```env
LLM_STRATEGY=local_only
LOCAL_LLM_ENABLED=true
```
- Always uses local model
- No API costs
- No tool support
- Limited capabilities

## Quick Start

### 1. Install and Setup
```bash
# Run the setup script
./scripts/setup-local-llm.sh
```

This will:
- Install transformers.js
- Create model cache directory
- Add configuration to .env
- Download and test the model (~1.5GB)

### 2. Configure Environment
Edit `.env`:
```env
# Enable local LLM
LOCAL_LLM_ENABLED=true
LLM_STRATEGY=hybrid

# Choose model (optional)
LOCAL_MODEL_NAME=Xenova/LaMini-Flan-T5-783M

# Cache directory (optional)
MODEL_CACHE_DIR=./.cache/models
```

### 3. Start the Bot
```bash
npm start
```

The router will automatically choose the best model for each request.

## Available Models

### Small & Fast (Recommended for CPU)
**Xenova/LaMini-Flan-T5-783M**
- Size: ~1.5GB
- Best for: Simple chat, Q&A, summarization
- Speed: Fast on CPU
- Quality: Good for simple tasks

### Medium Quality
**Xenova/TinyLlama-1.1B-Chat-v1.0**
- Size: ~2GB
- Best for: Chat, instruction-following
- Speed: Moderate on CPU
- Quality: Better conversational abilities

### High Quality (Requires more resources)
**Xenova/Phi-2**
- Size: ~5GB
- Best for: Complex chat, reasoning, code understanding
- Speed: Slower on CPU
- Quality: Best quality for local inference

## Model Selection

To change the model, update `.env`:
```env
LOCAL_MODEL_NAME=Xenova/TinyLlama-1.1B-Chat-v1.0
```

Then restart the bot. The model will be downloaded on first use.

## Performance Considerations

### CPU vs GPU
- transformers.js runs on CPU (broader compatibility)
- No GPU required
- Inference time: 1-5 seconds for simple responses
- Claude API: <1 second typical

### Memory Usage
- Model in memory: 1.5GB - 5GB (depends on model)
- Render free tier: 512MB RAM (not enough)
- Render Starter: 2GB RAM (works with small model)
- Render Standard: 4GB RAM (works with all models)

### Disk Usage
- Models cached at: `./.cache/models/`
- Small model: ~1.5GB
- Medium model: ~2GB
- Large model: ~5GB
- Render persistent disk: 1GB (may need upgrade)

## Deployment on Render

### Option 1: Hybrid (Recommended)
- Use small model for simple tasks
- Claude for complex tasks
- Upgrade to Starter plan (2GB RAM)
- Upgrade disk if needed (2-3GB)

Configuration:
```env
LLM_STRATEGY=hybrid
LOCAL_LLM_ENABLED=true
LOCAL_MODEL_NAME=Xenova/LaMini-Flan-T5-783M
```

### Option 2: Claude Only (Easiest)
- No local model needed
- Works on free tier
- Lower memory usage
- Higher API costs

Configuration:
```env
LLM_STRATEGY=claude_only
LOCAL_LLM_ENABLED=false
```

### Environment Variables on Render
Set in Render dashboard:
```
LOCAL_LLM_ENABLED=true
LLM_STRATEGY=hybrid
LOCAL_MODEL_NAME=Xenova/LaMini-Flan-T5-783M
MODEL_CACHE_DIR=/data/models
```

Update `render.yaml` disk size if needed:
```yaml
disk:
  name: ulf-data
  mountPath: /data
  sizeGB: 3  # Increase from 1GB to 3GB
```

## Monitoring

### Check Router Status
The router logs which model is used for each request:

```
[Router] Using local model (hybrid: simple task) taskType=simple_chat
[Router] Using Claude (hybrid: complex task) taskType=code_generation
[Router] Using Claude (tools required)
```

### Model Information
Check model status via logs:
```
[LocalLLM] Model initialized successfully model=Xenova/LaMini-Flan-T5-783M initTime=2341ms
```

### Performance Metrics
Each response includes:
- Model used
- Processing time
- Token usage (estimated for local)

## Troubleshooting

### "Local model not available"
**Cause**: `LOCAL_LLM_ENABLED=false` or model download failed

**Solution**:
```bash
# Enable local LLM
echo "LOCAL_LLM_ENABLED=true" >> .env

# Run setup script
./scripts/setup-local-llm.sh
```

### "Out of memory" errors
**Cause**: Model too large for available RAM

**Solutions**:
1. Use smaller model:
   ```env
   LOCAL_MODEL_NAME=Xenova/LaMini-Flan-T5-783M
   ```

2. Switch to Claude only:
   ```env
   LLM_STRATEGY=claude_only
   ```

3. Upgrade Render plan (more RAM)

### Model download too slow/fails
**Cause**: Network issues or disk space

**Solutions**:
1. Check disk space:
   ```bash
   df -h
   ```

2. Clear cache:
   ```bash
   rm -rf ./.cache/models/
   ```

3. Download manually:
   ```bash
   # Model will be downloaded on first use
   npm start
   ```

### Local responses are poor quality
**Cause**: Task is too complex for local model

**Solutions**:
1. Use hybrid strategy (auto-routes complex tasks):
   ```env
   LLM_STRATEGY=hybrid
   ```

2. Use better model:
   ```env
   LOCAL_MODEL_NAME=Xenova/Phi-2
   ```

3. Switch to Claude for this conversation

## Cost Analysis

### Claude API Only
- Cost: ~$3-15 per 1M input tokens
- Quality: Excellent
- Speed: Fast (<1s)
- Features: Full (tools, reasoning)

### Hybrid (Recommended)
- Cost: 50-70% reduction (rough estimate)
- Quality: Excellent for complex, good for simple
- Speed: 1-5s for local, <1s for Claude
- Features: Full (routes tools to Claude)

### Local Only
- Cost: $0 API costs
- Quality: Good for simple tasks
- Speed: 1-5s
- Features: Limited (no tools)

## API Reference

### Using the Router Programmatically

```typescript
import { getRouter, toLLMMessages } from './llm';

const router = getRouter();

// Simple generation
const response = await router.generate([
  { role: 'user', content: 'Hello!' }
], {
  maxTokens: 512,
  temperature: 0.7
});

console.log(response.content);
console.log('Model used:', response.model);
console.log('Time:', response.processingTime + 'ms');

// Check status
const status = await router.getStatus();
console.log('Claude available:', status.claude.available);
console.log('Local available:', status.local.available);
console.log('Current strategy:', status.strategy);

// Change strategy at runtime
router.setStrategy('hybrid');
```

### Direct Provider Access

```typescript
import { getClaudeProvider, getLocalProvider } from './llm';

// Force Claude
const claude = getClaudeProvider();
const response1 = await claude.generate(messages);

// Force local
const local = getLocalProvider();
const response2 = await local.generate(messages);

// Get model info
const info = local.getModelInfo();
console.log('Model:', info.name);
console.log('Size:', info.size);
console.log('Capabilities:', info.capabilities);
```

## Best Practices

### 1. Start with Hybrid
Use hybrid strategy for best balance:
```env
LLM_STRATEGY=hybrid
```

### 2. Right-size the Model
- Development: Use small model (fast iteration)
- Production: Use medium model (better quality)
- High-load: Consider Claude only (consistency)

### 3. Monitor Usage
Watch logs to see routing decisions:
```bash
# Check which model is used most
grep "Router" data/logs/ulf.log | grep "Using"
```

### 4. Optimize for Cost
If API costs are high:
1. Enable hybrid strategy
2. Ensure simple greetings use local
3. Monitor Claude API usage in Anthropic dashboard

### 5. Optimize for Quality
If local responses are poor:
1. Upgrade to better model (Phi-2)
2. Use Claude only for critical conversations
3. Fine-tune routing rules in router.ts

## Future Enhancements

Planned improvements:
- [ ] GPU support for faster inference
- [ ] Model quantization for smaller size
- [ ] Custom routing rules per user
- [ ] Model fine-tuning support
- [ ] Response quality metrics
- [ ] Automatic model selection based on load
- [ ] Response caching for common queries

## Learn More

- [transformers.js Documentation](https://huggingface.co/docs/transformers.js)
- [Xenova Models on Hugging Face](https://huggingface.co/Xenova)
- [ONNX Runtime](https://onnxruntime.ai/)
- [Anthropic API Documentation](https://docs.anthropic.com/)
