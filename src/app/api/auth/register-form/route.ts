import { NextRequest, NextResponse } from "next/server";
import { register, AuthError } from "@/services/auth.service";
import { setAuthCookieOnResponse } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const email = formData.get("email") as string;
    const name = formData.get("name") as string;
    const password = formData.get("password") as string;

    if (!email || !name || !password) {
      return NextResponse.redirect(
        new URL("/auth/register?error=请填写所有字段", request.url),
        302
      );
    }

    if (password.length < 6) {
      return NextResponse.redirect(
        new URL("/auth/register?error=密码至少 6 位", request.url),
        302
      );
    }

    const result = await register(email, name, password);

    const response = NextResponse.redirect(new URL("/dashboard", request.url), 302);
    setAuthCookieOnResponse(response, result.token);
    return response;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.redirect(
        new URL(`/auth/register?error=${encodeURIComponent(e.message)}`, request.url),
        302
      );
    }
    return NextResponse.redirect(
      new URL("/auth/register?error=注册失败，请稍后重试", request.url),
      302
    );
  }
}
