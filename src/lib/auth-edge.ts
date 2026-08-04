// ============================================================
// Edge 运行时安全的 JWT 校验（proxy/middleware 专用）
// 用 Web Crypto（crypto.subtle）验签，避免把 jsonwebtoken 等
// Node 依赖打进 Cloudflare 边缘 bundle。
// ============================================================

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const buffer = new ArrayBuffer(bin.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * 校验 HS256 JWT：签名有效且未过期。
 * 与服务端 jsonwebtoken 的 sign（HS256 + expiresIn: 24h）兼容。
 */
export async function verifyTokenEdge(token: string): Promise<boolean> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const [header, payload, signature] = parts;

    const secret =
      process.env.AUTH_SECRET || "dev-secret-do-not-use-in-production";
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signature),
      encoder.encode(`${header}.${payload}`)
    );
    if (!valid) return false;

    const decoded = JSON.parse(
      decoder.decode(base64UrlDecode(payload))
    ) as { exp?: number };
    if (!decoded.exp) return false;
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
