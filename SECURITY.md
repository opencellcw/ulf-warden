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

### Environment Variables

The following environment variables contain sensitive data and should NEVER be committed:

- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `SLACK_BOT_TOKEN` / `SLACK_APP_TOKEN`
- `DISCORD_BOT_TOKEN`
- `TELEGRAM_BOT_TOKEN`

## Known Security Features

- **Pre-commit hooks:** Prevent committing secrets
- **Self-defense system:** Detects and blocks social engineering attempts
- **SQL injection protection:** Parameterized queries throughout
- **Input validation:** All user inputs are sanitized
- **Rate limiting:** Built-in for API endpoints

## Security Updates

Security updates are released as:
- **Critical:** Immediate patch release (1.x.y)
- **High:** Within 7 days
- **Medium:** Next minor release (1.x.0)
- **Low:** Next major release (x.0.0)

## Contact

For non-security-related issues, use:
- **GitHub Issues:** https://github.com/cloudwalk/opencell/issues
- **Discord:** https://discord.gg/47ZYQzHX

For security issues, always use: **lucas@cloudwalk.io**

---

**Last Updated:** February 2026
**Policy Version:** 1.0
