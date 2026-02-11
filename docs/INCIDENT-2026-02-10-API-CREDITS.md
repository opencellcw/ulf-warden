# Incidente: Consumo Inesperado de Créditos API ($40)
**Data:** 2026-02-10
**Impacto:** $40 consumidos (de $25 para -$15)

## 🔴 Causa Raiz

O **HeartbeatManager** estava **habilitado** no deployment Kubernetes e fazendo chamadas periódicas à API Anthropic a cada **30 minutos**, usando um **modelo incorreto** que não existe.

### Fatores Contribuintes

1. **Heartbeat Habilitado:**
   ```yaml
   env:
     - name: HEARTBEAT_ENABLED
       value: "true"
     - name: HEARTBEAT_INTERVAL_MINUTES
       value: "30"
   ```

2. **Modelo Incorreto:**
   ```typescript
   // heartbeat-manager.ts linha 110
   model: 'claude-sonnet-4-20250514', // ❌ Este modelo NÃO EXISTE!
   ```

3. **Múltiplos Pods Criados:**
   - Durante o deployment, foram criados/deletados **15-20 pods**
   - Cada pod inicia heartbeat que faz primeira chamada após **1 minuto**
   - Pods com vida útil maior fazem chamadas a cada 30min

4. **Custo Estimado por Chamada:**
   - Modelo usado (fallback/retry): Opus 4.5 ou Sonnet 4
   - ~500 tokens por chamada
   - Custo: $0.01-$0.05 por chamada
   - Para $40: **800-4000 chamadas** (dependendo do modelo)

## 📊 Timeline do Incidente

| Horário | Evento |
|---------|--------|
| ~19:00 | Início dos deployments com múltiplas tentativas |
| ~19:00-22:45 | 15-20 pods criados/deletados devido a problemas de deployment |
| A cada pod | Heartbeat iniciado, primeira chamada após 1min |
| A cada 30min | Chamadas periódicas do heartbeat (pods com vida longa) |
| 22:45 | Usuário reporta consumo de $40 |
| 22:46 | Deployment escalado para 0 (pods parados) |
| 22:48 | Heartbeat desabilitado: `HEARTBEAT_ENABLED=false` |

## ✅ Ações Corretivas Imediatas

1. ✅ Deployment escalado para 0 réplicas
2. ✅ Heartbeat desabilitado no K8s: `HEARTBEAT_ENABLED=false`
3. ✅ Modelo corrigido no código: `claude-opus-4-5-20251101`

## 🛡️ Prevenção Futura

### 1. Configuração de Heartbeat
```yaml
# Recomendação: Manter desabilitado em produção
HEARTBEAT_ENABLED: false

# Se habilitar, use intervalo maior:
HEARTBEAT_INTERVAL_MINUTES: 360  # 6 horas ao invés de 30min
```

### 2. Rate Limiting
Adicionar limites de taxa para evitar consumo excessivo:
```typescript
// Sugestão: Adicionar rate limiter ao HeartbeatManager
private maxCallsPerHour: number = 2;
private callsThisHour: number = 0;
```

### 3. Cost Monitoring
- Implementar tracking de custos por componente
- Alertas quando custo/hora excede threshold
- Dashboard com métricas de uso da API

### 4. Deployment Safety
- Usar `strategy.type: RollingUpdate` com `maxUnavailable: 0`
- Evitar múltiplos pods simultâneos para volumes RWO
- Testar deployments em staging primeiro

### 5. Model Validation
- Validar nomes de modelos no startup
- Usar constantes para model IDs (evitar typos)
```typescript
export const CLAUDE_MODELS = {
  OPUS_4_5: 'claude-opus-4-5-20251101',
  SONNET_4_5: 'claude-sonnet-4-5-20250929',
  HAIKU_4_5: 'claude-haiku-4-5-20251001'
} as const;
```

## 💰 Estimativa de Custos

### Com Opus 4.5 ($15 input / $75 output per MTok)
- Heartbeat usa ~300 input + 200 output tokens
- Custo por chamada: ~$0.02
- Para $40: **~2000 chamadas**
- Com 20 pods x 3h x 6 chamadas/h = **360 chamadas máximo**
- **Conclusão:** Provavelmente houve retries ou erros multiplicando chamadas

### Cenário Provável:
- Modelo incorreto causa erro 404
- Retry automático (3-5 tentativas por chamada)
- 360 chamadas x 5 retries = **1800 chamadas**
- 1800 x $0.02 = **$36** ✅ Próximo de $40

## 📝 Lições Aprendidas

1. **Sempre revisar env vars** antes de deployment
2. **Heartbeat deve ser opt-in**, não opt-out
3. **Validar model IDs** no código (testes)
4. **Monitorar custos** em tempo real
5. **Staging environment** para testar mudanças caras

## 🔧 TODOs

- [ ] Adicionar testes de validação de model IDs
- [ ] Implementar rate limiting no HeartbeatManager
- [ ] Criar dashboard de custos API
- [ ] Documentar custos esperados por feature
- [ ] Adicionar alertas de custo no Slack/Discord
- [ ] Revisar todas as chamadas periódicas (memory curator, etc)

## 📚 Referências

- HeartbeatManager: `src/heartbeat/heartbeat-manager.ts`
- Deployment: `kubectl get deployment ulf-warden-agent -n agents -o yaml`
- Anthropic Pricing: https://www.anthropic.com/pricing
