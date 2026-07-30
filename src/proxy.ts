import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

// 需要登录才能访问的路由前缀
const PROTECTED_ROUTES = [
  "/dashboard",
  "/applications",
  "/resumes",
  "/interview",
  "/settings",
  "/api/resumes",
  "/api/applications",
  "/api/ai",
  "/api/jd-fetch",
];

// 公开 API 路由（不需要登录）
const PUBLIC_API_ROUTES = ["/api/auth/register", "/api/auth/login", "/api/auth/login-form", "/api/auth/register-form"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公开路由直接放行
  if (
    pathname === "/" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public") ||
    PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r))
  ) {
    return NextResponse.next();
  }

  // 检查是否需要登录
  const needsAuth =
    PROTECTED_ROUTES.some((r) => pathname.startsWith(r)) ||
    (pathname.startsWith("/api/") && !PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r)));

  if (needsAuth) {
    const token = request.cookies.get("offerpilot_token")?.value;

    if (!token || !verifyToken(token)) {
      // API 请求返回 401，页面请求重定向到登录页
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { success: false, error: { code: "UNAUTHORIZED", message: "请先登录" } },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
