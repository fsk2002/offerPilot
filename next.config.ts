import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 自托管使用 standalone 输出，减小镜像并支持 server.js 直启
  output: "standalone",
  // Cloudflare 构建：把 Prisma 客户端替换为 Neon 适配器（Workers 兼容）
  ...(process.env.DEPLOY_TARGET === "cloudflare"
    ? {
        turbopack: {
          resolveAlias: {
            "@/lib/prisma": "./src/lib/prisma.cf.ts",
            "@/lib/pdf-server": "./src/lib/pdf-server.cf.ts",
          },
        },
        webpack: (config: { resolve: { alias: Record<string, string> } }) => {
          config.resolve.alias["@/lib/prisma"] = path.resolve(
            process.cwd(),
            "src/lib/prisma.cf.ts"
          );
          config.resolve.alias["@/lib/pdf-server"] = path.resolve(
            process.cwd(),
            "src/lib/pdf-server.cf.ts"
          );
          return config;
        },
      }
    : {}),
};

export default nextConfig;
