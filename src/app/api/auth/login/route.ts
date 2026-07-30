import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { login, AuthError } from "@/services/auth.service";
import { setAuthCookieOnResponse } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      const msg = parsed.error.errors[0]?.message || "参数错误";
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: msg } },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const result = await login(email, password);

    const response = NextResponse.json(
      { success: true, data: result.user },
      { status: 200 }
    );

    setAuthCookieOnResponse(response, result.token);
    return response;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: e.code, message: e.message } },
        { status: 401 }
      );
    }
    console.error("Login error:", e);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "登录失败，请稍后重试" } },
      { status: 500 }
    );
  }
}
