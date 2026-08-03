// ============================================================
// Phase 7: 格式校对规则引擎
// 纯规则检查（不依赖 LLM），毫秒级返回；AI 质评由调用方按需触发。
// ============================================================

export interface FormatIssue {
  id: string;
  type: string;
  line: number; // 1-based 行号（近似定位）
  severity: "high" | "medium" | "low";
  description: string;
  fix?: string; // 存在时表示可自动修复（fix 为替换后的整行内容）
}

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

// 常见拼写错误（小写字典，自动修复用）
const TYPOS: Record<string, string> = {
  recieve: "receive",
  seperate: "separate",
  occured: "occurred",
  develope: "develop",
  buisness: "business",
  teh: "the",
  adn: "and",
  wokr: "work",
  progammer: "programmer",
  javascirpt: "JavaScript",
  javacript: "JavaScript",
  javscript: "JavaScript",
  framwork: "framework",
  framworks: "frameworks",
  enviroment: "environment",
  dependancy: "dependency",
  colloboration: "collaboration",
  acheived: "achieved",
};

// 量化动词：出现这些词但附近没有数字/% 时提醒补充量化数据
const QUANT_VERBS = /提升|优化|增加|减少|降低|提高|改善|加速|缩短|节约|增长|翻倍|覆盖/;
const HAS_NUMBER = /\d|%|百分之|万|亿/;

const SECTION_ORDER = ["教育", "工作", "项目", "技能"];

/**
 * 对 Markdown 简历做格式检查，返回问题列表。
 * 检查项：日期格式一致性 / 中英文标点混用 / 连续空行 / 行尾空格 /
 *         量化数据缺失 / 英文动词时态一致性 / 常见拼写错误 / 章节顺序。
 */
export function checkFormat(markdown: string): FormatIssue[] {
  const issues: FormatIssue[] = [];
  const lines = markdown.split("\n");
  const seen = new Set<string>();

  const push = (issue: Omit<FormatIssue, "id">) => {
    const key = `${issue.type}:${issue.line}:${issue.description}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push({ ...issue, id: `fmt-${issues.length + 1}` });
  };

  // ---------- 日期格式一致性 ----------
  const datePatterns = [
    { name: "dash", re: /\b(19|20)\d{2}-\d{1,2}\b/g, normalize: (m: string) => {
      const [y, mo] = m.split("-");
      return `${y}.${mo.padStart(2, "0")}`;
    }},
    { name: "slash", re: /\b(19|20)\d{2}\/\d{1,2}\b/g, normalize: (m: string) => {
      const [y, mo] = m.split("/");
      return `${y}.${mo.padStart(2, "0")}`;
    }},
    { name: "dot-unpadded", re: /\b(19|20)\d{2}\.\d{1}\b/g, normalize: (m: string) => {
      const [y, mo] = m.split(".");
      return `${y}.${mo.padStart(2, "0")}`;
    }},
    { name: "cn", re: /\b(19|20)\d{2}年\d{1,2}月/g, normalize: (m: string) => {
      const y = m.match(/(19|20)\d{2}/)?.[0] ?? "";
      const mo = m.match(/月/) ? m.match(/\d{1,2}月/)?.[0]?.replace("月", "") ?? "" : "";
      return `${y}.${mo.padStart(2, "0")}`;
    }},
    { name: "en", re: /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/g, normalize: (m: string) => {
      const parts = m.split(" ");
      const mo = MONTH_MAP[parts[0].slice(0, 3).toLowerCase()] ?? "01";
      return `${parts[1]}.${mo}`;
    }},
  ];

  const foundFormats = new Map<string, number>(); // name -> count
  const lineDates = new Map<number, Array<{ name: string; match: string; normalize: (m: string) => string }>>();
  lines.forEach((line, idx) => {
    const hits: Array<{ name: string; match: string; normalize: (m: string) => string }> = [];
    for (const p of datePatterns) {
      const matches = line.match(p.re) ?? [];
      for (const match of matches) {
        hits.push({ name: p.name, match, normalize: p.normalize });
        foundFormats.set(p.name, (foundFormats.get(p.name) ?? 0) + 1);
      }
    }
    if (hits.length) lineDates.set(idx + 1, hits);
  });

  if (foundFormats.size > 1) {
    // 选出现最多的格式作为标准，其余标记为需统一
    const preferred = [...foundFormats.entries()].sort((a, b) => b[1] - a[1])[0][0];
    for (const [lineNo, hits] of lineDates) {
      for (const h of hits) {
        if (h.name === preferred) continue;
        const correctedDate = h.normalize(h.match);
        const correctedLine = lines[lineNo - 1]?.replace(h.match, correctedDate) ?? correctedDate;
        push({
          type: "date-format",
          line: lineNo,
          severity: "medium",
          description: `日期格式不统一（${h.match}），建议统一为 YYYY.MM（${correctedDate}）`,
          fix: correctedLine,
        });
      }
    }
  }

  // ---------- 中英文标点混用 ----------
  lines.forEach((line, idx) => {
    // 中文间使用英文逗号/句号
    const badComma = line.match(/[\u4e00-\u9fff],[ \u4e00-\u9fff]/);
    const badPeriod = line.match(/[\u4e00-\u9fff]\.[\u4e00-\u9fff]/);
    if (badComma || badPeriod) {
      let fix = line;
      if (badComma) fix = fix.replace(/([\u4e00-\u9fff]),/g, "$1，");
      if (badPeriod) fix = fix.replace(/([\u4e00-\u9fff])\.([\u4e00-\u9fff])/g, "$1。$2");
      push({
        type: "punctuation",
        line: idx + 1,
        severity: "low",
        description: "中文字符间使用了英文标点，建议改用中文标点",
        fix,
      });
    }
  });

  // ---------- 连续空行 ----------
  const blankRunRe = /\n{3,}/g;
  for (const m of markdown.matchAll(blankRunRe)) {
    const before = markdown.slice(0, m.index).split("\n").length;
    push({
      type: "blank-lines",
      line: before,
      severity: "low",
      description: "存在连续 3 个以上的空行，建议最多保留 1 个空行",
      fix: "\n\n",
    });
  }

  // ---------- 行尾空格 ----------
  lines.forEach((line, idx) => {
    if (/[ \t]+$/.test(line)) {
      push({
        type: "trailing-space",
        line: idx + 1,
        severity: "low",
        description: "行尾有多余空格",
        fix: line.replace(/[ \t]+$/, ""),
      });
    }
  });

  // ---------- 量化数据缺失 ----------
  lines.forEach((line, idx) => {
    const bullet = line.trim().match(/^[-*]\s+(.+)$/);
    if (!bullet) return;
    const text = bullet[1];
    if (QUANT_VERBS.test(text) && !HAS_NUMBER.test(text)) {
      push({
        type: "quantified",
        line: idx + 1,
        severity: "medium",
        description: `"${text.slice(0, 30)}${text.length > 30 ? "…" : ""}" 使用了效果词但缺少量化数据，建议补充数字/百分比（如 30%、2 倍）`,
      });
    }
  });

  // ---------- 英文动词时态一致性（简化启发式） ----------
  const englishBullets: Array<{ lineNo: number; text: string; pastTense: boolean }> = [];
  lines.forEach((line, idx) => {
    const bullet = line.trim().match(/^[-*]\s+(.+)$/);
    if (!bullet) return;
    const text = bullet[1];
    // 含英文单词且主要是英文
    if (/[a-zA-Z]{3,}/.test(text) && !/[\u4e00-\u9fff]/.test(text)) {
      const firstWord = text.match(/^[A-Za-z-]+/)?.[0]?.toLowerCase() ?? "";
      const pastTense = /^[a-z]+ed$/.test(firstWord) && !/^[a-z]+eed$/.test(firstWord);
      englishBullets.push({ lineNo: idx + 1, text, pastTense });
    }
  });
  if (englishBullets.length >= 3) {
    const pastCount = englishBullets.filter((b) => b.pastTense).length;
    const presentCount = englishBullets.length - pastCount;
    const dominant = pastCount >= presentCount ? "past" : "present";
    for (const b of englishBullets) {
      const isDominant = dominant === "past" ? b.pastTense : !b.pastTense;
      if (!isDominant) {
        push({
          type: "verb-tense",
          line: b.lineNo,
          severity: "low",
          description: `英文要点动词时态与其他条目不一致，建议统一为${dominant === "past" ? "过去式" : "一般现在时"}`,
        });
      }
    }
  }

  // ---------- 常见拼写错误 ----------
  lines.forEach((line, idx) => {
    for (const [typo, correct] of Object.entries(TYPOS)) {
      const re = new RegExp(`\\b${typo}\\b`, "i");
      if (re.test(line)) {
        push({
          type: "typo",
          line: idx + 1,
          severity: "medium",
          description: `疑似拼写错误："${typo}" 应为 "${correct}"`,
          fix: line.replace(new RegExp(`\\b${typo}\\b`, "i"), correct),
        });
      }
    }
  });

  // ---------- 章节顺序 ----------
  const headings: Array<{ lineNo: number; text: string }> = [];
  lines.forEach((line, idx) => {
    const m = line.match(/^##\s+(.+)$/);
    if (m) headings.push({ lineNo: idx + 1, text: m[1] });
  });
  if (headings.length >= 2) {
    let lastIndex = -1;
    for (const h of headings) {
      const matchIdx = SECTION_ORDER.findIndex((s) => h.text.includes(s));
      if (matchIdx === -1) continue;
      if (matchIdx < lastIndex) {
        push({
          type: "section-order",
          line: h.lineNo,
          severity: "low",
          description: `章节 "${h.text}" 的顺序建议调整为：教育 → 工作 → 项目 → 技能`,
        });
        break;
      }
      lastIndex = matchIdx;
    }
  }

  return issues;
}

export interface FormatFixResult {
  fixedMarkdown: string;
  applied: FormatIssue[];
}

/**
 * 应用可安全自动修复的问题（date-format / punctuation / blank-lines /
 * trailing-space / typo）。量化、时态、章节顺序只提示不自动改。
 */
export function applyFixes(markdown: string, issues: FormatIssue[]): FormatFixResult {
  const lines = markdown.split("\n");
  const applied: FormatIssue[] = [];
  const fixableTypes = new Set(["date-format", "punctuation", "blank-lines", "trailing-space", "typo"]);

  for (const issue of issues) {
    if (!issue.fix || !fixableTypes.has(issue.type)) continue;
    const idx = issue.line - 1;
    if (idx < 0 || idx >= lines.length) continue;

    if (issue.type === "blank-lines") {
      // blank-lines 的 fix 是 "\n\n"，需处理多行场景：直接整体替换再重建
      continue; // 在下方统一处理
    }
    if (lines[idx] !== undefined) {
      lines[idx] = issue.fix;
      applied.push(issue);
    }
  }

  // 统一折叠连续空行
  let result = lines.join("\n");
  const before = result;
  result = result.replace(/\n{3,}/g, "\n\n");
  if (result !== before) {
    applied.push({
      id: "fmt-auto-blank",
      type: "blank-lines",
      line: 0,
      severity: "low",
      description: "已折叠连续空行",
    });
  }

  return { fixedMarkdown: result, applied };
}
