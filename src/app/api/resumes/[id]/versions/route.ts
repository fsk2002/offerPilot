import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import {
  getResumeVersions,
  createResumeVersion,
  ResumeError,
} from "@/services/resume.service";
import { createVersionSchema } from "@/lib/validation";
import { success, error } from "@/services/api-helper";

/**
 * GET /api/resumes/[id]/versions — 某简历的版本链（根 → 最新）
 * POST /api/resumes/[id]/versions — 从当前版本派生新版本（另存为新版本 / 回退）
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    const versions = await getResumeVersions(id, payload.userId);
    return success(versions);
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Get resume versions error:", e);
    return error("INTERNAL_ERROR", "获取版本列表失败", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;

    // 可选 body：编辑器"另存为新版本"时携带当前 markdown
    let markdown: string | undefined;
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      try {
        const body = await request.json();
        const parsed = createVersionSchema.safeParse(body);
        if (!parsed.success) {
          return error(
            "VALIDATION_ERROR",
            parsed.error.errors[0]?.message || "参数错误"
          );
        }
        markdown = parsed.data.markdown;
      } catch {
        // 空 body 视为不带 markdown
      }
    }

    const created = await createResumeVersion(id, payload.userId, markdown);
    return success(created, 201);
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Create resume version error:", e);
    return error("INTERNAL_ERROR", "创建版本失败", 500);
  }
}
