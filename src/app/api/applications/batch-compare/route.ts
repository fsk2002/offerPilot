import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { batchCompareSchema } from "@/lib/validation";
import { getResume, ResumeError } from "@/services/resume.service";
import { quantitativeMatch, type QuantMatchResult } from "@/lib/matching";
import { success, error } from "@/services/api-helper";

/**
 * POST /api/applications/batch-compare
 * 同一份简历对多个 JD 做纯量化横向排名（毫秒级，不触发 LLM），
 * 用于快速筛选投递目标；选中某个 JD 后再进入完整分析。
 */
export async function POST(request: NextRequest) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const body = await request.json();
    const parsed = batchCompareSchema.safeParse(body);
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.errors[0]?.message || "参数错误");
    }

    const { resumeId, jds } = parsed.data;
    const resume = await getResume(resumeId, payload.userId);
    const rawText = (resume.rawParsed as { rawText?: string } | null)?.rawText;
    if (!rawText) {
      return error(
        "NO_RESUME_TEXT",
        "该简历尚未解析出文本内容，请重新上传或先在编辑器中生成结构化内容"
      );
    }

    const results = jds
      .map((jd, index) => {
        const quant: QuantMatchResult = quantitativeMatch(rawText, jd.text);
        return {
          index,
          title: jd.title?.trim() || `JD ${index + 1}`,
          score: quant.score,
          matched: quant.matched,
          missing: quant.missing,
          degraded: quant.degraded,
        };
      })
      .sort((a, b) => b.score - a.score);

    return success({ resumeId, total: results.length, results });
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message, e.code === "NOT_FOUND" ? 404 : 400);
    }
    console.error("Batch compare error:", e);
    return error("INTERNAL_ERROR", "批量对比失败，请稍后重试", 500);
  }
}
