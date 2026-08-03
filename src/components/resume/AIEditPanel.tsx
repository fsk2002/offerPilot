"use client";

import { useEffect, useState } from "react";
import type { RoleTree } from "@/types/role-profile";
import type { DiffChange } from "@/lib/diff";
import { applyAcceptedChanges } from "@/lib/diff";

interface AIEditPanelProps {
  resumeId: string;
  markdown: string;
  onApply: (markdown: string) => void;
  onClose: () => void;
}

type EditChange = DiffChange & { note?: string };

interface AIEditResponse {
  originalMarkdown: string;
  modifiedMarkdown: string;
  summary: string;
  changes: EditChange[];
}

const TYPE_LABEL: Record<EditChange["type"], string> = {
  replace: "修改",
  insert: "新增",
  delete: "删除",
};

export default function AIEditPanel({
  resumeId,
  markdown,
  onApply,
  onClose,
}: AIEditPanelProps) {
  const [roleTree, setRoleTree] = useState<RoleTree | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [jdText, setJdText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIEditResponse | null>(null);
  const [accepted, setAccepted] = useState<boolean[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/role-profiles")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRoleTree(data.data);
      })
      .catch(() => {});
  }, []);

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) =>
      prev.includes(id)
        ? prev.filter((r) => r !== id)
        : prev.length >= 3
          ? prev
          : [...prev, id]
    );
  };

  const runAIEdit = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown,
          targetRoleIds: selectedRoles,
          jdText: jdText.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "AI 修改失败");
        return;
      }
      setResult(data.data);
      setAccepted(data.data.changes.map(() => true));
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  const toggleAccept = (idx: number) => {
    setAccepted((prev) => prev.map((v, i) => (i === idx ? !v : v)));
  };

  const applyResult = () => {
    if (!result) return;
    const finalMarkdown = applyAcceptedChanges(
      result.originalMarkdown,
      result.changes,
      accepted
    );
    onApply(finalMarkdown);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-8 w-full max-w-3xl rounded-xl bg-white p-6 shadow-xl">
        {/* 头部 */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">AI 智能修改</h2>
            <p className="text-sm text-gray-500">
              按目标岗位画像重新组织简历叙事，修改可逐条确认。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            关闭
          </button>
        </div>

        {!result && (
          <div className="space-y-4">
            {/* 岗位选择 */}
            <div>
              <p className="mb-2 text-sm font-medium">
                目标岗位（最多 3 个）
              </p>
              {!roleTree ? (
                <p className="text-sm text-gray-400">加载岗位画像...</p>
              ) : (
                <div className="max-h-56 space-y-3 overflow-y-auto rounded-lg border border-gray-200 p-3">
                  {roleTree.categories.map((cat) => (
                    <div key={cat.name}>
                      <p className="mb-1 text-xs font-semibold text-gray-400">
                        {cat.name}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {cat.families.flatMap((f) =>
                          f.roles.map((role) => (
                            <label
                              key={role.id}
                              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                selectedRoles.includes(role.id)
                                  ? "border-blue-400 bg-blue-50 text-blue-700"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selectedRoles.includes(role.id)}
                                onChange={() => toggleRole(role.id)}
                                className="h-4 w-4"
                              />
                              {role.name}
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 可选 JD */}
            <div>
              <p className="mb-2 text-sm font-medium">
                目标 JD（可选，提供后改写更精准）
              </p>
              <textarea
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={4}
                placeholder="粘贴职位描述..."
                className="w-full rounded-lg border border-gray-200 p-3 text-sm"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={runAIEdit}
              disabled={loading || selectedRoles.length === 0}
              className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "AI 生成中，通常需要 10-30 秒..." : "生成修改建议"}
            </button>
          </div>
        )}

        {/* 结果：diff 确认 */}
        {result && (
          <div className="space-y-4">
            <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
              {result.summary || "AI 已生成修改建议。"}
            </p>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                共 {result.changes.length} 处修改，已选{" "}
                {accepted.filter(Boolean).length} 处
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setAccepted(result.changes.map(() => true))}
                  className="rounded-lg border border-blue-200 px-3 py-1 text-xs text-blue-600 hover:bg-blue-50"
                >
                  全部接受
                </button>
                <button
                  onClick={() => setAccepted(result.changes.map(() => false))}
                  className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  全部驳回
                </button>
              </div>
            </div>

            <div className="max-h-80 space-y-3 overflow-y-auto">
              {result.changes.map((change, idx) => (
                <div
                  key={change.id}
                  className={`rounded-lg border p-3 ${
                    accepted[idx]
                      ? "border-blue-200 bg-blue-50/40"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs font-medium">
                        {TYPE_LABEL[change.type]}
                      </span>
                      {change.note && (
                        <span className="text-xs text-gray-500">{change.note}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAccept(idx)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                          accepted[idx]
                            ? "bg-blue-500 text-white"
                            : "border border-gray-300 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        接受
                      </button>
                      <button
                        onClick={() => toggleAccept(idx)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                          !accepted[idx]
                            ? "bg-gray-500 text-white"
                            : "border border-gray-300 text-gray-500 hover:bg-gray-100"
                        }`}
                      >
                        驳回
                      </button>
                    </div>
                  </div>
                  {change.oldText && (
                    <div className="mb-2 rounded bg-red-50 p-2 text-sm text-red-700 line-through decoration-red-300">
                      {change.oldText}
                    </div>
                  )}
                  {change.newText && (
                    <div className="rounded bg-green-50 p-2 text-sm text-green-700">
                      {change.newText}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={applyResult}
                disabled={accepted.every((v) => !v)}
                className="flex-1 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                应用所选修改
              </button>
              <button
                onClick={() => setResult(null)}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                返回重试
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
