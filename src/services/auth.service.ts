import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  comparePassword,
  signToken,
  JwtPayload,
} from "@/lib/auth";

export type AuthResult = {
  user: { id: string; email: string; name: string; avatar: string | null };
  token: string;
};

// ============================================================
// Register
// ============================================================
export async function register(
  email: string,
  name: string,
  password: string
): Promise<AuthResult> {
  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AuthError("EMAIL_EXISTS", "该邮箱已被注册");
  }

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: { email, name, password: hashed },
  });

  const token = signToken({ userId: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, name: user.name, avatar: null },
    token,
  };
}

// ============================================================
// Login
// ============================================================
export async function login(
  email: string,
  password: string
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AuthError("INVALID_CREDENTIALS", "邮箱或密码错误");
  }

  const valid = await comparePassword(password, user.password);
  if (!valid) {
    throw new AuthError("INVALID_CREDENTIALS", "邮箱或密码错误");
  }

  const token = signToken({ userId: user.id, email: user.email });
  return {
    user: { id: user.id, email: user.email, name: user.name, avatar: user.avatar },
    token,
  };
}

// ============================================================
// Get current user by token payload
// ============================================================
export async function getCurrentUser(payload: JwtPayload) {
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, name: true, avatar: true, createdAt: true },
  });
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "用户不存在");
  }
  return user;
}

// ============================================================
// 更新个人资料（昵称；邮箱作为登录标识不可改）
// ============================================================
export async function updateProfile(userId: string, name: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "用户不存在");
  }

  return prisma.user.update({
    where: { id: userId },
    data: { name },
    select: { id: true, email: true, name: true, avatar: true, createdAt: true },
  });
}

// ============================================================
// Error class
// ============================================================
export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}
