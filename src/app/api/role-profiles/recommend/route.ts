import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { getRoleTree, getProfiles } from "@/lib/role-profiles";
import { getResume, ResumeError } from "@/services/resume.service";
import { recommendProfiles } from "@/lib/matching";
import { success, error } from "@/services/api-helper";

/**
 * POST /api/role-profiles/recommend
 * 基于简历文本对全部岗位画像做技能加权命中打分，返回 Top 6 推荐岗位。
 * 纯量化、秒级返回，不调用 LLM。
 */
export async function POST(request: NextRequest) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const body = await request.json();
    const resumeId = (body?.resumeId ?? "") as string;
    if (!resumeId) {
      return error("VALIDATION_ERROR", "请选择简历");
    }

    const resume = await getResume(resumeId, payload.userId);
    const rawText = (resume.rawParsed as { rawText?: string } | null)?.rawText;
    if (!rawText) {
      return error(
        "NO_RESUME_TEXT",
        "该简历尚未解析出文本内容，请重新上传或先在编辑器中生成结构化内容"
      );
    }

    const tree = await getRoleTree();
    const allIds = tree.categories.flatMap((c) =>
      c.families.flatMap((f) => f.roles.map((r) => r.id))
    );
    const profiles = await getProfiles(allIds);
    const recommended = recommendProfiles(rawText, profiles).slice(0, 6);

    return success({ resumeId, total: profiles.length, recommended });
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Recommend roles error:", e);
    return error("INTERNAL_ERROR", "岗位推荐失败，请稍后重试", 500);
  }
}
