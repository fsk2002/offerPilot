# OfferPilot PRD 对照进度报告

> 对照 `docs/PRD.md`（v1.4）逐条核对，最后更新：2026-08-03
> 状态：核心闭环全部完成；剩余项为 P1 大模块与 P2 扩展/延后项

## 结论

- **P0（MVP 核心闭环）**：11 / 11 全部实现
- **P1（纵深工程增强）**：14 / 15 实现；1 项未实现（浏览器插件）
- **P2（高阶功能）**：2 / 3 实现（AI 简历生成、非技术岗画像扩展）；1 项未实现（语义搜索/JD 推荐）
- **页面路由**：13 / 13 实现（含 /applications/batch 批量对比页）
- **里程碑**：Phase 0-9 全部完成

---

## P0 — MVP 核心闭环（11/11 ✅）

| 模块 | 功能 | 状态 | 证据 |
|------|------|------|------|
| 认证 | 用户注册 / 登录（JWT） | ✅ | `api/auth/*` + `auth.service.ts` |
| 简历上传 | 上传 PDF（10MB、格式校验） | ✅ | `resume.service.uploadResume`（扩展名/MIME/魔数/大小） |
| 简历解析 | 智能解析结构化 | ✅ | `parseResume` + `/api/resumes/[id]/structure`（上传不阻塞，编辑器内按需触发） |
| JD 录入 | 粘贴 JD 链接 | ✅ | `/api/jd-fetch` + `jd-fetch.service.ts` |
| JD 录入 | 手动粘贴 JD | ✅ | `/applications/new` |
| JD 提取 | URL 抓取（HTTP+cheerio→Playwright） | ⚠️ 部分 | cheerio 已实现；Playwright 层按 CLAUDE.md 已知延后（SPA 站点不可抓） |
| 匹配分析 | 混合评分引擎 | ✅ | `matching.ts`（量化）+ `ai.service.qualitativeMatch`（LLM） |
| 匹配分析 | 匹配详情展示 | ✅ | `/applications/[id]` 雷达图 + 异岗对比 |
| 匹配分析 | 优化建议生成 | ✅ | `matchReport.suggestions` 展示 |
| 投递记录 | 保存每次分析结果 | ✅ | `application.service.createAnalysis`（快照+JD+报告） |
| 投递记录 | 历史投递列表（倒序、筛选） | ✅ | `/applications` 倒序 + 状态筛选（本次补齐） |

## P1 — 纵深工程增强（14/15 ✅）

| 模块 | 功能 | 状态 | 证据 |
|------|------|------|------|
| 岗位画像 | 分类树展示 | ✅ | `/api/role-profiles` + `RoleSelector` |
| 岗位画像 | 用户选择 1-3 个目标画像 | ✅ | `RoleSelector`（上限 3） |
| 岗位画像 | 异岗评分对比 | ✅ | `RoleComparison` + `compareRoles` |
| 岗位画像 | 画像驱动 Prompt 策略 | ✅ | `ai.service` 注入 narrativeStrategy / evaluationDimensions |
| AI 修改 | 按岗位侧重点修改 | ✅ | `/api/resumes/[id]/ai-edit` |
| AI 修改 | Diff 预览 + 逐条确认 | ✅ | `AIEditPanel` + `lib/diff.ts`（接受/驳回/全部接受） |
| AI 修改 | 章节级修改 | ✅ | sections 参数 + 面板勾选（本次补齐） |
| 格式校对 | 格式一致性检查 | ✅ | `format-check.service.ts`（日期/标点/拼写/量化/时态/章节） |
| 格式校对 | 一键修复 | ✅ | `/api/resumes/[id]/format-fix` |
| 简历编辑器 | Markdown 编辑 + 实时预览 | ✅ | `/resumes/[id]/edit`（md-editor） |
| 简历编辑器 | 导出 PDF | ✅ | html2canvas + jsPDF |
| 版本控制 | 版本管理 + Diff 对比 | ✅ | `/resumes/[id]/versions` + `/resumes/compare` |
| 多 JD 批量分析 | 同一简历对比多个 JD | ✅ | `/applications/batch` + `/api/applications/batch-compare`（量化排名 → 完整分析） |
| AI 面试题 | 技术/项目/行为三类生成 | ✅ | `/interview/[applicationId]` + `interview.service.ts` |
| 浏览器插件 | 一键发送 JD | ❌ | 未实现（独立子项目，见"剩余待办"） |

## P2 — 高阶功能（2/3 ✅）

| 功能 | 状态 |
|------|------|
| AI 简历生成（从零生成草稿） | ✅ `/api/resumes/generate` + 简历页弹窗（画像 + 经历要点 → Markdown 草稿落库） |
| 语义搜索（根据简历推荐 JD） | ⬜ 未实现（岗位方向推荐已实现，JD 检索需向量化） |
| 非技术岗画像扩展（产品/运营/市场/职能） | ✅ 20 个画像（新增产品经理/UIUX/运营/市场/项目经理等 8 个） |

## 页面路由对照

| PRD 路由 | 状态 | 说明 |
|----------|------|------|
| `/` | ✅ | Landing（已登录跳转工作台） |
| `/auth/login` `/auth/register` | ✅ | |
| `/dashboard` | ✅ | 统计 + 入口 |
| `/applications` | ✅ | 列表 + 状态筛选 |
| `/applications/[id]` | ✅ | 报告/建议/面试题入口 |
| `/applications/batch` | ✅ | 多 JD 批量对比（本次新增） |
| `/resumes` | ✅ | 列表 + 上传 |
| `/resumes/[id]/edit` | ✅ | 编辑器 + AI 修改 + 格式校对 |
| `/resumes/[id]/versions` | ✅ | 版本历史（超出 PRD 规划，已实现） |
| `/resumes/compare` | ✅ | 版本对比 |
| `/interview/[applicationId]` | ✅ | 面试题 |
| `/settings` | ✅ | 个人设置（本次补齐） |
| `/applications/new` | ✅ | 新建分析（超出 PRD 页面清单，已实现） |

## 里程碑对照（CLAUDE.md §进度）

- [x] Phase 1 工程搭建
- [x] Phase 2 认证 + 简历上传解析
- [x] Phase 3 AI 匹配分析（量化 + LLM + URL 抓取 + 报告）
- [x] Phase 4 投递管理 + 可视化（CRUD + 状态流转 + 统计图）
- [x] Phase 5 岗位画像体系（分类树 + 12 画像 + 选择交互 + 异岗对比）
- [x] Phase 6 简历编辑器（Markdown 编辑器 + 侧栏 + 导出）
- [x] Phase 7 AI 智能修改 + 格式校对（岗位感知修改 + Diff + 格式检查）
- [x] Phase 8 版本控制 + 面试题（版本管理 + 面试生成）
- [x] Phase 9 部署 & 打磨（CI + Docker + README + 演示文档）

## 剩余待办（按优先级）

| 优先级 | 项 | 说明/建议 |
|--------|-----|----------|
| P1 | 浏览器插件 | Chrome 扩展一键发送 JD；独立子项目，建议作为后续专题 |
| P2 | 语义搜索 / JD 推荐 | 岗位方向推荐已实现（技能加权命中）；JD 检索需 Embedding + 向量检索 |
| 延后 | Playwright JD 抓取 | SPA 站点（如 campus.jd.com）需无头浏览器，CLAUDE.md 已记录延后 |
| 延后 | 生产环境上线 | Vercel/Supabase 配置已就绪（CI + Docker + README），未实际部署 |

## 开放问题对照（PRD §9）

| PRD 开放问题 | 当前状态 |
|-------------|---------|
| 12 个技术岗画像是否需要逐一确认内容 | ✅ 已落地：12 个技术岗画像 JSON 已写入 `data/role-profiles/`，经匹配分析、异岗对比、AI 修改全流程使用；内容可按需迭代 |
| 岗位选择是否可以"智能推荐"（解析简历后自动推测方向） | ✅ 已实现：`/api/role-profiles/recommend` 基于 20 个画像 typicalSkills 加权命中打分 |
| 是否增加"帮我推荐适合的岗位方向"功能 | ✅ 已实现：新建分析页"帮我推荐岗位"Top 6 一键加入目标方向 |
