#!/usr/bin/env bash
set -euo pipefail

if [ -f ".env.local" ]; then
  set -a
  source ".env.local"
  set +a
fi

export WECHAT_APP_ID="${WECHAT_APP_ID:-wxc4fd1aabc54a316c}"
export WECHAT_APP_SECRET="${WECHAT_APP_SECRET:-replace_with_your_real_app_secret}"
export PORT="${PORT:-8000}"

if [ "${WECHAT_APP_SECRET}" = "replace_with_your_real_app_secret" ]; then
  echo "WECHAT_APP_SECRET is not configured"
fi

python3 -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT}" --reload
