"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { MatchReport } from "@/types/application";
import RoleComparison from "@/components/analysis/RoleComparison";
import { APPLICATION_STATUSES, statusLabel, statusColor } from "@/lib/application-status";

interface ApplicationDetail {
  id: string;
  jdText: string;
  targetRoles: string[];
  company: string | null;
  position: string | null;
  matchScore: number | null;
  matchScoreQuant: number | null;
  matchScoreQual: number | null;
  matchReport: MatchReport | null;
  status: string;
  createdAt: string;
  resume: { fileName: string };
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
  const [savingStatus, setSavingStatus] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [companyDraft, setCompanyDraft] = useState("");
  const [positionDraft, setPositionDraft] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const handleStatusChange = async (status: string) => {
    if (!app || status === app.status) return;
    const prev = app.status;
    setApp({ ...app, status }); // 乐观更新
    setSavingStatus(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!data.success) {
        setApp((cur) => (cur ? { ...cur, status: prev } : cur)); // 失败回滚
        alert(data.error?.message || "更新状态失败");
      }
    } catch {
      setApp((cur) => (cur ? { ...cur, status: prev } : cur));
      alert("更新状态失败，请稍后重试");
    } finally {
      setSavingStatus(false);
    }
  };

  const startEditMeta = () => {
    if (!app) return;
    setCompanyDraft(app.company ?? "");
    setPositionDraft(app.position ?? "");
    setEditingMeta(true);
  };

  const handleSaveMeta = async () => {
    if (!app) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: companyDraft, position: positionDraft }),
      });
      const data = await res.json();
      if (data.success) {
        setApp((cur) =>
          cur ? { ...cur, company: data.data.company, position: data.data.position } : cur
        );
        setEditingMeta(false);
      } else {
        alert(data.error?.message || "保存失败");
      }
    } catch {
      alert("保存失败，请稍后重试");
    } finally {
      setSavingMeta(false);
    }
  };

  const handleDelete = async () => {
    if (!app) return;
    if (
      !confirm(
        "确定删除这条投递吗？\n\n关联的面试题也会一并删除，此操作不可撤销。"
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/applications");
      } else {
        alert(data.error?.message || "删除失败");
        setDeleting(false);
      }
    } catch {
      alert("删除失败，请稍后重试");
      setDeleting(false);
    }
  };

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
  // 优先用异岗对比里的中文岗位名；旧记录（targetRoles 为自由文本）回退到原文
  const targetRoleLabel =
    report?.roleComparison?.length
      ? report.roleComparison.map((r) => r.roleName).join("、")
      : app.targetRoles.join("、");

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/applications" className="text-sm text-blue-500 hover:underline">
            ← 返回投递列表
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href={`/interview/${app.id}`}
              className="text-sm text-blue-500 hover:underline"
            >
              模拟面试题
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm text-red-500 hover:text-red-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deleting ? "删除中..." : "删除投递"}
            </button>
          </div>
        </div>

        {/* 公司 / 岗位 / 状态 */}
        <div className="p-6 border border-border rounded-xl space-y-4">
          {editingMeta ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={companyDraft}
                  onChange={(e) => setCompanyDraft(e.target.value)}
                  placeholder="公司名"
                  maxLength={100}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
                <input
                  type="text"
                  value={positionDraft}
                  onChange={(e) => setPositionDraft(e.target.value)}
                  placeholder="岗位名"
                  maxLength={100}
                  className="px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveMeta}
                  disabled={savingMeta}
                  className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {savingMeta ? "保存中..." : "保存"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingMeta(false)}
                  disabled={savingMeta}
                  className="px-4 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold">
                  {[app.company, app.position].filter(Boolean).join(" · ") ||
                    "未命名岗位"}
                </h1>
              </div>
              <button
                type="button"
                onClick={startEditMeta}
                className="text-sm text-blue-500 hover:underline shrink-0"
              >
                编辑
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label htmlFor="status" className="text-sm text-muted-foreground">
              投递状态
            </label>
            <select
              id="status"
              value={app.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={savingStatus}
              className="px-3 py-1.5 text-sm border border-border rounded-lg bg-background text-foreground disabled:opacity-50"
              style={{ borderColor: statusColor(app.status) }}
            >
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 匹配度总览 */}
        <div className="flex items-center gap-8 p-6 border border-border rounded-xl">
          <div className="text-center">
            <p className="text-5xl font-bold text-blue-500">{app.matchScore ?? "—"}</p>
            <p className="text-sm text-muted-foreground mt-1">综合匹配度</p>
          </div>
          <div className="flex-1 space-y-1 text-sm text-muted-foreground">
            <p>简历：{app.resume.fileName}</p>
            {targetRoleLabel && <p>目标岗位：{targetRoleLabel}</p>}
            <p>量化分：{app.matchScoreQuant ?? "—"} · 质性分：{app.matchScoreQual ?? "—"}</p>
            <p>分析时间：{new Date(app.createdAt).toLocaleString("zh-CN")}</p>
          </div>
        </div>

        {report ? (
          <>
            {/* 维度评分 */}
            <section className="space-y-4">
              <h2 className="font-semibold text-lg">分维度评分</h2>
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={report.dimensions}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      dataKey="score"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.5}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {report.dimensions.map((dim) => (
                  <div key={dim.name} className="text-sm">
                    <span className="font-medium">{dim.name}</span>
                    <span className="text-muted-foreground"> · {dim.score}</span>
                    <p className="text-xs text-muted-foreground">{dim.details}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* 异岗评分对比 */}
            {report.roleComparison && report.roleComparison.length > 0 && (
              <RoleComparison roles={report.roleComparison} />
            )}

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
