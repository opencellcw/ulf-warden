# 🔌 OpenCell - Guia de Integrações de APIs

**Data:** 12 de Fevereiro de 2025  
**Objetivo:** Catálogo de APIs interessantes com exemplos prontos para usar

---

## 📋 Índice

1. [LLM & AI](#llm--ai)
2. [Observability & Monitoring](#observability--monitoring)
3. [Database & Storage](#database--storage)
4. [Authentication & Security](#authentication--security)
5. [Workflow & Automation](#workflow--automation)
6. [Communication & Notifications](#communication--notifications)
7. [Developer Tools](#developer-tools)
8. [Analytics & Data](#analytics--data)

---

## 🤖 LLM & AI

### 1. Google Gemini (Recomendado - 50x mais barato)

**Motivação:** Provider alternativo ao Claude com custo muito menor

```bash
npm install @google/generative-ai
```

```typescript
// src/llm/gemini.ts
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type { LLMProvider, LLMRequest, LLMResponse } from './interface';
import { log } from '../logger';

export class GeminiProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gemini-2.5-flash') {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    try {
      const model = this.client.getGenerativeModel({
        model: this.model,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
          },
        ],
      });

      // Convert messages to Gemini format
      const contents = request.messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // Handle tools (function calling)
      const tools = request.tools ? {
        functionDeclarations: request.tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          parameters: tool.input_schema,
        })),
      } : undefined;

      const result = await model.generateContent({
        contents,
        tools,
        generationConfig: {
          temperature: request.temperature || 0.7,
          maxOutputTokens: request.max_tokens || 4096,
        },
      });

      const response = result.response;
      const text = response.text();
      
      // Handle function calls
      const functionCalls = response.functionCalls();
      
      if (functionCalls && functionCalls.length > 0) {
        return {
          content: [{
            type: 'tool_use',
            id: `call_${Date.now()}`,
            name: functionCalls[0].name,
            input: functionCalls[0].args,
          }],
          stop_reason: 'tool_use',
          usage: {
            input_tokens: 0, // Gemini doesn't return token counts
            output_tokens: 0,
          },
        };
      }

      return {
        content: [{ type: 'text', text }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 0,
          output_tokens: 0,
        },
      };
    } catch (error) {
      log.error('[Gemini] Error generating response:', error);
      throw error;
    }
  }

  getName(): string {
    return 'gemini';
  }

  getModel(): string {
    return this.model;
  }
}
```

**.env:**
```bash
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash  # or gemini-2.5-pro
```

**Custo:**
- Gemini Flash: $0.075 / 1M input tokens
- Gemini Pro: $0.30 / 1M input tokens
- Claude Sonnet: $3.00 / 1M input tokens

**Economia:** 40-97% vs Claude! 💰

---

### 2. Groq (Inferência Ultra-Rápida)

**Motivação:** Latência extremamente baixa (~100ms vs 2s Claude)

```bash
npm install groq-sdk
```

```typescript
// src/llm/groq.ts
import Groq from 'groq-sdk';
import type { LLMProvider } from './interface';

export class GroqProvider implements LLMProvider {
  private client: Groq;
  private model: string;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this.client = new Groq({ apiKey });
    this.model = model;
  }

  async generateResponse(request: LLMRequest): Promise<LLMResponse> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages: request.messages as any,
      temperature: request.temperature,
      max_tokens: request.max_tokens,
      tools: request.tools as any,
    });

    // Convert Groq response to OpenCell format
    return this.convertResponse(completion);
  }
}
```

**Casos de Uso:**
- ✅ Chat interativo (precisa ser rápido)
- ✅ Autocomplete de código
- ✅ Respostas simples
- ❌ Tarefas complexas (qualidade < Claude)

**Custo:** $0.79 / 1M tokens (Llama 3.3 70B)

---

### 3. Hugging Face Inference API

**Motivação:** 10,000+ modelos open-source

```bash
npm install @huggingface/inference
```

```typescript
// src/llm/huggingface.ts
import { HfInference } from '@huggingface/inference';

export class HuggingFaceProvider {
  private client: HfInference;

  constructor(apiKey: string) {
    this.client = new HfInference(apiKey);
  }

  async generateImage(prompt: string): Promise<Blob> {
    const result = await this.client.textToImage({
      model: 'stabilityai/stable-diffusion-2-1',
      inputs: prompt,
    });
    return result;
  }

  async analyzeImage(imageUrl: string): Promise<string> {
    const result = await this.client.imageToText({
      model: 'Salesforce/blip-image-captioning-large',
      data: await fetch(imageUrl).then(r => r.blob()),
    });
    return result.generated_text;
  }

  async translateText(text: string, targetLang: string): Promise<string> {
    const result = await this.client.translation({
      model: 'facebook/mbart-large-50-many-to-many-mmt',
      inputs: text,
      parameters: { tgt_lang: targetLang },
    });
    return result.translation_text;
  }
}
```

**Casos de Uso:**
- ✅ Image generation (Stable Diffusion)
- ✅ Translation (100+ idiomas)
- ✅ Image analysis
- ✅ Speech-to-text

---

## 📊 Observability & Monitoring

### 1. Langfuse (Observability para LLMs)

**Motivação:** Dashboard de custos, latência e qualidade de LLMs

```bash
npm install langfuse
```

```typescript
// src/observability/langfuse.ts
import { Langfuse } from 'langfuse';

const langfuse = new Langfuse({
  publicKey: process.env.LANGFUSE_PUBLIC_KEY!,
  secretKey: process.env.LANGFUSE_SECRET_KEY!,
  baseUrl: 'https://cloud.langfuse.com', // or self-hosted
});

export async function traceLLMCall(
  userId: string,
  botName: string,
  provider: string,
  model: string,
  messages: any[],
  response: any,
  latency: number,
  cost: number
) {
  const trace = langfuse.trace({
    name: 'llm-call',
    userId,
    metadata: { botName, provider, model },
  });

  const generation = trace.generation({
    name: 'generate-response',
    model,
    modelParameters: {
      temperature: 0.7,
    },
    input: messages,
    output: response.content,
    usage: {
      input: response.usage.input_tokens,
      output: response.usage.output_tokens,
    },
    metadata: {
      latency,
      cost,
    },
  });

  await langfuse.flushAsync();
}
```

**Dashboard:**
- 📊 Custos por bot/user/model
- ⚡ Latência P50/P95/P99
- 🎯 Taxa de sucesso
- 🔍 Full request/response inspection

**Custo:** Free até 50k events/mês

---

### 2. Sentry (Error Tracking)

**Motivação:** Catch bugs em produção automaticamente

```bash
npm install @sentry/node @sentry/profiling-node
```

```typescript
// src/observability/sentry.ts
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

export function initSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
    ],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  });
}

// Express middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
// ... routes
app.use(Sentry.Handlers.errorHandler());

// Manual error reporting
try {
  await riskyOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'bot-factory' },
    extra: { botName, userId },
  });
}
```

**Custo:** Free até 5k errors/mês

---

### 3. PostHog (Product Analytics)

**Motivação:** Entender como usuários usam os bots

```bash
npm install posthog-node
```

```typescript
// src/analytics/posthog.ts
import { PostHog } from 'posthog-node';

const posthog = new PostHog(
  process.env.POSTHOG_API_KEY!,
  { host: 'https://app.posthog.com' }
);

export function trackEvent(
  userId: string,
  event: string,
  properties?: Record<string, any>
) {
  posthog.capture({
    distinctId: userId,
    event,
    properties,
  });
}

// Exemplos:
trackEvent(userId, 'bot_created', { botName, botType: 'agent' });
trackEvent(userId, 'message_sent', { platform: 'discord', botName });
trackEvent(userId, 'tool_used', { toolName: 'execute_shell' });
trackEvent(userId, 'cost_incurred', { amount: 0.003, provider: 'claude' });
```

**Features:**
- 📊 Funnels (quantos criam bots? quantos usam?)
- 🔥 Heatmaps
- 🎬 Session recordings
- 🧪 A/B testing
- 📈 Retention analysis

**Custo:** Free até 1M events/mês

---

## 🗄️ Database & Storage

### 1. Pinecone (Vector Database)

**Motivação:** Semantic search em conversas históricas

```bash
npm install @pinecone-database/pinecone
```

```typescript
// src/memory/pinecone-store.ts
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

const index = pinecone.index('opencell-memories');
const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY,
});

export async function storeMemory(
  userId: string,
  botName: string,
  text: string,
  metadata: Record<string, any> = {}
) {
  const embedding = await embeddings.embedQuery(text);
  
  await index.upsert([{
    id: `${userId}-${Date.now()}`,
    values: embedding,
    metadata: {
      userId,
      botName,
      text,
      timestamp: Date.now(),
      ...metadata,
    },
  }]);
}

export async function searchSimilar(
  query: string,
  userId?: string,
  limit: number = 5
): Promise<any[]> {
  const embedding = await embeddings.embedQuery(query);
  
  const results = await index.query({
    vector: embedding,
    topK: limit,
    includeMetadata: true,
    filter: userId ? { userId } : undefined,
  });
  
  return results.matches.map(m => ({
    text: m.metadata?.text,
    score: m.score,
    timestamp: m.metadata?.timestamp,
  }));
}
```

**Casos de Uso:**
- ✅ "Lembra quando discutimos X?" → Semantic search
- ✅ Recomendações contextuais
- ✅ Deduplicação de respostas
- ✅ RAG (Retrieval Augmented Generation)

**Custo:** Free tier até 1M vectors

---

### 2. Supabase (PostgreSQL + Auth + Storage)

**Motivação:** Backend completo em uma plataforma

```bash
npm install @supabase/supabase-js
```

```typescript
// src/database/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Bot CRUD
export async function createBot(bot: Bot) {
  const { data, error } = await supabase
    .from('bots')
    .insert(bot)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getBots(userId: string) {
  const { data, error } = await supabase
    .from('bots')
    .select('*')
    .eq('owner_id', userId);
  
  if (error) throw error;
  return data;
}

// Storage (avatars, files)
export async function uploadAvatar(botName: string, file: File) {
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(`${botName}.png`, file, {
      cacheControl: '3600',
      upsert: true,
    });
  
  if (error) throw error;
  
  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(`${botName}.png`);
  
  return publicUrl;
}

// Realtime subscriptions
export function subscribeToBot(botName: string, callback: (payload: any) => void) {
  supabase
    .channel(`bot:${botName}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'bot_messages' },
      callback
    )
    .subscribe();
}
```

**Features:**
- ✅ PostgreSQL gerenciado
- ✅ Auth (JWT, OAuth, Magic Links)
- ✅ Storage (S3-compatible)
- ✅ Realtime (WebSocket subscriptions)
- ✅ Edge Functions (serverless)
- ✅ Auto-generated REST API

**Custo:** Free tier até 500 MB DB

---

### 3. Upstash (Redis Serverless)

**Motivação:** Redis sem gerenciar infra

```bash
npm install @upstash/redis
```

```typescript
// src/cache/upstash.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function cacheResponse(key: string, value: any, ttl: number = 3600) {
  await redis.set(key, JSON.stringify(value), { ex: ttl });
}

export async function getCached(key: string): Promise<any | null> {
  const value = await redis.get(key);
  return value ? JSON.parse(value as string) : null;
}

// Rate limiting
export async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 60); // 60 segundos
  }
  
  return count <= 30; // 30 req/min
}
```

**Custo:** Free tier até 10k commands/day

---

## 🔐 Authentication & Security

### 1. Clerk (Auth as a Service)

**Motivação:** Autenticação completa em 10 minutos

```bash
npm install @clerk/clerk-sdk-node
```

```typescript
// src/auth/clerk.ts
import { clerkClient } from '@clerk/clerk-sdk-node';
import { requireAuth } from '@clerk/clerk-sdk-node';

// Middleware para Express
export const authMiddleware = requireAuth();

// Criar usuário
export async function createUser(email: string, password: string) {
  const user = await clerkClient.users.createUser({
    emailAddress: [email],
    password,
  });
  return user;
}

// Verificar token JWT
export async function verifyToken(token: string) {
  const claims = await clerkClient.verifyToken(token);
  return claims;
}

// OAuth (Google, GitHub, Discord)
// Configurar no dashboard: https://dashboard.clerk.com/
```

**Features:**
- ✅ OAuth (10+ providers)
- ✅ Magic links
- ✅ MFA
- ✅ User management UI
- ✅ Session management
- ✅ Webhooks

**Custo:** Free até 5k MAU (monthly active users)

---

### 2. WorkOS (Enterprise SSO)

**Motivação:** SSO para clientes enterprise (Okta, Auth0, Azure AD)

```bash
npm install @workos-inc/node
```

```typescript
// src/auth/workos.ts
import { WorkOS } from '@workos-inc/node';

const workos = new WorkOS(process.env.WORKOS_API_KEY);

export async function getSSOUrl(organization: string) {
  const { link } = await workos.sso.getAuthorizationURL({
    organization,
    clientID: process.env.WORKOS_CLIENT_ID!,
    redirectURI: 'https://opencell.io/auth/callback',
  });
  return link;
}

export async function handleCallback(code: string) {
  const profile = await workos.sso.getProfileAndToken({
    code,
    clientID: process.env.WORKOS_CLIENT_ID!,
  });
  
  return {
    userId: profile.profile.id,
    email: profile.profile.email,
    organization: profile.profile.organizationId,
  };
}
```

**Custo:** $0 até primeiro cliente enterprise, depois $299/mês

---

## ⚙️ Workflow & Automation

### 1. Temporal.io (Durable Workflows)

**Motivação:** Workflows complexos com retry automático

```bash
npm install @temporalio/client @temporalio/worker @temporalio/workflow
```

```typescript
// src/workflows/bot-deployment.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

const { buildDockerImage, deployToK8s, verifyHealth } = proxyActivities<typeof activities>({
  startToCloseTimeout: '10 minutes',
});

export async function botDeploymentWorkflow(botConfig: BotConfig): Promise<string> {
  // Step 1: Build image (com retry automático)
  const imageTag = await buildDockerImage(botConfig);
  
  // Step 2: Deploy to K8s
  await deployToK8s(botConfig.name, imageTag);
  
  // Step 3: Wait e verify (com timeout)
  await verifyHealth(botConfig.name);
  
  return `Bot ${botConfig.name} deployed successfully!`;
}

// src/workflows/activities.ts
export async function buildDockerImage(config: BotConfig): Promise<string> {
  // Lógica de build
  return `opencell-bot:${config.name}-${Date.now()}`;
}

export async function deployToK8s(botName: string, imageTag: string) {
  // kubectl apply...
}

export async function verifyHealth(botName: string) {
  // Health check
}
```

**Uso:**
```typescript
import { WorkflowClient } from '@temporalio/client';

const client = new WorkflowClient();

const handle = await client.start('botDeploymentWorkflow', {
  taskQueue: 'bot-factory',
  workflowId: `bot-deploy-${botName}`,
  args: [botConfig],
});

const result = await handle.result(); // Aguarda conclusão
```

**Benefícios:**
- ✅ Retry automático
- ✅ Timeout handling
- ✅ Distributed workflows
- ✅ Visual debugging
- ✅ State persistence (survive crashes!)

**Custo:** Self-hosted gratuito ou Cloud $25/mês

---

### 2. n8n (No-Code Automation)

**Motivação:** 400+ integrações sem código

```bash
# Self-hosted
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

**Workflows Úteis:**
1. **CRM Sync:** Slack message → Create lead in Salesforce
2. **Support Ticket:** Discord message → Create Jira issue
3. **Backup:** Daily export de conversations → Google Drive
4. **Alertas:** Cost threshold → Send email + SMS

**Integração com OpenCell:**
```typescript
// src/webhooks/n8n.ts
app.post('/webhook/n8n/:workflowId', async (req, res) => {
  const { workflowId } = req.params;
  const { action, data } = req.body;
  
  // Trigger bot action
  if (action === 'send_message') {
    await sendMessage(data.channel, data.message);
  } else if (action === 'create_bot') {
    await botFactory.create(data.botConfig);
  }
  
  res.json({ status: 'success' });
});
```

**Custo:** Self-hosted gratuito ou Cloud $20/mês

---

## 📱 Communication & Notifications

### 1. Twilio (SMS, WhatsApp, Voice)

```bash
npm install twilio
```

```typescript
// src/notifications/twilio.ts
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function sendSMS(to: string, message: string) {
  await client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    body: message,
  });
}

export async function sendWhatsApp(to: string, message: string) {
  await client.messages.create({
    to: `whatsapp:${to}`,
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    body: message,
  });
}

export async function makeCall(to: string, twiml: string) {
  await client.calls.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    twiml,
  });
}
```

**Casos de Uso:**
- ✅ Alertas críticos via SMS
- ✅ 2FA
- ✅ WhatsApp bot (alternativa ao Baileys)
- ✅ Voice bot

---

### 2. SendGrid (Email Transacional)

```bash
npm install @sendgrid/mail
```

```typescript
// src/notifications/sendgrid.ts
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(
  to: string,
  subject: string,
  html: string
) {
  await sgMail.send({
    to,
    from: 'noreply@opencell.io',
    subject,
    html,
  });
}

// Template email
export async function sendWelcomeEmail(user: User) {
  await sgMail.send({
    to: user.email,
    from: 'noreply@opencell.io',
    templateId: 'd-xxx', // SendGrid template ID
    dynamicTemplateData: {
      name: user.name,
      botCount: user.bots.length,
    },
  });
}
```

---

## 🛠️ Developer Tools

### 1. Linear (Issue Tracking)

```bash
npm install @linear/sdk
```

```typescript
// src/tools/linear.ts
import { LinearClient } from '@linear/sdk';

const linear = new LinearClient({
  apiKey: process.env.LINEAR_API_KEY!,
});

export async function createIssue(
  title: string,
  description: string,
  priority: number = 2
) {
  const team = await linear.teams().then(t => t.nodes[0]);
  
  const issue = await linear.createIssue({
    teamId: team.id,
    title,
    description,
    priority,
  });
  
  return issue.url;
}

// Auto-create issues from errors
process.on('unhandledRejection', async (error: Error) => {
  const issueUrl = await createIssue(
    `[Auto] Unhandled Error: ${error.message}`,
    error.stack || '',
    1 // High priority
  );
  console.error(`Issue created: ${issueUrl}`);
});
```

---

### 2. GitHub Copilot (AI Code Generation)

**Integração em OpenCell:**
```typescript
// src/tools/copilot.ts
export async function generateCode(description: string): Promise<string> {
  const response = await claude.generateResponse({
    messages: [{
      role: 'user',
      content: `Generate TypeScript code for: ${description}\n\nFollow OpenCell patterns and best practices.`,
    }],
    model: 'claude-sonnet-4-20250514',
    temperature: 0.2,
  });
  
  return response.content[0].text;
}
```

---

## 📊 Analytics & Data

### 1. Mixpanel (Product Analytics)

```bash
npm install mixpanel
```

```typescript
// src/analytics/mixpanel.ts
import Mixpanel from 'mixpanel';

const mixpanel = Mixpanel.init(process.env.MIXPANEL_TOKEN!);

export function track(userId: string, event: string, properties?: any) {
  mixpanel.track(event, {
    distinct_id: userId,
    ...properties,
  });
}

export function identify(userId: string, traits: any) {
  mixpanel.people.set(userId, traits);
}

// Exemplos:
track(userId, 'Bot Created', { botType: 'agent', toolCount: 5 });
track(userId, 'Message Sent', { platform: 'discord', botName });
identify(userId, { email, plan: 'pro', joinedAt: new Date() });
```

---

## 🎯 RESUMO DE CUSTOS

| Serviço | Free Tier | Paid (Starter) | Economia Anual |
|---------|-----------|----------------|----------------|
| **Gemini** | N/A | ~$5/10M tok | **$1,750** vs Claude |
| **Langfuse** | 50k events | $49/mês | Gratuito! |
| **Pinecone** | 1M vectors | $0/mês | Gratuito! |
| **Supabase** | 500 MB | $25/mês | Gratuito! |
| **Upstash Redis** | 10k cmd/day | $10/mês | Gratuito! |
| **Clerk** | 5k MAU | $25/mês | Gratuito! |
| **PostHog** | 1M events | $0/mês | Gratuito! |
| **Sentry** | 5k errors | $26/mês | Gratuito! |
| **Temporal** | Self-hosted | $25/mês | Gratuito! |
| **n8n** | Self-hosted | $20/mês | Gratuito! |

**Total Free Tier:** **$0/mês** 💰  
**Total Economia vs Paid:** **~$2,000/ano** 🎉

---

## ✅ CHECKLIST DE INTEGRAÇÃO

Para cada nova API:

- [ ] Adicionar credenciais ao `.env.example`
- [ ] Adicionar SDK ao `package.json`
- [ ] Criar wrapper em `src/integrations/[nome].ts`
- [ ] Adicionar tipos TypeScript
- [ ] Criar testes em `tests/integrations/[nome].test.ts`
- [ ] Documentar em `docs/integrations/[nome].md`
- [ ] Adicionar ao `README.md`
- [ ] Rate limiting (se aplicável)
- [ ] Error handling
- [ ] Logging
- [ ] Monitoramento (Sentry)

---

**Próxima Atualização:** Março de 2025  
**Mantido por:** Time OpenCell
