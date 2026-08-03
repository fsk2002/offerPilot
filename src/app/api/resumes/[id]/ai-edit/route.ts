import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { aiEditSchema } from "@/lib/validation";
import { getResume, ResumeError } from "@/services/resume.service";
import { aiEditResume, AIServiceError } from "@/services/ai.service";
import { computeDiff, type DiffChange } from "@/lib/diff";
import { success, error } from "@/services/api-helper";

/**
 * POST /api/resumes/[id]/ai-edit
 * 按目标岗位（+可选 JD）调用 LLM 改写简历，返回行级 diff 供前端逐条确认。
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

    // 校验简历归属：用户必须拥有该简历
    await getResume(id, payload.userId);

    const body = await request.json();
    const parsed = aiEditSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "参数错误";
      return error("VALIDATION_ERROR", msg);
    }

    const { markdown, targetRoleIds, jdText } = parsed.data;

    // LLM 改写
    const result = await aiEditResume({
      resumeText: markdown,
      targetRoleIds,
      jdText,
    });

    // 服务端计算 diff（LLM 只给完整文本，diff 由我们算，保证位置可靠）
    const changes: DiffChange[] = computeDiff(markdown, result.modifiedMarkdown);

    // 尽量把 LLM 的 editNotes 按顺序贴到 change 上
    const changesWithNotes = changes.map((c, i) => ({
      ...c,
      note: result.editNotes[i] ?? undefined,
    }));

    return success({
      originalMarkdown: markdown,
      modifiedMarkdown: result.modifiedMarkdown,
      summary: result.summary,
      changes: changesWithNotes,
    });
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, 404);
    }
    if (e instanceof AIServiceError) {
      return error(e.code, e.message, 502);
    }
    console.error("AI edit error:", e);
    return error("INTERNAL_ERROR", "AI 修改失败，请稍后重试", 500);
  }
}
