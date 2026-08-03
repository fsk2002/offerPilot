import { getAuthToken, verifyToken } from "@/lib/auth";
import { NextRequest } from "next/server";
import {
  getCurrentUser,
  updateProfile,
  AuthError,
} from "@/services/auth.service";
import { updateProfileSchema } from "@/lib/validation";
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

export async function PATCH(request: NextRequest) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return error("UNAUTHORIZED", "未登录", 401);
    }

    const payload = verifyToken(token);
    if (!payload) {
      return error("UNAUTHORIZED", "Token 无效或已过期", 401);
    }

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return error(
        "VALIDATION_ERROR",
        parsed.error.errors[0]?.message || "参数错误"
      );
    }

    const user = await updateProfile(payload.userId, parsed.data.name);
    return success(user);
  } catch (e) {
    if (e instanceof AuthError) {
      return error(e.code, e.message, 404);
    }
    console.error("Update profile error:", e);
    return error("INTERNAL_ERROR", "更新个人资料失败", 500);
  }
}
