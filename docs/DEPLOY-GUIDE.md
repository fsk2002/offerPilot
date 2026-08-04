# OfferPilot 自动化部署指南（GitHub Actions → 云服务器）

> 目标：`push main` 后自动构建镜像 → 推送 ghcr.io → SSH 到云服务器 → 自动拉取并上线。
> 全程免费：GitHub Actions（公共仓库免费）+ ghcr.io（免费）+ 免费/学生云服务器。

## 架构

```
push main
  │
  ▼
GitHub Actions: build-and-push
  │  Docker 多阶段构建（.dockerignore 排除 node_modules/.env）
  ▼
ghcr.io/fsk2002/offerPilot:<sha>   （latest + commit SHA 双 tag）
  │
  ▼
GitHub Actions: deploy（SSH）
  │  cd /opt/offerpilot
  │  IMAGE=ghcr.io/...:<sha> docker compose pull web
  ▼
docker compose up -d web（Postgres 常驻，数据在 pgdata 卷）
```

## 前置条件

1. 一台云服务器（推荐 Oracle Cloud 免费 ARM / 腾讯云学生轻量，Ubuntu 22.04+，2C2G 起步）
2. 一个 GitHub 仓库（本项目已就绪）
3. 可选的域名（不配也能用 `http://服务器IP:3000`，配域名再加 HTTPS）

## 第一步：服务器初始化（一次性）

```bash
# 登录服务器后执行（root 或 sudo）
git clone https://github.com/fsk2002/offerPilot.git /tmp/offerpilot
sudo bash /tmp/offerpilot/scripts/server-setup.sh

# 脚本会自动：装 Docker + Compose 插件、建 offerpilot 用户、建 /opt/offerpilot、生成 .env 模板、放行防火墙

# 编辑环境变量（必做！）
sudo nano /opt/offerpilot/.env
#   POSTGRES_PASSWORD=强密码
#   AUTH_SECRET=随机串（openssl rand -hex 32）
#   LLM_API_KEY=你的火山方舟 Key

# 复制 compose 文件到部署目录
sudo cp /tmp/offerpilot/docker-compose.prod.yml /opt/offerpilot/

# 目录属主给部署用户
sudo chown -R offerpilot:offerpilot /opt/offerpilot
```

## 第二步：生成并配置 SSH 密钥（GitHub 登录服务器用）

```bash
# 在服务器上（offerpilot 用户）生成部署专用密钥
sudo -u offerpilot ssh-keygen -t ed25519 -f /home/offerpilot/.ssh/id_ed25519 -N "" -C "github-deploy"

# 把公钥加入授权
sudo -u offerpilot bash -c 'cat /home/offerpilot/.ssh/id_ed25519.pub >> /home/offerpilot/.ssh/authorized_keys'
sudo -u offerpilot chmod 600 /home/offerpilot/.ssh/authorized_keys

# 查看私钥内容（复制它，准备填到 GitHub Secrets）
sudo cat /home/offerpilot/.ssh/id_ed25519
```

> 可选加固：`/etc/ssh/sshd_config` 里 `PasswordAuthentication no`，只留密钥登录。

## 第三步：配置 GitHub Secrets

打开仓库 **Settings → Secrets and variables → Actions → New repository secret**：

| Secret | 值 |
|--------|-----|
| `SERVER_HOST` | 服务器公网 IP（如 `1.2.3.4`） |
| `SERVER_USER` | `offerpilot` |
| `SSH_PRIVATE_KEY` | 上面复制的私钥全文（含 `-----BEGIN OPENSSH PRIVATE KEY-----`） |
| `SERVER_PORT` | `22`（可选，默认 22） |
| `GHCR_TOKEN` | 可选。镜像设为公开可跳过；私有镜像需 GitHub PAT（`read:packages` 权限） |

> 首次部署后，把 ghcr 包设为公开可省去 GHCR_TOKEN：
> GitHub → 你的头像 → Packages → 找到 `offerPilot` → Package settings → Change visibility → Public

## 第四步：触发部署

```bash
git push origin main
```

或在仓库 **Actions → Deploy → Run workflow** 手动触发。

首次部署时 Docker 镜像较大（含 node_modules 构建），约 3-6 分钟；
服务器首次拉取 Postgres 镜像也需几分钟。

## 第五步：验证

```bash
# 服务器上
cd /opt/offerpilot
docker compose -f docker-compose.prod.yml ps          # 两个容器 Up
docker compose -f docker-compose.prod.yml logs -f web # 看启动日志

# 浏览器访问
curl http://<服务器IP>:3000/health 或直接打开 http://<服务器IP>:3000
```

## 第六步（推荐）：配域名 + HTTPS

```bash
# 用 Caddy 一步搞定自动 HTTPS（比 Nginx 简单）
sudo apt-get install -y caddy
# /etc/caddy/Caddyfile：
#   offerpilot.example.com {
#     reverse_proxy localhost:3000
#   }
sudo systemctl restart caddy
```

## 回滚

每个镜像都有 commit SHA tag，回滚只需指定旧 SHA：

```bash
cd /opt/offerpilot
export IMAGE=ghcr.io/fsk2002/offerPilot:<旧SHA>
docker compose -f docker-compose.prod.yml pull web
docker compose -f docker-compose.prod.yml up -d web
```

## 常见问题

| 问题 | 处理 |
|------|------|
| 国内服务器拉 ghcr.io 慢 | 首次可先在本地/临时机器 `docker pull` 后 `docker save/load`；或把镜像同步到腾讯云 TCR 个人版 |
| Actions 报 SSH 连接失败 | 检查 `SERVER_HOST`/`SERVER_USER`/`SSH_PRIVATE_KEY` 是否有误，服务器是否放行 22 端口 |
| 数据库没起来 | 看 `docker compose logs postgres`；`.env` 里 `POSTGRES_PASSWORD` 改了但卷是旧密码，删卷重建：`docker compose down -v`（**会清数据**，慎用） |
| 上传文件丢失 | 当前 `UPLOAD_DIR` 在容器内，重启会丢；后续接入对象存储（S3/OSS） |
| 端口被占 | 改 compose 里 `"3000:3000"` 左侧端口，或先用 Caddy 反代 80 |

## 安全清单

- [ ] 服务器仅保留密钥登录，禁用密码登录
- [ ] 防火墙只放行 22/80/443
- [ ] `/opt/offerpilot/.env` 权限 600，不入 git
- [ ] 数据库卷定期备份：`docker exec <postgres容器> pg_dump -U postgres offerpilot > backup.sql`
- [ ] 镜像公开后，`GHCR_TOKEN` 可留空（不泄露）
