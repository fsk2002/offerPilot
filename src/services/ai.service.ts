import OpenAI from "openai";
import { z } from "zod";
import { loadPrompt } from "@/lib/prompts";
import type { QuantMatchResult } from "@/lib/matching";
import type { MatchReport } from "@/types/application";

const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

// LLM 输出是外部数据，落库前用 schema 校验，防止 overall 缺失/越界导致 matchScore 变 NaN
const reportSchema = z.object({
  overall: z.number().min(0).max(100),
  dimensions: z.array(
    z.object({
      name: z.string(),
      score: z.number().min(0).max(100),
      details: z.string(),
    })
  ),
  gaps: z.array(
    z.object({
      type: z.enum(["skill", "experience"]),
      description: z.string(),
      severity: z.enum(["high", "medium", "low"]),
    })
  ),
  suggestions: z.array(z.object({ section: z.string(), content: z.string() })),
});

/**
 * 是否配置了可用的真实 LLM key。占位符或空值时返回 false，走 mock。
 */
export function isLLMConfigured(): boolean {
  const key = process.env.LLM_API_KEY;
  return !!key && key !== "sk-your-api-key" && key.length > 20;
}

interface QualitativeInput {
  resumeText: string;
  jdText: string;
  targetRoles: string[];
  quant: QuantMatchResult;
}

/**
 * 质性评估：有真实 key 时调 LLM，否则返回由量化结果推导的结构化 mock，
 * 保证前端始终拿到形状一致的 MatchReport。
 */
export async function qualitativeMatch(input: QualitativeInput): Promise<MatchReport> {
  if (!isLLMConfigured()) {
    return mockReport(input.quant);
  }

  try {
    const prompt = await loadPrompt("match-analysis", {
      targetRoles: input.targetRoles.join("、") || "未指定",
      resumeText: input.resumeText,
      jdText: input.jdText,
      quantScore: String(input.quant.score),
      matchedSkills: input.quant.matched.join("、") || "无",
      missingSkills: input.quant.missing.join("、") || "无",
    });

    const client = new OpenAI({
      apiKey: process.env.LLM_API_KEY,
      baseURL: process.env.LLM_BASE_URL,
    });

    const completion = await client.chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new AIServiceError("AI_EMPTY", "AI 返回为空");
    return reportSchema.parse(JSON.parse(raw));
  } catch (e) {
    // LLM 或解析失败时降级为 mock，不阻断整条分析链路
    console.error("qualitativeMatch failed, falling back to mock:", e);
    return mockReport(input.quant);
  }
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function mockReport(quant: QuantMatchResult): MatchReport {
  const base = quant.score;
  return {
    overall: base,
    dimensions: [
      { name: "技术栈匹配", score: base, details: "基于关键词量化匹配得出（未接入 LLM，为示例数据）。" },
      { name: "经验深度", score: clamp(base - 10), details: "示例数据：接入 LLM 后将根据简历经历深度评估。" },
      { name: "项目契合度", score: clamp(base - 5), details: "示例数据：接入 LLM 后将评估项目与 JD 的契合度。" },
      { name: "综合素质", score: clamp(base + 5), details: "示例数据：接入 LLM 后将综合评估。" },
    ],
    gaps: quant.missing.map((skill) => ({
      type: "skill" as const,
      description: `JD 要求 ${skill}，简历中未体现`,
      severity: "medium" as const,
    })),
    suggestions: [
      { section: "skills", content: quant.missing.length ? `考虑补充或强调这些技能：${quant.missing.join("、")}` : "技能匹配良好，可保持。" },
      { section: "experience", content: "用量化成果（数字、指标）强化经历描述。" },
    ],
  };
}

export class AIServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AIServiceError";
  }
}
