import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import {
  getApplication,
  updateApplication,
  deleteApplication,
  ApplicationError,
} from "@/services/application.service";
import { updateApplicationSchema } from "@/lib/validation";
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const body = await request.json();
    const parsed = updateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.errors[0]?.message || "参数错误");
    }

    const { id } = await params;
    const application = await updateApplication(id, payload.userId, parsed.data);
    return success(application);
  } catch (e) {
    if (e instanceof ApplicationError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Update application error:", e);
    return error("INTERNAL_ERROR", "更新投递失败", 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    await deleteApplication(id, payload.userId);
    return success({ id });
  } catch (e) {
    if (e instanceof ApplicationError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Delete application error:", e);
    return error("INTERNAL_ERROR", "删除投递失败", 500);
  }
}
