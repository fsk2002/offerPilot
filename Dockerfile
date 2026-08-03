# ============================================================
# OfferPilot 生产镜像（多阶段构建）
# ============================================================
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@10 --activate
ENV NEXT_TELEMETRY_DISABLED=1

# 依赖层
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 构建层
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm db:generate && pnpm build

# 运行层
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# 运行时按需读取的静态数据（岗位画像 + Prompt 模板）
COPY --from=builder /app/data ./data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
