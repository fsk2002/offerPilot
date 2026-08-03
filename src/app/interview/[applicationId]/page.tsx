"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface InterviewItem {
  id: string;
  type: "technical" | "project" | "behavioral";
  question: string;
  answer: string | null;
  createdAt: string;
}

interface ApplicationBrief {
  id: string;
  company: string | null;
  position: string | null;
  resume: { fileName: string };
}

const TYPE_LABEL: Record<InterviewItem["type"], string> = {
  technical: "技术面",
  project: "项目面",
  behavioral: "行为面",
};

const TYPE_STYLE: Record<InterviewItem["type"], string> = {
  technical: "bg-blue-100 text-blue-700",
  project: "bg-violet-100 text-violet-700",
  behavioral: "bg-amber-100 text-amber-700",
};

function toMarkdown(
  app: ApplicationBrief,
  interviews: InterviewItem[],
  answers: Record<string, string>
): string {
  const lines: string[] = [];
  const title = [app.company, app.position].filter(Boolean).join(" · ") || "模拟面试";
  lines.push(`# 模拟面试题 — ${title}`);
  lines.push("");
  lines.push(
    `> 基于职位描述与简历「${app.resume.fileName}」生成的模拟面试，共 ${interviews.length} 题。`
  );
  lines.push("");

  let qIndex = 0;
  for (const type of ["technical", "project", "behavioral"] as const) {
    const items = interviews.filter((i) => i.type === type);
    if (items.length === 0) continue;
    lines.push(`## ${TYPE_LABEL[type]}（${items.length}）`);
    lines.push("");
    for (const item of items) {
      qIndex += 1;
      lines.push(`### Q${qIndex}. ${item.question}`);
      lines.push("");
      const answer = (answers[item.id] ?? "").trim();
      lines.push(answer ? answer : "（未作答）");
      lines.push("");
    }
  }

  return lines.join("\n");
}

export default function InterviewPage() {
  const router = useRouter();
  const params = useParams<{ applicationId: string }>();
  const [app, setApp] = useState<ApplicationBrief | null>(null);
  const [interviews, setInterviews] = useState<InterviewItem[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [appRes, ivRes] = await Promise.all([
          fetch(`/api/applications/${params.applicationId}`).then((r) => r.json()),
          fetch(`/api/applications/${params.applicationId}/interviews`).then((r) =>
            r.json()
          ),
        ]);
        if (!active) return;
        if (!appRes.success) {
          if (appRes.error?.code === "UNAUTHORIZED") router.push("/auth/login");
          else setError(appRes.error?.message || "投递记录不存在");
          return;
        }
        setApp(appRes.data);
        if (ivRes.success) {
          const list = ivRes.data as InterviewItem[];
          setInterviews(list);
          setAnswers(
            Object.fromEntries(list.map((i) => [i.id, i.answer ?? ""]))
          );
        }
      } catch {
        if (active) setError("网络错误，请稍后重试");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [params.applicationId, router]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    setSavedHint("");
    try {
      const res = await fetch(`/api/applications/${params.applicationId}/interviews`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "生成面试题失败");
        return;
      }
      setInterviews(data.data);
      setAnswers(
        Object.fromEntries((data.data as InterviewItem[]).map((i) => [i.id, ""]))
      );
    } catch {
      setError("生成面试题失败，请稍后重试");
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveAnswer = async (id: string) => {
    setSavingId(id);
    setSavedHint("");
    try {
      const res = await fetch(`/api/interviews/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: answers[id] ?? "" }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedHint("回答已保存");
      } else {
        setError(data.error?.message || "保存回答失败");
      }
    } catch {
      setError("保存回答失败，请稍后重试");
    } finally {
      setSavingId(null);
    }
  };

  const handleExport = () => {
    if (!app || !interviews) return;
    const md = toMarkdown(app, interviews, answers);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const base = [app.company, app.position].filter(Boolean).join("-") || "模拟面试";
    a.href = url;
    a.download = `${base}-面试题.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (error && !app) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">{error}</p>
        <Link href="/applications" className="text-blue-500 hover:underline">
          返回投递列表
        </Link>
      </main>
    );
  }

  const title =
    [app?.company, app?.position].filter(Boolean).join(" · ") || "投递";
  const types = ["technical", "project", "behavioral"] as const;

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/applications/${params.applicationId}`}
            className="text-sm text-blue-500 hover:underline"
          >
            ← 返回投递详情
          </Link>
          {interviews && interviews.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
            >
              导出 Markdown
            </button>
          )}
        </div>

        <div>
          <h1 className="text-2xl font-bold">模拟面试题</h1>
          <p className="text-muted-foreground">
            {title}
            {interviews && ` · 共 ${interviews.length} 题`}
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}
        {savedHint && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {savedHint}
          </p>
        )}

        {interviews && interviews.length === 0 && (
          <div className="p-8 border border-dashed border-border rounded-xl text-center space-y-4">
            <p className="text-muted-foreground">
              还没有面试题。基于 JD 和简历生成一份模拟面试题，技术面 + 项目面 + 行为面。
            </p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="px-6 py-2.5 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {generating ? "AI 生成中，通常需要 10-30 秒..." : "生成面试题"}
            </button>
          </div>
        )}

        {interviews && interviews.length > 0 && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                逐题准备回答，保存后导出 Markdown 用于复盘。
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating}
                className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50"
              >
                {generating ? "重新生成中..." : "重新生成"}
              </button>
            </div>

            {types.map((type) => {
              const items = interviews.filter((i) => i.type === type);
              if (items.length === 0) return null;
              return (
                <section key={type} className="space-y-3">
                  <h2 className="font-semibold">
                    {TYPE_LABEL[type]}
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}
                      · {items.length} 题
                    </span>
                  </h2>
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="border border-border rounded-xl p-4 space-y-3"
                    >
                      <p className="text-sm">
                        <span
                          className={`inline-block mr-2 px-2 py-0.5 rounded text-xs font-medium ${TYPE_STYLE[item.type]}`}
                        >
                          {TYPE_LABEL[item.type]}
                        </span>
                        {item.question}
                      </p>
                      <textarea
                        value={answers[item.id] ?? ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="写下你的回答思路..."
                        className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground"
                      />
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleSaveAnswer(item.id)}
                          disabled={savingId === item.id}
                          className="px-4 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                          {savingId === item.id ? "保存中..." : "保存回答"}
                        </button>
                      </div>
                    </div>
                  ))}
                </section>
              );
            })}
          </>
        )}

        {interviews === null && !error && (
          <p className="text-muted-foreground text-center py-8">加载中...</p>
        )}
      </div>
    </main>
  );
}
