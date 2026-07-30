import { getAuthToken, verifyToken } from "@/lib/auth";
import { getRoleTree } from "@/lib/role-profiles";
import { success, error } from "@/services/api-helper";

export async function GET() {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const tree = await getRoleTree();
    return success(tree);
  } catch (e) {
    console.error("Get role profiles error:", e);
    return error("INTERNAL_ERROR", "获取岗位画像失败", 500);
  }
}
