"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { computeDiff, type DiffChange } from "@/lib/diff";

interface CompareClientProps {
  from: string;
  to: string;
}

interface ResumeSnapshot {
  id: string;
  fileName: string;
  version: number;
  initialMarkdown: string;
}

const TYPE_LABEL: Record<DiffChange["type"], string> = {
  replace: "修改",
  insert: "新增",
  delete: "删除",
};

export default function CompareClient({ from, to }: CompareClientProps) {
  const router = useRouter();
  const [fromResume, setFromResume] = useState<ResumeSnapshot | null>(null);
  const [toResume, setToResume] = useState<ResumeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [a, b] = await Promise.all([
          fetch(`/api/resumes/${from}/edit`).then((r) => r.json()),
          fetch(`/api/resumes/${to}/edit`).then((r) => r.json()),
        ]);
        if (!active) return;
        if (!a.success || !b.success) {
          setError(a.error?.message || b.error?.message || "版本不存在");
          return;
        }
        setFromResume(a.data);
        setToResume(b.data);
      } catch {
        if (active) setError("网络错误，请稍后重试");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [from, to]);

  // 参数缺失 / 同版本对比不需要请求，直接渲染提示
  if (!from || !to) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">缺少版本参数，请从版本历史页发起对比</p>
        <Link href="/resumes" className="text-blue-500 hover:underline">
          返回简历管理
        </Link>
      </main>
    );
  }

  if (from === to) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">两个版本相同，无需对比</p>
        <Link href="/resumes" className="text-blue-500 hover:underline">
          返回简历管理
        </Link>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{error}</p>
        <Link href="/resumes" className="text-blue-500 hover:underline">
          返回简历管理
        </Link>
      </main>
    );
  }

  if (!fromResume || !toResume) return null;

  const changes = computeDiff(
    fromResume.initialMarkdown,
    toResume.initialMarkdown
  );
  const stats = changes.reduce(
    (acc, c) => {
      acc[c.type] += 1;
      return acc;
    },
    { replace: 0, insert: 0, delete: 0 }
  );

  const handleSwap = () => {
    router.replace(`/resumes/compare?from=${to}&to=${from}`);
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/resumes/${fromResume.id}/versions`}
            className="text-sm text-blue-500 hover:underline"
          >
            ← 返回版本历史
          </Link>
          <button
            type="button"
            onClick={handleSwap}
            className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
          >
            交换对比方向
          </button>
        </div>

        <div>
          <h1 className="text-2xl font-bold">版本对比</h1>
          <p className="text-sm text-muted-foreground mt-1">
            v{fromResume.version}（旧） → v{toResume.version}（新）
            <span className="mx-2 text-border">|</span>
            {fromResume.fileName}
          </p>
          <p className="text-sm text-muted-foreground">
            共 {changes.length} 处变更 · 修改 {stats.replace} / 新增 {stats.insert} / 删除{" "}
            {stats.delete}
          </p>
        </div>

        {changes.length === 0 ? (
          <div className="p-8 border border-border rounded-xl text-center text-muted-foreground">
            两个版本内容一致，没有差异。
          </div>
        ) : (
          <div className="space-y-4">
            {changes.map((change) => (
              <div key={change.id} className="border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary/60 text-xs text-muted-foreground">
                  <span
                    className={`px-2 py-0.5 rounded font-medium ${
                      change.type === "delete"
                        ? "bg-red-100 text-red-700"
                        : change.type === "insert"
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {TYPE_LABEL[change.type]}
                  </span>
                  <span>
                    {change.type === "insert"
                      ? `新 L${change.newStart + 1}-${change.newEnd}`
                      : change.type === "delete"
                        ? `旧 L${change.oldStart + 1}-${change.oldEnd}`
                        : `旧 L${change.oldStart + 1}-${change.oldEnd} → 新 L${change.newStart + 1}-${change.newEnd}`}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
                  {change.oldText && (
                    <div className="bg-red-50/60 p-3 text-sm whitespace-pre-wrap text-red-800 line-through decoration-red-300">
                      {change.oldText}
                    </div>
                  )}
                  {change.newText && (
                    <div className="bg-green-50/60 p-3 text-sm whitespace-pre-wrap text-green-800">
                      {change.newText}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
