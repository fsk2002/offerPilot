#!/bin/bash
# ============================================================
# OfferPilot 服务器一次性初始化脚本（Ubuntu/Debian）
# 用法：sudo bash scripts/server-setup.sh
# 说明：安装 Docker、创建部署目录、生成 .env 模板并给出下一步
# ============================================================
set -euo pipefail

APP_DIR="/opt/offerpilot"
APP_USER="offerpilot"

echo "==> 1/5 检查系统"
if [ "$(id -u)" -ne 0 ]; then
  echo "请用 root 或 sudo 运行：sudo bash scripts/server-setup.sh"
  exit 1
fi

echo "==> 2/5 安装 Docker + Compose 插件"
if ! command -v docker >/dev/null 2>&1; then
  apt-get update
  apt-get install -y ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
docker compose version

echo "==> 3/5 创建部署用户与目录"
id -u "$APP_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR"
usermod -aG docker "$APP_USER"

echo "==> 4/5 初始化 .env（已有则跳过）"
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'ENVEOF'
# OfferPilot 服务器环境变量（务必修改）
POSTGRES_PASSWORD=change-me-strong-password
AUTH_SECRET=change-me-random-secret
LLM_API_KEY=change-me
LLM_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
LLM_MODEL=doubao-seed-2-1-pro-260628
MAX_FILE_SIZE=10485760
ENVEOF
  chown "$APP_USER":"$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo "已生成 $APP_DIR/.env，请立即编辑填入真实值："
  echo "  nano $APP_DIR/.env"
else
  echo "$APP_DIR/.env 已存在，跳过"
fi

echo "==> 5/5 防火墙（可选，按发行版调整）"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
  echo "防火墙已放行 22/80/443"
fi

echo ""
echo "✅ 服务器初始化完成"
echo "下一步："
echo "  1. 编辑 $APP_DIR/.env 填入真实密钥"
echo "  2. 复制 compose 文件："
echo "     cp <仓库>/docker-compose.prod.yml $APP_DIR/"
echo "  3. 在 GitHub 仓库 Settings → Secrets and variables → Actions 配置："
echo "     SERVER_HOST / SERVER_USER / SSH_PRIVATE_KEY / GHCR_TOKEN(可选)"
echo "  4. push main 或手动触发 Deploy workflow 完成首次部署"
