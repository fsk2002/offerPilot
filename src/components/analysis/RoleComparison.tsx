"use client";

import type { RoleScore } from "@/types/application";

interface RoleComparisonProps {
  roles: RoleScore[];
}

function barColor(score: number): string {
  if (score >= 75) return "bg-green-500";
  if (score >= 50) return "bg-blue-500";
  if (score >= 25) return "bg-amber-500";
  return "bg-red-400";
}

export default function RoleComparison({ roles }: RoleComparisonProps) {
  if (roles.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-lg">异岗评分对比</h2>
      <p className="text-xs text-muted-foreground">
        同一份简历对各目标岗位的技术匹配度（量化分）。第一个岗位含 AI 深度分析。
      </p>
      <div className="space-y-3">
        {roles.map((role, i) => (
          <div key={role.roleId} className="p-3 border border-border rounded-lg space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                {role.roleName}
                {i === 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                    含 AI 深度分析
                  </span>
                )}
              </span>
              <span className="text-muted-foreground">{role.quantScore}</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor(role.quantScore)} transition-all`}
                style={{ width: `${role.quantScore}%` }}
              />
            </div>
            {role.matched.length > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="text-green-600">命中：</span>
                {role.matched.join("、")}
              </p>
            )}
            {role.missing.length > 0 && (
              <p className="text-xs text-muted-foreground">
                <span className="text-red-500">缺失：</span>
                {role.missing.join("、")}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
