import type { RoleProfile } from "@/types/role-profile";
import type { RoleScore } from "@/types/application";

export interface QuantMatchResult {
  score: number; // 0-100
  matched: string[];
  missing: string[];
  degraded: boolean; // JD 中未识别到任何已知技能关键词时为 true
}

// 每个技能一个规范名 + 若干别名（全部小写匹配）。
// role-profile 数据缺失时的兜底关键词表，覆盖技术类主流栈。
const SKILL_KEYWORDS: Record<string, string[]> = {
  React: ["react", "react.js", "reactjs"],
  Vue: ["vue", "vue.js", "vuejs"],
  Angular: ["angular"],
  TypeScript: ["typescript", "ts"],
  JavaScript: ["javascript", "js", "es6"],
  "Node.js": ["node", "node.js", "nodejs"],
  "Next.js": ["next", "next.js", "nextjs"],
  Java: ["java"],
  Spring: ["spring", "spring boot", "springboot"],
  Go: ["golang", "go 语言"],
  Python: ["python"],
  "C++": ["c++", "cpp"],
  Rust: ["rust"],
  MySQL: ["mysql"],
  PostgreSQL: ["postgresql", "postgres", "pg"],
  Redis: ["redis"],
  MongoDB: ["mongodb", "mongo"],
  Kafka: ["kafka"],
  RabbitMQ: ["rabbitmq"],
  Docker: ["docker"],
  Kubernetes: ["kubernetes", "k8s"],
  AWS: ["aws"],
  微服务: ["微服务", "microservice", "microservices"],
  GraphQL: ["graphql"],
  Webpack: ["webpack"],
  Vite: ["vite"],
  分布式: ["分布式", "distributed"],
  高并发: ["高并发", "high concurrency"],
  机器学习: ["机器学习", "machine learning", "ml"],
  深度学习: ["深度学习", "deep learning"],
  LLM: ["llm", "大模型", "大语言模型"],
  NLP: ["nlp", "自然语言处理"],
};

/**
 * 单个别名是否命中文本。
 * ASCII 别名用单词边界，避免子串误命中（"ml" 命中 "html"、"go" 命中 "category"、"ts" 命中 "tests"）；
 * 含中文等非 ASCII 的别名按子串匹配（\b / [a-z0-9] 边界对 CJK 不适用）。
 */
function aliasHits(lowerText: string, alias: string): boolean {
  const a = alias.toLowerCase().trim();
  if (!a) return false;
  const escaped = a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const before = /[a-z0-9]/.test(a[0]) ? "(?<![a-z0-9])" : "";
  const after = /[a-z0-9]/.test(a[a.length - 1]) ? "(?![a-z0-9])" : "";
  return new RegExp(before + escaped + after).test(lowerText);
}

function hasSkill(lowerText: string, aliases: string[]): boolean {
  return aliases.some((a) => aliasHits(lowerText, a));
}

function detectGeneric(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [canonical, aliases] of Object.entries(SKILL_KEYWORDS)) {
    if (hasSkill(lower, aliases)) found.add(canonical);
  }
  return found;
}

/**
 * 通用关键词量化匹配：以 JD 中出现的已知技能为基准，
 * 计算简历命中的比例。不依赖 role-profile 数据。
 */
function genericMatch(resumeText: string, jdText: string): QuantMatchResult {
  const jdSkills = detectGeneric(jdText);
  const resumeSkills = detectGeneric(resumeText);

  if (jdSkills.size === 0) {
    return { score: 0, matched: [], missing: [], degraded: true };
  }

  const matched: string[] = [];
  const missing: string[] = [];
  for (const skill of jdSkills) {
    (resumeSkills.has(skill) ? matched : missing).push(skill);
  }

  const score = Math.round((matched.length / jdSkills.size) * 100);
  return { score, matched, missing, degraded: false };
}

/**
 * 画像驱动的加权量化匹配（PRD §4.2 第一层）：
 * 以「JD 中出现的本岗典型技能」为基准，按技能权重计算简历的加权覆盖率。
 * JD 未命中任何画像技能时回退到通用关键词表并标 degraded。
 */
function profileMatch(
  resumeText: string,
  jdText: string,
  profile: RoleProfile
): QuantMatchResult {
  const lowerJd = jdText.toLowerCase();
  const lowerResume = resumeText.toLowerCase();

  let totalWeight = 0;
  let matchedWeight = 0;
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of profile.typicalSkills) {
    if (!hasSkill(lowerJd, skill.aliases)) continue; // 只计入 JD 实际要求的画像技能
    totalWeight += skill.weight;
    if (hasSkill(lowerResume, skill.aliases)) {
      matchedWeight += skill.weight;
      matched.push(skill.name);
    } else {
      missing.push(skill.name);
    }
  }

  if (totalWeight === 0) {
    return { ...genericMatch(resumeText, jdText), degraded: true };
  }

  const score = Math.round((matchedWeight / totalWeight) * 100);
  return { score, matched, missing, degraded: false };
}

/**
 * 量化匹配入口。传入画像走加权匹配，否则走通用关键词表（向后兼容）。
 */
export function quantitativeMatch(
  resumeText: string,
  jdText: string,
  profile?: RoleProfile
): QuantMatchResult {
  return profile
    ? profileMatch(resumeText, jdText, profile)
    : genericMatch(resumeText, jdText);
}

/**
 * 异岗评分对比：同一份简历 + JD 对多个岗位画像分别量化，返回各岗得分。
 */
export function compareRoles(
  resumeText: string,
  jdText: string,
  profiles: RoleProfile[]
): RoleScore[] {
  return profiles.map((p) => {
    const r = quantitativeMatch(resumeText, jdText, p);
    return {
      roleId: p.id,
      roleName: p.name,
      quantScore: r.score,
      matched: r.matched,
      missing: r.missing,
    };
  });
}
