import { prisma } from "@/lib/prisma";
import { getResume } from "@/services/resume.service";
import { quantitativeMatch, compareRoles } from "@/lib/matching";
import { qualitativeMatch } from "@/services/ai.service";
import { getProfiles } from "@/lib/role-profiles";
import type { MatchReport } from "@/types/application";
import type { UpdateApplicationInput } from "@/lib/validation";

interface CreateAnalysisInput {
  resumeId: string;
  jdText: string;
  targetRoles?: string[];
  company?: string;
  position?: string;
}

// 量化分与质性分的加权（质性权重更高）
const QUANT_WEIGHT = 0.4;
const QUAL_WEIGHT = 0.6;

export async function createAnalysis(userId: string, input: CreateAnalysisInput) {
  const { resumeId, jdText, targetRoles = [], company, position } = input;

  // 复用 resume.service，getResume 已校验归属（不存在会抛 ResumeError）
  const resume = await getResume(resumeId, userId);

  const rawText = (resume.rawParsed as { rawText?: string } | null)?.rawText;
  if (!rawText) {
    throw new ApplicationError(
      "NO_RESUME_TEXT",
      "该简历尚未解析出文本内容，无法分析，请重新上传"
    );
  }

  // targetRoles 是画像 ID 数组；取到的画像里第一个为主岗，驱动量化 + LLM
  const profiles = await getProfiles(targetRoles);
  const primary = profiles[0];

  const quant = quantitativeMatch(rawText, jdText, primary);
  const report = await qualitativeMatch({
    resumeText: rawText,
    jdText,
    targetRoles,
    quant,
    profile: primary,
  });

  // 异岗对比：所选各岗位都跑一次量化分（毫秒级），合入报告
  const finalReport: MatchReport =
    profiles.length > 0
      ? { ...report, roleComparison: compareRoles(rawText, jdText, profiles) }
      : report;

  const matchScore = Math.round(quant.score * QUANT_WEIGHT + report.overall * QUAL_WEIGHT);

  return prisma.application.create({
    data: {
      userId,
      resumeId,
      jdText,
      targetRoles,
      company: company || null,
      position: position || null,
      matchScore,
      matchScoreQuant: quant.score,
      matchScoreQual: report.overall,
      matchReport: finalReport as object,
      status: "pending",
    },
  });
}

export async function getUserApplications(userId: string) {
  return prisma.application.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      company: true,
      position: true,
      matchScore: true,
      status: true,
      createdAt: true,
      resume: { select: { fileName: true } },
    },
  });
}

export async function getApplication(id: string, userId: string) {
  const application = await prisma.application.findFirst({
    where: { id, userId },
    include: { resume: { select: { fileName: true } } },
  });

  if (!application) {
    throw new ApplicationError("NOT_FOUND", "投递记录不存在");
  }

  return application;
}

// 更新投递：状态流转 / 公司 / 岗位。归属校验后按传入字段增量更新。
export async function updateApplication(
  id: string,
  userId: string,
  patch: UpdateApplicationInput
) {
  const existing = await prisma.application.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    throw new ApplicationError("NOT_FOUND", "投递记录不存在");
  }

  return prisma.application.update({
    where: { id },
    data: {
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.company !== undefined && { company: patch.company || null }),
      ...(patch.position !== undefined && { position: patch.position || null }),
    },
    include: { resume: { select: { fileName: true } } },
  });
}

// 删除投递及其关联面试题（外键无 onDelete，手动按序删；Application 无磁盘文件）。
export async function deleteApplication(id: string, userId: string): Promise<void> {
  const existing = await prisma.application.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) {
    throw new ApplicationError("NOT_FOUND", "投递记录不存在");
  }

  await prisma.$transaction(async (tx) => {
    await tx.interview.deleteMany({ where: { applicationId: id } });
    await tx.application.delete({ where: { id } });
  });
}

// Dashboard 统计：简历数 / 投递数 / 面试题数 + 按状态分布。
export async function getUserStats(userId: string) {
  const [resumeCount, applicationCount, interviewCount, grouped] =
    await Promise.all([
      prisma.resume.count({ where: { userId } }),
      prisma.application.count({ where: { userId } }),
      prisma.interview.count({ where: { userId } }),
      prisma.application.groupBy({
        by: ["status"],
        where: { userId },
        _count: { _all: true },
      }),
    ]);

  const statusBreakdown: Record<string, number> = {};
  for (const g of grouped) {
    statusBreakdown[g.status] = g._count._all;
  }

  return { resumeCount, applicationCount, interviewCount, statusBreakdown };
}

export class ApplicationError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "ApplicationError";
  }
}
