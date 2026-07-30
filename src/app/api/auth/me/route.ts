import { getAuthToken, verifyToken } from "@/lib/auth";
import { getCurrentUser, AuthError } from "@/services/auth.service";
import { success, error } from "@/services/api-helper";

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return error("UNAUTHORIZED", "未登录", 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return error("UNAUTHORIZED", "Token 无效或已过期", 401);
    }

    const user = await getCurrentUser(payload);
    return success(user);
  } catch (e) {
    if (e instanceof AuthError) {
      return error(e.code, e.message, 404);
    }
    console.error("Me error:", e);
    return error("INTERNAL_ERROR", "获取用户信息失败", 500);
  }
}
