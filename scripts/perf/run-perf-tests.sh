#!/usr/bin/env bash
set -euo pipefail

PERF_PORT="${PERF_PORT:-3099}"
PERF_DIR=".perf"

echo "=== LendFolio Performance Test Runner ==="
echo ""

mkdir -p "$PERF_DIR/traces" "$PERF_DIR/screenshots"

if [ -n "${PERF_SKIP_BUILD:-}" ]; then
  echo "[1/3] Skipping build (PERF_SKIP_BUILD set)"
else
  echo "[1/3] Building production bundle..."
  npm run build
fi

echo ""
echo "[2/3] Starting production server on port $PERF_PORT..."
PORT=$PERF_PORT npm run start &
SERVER_PID=$!

cleanup() {
  echo ""
  echo "Stopping server (PID $SERVER_PID)..."
  kill $SERVER_PID 2>/dev/null || true
  wait $SERVER_PID 2>/dev/null || true
}
trap cleanup EXIT

echo "Waiting for server to be ready..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w '%{http_code}' "http://localhost:$PERF_PORT" | grep -q '200\|302\|304'; then
    echo "Server ready after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: Server did not start within 30 seconds"
    exit 1
  fi
  sleep 1
done

echo ""
echo "[3/3] Running Playwright performance tests..."
npx playwright test --config=playwright.config.ts || true

echo ""
echo "=== Results ==="
if [ -f "$PERF_DIR/report.md" ]; then
  echo "Report: $PERF_DIR/report.md"
fi
if [ -f "$PERF_DIR/metrics.json" ]; then
  echo "Metrics: $PERF_DIR/metrics.json"
fi
echo ""
echo "To view the report: cat $PERF_DIR/report.md"
