#!/bin/bash
# OfferPilot Database Setup Script

echo "=== 启动 PostgreSQL ==="

# Option 1: Docker (recommended)
if command -v docker &> /dev/null; then
  echo "🐳 Docker 可用，使用 docker-compose 启动..."
  docker compose up -d
  echo "⏳ 等待数据库就绪..."
  sleep 3
  
# Option 2: Local PostgreSQL
elif command -v psql &> /dev/null; then
  echo "🐘 检测到本地 PostgreSQL，使用本地数据库..."
  createdb offerpilot 2>/dev/null || echo "数据库可能已存在"
else
  echo "❌ 未找到 Docker 或 PostgreSQL"
  echo "请先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/"
  exit 1
fi

echo "=== 初始化数据库表 ==="
npx prisma db push
npx prisma generate

echo "✅ 数据库就绪！运行 pnpm dev 启动应用"
