import * as cheerio from "cheerio";

// 防 SSRF：只允许公网 http(s)，拒绝内网 / 保留地址
function assertPublicHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new JDFetchError("INVALID_URL", "请输入有效的链接");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new JDFetchError("INVALID_URL", "仅支持 http/https 链接");
  }
  const host = url.hostname;
  const blocked =
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local") ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  if (blocked) {
    throw new JDFetchError("BLOCKED_URL", "不支持抓取内网地址");
  }
  return url;
}

/**
 * 抓取 JD 页面正文。分层策略第一层：HTTP + cheerio（仅适用于 SSR 页面）。
 * 抓不到有效正文时抛错，由前端降级为手动粘贴。
 */
export async function fetchJDFromUrl(rawUrl: string): Promise<string> {
  const url = assertPublicHttpUrl(rawUrl);

  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OfferPilotBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      throw new JDFetchError("FETCH_FAILED", `目标页面返回 ${res.status}`);
    }
    html = await res.text();
  } catch (e) {
    if (e instanceof JDFetchError) throw e;
    throw new JDFetchError("FETCH_FAILED", "无法访问该链接，请改用手动粘贴");
  }

  const $ = cheerio.load(html);
  $("script, style, noscript, nav, header, footer, svg").remove();

  // 优先取常见正文容器，取不到则退回 body
  const candidates = ["article", "main", '[class*="job"]', '[class*="detail"]', "body"];
  let text = "";
  for (const sel of candidates) {
    const t = $(sel).text().replace(/\s+/g, " ").trim();
    if (t.length > text.length) text = t;
  }

  if (text.length < 50) {
    throw new JDFetchError("EMPTY_CONTENT", "未能从该页面提取到有效内容，请改用手动粘贴");
  }

  // 截断，避免超长文本进入后续流程
  return text.slice(0, 8000);
}

export class JDFetchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "JDFetchError";
  }
}
