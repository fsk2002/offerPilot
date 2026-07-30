import { z } from "zod";

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
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;

export const jdFetchSchema = z.object({
  url: z.string().url("请输入有效的链接"),
});
