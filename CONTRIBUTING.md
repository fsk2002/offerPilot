# 贡献指南

## 开发流程

### 1. 分支策略

- `main` — 稳定分支，通过 PR 合并
- `codex/*` — AI 辅助功能开发分支
- `fix/*` — Bug 修复分支
- `feat/*` — 新功能分支

### 2. 提交规范

提交信息格式：

```
<type>: <简短描述>

<可选详细描述>
```

**类型说明：**

| 类型 | 适用场景 |
|------|---------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `refactor` | 代码重构 |
| `style` | 样式/格式化变更 |
| `chore` | 工程配置变更 |

**示例：**

```
feat: 新增 AI 匹配分析引擎
fix: 修复 JWT Token 过期未正确处理的问题
docs: 更新 README 中的 API 文档
```

### 3. Pull Request 流程

1. 从 `main` 创建新分支
2. 在新分支上开发
3. 提交前确保 `pnpm build` 通过
4. 创建 PR 到 `main`
5. PR 标题遵循提交规范格式
6. PR 描述中说明改了什么、为什么改、怎么测试

## 代码规范

### TypeScript

- 启用严格模式 (`strict: true`)
- 尽可能使用 `type` 而非 `interface`（社区趋势）
- 避免 `any`，使用 `unknown` 代替
- 函数返回值需要显式类型标注

### 组件规范

- 页面组件放在 `src/app/` 下，按路由组织
- 客户端组件用 `"use client"` 标记
- 组件默认使用 `export default`
- 文件名使用 PascalCase（组件）和 kebab-case（非组件）

### API 规范

- RESTful 风格
- 统一响应格式 `{ success: boolean, data?: T, error?: { code, message } }`
- 所有 API 需认证（除 auth 相关）
- 错误使用标准 HTTP 状态码

### CSS 规范

- 使用 Tailwind CSS 原子化类名
- 不使用 CSS Modules 或 styled-components
- 全局样式放在 `globals.css`

## 添加新功能

1. 先在 `docs/PRD.md` 中明确需求
2. 更新 `docs/TECH-DESIGN.md` 中的设计
3. 创建 API Route 和服务层方法
4. 创建页面组件
5. 确保 `pnpm build` 通过

## 添加新岗位画像

1. 在 `data/role-profiles/` 下创建 `<id>.json` 文件
2. 文件格式参考已有的画像文件
3. 更新 `data/role-profiles/index.json` 分类树

## 数据库变更

开发阶段直接修改 `prisma/schema.prisma` 后运行：

```bash
pnpm db:push    # 同步到数据库
pnpm db:generate # 重新生成客户端
```

生产环境使用迁移：

```bash
npx prisma migrate dev --name <migration-name>
npx prisma migrate deploy
```
