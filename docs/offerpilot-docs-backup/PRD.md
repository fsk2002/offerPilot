# OfferPilot 产品需求文档 (PRD)

> 版本：v1.4
> 最后更新：2026-07-29
> 状态：草稿

---

## 1. 项目概述

### 1.1 产品定位

OfferPilot 是一个 **AI 驱动的求职助手平台**。用户上传简历、选择目标岗位方向或粘贴职位描述（JD），AI 自动分析匹配度、按岗位侧重点给出差异化优化建议、支持在线修改简历、版本管理和模拟面试。

### 1.2 核心洞察

同一份简历投不同岗位，**侧重点完全不同**。OfferPilot 的核心能力不是"帮你改简历"，而是**"针对你想去的方向，帮你重新组织你想表达的技术叙事"**。

---

## 2. 岗位分类体系（产品骨架）

### 2.1 设计原则

- **覆盖全面**：涵盖互联网大厂主流技术岗和非技术岗
- **层级清晰**：岗位家族 → 具体岗位 → 画像详情
- **可扩展**：新增岗位只需添加配置文件，无需改代码
- **差异化有深度**：每个岗位的叙事侧重不是空话，而是可执行的 Prompt 策略

### 2.2 岗位分类树

```
├─ 技术类
│   ├─ 前端方向
│   │   ├─ 前端开发工程师
│   │   ├─ 移动端工程师（iOS / Android / Flutter / RN）
│   │   └─ 跨平台开发工程师
│   │
│   ├─ 后端方向
│   │   ├─ 后端开发工程师（Java / Go / Python / C++ / Node.js）
│   │   ├─ 微服务 / 分布式架构师
│   │   └─ 中间件开发工程师（消息队列 / 缓存 / RPC）
│   │
│   ├─ 全栈方向
│   │   └─ 全栈开发工程师
│   │
│   ├─ AI / 数据方向
│   │   ├─ AI应用研发工程师
│   │   ├─ 算法工程师 / 机器学习工程师
│   │   ├─ 自然语言处理（NLP）工程师
│   │   ├─ 计算机视觉（CV）工程师
│   │   ├─ 推荐系统工程师
│   │   ├─ 大模型算法工程师
│   │   ├─ 数据科学家
│   │   ├─ 大数据开发工程师（Spark / Flink / Hive）
│   │   └─ 数据分析师
│   │
│   ├─ 基础架构 / 质量保障方向
│   │   ├─ DevOps / SRE 工程师
│   │   ├─ 云原生开发工程师（K8s / Docker / Service Mesh）
│   │   ├─ 安全工程师 / 渗透测试
│   │   └─ 测试开发工程师
│   │
│   └─ 硬件 / 嵌入式方向
│       ├─ 嵌入式开发工程师
│       └─ 芯片 / FPGA 工程师
│
├─ 产品 / 设计类
│   ├─ 产品经理（电商 / 社交 / AI / B端 / C端）
│   ├─ 产品运营
│   └─ UI / UX 设计师
│
├─ 运营 / 市场类
│   ├─ 新媒体运营
│   ├─ 用户运营
│   ├─ 内容运营
│   ├─ 品牌营销 / 市场推广
│   └─ 商务拓展（BD）
│
└─ 管理 / 职能类
    ├─ 技术负责人 / Tech Lead
    ├─ 技术经理 / 研发总监
    ├─ 项目经理
    ├─ HR / 招聘
    └─ 财务 / 法务
```

### 2.3 画像结构定义

每个岗位的画像结构如下：

```typescript
interface RoleProfile {
  id: string                    // 唯一标识，如 "frontend-engineer"
  name: string                  // 中文名称
  family: string                // 所属岗位家族，如 "前端方向"
  category: string              // 大类，如 "技术类"

  // 核心技能权重（关键词匹配时使用）
  typicalSkills: {
    name: string
    weight: number              // 1-10，影响量化匹配分
    aliases: string[]           // 同义词，如 "React" → ["React.js", "ReactJS"]
    required: boolean           // 是否硬性要求
  }[]

  // 面试关注点（LLM 评估时使用）
  evaluationDimensions: {
    name: string                // 如 "框架深入度"
    prompt: string              // 评估指引，如 "考察对 React 源码和渲染机制的理解"
    weight: number
  }[]

  // 简历叙事策略（LLM 修改时使用）
  narrativeStrategy: {
    overall: string             // 总体策略描述
    perSection: {               // 各章节侧重点
      section: string           // "projects" | "experience" | "skills"
      emphasis: string          // 改写方向
    }[]
    keywords: string[]          // 应优先出现的关键词
  }
}
```

### 2.4 画像示例（三个方向的对比）

以"精通 React 的代码评审经历"为例，面试官想看的是：

| 岗位方向 | 简历上的写法 |
|---------|------------|
| 前端工程师 | "负责前端代码评审，重点关注组件复用性、渲染性能和状态管理设计模式" |
| 全栈工程师 | "参与前后端全链路的代码评审，关注 API 契约一致性、数据流设计和异常处理链路" |
| AI应用工程师 | "参与 AI 产品代码评审，关注 LLM 调用链路的容错设计、Prompt 安全性和推理效率" |

### 2.5 MVP 阶段覆盖范围

| 阶段 | 覆盖岗位 | 数量 |
|------|---------|------|
| P0 | 仅按 JD 分析，无岗位画像 | 0 |
| P1 MVP | 技术类全方向（前端/后端/全栈/AI数据/基础架构/测试开发） | ~12 个 |
| P2 扩展 | 产品设计类 + 运营市场类 | ~8 个 |
| P3 全面 | 管理职能 + 硬件方向 | ~8 个 |

> 建议 MVP 先覆盖技术类 12 个核心岗位，因为 OfferPilot 最初的目标用户就是技术求职者，画像的质量比数量重要。

---

## 3. 功能需求

### 3.1 优先级定义

| 等级 | 含义 | 目标阶段 |
|------|------|---------|
| P0 | MVP 核心闭环 | Phase 1-3 |
| P1 | 体验增强 & 工程深度 | Phase 4-6 |
| P2 | 高阶功能 | Phase 7+ |

### 3.2 功能清单

#### P0 — MVP 核心闭环

| 模块 | 功能 | 说明 |
|------|------|------|
| 认证 | 用户注册 / 登录 | 邮箱 + 密码，JWT Token |
| 简历上传 | 上传 PDF 简历 | 10MB 上限，格式校验 |
| 简历解析 | 智能解析简历内容 | 提取结构化字段 |
| JD 录入 | 粘贴 JD 链接（URL） | 后端分层抓取；失败降级 |
| JD 录入 | 手动粘贴 JD | 兜底方案 |
| JD 提取 | URL 抓取服务 | HTTP + cheerio → Playwright |
| 匹配分析 | 混合评分引擎 | 关键词量化 + LLM 质性评估 |
| 匹配分析 | 匹配详情展示 | 分维度评分 + 高亮对比 |
| 匹配分析 | 优化建议生成 | AI 针对性建议 |
| 投递记录 | 保存每次分析结果 | 简历快照 + JD + 报告 |
| 投递记录 | 历史投递列表 | 倒序展示，可筛选 |

#### P1 — 纵深工程增强

| 模块 | 功能 | 说明 |
|------|------|------|
| 岗位画像 | **岗位分类树展示** | 按家族/方向分层展示所有可用岗位画像 |
| 岗位画像 | **用户选择目标岗位** | 上传简历后选择 1-3 个目标画像 |
| 岗位画像 | **异岗评分对比** | 同一份简历对多个方向的匹配度可视化对比 |
| 岗位画像 | **画像驱动的 Prompt 策略** | 根据所选岗位生成差异化的分析和修改 Prompt |
| AI 智能修改 | **按岗位侧重点修改** | AI 按目标画像 + JD 双重上下文修改简历叙事角度 |
| AI 智能修改 | **Diff 预览 + 逐条确认** | 颜色标记增/删/改，用户逐条确认 |
| AI 智能修改 | **章节级修改** | 支持只修改"项目经历"或"技能列表"等指定章节 |
| 格式校对 | 简历格式一致性检查 | 日期 / 动词 / 量化 / 拼写 |
| 格式校对 | 一键修复 | 自动修正格式问题 |
| 简历编辑器 | Markdown 编辑 + 实时预览 | 左写右看 |
| 简历编辑器 | 导出 PDF | |
| 简历版本控制 | 版本管理 + Diff 对比 | 链表式版本回溯 |
| 多 JD 批量分析 | 同一份简历对比多个 JD | 横向匹配度排名 |
| AI 面试题 | 按岗位方向和 JD 生成 | 技术面 / 项目面 / 行为面 |
| 浏览器插件 | 一键发送 JD 到 OfferPilot | Chrome 扩展 |

#### P2 — 高阶功能

| 模块 | 功能 | 说明 |
|------|------|------|
| AI 简历生成 | 从零生成草稿 | AI 润色 |
| 语义搜索 | 根据简历推荐最佳 JD | |
| 非技术岗画像扩展 | 产品/运营/市场/职能方向 | 扩展画像库 |

---

## 4. 核心业务流程

### 4.1 用户旅程

```
注册 → 上传简历 → 解析 → 选择目标岗位方向（1-3个）
  → 粘贴 JD 链接 → 抓取 → （失败则手动粘贴）
  → AI 基于岗位画像 + JD 双重上下文分析
  → 展示各方向匹配度对比
  → 格式校对 → 一键修复
  → AI 智能修改 → 按岗位方向生成修改版
  → Diff 预览 → 逐条确认/驳回 → 保存
  → 导出 PDF → 生成面试题 → 投递
```

### 4.2 匹配评分引擎

```
第一层：关键词量化匹配（毫秒级）
  输入：简历技能清单 + 岗位典型技能权重 + JD 技能清单
  计算：加权 Jaccard 相似度
  输出：技术匹配分 + 命中/缺失清单

第二层：LLM 质性评估（秒级）
  输入：简历 + JD + 岗位画像评估维度
  评估：经验深度 / 职责对齐 / 表达质量
  输出：各维度评分 + 优化建议

最终匹配度 = 量化分 × 权重 + 质性分 × 权重
```

### 4.3 AI 智能修改 Prompt 策略（岗位感知）

```
系统 Prompt 包含：
  1. 目标岗位画像（family, typicalSkills, narrativeStrategy）
  2. 岗位改写规则
  3. 输出格式要求（JSON diff）

用户 Prompt 包含：
  1. 简历 content
  2. 目标 JD（可选）
  3. 用户指定的修改章节（全篇/某章节）

输出：
  {
    modifiedContent: { ... },  // 修改后的完整简历
    diffs: [
      { section: "projects", index: 0, type: "modified",
        oldText: "负责前端代码评审",
        newText: "负责前后端全链路代码评审...",
        reason: "突出全栈思维" }
    ]
  }
```

---

## 5. 数据模型

```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  avatar    String?
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  resumes   Resume[]
}

model Resume {
  id        String   @id @default(cuid())
  fileName  String
  filePath  String?
  fileSize  Int?
  version   Int       @default(1)
  source    String    @default("upload")
  content   Json?
  rawParsed Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  userId  String
  user    User @relation(fields: [userId], references: [id])
  parentId String?
  parent   Resume?  @relation("ResumeVersion", fields: [parentId], references: [id])
  children Resume[] @relation("ResumeVersion")
  applications Application[]
}

model Application {
  id          String   @id @default(cuid())
  company     String?
  position    String?
  jdUrl       String?
  jdText      String
  jdSource    String   @default("manual")
  jdParsed    Json?

  // 用户选择的目标岗位方向（画像 ID 数组）
  targetRoles   String[]

  matchScore  Int?
  matchReport Json?
  matchScoreQuant Int?
  matchScoreQual  Int?
  status      String   @default("pending")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  resumeId String
  resume   Resume @relation(fields: [resumeId], references: [id])
  userId String
  user   User @relation(fields: [userId], references: [id])
  interviews Interview[]
}

model Interview {
  id        String   @id @default(cuid())
  type      String
  question  String
  answer    String?
  createdAt DateTime @default(now())
  applicationId String
  application Application @relation(fields: [applicationId], references: [id])
  userId String
  user   User @relation(fields: [userId], references: [id])
}
```

### 5.1 岗位画像存储设计

岗位画像不存储在数据库，而是以 **JSON 配置文件** 的形式放在项目目录中：

```
offerpilot/
├─ data/
│  ├─ role-profiles/
│  │  ├─ index.json              # 分类树索引
│  │  ├─ frontend-engineer.json  # 前端工程师
│  │  ├─ backend-java.json       # Java 后端
│  │  ├─ fullstack.json          # 全栈
│  │  ├─ ai-engineer.json        # AI 应用
│  │  ├─ ml-engineer.json        # 算法/ML
│  │  ├─ devops.json             # DevOps/SRE
│  │  ├─ sdet.json               # 测试开发
│  │  ├─ pm.json                 # 产品经理
│  │  ├─ ...                     # 后续扩展
```

这样设计的好处：
- **新增岗位 = 加一个 JSON 文件**，无需改代码
- **可单独迭代**每个画像的质量
- **支持社区贡献**（未来可开放 PR）

---

## 6. 页面 & 路由规划

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | Landing | |
| `/auth/login` | 登录 | |
| `/auth/register` | 注册 | |
| `/dashboard` | 工作台 | 上传 + 概览 |
| `/applications` | 投递列表 | 卡片 + 筛选 |
| `/applications/[id]` | 投递详情 | 报告 + 建议 + 面试题 |
| `/resumes` | 简历管理 | 版本列表 |
| `/resumes/compare` | 简历对比 | diff 视图 |
| `/resumes/[id]/edit` | 简历编辑器 | 核心页面，含岗位选择 |
| `/interview/[applicationId]` | 面试题 | |
| `/settings` | 设置 | |

### 6.1 编辑器中岗位选择交互

```
首次分析流程：

用户上传简历后 → 弹出岗位选择弹窗
┌─────────────────────────────────┐
│  选择你的目标岗位（可多选，最多3个）│
│                                 │
│  ▸ 技术类                       │
│    ✓ 前端开发工程师              │
│    ✓ 全栈开发工程师              │
│    ✓ AI应用研发工程师            │
│    ○ 后端开发工程师（Java）      │
│    ○ 后端开发工程师（Go）        │
│    ...                          │
│  ▸ 产品/设计类                   │
│    ○ 产品经理                   │
│    ...                          │
│                                 │
│  [确认选择，开始分析]             │
└─────────────────────────────────┘
```

---

## 7. 里程碑规划

| 阶段 | 内容 | 周期 | 主要产出物 |
|------|------|------|-----------|
| Phase 0 | 项目规划 & 文档 | 1 天 | PRD + 技术设计文档 |
| Phase 1 | 工程搭建 | 0.5 天 | Next.js + Prisma + Postgres |
| Phase 2 | 认证 + 简历上传解析 | 2 天 | 注册/登录 + PDF 管线 |
| Phase 3 | AI 匹配分析 | 2.5 天 | 量化引擎 + LLM + URL 抓取 + 报告 |
| Phase 4 | 投递管理 + 可视化 | 1.5 天 | 投递 CRUD + 图表 |
| **Phase 5** | **岗位画像体系** | **2 天** | **分类树 + 12 个技术岗画像 + 选择交互 + 异岗评分对比** |
| Phase 6 | 简历编辑器 | 2 天 | Markdown 编辑器 + 侧栏 + 导出 |
| Phase 7 | AI 智能修改 + 格式校对 | 2.5 天 | 岗位感知修改 + Diff + 格式检查 |
| Phase 8 | 版本控制 + 面试题 | 1.5 天 | 版本管理 + 面试生成 |
| Phase 9 | 部署 & 打磨 | 1 天 | 部署 + README + Demo |

> 总计：约 16.5 个工作日

---

## 8. 面试价值点

| 话题 | 体现 |
|------|------|
| **岗位分类系统** | 可扩展的分类树设计 + JSON 配置驱动 |
| **混合评分** | Jaccard + LLM 双层设计 |
| **AI 智能修改** | 岗位感知 Prompt 策略 + Human-in-the-loop |
| **Diff 可视化** | 文本 diff 计算 + 颜色渲染 |
| **反爬工程** | 分层抓取策略 |
| **简历版本链** | 链表式版本回溯 |
| **产品思维** | 从"改简历"到"按岗位改写叙事角度"的认知升级 |

---

## 9. 开放问题

- [ ] 12 个技术岗画像的 JSON 配置文件是否需要与你逐一确认内容？还是我先出初稿你 review？
- [ ] 岗位选择交互是否可以"智能推荐"？比如解析简历后自动推测用户可能适合的方向
- [ ] 除了自己选择目标岗位，是否要加一个"帮我推荐适合的岗位方向"的功能？

---

*本文档将持续更新。*
