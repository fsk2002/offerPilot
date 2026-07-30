# OfferPilot 技术设计文档

> 版本：v1.0
> 最后更新：2026-07-29
> 状态：草稿
> 关联文档：[PRD v1.4](./PRD.md)

---

## 1. 技术选型

### 1.1 选型总览

| 层级 | 技术 | 版本 | 选型理由 |
|------|------|------|---------|
| 框架 | Next.js | 14+ (App Router) | 全栈同构，前后端一个项目，vibe coding 上下文连贯 |
| 语言 | TypeScript | 5+ | 类型安全，AI 生成质量高 |
| 样式 | Tailwind CSS | 3+ | 原子化 CSS，开发效率高 |
| UI 组件 | shadcn/ui | latest | 基于 Radix UI，可定制，质量好 |
| 数据库 | PostgreSQL | 15+ | 成熟稳定，Prisma 支持好 |
| ORM | Prisma | 5+ | 类型安全，Schema 即文档 |
| 认证 | next-auth (Auth.js) | 5+ | Next.js 原生集成，支持 JWT |
| 文件存储 | local fs (dev) → S3 (prod) | - | 渐进增强 |
| 编辑器 | react-markdown + CodeMirror | - | 轻量，Markdown 编辑友好 |
| Diff 展示 | diff + react-diff-viewer | - | 文本 diff 渲染 |
| 图表 | recharts | - | React 原生，雷达图/柱状图 |
| 抓取 | cheerio + playwright | - | 分层策略 |
| LLM SDK | openai / 国产模型 SDK | - | 统一接口 |
| 部署 | Vercel + Supabase Postgres | - | 零运维 |

### 1.2 为什么选 Next.js App Router

- 前后端共享 TypeScript 类型，vibe coding 时 AI 上下文不中断
- API Routes 做后端，RSC / Client Components 做前端，一个项目搞定
- 部署到 Vercel 一键搞定，减少运维心智负担

---

## 2. 项目目录结构

```
offerpilot/
├─ .env.example                  # 环境变量模板
├─ .env                          # 本地环境变量（不提交）
├─ package.json
├─ tsconfig.json
├─ tailwind.config.ts
├─ next.config.ts
├─ prisma/
│  ├─ schema.prisma              # 数据模型
│  ├─ seed.ts                    # 种子数据（岗位画像）
│  └─ migrations/                # 数据库迁移文件
│
├─ data/                         # 静态数据
│  ├─ role-profiles/             # 岗位画像 JSON
│  │  ├─ index.json              # 分类树索引
│  │  ├─ frontend-engineer.json
│  │  ├─ fullstack.json
│  │  ├─ ai-engineer.json
│  │  ├─ backend-java.json
│  │  ├─ ml-engineer.json
│  │  └─ ...
│  └─ prompts/                   # Prompt 模板
│      ├─ resume-parse.txt
│      ├─ jd-parse.txt
│      ├─ match-analysis.txt
│      ├─ ai-edit.txt
│      └─ interview-questions.txt
│
├─ src/
│  ├─ app/                       # Next.js App Router
│  │  ├─ layout.tsx              # 全局 Layout
│  │  ├─ page.tsx                # Landing
│  │  ├─ auth/
│  │  │  ├─ login/page.tsx
│  │  │  └─ register/page.tsx
│  │  ├─ dashboard/
│  │  │  └─ page.tsx             # 工作台
│  │  ├─ applications/
│  │  │  ├─ page.tsx             # 投递列表
│  │  │  └─ [id]/page.tsx        # 投递详情
│  │  ├─ resumes/
│  │  │  ├─ page.tsx             # 简历版本管理
│  │  │  ├─ compare/page.tsx     # 简历对比
│  │  │  └─ [id]/edit/page.tsx   # 简历编辑器
│  │  ├─ interview/
│  │  │  └─ [id]/page.tsx        # 面试题
│  │  └─ settings/
│  │     └─ page.tsx             # 个人设置
│  │
│  ├─ api/                       # API Routes
│  │  ├─ auth/
│  │  │  ├─ register/route.ts
│  │  │  ├─ login/route.ts
│  │  │  └─ me/route.ts
│  │  ├─ resumes/
│  │  │  ├─ route.ts             # GET / POST（列表/上传）
│  │  │  └─ [id]/
│  │  │     ├─ route.ts          # GET / PATCH / DELETE
│  │  │     └─ versions/route.ts # 版本管理
│  │  ├─ applications/
│  │  │  ├─ route.ts             # GET / POST
│  │  │  └─ [id]/
│  │  │     ├─ route.ts          # GET / PATCH / DELETE
│  │  │     └─ interviews/route.ts
│  │  ├─ ai/
│  │  │  ├─ parse-resume/route.ts
│  │  │  ├─ parse-jd/route.ts
│  │  │  ├─ match-analysis/route.ts
│  │  │  ├─ ai-edit/route.ts
│  │  │  └─ interview/route.ts
│  │  └─ jd-fetch/
│  │     └─ route.ts             # URL 抓取 JD
│  │
│  ├─ components/                # 共享组件
│  │  ├─ ui/                     # shadcn/ui 基础组件
│  │  ├─ layout/
│  │  │  ├─ Sidebar.tsx
│  │  │  └── TopNav.tsx
│  │  ├─ resume/
│  │  │  ├─ ResumeUploader.tsx
│  │  │  ├─ ResumeEditor.tsx
│  │  │  ├─ ResumeDiffViewer.tsx
│  │  │  ├─ AISuggestions.tsx    # AI 建议侧栏
│  │  │  └─ FormatChecker.tsx
│  │  ├─ analysis/
│  │  │  ├─ MatchScore.tsx       # 匹配度分数卡片
│  │  │  ├─ RadarChart.tsx       # 维度雷达图
│  │  │  ├─ GapList.tsx          # 缺失项清单
│  │  │  └─ RoleComparison.tsx   # 异岗对比组件
│  │  └─ shared/
│  │     ├─ RoleSelector.tsx     # 岗位选择弹窗
│  │     ├─ JDFetcher.tsx        # JD URL 输入 + 抓取
│  │     ├─ LoadingState.tsx     # 加载状态
│  │     └─ EmptyState.tsx       # 空状态
│  │
│  ├─ lib/                       # 工具函数 & 配置
│  │  ├─ prisma.ts               # Prisma 客户端单例
│  │  ├─ auth.ts                 # 认证工具函数
│  │  ├─ prompts.ts              # Prompt 模板加载
│  │  ├─ role-profiles.ts        # 岗位画像加载器
│  │  ├─ diff.ts                 # diff 计算工具
│  │  ├─ file-storage.ts         # 文件存储抽象
│  │  └─ utils.ts                # 通用工具
│  │
│  ├─ services/                  # 业务逻辑层
│  │  ├─ auth.service.ts
│  │  ├─ resume.service.ts
│  │  ├─ application.service.ts
│  │  ├─ ai.service.ts           # AI 调用编排
│  │  ├── jd-fetch.service.ts     # JD URL 抓取
│  │  └─ format-check.service.ts # 格式校对引擎
│  │
│  └─ types/                     # TypeScript 类型
│     ├─ index.ts                # 通用类型
│     ├─ resume.ts               # 简历相关
│     ├─ application.ts          # 投递相关
│     ├─ ai.ts                   # AI 请求/响应
│     └─ role-profile.ts         # 岗位画像类型
│
├─ public/                       # 静态资源
│  └─ uploads/                   # 上传文件（本地开发）
│
├─ scripts/
│  ├─ dev.sh                     # 启动开发环境
│  └─ seed-role-profiles.ts      # 岗位画像初始化脚本
│
└─ docs/
   ├─ PRD.md                     # 产品需求文档
   └─ TECH-DESIGN.md             # 本文件
```

---

## 3. 前端架构

### 3.1 组件层级

```
Page Components（页面级）
├─ app/page.tsx, dashboard/page.tsx, ...
│
├─ Feature Components（功能级，带业务逻辑）
│  ├─ resume/ResumeEditor.tsx
│  ├─ analysis/MatchScore.tsx
│  └─ resume/ResumeDiffViewer.tsx
│
├─ Shared Components（可复用，无业务逻辑）
│  ├─ shared/RoleSelector.tsx
│  ├─ shared/JDFetcher.tsx
│  └─ layout/Sidebar.tsx
│
├─ UI Components（shadcn/ui，纯展示）
│  └─ ui/button.tsx, ui/dialog.tsx, ...
```

### 3.2 状态管理策略

不使用全局状态管理库（Redux/Zustand）。采用 Next.js 原生方案：

| 数据类型 | 方案 | 理由 |
|---------|------|------|
| 服务端数据 | React Query (TanStack Query) | 缓存 + 重新验证 + 乐观更新 |
| URL 状态 | useSearchParams | 分享/跳转时状态保持（如 diff page） |
| 表单状态 | React Hook Form + Zod | 类型安全 + 验证 |
| UI 状态 | React 本地 state | 简单场景无需全局管理 |
| 认证状态 | Auth.js session | 框架自带 |

### 3.3 关键页面交互设计

#### 简历编辑器页面（核心页面）

```
交互流程：

1. 用户进入 /resumes/[id]/edit
2. 左侧 Markdown 编辑区（CodeMirror）
3. 右侧实时预览区（react-markdown）
4. 右侧侧栏包含：
   ├─ 岗位选择器（选中后触发重新评分）
   ├─ 匹配度对比卡片
   ├─ "AI 智能修改"按钮
   ├─ "格式校对"按钮
   └─ 优化建议列表
5. 点击"AI 智能修改"：
   ├─ 弹窗展示 loading 状态
   ├─ 完成后 diff 视图覆盖预览区
   ├─ 每处修改有"接受"/"驳回"按钮
   └─ 全部确认后保存为新版本
```

#### 投递详情页

```
布局：
┌─ 顶部：公司名 / 岗位 / 匹配度大数字
├─ 匹配报告区
│  ├─ 雷达图（多维度）
│  ├─ 匹配/缺失技能对比列表
│  └─ 优化建议卡片
├─ 面试题区
└─ 操作区：重新分析 / 生成面试题 / 删除
```

---

## 4. 后端架构（API Routes）

### 4.1 API 路由设计原则

- RESTful 风格
- 统一错误响应格式
- 所有 API 需认证（除 auth）
- 版本前缀可选（v1）

### 4.2 API 接口清单

#### 认证

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录 | 否 |
| GET | `/api/auth/me` | 当前用户信息 | 是 |

#### 简历

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/resumes` | 简历列表 | 是 |
| POST | `/api/resumes` | 上传简历（multipart） | 是 |
| GET | `/api/resumes/[id]` | 简历详情 | 是 |
| PATCH | `/api/resumes/[id]` | 更新简历内容 | 是 |
| DELETE | `/api/resumes/[id]` | 删除简历 | 是 |
| GET | `/api/resumes/[id]/versions` | 版本列表 | 是 |

#### 投递

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | `/api/applications` | 投递列表 | 是 |
| POST | `/api/applications` | 创建投递分析 | 是 |
| GET | `/api/applications/[id]` | 投递详情 | 是 |
| PATCH | `/api/applications/[id]` | 更新状态 | 是 |
| DELETE | `/api/applications/[id]` | 删除投递 | 是 |

#### AI

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/ai/parse-resume` | 解析简历 PDF | 是 |
| POST | `/api/ai/parse-jd` | 解析 JD 文本 | 是 |
| POST | `/api/ai/match-analysis` | 匹配分析 | 是 |
| POST | `/api/ai/ai-edit` | AI 智能修改 | 是 |
| POST | `/api/ai/interview` | 生成面试题 | 是 |

#### 工具

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | `/api/jd-fetch` | URL 抓取 JD | 是 |
| GET | `/api/role-profiles` | 岗位画像列表 | 是 |

### 4.3 统一响应格式

```typescript
// 成功
{
  "success": true,
  "data": { ... },        // 业务数据
  "meta": {               // 可选
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}

// 错误
{
  "success": false,
  "error": {
    "code": "RESUME_NOT_FOUND",
    "message": "简历不存在或已被删除",
    "details": { ... }    // 可选，调试信息
  }
}
```

### 4.4 错误码定义

| HTTP 状态码 | 业务错误码 | 说明 |
|-----------|-----------|------|
| 400 | VALIDATION_ERROR | 参数校验失败 |
| 401 | UNAUTHORIZED | 未登录 |
| 403 | FORBIDDEN | 无权限 |
| 404 | NOT_FOUND | 资源不存在 |
| 409 | CONFLICT | 冲突（如重复投递） |
| 413 | FILE_TOO_LARGE | 文件过大 |
| 422 | UNPROCESSABLE | 解析失败（如 PDF 损坏） |
| 429 | RATE_LIMITED | 调用过于频繁 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |
| 502 | AI_SERVICE_ERROR | AI 服务异常 |

---

## 5. 数据库设计

### 5.1 索引策略

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique               // 索引 1：登录查询
  ...
}

model Resume {
  id        String   @id @default(cuid())
  version   Int      @default(1)
  userId    String
  parentId  String?

  @@index([userId])                          // 索引 2：用户简历列表
  @@index([parentId])                        // 索引 3：版本链查询
}

model Application {
  id          String   @id @default(cuid())
  matchScore  Int?
  status      String   @default("pending")
  resumeId    String
  userId      String
  createdAt   DateTime @default(now())

  @@index([userId, createdAt(sort: Desc)])    // 索引 4：用户投递列表（时间倒序）
  @@index([userId, status])                   // 索引 5：按状态筛选
  @@index([resumeId])                         // 索引 6：简历关联查询
}

model Interview {
  id        String   @id @default(cuid())
  applicationId String
  userId      String

  @@index([applicationId])                    // 索引 7：投递面试题列表
  @@index([userId])                           // 索引 8：用户面试题
}
```

### 5.2 JSON 字段查询说明

`Resume.content`、`Resume.rawParsed`、`Application.matchReport` 等 JSON 字段不参与复杂查询条件，仅用于读取和展示。如有 JSON 字段内的搜索需求（如全文搜索），接入 PostgreSQL 的 `jsonb` 类型 + GIN 索引在 P2 阶段考虑。

### 5.3 迁移策略

```
开发阶段：
  npx prisma db push       # Schema 变更直接应用到数据库
  npx prisma generate      # 重新生成 TypeScript 类型

上生产后：
  npx prisma migrate dev   # 生成迁移文件
  npx prisma migrate deploy # 部署迁移
```

---

## 6. AI Pipeline 设计

### 6.1 整体架构

```
┌─────────────────────────────────────────────────┐
│                 AI Service Layer                │
│  (src/services/ai.service.ts)                  │
├─────────────────────────────────────────────────┤
│                                                 │
│  parseResume()      parseJD()                   │
│  │                  │                           │
│  ▼                  ▼                           │
│  matchAnalysis(简历, JD, 岗位画像)               │
│  │                                               │
│  ▼                                               │
│  aiEdit(简历, JD, 岗位画像, 章节?)               │
│  │                                               │
│  ▼                                               │
│  generateInterview(简历, JD, 岗位画像)            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 6.2 Prompt 模板设计

所有 Prompt 存放在 `data/prompts/` 目录下，使用模板字符串 + 变量替换。

#### resume-parse.txt（简历解析）

```
你是一个专业的简历解析助手。请从以下简历文本中提取结构化信息。

简历文本：
{{resumeText}}

请以 JSON 格式输出以下字段：
{
  "name": "姓名",
  "email": "邮箱",
  "phone": "电话",
  "summary": "个人总结（2-3句）",
  "education": [{ "school", "degree", "major", "startDate", "endDate" }],
  "experience": [{ "company", "title", "startDate", "endDate", "description", "highlights": [] }],
  "projects": [{ "name", "description", "technologies": [], "highlights": [] }],
  "skills": [{ "category": "前端框架", "items": ["React", "Vue"] }]
}

要求：
- 日期格式统一为 "YYYY.MM"
- 每个 experience 的 highlights 最多 5 条
- 如果某字段在原简历中不存在，设为 null
- 只输出 JSON，不要附加文字
```

#### match-analysis.txt（匹配分析）

```
你是一个资深的互联网招聘顾问。请分析以下简历与职位描述的匹配度。

目标岗位方向：{{targetRoleName}}
岗位画像特征：{{roleProfileNarrative}}

简历摘要：
- 技能：{{skills}}
- 经历：{{experience}}
- 项目：{{projects}}

职位描述：
{{jdText}}

第一层量化分析结果（供参考）：
- 技术匹配度：{{quantScore}}%
- 匹配技能：{{matchedSkills}}
- 缺失技能：{{missingSkills}}

请输出以下 JSON：
{
  "overall": "整体匹配度评分（0-100）",
  "dimensions": [
    { "name": "技术栈匹配", "score": 0-100, "details": "分析说明" },
    { "name": "经验深度", "score": 0-100, "details": "..." },
    { "name": "项目契合度", "score": 0-100, "details": "..." },
    { "name": "综合素质", "score": 0-100, "details": "..." }
  ],
  "gaps": [
    { "type": "skill"|"experience", "description": "缺失项说明", "severity": "high"|"medium"|"low" }
  ],
  "suggestions": [
    { "section": "experience"|"projects"|"skills", "content": "具体建议" }
  ]
}
```

#### ai-edit.txt（AI 智能修改）

```
你是一个专业简历优化专家。请根据目标岗位方向调整以下简历的叙事角度。

目标岗位：{{targetRoleName}}
岗位叙事策略：
{{roleProfileNarrative}}

原始简历内容：
{{resumeContent}}

请修改简历，修改原则：
1. 保留所有事实信息不变（公司名、时间、技术栈）
2. 重新组织描述角度，突出本岗位关注的侧重点
3. 同一段经历使用更能体现岗位能力的措辞
4. 不编造不存在的事实

请输出以下 JSON（包含完整修改后内容 + 逐条 diff）：
{
  "modifiedContent": { 完整的修改后 JSON },
  "diffs": [
    {
      "section": "experience|projects|skills",
      "index": 0,
      "type": "modified"|"added"|"deleted",
      "oldText": "原文",
      "newText": "修改后",
      "reason": "为什么这样改"
    }
  ],
  "summary": "本次修改的总说明（3-5句话）"
}
```

### 6.3 LLM 调用封装

```typescript
// src/services/ai.service.ts

import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,  // 支持切换国产模型
})

interface AIOptions {
  model?: string          // 默认 gpt-4o-mini（低成本）
  temperature?: number
  maxRetries?: number     // 失败重试次数
}

// 通用 LLM 调用函数
async function callLLM(prompt: string, options?: AIOptions): Promise<string>

// 带结构化输出的调用
async function callLLMStructured<T>(
  prompt: string,
  schema: z.ZodSchema<T>,
  options?: AIOptions
): Promise<T>
```

**关键设计**：
- 通过 `LLM_BASE_URL` 环境变量切换模型供应商（OpenAI / DeepSeek / 通义千问）
- 使用 `gpt-4o-mini` 作为默认模型，平衡成本和质量
- 使用 Zod Schema 对 LLM 输出做结构化校验，输出异常时自动重试
- API Routes 中调用 AI service 时使用 `Promise.race` 设置超时

### 6.4 异步处理策略

AI 分析是耗时操作，前端需展示状态：

```
用户点击"开始分析"
  → 前端显示"分析中..." + 进度条
  → 后端创建 Application 记录（status: processing）
  → 后端执行流水线：
      1. parse-resume: 已完成（之前上传时已解析）
      2. parse-jd: ~2s
      3. 量化匹配: <1s
      4. LLM 质评: ~5s
      5. 生成报告: ~1s
  → 更新 Application 记录（status: completed）
  → 前端轮询或 WebSocket 接收完成信号
  → 显示报告

P0 用轮询：每 2s GET /api/applications/[id]
P1 可升级为 WebSocket 推送
```

---

## 7. 关键库选型明细

| 用途 | 库 | 理由 | 备选 |
|------|-----|------|------|
| Markdown 编辑器 | @uiw/react-md-editor | 支持实时预览，轻量 | CodeMirror, Monaco |
| PDF 解析 | pdf-parse | 纯 JS，零依赖 | pdf.js |
| Diff 渲染 | react-diff-viewer-continued | React 原生 diff 展示 | diff2html |
| 图表 | recharts | React 原生，够用 | echarts-for-react |
| 拖拽组件 | @hello-pangea/dnd | 看板场景有需要时 | - |
| HTTP 抓取 | cheerio + playwright | 分层策略 | puppeteer |
| 表单验证 | zod | 类型安全 | yup, joi |
| 时间处理 | dayjs | 轻量 | date-fns |
| 状态管理 | @tanstack/react-query | 服务端状态缓存 | swr |
| 文件上传 | react-dropzone | 拖拽上传体验好 | - |

---

## 8. 开发规范

### 8.1 代码风格

- 使用 Biome 替代 ESLint + Prettier（更快的 TypeScript linter）
- 严格模式 TypeScript（`strict: true`）
- 文件名：kebab-case（React 组件 PascalCase）
- API Route 文件统一小写

### 8.2 Git 规范

```
分支策略：
  main            # 稳定分支
  dev             # 开发分支
  codex/*         # AI 辅助开发分支

提交信息：
  feat: 新增功能
  fix: 修复问题
  docs: 文档更新
  refactor: 重构
  chore: 工程配置
```

### 8.3 环境变量

```env
# .env.example

# 数据库
DATABASE_URL="postgresql://user:password@localhost:5432/offerpilot"

# 认证
AUTH_SECRET="your-secret-key"

# LLM API（支持切换供应商）
LLM_API_KEY="sk-xxx"
LLM_BASE_URL="https://api.openai.com/v1"
LLM_MODEL="gpt-4o-mini"

# 文件存储
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=10485760  # 10MB

# URL 抓取
PLAYWRIGHT_HEADLESS=true
```

---

## 9. 部署方案

### 9.1 开发环境

```bash
# 1. 启动本地 PostgreSQL（Docker）
# 选项 A：本地 PostgreSQL（Docker）
docker run --name offerpilot-db -e POSTGRES_USER=offerpilot \
  -e POSTGRES_PASSWORD=offerpilot -e POSTGRES_DB=offerpilot \
  -p 5432:5432 -d postgres:15

# 2. 安装依赖
pnpm install

# 3. 初始化数据库
npx prisma db push
npx prisma generate
npx tsx scripts/seed-role-profiles.ts

# 4. 启动开发服务器
pnpm dev

# ---- 或 ----

# 选项 B：Supabase 本地 CLI（推荐，体验一致）
# 1. 安装 Supabase CLI
brew install supabase/tap/supabase

# 2. 在项目根目录初始化
supabase init

# 3. 启动本地服务（包含 Postgres + Storage + Auth 模拟）
supabase start

# 4. 获取本地连接串
supabase status

# 5. 复制到 .env
DATABASE_URL="postgresql://postgres:postgres@localhost:54322/postgres"
```

### 9.2 生产部署

| 服务 | 方案 | 预算 |
|------|------|------|
| 前端 + API | Vercel (Hobby) | 免费 |
| 数据库 | Supabase (Free Tier) | 免费 |
| 文件存储 | Vercel Blob 或 AWS S3 免费层 | 免费 |
| LLM API | OpenAI API (按量计费) | 约 $0.5/100次分析 |

### 9.3 Playwright 抓取部署注意事项

Vercel Serverless 环境无法运行 Playwright（无 Chromium 二进制）。解决方案：

```
选项 A（推荐）：URL 抓取单独部署
  ├─ 在服务器上部署一个轻量抓取服务（Node.js + Playwright）
  ├─ 本地开发时直接运行 Playwright
  └─ Vercel API 代理到该服务

选项 B：放弃 Playwright，仅用 cheerio
  限制：只能抓取 SSR 页面，SPA 页面不行

选项 C：使用第三方抓取服务（如 Firecrawl）
  限制：增加依赖和成本

MVP 建议：选项 B（仅 cheerio），P2 再升级到选项 A
```

---

## 10. 安全考虑

| 风险 | 缓解措施 |
|------|---------|
| JWT Token 泄露 | 短有效期（24h）+ HTTP Only Cookie |
| 文件上传攻击 | 校验 MIME 类型 + 文件大小 + 限制扩展名 |
| Prompt Injection | 用户输入的 JD 文本做转义，标记为"用户输入"而非"指令" |
| CSRF | Next.js 内置 CSRF 保护 |
| XSS | React 默认转义，富文本使用 DOMPurify |
| 速率限制 | API Routes 加入 rate limiting |
| 数据库注入 | Prisma 参数化查询，无需额外处理 |

---

## 11. 开放问题

- [ ] MVP 阶段是否需要 WebSocket？（还是轮询就够了）
- [ ] PDF 导出是前端生成还是服务端生成？
- [ ] 是否需要在开发阶段 mock AI API（减少调用成本）？
- [ ] 岗位画像文件由 AI 辅助编写还是人工逐条确认？

---

*本文档将在实现过程中持续更新。*
