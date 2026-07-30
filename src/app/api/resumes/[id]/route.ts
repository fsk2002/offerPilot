import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { getResume, deleteResume, ResumeError } from "@/services/resume.service";
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
    const resume = await getResume(id, payload.userId);
    return success(resume);
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, 404);
    }
    console.error("Get resume error:", e);
    return error("INTERNAL_ERROR", "获取简历失败", 500);
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
    await deleteResume(id, payload.userId);
    return success({ id });
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Delete resume error:", e);
    return error("INTERNAL_ERROR", "删除简历失败", 500);
  }
}
