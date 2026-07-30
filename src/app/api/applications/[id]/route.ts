import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { getApplication, ApplicationError } from "@/services/application.service";
import { success, error } from "@/services/api-helper";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    const application = await getApplication(id, payload.userId);
    return success(application);
  } catch (e) {
    if (e instanceof ApplicationError) {
      return error(e.code, e.message, 404);
    }
    console.error("Get application error:", e);
    return error("INTERNAL_ERROR", "获取投递详情失败", 500);
  }
}
