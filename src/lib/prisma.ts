import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * 使用 PrismaPg 驱动适配器：同一份客户端同时兼容
 * Node/Docker（本地、服务器）与 Cloudflare Workers（nodejs_compat）。
 * 驱动适配器走 pg 协议，不依赖 Prisma 查询引擎二进制。
 */
function createClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
