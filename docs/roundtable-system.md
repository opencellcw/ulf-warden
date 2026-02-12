# RoundTable Multi-Agent System

Deliberative decision-making system where multiple specialized AI agents discuss, propose solutions, and vote democratically to reach consensus.

## 🎯 Overview

**RoundTable** implements collaborative multi-agent deliberation inspired by the paper "RoundTable: Investigating Group Decision-Making in Multi-Agent Collaboration" (ICLR 2025).

Instead of a single agent responding, RoundTable activates multiple specialized agents who:
1. **Discuss** the topic openly (Message Phase)
2. **Propose** formal solutions (Proposal Phase)
3. **Vote** democratically (Voting Phase)
4. **Deliver** the winning proposal to the user

## 🤖 Agent Personas

Six specialized agents with distinct perspectives:

| Agent | Role | Expertise | Tools |
|-------|------|-----------|-------|
| 📊 **Analyst** | Data-driven insights | Facts, metrics, evidence | web_search, bash, read |
| 💡 **Creative** | Innovative solutions | Out-of-box thinking | image_gen, web_search |
| 🔍 **Skeptic** | Risk identification | Edge cases, failures | web_search, read |
| 🔧 **Pragmatist** | Practical implementation | Actionable solutions | bash, github, read, write |
| ⚖️ **Ethicist** | Ethical evaluation | Long-term impact | web_search |
| 📝 **Summarizer** | Consensus building | Synthesis | read, web_search |

## 🏗️ Architecture

### 3-Phase Process

```
┌─────────────────────────────────────────────┐
│  User Question / Topic                       │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  PHASE 1: Message (Round 1-N)               │
│  All agents discuss simultaneously          │
│  • Share perspectives                        │
│  • Challenge ideas                           │
│  • Build on each other's points             │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  PHASE 2: Proposal                           │
│  Each agent proposes formal solution        │
│  • Title                                     │
│  • Description                               │
│  • Benefits                                  │
│  • Implementation steps                      │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  PHASE 3: Voting                             │
│  Democratic decision using voting rule       │
│  • Majority (simple vote)                    │
│  • Rated (1-5 stars)                         │
│  • Ranked (Borda count)                      │
│  • Unanimity (100% agreement)                │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Winning Proposal Delivered to User         │
│  • Rich Discord embed                        │
│  • Discussion summary                        │
│  • Vote distribution                         │
│  • Implementation guide                      │
└─────────────────────────────────────────────┘
```

## 📋 Usage

### Basic Command

```
!roundtable [topic]
```

**Examples:**
```
!roundtable Should we use MongoDB or PostgreSQL for our SaaS?

!roundtable How to scale our API to 1M requests/day?

!roundtable What's the best deployment strategy for microservices?
```

### Advanced Options

```
!roundtable [topic] --rounds [1-5] --voting [rule] --team [size]
```

**Options:**
- `--rounds [1-5]` - Number of discussion rounds (default: 3)
- `--voting [majority|rated|ranked|unanimity]` - Voting rule (default: majority)
- `--team [default|full|compact]` - Team size (default: 5 agents)

**Examples:**
```
!roundtable Database choice --rounds 2 --voting rated

!roundtable Security architecture --team full --voting unanimity

!roundtable Quick fix --team compact --rounds 1
```

### Automatic Triggering

RoundTable automatically activates for complex queries:

```
@Ulf I need multiple opinions on whether to use REST or GraphQL

@Ulf This is a difficult decision: should we refactor now or ship first?

@Ulf What are the pros and cons of serverless vs containers?
```

**Triggers:**
- Keywords: "opiniões", "conselho", "dilema", "prós e contras"
- Questions with "or" / "vs"
- Long complex queries (>150 chars)

## 🗳️ Voting Rules

### 1. Majority (Default)
Each agent votes for ONE proposal. Most votes wins.

**Use when:** Quick decisions, clear preferences

```
Analyst → Proposal 2
Creative → Proposal 1
Skeptic → Proposal 2
Pragmatist → Proposal 2
Ethicist → Proposal 1

Winner: Proposal 2 (3 votes)
```

### 2. Rated
Each agent rates ALL proposals (1-5 stars). Highest total wins.

**Use when:** Nuanced evaluation, multiple good options

```
         P1  P2  P3
Analyst   4   5   3
Creative  5   3   4
Skeptic   3   4   5
Pragmatist 4   5   3
Ethicist  5   4   4

Totals:  21  21  19
Winner: P1 or P2 (tie, uses tiebreaker)
```

### 3. Ranked (Borda Count)
Each agent ranks ALL proposals. Points awarded: 1st=5pts, 2nd=4pts, etc.

**Use when:** Need consensus on ordering

```
Analyst:   1st P2, 2nd P1, 3rd P3
Creative:  1st P1, 2nd P3, 3rd P2
Skeptic:   1st P3, 2nd P2, 3rd P1
Pragmatist: 1st P2, 2nd P1, 3rd P3
Ethicist:  1st P1, 2nd P2, 3rd P3

Points: P1=16, P2=18, P3=11
Winner: P2
```

### 4. Unanimity
ALL agents must agree on same proposal.

**Use when:** Critical decisions, safety-critical systems

```
If all 5 agents vote for Proposal 2: Winner is P2
If not unanimous: Falls back to Majority voting
```

## 💬 Example Session

### Input
```
!roundtable Should we migrate from MongoDB to PostgreSQL?
```

### Phase 1: Discussion (Round 1)
```
📊 Analyst: MongoDB's flexibility is great but we need ACID guarantees for financial data.

💡 Creative: What if we use both? PostgreSQL for transactions, MongoDB for logs?

🔍 Skeptic: Migration risks are high - downtime, data consistency issues, team learning curve.

🔧 Pragmatist: PostgreSQL migration took us 3 weeks last time. Need 2 FTEs for 1 month.

⚖️ Ethicist: Consider data privacy regulations - PostgreSQL has better compliance tools.
```

### Phase 2: Proposals
```
📊 Analyst: "Gradual Migration to PostgreSQL"
- Migrate critical tables first
- Run dual-database for 3 months
- Benefits: ACID, better querying, joins
- Steps: 1) Schema design 2) Migration scripts 3) Testing 4) Cutover

💡 Creative: "Hybrid Architecture"
- PostgreSQL for ACID data
- Keep MongoDB for flexible schemas
- Benefits: Best of both worlds
- Steps: 1) Identify boundaries 2) Deploy adapters 3) Monitor

(... other proposals)
```

### Phase 3: Voting (Majority)
```
📊 Analyst → Hybrid Architecture
💡 Creative → Hybrid Architecture  
🔍 Skeptic → Stay with MongoDB (concerns about complexity)
🔧 Pragmatist → Hybrid Architecture
⚖️ Ethicist → Gradual Migration

Winner: Hybrid Architecture (3 votes)
```

### Output
```
🎯 RoundTable Decision

**Winning Proposal**: Hybrid Architecture
By: 💡 Creative

**Description**: Use PostgreSQL for ACID-requiring financial transactions 
while keeping MongoDB for flexible logging and analytics data...

**Consensus**: 60%
**Rounds**: 3
**Voting**: majority

✅ Key Benefits:
• Leverages strengths of both databases
• Minimal migration risk
• Flexibility for future changes

📝 Implementation Steps:
1. Identify transaction vs flexible-schema boundaries
2. Deploy database adapters and connection pools
3. Migrate critical financial tables to PostgreSQL
4. Set up monitoring and alerting
5. Gradually move more tables based on requirements

📈 Vote Distribution:
Hybrid Architecture:      ███████ 3 (60%)
Gradual Migration:        ██ 1 (20%)
Stay with MongoDB:        ██ 1 (20%)
```

## 📊 Analytics

### Agent Win Rates

Track which agents' proposals win most often:

```typescript
import { getRoundTableStorage } from './roundtable';

const storage = getRoundTableStorage();
const winRates = storage.getAgentWinRates();

// Example output:
// {
//   'pragmatist': 0.35,  // Pragmatist wins 35% of the time
//   'analyst': 0.25,
//   'creative': 0.20,
//   'skeptic': 0.10,
//   'ethicist': 0.10
// }
```

### Voting Rule Effectiveness

```typescript
const stats = storage.getVotingRuleStats();

// Example output:
// {
//   'majority': { avgConsensus: 0.65, count: 120 },
//   'rated': { avgConsensus: 0.72, count: 45 },
//   'ranked': { avgConsensus: 0.68, count: 30 },
//   'unanimity': { avgConsensus: 1.0, count: 5 }
// }
```

## 🎨 Discord Integration

### Rich Embeds

RoundTable results are displayed as rich Discord embeds with:
- Winning proposal highlighted
- Vote distribution chart
- Discussion summary
- Implementation steps
- Interactive buttons

### Interactive Buttons

- 📜 **View Full Discussion** - See all messages from all rounds
- 📋 **View All Proposals** - Compare all proposals side-by-side
- 📊 **View Statistics** - Participation metrics and quality scores

## 🔧 Configuration

### Custom Teams

```typescript
import { getPersonas } from './roundtable';

// Create custom team
const customTeam = getPersonas(['analyst', 'pragmatist', 'skeptic']);

// Or suggest based on topic
const team = suggestTeam("Should we open-source our codebase?");
// Returns: [ethicist, analyst, pragmatist, creative]
```

### Custom Voting Rules

```typescript
const config = {
  topic: "Database migration strategy",
  maxRounds: 4,
  votingRule: 'rated' as VotingRule,
  agents: DEFAULT_PERSONAS,
  userId: 'user123',
  autoStop: true  // Stop early if consensus reached
};

const result = await orchestrator.run(config);
```

## 🧪 Testing

### Unit Tests

```bash
npm test -- roundtable
```

### Integration Test

```bash
# Start application
npm start

# In Discord
!roundtable test Should REST or GraphQL be used?

# Verify:
# - All 5 agents participate
# - Discussion has at least 1 round
# - Proposals are generated
# - Voting produces winner
# - Embed displays correctly
```

## 📈 Performance

### Cost per Session

With Claude Sonnet 4:
- **Message Phase**: ~5 API calls × $0.003 = $0.015 per round
- **Proposal Phase**: ~5 API calls × $0.005 = $0.025
- **Voting Phase**: ~5 API calls × $0.003 = $0.015

**Total**: ~$0.055 per round (3 rounds = ~$0.165)

With Moonshot AI:
- **Total**: ~$0.005 per round (3 rounds = ~$0.015) - **97% cheaper!**

### Response Time

- Single round: ~10-15 seconds
- 3 rounds: ~30-45 seconds
- Full session: ~1-2 minutes

## 🔐 Security

### Permission Control

Only admins can trigger RoundTable (configurable):

```bash
# .env
ROUNDTABLE_ENABLED_USERS=123456789012345678,987654321098765432
```

### Rate Limiting

Maximum 3 RoundTable sessions per user per hour.

### Cost Protection

- Max 5 rounds per session
- Timeout after 5 minutes
- Early stopping if consensus reached

## 🐛 Troubleshooting

### Session Takes Too Long

```
Problem: RoundTable running for >3 minutes

Solutions:
1. Reduce rounds: !roundtable topic --rounds 2
2. Use compact team: !roundtable topic --team compact
3. Enable autoStop (already default)
```

### Low Consensus Score

```
Problem: Winner only has 40% consensus

Causes:
- Topic is genuinely controversial
- Agents have very different priorities
- Voting rule doesn't fit the decision type

Solutions:
- Try different voting rule: --voting rated
- Use full team with Summarizer: --team full
- Reformulate topic to be more specific
```

### Agent Failures

```
Problem: One agent fails to generate message

Solution:
- Automatic fallback: Agent sends default message
- Session continues with other agents
- Check logs for root cause
```

## 📚 References

- **Paper**: "RoundTable: Investigating Group Decision-Making in Multi-Agent Collaboration"
- **Similar Products**: round-table.ai
- **GitHub**: yorak/airoundtable

## 🚀 Future Enhancements

- [ ] **Adaptive Voting**: Switch rules mid-session based on convergence
- [ ] **Agent Recruiting**: `@mention` specific agents for targeted expertise
- [ ] **Streaming Visual**: Show "Agent typing..." in real-time
- [ ] **Memory Cross-Session**: Agents remember previous discussions
- [ ] **Web Dashboard**: Visual session replay and analytics
- [ ] **Multi-Language**: Support for Portuguese, Spanish, etc.

---

**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2025-02-11
