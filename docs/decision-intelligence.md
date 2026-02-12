# 🧠 Decision Intelligence System

## Overview

O **Decision Intelligence System** é um sistema de análise multi-perspectiva que ajuda você a tomar decisões importantes consultando múltiplos AIs simultaneamente (GPT-4, Claude, Gemini).

Ao invés de confiar em apenas um modelo, você obtém:
- ✅ **5 perspectivas diferentes** (Analytical, Creative, Skeptical, Pragmatic, Ethical)
- ✅ **Consenso com score de confiança** (0-100)
- ✅ **Nível de concordância** entre os agentes (%)
- ✅ **Análise agregada** de prós, contras e riscos
- ✅ **Perguntas críticas** que você deve responder antes de decidir
- ✅ **Alternativas sugeridas** que você não tinha considerado

---

## 🚀 Como Usar

### Comando Básico

```
!decide [sua pergunta]
```

ou

```
!decision [sua pergunta]
```

### Exemplos

**1. Decisão Técnica:**
```
!decide Should I migrate to microservices or keep the monolith?
```

**2. Decisão de Negócio:**
```
!decide Devo focar em SEO orgânico ou investir em paid ads?
```

**3. Decisão de Contratação:**
```
!decide Contratar senior dev agora ou esperar pelo candidato perfeito?
```

**4. Decisão Estratégica:**
```
!decide Vale a pena fazer pivot para B2B ou continuar B2C?
```

**5. Decisão de Investimento:**
```
!decide Investir em nova feature ou melhorar infraestrutura?
```

**6. Comparando Alternativas:**
```
!decide React ou Vue para o novo projeto?
```

---

## 📊 O Que Você Recebe

### 1. Análise Multi-Perspectiva

Cada um dos 5 agentes analisa sua decisão de um ângulo diferente:

#### 📊 **Strategic Analyst**
- Foco: Dados, métricas, análise quantitativa
- Usa: Frameworks analíticos (SWOT, árvore de decisão)
- Identifica: Riscos mensuráveis, ROI, benchmarks

#### 💡 **Creative Strategist**
- Foco: Inovação, alternativas não óbvias
- Questiona: Suposições, status quo
- Identifica: Oportunidades disruptivas, abordagens não convencionais

#### ⚠️ **Critical Skeptic**
- Foco: O que pode dar errado
- Assume: Lei de Murphy (se pode, vai dar errado)
- Identifica: Riscos ocultos, blind spots, efeitos de segunda ordem

#### 🔨 **Pragmatic Executor**
- Foco: Viabilidade, execução real
- Considera: Recursos, capacidade da equipe, constraints
- Identifica: Quick wins, abordagens incrementais, MVP

#### 🎯 **Ethical Advisor**
- Foco: Impacto em stakeholders, valores, longo prazo
- Considera: Todos os afetados (empregados, clientes, sociedade)
- Identifica: Implicações éticas, impacto reputacional

### 2. Consenso Agregado

Você recebe:
- **Recomendação final** (o que a maioria recomenda)
- **Score de confiança** (0-100) - quão confiantes estão
- **Nível de concordância** (%) - quão unânimes estão
- **Votos dissidentes** (se houver discordância)
- **Alternativas sugeridas** (opções que você não tinha considerado)

### 3. Insights Agregados

- **Top 5 Vantagens** (os prós mais mencionados)
- **Top 5 Desvantagens** (os contras mais importantes)
- **Top 5 Riscos** (os perigos mais críticos)
- **Perguntas Críticas** (que você DEVE responder antes de decidir)

### 4. Detalhes Individuais

Perspectiva de cada agente com:
- Recomendação específica
- Score de confiança
- Raciocínio detalhado
- Pontos-chave identificados

---

## 🎯 Quando Usar

### ✅ **Ideal Para:**

- **Decisões de alto impacto** (arquitetura, estratégia, contratação)
- **Trade-offs complexos** (múltiplas variáveis, sem resposta óbvia)
- **Decisões não reversíveis** (ou difíceis de reverter)
- **Quando você está em dúvida** (precisa de perspectivas externas)
- **Decisões onde stakeholders discordam** (ter análise neutra ajuda)
- **Antes de investimentos significativos** (tempo, dinheiro, recursos)

### ❌ **Não Ideal Para:**

- **Decisões triviais** ("que cor usar no botão?")
- **Decisões urgentíssimas** (30-60s de análise pode ser muito)
- **Decisões emocionais** (IA não substitui sentimento humano)
- **Quando você já tem certeza** (confirmação bias é real)

---

## 💰 Custo

Cada análise custa aproximadamente:
- **$0.10 - $0.30 USD** (dependendo da complexidade)
- Consulta 5 agentes em paralelo (30-60 segundos)
- Usa Smart Router para otimizar custo automaticamente

**Muito mais barato que:**
- ❌ Consultar especialistas ($100+/hora)
- ❌ Contratar consultoria ($1,000+)
- ❌ Tomar decisão errada ($10,000+)

---

## 📈 Interpretando os Resultados

### Score de Confiança

| Score | Interpretação |
|-------|---------------|
| **90-100** | Alta confiança - decisão clara, dados sólidos |
| **70-89** | Boa confiança - leve para frente com atenção |
| **50-69** | Confiança média - investigue mais antes |
| **30-49** | Baixa confiança - dados insuficientes |
| **0-29** | Muito incerto - não decida ainda |

### Nível de Concordância

| Nível | Interpretação |
|-------|---------------|
| **80-100%** | Consenso forte - todos concordam |
| **60-79%** | Maioria clara - alguns pontos de discordância |
| **40-59%** | Dividido - considere TODAS perspectivas |
| **0-39%** | Forte divergência - analise mais |

### Quando Há Divergência

Se os agentes discordarem fortemente:
1. ✅ **Leia TODAS as perspectivas** (não apenas a maioria)
2. ✅ **Entenda POR QUE discordam** (insights valiosos)
3. ✅ **Identifique suposições diferentes** (qual é válida?)
4. ✅ **Responda as perguntas críticas** primeiro
5. ✅ **Considere abordagem híbrida** (combinar aspectos)

---

## 🔍 Exemplos de Uso Real

### Exemplo 1: Decisão Técnica

**Pergunta:**
```
!decide Should we migrate from monolith to microservices?
```

**Resultado Hipotético:**
- **Consenso:** "Start with hybrid approach - extract critical services first"
- **Confiança:** 75/100
- **Concordância:** 80%
- **Dissidentes:** Critical Skeptic (recomendou manter monolith)
- **Top Risco:** "Over-engineering for current scale, operational complexity"
- **Pergunta Crítica:** "What is your team's experience with distributed systems?"

**Ação:** Planejar migração gradual, começar por serviço mais crítico.

---

### Exemplo 2: Decisão de Contratação

**Pergunta:**
```
!decide Contratar 2 mid-level devs agora ou esperar 1 senior dev?
```

**Resultado Hipotético:**
- **Consenso:** "Hire 2 mid-level developers now"
- **Confiança:** 82/100
- **Concordância:** 100% (unânime!)
- **Top Vantagem:** "Faster execution, team redundancy, lower risk"
- **Top Risco:** "May need more code review, mentorship time"
- **Alternativa Sugerida:** "Hire 1 mid + 1 junior + mentor both"

**Ação:** Contratar 2 mid-levels, investir em onboarding estruturado.

---

### Exemplo 3: Decisão de Produto

**Pergunta:**
```
!decide Cobrar $49/mês ou $490/ano com desconto?
```

**Resultado Hipotético:**
- **Consenso:** "Split decision - test both with A/B"
- **Confiança:** 55/100 (médio)
- **Concordância:** 60% (maioria prefere anual)
- **Dissidentes:** Pragmatist (recomendou mensal), Analyst (inconclusivo)
- **Pergunta Crítica:** "What is your customer CAC and LTV? Can you afford to wait 12 months for revenue?"
- **Alternativa:** "Offer both, default to annual but allow monthly"

**Ação:** Implementar A/B test, analisar métricas por 30 dias.

---

## 📝 Histórico de Decisões

O sistema salva todas as decisões consultadas:
- ✅ Acesse histórico com `/decisions history`
- ✅ Marque decisões implementadas: `/decisions implemented [id] success`
- ✅ Veja estatísticas: `/decisions stats`
- ✅ Compare resultados reais vs previstos

**Nota:** Comandos de histórico estão em desenvolvimento.

---

## 🛠️ Configuração Técnica

### Para Desenvolvedores

O sistema usa:
- **5 agentes** com prompts especializados
- **Smart Router** para otimizar custo (usa Gemini Flash quando possível)
- **Parallel execution** (5 análises simultâneas)
- **SQLite storage** para histórico
- **Discord embeds** para visualização rica

### Arquivos Principais

```
src/decision-intelligence/
├── types.ts              # TypeScript types
├── prompts.ts            # Prompts especializados por agente
├── analyzer.ts           # Engine de análise
├── storage.ts            # Histórico em SQLite
├── discord-handler.ts    # Interface Discord
└── index.ts              # Exports
```

### Integração

```typescript
import { getDecisionAnalyzer } from './decision-intelligence';

const analyzer = getDecisionAnalyzer();
const analysis = await analyzer.analyze({
  question: "Should I migrate to TypeScript?",
  alternatives: ["TypeScript", "Keep JavaScript"],
  userId: "user123",
  channelId: "channel456",
  platform: "discord"
});

console.log(analysis.consensus.recommendation);
console.log(`Confidence: ${analysis.consensus.confidenceScore}/100`);
```

---

## 🚧 Roadmap

### v1.1 (Próxima)
- [ ] Comando `/decisions history` para ver decisões passadas
- [ ] Comando `/decisions stats` para estatísticas do usuário
- [ ] Marcar decisões como implementadas e tracking de outcome
- [ ] Exportar análise completa em PDF

### v1.2 (Futuro)
- [ ] Integração com Slack e Telegram
- [ ] Análise de decisão com contexto adicional (arquivos, docs)
- [ ] Comparação side-by-side de múltiplas decisões
- [ ] Dashboard web para visualização

### v2.0 (Visão)
- [ ] Aprendizado com feedback (decision outcomes)
- [ ] Recomendações proativas baseadas em padrões
- [ ] Integração com ferramentas de projeto (Jira, Linear)
- [ ] Análise de impacto pós-decisão

---

## 🤔 FAQ

### P: Posso confiar 100% na recomendação?

**R:** Não. Os AIs fornecem **perspectivas e análise**, não **verdade absoluta**. Você ainda precisa:
- ✅ Validar suposições
- ✅ Considerar contexto específico
- ✅ Usar seu julgamento
- ✅ Consultar especialistas quando necessário

**Use como:** Conselheiro inteligente, não oráculo.

---

### P: E se os agentes discordarem totalmente?

**R:** Isso é VALIOSO! Significa:
- ✅ A decisão é genuinamente complexa
- ✅ Há trade-offs significativos
- ✅ Suposições diferentes levam a conclusões diferentes

**Ação recomendada:**
1. Leia TODAS as perspectivas
2. Identifique qual suposição é mais válida no SEU contexto
3. Responda as perguntas críticas primeiro
4. Considere abordagem híbrida ou faseada

---

### P: Quanto custa usar o sistema?

**R:** ~$0.10-0.30 USD por análise (consulta 5 AIs).

**Comparado com:**
- Consultor: $100-500/hora ❌
- Decisão errada: $1,000-100,000+ ❌
- Indecisão/paralisia: Custo de oportunidade ❌

**ROI:** Altíssimo se usado para decisões importantes.

---

### P: Posso usar para decisões pessoais?

**R:** SIM! Funciona para:
- ✅ Decisões de carreira
- ✅ Investimentos pessoais
- ✅ Grandes compras
- ✅ Mudanças de vida

**Não use para:**
- ❌ Questões médicas (consulte médico)
- ❌ Questões legais (consulte advogado)
- ❌ Relacionamentos complexos (terapia > IA)

---

### P: Os dados são privados?

**R:** 
- ✅ Análises salvas localmente (SQLite)
- ✅ Enviadas para LLMs (OpenAI, Anthropic, Google) para processamento
- ⚠️  LLMs podem usar dados para treinamento (conforme políticas deles)
- ✅ Nenhum compartilhamento com terceiros além dos LLMs

**Para decisões ultra-sensíveis:** Use versão self-hosted com LLMs locais.

---

## 📞 Suporte

- **Bug report:** Abra issue no GitHub
- **Feature request:** Discussão no Discord
- **Dúvidas:** Canal #decision-intelligence

---

## 🎓 Conclusão

O **Decision Intelligence System** não toma decisões por você, mas te dá **superpoderes analíticos**:

1. ✅ **Múltiplas perspectivas** em segundos (vs horas de pesquisa)
2. ✅ **Identifica blind spots** que você não viu
3. ✅ **Estrutura o pensamento** de forma sistemática
4. ✅ **Reduz vieses** (confirmation bias, optimism bias)
5. ✅ **Economiza tempo e dinheiro** vs consultoria tradicional

**Use sabiamente para decisões que importam!** 🚀

---

**Comando rápido:**
```
!decide [sua pergunta aqui]
```

**Em 60 segundos você terá análise de 5 perspectivas diferentes!** 🧠
