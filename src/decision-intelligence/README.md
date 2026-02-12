# 🧠 Decision Intelligence System

Sistema de análise multi-perspectiva para decisões importantes usando consenso de múltiplos LLMs.

## Quick Start

### Discord

```
!decide Should I migrate to microservices?
```

### Code

```typescript
import { getDecisionAnalyzer } from './decision-intelligence';

const analyzer = getDecisionAnalyzer();
const analysis = await analyzer.analyze({
  question: "Should I invest in X or Y?",
  alternatives: ["Option X", "Option Y"],
  userId: "user123",
  channelId: "channel456",
  platform: "discord"
});

console.log(analysis.consensus.recommendation);
console.log(`Confidence: ${analysis.consensus.confidenceScore}/100`);
console.log(`Agreement: ${analysis.consensus.agreementLevel}%`);
```

## What You Get

- ✅ **5 AI perspectives** (Analyst, Creative, Skeptic, Pragmatist, Ethicist)
- ✅ **Consensus recommendation** with confidence score (0-100)
- ✅ **Agreement level** (%) - how unanimous they are
- ✅ **Aggregated insights** (top pros, cons, risks)
- ✅ **Critical questions** you should answer first
- ✅ **Alternative suggestions** you hadn't considered

## Files

- `types.ts` - TypeScript types and interfaces
- `prompts.ts` - Specialized prompts for each agent
- `analyzer.ts` - Core analysis engine (uses Smart Router)
- `storage.ts` - SQLite storage for decision history
- `discord-handler.ts` - Discord command interface
- `index.ts` - Module exports

## How It Works

1. **Parse** decision question and alternatives
2. **Consult** 5 agents in parallel (30-60s total):
   - 📊 Strategic Analyst (data-driven)
   - 💡 Creative Strategist (innovative)
   - ⚠️ Critical Skeptic (risk-focused)
   - 🔨 Pragmatic Executor (execution-focused)
   - 🎯 Ethical Advisor (values-driven)
3. **Calculate** consensus (weighted voting + agreement level)
4. **Aggregate** insights (top pros/cons/risks)
5. **Present** results with rich Discord embeds

## Architecture

```
User: !decide [question]
    ↓
discord-handler.ts → parse question & alternatives
    ↓
analyzer.ts → parallel analysis (5 agents)
    ↓
    ├─→ Agent 1 (GPT-4 via Smart Router)
    ├─→ Agent 2 (Claude via Smart Router)
    ├─→ Agent 3 (Gemini via Smart Router)
    ├─→ Agent 4 (Smart Router selects)
    └─→ Agent 5 (Smart Router selects)
    ↓
Calculate consensus (voting + confidence)
    ↓
storage.ts → save to SQLite
    ↓
discord-handler.ts → format embeds & send
```

## Cost

~$0.10-0.30 USD per analysis (uses Smart Router to optimize).

## Documentation

Full docs: `/docs/decision-intelligence.md`

## Integration

Already integrated in:
- ✅ `src/handlers/discord.ts` (command handling)
- ✅ Uses existing LLM Router with Smart Router
- ✅ Uses existing logger
- ✅ SQLite database in `data/decisions.db`

## Testing

```bash
npm run build
npm start

# In Discord:
!decide Should I use TypeScript or JavaScript for the new project?
```

## Future

- [ ] History commands (`/decisions history`, `/decisions stats`)
- [ ] Mark decisions as implemented with outcomes
- [ ] Export analysis to PDF
- [ ] Slack/Telegram integration
- [ ] Web dashboard

---

**Use wisely for decisions that matter!** 🚀
