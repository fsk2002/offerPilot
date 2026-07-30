import { clearAuthCookie } from "@/lib/auth";
import { success } from "@/services/api-helper";

export async function POST() {
  await clearAuthCookie();
  return success({ message: "已退出登录" });
}
