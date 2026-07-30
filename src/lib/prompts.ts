import fs from "fs/promises";
import path from "path";

const PROMPT_DIR = path.join(process.cwd(), "data", "prompts");

/**
 * 读取 data/prompts/{name}.txt 并把 {{key}} 替换为 vars[key]。
 * 未提供的变量替换为空字符串，避免残留占位符进入 prompt。
 */
export async function loadPrompt(
  name: string,
  vars: Record<string, string> = {}
): Promise<string> {
  const template = await fs.readFile(path.join(PROMPT_DIR, `${name}.txt`), "utf8");
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "");
}
