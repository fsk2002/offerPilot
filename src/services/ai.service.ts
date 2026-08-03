import OpenAI from "openai";
import { z } from "zod";
import { loadPrompt } from "@/lib/prompts";
import { getProfiles } from "@/lib/role-profiles";
import type { QuantMatchResult } from "@/lib/matching";
import type { MatchReport } from "@/types/application";
import type { ResumeContent } from "@/types/resume";
import type { RoleProfile } from "@/types/role-profile";

const MODEL = process.env.LLM_MODEL || "gpt-4o-mini";

function llmClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,
  });
}

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
 * 是否配置了可用的真实 LLM。key 和 model(接入点/模型名) 都需非占位符。
 * 未配置时走 mock；已配置但调用失败则报错，不用假数据冒充真实分析。
 */
export function isLLMConfigured(): boolean {
  const key = process.env.LLM_API_KEY;
  const model = process.env.LLM_MODEL;
  const keyPlaceholders = ["sk-your-api-key", "your-api-key", ""];
  return (
    !!key &&
    !keyPlaceholders.includes(key) &&
    key.length > 20 &&
    !!model &&
    model !== "ep-your-endpoint-id"
  );
}

interface QualitativeInput {
  resumeText: string;
  jdText: string;
  targetRoles: string[];
  quant: QuantMatchResult;
  profile?: RoleProfile; // 主岗画像；有则用其维度/叙事驱动 LLM 评估
}

// 把画像的叙事策略 + 评估维度拼成给 LLM 的参考文本
function buildProfileNarrative(profile: RoleProfile): string {
  const dims = profile.evaluationDimensions
    .map((d) => `- ${d.name}：${d.prompt}`)
    .join("\n");
  return `整体叙事策略：${profile.narrativeStrategy.overall}\n关注维度：\n${dims}`;
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
    const targetRoleName =
      input.profile?.name || input.targetRoles.join("、") || "未指定";
    const roleProfileNarrative = input.profile
      ? buildProfileNarrative(input.profile)
      : "未指定具体岗位画像，请基于 JD 通用评估。";

    const prompt = await loadPrompt("match-analysis", {
      targetRoleName,
      roleProfileNarrative,
      resumeText: input.resumeText,
      jdText: input.jdText,
      quantScore: String(input.quant.score),
      matchedSkills: input.quant.matched.join("、") || "无",
      missingSkills: input.quant.missing.join("、") || "无",
    });

    const completion = await llmClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new AIServiceError("AI_EMPTY", "AI 返回为空");
    return reportSchema.parse(JSON.parse(raw));
  } catch (e) {
    // 已配置真实 LLM 却失败：报错而非返回假数据，避免用户误以为是真实分析
    console.error("qualitativeMatch failed:", e);
    if (e instanceof AIServiceError) throw e;
    throw new AIServiceError("AI_SERVICE_ERROR", "AI 分析服务暂时不可用，请稍后重试");
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

const resumeContentSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  summary: z.string().nullish(),
  education: z
    .array(
      z.object({
        school: z.string(),
        degree: z.string(),
        major: z.string(),
        startDate: z.string(),
        endDate: z.string().nullish(),
      })
    )
    .nullish(),
  experience: z
    .array(
      z.object({
        company: z.string(),
        title: z.string(),
        startDate: z.string(),
        endDate: z.string().nullish(),
        description: z.string().nullish(),
        highlights: z.array(z.string()),
      })
    )
    .nullish(),
  projects: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        technologies: z.array(z.string()),
        highlights: z.array(z.string()),
      })
    )
    .nullish(),
  skills: z
    .array(z.object({ category: z.string(), items: z.array(z.string()) }))
    .nullish(),
});

/**
 * 把简历原始文本结构化为 ResumeContent。
 * 未配置真实 key 时返回最小 mock（summary 取正文开头），保证 content 字段有形状可用。
 * 解析失败不抛错，返回 null，让上传流程继续（简历仍可用 rawText 匹配）。
 */
export async function parseResume(rawText: string): Promise<ResumeContent | null> {
  if (!isLLMConfigured()) {
    return { summary: rawText.slice(0, 200).replace(/\s+/g, " ").trim() };
  }

  try {
    const prompt = await loadPrompt("resume-parse", { resumeText: rawText });
    const completion = await llmClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return null;
    return resumeContentSchema.parse(JSON.parse(raw)) as ResumeContent;
  } catch (e) {
    console.error("parseResume failed:", e);
    return null;
  }
}

export class AIServiceError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AIServiceError";
  }
}

// ============================================================
// Phase 7: AI 智能修改（岗位感知改写）
// ============================================================

const aiEditSchema = z.object({
  modifiedMarkdown: z.string().min(1, "AI 返回了空简历"),
  summary: z.string().default(""),
  editNotes: z.array(z.string()).default([]),
});

export interface AIEditInput {
  resumeText: string;
  targetRoleIds: string[];
  jdText?: string;
}

export interface AIEditResult {
  modifiedMarkdown: string;
  summary: string;
  editNotes: string[];
}

/**
 * 调用 LLM 按目标岗位画像（+可选 JD）改写简历 Markdown。
 * 与 qualitativeMatch 不同，这里必须有真实 LLM 配置——没有 key 时不降级 mock，
 * 直接报错，避免用户误把示例改写当成真实建议。
 */
export async function aiEditResume(input: AIEditInput): Promise<AIEditResult> {
  if (!isLLMConfigured()) {
    throw new AIServiceError(
      "AI_NOT_CONFIGURED",
      "尚未配置 LLM API Key，请先在 .env 中设置 LLM_API_KEY"
    );
  }

  const profiles = await getProfiles(input.targetRoleIds);
  const profileNarrative =
    profiles.length > 0
      ? profiles
          .map((p) => {
            const sections = p.narrativeStrategy.perSection
              .map((s) => `  - ${s.section}: ${s.emphasis}`)
              .join("\n");
            return `- ${p.name}：${p.narrativeStrategy.overall}\n${sections}`;
          })
          .join("\n")
      : "未指定具体岗位画像，请基于通用求职建议优化。";

  const prompt = await loadPrompt("ai-edit", {
    targetRoleName: profiles.map((p) => p.name).join("、") || "未指定",
    roleProfileNarrative: profileNarrative,
    jdText: input.jdText?.trim() || "（未提供）",
    resumeText: input.resumeText,
  });

  try {
    const completion = await llmClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.4,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) throw new AIServiceError("AI_EMPTY", "AI 返回为空");
    return aiEditSchema.parse(JSON.parse(raw));
  } catch (e) {
    console.error("aiEditResume failed:", e);
    if (e instanceof AIServiceError) throw e;
    throw new AIServiceError("AI_SERVICE_ERROR", "AI 修改服务暂时不可用，请稍后重试");
  }
}

// ============================================================
// Phase 7: AI 格式质评（表达质量 / 结构 / 亮点 / 专业度）
// 规则引擎之外的补充审查；未配置 LLM 时返回空数组。
// ============================================================

const formatReviewSchema = z.object({
  issues: z.array(
    z.object({
      type: z.enum(["expression", "structure", "highlight", "professionalism"]),
      line: z.number().default(0),
      severity: z.enum(["high", "medium", "low"]).default("medium"),
      description: z.string(),
    })
  ),
});

export interface AIFormatReviewIssue {
  type: "expression" | "structure" | "highlight" | "professionalism";
  line: number;
  severity: "high" | "medium" | "low";
  description: string;
}

/**
 * AI 表达质量审查。LLM 未配置时返回空数组（规则引擎仍可用）。
 */
export async function aiFormatReview(resumeText: string): Promise<AIFormatReviewIssue[]> {
  if (!isLLMConfigured()) return [];

  try {
    const prompt = await loadPrompt("format-review", { resumeText });
    const completion = await llmClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });
    const raw = completion.choices[0]?.message?.content;
    if (!raw) return [];
    return formatReviewSchema.parse(JSON.parse(raw)).issues;
  } catch (e) {
    console.error("aiFormatReview failed:", e);
    return [];
  }
}
