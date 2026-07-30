export interface ResumeContent {
  name?: string;
  email?: string;
  phone?: string;
  summary?: string;
  education?: Education[];
  experience?: Experience[];
  projects?: Project[];
  skills?: SkillCategory[];
}

export interface Education {
  school: string;
  degree: string;
  major: string;
  startDate: string;
  endDate?: string;
}

export interface Experience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  description?: string;
  highlights: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies: string[];
  highlights: string[];
}

export interface SkillCategory {
  category: string;
  items: string[];
}
