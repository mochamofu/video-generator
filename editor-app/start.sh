#!/usr/bin/env bash
# shortgen Editor 起動スクリプト
# 初回は依存パッケージのインストールも自動で行う。
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d "server/node_modules" ]; then
  echo "📦 サーバーの依存パッケージをインストールしています…"
  (cd server && npm install)
fi
if [ ! -d "client/node_modules" ]; then
  echo "📦 クライアントの依存パッケージをインストールしています…"
  (cd client && npm install)
fi
if [ ! -d "../remotion/node_modules" ]; then
  echo "📦 Remotionの依存パッケージをインストールしています…"
  (cd ../remotion && npm install)
fi

cleanup() {
  echo ""
  echo "終了します…"
  kill "${SERVER_PID:-0}" "${CLIENT_PID:-0}" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "🚀 サーバーを起動しています (http://127.0.0.1:8787)…"
(cd server && node index.js) &
SERVER_PID=$!

echo "🚀 エディタを起動しています…"
(cd client && npx vite --host) &
CLIENT_PID=$!

sleep 2
echo ""
echo "✅ 起動しました。ブラウザで以下を開いてください:"
echo "   http://localhost:5173"
echo ""
echo "終了するには Ctrl+C を押してください。"

wait
