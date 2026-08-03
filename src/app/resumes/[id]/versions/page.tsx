"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface VersionItem {
  id: string;
  version: number;
  fileName: string;
  source: string;
  createdAt: string;
  updatedAt: string;
}

const SOURCE_LABEL: Record<string, string> = {
  upload: "已上传",
  editor: "编辑保存",
  ai_modified: "AI 修改",
  role_adapted: "岗位适配",
};

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

export default function ResumeVersionsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [versions, setVersions] = useState<VersionItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [rollingBack, setRollingBack] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/resumes/${params.id}/versions`);
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          if (res.status === 401) router.push("/auth/login");
          else setNotFound(true);
          return;
        }
        const list = data.data as VersionItem[];
        setVersions(list);
        if (list.length >= 2) {
          setFromId(list[0].id);
          setToId(list[list.length - 1].id);
        }
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

  const handleRollback = async (versionId: string) => {
    if (
      !confirm(
        "将从该版本派生一个新版本继续编辑，原版本链保持不变，是否继续？"
      )
    ) {
      return;
    }
    setRollingBack(versionId);
    setError("");
    try {
      const res = await fetch(`/api/resumes/${versionId}/versions`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/resumes/${data.data.id}/edit`);
      } else {
        setError(data.error?.message || "创建版本失败");
      }
    } catch {
      setError("创建版本失败，请稍后重试");
    } finally {
      setRollingBack(null);
    }
  };

  const handleCompare = () => {
    if (!fromId || !toId || fromId === toId) {
      setError("请选择两个不同的版本进行对比");
      return;
    }
    router.push(`/resumes/compare?from=${fromId}&to=${toId}`);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (notFound || !versions) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">简历不存在</p>
        <Link href="/resumes" className="text-blue-500 hover:underline">
          返回简历管理
        </Link>
      </main>
    );
  }

  const current = versions[versions.length - 1];

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/resumes" className="text-sm text-blue-500 hover:underline">
            ← 返回简历管理
          </Link>
          <Link
            href={`/resumes/${current.id}/edit`}
            className="text-sm text-blue-500 hover:underline"
          >
            编辑当前版本 →
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold">版本历史</h1>
          <p className="text-muted-foreground">
            {current.fileName} · 共 {versions.length} 个版本
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        {/* 版本对比选择 */}
        {versions.length >= 2 && (
          <div className="p-4 border border-border rounded-lg space-y-3">
            <p className="font-medium text-sm">版本对比</p>
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version}（旧）
                  </option>
                ))}
              </select>
              <span className="text-muted-foreground text-sm">→</span>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version}（新）
                  </option>
                ))}
              </select>
              <button
                onClick={handleCompare}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                对比
              </button>
            </div>
          </div>
        )}

        {/* 版本链 */}
        <div className="space-y-2">
          {versions.map((v, i) => {
            const isLatest = i === versions.length - 1;
            return (
              <div
                key={v.id}
                className={`p-4 border rounded-lg flex items-center justify-between gap-3 ${
                  isLatest ? "border-blue-300 bg-blue-50/40" : "border-border"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">v{v.version}</span>
                    <span className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                      {sourceLabel(v.source)}
                    </span>
                    {isLatest && (
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                        最新
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(v.createdAt).toLocaleString("zh-CN")}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/resumes/${v.id}/edit`}
                    className="text-sm text-blue-500 hover:underline"
                  >
                    编辑
                  </Link>
                  {!isLatest && (
                    <button
                      type="button"
                      onClick={() => handleRollback(v.id)}
                      disabled={rollingBack === v.id}
                      className="text-sm text-amber-600 hover:text-amber-700 hover:underline disabled:opacity-50"
                    >
                      {rollingBack === v.id ? "创建中..." : "从该版本继续"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
