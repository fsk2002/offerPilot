import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import {
  getResumeVersions,
  createResumeVersion,
  ResumeError,
} from "@/services/resume.service";
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
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    const created = await createResumeVersion(id, payload.userId);
    return success(created, 201);
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Create resume version error:", e);
    return error("INTERNAL_ERROR", "创建版本失败", 500);
  }
}
