/**
 * 服务端 PDF 文本提取（pdf-parse）。
 * Docker/本地构建走这个实现；Cloudflare 构建通过 next.config 的
 * resolveAlias 指向 pdf-server.cf.ts（空实现），
 * 因为 CF 上传路径优先使用浏览器端提取的 text。
 */
export async function extractPdfTextFromBuffer(
  buffer: Buffer
): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = (await pdfParse(buffer)) as { text?: string };
  return data.text ?? "";
}
