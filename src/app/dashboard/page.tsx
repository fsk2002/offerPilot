"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          router.push("/auth/login");
          return;
        }
        setUser(data.data);
      })
      .catch(() => router.push("/auth/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">工作台</h1>
            <p className="text-muted-foreground">
              欢迎回来，{user?.name}
            </p>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.push("/auth/login");
              router.refresh();
            }}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            退出登录
          </button>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/resumes"
            className="p-6 border border-border rounded-xl hover:border-blue-300 transition-colors space-y-2"
          >
            <h2 className="font-semibold text-lg">📄 管理简历</h2>
            <p className="text-sm text-muted-foreground">
              上传、编辑、管理你的简历版本
            </p>
          </a>
          <a
            href="/applications"
            className="p-6 border border-border rounded-xl hover:border-blue-300 transition-colors space-y-2"
          >
            <h2 className="font-semibold text-lg">🎯 投递记录</h2>
            <p className="text-sm text-muted-foreground">
              查看投递分析、匹配度报告和面试题
            </p>
          </a>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-blue-500">0</p>
            <p className="text-sm text-muted-foreground">简历版本</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-blue-500">0</p>
            <p className="text-sm text-muted-foreground">投递分析</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-blue-500">0</p>
            <p className="text-sm text-muted-foreground">面试题</p>
          </div>
        </div>
      </div>
    </main>
  );
}
