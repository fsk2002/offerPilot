import { prisma } from "@/lib/prisma";
import { saveFile, deleteFile } from "@/lib/file-storage";
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
  return prisma.resume.findMany({
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
