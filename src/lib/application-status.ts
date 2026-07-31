// 投递状态：5 态标准流程
//   pending 待投递 → applied 已投递 → interviewing 面试中 → { offer 已 Offer | rejected 未通过 }
// 存英文码，前后端共用标签与颜色，避免魔法字符串散落。

export const APPLICATION_STATUSES = [
  "pending",
  "applied",
  "interviewing",
  "offer",
  "rejected",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "待投递",
  applied: "已投递",
  interviewing: "面试中",
  offer: "已 Offer",
  rejected: "未通过",
};

// 图表与徽章共用的十六进制色值（recharts 不吃 tailwind class，故用 hex）
export const STATUS_COLORS: Record<ApplicationStatus, string> = {
  pending: "#94a3b8",
  applied: "#3b82f6",
  interviewing: "#f59e0b",
  offer: "#22c55e",
  rejected: "#ef4444",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status as ApplicationStatus] ?? status;
}

export function statusColor(status: string): string {
  return STATUS_COLORS[status as ApplicationStatus] ?? "#94a3b8";
}
