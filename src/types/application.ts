export interface MatchReport {
  overall: number;
  dimensions: MatchDimension[];
  gaps: Gap[];
  suggestions: Suggestion[];
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
