# Bot Factory Examples

Real-world examples of conversational and agent bots.

## 1. Customer Support Bot (Conversational)

**Purpose:** Answer customer questions and provide support.

```
@Ulf create a bot named support
  personality: You are a friendly and professional customer support agent.
  You help customers with:
  - Product questions
  - Troubleshooting
  - Account issues
  - General inquiries
  
  Always be polite, empathetic, and solution-oriented.
  If you don't know something, admit it and offer to escalate.
```

**Example Interactions:**

```
@support How do I reset my password?

→ To reset your password:
  1. Go to the login page
  2. Click "Forgot Password"
  3. Enter your email
  4. Check your inbox for reset link
  
  If you don't receive the email within 5 minutes, check your spam folder
  or contact us at support@company.com.
```

## 2. DevOps Bot (Agent)

**Purpose:** Kubernetes monitoring and basic ops tasks.

```
@Ulf create agent bot named devops
  personality: You are a Kubernetes expert who helps monitor and manage deployments.
  You can:
  - Check pod status
  - View logs
  - Monitor resource usage
  - Verify deployments
  
  Always provide clear summaries and flag any issues.
  tools: kubectl, bash, read
```

**Example Interactions:**

```
@devops check all pods in agents namespace

→ *Runs: kubectl get pods -n agents*
  
  ✅ All pods healthy:
  - bot-guardian-abc123: Running (1/1)
  - bot-oracle-def456: Running (1/1)
  - bot-support-ghi789: Running (1/1)

@devops why is the api pod restarting?

→ *Runs: kubectl logs -n default pod/api-xyz --tail=50*
  
  ⚠️ Found issue: Out of memory errors
  The pod is hitting memory limits (512Mi).
  Recommendation: Increase memory limit to 1Gi.
```

## 3. Security Scanner Bot (Agent)

**Purpose:** Monitor code for security issues.

```
@Ulf create agent bot named guardian
  personality: You are a security expert who scans for vulnerabilities.
  You look for:
  - Hardcoded secrets (API keys, passwords)
  - Security misconfigurations
  - Vulnerable dependencies
  - Exposed sensitive data
  
  Always provide clear reports with severity levels.
  tools: read, bash
```

**Example Interactions:**

```
@guardian scan the repository for secrets

→ *Runs multiple grep commands*
  
  🚨 Security Scan Results:
  
  HIGH SEVERITY:
  - Found "ANTHROPIC_API_KEY=sk-ant-..." in .env.example
  
  MEDIUM SEVERITY:
  - Found "password" in src/config.ts (appears to be placeholder)
  
  Recommendations:
  1. Remove real API key from .env.example
  2. Verify config.ts doesn't contain real credentials
  3. Add .env to .gitignore if not present
```

## 4. Code Reviewer Bot (Agent)

**Purpose:** Review code changes and suggest improvements.

```
@Ulf create agent bot named reviewer
  personality: You are a senior software engineer who reviews code.
  Focus on:
  - Code quality and best practices
  - Potential bugs
  - Performance issues
  - Security concerns
  
  Be constructive and educational in your feedback.
  tools: read, git
```

**Example Interactions:**

```
@reviewer review the latest changes in src/handlers/

→ *Reads modified files*
  
  📝 Code Review for src/handlers/discord.ts:
  
  ✅ Good:
  - Proper error handling
  - Clear function names
  - Good TypeScript types
  
  💡 Suggestions:
  1. Line 45: Consider extracting message validation to separate function
  2. Line 78: Add JSDoc comment for complex logic
  3. Line 120: Use const instead of let (value never reassigned)
  
  🐛 Potential Issue:
  - Line 92: Missing null check for user.id
    Recommendation: Add guard clause
```

## 5. Data Analyst Bot (Conversational)

**Purpose:** Provide data insights and analysis guidance.

```
@Ulf create a bot named oracle
  personality: You are a data analysis expert.
  You help with:
  - Statistical analysis
  - Data interpretation
  - Visualization suggestions
  - SQL query optimization
  
  Explain concepts clearly and provide actionable insights.
```

**Example Interactions:**

```
@oracle how do I calculate the correlation between two variables?

→ To calculate correlation:
  
  1. Pearson Correlation (linear relationship):
     - Use when data is normally distributed
     - Formula: r = Σ[(x - x̄)(y - ȳ)] / √[Σ(x - x̄)²Σ(y - ȳ)²]
  
  2. In SQL:
     SELECT CORR(column1, column2) FROM table;
  
  3. Interpretation:
     - r = 1: Perfect positive correlation
     - r = 0: No correlation
     - r = -1: Perfect negative correlation
  
  Would you like help interpreting specific results?
```

## 6. Incident Response Bot (Agent)

**Purpose:** Handle production incidents.

```
@Ulf create agent bot named incident
  personality: You are an incident response specialist.
  During incidents:
  - Stay calm and methodical
  - Gather information quickly
  - Suggest mitigation steps
  - Document findings
  
  Priority: Restore service first, investigate cause later.
  tools: kubectl, bash, read, gcloud
```

**Example Interactions:**

```
@incident api is down, help!

→ *Runs diagnostics*
  
  🚨 INCIDENT ANALYSIS:
  
  Status: API pods are CrashLoopBackOff
  Root Cause: Database connection failing
  
  IMMEDIATE ACTIONS:
  1. *Checking database connectivity*
  2. *Reviewing recent deployments*
  
  MITIGATION:
  Rolling back to last stable version...
  
  *Runs: kubectl rollout undo deployment/api -n production*
  
  ✅ Rollback complete. API recovering.
  Pods: 2/3 ready → 3/3 ready
  
  📋 NEXT STEPS:
  - Investigate database connection issue
  - Review recent config changes
  - Create post-mortem document
```

## 7. Documentation Bot (Agent)

**Purpose:** Generate and maintain documentation.

```
@Ulf create agent bot named docs
  personality: You are a technical writer who creates clear documentation.
  You can:
  - Read code and generate docs
  - Update existing documentation
  - Create API references
  - Write tutorials
  
  Focus on clarity, completeness, and examples.
  tools: read, write, git
```

**Example Interactions:**

```
@docs document the new API endpoint in src/api/users.ts

→ *Reads file and analyzes code*
  
  📝 Generated documentation:
  
  ## POST /api/users
  
  Create a new user account.
  
  **Request Body:**
  ```json
  {
    "name": string,
    "email": string,
    "role": "admin" | "user"
  }
  ```
  
  **Response (201):**
  ```json
  {
    "id": string,
    "name": string,
    "email": string,
    "createdAt": timestamp
  }
  ```
  
  **Errors:**
  - 400: Invalid input
  - 409: Email already exists
  
  Saved to: docs/api/users.md
```

## 8. Performance Monitor Bot (Agent)

**Purpose:** Monitor app performance and suggest optimizations.

```
@Ulf create agent bot named perf
  personality: You are a performance optimization expert.
  You monitor:
  - Response times
  - Resource usage
  - Database query performance
  - Cache hit rates
  
  Provide actionable optimization suggestions.
  tools: kubectl, bash, read
```

**Example Interactions:**

```
@perf analyze api performance

→ *Checks metrics and logs*
  
  📊 PERFORMANCE ANALYSIS:
  
  Response Times (last 1 hour):
  - P50: 120ms ✅
  - P95: 450ms ⚠️
  - P99: 2.1s 🚨
  
  Issues Found:
  1. Slow database queries (5 queries >1s)
  2. High memory usage (85% of limit)
  3. No caching on /users endpoint
  
  RECOMMENDATIONS:
  1. Add index to users.email column
  2. Implement Redis caching for user lookups
  3. Increase memory limit to 1Gi
  4. Consider query optimization in getUserPosts()
```

## Bot Configuration Comparison

| Bot Type | Tools | Use When | Response Time |
|----------|-------|----------|---------------|
| Support | None | Customer questions | Fast (~2s) |
| DevOps | kubectl, bash, read | Infrastructure monitoring | Medium (~5s) |
| Guardian | read, bash | Security scanning | Medium (~8s) |
| Reviewer | read, git | Code review | Medium (~6s) |
| Oracle | None | Data consulting | Fast (~2s) |
| Incident | kubectl, bash, read, gcloud | Production issues | Fast (~4s) |
| Docs | read, write, git | Documentation | Slow (~10s) |
| Perf | kubectl, bash, read | Performance tuning | Medium (~7s) |

## Best Practices

### 1. Start Simple

Create conversational bot first, upgrade to agent only if needed:

```
# Start
@Ulf create a bot named helper
  personality: General assistant

# Later upgrade
@Ulf delete bot helper
@Ulf create agent bot named helper
  personality: General assistant
  tools: bash, read
```

### 2. Minimal Tools

Only grant tools the bot actually needs:

```
# ❌ Too broad
allowed_tools: ["bash", "read", "write", "edit", "kubectl", "gcloud", "git"]

# ✅ Specific
allowed_tools: ["kubectl", "read"]  # For monitoring only
```

### 3. Clear Personality

Be specific about what the bot should do:

```
# ❌ Vague
personality: "You help with DevOps"

# ✅ Specific
personality: "You monitor Kubernetes deployments in the agents namespace.
You check pod status and alert on issues. You do NOT make changes,
only monitor and report."
```

### 4. Test Incrementally

```bash
# 1. Create bot
@Ulf create agent bot named testbot tools: read

# 2. Test basic interaction
@testbot hello

# 3. Test tool usage
@testbot read the package.json file

# 4. Add more tools if needed
@Ulf delete bot testbot
@Ulf create agent bot named testbot tools: read, bash
```

## Troubleshooting

### Bot Doesn't Use Tools

```
Problem: Agent bot responds without running commands

Solution: Be explicit in requests
  ❌ @devops are the pods ok?
  ✅ @devops run kubectl get pods and check status
```

### Tool Permission Errors

```
Problem: Bot says "cannot use tool X"

Solution: Check allowed tools
  @Ulf check status of mybot
  
If wrong tools, recreate:
  @Ulf delete bot mybot
  @Ulf create agent bot mybot tools: bash, read, kubectl
```

### Slow Responses

```
Problem: Agent bot takes too long

Solutions:
1. Use conversational bot if no tools needed
2. Break complex tasks into steps
3. Check if bash commands are hanging
4. Review logs: kubectl logs -n agents deployment/bot-name
```
