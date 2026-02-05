# 🔍 Distributed Tracing - TODO

**Status:** ⚠️ Arquivos preparados, mas desabilitados devido a conflitos de versão

**Data:** 2026-02-05

---

## 📋 Resumo

O sistema de Distributed Tracing (OpenTelemetry) está **95% implementado**, mas encontra conflitos de versão entre os pacotes `@opentelemetry/*` que impedem a compilação.

---

## 🚧 Problema Atual

### Erros de Build

```
src/core/tracing.ts(94,9): error TS2741: Property 'getRawAttributes' is missing
src/core/tracing.ts(95,9): error TS2322: Type 'BatchSpanProcessor' is not assignable
src/core/tracing-middleware.ts(222,3): error TS2740: Type 'Response' is missing properties
```

### Causa Raiz

Versões incompatíveis dos pacotes OpenTelemetry no `package.json`:

```json
{
  "@opentelemetry/api": "^1.9.0",              // ✅ v1.x
  "@opentelemetry/sdk-node": "^0.211.0",        // ⚠️ v0.x
  "@opentelemetry/sdk-trace-base": "^1.28.0",   // ✅ v1.x
  "@opentelemetry/sdk-trace-node": "^1.28.0",   // ✅ v1.x
  "@opentelemetry/exporter-jaeger": "^2.5.0",   // ⚠️ v2.x
  "@opentelemetry/resources": "^1.30.1"         // ✅ v1.x
}
```

**Problema:** Mistura de v0.x, v1.x e v2.x causando incompatibilidades de tipos TypeScript.

---

## ✅ O que JÁ está pronto

### 1. Arquivos Implementados (Status: .disabled)

- ✅ `src/core/tracing.ts.disabled` (529 linhas)
  - Configuração completa do OpenTelemetry SDK
  - Suporte para Jaeger, Zipkin, OTLP exporters
  - Context propagation
  - Span management

- ✅ `src/core/tracing-middleware.ts.disabled` (412 linhas)
  - Express middleware para tracing automático
  - Error handler com context propagation
  - Batch operations tracing
  - Queue job tracing

### 2. Integração no `src/index.ts`

- ✅ Imports comentados (linhas 24-26)
- ✅ Express middleware posicionado (após Prometheus)
- ✅ Inicialização preparada (após Telemetry)
- ✅ Shutdown preparado (após Telemetry)

Todas as integrações estão **comentadas com TODO** aguardando resolução das versões.

---

## 🎯 Como Ativar

### Opção 1: Atualizar OpenTelemetry para v1.x (Recomendado)

**Tempo estimado:** 1-2 horas

1. **Atualizar package.json** para alinhar todas as versões em v1.x:

```bash
npm install \
  @opentelemetry/api@^1.9.0 \
  @opentelemetry/sdk-node@^0.53.0 \
  @opentelemetry/sdk-trace-base@^1.28.0 \
  @opentelemetry/sdk-trace-node@^1.28.0 \
  @opentelemetry/exporter-jaeger@^1.28.0 \
  @opentelemetry/exporter-trace-otlp-http@^0.53.0 \
  @opentelemetry/resources@^1.30.1 \
  @opentelemetry/semantic-conventions@^1.39.0 \
  @opentelemetry/instrumentation-express@^0.42.0 \
  @opentelemetry/instrumentation-http@^0.53.0
```

2. **Ajustar código** (se necessário) para compatibilidade com v1.x

3. **Renomear arquivos:**
```bash
mv src/core/tracing.ts.disabled src/core/tracing.ts
mv src/core/tracing-middleware.ts.disabled src/core/tracing-middleware.ts
```

4. **Descomentar no index.ts:**
```typescript
// Linha 24-26: Descomentar imports
import { initializeTracing, shutdownTracing } from './core/tracing';
import { tracingMiddleware, tracingErrorHandler } from './core/tracing-middleware';

// Linha ~54: Descomentar middleware
if (process.env.TRACING_ENABLED === 'true') {
  app.use(tracingMiddleware());
}

// Linha ~80: Descomentar error handler
if (process.env.TRACING_ENABLED === 'true') {
  app.use(tracingErrorHandler());
}

// Linha ~195: Descomentar inicialização
// (Toda a seção 1.75)

// Linha ~470: Descomentar shutdown
// (Toda a seção 8.5)
```

5. **Testar build:**
```bash
npm run build
```

6. **Configurar env vars:**
```bash
TRACING_ENABLED=true
TRACING_EXPORTER=console  # ou 'jaeger', 'zipkin', 'otlp'
JAEGER_ENDPOINT=http://localhost:14268/api/traces  # se usar Jaeger
```

---

### Opção 2: Usar apenas Telemetry básico (Atual)

**Status:** ✅ Já funcionando

O sistema já tem telemetry básico funcionando via `src/core/telemetry.ts`:
- ✅ PII scrubbing (8 patterns)
- ✅ Cost tracking (per user, per tool)
- ✅ Basic span creation

**Suficiente para:** Observability básica, cost tracking, PII protection

**Não oferece:** Full distributed tracing, Jaeger/Zipkin UI, detailed span trees

---

## 📊 Comparação: Telemetry vs Distributed Tracing

| Feature | Telemetry (Atual) | Distributed Tracing |
|---------|-------------------|---------------------|
| PII Scrubbing | ✅ | ✅ |
| Cost Tracking | ✅ | ✅ |
| Basic Spans | ✅ | ✅ |
| Distributed Context | ❌ | ✅ |
| Jaeger/Zipkin UI | ❌ | ✅ |
| Request Flow Visualization | ❌ | ✅ |
| Cross-service Tracing | ❌ | ✅ |
| Performance Bottlenecks | ⚠️ Basic | ✅ Detalhado |

---

## 🔗 Referências

- [OpenTelemetry JS Docs](https://opentelemetry.io/docs/instrumentation/js/)
- [OpenTelemetry Versioning](https://github.com/open-telemetry/opentelemetry-js/releases)
- [Jaeger Getting Started](https://www.jaegertracing.io/docs/latest/getting-started/)

---

## 💡 Recomendação

**Para agora:** Manter Telemetry básico (já funciona)

**Para produção com observability avançada:** Ativar Distributed Tracing (Opção 1)

**Benefício da Opção 1:**
- Visualização completa do request flow no Jaeger UI
- Identificação de bottlenecks e latency issues
- Troubleshooting de erros cross-system
- Métricas de performance detalhadas

**Esforço:** 1-2 horas para alinhar versões e testar

---

**Conclusão:** Sistema está 95% pronto. Só falta resolver conflitos de versão do OpenTelemetry para ativar o tracing completo.
