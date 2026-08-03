import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import {
  getInterviews,
  generateAndSaveInterviews,
  InterviewError,
} from "@/services/interview.service";
import { AIServiceError } from "@/services/ai.service";
import { success, error } from "@/services/api-helper";

/**
 * GET  /api/applications/[id]/interviews — 列出投递的面试题
 * POST /api/applications/[id]/interviews — 生成（重新生成）面试题并落库
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    const interviews = await getInterviews(id, payload.userId);
    return success(interviews);
  } catch (e) {
    if (e instanceof InterviewError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Get interviews error:", e);
    return error("INTERNAL_ERROR", "获取面试题失败", 500);
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    const interviews = await generateAndSaveInterviews(id, payload.userId);
    return success(interviews, 201);
  } catch (e) {
    if (e instanceof InterviewError) {
      const status =
        e.code === "NOT_FOUND" ? 404 : e.code === "NO_RESUME_TEXT" ? 400 : 502;
      return error(e.code, e.message, status);
    }
    if (e instanceof AIServiceError) {
      return error(e.code, e.message, 502);
    }
    console.error("Generate interviews error:", e);
    return error("INTERNAL_ERROR", "生成面试题失败", 500);
  }
}
