import { getAuthToken, verifyToken } from "@/lib/auth";
import { structureResumeToMarkdown, ResumeError } from "@/services/resume.service";
import { success, error } from "@/services/api-helper";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const { id } = await params;
    const markdown = await structureResumeToMarkdown(id, payload.userId);
    return success({ markdown });
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Structure resume error:", e);
    return error("INTERNAL_ERROR", "AI 结构化失败", 500);
  }
}
