#!/bin/bash
set -e

# Copy .env if not exists
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ .env ファイルを作成しました。APIキーを設定してください。"
    echo "   エディタで .env を開いて設定後、再度このスクリプトを実行してください。"
    exit 0
fi

# Check if GPU mode requested
USE_GPU=$(grep "^USE_GPU=" .env | cut -d= -f2 | tr -d '[:space:]')

echo "=================================="
echo "  Video Generator 起動"
echo "=================================="

if [ "$USE_GPU" = "true" ]; then
    echo "🚀 GPU モードで起動します"
    echo "   ※ NVIDIA GPU + Docker GPU サポートが必要です"
    docker compose -f docker-compose.yml -f docker-compose.gpu.yml up --build "$@"
else
    echo "💻 CPU モードで起動します"
    docker compose up --build "$@"
fi
