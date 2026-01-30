# 🤖 Self-Improvement System

Sistema de auto-melhoria do Ulfberht com aprovação humana obrigatória.

## 🎯 Como Funciona

1. **Ulf identifica necessidade** → Propõe melhoria
2. **Implementa automaticamente** → Cria branch + código + testes
3. **Abre Pull Request** → Documentação completa
4. **Aguarda aprovação humana** → 1 ou 2 aprovações dependendo do risco
5. **Deploy** → Merge automático após aprovação

## 🛡️ Guardrails (Crítico!)

### ❌ Arquivos Bloqueados
NUNCA podem ser auto-modificados:
- `.env*` - Variáveis de ambiente
- `*secret*`, `*credential*`, `*password*`, `*token*` - Secrets
- `package.json`, `tsconfig.json` - Configs críticas

### ⚠️ Níveis de Risco

| Risco | Aprovações | Exemplos |
|-------|-----------|----------|
| **Low** | 1 | Novo comando, nova tool simples |
| **Medium** | 1 | Modificar handler, adicionar feature |
| **High** | 2 | Alterar core (agent.ts, database.ts) |

### 🚦 Rate Limiting
- Máximo **5 propostas/dia**
- Evita spam de melhorias

## 📋 Workflow Completo

```
┌─────────────────────────────────────────────────────────────┐
│ 1. IDENTIFICAÇÃO DE NECESSIDADE                            │
│    • Ferramenta falha 3x → propõe fix                     │
│    • Usuário pede feature inexistente → propõe            │
│    • Padrão repetitivo detectado → propõe automação       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PROPOSTA (propose_self_improvement)                     │
│    • Analisa ideia com Claude                              │
│    • Gera plano de implementação                           │
│    • Valida guardrails                                     │
│    • Calcula risco                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. IMPLEMENTAÇÃO (implement_proposal)                      │
│    • git checkout -b auto/improvement-xxx                  │
│    • Gera código com Claude                                │
│    • Escreve arquivos                                      │
│    • npm run build (valida)                                │
│    • git commit && git push                                │
│    • gh pr create                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. APROVAÇÃO (approve_improvement)                         │
│    • Humano revisa PR                                      │
│    • Risk low/medium = 1 aprovação                         │
│    • Risk high = 2 aprovações                              │
│    • Ou rejeita (reject_improvement)                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. DEPLOY (deploy_improvement)                             │
│    • gh pr merge --squash --delete-branch                  │
│    • Marca como deployed                                   │
│    • Registra no audit log                                 │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 Tools Disponíveis

### Para o Agente (Ulf)

```typescript
propose_self_improvement({
  idea: "Add /status command to show uptime and version"
})
```

```typescript
list_pending_improvements({})
// Lista todas propostas aguardando ação
```

```typescript
get_improvement_stats({})
// Estatísticas: taxa de sucesso, propostas hoje, etc.
```

### Para Humanos (via chat ou comando)

```bash
# Aprovar
@ulf approve_improvement {proposal_id}

# Rejeitar
@ulf reject_improvement {proposal_id} reason="não é necessário"

# Deployar (após aprovação)
@ulf deploy_improvement {proposal_id}
```

## 📊 Exemplo Real

### Caso: Adicionar comando /status

**1. Proposta:**
```
User: "Seria legal ter um comando pra ver se o bot tá online"

Ulf detecta necessidade → propose_self_improvement
Idea: "Add /status command that shows bot uptime, version, and health"
```

**2. Análise do Sistema:**
```json
{
  "type": "feature",
  "title": "Add /status command",
  "files": ["src/commands/status.ts"],
  "risk": "low",
  "estimatedChanges": 50
}
```

**3. Implementação:**
```typescript
// src/commands/status.ts (auto-gerado)
export function getStatus() {
  return {
    status: 'online',
    uptime: process.uptime(),
    version: '1.0.0',
    memory: process.memoryUsage()
  };
}
```

**4. PR Criado:**
```
Title: Add /status command
Branch: auto/improvement-abc123
Files: src/commands/status.ts

Risk: LOW (1 approval required)
Estimated changes: 50 lines
```

**5. Aprovação:**
```
Human: @ulf approve_improvement abc123

System: ✅ Proposal approved! Ready to deploy.
```

**6. Deploy:**
```
Human: @ulf deploy_improvement abc123

System: ✅ Deployed! PR #123 merged to main.
```

## 🔍 Auto-Detecção de Necessidades

### 1. Tool Failures (3x)
```
execute_shell falhou 3x com mesmo erro
→ propõe: "Add error handling for X"
```

### 2. Missing Features
```
User: "Me gera uma logo"
Ulf: Não tenho essa tool

→ propõe: "Integrate logo generation API"
```

### 3. Repetitive Patterns
```
Usuário sempre pede: "Me lembra em X minutos"

→ propõe: "Add quick reminder shortcuts"
```

## 📈 Métricas

### Via get_improvement_stats:
```
📊 Self-Improvement Stats

Total Proposed: 12
Approved: 10
Rejected: 1
Deployed: 9
Failed: 1

Success Rate: 75%
Today: 2/5 proposals (rate limit)
```

## 🗄️ Banco de Dados

### Tabelas:

**improvement_proposals:**
- id, type, title, description, reasoning
- risk, files, branch, pr_url, pr_number
- status, proposed_by, proposed_at
- approved_by, rejected_by, deployed_at
- implementation_plan, estimated_changes
- attempts, errors

**approval_requests:**
- proposal_id, channel, message_id
- requested_at, expires_at

## ⚡ Quick Start

### Testar Sistema:

```typescript
// No chat com Ulf
@ulf propose uma melhoria: adicionar comando /status que mostra uptime

// Ulf responde:
✅ Improvement Proposed
ID: abc123-def456
Title: Add /status command
Risk: low
Files: src/commands/status.ts

// Implementar
@ulf implementProposal abc123-def456

// Aprovar
@ulf approve_improvement abc123-def456

// Deploy
@ulf deploy_improvement abc123-def456
```

## 🚨 Troubleshooting

### Proposta bloqueada:
```
❌ File ".env" is blacklisted
→ Remove do proposal.files
```

### Rate limit:
```
❌ Rate limit: 5/5 proposals today
→ Aguarde até amanhã
```

### Build falhou:
```
❌ npm run build failed
→ Proposta marcada como 'failed'
→ Erro salvo em proposal.errors
→ Pode tentar novamente (proposal.attempts++)
```

### PR não foi criado:
```
❌ gh pr create failed
→ Verifica se gh CLI está configurado
→ Verifica permissões do repo
```

## 🔐 Segurança

### ✅ Garantias:
- **Nunca auto-merge** - Humano sempre decide
- **Audit log completo** - Tudo registrado no DB
- **Rollback fácil** - Branch + PR preservados
- **Validação de código** - npm run build obrigatório
- **Blacklist rígida** - Arquivos críticos protegidos

### ⚠️ Cuidados:
- Sempre revisar PR antes de aprovar
- Risk HIGH = revisar com atenção
- Testar localmente se possível
- Pode usar `git revert` se der problema

## 📝 Audit Log

Todas ações são logadas:

```sql
SELECT
  id, title, type, risk, status,
  proposed_at, deployed_at
FROM improvement_proposals
ORDER BY proposed_at DESC
LIMIT 10;
```

## 🎓 Próximos Passos

### Features Futuras:
- [ ] Auto-rollback se deploy falhar
- [ ] Notificações Slack/Discord para aprovações
- [ ] UI web para gerenciar propostas
- [ ] Testes automáticos antes de PR
- [ ] Métricas de impacto pós-deploy
- [ ] ML para priorizar propostas
- [ ] Auto-aprovação para propostas triviais (com whitelist)

## 📚 Referências

- Guardrails: `src/evolution/guardrails.ts`
- Core System: `src/evolution/self-improver.ts`
- Tools: `src/tools/self-improvement.ts`
- Types: `src/evolution/types.ts`
