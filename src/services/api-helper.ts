import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";

export function success<T>(data: T, status = 200) {
  const body: ApiResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

export function error(code: string, message: string, status = 400) {
  const body: ApiResponse = {
    success: false,
    error: { code, message },
  };
  return NextResponse.json(body, { status });
}
