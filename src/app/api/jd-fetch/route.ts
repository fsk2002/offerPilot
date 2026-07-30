import { NextRequest } from "next/server";
import { getAuthToken, verifyToken } from "@/lib/auth";
import { fetchJDFromUrl, JDFetchError } from "@/services/jd-fetch.service";
import { jdFetchSchema } from "@/lib/validation";
import { success, error } from "@/services/api-helper";

export async function POST(request: NextRequest) {
  const token = await getAuthToken();
  const payload = token ? verifyToken(token) : null;
  if (!payload) return error("UNAUTHORIZED", "请先登录", 401);

  try {
    const body = await request.json();
    const parsed = jdFetchSchema.safeParse(body);
    if (!parsed.success) {
      return error("VALIDATION_ERROR", parsed.error.errors[0]?.message || "参数错误");
    }

    const text = await fetchJDFromUrl(parsed.data.url);
    return success({ text });
  } catch (e) {
    if (e instanceof JDFetchError) {
      return error(e.code, e.message, 422);
    }
    console.error("JD fetch error:", e);
    return error("INTERNAL_ERROR", "抓取失败，请稍后重试", 500);
  }
}
