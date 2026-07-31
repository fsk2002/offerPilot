"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  APPLICATION_STATUSES,
  statusLabel,
  statusColor,
} from "@/lib/application-status";

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
}

interface Stats {
  resumeCount: number;
  applicationCount: number;
  interviewCount: number;
  statusBreakdown: Record<string, number>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [meRes, statsRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/applications/stats"),
        ]);
        const meData = await meRes.json();
        if (!active) return;
        if (!meData.success) {
          router.push("/auth/login");
          return;
        }
        setUser(meData.data);
        const statsData = await statsRes.json();
        if (statsData.success) setStats(statsData.data);
      } catch {
        if (active) router.push("/auth/login");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  // 状态分布图数据：按枚举固定顺序，缺失状态计 0
  const chartData = APPLICATION_STATUSES.map((s) => ({
    status: s,
    label: statusLabel(s),
    count: stats?.statusBreakdown[s] ?? 0,
  }));
  const hasApplications = (stats?.applicationCount ?? 0) > 0;

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
          <Link
            href="/resumes"
            className="p-6 border border-border rounded-xl hover:border-blue-300 transition-colors space-y-2"
          >
            <h2 className="font-semibold text-lg">📄 管理简历</h2>
            <p className="text-sm text-muted-foreground">
              上传、编辑、管理你的简历版本
            </p>
          </Link>
          <Link
            href="/applications"
            className="p-6 border border-border rounded-xl hover:border-blue-300 transition-colors space-y-2"
          >
            <h2 className="font-semibold text-lg">🎯 投递记录</h2>
            <p className="text-sm text-muted-foreground">
              查看投递分析、匹配度报告和面试题
            </p>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-blue-500">
              {stats?.resumeCount ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">简历版本</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-blue-500">
              {stats?.applicationCount ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">投递分析</p>
          </div>
          <div className="p-4 border border-border rounded-lg">
            <p className="text-2xl font-bold text-blue-500">
              {stats?.interviewCount ?? 0}
            </p>
            <p className="text-sm text-muted-foreground">面试题</p>
          </div>
        </div>

        {/* 投递状态分布 */}
        <section className="space-y-3">
          <h2 className="font-semibold text-lg">投递状态分布</h2>
          {hasApplications ? (
            <div className="w-full h-64 border border-border rounded-xl p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value} 个`, "投递数"]}
                    labelFormatter={(label: string) => label}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((d) => (
                      <Cell key={d.status} fill={statusColor(d.status)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="border border-border rounded-xl p-8 text-center">
              <p className="text-sm text-muted-foreground">
                还没有投递记录，
                <Link href="/applications/new" className="text-blue-500 hover:underline">
                  去新建一次分析 →
                </Link>
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
