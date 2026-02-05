#!/bin/bash

echo "========================================="
echo "  Running All Tests"
echo "========================================="
echo ""

TESTS=(
  "tests/core/telemetry.test.ts"
  "tests/core/tool-registry.test.ts"
  "tests/core/workflow-manager.test.ts"
  "tests/core/prometheus-metrics.test.ts"
  "tests/core/queue.test.ts"
  "tests/core/tracing.test.ts"
  "tests/core/migrations.test.ts"
)

PASSED=0
FAILED=0

for test in "${TESTS[@]}"; do
  echo "Testing: $test"
  if npx tsx --test "$test" > /dev/null 2>&1; then
    echo "  ✓ PASSED"
    ((PASSED++))
  else
    echo "  ✗ FAILED"
    ((FAILED++))
  fi
  echo ""
done

echo "========================================="
echo "  Summary"
echo "========================================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total:  $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Some tests failed"
  exit 1
fi
