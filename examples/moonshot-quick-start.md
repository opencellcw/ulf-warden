# Moonshot AI Quick Start

Get started with Moonshot AI in 5 minutes! 🚀

## Prerequisites

- Node.js 20+
- Ulf-Warden installed
- Moonshot API key ([Get one here](https://platform.moonshot.cn/))

## Step 1: Get API Key (2 min)

1. Visit [https://platform.moonshot.cn/](https://platform.moonshot.cn/)
2. Sign up or log in
3. Navigate to "API Keys"
4. Click "Create New Key"
5. Copy the key (starts with `sk-`)

## Step 2: Configure (1 min)

```bash
# Edit .env file
cd /path/to/opencellcw

# Add these lines to .env
echo "LLM_PROVIDER=moonshot" >> .env
echo "MOONSHOT_API_KEY=sk-your-key-here" >> .env
echo "MOONSHOT_MODEL=kimi-k2.5" >> .env
```

Or use the migration script:

```bash
chmod +x scripts/migrate-to-moonshot.sh
./scripts/migrate-to-moonshot.sh
```

## Step 3: Build & Start (1 min)

```bash
npm run build
npm start
```

## Step 4: Test (1 min)

### Test 1: Simple Chat

```
@Ulf hello, how are you?
```

Expected: Response from Moonshot AI

### Test 2: Portuguese

```
@Ulf olá! você fala português?
```

Expected: Response in Portuguese (Moonshot excels at this!)

### Test 3: Tool Calling

```
@Ulf read the package.json file
```

Expected: File contents displayed (tool executed via Moonshot)

### Test 4: Long Context

```
@Ulf summarize our entire conversation history
```

Expected: Summary (Moonshot can handle 2M tokens!)

## Verification

Check that Moonshot is being used:

```
@Ulf /admin check-providers
```

Should show:
```
Primary Provider: moonshot ✅
Moonshot: Available ✅
Claude: Available ✅ (fallback)
```

## Troubleshooting

### Issue: "Moonshot not available"

**Check 1**: API key set?
```bash
grep MOONSHOT_API_KEY .env
```

**Check 2**: Provider configured?
```bash
grep LLM_PROVIDER .env
# Should show: LLM_PROVIDER=moonshot
```

**Fix**: Restart application
```bash
npm start
```

### Issue: "API key invalid"

**Check**: Copy-paste error?
- API key should start with `sk-`
- No extra spaces or newlines
- No quotes around the key in `.env`

**Fix**: Get new key from platform.moonshot.cn

### Issue: "Slower than expected"

**Check**: Network latency to China?
```bash
ping api.moonshot.cn
```

**Consider**: Use Cloudflare AI Gateway for caching:
```bash
# .env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_GATEWAY_SLUG=ulf-gateway
```

## Advanced Configuration

### Use Latest Model

```bash
# .env
MOONSHOT_MODEL=kimi-latest  # Auto-upgrades to newest version
```

### Hybrid Mode (Save $$)

Use Ollama for simple tasks, Moonshot for complex:

```bash
# .env
LLM_PROVIDER=moonshot
LLM_STRATEGY=hybrid

# Start Ollama
ollama serve
```

### Custom Base URL

If using a proxy or custom endpoint:

```bash
# .env
MOONSHOT_BASE_URL=https://your-proxy.com/v1
```

## Cost Savings

After switching to Moonshot, check savings:

```bash
./scripts/migrate-to-moonshot.sh
# Choose option 4 (Cost Analysis)
```

Example output:
```
Current Month Costs:
- Claude:   $150.00
- Moonshot: $5.00

💰 Savings with Moonshot: $145.00 (97%)
```

## Next Steps

1. **Read full docs**: `docs/moonshot-provider.md`
2. **Run tests**: `npm test -- moonshot-provider.test.ts`
3. **Monitor logs**: Watch for any errors
4. **Gather feedback**: Ask users about response quality
5. **Track costs**: Set up cost auditor

## Comparison: Before & After

### Before (Claude)
```
User: @Ulf hello
[Claude API] → Response in ~2s
Cost: ~$0.001 per message
```

### After (Moonshot)
```
User: @Ulf hello
[Moonshot API] → Response in ~2-3s
Cost: ~$0.00003 per message
Savings: 97%! 💰
```

## Real-World Example

### Scenario: Analyze Large Codebase

**Before (Claude):**
```
@Ulf analyze all files in src/
→ "Context limit reached, can only analyze 50 files"
```

**After (Moonshot):**
```
@Ulf analyze all files in src/
→ "Analyzing 200+ files... (2M token context!)
   Found 3 security issues:
   1. SQL injection in...
   2. Hardcoded secret in...
   3. Missing input validation in...
   
   Detailed report: ..."
```

## Features Verified

✅ **All features working with Moonshot:**
- [x] Simple chat
- [x] Multi-turn conversations
- [x] Tool calling (15+ tools)
- [x] Streaming responses
- [x] Long context (2M tokens)
- [x] Portuguese language
- [x] All platforms (Discord, Slack, Telegram, WhatsApp)

## Performance Tips

### 1. Enable Streaming

Already enabled by default! Watch responses appear in real-time.

### 2. Use Appropriate Model

```bash
# For most tasks (recommended)
MOONSHOT_MODEL=kimi-k2.5

# For bleeding-edge features
MOONSHOT_MODEL=kimi-latest
```

### 3. Optimize Context

Moonshot handles huge context, but be strategic:
```
✅ Good: Include relevant history (last 10 messages)
⚠️ OK: Include all history (100+ messages)
❌ Wasteful: Send entire codebase every request
```

## Security Notes

### API Key Safety

```bash
# ✅ Good: In .env (not committed)
MOONSHOT_API_KEY=sk-xxx

# ❌ Bad: Hardcoded in code
const apiKey = 'sk-xxx';
```

### Rate Limiting

Moonshot has rate limits (check docs). Ulf-Warden handles this automatically:
- 60 requests/minute per user
- Automatic retry with exponential backoff

## Support

### Quick Help

```
@Ulf /help moonshot
```

### Check Logs

```bash
# Local
npm start
# Watch for [Moonshot] logs

# Production (K8s)
kubectl logs -n ulf deployment/ulf-warden | grep Moonshot
```

### File Issue

If something's broken:
1. Check logs
2. Verify API key
3. Test simple query
4. File issue on GitHub with:
   - Error message
   - Logs
   - Steps to reproduce

## FAQ

**Q: Can I use both Claude and Moonshot?**
A: Yes! Set one as primary, the other as fallback.

**Q: Does Moonshot support all tools?**
A: Yes! All 15+ Ulf-Warden tools work with Moonshot.

**Q: Is Moonshot as good as Claude?**
A: Different strengths:
- Moonshot: Better at long context, cheaper, great Portuguese
- Claude: Anthropic-specific features, slightly faster

**Q: Can I switch back to Claude?**
A: Yes! Just change `.env`:
```bash
LLM_PROVIDER=claude
npm start
```

**Q: What about data privacy?**
A: Check Moonshot's privacy policy at platform.moonshot.cn/privacy

## Success! 🎉

You're now running Ulf-Warden with Moonshot AI!

**Benefits:**
- 💰 97% cost savings
- 🌍 10x larger context (2M vs 200k)
- 🇧🇷 Excellent Portuguese support
- ✨ All features maintained

**Enjoy!**

---

**Need Help?**
- Full docs: `docs/moonshot-provider.md`
- Implementation: `MOONSHOT_IMPLEMENTATION.md`
- Tests: `tests/moonshot-provider.test.ts`
- Migration: `scripts/migrate-to-moonshot.sh`
