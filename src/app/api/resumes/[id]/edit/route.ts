import { getAuthToken, verifyToken } from "@/lib/auth";
import { getResumeForEdit, ResumeError } from "@/services/resume.service";
import { success, error } from "@/services/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    const data = await getResumeForEdit(id, payload.userId);
    return success(data);
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, 404);
    }
    console.error("Get resume for edit error:", e);
    return error("INTERNAL_ERROR", "获取简历失败", 500);
  }
}
