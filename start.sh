#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "Stopping dev servers..."
  kill 0 2>/dev/null || true
}
trap cleanup INT TERM EXIT

if [ ! -d "$ROOT/back/node_modules" ]; then
  echo "==> Installing back deps..."
  (cd "$ROOT/back" && npm install)
fi

if [ ! -d "$ROOT/front/node_modules" ]; then
  echo "==> Installing front deps..."
  (cd "$ROOT/front" && npm install)
fi

echo "==> Starting back (http://localhost:3005)..."
(cd "$ROOT/back" && npm run dev) &

echo "==> Starting front (http://localhost:5173) and opening browser..."
(cd "$ROOT/front" && npm run dev -- --open) &

wait
