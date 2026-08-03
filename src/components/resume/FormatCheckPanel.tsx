"use client";

import { useState } from "react";

interface FormatCheckPanelProps {
  resumeId: string;
  markdown: string;
  onApply: (markdown: string) => void;
  onClose: () => void;
}

interface RuleIssue {
  id: string;
  type: string;
  line: number;
  severity: "high" | "medium" | "low";
  description: string;
  fix?: string;
}

interface AIIssue {
  type: string;
  line: number;
  severity: "high" | "medium" | "low";
  description: string;
}

const SEVERITY_STYLE: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-gray-100 text-gray-600",
};

const SEVERITY_LABEL: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const TYPE_LABEL: Record<string, string> = {
  "date-format": "日期格式",
  punctuation: "标点",
  "blank-lines": "空行",
  "trailing-space": "行尾空格",
  quantified: "量化数据",
  "verb-tense": "动词时态",
  typo: "拼写",
  "section-order": "章节顺序",
  expression: "表达质量",
  structure: "结构清晰",
  highlight: "亮点突出",
  professionalism: "专业度",
};

export default function FormatCheckPanel({
  resumeId,
  markdown,
  onApply,
  onClose,
}: FormatCheckPanelProps) {
  const [checking, setChecking] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [ruleIssues, setRuleIssues] = useState<RuleIssue[] | null>(null);
  const [aiIssues, setAiIssues] = useState<AIIssue[]>([]);
  const [fixedMarkdown, setFixedMarkdown] = useState<string | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const [error, setError] = useState("");

  const runCheck = async () => {
    setChecking(true);
    setError("");
    setFixedMarkdown(null);
    try {
      const res = await fetch(`/api/resumes/${resumeId}/format-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown, withAiReview: true }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "格式检查失败");
        return;
      }
      setRuleIssues(data.data.ruleIssues);
      setAiIssues(data.data.aiIssues);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setChecking(false);
    }
  };

  const runFix = async () => {
    setFixing(true);
    setError("");
    try {
      const res = await fetch(`/api/resumes/${resumeId}/format-fix`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markdown }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "自动修复失败");
        return;
      }
      setFixedMarkdown(data.data.fixedMarkdown);
      setAppliedCount(data.data.applied.length);
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setFixing(false);
    }
  };

  const fixableCount =
    ruleIssues?.filter((i) => i.fix).length ?? 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
      <div className="mx-auto my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
        {/* 头部 */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">格式校对</h2>
            <p className="text-sm text-gray-500">
              检查日期、标点、拼写、量化数据等格式问题。
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
          >
            关闭
          </button>
        </div>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* 开始检查 */}
        {ruleIssues === null && (
          <button
            onClick={runCheck}
            disabled={checking}
            className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {checking ? "检查中..." : "开始校对"}
          </button>
        )}

        {/* 检查结果 */}
        {ruleIssues !== null && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="rounded-full bg-gray-100 px-3 py-1">
                规则问题 {ruleIssues.length} 个
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1">
                AI 质评 {aiIssues.length} 个
              </span>
              {fixableCount > 0 && (
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                  可自动修复 {fixableCount} 个
                </span>
              )}
            </div>

            {/* 规则问题 */}
            {ruleIssues.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">规则检查</p>
                {ruleIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="flex items-start gap-3 rounded-lg border border-gray-200 p-3"
                  >
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[issue.severity]}`}
                    >
                      {SEVERITY_LABEL[issue.severity]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium text-gray-500">
                          {TYPE_LABEL[issue.type] ?? issue.type}
                          {issue.line > 0 && ` · L${issue.line}`}：
                        </span>
                        {issue.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI 质评 */}
            {aiIssues.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">AI 表达质量审查</p>
                {aiIssues.map((issue, idx) => (
                  <div
                    key={`ai-${idx}`}
                    className="flex items-start gap-3 rounded-lg border border-violet-100 bg-violet-50/40 p-3"
                  >
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLE[issue.severity]}`}
                    >
                      {SEVERITY_LABEL[issue.severity]}
                    </span>
                    <p className="min-w-0 flex-1 text-sm">
                      <span className="font-medium text-violet-600">
                        {TYPE_LABEL[issue.type] ?? issue.type}
                        {issue.line > 0 && ` · L${issue.line}`}：
                      </span>
                      {issue.description}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {ruleIssues.length === 0 && aiIssues.length === 0 && (
              <p className="rounded-lg bg-green-50 p-4 text-center text-sm text-green-700">
                未发现明显格式问题，简历看起来很整洁。
              </p>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-3">
              {fixableCount > 0 && !fixedMarkdown && (
                <button
                  onClick={runFix}
                  disabled={fixing}
                  className="flex-1 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {fixing ? "修复中..." : `一键修复 ${fixableCount} 处`}
                </button>
              )}
              {fixedMarkdown && (
                <div className="w-full space-y-3">
                  <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                    已自动修复 {appliedCount} 处，应用后可在编辑器中继续调整。
                  </p>
                  <button
                    onClick={() => {
                      onApply(fixedMarkdown);
                      onClose();
                    }}
                    className="w-full rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
                  >
                    应用到编辑器
                  </button>
                </div>
              )}
              <button
                onClick={runCheck}
                disabled={checking}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50"
              >
                重新检查
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
