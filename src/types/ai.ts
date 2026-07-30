import type { ResumeContent } from "./resume";

export interface AIEditRequest {
  resumeContent: ResumeContent;
  jdText?: string;
  targetRoleIds: string[];
  sections?: string[];
}

export interface AIEditResponse {
  modifiedContent: ResumeContent;
  diffs: AIDiff[];
  summary: string;
}

export interface AIDiff {
  section: string;
  index: number;
  type: "modified" | "added" | "deleted";
  oldText: string;
  newText: string;
  reason: string;
}

export interface MatchAnalysisRequest {
  resumeContent: ResumeContent;
  jdText: string;
  targetRoleIds: string[];
  quantScore?: number;
  matchedSkills?: string[];
  missingSkills?: string[];
}

export interface FormatIssue {
  type: string;
  location: string;
  severity: "high" | "medium" | "low";
  description: string;
  fix?: string;
}
