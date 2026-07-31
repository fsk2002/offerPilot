import type { ResumeContent } from "@/types/resume";

// 把结构化 ResumeContent 拼成 Markdown。
// 用于：编辑器首次进入的降级链（历史结构化数据）、以及"AI 结构化初稿"按钮的输出。
export function contentToMarkdown(content: ResumeContent): string {
  const parts: string[] = [];

  if (content.name) parts.push(`# ${content.name}`);

  const contacts = [content.email, content.phone].filter(Boolean);
  if (contacts.length > 0) parts.push(contacts.join(" · "));

  if (content.summary) {
    parts.push(`## 个人简介\n\n${content.summary}`);
  }

  if (content.education?.length) {
    const items = content.education.map((e) => {
      const range = [e.startDate, e.endDate ?? "至今"].filter(Boolean).join(" - ");
      const head = [e.school, e.degree, e.major].filter(Boolean).join(" · ");
      return `- **${head}**${range ? `（${range}）` : ""}`;
    });
    parts.push(`## 教育经历\n\n${items.join("\n")}`);
  }

  if (content.experience?.length) {
    const items = content.experience.map((x) => {
      const range = [x.startDate, x.endDate ?? "至今"].filter(Boolean).join(" - ");
      const head = [x.company, x.title].filter(Boolean).join(" · ");
      const lines = [`### ${head}${range ? `（${range}）` : ""}`];
      if (x.description) lines.push(x.description);
      if (x.highlights?.length) {
        lines.push(x.highlights.map((h) => `- ${h}`).join("\n"));
      }
      return lines.join("\n\n");
    });
    parts.push(`## 工作经历\n\n${items.join("\n\n")}`);
  }

  if (content.projects?.length) {
    const items = content.projects.map((p) => {
      const lines = [`### ${p.name}`];
      if (p.description) lines.push(p.description);
      if (p.technologies?.length) lines.push(`技术栈：${p.technologies.join("、")}`);
      if (p.highlights?.length) {
        lines.push(p.highlights.map((h) => `- ${h}`).join("\n"));
      }
      return lines.join("\n\n");
    });
    parts.push(`## 项目经历\n\n${items.join("\n\n")}`);
  }

  if (content.skills?.length) {
    const items = content.skills.map(
      (s) => `- **${s.category}**：${s.items.join("、")}`
    );
    parts.push(`## 技能\n\n${items.join("\n")}`);
  }

  return parts.join("\n\n");
}
