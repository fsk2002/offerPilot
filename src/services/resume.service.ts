import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/file-storage";
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

  // Extract text from PDF (basic - will be enhanced with AI parsing)
  let rawText = "";
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    rawText = data.text;
  } catch (e) {
    console.warn("PDF parse failed, saving without text:", e);
  }

  // Create resume record
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
