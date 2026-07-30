import { NextRequest, NextResponse } from "next/server";
import { login, AuthError } from "@/services/auth.service";
import { setAuthCookieOnResponse } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

function redirectWithError(request: NextRequest, message: string) {
  return NextResponse.redirect(
    new URL(`/auth/login?error=${encodeURIComponent(message)}`, request.url),
    302
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const parsed = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return redirectWithError(request, parsed.error.errors[0]?.message || "参数错误");
    }

    const result = await login(parsed.data.email, parsed.data.password);

    const response = NextResponse.redirect(new URL("/dashboard", request.url), 302);
    setAuthCookieOnResponse(response, result.token);
    return response;
  } catch (e) {
    if (e instanceof AuthError) {
      return redirectWithError(request, e.message);
    }
    return redirectWithError(request, "登录失败，请稍后重试");
  }
}
