#!/bin/bash

# Test Cloudflare Proxy Configuration
# Usage: ./scripts/test-cloudflare-proxy.sh YOUR_DOMAIN

set -e

if [ -z "$1" ]; then
  echo "❌ Error: Domain required"
  echo ""
  echo "Usage: ./scripts/test-cloudflare-proxy.sh YOUR_DOMAIN"
  echo "Example: ./scripts/test-cloudflare-proxy.sh bot.cloudwalk.io"
  exit 1
fi

DOMAIN=$1
HTTPS_URL="https://$DOMAIN"
HTTP_URL="http://$DOMAIN"

echo "🧪 Testing Cloudflare Proxy Configuration"
echo "==========================================="
echo ""
echo "Domain: $DOMAIN"
echo "GKE LB IP: 34.72.79.4"
echo ""

# Test 1: DNS Resolution
echo "📡 Test 1: DNS Resolution"
echo "-------------------------"
echo "Checking if domain resolves to Cloudflare IPs..."
echo ""

DNS_RESULT=$(dig +short $DOMAIN | head -1)

if [ -z "$DNS_RESULT" ]; then
  echo "❌ FAIL: Domain does not resolve"
  echo "   Action: Check DNS configuration in Cloudflare"
  exit 1
fi

# Check if IP is Cloudflare's (104.x or 172.67.x)
if [[ $DNS_RESULT == 104.* ]] || [[ $DNS_RESULT == 172.67.* ]]; then
  echo "✅ PASS: Domain resolves to Cloudflare IP ($DNS_RESULT)"
else
  echo "⚠️  WARNING: Domain resolves to $DNS_RESULT (not Cloudflare IP)"
  echo "   Action: Make sure proxy is enabled (orange cloud) in Cloudflare DNS"
fi
echo ""

# Test 2: HTTP Health Check
echo "🏥 Test 2: Health Check Endpoint"
echo "--------------------------------"
echo "Testing HTTPS endpoint..."
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HTTPS_URL/health" --connect-timeout 10 || echo "000")

if [ "$HTTP_CODE" == "200" ]; then
  echo "✅ PASS: Health endpoint returns 200 OK"

  # Check response body
  RESPONSE=$(curl -s "$HTTPS_URL/health")
  echo "   Response: $RESPONSE"

  # Check Cloudflare headers
  CF_RAY=$(curl -s -I "$HTTPS_URL/health" | grep -i "cf-ray" || echo "")
  if [ -n "$CF_RAY" ]; then
    echo "✅ PASS: Request passed through Cloudflare"
    echo "   $CF_RAY"
  else
    echo "⚠️  WARNING: No Cloudflare headers detected"
    echo "   Action: Check if proxy is enabled in Cloudflare DNS"
  fi
else
  echo "❌ FAIL: Health endpoint returned $HTTP_CODE"
  echo "   Action: Check if GKE Load Balancer is accessible"
  echo "   Direct test: curl http://34.72.79.4:8080/health"

  # Try direct connection to GKE
  DIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://34.72.79.4:8080/health" --connect-timeout 5 || echo "000")
  if [ "$DIRECT_CODE" == "200" ]; then
    echo "   Direct GKE connection: ✅ Works (DNS/Cloudflare issue)"
  else
    echo "   Direct GKE connection: ❌ Failed (GKE issue)"
  fi
fi
echo ""

# Test 3: Status Endpoint
echo "📊 Test 3: Status Endpoint"
echo "--------------------------"
echo "Testing root endpoint..."
echo ""

STATUS_RESPONSE=$(curl -s "$HTTPS_URL/" --connect-timeout 10 || echo '{"error":"timeout"}')
echo "$STATUS_RESPONSE" | jq . 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

# Test 4: SSL/TLS Configuration
echo "🔒 Test 4: SSL/TLS Configuration"
echo "--------------------------------"
echo "Checking SSL certificate..."
echo ""

SSL_INFO=$(echo | openssl s_client -connect $DOMAIN:443 -servername $DOMAIN 2>/dev/null | openssl x509 -noout -issuer -dates 2>/dev/null || echo "")

if [ -n "$SSL_INFO" ]; then
  echo "✅ PASS: SSL certificate is valid"
  echo "$SSL_INFO"
else
  echo "⚠️  WARNING: Could not retrieve SSL certificate"
  echo "   Action: Check SSL/TLS settings in Cloudflare (Flexible/Full)"
fi
echo ""

# Test 5: Rate Limiting (if configured)
echo "⏱️  Test 5: Rate Limiting"
echo "------------------------"
echo "Sending 10 rapid requests to test rate limiting..."
echo ""

BLOCKED=0
for i in {1..10}; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HTTPS_URL/health" --connect-timeout 2 || echo "000")
  if [ "$CODE" == "429" ]; then
    BLOCKED=$((BLOCKED + 1))
  fi
  sleep 0.1
done

if [ $BLOCKED -gt 0 ]; then
  echo "✅ PASS: Rate limiting is active ($BLOCKED/10 requests blocked)"
else
  echo "ℹ️  INFO: No rate limiting detected (may not be configured yet)"
  echo "   Action: Configure rate limiting in Cloudflare WAF if needed"
fi
echo ""

# Test 6: WAF Protection
echo "🛡️  Test 6: WAF Protection"
echo "-------------------------"
echo "Testing SQL injection detection..."
echo ""

WAF_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HTTPS_URL/?id=1' UNION SELECT * FROM users--" --connect-timeout 5 || echo "000")

if [ "$WAF_CODE" == "403" ]; then
  echo "✅ PASS: WAF blocked malicious request (403 Forbidden)"
elif [ "$WAF_CODE" == "200" ]; then
  echo "⚠️  WARNING: WAF did not block SQL injection attempt"
  echo "   Action: Enable WAF and managed rules in Cloudflare Security"
else
  echo "ℹ️  INFO: Unexpected response code: $WAF_CODE"
fi
echo ""

# Test 7: Direct GKE Access (should still work)
echo "🔗 Test 7: Direct GKE Access"
echo "----------------------------"
echo "Testing direct connection to GKE Load Balancer..."
echo ""

DIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://34.72.79.4:8080/health" --connect-timeout 5 || echo "000")

if [ "$DIRECT_CODE" == "200" ]; then
  echo "✅ PASS: Direct GKE connection works"
  echo "   Note: For production, consider blocking direct access and only allow Cloudflare IPs"
else
  echo "❌ FAIL: Direct GKE connection failed ($DIRECT_CODE)"
  echo "   Action: Check GKE Load Balancer and pod health"
fi
echo ""

# Summary
echo "==========================================="
echo "📋 Summary"
echo "==========================================="
echo ""
echo "Domain: $DOMAIN"
echo "Cloudflare Proxy: $([ -n "$CF_RAY" ] && echo "✅ Active" || echo "⚠️  Not detected")"
echo "SSL/TLS: $([ -n "$SSL_INFO" ] && echo "✅ Configured" || echo "⚠️  Issue detected")"
echo "Health Check: $([ "$HTTP_CODE" == "200" ] && echo "✅ Working" || echo "❌ Failed")"
echo "Rate Limiting: $([ $BLOCKED -gt 0 ] && echo "✅ Active" || echo "ℹ️  Not configured")"
echo "WAF Protection: $([ "$WAF_CODE" == "403" ] && echo "✅ Active" || echo "⚠️  Not configured")"
echo ""

if [ "$HTTP_CODE" == "200" ] && [ -n "$CF_RAY" ]; then
  echo "🎉 SUCCESS! Cloudflare proxy is working correctly!"
  echo ""
  echo "Next steps:"
  echo "  1. Configure WAF rules (if not active)"
  echo "  2. Set up rate limiting (if needed)"
  echo "  3. Configure Zero Trust Access (optional)"
  echo "  4. Monitor analytics in Cloudflare dashboard"
else
  echo "⚠️  Some tests failed. Review the output above for actions."
fi
echo ""
