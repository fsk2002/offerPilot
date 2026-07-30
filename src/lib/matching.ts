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

function detectSkills(text: string): Set<string> {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [canonical, aliases] of Object.entries(SKILL_KEYWORDS)) {
    if (aliases.some((a) => lower.includes(a))) {
      found.add(canonical);
    }
  }
  return found;
}

/**
 * 关键词量化匹配：以 JD 中出现的已知技能为基准，
 * 计算简历命中的比例。不依赖 role-profile 数据。
 */
export function quantitativeMatch(
  resumeText: string,
  jdText: string
): QuantMatchResult {
  const jdSkills = detectSkills(jdText);
  const resumeSkills = detectSkills(resumeText);

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
