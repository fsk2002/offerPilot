import { NextRequest, NextResponse } from "next/server";
import { login, AuthError } from "@/services/auth.service";
import { setAuthCookieOnResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      return NextResponse.redirect(new URL("/auth/login?error=请输入邮箱和密码", request.url), 302);
    }

    const result = await login(email, password);

    const response = NextResponse.redirect(new URL("/dashboard", request.url), 302);
    setAuthCookieOnResponse(response, result.token);
    return response;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.redirect(
        new URL(`/auth/login?error=${encodeURIComponent(e.message)}`, request.url),
        302
      );
    }
    return NextResponse.redirect(
      new URL("/auth/login?error=登录失败，请稍后重试", request.url),
      302
    );
  }
}
