import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { updateInterviewAnswerSchema } from "@/lib/validation";
import {
  updateInterviewAnswer,
  InterviewError,
} from "@/services/interview.service";
import { success, error } from "@/services/api-helper";

/**
 * PATCH /api/interviews/[id] — 保存面试题回答
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const body = await request.json();
    const parsed = updateInterviewAnswerSchema.safeParse(body);
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.errors[0]?.message || "参数错误");
    }

    const { id } = await params;
    const interview = await updateInterviewAnswer(
      id,
      payload.userId,
      parsed.data.answer
    );
    return success(interview);
  } catch (e) {
    if (e instanceof InterviewError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Update interview answer error:", e);
    return error("INTERNAL_ERROR", "保存回答失败", 500);
  }
}
