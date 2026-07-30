import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import type { RoleProfile, RoleTree } from "@/types/role-profile";

const PROFILE_DIR = path.join(process.cwd(), "data", "role-profiles");

// 画像 ID 来自用户输入（targetRoles），限定字符集防止路径穿越（../ 等）
const ID_PATTERN = /^[a-z0-9-]+$/;

const skillSchema = z.object({
  name: z.string(),
  weight: z.number(),
  aliases: z.array(z.string()),
  required: z.boolean(),
});

const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  family: z.string(),
  category: z.string(),
  typicalSkills: z.array(skillSchema).min(1),
  evaluationDimensions: z
    .array(z.object({ name: z.string(), prompt: z.string(), weight: z.number() }))
    .min(1),
  narrativeStrategy: z.object({
    overall: z.string(),
    perSection: z.array(z.object({ section: z.string(), emphasis: z.string() })),
    keywords: z.array(z.string()),
  }),
});

const treeSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string(),
      families: z.array(
        z.object({
          name: z.string(),
          roles: z.array(z.object({ id: z.string(), name: z.string() })),
        })
      ),
    })
  ),
});

// 数据文件只读、进程内不变，读一次缓存，避免每次请求都打磁盘
let treeCache: RoleTree | null = null;
const profileCache = new Map<string, RoleProfile | null>();

export async function getRoleTree(): Promise<RoleTree> {
  if (treeCache) return treeCache;
  const raw = await fs.readFile(path.join(PROFILE_DIR, "index.json"), "utf8");
  treeCache = treeSchema.parse(JSON.parse(raw));
  return treeCache;
}

/**
 * 按 ID 读取单个画像。ID 非法或文件不存在/格式错误时返回 null，
 * 让调用方优雅降级到通用匹配，而不是让整个分析失败。
 */
export async function getProfile(id: string): Promise<RoleProfile | null> {
  if (!ID_PATTERN.test(id)) return null;
  if (profileCache.has(id)) return profileCache.get(id) ?? null;

  let profile: RoleProfile | null = null;
  try {
    const raw = await fs.readFile(path.join(PROFILE_DIR, `${id}.json`), "utf8");
    profile = profileSchema.parse(JSON.parse(raw));
  } catch {
    profile = null;
  }
  profileCache.set(id, profile);
  return profile;
}

/** 批量读取，过滤掉无效 ID，保持传入顺序（第一个即主岗）。 */
export async function getProfiles(ids: string[]): Promise<RoleProfile[]> {
  const results = await Promise.all(ids.map((id) => getProfile(id)));
  return results.filter((p): p is RoleProfile => p !== null);
}
