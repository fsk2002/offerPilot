import { z } from "zod";
import { APPLICATION_STATUSES } from "@/lib/application-status";

// bcrypt 只处理前 72 字节，超出部分被静默截断，因此在校验层封顶
const password = z
  .string()
  .min(6, "密码至少 6 位")
  .refine((v) => new TextEncoder().encode(v).length <= 72, "密码过长（最多 72 字节）");

export const loginSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

export const registerSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  name: z.string().min(1, "请输入昵称").max(50),
  password,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const createAnalysisSchema = z.object({
  resumeId: z.string().min(1, "请选择简历"),
  jdText: z.string().min(20, "JD 内容太短，请粘贴完整的职位描述"),
  // 目标岗位画像 ID 数组，最多 3 个（PRD §6.1）
  targetRoles: z.array(z.string()).max(3, "最多选择 3 个目标岗位").optional(),
  company: z.string().trim().max(100, "公司名过长").optional(),
  position: z.string().trim().max(100, "岗位名过长").optional(),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

// 更新投递：状态流转 + 公司/岗位编辑，至少改一个字段
export const updateApplicationSchema = z
  .object({
    status: z.enum(APPLICATION_STATUSES).optional(),
    company: z.string().trim().max(100, "公司名过长").optional(),
    position: z.string().trim().max(100, "岗位名过长").optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: "没有可更新的字段",
  });

export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;

export const jdFetchSchema = z.object({
  url: z.string().url("请输入有效的链接"),
});

// 保存简历 Markdown 内容（编辑器手动保存）。封顶防超大 body。
export const updateResumeContentSchema = z.object({
  markdown: z.string().max(50000, "内容过长（最多 50000 字符）"),
});

export type UpdateResumeContentInput = z.infer<typeof updateResumeContentSchema>;

// Phase 7: AI 智能修改请求
export const aiEditSchema = z.object({
  markdown: z.string().min(1, "简历内容为空").max(50000, "内容过长（最多 50000 字符）"),
  targetRoleIds: z
    .array(z.string().min(1))
    .min(1, "请至少选择一个目标岗位")
    .max(3, "最多选择 3 个目标岗位"),
  jdText: z.string().max(20000, "JD 内容过长").optional(),
});

export type AIEditInput = z.infer<typeof aiEditSchema>;

// Phase 7: 格式校对请求
export const formatCheckSchema = z.object({
  markdown: z.string().min(1, "简历内容为空").max(50000, "内容过长（最多 50000 字符）"),
  withAiReview: z.boolean().optional(),
});

export type FormatCheckInput = z.infer<typeof formatCheckSchema>;

// Phase 8: 另存为新版本（可选携带当前编辑区内容）
export const createVersionSchema = z.object({
  markdown: z.string().max(50000, "内容过长（最多 50000 字符）").optional(),
});

export type CreateVersionInput = z.infer<typeof createVersionSchema>;
