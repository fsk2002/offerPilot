---
name: code-review
description: Review code style and quality after finishing a coding change in OfferPilot. Invoke this after implementing a feature, fixing a bug, or before committing — it checks the diff against this project's conventions (layered architecture, unified API response, zod validation, Next.js 16 rules, security) and fixes what it finds. Triggers on "review the code", "check quality", "审阅代码", "写完了检查一下".
---

# OfferPilot 代码质量审阅

写完一段代码后（实现功能、修 bug、提交前）用本 skill 自查。目标是让改动符合本项目既有约定，并在提交前清掉低级问题。

## 步骤

1. **确定审阅范围**：只看本次改动，不要全库扫。
   ```bash
   git diff --stat            # 看动了哪些文件
   git diff                   # 未暂存改动
   git diff --cached          # 已暂存改动
   ```
   如果还没提交过，用 `git status` 找出新增/修改的文件。

2. **跑自动检查**（必须全绿才算过）：
   ```bash
   npx eslint .               # exit 0 且无输出
   npx tsc --noEmit           # exit 0 且无输出
   ```
   有 error 必须修；warning 逐条判断，通常也要清（未使用变量/import、死代码）。

3. **对照下面的清单逐项核对改动**，发现问题**直接修**，不要只报告。

4. **修完再跑一遍第 2 步**确认干净。

5. 如果改动涉及接口行为（认证、上传、跳转），用真实 dev server 做一次最小回归（见最后一节），不要只靠类型检查就宣布完成。

## 项目约定清单

### 架构分层（重要）
- **route → service → lib** 三层，别把业务逻辑写进 route。
  - `route.ts`：只做鉴权、解析入参、调 service、包装响应。
  - `services/*.service.ts`：业务逻辑，抛领域错误类（如 `AuthError`/`ResumeError`）。
  - `lib/*`：无状态工具（`prisma`、`auth`、`file-storage`、`validation`）。
- 数据库只经 `@/lib/prisma` 单例访问，不要在别处 `new PrismaClient()`。

### 统一 API 响应
- 一律用 `@/services/api-helper` 的 `success(data, status?)` / `error(code, message, status?)`，不要手写 `NextResponse.json({...})`（表单接口的 redirect 除外）。
- 错误码用项目既定的字符串常量（`UNAUTHORIZED` / `VALIDATION_ERROR` / `NOT_FOUND` / `INTERNAL_ERROR` / `FILE_TOO_LARGE` 等），HTTP 状态码要对应。

### 输入校验
- 所有外部输入用 **zod** 校验，schema 尽量放 `@/lib/validation` 复用，避免同一份规则在 JSON 接口和表单接口各写一遍（两条路径必须校验一致）。
- 安全边界（用户输入、上传文件、外部 API）必须校验；内部调用之间不必过度防御。

### 认证
- JWT 校验逻辑要能在 **Node runtime** 跑（`jsonwebtoken` 依赖 node crypto，Edge runtime 会失败）。路由拦截放在 `src/proxy.ts`（Next 16 里 `middleware` 已改名 `proxy`，默认 Node runtime）。
- 密码相关：bcrypt 只取前 72 字节，校验层必须封顶 `max 72 字节`。
- Cookie 用 `httpOnly` + `sameSite:lax`，生产环境 `secure:true`。

### Next.js 16 约定
- 本项目是 Next 16，很多 API 与旧版不同。动到框架特性前先查 `node_modules/next/dist/docs/`。
- `params` / `searchParams` 在 page/route 里是 **Promise**，必须 `await`。
- 表单 POST 后跳转用 **302/303**（让浏览器转成 GET），不要用默认的 307（会保留 POST 方法导致跳转到页面时方法错误）。
- 客户端组件顶部要有 `"use client"`；`useEffect` 里别同步触发 setState 造成级联渲染（`react-hooks/set-state-in-effect`），异步逻辑用 effect 内的自执行函数 + 卸载标志。

### 代码风格
- 文件名 kebab-case，React 组件 PascalCase。
- 默认不写注释；只有当“为什么这么写”不明显时才写一行（隐藏约束、绕过某 bug、反直觉行为）。不要写解释“做了什么”的注释。
- 删掉死代码、未使用的 import/变量，别留 backward-compat 残渣。
- 不为不可能发生的场景加防御和 fallback；信任内部代码和框架保证。

## 最小回归（涉及接口行为时）
dev server 通常已在 :3000 跑。用临时探针数据验证，**验证后清理掉**：
```bash
# 例：注册→登录表单→带 cookie 访问受保护页应 200
curl -s -o /dev/null -w "%{http_code}\n" -X POST localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  --data '{"email":"probe@x.dev","name":"p","password":"probe123456"}'
# ... 完事后从库里删掉探针用户
docker exec offerpilot-db psql -U postgres -d offerpilot \
  -c "DELETE FROM \"User\" WHERE email='probe@x.dev';"
```

## 输出
审阅结束给一句话小结：跑了哪些检查、发现并修了什么、是否全绿。按严重程度分（🔴 必修 / 🟡 建议 / 🟢 记账），不要长篇大论。
