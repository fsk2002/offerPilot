import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker 自托管使用 standalone 输出，减小镜像并支持 server.js 直启
  output: "standalone",
};

export default nextConfig;
