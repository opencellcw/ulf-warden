# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          | Notes                    |
| ------- | ------------------ | ------------------------ |
| 1.x.x   | ✅ Yes             | Current stable release   |
| < 1.0   | ❌ No              | Pre-release versions     |

**Recommendation:** Always use the latest stable release for production deployments.

## Reporting a Vulnerability

### Where to Report

**Please DO NOT open public GitHub issues for security vulnerabilities.**

Instead, report security issues directly to:

- **Email:** lucas@cloudwalk.io
- **Subject:** `[SECURITY] OpenCell - Brief Description`
- **Include:**
  - Description of the vulnerability
  - Steps to reproduce
  - Potential impact
  - Suggested fix (if available)

### What to Expect

1. **Acknowledgment:** Within 48 hours
2. **Initial Assessment:** Within 5 business days
3. **Updates:** Every 7 days until resolved
4. **Resolution:** Target 30 days for critical issues

### Disclosure Policy

- **Coordinated Disclosure:** We follow responsible disclosure practices
- **Public Disclosure:** After fix is released and users have time to update
- **Credit:** Security researchers will be credited (unless they prefer anonymity)

## Security Scope

### In Scope

- Authentication bypass
- Privilege escalation
- Remote code execution
- SQL injection / Command injection
- Cross-site scripting (XSS)
- API key leakage
- Secret exposure in logs
- Denial of Service (DoS) affecting core functionality

### Out of Scope

- Social engineering attacks
- Physical attacks
- Issues in third-party dependencies (report to upstream)
- Rate limiting on non-critical endpoints
- Issues requiring physical access to infrastructure

## Security Best Practices

### For Self-Hosted Deployments

1. **Secrets Management**
   - Use Google Secret Manager (recommended)
   - Never commit `.env` files
   - Rotate API keys regularly

2. **Network Security**
   - Deploy on private GKE clusters when possible
   - Use Cloud Armor for DDoS protection
   - Enable VPC Service Controls

3. **Access Control**
   - Limit Kubernetes RBAC permissions
   - Use Workload Identity for GCP access
   - Enable audit logging

4. **Monitoring**
   - Monitor for unusual API usage patterns
   - Set up alerts for failed authentication attempts
   - Review logs regularly

   **View security logs in production:**
   ```bash
   # All security events
   kubectl logs -n agents deployment/ulf-warden-agent | grep -E "BlockedTools|Vetter|Sanitizer|RateLimiter|ToolExecutor"

   # Blocked attempts (last hour)
   kubectl logs -n agents deployment/ulf-warden-agent --since=1h | grep "blocked"

   # Rate limit violations
   kubectl logs -n agents deployment/ulf-warden-agent | grep "limit_exceeded"
   ```

   **Cloudflare AI Gateway Dashboard:**
   https://dash.cloudflare.com/7283c262bf55c00e77b037dca0a48dd6/ai/ai-gateway/general

### Environment Variables

The following environment variables contain sensitive data and should NEVER be committed:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN`
- `DISCORD_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`

## Security Architecture

For a comprehensive overview of our security implementation, see:
👉 **[SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md)** - Complete 7-layer security architecture documentation

### Quick Overview

Our system implements **7 layers of security** (Defense in Depth):

1. **Rate Limiting** - 30 requests/min per user
2. **Sanitizer** - Prompt injection detection
3. **Tool Blocklist** - Configurable allow/blocklist (OpenClaw-inspired)
4. **Vetter (Pattern)** - Command injection, path traversal detection
5. **Vetter (AI)** - Intent analysis via Claude Haiku
6. **Secure Executor** - 30s timeouts, 5 concurrent tools max
7. **AI Gateway** - Cloudflare analytics & DDoS protection

### Implementation Files

| Component | File | Status |
|-----------|------|--------|
| Rate Limiter | [`src/rate-limiter.ts`](src/rate-limiter.ts) | ✅ Active |
| Sanitizer | [`src/security/sanitizer.ts`](src/security/sanitizer.ts) | ✅ Active |
| Tool Blocklist | [`src/config/blocked-tools.ts`](src/config/blocked-tools.ts) | ✅ Active |
| Vetter | [`src/security/vetter.ts`](src/security/vetter.ts) | ✅ Active |
| Secure Executor | [`src/security/tool-executor.ts`](src/security/tool-executor.ts) | ✅ Active |

### Security Comparisons

- **vs OpenClaw:** [`docs/OPENCLAW_SECURITY_COMPARISON.md`](docs/OPENCLAW_SECURITY_COMPARISON.md)
- **vs Moltworker:** [`docs/SECURITY_COMPARISON.md`](docs/SECURITY_COMPARISON.md)

## Known Security Features

- **Pre-commit hooks:** Prevent committing secrets
- **Self-defense system:** Detects and blocks social engineering attempts
- **SQL injection protection:** Parameterized queries throughout
- **Input validation:** All user inputs are sanitized
- **Rate limiting:** Built-in for API endpoints (30 req/min per user)
- **Prompt injection defense:** Pattern-based detection
- **Tool execution security:** Timeouts, concurrency limits, blocklist
- **AI-powered vetting:** Intent analysis before tool execution
- **Secret management:** Google Cloud Secret Manager integration
- **API Gateway:** Cloudflare AI Gateway for DDoS protection

## Testing & Validation

**Security Test Suite:** [`scripts/test-security.sh`](scripts/test-security.sh)

Run comprehensive security tests:
```bash
./scripts/test-security.sh
```

Tests include:
- Rate limit enforcement
- Prompt injection detection
- Tool blocklist validation
- Timeout enforcement
- Concurrency limits
- Command/path injection detection
- SSRF protection

For manual testing instructions, see [SECURITY_ARCHITECTURE.md](SECURITY_ARCHITECTURE.md#testing--validation).

## Security Updates

Security updates are released as:
- **Critical:** Immediate patch release (1.x.y)
- **High:** Within 7 days
- **Medium:** Next minor release (1.x.0)
- **Low:** Next major release (x.0.0)

**Recent Security Improvements:**
- **2026-02-03:** OpenClaw-Security integration (tool blocklist, timeouts, concurrency limits)

## Contact

For non-security-related issues, use:
- **GitHub Issues:** https://github.com/cloudwalk/opencell/issues
- **Discord:** https://discord.gg/47ZYQzHX

For security issues, always use: **lucas@cloudwalk.io**

---

**Last Updated:** February 2026
**Policy Version:** 1.0
