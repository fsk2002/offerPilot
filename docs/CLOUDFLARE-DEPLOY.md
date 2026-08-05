# OfferPilot Cloudflare 部署指南（Workers + R2 + Neon）

> 方案：Next.js 16 + OpenNext Cloudflare 适配器 → Cloudflare Workers。
> 数据库用 Neon Serverless Postgres（Workers 官方兼容），上传文件存 R2（S3 API）。
> 已本地验证：`opennextjs-cloudflare build` 成功、`wrangler deploy --dry-run` 通过。

## 架构

```
Cloudflare Workers（OpenNext worker.js）
  ├─ Pages/静态资源：.open-next/assets
  ├─ Neon Postgres：Prisma + @prisma/adapter-neon（WebSocket 协议）
  ├─ R2 对象存储：aws4fetch 签名 S3 API（简历 PDF）
  └─ 火山方舟 LLM：OpenAI SDK（跨境调用可能较慢，见"已知限制"）
```

## 前置条件

1. Cloudflare 账号（免费）
2. Neon 账号（免费 0.5GB）并创建项目，复制连接串
3. R2 存储桶（免费 10GB）
4. Node.js >= 22（wrangler 4 要求）

## 推荐方式：GitHub Actions 自动部署

> Cloudflare Workers Builds 的构建/部署分阶段执行，`.open-next` 产物可能丢失，
> 导致部署阶段报 "Could not find compiled Open Next config"。
> 改用 GitHub Actions：构建与部署在同一任务内完成，push main 自动上线。

### 1. 创建 Cloudflare API Token

Cloudflare Dashboard → 我的个人资料 → API 令牌 → 创建令牌：
- 权限：`Account - Workers Scripts - Edit`、`Account - Workers R2 - Edit`
- Account Resources 选你的账号

同时记录 **Account ID**（Dashboard 右侧栏或 Workers 首页）。

### 2. 配置 GitHub Secrets

仓库 → Settings → Secrets and variables → Actions：

| Secret | 值 |
|--------|-----|
| `CLOUDFLARE_API_TOKEN` | 上一步创建的 API Token |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account ID |

### 3. 触发部署

```bash
git push origin main
```

GitHub Actions 会自动运行 `Deploy Cloudflare` workflow：
install → prisma generate → `pnpm build:cf` → `wrangler deploy`。
手动触发：Actions → Deploy Cloudflare → Run workflow。

> 平台（Workers Builds）方式仍可用，但请把 Deploy command 设为
> `pnpm deploy:cf`（即 `pnpm build:cf && wrangler deploy`），
> 避免两阶段产物丢失；推荐直接使用 GitHub Actions 方式。

## 第一步：创建 R2 桶和 API Token

```bash
# 安装并登录 wrangler（项目内已装）
pnpm exec wrangler login

# 创建桶
pnpm exec wrangler r2 bucket create offerpilot
```

在 Cloudflare Dashboard → R2 → Manage R2 API Tokens 创建 Token：
- 权限：对象读写（Object Read & Write）
- 记录 Access Key ID / Secret Access Key
- S3 Endpoint 形如 `https://<accountid>.r2.cloudflarestorage.com`

## 第二步：创建 Neon 数据库

1. neon.tech 注册 → 创建项目（区域选新加坡/东京）
2. 复制连接串：`postgresql://user:pass@ep-xxx-xxx-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`
3. 本地初始化表：
```bash
DATABASE_URL="<neon连接串>" npx prisma db push
```

## 第三步：配置环境变量

非敏感变量已在 `wrangler.jsonc` 的 `vars`（LLM_BASE_URL / LLM_MODEL / MAX_FILE_SIZE）。
敏感变量用 wrangler secret：

```bash
pnpm exec wrangler secret put DATABASE_URL
pnpm exec wrangler secret put AUTH_SECRET
pnpm exec wrangler secret put LLM_API_KEY
pnpm exec wrangler secret put R2_ACCESS_KEY_ID
pnpm exec wrangler secret put R2_SECRET_ACCESS_KEY
pnpm exec wrangler secret put R2_ENDPOINT
pnpm exec wrangler secret put R2_BUCKET
```

本地 `wrangler dev` 用 `.dev.vars`（复制 `.dev.vars.example` 填入）。

## 第四步：构建并部署

```bash
# 构建（Next 16 + OpenNext，产出 .open-next/worker.js）
pnpm build:cf

# 部署
pnpm deploy:cf
# 输出 https://offerpilot.<你的子域>.workers.dev
```

## 第五步：验证

```bash
curl https://offerpilot.<子域>.workers.dev/          # Landing
curl -I https://.../dashboard                          # 应 307 到登录
# 注册 → 上传简历 → 检查 R2 桶里出现对象
pnpm exec wrangler tail                                # 实时日志
```

## 本地开发（Cloudflare 模式）

```bash
cp .dev.vars.example .dev.vars   # 填入真实值
pnpm dev:cf                       # wrangler dev，本地 workerd 运行
```

## 已知限制（务必阅读）

| 限制 | 说明 | 应对 |
|------|------|------|
| **AI 分析可能超时** | Workers 请求时长限制（免费约 30s），火山方舟质评 10-90s | 换轻量模型（如 doubao-lite）或后续做异步队列 |
| **Worker 体积** | 当前 bundle gzip 约 4.9MB（含 assets），接近免费档脚本上限 | 若上传报体积错误，升级 Workers Paid（$5/月）或拆分 pdf-parse |
| **跨境 LLM** | Workers 海外节点调火山方舟（国内接口）可能慢/不稳 | 换 OpenAI/DeepSeek 海外可达接口，或接受降速 |
| **旧数据迁移** | 本地/Docker 的 Postgres 数据不会自动到 Neon | 用 `pg_dump` 导入 Neon |
| **免费请求量** | Workers 免费 10 万请求/天 | 个人 Demo 足够 |

## 回滚

Workers 保留版本历史：Dashboard → Workers → offerpilot → Deployments → 回退到上一版本。
或本地重新 `pnpm build:cf && pnpm deploy:cf`。

## 与 Docker 方案的取舍

| 维度 | Cloudflare | Docker + VPS |
|------|-----------|--------------|
| 成本 | 免费 | 免费/学生机 |
| 国内访问 | 一般 | 好 |
| 长任务（90s LLM） | ❌ 受限 | ✅ |
| 文件存储 | R2 ✅ | 磁盘 ✅ |
| 上线难度 | 命令行两步 | 需服务器 |
| 面试叙事 | Serverless/边缘计算 | 自托管/CI-CD |

**建议**：面试演示用 Cloudflare 版（免费 + Serverless 叙事），
生产/稳定演示用 Docker 版；两者代码共用，仅部署目标不同。
