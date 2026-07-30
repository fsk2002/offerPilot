import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { register, AuthError } from "@/services/auth.service";
import { setAuthCookieOnResponse } from "@/lib/auth";

const schema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  name: z.string().min(1, "请输入昵称").max(50),
  password: z.string().min(6, "密码至少 6 位"),
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

    const { email, name, password } = parsed.data;
    const result = await register(email, name, password);

    const response = NextResponse.json(
      { success: true, data: result.user },
      { status: 201 }
    );

    setAuthCookieOnResponse(response, result.token);
    return response;
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { code: e.code, message: e.message } },
        { status: 409 }
      );
    }
    console.error("Register error:", e);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "注册失败，请稍后重试" } },
      { status: 500 }
    );
  }
}
