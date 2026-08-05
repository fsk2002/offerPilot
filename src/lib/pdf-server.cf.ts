/**
 * Cloudflare Worker 专用空实现：PDF 解析交给浏览器端（pdf-client.ts），
 * 服务端不再打包 pdf.js。若浏览器未能提取文本，则上传不带 rawText，
 * 用户可重新上传或由后续能力补充。
 */
export async function extractPdfTextFromBuffer(): Promise<string> {
  return "";
}
