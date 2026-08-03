"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Resume {
  id: string;
  fileName: string;
  version: number;
}

interface BatchResult {
  index: number;
  title: string;
  score: number;
  matched: string[];
  missing: string[];
  degraded: boolean;
}

export default function BatchComparePage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [resumeId, setResumeId] = useState("");
  const [rawJds, setRawJds] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BatchResult[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/resumes");
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          router.push("/auth/login");
          return;
        }
        setResumes(data.data || []);
        if (data.data?.[0]) setResumeId(data.data[0].id);
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

  const runCompare = async () => {
    setError("");
    setResults(null);
    // 每份 JD 用单独一行 "---" 分隔
    const jds = rawJds
      .split(/^---+$/m)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ text }));
    if (jds.length === 0) {
      setError("请至少粘贴一份 JD（多份之间用一行 --- 分隔）");
      return;
    }
    if (jds.length > 10) {
      setError("一次最多对比 10 份 JD");
      return;
    }
    setRunning(true);
    try {
      const res = await fetch("/api/applications/batch-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeId, jds }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "批量对比失败");
        return;
      }
      setResults(data.data.results);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setRunning(false);
    }
  };

  const goFullAnalysis = (r: BatchResult) => {
    const jdText = rawJds.split(/^---+$/m).map((s) => s.trim()).filter(Boolean)[r.index] ?? "";
    sessionStorage.setItem(
      "offerpilot-batch-jd",
      JSON.stringify({ title: r.title, text: jdText })
    );
    router.push("/applications/new?preset=jd");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">多 JD 批量对比</h1>
            <p className="text-muted-foreground">
              同一份简历横向对比多个岗位，快速筛选投递目标（纯量化，秒级返回）
            </p>
          </div>
          <Link href="/applications" className="text-sm text-blue-500 hover:underline">
            ← 返回投递列表
          </Link>
        </div>

        <div className="p-6 border border-border rounded-xl space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">选择简历</p>
            <select
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fileName} · v{r.version}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">粘贴多个 JD</p>
            <textarea
              value={rawJds}
              onChange={(e) => setRawJds(e.target.value)}
              rows={10}
              placeholder={"第一份 JD 内容...\n---\n第二份 JD 内容...\n---\n第三份 JD 内容..."}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              多份 JD 之间用单独一行三个横线（---）分隔，最多 10 份。
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={runCompare}
            disabled={running || resumes.length === 0}
            className="w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {running ? "对比中..." : "开始批量对比"}
          </button>
        </div>

        {results && (
          <div className="space-y-3">
            <h2 className="font-semibold">
              匹配度排名（共 {results.length} 份 JD）
            </h2>
            {results.map((r, rank) => (
              <div key={r.index} className="border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg font-bold text-muted-foreground w-6">
                      {rank + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.matched.length > 0 && (
                          <>命中：{r.matched.join("、")}</>
                        )}
                        {r.missing.length > 0 && (
                          <> · 缺失：{r.missing.join("、")}</>
                        )}
                        {r.matched.length === 0 && r.missing.length === 0 && (
                          <>未识别到明确技能关键词</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="w-28 h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          r.score >= 75
                            ? "bg-green-500"
                            : r.score >= 50
                              ? "bg-blue-500"
                              : "bg-orange-500"
                        }`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                    <span className="text-xl font-bold w-10 text-right">
                      {r.score}
                    </span>
                    <button
                      type="button"
                      onClick={() => goFullAnalysis(r)}
                      className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
                    >
                      完整分析
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
