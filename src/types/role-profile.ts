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
