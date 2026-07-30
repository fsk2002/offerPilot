"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">投递记录</h1>
            <p className="text-muted-foreground">查看每次分析的匹配度报告</p>
          </div>
          <Link
            href="/applications/new"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors"
          >
            新建分析
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground">还没有投递分析</p>
            <Link href="/applications/new" className="text-blue-500 hover:underline">
              上传简历、粘贴 JD，开始第一次分析 →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map((app) => (
              <Link
                key={app.id}
                href={`/applications/${app.id}`}
                className="p-4 border border-border rounded-lg flex items-center justify-between hover:border-blue-300 transition-colors"
              >
                <div>
                  <p className="font-medium">{app.position || "未命名岗位"}</p>
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
