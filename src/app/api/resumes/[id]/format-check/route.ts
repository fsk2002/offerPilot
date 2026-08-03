import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { formatCheckSchema } from "@/lib/validation";
import { getResume, ResumeError } from "@/services/resume.service";
import { checkFormat, type FormatIssue } from "@/services/format-check.service";
import { aiFormatReview, type AIFormatReviewIssue } from "@/services/ai.service";
import { success, error } from "@/services/api-helper";

/**
 * POST /api/resumes/[id]/format-check
 * 规则引擎检查（始终返回）+ 可选 AI 表达质量审查（body.withAiReview=true 时）。
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

    const { markdown, withAiReview } = parsed.data as typeof parsed.data & { withAiReview?: boolean };

    const ruleIssues: FormatIssue[] = checkFormat(markdown);
    const aiIssues: AIFormatReviewIssue[] = withAiReview
      ? await aiFormatReview(markdown)
      : [];

    return success({ ruleIssues, aiIssues });
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, 404);
    }
    console.error("Format check error:", e);
    return error("INTERNAL_ERROR", "格式检查失败，请稍后重试", 500);
  }
}
