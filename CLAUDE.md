1# OfferPilot 协作 Workflow

> 本文件是 Claude 与用户在本项目的协作流程约定。每次对话自动加载，Claude 应默认遵循。
> 项目：AI 求职助手（简历上传/解析 → 岗位画像 + JD 双上下文匹配 → 报告 → 投递管理 → 简历编辑/AI 修改 → 版本/面试题）。技术栈：Next.js 16 App Router + Prisma + Postgres + 火山方舟 LLM。

---

## 每个 Phase 的标准流程（7 步）

按里程碑（PRD §7）逐个 Phase 推进。每个 Phase 一律走以下 7 步，不跳步：

1. **摸现状**：读 `docs/PRD.md` / `docs/TECH-DESIGN.md` 里本 Phase 的相关章节 + 现有代码，列清"已有 / 缺什么"的差距。
2. **进 plan 模式**：`EnterPlanMode`。用 `AskUserQuestion` **一次性批量**问清本 Phase 的关键产品决策（通常 2–3 个，带推荐项 + 预览）。决策没定不写计划。
3. **写计划 + 批准**：计划写入 plan 文件（含 Context / 已确认决策 / 复用现有资产 / 分任务 / 验证 / 不做的范围），`ExitPlanMode` 等用户批准。
4. **拆任务**：`TodoWrite` 把计划拆成可独立提交的子任务（A/B/C…），一次只 in_progress 一个。
5. **逐任务实现**：每个子任务完成后 → `tsc --noEmit` + `eslint` 该范围绿 → **自动 `git add` 指定文件 + `commit`**（独立可回退）。不 `git add .`。
6. **验证任务（每个 Phase 最后一个任务）**：
   - 全量 `npx eslint . && npx tsc --noEmit` 全绿。
   - dev server **真实回归**：用探针用户走完整链路（含边界：非法输入、越权、旧数据），能断言的用 DB 断言。
   - **验证后立即清理**探针数据：DB 记录、上传文件、临时脚本，确认 `git status` 干净、无残留时间戳文件。
   - 起一个独立 code review 子代理（`general-purpose`，只读）审 diff，只收"确认的正确性/安全缺陷"。
7. **交付**：向用户汇报"做了什么 + 验证结果 + 下一步"，**等用户明确说 push 才 push**。

---

## 安全红线（不可逾越）

- **push 永远手动**：只有用户明确说"push"才推远程。绝不自动 push。
- **git 身份 local-only**：仅本仓库配置，不动全局 config。
- **LLM API Key**：由用户自己填进 `.env`；绝不在对话里粘贴、绝不提交。`.env*` 保持 gitignore（`.env.example` 除外）。
- **提交前扫描**：commit 前检查 staged 内容有无密钥/凭证；`git add` 只加点名的文件，不用 `git add .` / `-A`。
- **探针数据必清**：任何真实回归测试造的 DB 数据 / 上传文件 / 临时脚本，验证完立即删干净。
- **破坏性操作先问**：删库、reset --hard、force push、删分支等，先跟用户确认。

---

## 提交约定

- **粒度**：一个子任务一个 commit，可独立 revert。
- **信息**：`type(scope): 摘要`（feat/fix/refactor/docs…），正文说清"为什么"+ 属于哪个 Phase 哪个任务，结尾带 `Co-Authored-By: Claude <noreply@anthropic.com>`。
- **HEREDOC** 传 commit message 保证格式。

---

## 沿用的工程模式（复用，不重造）

- **包管理器：pnpm**（有 `pnpm-lock.yaml` + `node_modules/.pnpm` 结构）。装依赖一律 `pnpm add`，**绝不用 npm/yarn**——用 npm 会撞坏 pnpm 的依赖树（arborist 报 `Cannot read properties of null`）。

- **分层**：route（鉴权 `getAuthToken()/verifyToken()` + 校验 + 错误映射）→ service（业务 + 抛领域错误类）→ lib（纯函数/加载器）。
- **响应**：统一 `success()/error()`（`src/services/api-helper.ts`）。
- **校验**：zod schema 集中在 `src/lib/validation.ts`。
- **Next 16**：路由 `params` 是 Promise，必须 await。
- **级联删除**：schema 无 onDelete 规则 → service 里用 `$transaction` 手动按依赖顺序删（参照 `deleteResume`/`deleteApplication`）。
- **无谓迁移**：能用已有列 / Json 列嵌字段就不写 migration。
- **诊断优先**：用户报 bug 时先给根因 + 现状，不立刻改代码（除非用户已说"直接修"）。

---

## 里程碑进度（PRD §7）

- [x] Phase 1 工程搭建
- [x] Phase 2 认证 + 简历上传解析
- [x] Phase 3 AI 匹配分析（量化 + LLM + URL 抓取 + 报告）
- [x] Phase 4 投递管理 + 可视化（CRUD + 状态流转 + 统计图）
- [x] Phase 5 岗位画像体系（分类树 + 12 画像 + 选择交互 + 异岗对比）
- [x] Phase 6 简历编辑器（Markdown 编辑器 + 侧栏 + 导出）
- [x] Phase 7 AI 智能修改 + 格式校对（岗位感知修改 + Diff + 格式检查）
- [ ] Phase 8 版本控制 + 面试题（版本管理 + 面试生成）
- [ ] Phase 9 部署 & 打磨

**已知延后项**：JD 链接抓取对 SPA（如 campus.jd.com 哈希路由）无效，需 Playwright，用户已决定暂缓。

> 节奏约定：6→7→8→9 连续推进，中途不为"验收效果"停顿；但每个 Phase **起步的关键产品决策仍先问用户**（批量问，不打断实现）。Phase 6 编辑器是 7/8 的地基且为纯 UI，建议用户至少肉眼验收一次再往上叠。
