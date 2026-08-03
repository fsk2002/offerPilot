import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/file-storage";
import { contentToMarkdown } from "@/lib/resume-markdown";
import { parseResume } from "@/services/ai.service";
import type { ResumeContent } from "@/types/resume";

// ============================================================
// Upload a resume PDF, parse it, and create a Resume record
// ============================================================
export async function uploadResume(
  userId: string,
  file: File
): Promise<{
  id: string;
  fileName: string;
  version: number;
  content: ResumeContent | null;
}> {
  // Validate extension and MIME type before reading the file into memory
  if (!file.name.toLowerCase().endsWith(".pdf") || file.type !== "application/pdf") {
    throw new ResumeError("INVALID_FILE", "仅支持 PDF 格式的简历");
  }

  // Reject oversized files up front, before buffering
  const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || "10485760", 10);
  if (file.size > MAX_SIZE) {
    throw new ResumeError("FILE_TOO_LARGE", "文件大小不能超过 10MB");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Verify the PDF magic bytes so a renamed non-PDF can't slip through
  if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
    throw new ResumeError("INVALID_FILE", "文件内容不是有效的 PDF");
  }

  // Save file
  const { filePath, fileSize } = await saveFile(buffer, file.name);

  // Extract text from PDF
  let rawText = "";
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    rawText = data.text;
  } catch (e) {
    console.warn("PDF parse failed, saving without text:", e);
  }

  // 结构化解析（parseResume）依赖 LLM，耗时数十秒，不阻塞上传；
  // 匹配分析用 rawText 即可，结构化留待后续按需触发。
  const resume = await prisma.resume.create({
    data: {
      fileName: file.name,
      filePath,
      fileSize,
      version: 1,
      source: "upload",
      rawParsed: rawText ? { rawText } : undefined,
      userId,
    },
  });

  return {
    id: resume.id,
    fileName: resume.fileName,
    version: resume.version,
    content: resume.content as ResumeContent | null,
  };
}

// ============================================================
// Get all resumes for a user
// ============================================================
export async function getUserResumes(userId: string) {
  const resumes = await prisma.resume.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      version: true,
      source: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 只返回版本链头（最新版本）：被其他版本作为 parent 引用的行是历史版本，
  // 不在列表展示，避免每次"另存为新版本"后列表无限膨胀。
  const referencedIds = await prisma.resume.findMany({
    where: { userId, parentId: { not: null } },
    select: { parentId: true },
  });
  const parentIds = new Set(
    referencedIds.map((r) => r.parentId as string)
  );

  return resumes.filter((r) => !parentIds.has(r.id));
}

// ============================================================
// Get a single resume
// ============================================================
export async function getResume(id: string, userId: string) {
  const resume = await prisma.resume.findFirst({
    where: { id, userId },
  });

  if (!resume) {
    throw new ResumeError("NOT_FOUND", "简历不存在");
  }

  return resume;
}

// ============================================================
// 编辑器：取初始 Markdown（降级链）+ 元信息。不在进入时跑 LLM。
//   1. content.markdown 存在 → 直接用
//   2. content（结构化）→ contentToMarkdown 拼
//   3. rawParsed.rawText → 纯文本初稿
//   4. 都没有 → 空串
// ============================================================
export async function getResumeForEdit(id: string, userId: string) {
  const resume = await prisma.resume.findFirst({ where: { id, userId } });
  if (!resume) {
    throw new ResumeError("NOT_FOUND", "简历不存在");
  }

  const content = resume.content as (ResumeContent & { markdown?: string }) | null;
  const rawText = (resume.rawParsed as { rawText?: string } | null)?.rawText;

  let initialMarkdown = "";
  if (content?.markdown) {
    initialMarkdown = content.markdown;
  } else if (content && Object.keys(content).length > 0) {
    initialMarkdown = contentToMarkdown(content);
  } else if (rawText) {
    initialMarkdown = rawText;
  }

  return {
    id: resume.id,
    fileName: resume.fileName,
    version: resume.version,
    initialMarkdown,
    hasRawText: Boolean(rawText),
  };
}

// ============================================================
// 编辑器：保存 Markdown 回 content，保留已有结构化字段。
// ============================================================
export async function updateResumeMarkdown(
  id: string,
  userId: string,
  markdown: string
): Promise<void> {
  const resume = await prisma.resume.findFirst({
    where: { id, userId },
    select: { content: true },
  });
  if (!resume) {
    throw new ResumeError("NOT_FOUND", "简历不存在");
  }

  const prevContent = (resume.content as Record<string, unknown> | null) ?? {};
  await prisma.resume.update({
    where: { id },
    data: { content: { ...prevContent, markdown } },
  });
}

// ============================================================
// Phase 8: 版本链
// 设计：每个版本是一行 Resume，通过 parentId 自关联成链；
//       上传 = v1，之后每次"另存为新版本"追加一行，文件路径沿用原 PDF。
// ============================================================

/**
 * 取某简历所在版本链的全部版本（从根到最新，按 version 升序）。
 * 先沿 parentId 回溯到根，再从根沿 children 收集整条链。
 */
export async function getResumeVersions(id: string, userId: string) {
  const target = await prisma.resume.findFirst({ where: { id, userId } });
  if (!target) {
    throw new ResumeError("NOT_FOUND", "简历不存在");
  }

  const all = await prisma.resume.findMany({
    where: { userId },
    select: {
      id: true,
      parentId: true,
      version: true,
      fileName: true,
      source: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const byId = new Map(all.map((r) => [r.id, r]));

  // 回溯到根
  let rootId = target.id;
  let cursor = all.find((r) => r.id === target.id);
  while (cursor?.parentId) {
    const parent = byId.get(cursor.parentId);
    if (!parent) break;
    rootId = parent.id;
    cursor = parent;
  }

  // 从根收集所有后代
  const childrenOf = new Map<string, (typeof all)[number][]>();
  for (const r of all) {
    if (r.parentId) {
      const arr = childrenOf.get(r.parentId) ?? [];
      arr.push(r);
      childrenOf.set(r.parentId, arr);
    }
  }

  const chain: (typeof all)[number][] = [];
  const visit = (rid: string) => {
    const node = byId.get(rid);
    if (!node) return;
    chain.push(node);
    for (const child of childrenOf.get(rid) ?? []) visit(child.id);
  };
  visit(rootId);

  chain.sort((a, b) =>
    a.version === b.version
      ? a.createdAt.getTime() - b.createdAt.getTime()
      : a.version - b.version
  );

  return chain.map((r) => ({
    id: r.id,
    version: r.version,
    fileName: r.fileName,
    source: r.source,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

/**
 * 从当前版本派生一个新版本（parentId = 当前 id，version = 链内最大 + 1）。
 * content/rawParsed 复制，filePath 沿用原 PDF（版本差异在 Markdown 内容上）。
 * 也用于"版本回退"：对任意旧版本调用即可从该版本重新开分支。
 */
export async function createResumeVersion(
  id: string,
  userId: string,
  markdown?: string
) {
  const resume = await prisma.resume.findFirst({ where: { id, userId } });
  if (!resume) {
    throw new ResumeError("NOT_FOUND", "简历不存在");
  }

  const versions = await getResumeVersions(id, userId);
  const maxVersion = versions.reduce((max, v) => Math.max(max, v.version), 0);
  const newVersion = maxVersion + 1;

  return prisma.resume.create({
    data: {
      userId,
      fileName: resume.fileName,
      filePath: resume.filePath,
      fileSize: resume.fileSize,
      version: newVersion,
      source: "editor",
      // 若带了 markdown（编辑器"另存为新版本"），保存当前编辑内容；
      // 否则继承原版 content（版本回退场景）。
      content:
        markdown !== undefined
          ? {
              ...((resume.content as Record<string, unknown> | null) ?? {}),
              markdown,
            }
          : (resume.content ?? undefined),
      rawParsed: resume.rawParsed ?? undefined,
      parentId: id,
    },
    select: {
      id: true,
      version: true,
      fileName: true,
      createdAt: true,
    },
  });
}

// ============================================================
// 编辑器：用 LLM 把 rawText 结构化并转成规整 Markdown 初稿。
// 只返回 Markdown，不落库——由前端决定是否覆盖后再手动保存。
// ============================================================
export async function structureResumeToMarkdown(
  id: string,
  userId: string
): Promise<string> {
  const resume = await prisma.resume.findFirst({
    where: { id, userId },
    select: { rawParsed: true },
  });
  if (!resume) {
    throw new ResumeError("NOT_FOUND", "简历不存在");
  }

  const rawText = (resume.rawParsed as { rawText?: string } | null)?.rawText;
  if (!rawText) {
    throw new ResumeError("NO_RESUME_TEXT", "该简历没有可结构化的文本内容");
  }

  const content = await parseResume(rawText);
  if (!content) {
    throw new ResumeError("STRUCTURE_FAILED", "AI 结构化失败，请稍后重试");
  }

  return contentToMarkdown(content);
}

// ============================================================
// Delete a resume and everything that depends on it (cascade).
// 外键无 onDelete 规则，须手动按依赖顺序删：
//   Interview → Application → 解除子简历 parentId → Resume（记录 + 文件）
// 全程在一个事务里，避免删到一半留下悬挂引用。
// ============================================================
export async function deleteResume(id: string, userId: string): Promise<void> {
  const resume = await prisma.resume.findFirst({ where: { id, userId } });
  if (!resume) {
    throw new ResumeError("NOT_FOUND", "简历不存在");
  }

  await prisma.$transaction(async (tx) => {
    const apps = await tx.application.findMany({
      where: { resumeId: id },
      select: { id: true },
    });
    const appIds = apps.map((a) => a.id);

    if (appIds.length > 0) {
      await tx.interview.deleteMany({ where: { applicationId: { in: appIds } } });
      await tx.application.deleteMany({ where: { id: { in: appIds } } });
    }

    // 该简历若是其他版本的 parent，先解除引用再删，避免自关联外键报错
    await tx.resume.updateMany({ where: { parentId: id }, data: { parentId: null } });
    await tx.resume.delete({ where: { id } });
  });

  // 记录删除成功后再删磁盘文件；删文件失败不回滚（文件残留可容忍，记录已清）
  if (resume.filePath) {
    try {
      await deleteFile(resume.filePath);
    } catch (e) {
      console.warn("Resume file delete failed (record already removed):", e);
    }
  }
}

// ============================================================
// Error class
// ============================================================
export class ResumeError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ResumeError";
  }
}
