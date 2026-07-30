import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import {
  createAnalysis,
  getUserApplications,
  ApplicationError,
} from "@/services/application.service";
import { ResumeError } from "@/services/resume.service";
import { createAnalysisSchema } from "@/lib/validation";
import { success, error } from "@/services/api-helper";

export async function GET() {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const applications = await getUserApplications(payload.userId);
    return success(applications);
  } catch (e) {
    console.error("Get applications error:", e);
    return error("INTERNAL_ERROR", "获取投递列表失败", 500);
  }
}

export async function POST(request: NextRequest) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const body = await request.json();
    const parsed = createAnalysisSchema.safeParse(body);
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.errors[0]?.message || "参数错误");
    }

    const application = await createAnalysis(payload.userId, parsed.data);
    return success(application, 201);
  } catch (e) {
    if (e instanceof ApplicationError || e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Create analysis error:", e);
    return error("INTERNAL_ERROR", "分析失败，请稍后重试", 500);
  }
}
