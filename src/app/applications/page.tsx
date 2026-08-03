"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  APPLICATION_STATUSES,
  statusLabel,
  statusColor,
} from "@/lib/application-status";

interface Application {
  id: string;
  company: string | null;
  position: string | null;
  matchScore: number | null;
  status: string;
  createdAt: string;
  resume: { fileName: string };
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-green-500";
  if (score >= 50) return "text-blue-500";
  return "text-orange-500";
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/applications");
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          router.push("/auth/login");
          return;
        }
        setApplications(data.data || []);
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
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  const visible = applications.filter((a) =>
    filterStatus === "" ? true : a.status === filterStatus
  );

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">投递记录</h1>
            <p className="text-muted-foreground">查看每次分析的匹配度报告</p>
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="status-filter" className="text-sm text-muted-foreground">
              状态
            </label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
            >
              <option value="">全部</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
            <Link
              href="/applications/new"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
            >
              新建分析
            </Link>
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground">
              {applications.length === 0
                ? "还没有投递分析"
                : "当前筛选条件下没有投递记录"}
            </p>
            <Link href="/applications/new" className="text-blue-500 hover:underline">
              上传简历、粘贴 JD，开始第一次分析 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="p-4 border border-border rounded-lg flex items-center justify-between hover:border-blue-300 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {[app.company, app.position].filter(Boolean).join(" · ") ||
                        "未命名岗位"}
                    </p>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ backgroundColor: statusColor(app.status) }}
                    >
                      {statusLabel(app.status)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {app.resume.fileName} ·{" "}
                    {new Date(app.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-2xl font-bold ${scoreColor(app.matchScore)}`}>
                    {app.matchScore ?? "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">匹配度</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
