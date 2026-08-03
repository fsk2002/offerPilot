import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { generateResumeSchema } from "@/lib/validation";
import { getProfile } from "@/lib/role-profiles";
import {
  generateResumeDraft,
  buildProfileNarrative,
  AIServiceError,
} from "@/services/ai.service";
import { prisma } from "@/lib/prisma";
import { success, error } from "@/services/api-helper";

/**
 * POST /api/resumes/generate
 * 根据目标岗位画像 + 用户经历要点，AI 生成简历 Markdown 草稿并落库，
 * 返回新简历 id 供前端跳转编辑器继续完善。
 */
export async function POST(request: NextRequest) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const body = await request.json();
    const parsed = generateResumeSchema.safeParse(body);
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.errors[0]?.message || "参数错误");
    }

    const { roleId, notes } = parsed.data;
    const profile = await getProfile(roleId);
    if (!profile) {
      return error("ROLE_NOT_FOUND", "岗位画像不存在", 404);
    }

    const markdown = await generateResumeDraft({
      roleName: profile.name,
      profileNarrative: buildProfileNarrative(profile),
      notes: notes ?? "",
    });

    const resume = await prisma.resume.create({
      data: {
        userId: payload.userId,
        fileName: `${profile.name}-AI草稿.md`,
        version: 1,
        source: "ai_generated",
        content: { markdown },
      },
      select: { id: true, version: true, fileName: true },
    });

    return success(resume, 201);
  } catch (e) {
    if (e instanceof AIServiceError) {
      return error(e.code, e.message, 502);
    }
    console.error("Generate resume error:", e);
    return error("INTERNAL_ERROR", "简历生成失败，请稍后重试", 500);
  }
}
