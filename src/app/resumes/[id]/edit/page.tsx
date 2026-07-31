"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";

// md-editor 依赖 window，禁用 SSR
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface EditData {
  id: string;
  fileName: string;
  version: number;
  initialMarkdown: string;
  hasRawText: boolean;
}

export default function ResumeEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [meta, setMeta] = useState<EditData | null>(null);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState("");
  const [structuring, setStructuring] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/resumes/${params.id}/edit`);
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          if (res.status === 401) router.push("/auth/login");
          else setNotFound(true);
          return;
        }
        setMeta(data.data);
        setValue(data.data.initialMarkdown);
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

  // 未保存离开提醒（关闭/刷新标签页）
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const onChange = useCallback((v?: string) => {
    setValue(v ?? "");
    setDirty(true);
    setSaveHint("");
  }, []);

  const handleSave = async () => {
    if (!meta) return;
    setSaving(true);
    setSaveHint("");
    try {
      const res = await fetch(`/api/resumes/${meta.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown: value }),
      });
      const data = await res.json();
      if (data.success) {
        setDirty(false);
        setSaveHint("已保存");
      } else {
        setSaveHint(data.error?.message || "保存失败");
      }
    } catch {
      setSaveHint("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleStructure = async () => {
    if (!meta) return;
    if (
      value.trim() &&
      !confirm("AI 结构化会用整理后的内容替换当前编辑区，是否继续？")
    ) {
      return;
    }
    setStructuring(true);
    try {
      const res = await fetch(`/api/resumes/${meta.id}/structure`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setValue(data.data.markdown);
        setDirty(true);
        setSaveHint("已生成结构化初稿，记得保存");
      } else {
        alert(data.error?.message || "AI 结构化失败");
      }
    } catch {
      alert("AI 结构化失败，请稍后重试");
    } finally {
      setStructuring(false);
    }
  };

  const previewRef = useRef<HTMLDivElement>(null);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  if (notFound || !meta) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-muted-foreground">简历不存在</p>
        <Link href="/resumes" className="text-blue-500 hover:underline">
          返回简历管理
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/resumes" className="text-sm text-blue-500 hover:underline">
              ← 返回
            </Link>
            <div>
              <h1 className="font-semibold">{meta.fileName}</h1>
              <p className="text-xs text-muted-foreground">
                v{meta.version}
                {dirty && <span className="text-amber-500"> · 未保存</span>}
                {saveHint && <span className="text-green-600"> · {saveHint}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !dirty}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                dirty
                  ? "bg-blue-500 text-white hover:bg-blue-600"
                  : "border border-border"
              }`}
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          {/* 编辑器（左写右看） */}
          <div className="flex-1 min-w-0" data-color-mode="light">
            <MDEditor
              value={value}
              onChange={onChange}
              height={640}
              preview="live"
              textareaProps={{ placeholder: "在此编辑简历 Markdown..." }}
            />
            {/* 供 PDF 导出用的隐藏预览容器（任务 E 使用），此处先占位 ref */}
            <div ref={previewRef} className="hidden" />
          </div>

          {/* 侧栏 */}
          <aside className="w-64 shrink-0 space-y-3">
            <div className="p-4 border border-border rounded-lg space-y-3">
              <h2 className="font-medium text-sm">工具</h2>
              <button
                type="button"
                onClick={handleStructure}
                disabled={structuring || !meta.hasRawText}
                title={meta.hasRawText ? "" : "该简历没有可结构化的文本"}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {structuring ? "AI 整理中..." : "AI 结构化初稿"}
              </button>
              <p className="text-xs text-muted-foreground">
                用 AI 把原始简历文本整理成规整 Markdown。
              </p>
            </div>

            {/* Phase 7 预留占位 */}
            <div className="p-4 border border-dashed border-border rounded-lg space-y-2 opacity-60">
              <h2 className="font-medium text-sm">AI 优化（即将上线）</h2>
              {["AI 智能修改", "格式校对", "岗位重评分"].map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg cursor-not-allowed"
                >
                  {t}
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
