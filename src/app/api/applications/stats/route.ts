import { getAuthToken, verifyToken } from "@/lib/auth";
import { getUserStats } from "@/services/application.service";
import { success, error } from "@/services/api-helper";

export async function GET() {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const stats = await getUserStats(payload.userId);
    return success(stats);
  } catch (e) {
    console.error("Get stats error:", e);
    return error("INTERNAL_ERROR", "获取统计数据失败", 500);
  }
}
