import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { formatCheckSchema } from "@/lib/validation";
import { getResume, ResumeError } from "@/services/resume.service";
import { checkFormat, applyFixes } from "@/services/format-check.service";
import { success, error } from "@/services/api-helper";

/**
 * POST /api/resumes/[id]/format-fix
 * 对可安全自动修复的问题（日期格式/标点/空行/行尾空格/拼写）一键修复，
 * 返回修复后的完整 Markdown + 已应用的问题列表。前端展示预览，不直接落库。
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    await getResume(id, payload.userId);

    const body = await request.json();
    const parsed = formatCheckSchema.safeParse(body);
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.errors[0]?.message || "参数错误");
    }

    const issues = checkFormat(parsed.data.markdown);
    const { fixedMarkdown, applied } = applyFixes(parsed.data.markdown, issues);

    return success({ fixedMarkdown, applied });
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, 404);
    }
    console.error("Format fix error:", e);
    return error("INTERNAL_ERROR", "格式修复失败，请稍后重试", 500);
  }
}
