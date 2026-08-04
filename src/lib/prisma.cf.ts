import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prismaCf: PrismaClient | undefined;
};

/**
 * Cloudflare Workers 专用 Prisma 客户端：使用 Neon 驱动适配器
 * （WebSocket 协议，官方支持 Cloudflare Workers）。
 * 构建时通过 next.config 的 resolveAlias 把 "@/lib/prisma" 指向本文件。
 */
function createClient(): PrismaClient {
  const adapter = new PrismaNeon({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prismaCf ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prismaCf = prisma;
