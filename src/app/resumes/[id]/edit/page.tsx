"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";
import AIEditPanel from "@/components/resume/AIEditPanel";
import FormatCheckPanel from "@/components/resume/FormatCheckPanel";

// md-editor 依赖 window，禁用 SSR
const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });
// 完整预览组件（md-editor 的 .Markdown 静态属性）——PDF 导出时离屏渲染整份简历
const MDPreview = dynamic(
  () => import("@uiw/react-md-editor").then((mod) => mod.default.Markdown),
  { ssr: false }
);

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
  const [exporting, setExporting] = useState(false);
  const [showAIEdit, setShowAIEdit] = useState(false);
  const [showFormatCheck, setShowFormatCheck] = useState(false);

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

  // PDF 导出：对离屏渲染的完整预览 DOM 用 html2canvas 截图 → jsPDF 按 A4 分页。
  // 走位图路线（非 jsPDF.text），天然规避中文字体嵌入乱码问题。
  const handleExport = async () => {
    if (!meta || !previewRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });

      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;

      let heightLeft = imgH;
      let position = 0;
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pageW, imgH);
        heightLeft -= pageH;
      }

      const base = meta.fileName.replace(/\.pdf$/i, "") || "简历";
      pdf.save(`${base}.pdf`);
    } catch (e) {
      console.error("PDF export failed:", e);
      alert("导出 PDF 失败，请稍后重试");
    } finally {
      setExporting(false);
    }
  };

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
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 text-sm rounded-lg font-medium border border-border hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? "导出中..." : "导出 PDF"}
            </button>
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
            {/* PDF 导出用的离屏完整预览容器：绝对定位移出视口（非 display:none，
                否则 html2canvas 截不到），固定 A4 内容宽度、白底、light 模式。 */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: "-9999px",
                top: 0,
                width: "794px",
              }}
            >
              <div
                ref={previewRef}
                data-color-mode="light"
                style={{ background: "#ffffff", padding: "40px" }}
              >
                <MDPreview source={value} />
              </div>
            </div>
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

            {/* Phase 7: AI 智能修改 + 格式校对 */}
            <div className="p-4 border border-border rounded-lg space-y-2">
              <h2 className="font-medium text-sm">AI 优化</h2>
              <button
                type="button"
                onClick={() => setShowAIEdit(true)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                AI 智能修改
              </button>
              <p className="text-xs text-muted-foreground">
                按目标岗位重新组织简历叙事，逐条确认修改。
              </p>
              <button
                type="button"
                onClick={() => setShowFormatCheck(true)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg hover:bg-secondary transition-colors"
              >
                格式校对
              </button>
              <p className="text-xs text-muted-foreground">
                检查日期、标点、拼写、量化数据等格式问题。
              </p>
            </div>
          </aside>
        </div>
      </div>

      {showAIEdit && meta && (
        <AIEditPanel
          resumeId={meta.id}
          markdown={value}
          onApply={(m) => {
            setValue(m);
            setDirty(true);
            setSaveHint("AI 修改已应用，记得保存");
          }}
          onClose={() => setShowAIEdit(false)}
        />
      )}

      {showFormatCheck && meta && (
        <FormatCheckPanel
          resumeId={meta.id}
          markdown={value}
          onApply={(m) => {
            setValue(m);
            setDirty(true);
            setSaveHint("格式修复已应用，记得保存");
          }}
          onClose={() => setShowFormatCheck(false)}
        />
      )}
    </main>
  );
}
