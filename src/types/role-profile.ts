export interface RoleProfile {
  id: string;
  name: string;
  family: string;
  category: string;
  typicalSkills: SkillWeight[];
  evaluationDimensions: EvalDimension[];
  narrativeStrategy: NarrativeStrategy;
}

export interface SkillWeight {
  name: string;
  weight: number;
  aliases: string[];
  required: boolean;
}

export interface EvalDimension {
  name: string;
  prompt: string;
  weight: number;
}

export interface NarrativeStrategy {
  overall: string;
  perSection: NarrativeSection[];
  keywords: string[];
}

export interface NarrativeSection {
  section: string;
  emphasis: string;
}

// 分类树（index.json 的形状），供岗位选择器渲染 家族 → 岗位 层级
export interface RoleTree {
  categories: RoleCategory[];
}

export interface RoleCategory {
  name: string;
  families: RoleFamily[];
}

export interface RoleFamily {
  name: string;
  roles: RoleTreeItem[];
}

export interface RoleTreeItem {
  id: string;
  name: string;
}
