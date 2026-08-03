import { prisma } from "@/lib/prisma";
import { generateInterviewQuestions } from "@/services/ai.service";

export class InterviewError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "InterviewError";
  }
}

const INTERVIEW_SELECT = {
  id: true,
  type: true,
  question: true,
  answer: true,
  createdAt: true,
} as const;

/**
 * 获取某投递下的面试题（按创建时间升序，即生成顺序）。
 * 校验投递归属，越权返回 NOT_FOUND。
 */
export async function getInterviews(applicationId: string, userId: string) {
  const app = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    select: { id: true },
  });
  if (!app) {
    throw new InterviewError("NOT_FOUND", "投递记录不存在");
  }

  return prisma.interview.findMany({
    where: { applicationId },
    orderBy: { createdAt: "asc" },
    select: INTERVIEW_SELECT,
  });
}

/**
 * 基于投递的 JD + 简历 + 目标岗位生成面试题并落库。
 * 重新生成时先清空旧题再插入，保证与当前报告一致。
 */
export async function generateAndSaveInterviews(
  applicationId: string,
  userId: string
) {
  const application = await prisma.application.findFirst({
    where: { id: applicationId, userId },
    include: { resume: true },
  });
  if (!application) {
    throw new InterviewError("NOT_FOUND", "投递记录不存在");
  }

  const rawText = (application.resume.rawParsed as { rawText?: string } | null)
    ?.rawText;
  if (!rawText) {
    throw new InterviewError(
      "NO_RESUME_TEXT",
      "该简历没有可用的文本内容，无法生成面试题"
    );
  }

  const questions = await generateInterviewQuestions({
    resumeText: rawText,
    jdText: application.jdText,
    targetRoles: application.targetRoles ?? [],
  });

  await prisma.$transaction(async (tx) => {
    await tx.interview.deleteMany({ where: { applicationId } });
    await tx.interview.createMany({
      data: questions.map((q) => ({
        applicationId,
        userId,
        type: q.type,
        question: q.question,
      })),
    });
  });

  return getInterviews(applicationId, userId);
}

/**
 * 保存/更新某道面试题的回答。
 */
export async function updateInterviewAnswer(
  id: string,
  userId: string,
  answer: string
) {
  const existing = await prisma.interview.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    throw new InterviewError("NOT_FOUND", "面试题不存在");
  }

  return prisma.interview.update({
    where: { id },
    data: { answer },
    select: INTERVIEW_SELECT,
  });
}
