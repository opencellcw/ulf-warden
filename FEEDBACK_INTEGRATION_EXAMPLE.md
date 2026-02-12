

# 🔌 INTEGRAÇÃO NO DISCORD - Exemplo Prático

## 📝 Mudanças Necessárias no Discord Handler

### **1. Imports**
```typescript
// src/handlers/discord.ts

// ADD: Import feedback system
import { 
  feedbackSystem, 
  extractMessageContext, 
  type MessageContext 
} from '../feedback';
```

### **2. Tracking de Tools Usadas**
```typescript
// Track tools used during agent execution
let toolsUsed: string[] = [];

// In runAgent or tool execution callback
function onToolUse(toolName: string) {
  toolsUsed.push(toolName);
}
```

### **3. Após Bot Responder**
```typescript
// Existing code:
const response = await runAgent(message.content, context);
await message.reply(response);

// CHANGE TO:
const startTime = Date.now();
const response = await runAgent(message.content, context);
const responseTime = Date.now() - startTime;

// Extract context for feedback decision
const feedbackContext: MessageContext = {
  userId: message.author.id,
  ...extractMessageContext(response, toolsUsed, responseTime)
};

// Check if should ask feedback
const decision = feedbackSystem.shouldAddButtons(feedbackContext);

if (decision.shouldAsk) {
  // Add compact feedback buttons
  const buttons = feedbackSystem.getButtons(message.id, true);
  
  await message.reply({
    content: response,
    components: buttons
  });

  log.info('[Discord] Feedback requested', {
    userId: message.author.id,
    score: decision.score,
    reason: decision.reason
  });
} else {
  // Normal reply (no feedback)
  await message.reply(response);
  
  log.debug('[Discord] Feedback skipped', {
    reason: decision.reason,
    score: decision.score
  });
}

// Reset tools tracking
toolsUsed = [];
```

### **4. Button/Modal Handler**
```typescript
// EXISTING interactionCreate handler
client.on('interactionCreate', async (interaction) => {
  // ... existing code ...

  // ADD: Feedback button handler
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('feedback_')) {
      try {
        await feedbackSystem.handleButtonClick(interaction);
      } catch (error) {
        log.error('[Discord] Feedback button error', error);
      }
      return;
    }
    // ... rest of button handlers ...
  }

  // ADD: Feedback modal handler
  if (interaction.isModalSubmit()) {
    if (interaction.customId.includes('feedback_modal') || 
        interaction.customId.includes('suggestion_modal')) {
      try {
        await feedbackSystem.handleModalSubmit(interaction);
      } catch (error) {
        log.error('[Discord] Feedback modal error', error);
      }
      return;
    }
    // ... rest of modal handlers ...
  }
});
```

### **5. Comando /feedback**
```typescript
// ADD to slash commands
const commands = [
  // ... existing commands ...
  
  {
    name: 'feedback',
    description: 'Give feedback on my last response',
    type: ApplicationCommandType.ChatInput,
  }
];

// ADD to command handler
case 'feedback': {
  try {
    // Get last bot message
    const messages = await interaction.channel.messages.fetch({ limit: 10 });
    const lastBotMessage = messages.find(m => 
      m.author.bot && m.author.id === interaction.client.user?.id
    );

    if (!lastBotMessage) {
      await interaction.reply({
        content: '❌ No recent bot message found to give feedback on!',
        ephemeral: true
      });
      return;
    }

    // Show feedback prompt
    const prompt = feedbackSystem.interactiveFeedback.createFeedbackPrompt(
      lastBotMessage.id
    );
    
    await interaction.reply({
      content: prompt.content,
      components: prompt.components
    });

    log.info('[Discord] Manual feedback requested', {
      userId: interaction.user.id,
      messageId: lastBotMessage.id
    });
  } catch (error) {
    log.error('[Discord] /feedback command error', error);
    await interaction.reply({
      content: '❌ Failed to show feedback form',
      ephemeral: true
    });
  }
  break;
}
```

---

## 🎯 Exemplo Completo (Simplified)

```typescript
// src/handlers/discord.ts - SIMPLIFIED EXAMPLE

import { Client, GatewayIntentBits, Message, ButtonInteraction, ModalSubmitInteraction } from 'discord.js';
import { runAgent } from '../agent';
import { feedbackSystem, extractMessageContext, type MessageContext } from '../feedback';
import { log } from '../logger';

const client = new Client({ intents: [...] });

// Track tools used
let currentToolsUsed: string[] = [];

// Message handler
client.on('messageCreate', async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.includes(client.user!.id)) return;

  try {
    // Run agent
    const startTime = Date.now();
    
    const response = await runAgent(message.content, {
      userId: message.author.id,
      onToolUse: (toolName) => currentToolsUsed.push(toolName)
    });
    
    const responseTime = Date.now() - startTime;

    // Decide if should ask feedback
    const feedbackContext: MessageContext = {
      userId: message.author.id,
      ...extractMessageContext(response, currentToolsUsed, responseTime)
    };

    const decision = feedbackSystem.shouldAddButtons(feedbackContext);

    if (decision.shouldAsk) {
      // Add feedback buttons
      const buttons = feedbackSystem.getButtons(message.id, true);
      
      await message.reply({
        content: response,
        components: buttons
      });

      log.info('[Discord] Feedback requested', { score: decision.score });
    } else {
      // Normal reply
      await message.reply(response);
    }

    // Reset
    currentToolsUsed = [];
    
  } catch (error) {
    log.error('[Discord] Message handler error', error);
  }
});

// Interaction handler
client.on('interactionCreate', async (interaction) => {
  // Button clicks
  if (interaction.isButton()) {
    if (interaction.customId.startsWith('feedback_')) {
      await feedbackSystem.handleButtonClick(interaction as ButtonInteraction);
      return;
    }
  }

  // Modal submissions
  if (interaction.isModalSubmit()) {
    if (interaction.customId.includes('feedback_modal') || 
        interaction.customId.includes('suggestion_modal')) {
      await feedbackSystem.handleModalSubmit(interaction as ModalSubmitInteraction);
      return;
    }
  }

  // Slash commands
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'feedback') {
      const messages = await interaction.channel.messages.fetch({ limit: 10 });
      const lastBotMessage = messages.find(m => 
        m.author.bot && m.author.id === interaction.client.user?.id
      );

      if (!lastBotMessage) {
        await interaction.reply({
          content: '❌ No recent message found!',
          ephemeral: true
        });
        return;
      }

      const prompt = feedbackSystem.interactiveFeedback.createFeedbackPrompt(
        lastBotMessage.id
      );
      
      await interaction.reply({
        content: prompt.content,
        components: prompt.components
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
```

---

## 📊 Testing

### **Test 1: High Score (Should Ask)**
```typescript
User: @ulf deploy app to production

// Context extracted:
{
  userId: '123',
  messageLength: 850,        // Long response
  toolsUsed: ['execute_shell'], // Critical tool
  isError: false,
  commandType: 'critical',   // Deploy = critical
  responseTime: 5000,
  hasCode: true,
  hasLinks: false
}

// Score calculation:
// +20 (length >500)
// +40 (critical tool)
// +30 (critical command)
// +10 (has code)
// = 100 total

// Decision: ✅ ASK (score 100 >= 60)

Bot reply:
✅ Deployed successfully!
```bash
kubectl get pods
```

Was this helpful?
[👍] [👎] [💡 Suggest]
```

### **Test 2: Low Score (Should Skip)**
```typescript
User: @ulf oi

// Context extracted:
{
  userId: '123',
  messageLength: 15,         // Very short
  toolsUsed: [],            // No tools
  isError: false,
  commandType: 'simple',    // Simple greeting
  responseTime: 100,
  hasCode: false,
  hasLinks: false
}

// Score calculation:
// +0 (length <100)
// +0 (no tools)
// +5 (simple command)
// = 5 total

// Decision: ❌ SKIP (score 5 < 60)

Bot reply:
Olá! 😊 Como posso ajudar?
```

### **Test 3: Rate Limit**
```typescript
// User already got feedback 2x today

User: @ulf generate image of cat

// Context:
{
  userId: '123',
  messageLength: 500,
  toolsUsed: ['replicate_generate_image'],
  isError: false,
  commandType: 'complex',
  responseTime: 8000,
  hasCode: false,
  hasLinks: true
}

// Score: 75 (would normally ask)
// But: Rate limit = 2/day reached

// Decision: ❌ SKIP (rate limit)

Bot reply:
🎨 Image generated!
[image]
```

### **Test 4: Manual Feedback**
```typescript
User: /feedback

// Always works (no rate limit)

Bot:
📊 How was my response? Your feedback helps me improve!

[👍 Helpful] [👎 Not Helpful] [📝 Give Feedback] [💡 Suggest Improvement]
```

---

## 🚀 Rollout Plan

### **Phase 1: Soft Launch** (Week 1)
```
✅ Deploy with conservative settings:
   - MIN_SCORE = 70 (higher threshold)
   - MAX_PER_DAY = 1 (lower limit)
   
✅ Monitor:
   - How many users see buttons?
   - Feedback response rate?
   - Any complaints about spam?
```

### **Phase 2: Optimize** (Week 2)
```
✅ Adjust based on data:
   - Lower threshold if response rate high
   - Increase rate limit if users complain "too few"
   
✅ A/B test:
   - Compact vs Full buttons
   - Different CTAs ("Was this helpful?" vs "Rate this")
```

### **Phase 3: Full Launch** (Week 3+)
```
✅ Fine-tuned settings
✅ Pattern detection active
✅ Self-improvement integration
✅ Auto-deploy improvements
```

---

## 📈 Success Metrics

### **Week 1 Goals:**
```
✅ 10+ feedbacks collected
✅ 0 spam complaints
✅ Avg rating ≥ 3.5/5
✅ At least 1 pattern detected
```

### **Month 1 Goals:**
```
✅ 100+ feedbacks collected
✅ 5+ patterns detected
✅ 2+ improvements implemented
✅ 1+ improvement deployed
```

### **Quarter 1 Goals:**
```
✅ 500+ feedbacks
✅ 20+ patterns
✅ 10+ improvements
✅ 5+ deployed
✅ Measurable quality improvement
```

---

## 🎯 Ready to Deploy!

**Files Created:**
```
✅ src/feedback/smart-feedback-trigger.ts   (9KB)
✅ src/feedback/interactive-feedback.ts     (15KB)
✅ src/feedback/feedback-analyzer.ts        (14KB)
✅ src/feedback/index.ts                    (4KB)
✅ FEEDBACK_SYSTEM_GUIDE.md                 (12KB)
✅ FEEDBACK_INTEGRATION_EXAMPLE.md          (THIS)
```

**Total:** ~60KB of production-ready code!

**Next:** 
1. Build & test locally
2. Deploy to staging
3. Test with real users
4. Deploy to production
5. Monitor & iterate

🚀 **LET'S GO!**
