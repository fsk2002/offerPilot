export interface MatchReport {
  overall: number;
  dimensions: MatchDimension[];
  gaps: Gap[];
  suggestions: Suggestion[];
  // 异岗评分对比：所选各岗位的量化分（LLM 不返回，由 service 计算后合入）
  roleComparison?: RoleScore[];
}

// 单个岗位画像的量化匹配结果，用于异岗评分对比
export interface RoleScore {
  roleId: string;
  roleName: string;
  quantScore: number;
  matched: string[];
  missing: string[];
}

export interface MatchDimension {
  name: string;
  score: number;
  details: string;
}

export interface Gap {
  type: "skill" | "experience";
  description: string;
  severity: "high" | "medium" | "low";
}

export interface Suggestion {
  section: string;
  content: string;
}

export interface JDParsed {
  title?: string;
  company?: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
}

export type ApplicationStatus = "pending" | "interviewing" | "rejected" | "offered";
