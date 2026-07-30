import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { uploadResume, getUserResumes, ResumeError } from "@/services/resume.service";
import { success, error } from "@/services/api-helper";

export async function GET() {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const resumes = await getUserResumes(payload.userId);
    return success(resumes);
  } catch (e) {
    console.error("Get resumes error:", e);
    return error("INTERNAL_ERROR", "获取简历列表失败", 500);
  }
}

export async function POST(request: NextRequest) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return error("VALIDATION_ERROR", "请上传简历文件");
    }

    const result = await uploadResume(payload.userId, file);
    return success(result, 201);
  } catch (e) {
    if (e instanceof ResumeError) {
      return error(e.code, e.message);
    }
    console.error("Upload resume error:", e);
    return error("INTERNAL_ERROR", "上传简历失败", 500);
  }
}
