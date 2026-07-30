"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          router.push("/dashboard");
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-blue-500">Offer</span>Pilot
        </h1>
        <p className="text-xl text-muted-foreground">
          AI 驱动的求职助手 — 分析匹配度、优化简历、模拟面试
        </p>
        <p className="text-muted-foreground">
          上传你的简历，选择目标岗位方向，让 AI 帮你拿到 Offer
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <a
            href="/auth/register"
            className="inline-flex items-center px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            开始使用
          </a>
          <a
            href="/auth/login"
            className="inline-flex items-center px-6 py-3 border border-border rounded-lg font-medium hover:bg-secondary transition-colors"
          >
            登录
          </a>
        </div>
      </div>
    </main>
  );
}
