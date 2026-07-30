"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { MatchReport } from "@/types/application";

interface ApplicationDetail {
  id: string;
  jdText: string;
  targetRoles: string[];
  matchScore: number | null;
  matchScoreQuant: number | null;
  matchScoreQual: number | null;
  matchReport: MatchReport | null;
  status: string;
  createdAt: string;
  resume: { fileName: string };
}

function barColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-blue-500";
  return "bg-orange-500";
}

const severityLabel: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export default function ApplicationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/applications/${params.id}`);
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          if (res.status === 401) {
            router.push("/auth/login");
          } else {
            setNotFound(true);
          }
          return;
        }
        setApp(data.data);
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.id, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (notFound || !app) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">投递记录不存在</p>
        <Link href="/applications" className="text-blue-500 hover:underline">
          返回投递列表
        </Link>
      </main>
    );
  }

  const report = app.matchReport;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <Link href="/applications" className="text-sm text-blue-500 hover:underline">
            ← 返回投递列表
          </Link>
        </div>

        {/* 匹配度总览 */}
        <div className="flex items-center gap-8 p-6 border border-border rounded-xl">
          <div className="text-center">
            <p className="text-5xl font-bold text-blue-500">{app.matchScore ?? "—"}</p>
            <p className="text-sm text-muted-foreground mt-1">综合匹配度</p>
          </div>
          <div className="flex-1 space-y-1 text-sm text-muted-foreground">
            <p>简历：{app.resume.fileName}</p>
            {app.targetRoles.length > 0 && <p>目标岗位：{app.targetRoles.join("、")}</p>}
            <p>量化分：{app.matchScoreQuant ?? "—"} · 质性分：{app.matchScoreQual ?? "—"}</p>
            <p>分析时间：{new Date(app.createdAt).toLocaleString("zh-CN")}</p>
          </div>
        </div>

        {report ? (
          <>
            {/* 维度评分 */}
            <section className="space-y-4">
              <h2 className="font-semibold text-lg">分维度评分</h2>
              {report.dimensions.map((dim) => (
                <div key={dim.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{dim.name}</span>
                    <span className="text-muted-foreground">{dim.score}</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor(dim.score)}`}
                      style={{ width: `${Math.max(0, Math.min(100, dim.score))}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{dim.details}</p>
                </div>
              ))}
            </section>

            {/* 缺失项 */}
            {report.gaps.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold text-lg">待补强项</h2>
                <div className="space-y-2">
                  {report.gaps.map((gap, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 border border-border rounded-lg text-sm"
                    >
                      <span className="px-2 py-0.5 bg-secondary rounded-full text-xs shrink-0">
                        {gap.type === "skill" ? "技能" : "经验"} · {severityLabel[gap.severity]}
                      </span>
                      <span>{gap.description}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 优化建议 */}
            {report.suggestions.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-semibold text-lg">优化建议</h2>
                <div className="space-y-2">
                  {report.suggestions.map((sug, i) => (
                    <div key={i} className="p-3 border border-border rounded-lg text-sm">
                      <span className="text-blue-500 font-medium">[{sug.section}] </span>
                      {sug.content}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">该投递暂无匹配报告</p>
        )}

        {/* JD 原文 */}
        <details className="border border-border rounded-lg p-4">
          <summary className="cursor-pointer font-medium text-sm">查看 JD 原文</summary>
          <pre className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap">
            {app.jdText}
          </pre>
        </details>
      </div>
    </main>
  );
}
