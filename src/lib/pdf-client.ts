// ============================================================
// 浏览器端 PDF 文本提取（pdf.js）
// 用途：上传简历时在客户端提取文本，随 FormData 提交给后端，
//       避免把 pdf.js（~1MB gzip）打进 Cloudflare Worker 包。
// 仅从客户端动态 import，不进入服务端 bundle。
// ============================================================

import * as pdfjsLib from "pdfjs-dist/build/pdf.mjs";

export async function extractPdfText(file: File): Promise<string> {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjsLib.getDocument({
    data,
    useWorkerFetch: false,
  });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items
      .map((item) =>
        "str" in item && typeof item.str === "string" ? item.str : ""
      )
      .join(" ");
    pages.push(line);
    page.cleanup();
  }
  await loadingTask.destroy();

  return pages.join("\n").trim();
}
