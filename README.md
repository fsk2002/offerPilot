# OfferPilot

AI 驱动的求职助手平台。上传简历、选择目标岗位方向、粘贴职位描述，AI 自动分析匹配度、给出差异化优化建议、支持在线编辑简历、版本管理和模拟面试。

## 功能特性

- **AI 匹配分析**：JD 链接抓取或手动粘贴，混合评分引擎（关键词量化 + LLM 质性评估）
- **岗位画像体系**：28+ 个岗位画像，同一份简历按目标岗位切换叙事角度，异岗评分对比
- **简历编辑器**：Markdown 左写右看、AI 结构化初稿、一键导出 PDF
- **AI 智能修改**：按岗位 + JD 改写简历，行级 Diff 逐条接受/驳回后应用
- **格式校对**：规则引擎（日期/标点/拼写/量化数据等）+ AI 表达质量审查，一键自动修复
- **简历版本控制**：另存为新版本形成版本链，历史版本对比、从任意版本继续
- **模拟面试题**：基于 JD + 简历生成技术面/项目面/行为面题目，记录回答并导出 Markdown
- **投递管理**：状态流转（待投递/面试中/已拿到 Offer 等）、统计图表

## 路由一览

| 路由 | 页面 |
|------|------|
| `/` | Landing |
| `/auth/login` `/auth/register` | 登录 / 注册 |
| `/dashboard` | 工作台 |
| `/resumes` | 简历管理 |
| `/resumes/[id]/edit` | 简历编辑器（AI 修改 / 格式校对） |
| `/resumes/[id]/versions` | 版本历史 |
| `/resumes/compare` | 版本对比 |
| `/applications` `/applications/[id]` | 投递列表 / 详情 |
| `/applications/new` | 新建分析 |
| `/interview/[applicationId]` | 模拟面试题 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) |
| 语言 | TypeScript (strict mode) |
| 样式 | Tailwind CSS 4 |
| 数据库 | PostgreSQL 15 (Prisma ORM) |
| 认证 | JWT + bcrypt + HTTP-only Cookie |
| AI | OpenAI API / 国产大模型 (可切换) |
| 部署 | Vercel + Supabase (PostgreSQL) |

## 快速启动

### 前置条件

- Node.js >= 18
- pnpm >= 8
- Docker (本地 PostgreSQL) 或 Supabase CLI

### 1. 启动数据库

```bash
# 选项 A：Docker
docker run --name offerpilot-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=offerpilot \
  -p 5432:5432 \
  -d postgres:15

# 选项 B：docker-compose
docker compose up -d

# 选项 C：Supabase CLI
supabase start
```

### 2. 初始化项目

```bash
git clone <repo-url>
cd offerpilot

# 安装依赖
pnpm install

# 复制环境变量
cp .env.example .env
# 编辑 .env 设置 LLM_API_KEY

# 初始化数据库表
npx prisma db push
npx prisma generate

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3000

### 3. 可用的脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器 |
| `pnpm build` | 构建生产版本 |
| `pnpm start` | 启动生产服务器 |
| `pnpm lint` | 代码检查 |
| `pnpm db:push` | 同步数据库 Schema |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:studio` | 打开 Prisma Studio |

## 项目结构

```
offerpilot/
├─ prisma/schema.prisma      # 数据模型
├─ data/
│  ├─ prompts/               # AI Prompt 模板
│  └─ role-profiles/         # 岗位画像 JSON
├─ src/
│  ├─ app/                   # 页面 (App Router)
│  │  ├─ auth/               # 登录 / 注册
│  │  ├─ dashboard/          # 工作台
│  │  ├─ resumes/            # 简历管理
│  │  └─ applications/       # 投递记录
│  ├─ api/                   # API Routes
│  │  ├─ auth/               # 认证 API
│  │  ├─ resumes/            # 简历 API
│  │  └─ ai/                 # AI 分析 API
│  ├─ components/            # 组件
│  │  ├─ ui/                 # 通用 UI 组件
│  │  ├─ layout/             # 布局组件
│  │  ├─ resume/             # 简历组件
│  │  ├─ analysis/           # 分析组件
│  │  └─ shared/             # 共享组件
│  ├─ services/              # 业务逻辑层
│  ├─ lib/                   # 工具函数
│  └─ types/                 # TypeScript 类型
└─ docs/
   ├─ PRD.md                 # 产品需求文档
   └─ TECH-DESIGN.md         # 技术设计文档
```

## 架构概览

```
前端 (Next.js RSC + Client Components)
  → API Routes (Next.js Backend)
  → Service Layer (业务逻辑)
    ├─ Auth Service (JWT)
    ├─ Resume Service (Upload + Parse)
    ├─ AI Service (LLM 管线)
    ├─ JD Fetch Service (URL 抓取)
    └─ Format Check Service (格式校对)
    ├─ Interview Service (面试题)
    └─ Version Chain (版本链)
  → Prisma ORM → PostgreSQL
  → File Storage (Local / S3)
```

## 部署

### 选项 A：Vercel + Supabase（推荐）

1. 在 [Supabase](https://supabase.com) 创建项目，复制数据库连接串
2. 在 [Vercel](https://vercel.com) 导入本仓库，配置环境变量（见下表）
3. 部署前在本地执行 `npx prisma db push` 初始化远程数据库表
4. 首次部署后运行 `npx prisma db push` 同步 schema（或接入迁移流程）

### 选项 B：Docker 自托管

```bash
# 准备 .env（AUTH_SECRET / LLM_API_KEY 必填）
cp .env.example .env

# 一键启动 PostgreSQL + 应用（自动建表）
docker compose -f docker-compose.prod.yml up -d --build
```

应用监听 `http://localhost:3000`。Dockerfile 使用 Next.js standalone 输出，
运行时只保留必要文件；岗位画像与 Prompt 模板通过 `data/` 目录注入镜像。

### CI

`.github/workflows/ci.yml` 在 push/PR 时执行 pnpm 安装、Prisma generate、
TypeScript 检查、ESLint 与生产构建。

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | PostgreSQL 连接串 | `postgresql://postgres:postgres@localhost:5432/offerpilot` |
| `AUTH_SECRET` | JWT 签名密钥 | 必填 |
| `LLM_API_KEY` | AI API 密钥 | 必填 |
| `LLM_BASE_URL` | AI API 地址 | `https://api.openai.com/v1` |
| `LLM_MODEL` | AI 模型 | `gpt-4o-mini` |
| `MAX_FILE_SIZE` | 上传文件大小限制 | 10485760 (10MB) |

## 岗位分类体系

支持 28+ 个岗位画像，按四大类划分：

- **技术类**：前端 / 后端 / 全栈 / AI数据 / 基础架构 / 嵌入式
- **产品设计类**：产品经理 / UIUX 设计师
- **运营市场类**：新媒体 / 用户运营 / 品牌营销
- **管理职能类**：Tech Lead / 项目经理 / HR

岗位画像存储在 `data/role-profiles/` 目录中，每个画像一个 JSON 文件。

## 相关文档

- [产品需求文档 (PRD)](./docs/PRD.md)
- [技术设计文档](./docs/TECH-DESIGN.md)
- [演示路径](./docs/DEMO.md)
- [贡献指南](./CONTRIBUTING.md)

## License

MIT
