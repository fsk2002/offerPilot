"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Resume {
  id: string;
  fileName: string;
  version: number;
}

export default function NewAnalysisPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [resumeId, setResumeId] = useState("");
  const [jdText, setJdText] = useState("");
  const [targetRoles, setTargetRoles] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [jdUrl, setJdUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchHint, setFetchHint] = useState("");

  const handleFetchUrl = async () => {
    if (!jdUrl.trim()) return;
    setFetchHint("");
    setFetching(true);
    try {
      const res = await fetch("/api/jd-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jdUrl.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        setFetchHint(data.error?.message || "抓取失败，请手动粘贴 JD");
        return;
      }
      setJdText(data.data.text);
      setFetchHint("已抓取，可在下方编辑后提交");
    } catch {
      setFetchHint("抓取失败，请手动粘贴 JD");
    } finally {
      setFetching(false);
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId,
          jdText,
          targetRoles: targetRoles
            .split(/[,，、]/)
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setErrorMsg(data.error?.message || "分析失败");
        return;
      }
      router.push(`/applications/${data.data.id}`);
    } catch {
      setErrorMsg("网络错误，请稍后重试");
    } finally {
      setSubmitting(false);
    }
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
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">新建分析</h1>
          <p className="text-muted-foreground">选择简历、粘贴 JD，AI 分析匹配度</p>
        </div>

        {resumes.length === 0 ? (
          <div className="p-6 border border-border rounded-xl text-center space-y-2">
            <p className="text-muted-foreground">你还没有上传过简历</p>
            <a href="/resumes" className="text-blue-500 hover:underline">
              先去上传简历 →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-sm bg-red-50 text-red-600 rounded-lg border border-red-200">
                {errorMsg}
              </div>
            )}

            <div>
              <label htmlFor="resume" className="block text-sm font-medium mb-1">
                选择简历
              </label>
              <select
                id="resume"
                value={resumeId}
                onChange={(e) => setResumeId(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fileName} (v{r.version})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="roles" className="block text-sm font-medium mb-1">
                目标岗位方向（可选，逗号分隔）
              </label>
              <input
                id="roles"
                type="text"
                value={targetRoles}
                onChange={(e) => setTargetRoles(e.target.value)}
                placeholder="前端开发工程师, 全栈工程师"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>

            <div>
              <label htmlFor="jdUrl" className="block text-sm font-medium mb-1">
                从链接抓取 JD（可选）
              </label>
              <div className="flex gap-2">
                <input
                  id="jdUrl"
                  type="url"
                  value={jdUrl}
                  onChange={(e) => setJdUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                />
                <button
                  type="button"
                  onClick={handleFetchUrl}
                  disabled={fetching || !jdUrl.trim()}
                  className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {fetching ? "抓取中..." : "抓取"}
                </button>
              </div>
              {fetchHint && (
                <p className="text-xs text-muted-foreground mt-1">{fetchHint}</p>
              )}
            </div>

            <div>
              <label htmlFor="jd" className="block text-sm font-medium mb-1">
                职位描述（JD）
              </label>
              <textarea
                id="jd"
                required
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={10}
                placeholder="粘贴完整的职位描述..."
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "分析中，请稍候..." : "开始分析"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
