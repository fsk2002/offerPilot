import fs from "fs/promises";
import path from "path";
import { AwsClient } from "aws4fetch";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

/**
 * 文件存储抽象：
 * - 配置了 R2（R2_* 环境变量）时使用 Cloudflare R2（S3 API）
 * - 否则回退本地磁盘（开发 / Docker 自托管）
 */

interface R2Config {
  client: AwsClient;
  endpoint: string;
  bucket: string;
}

let r2Cache: R2Config | null | undefined;

function getR2(): R2Config | null {
  if (r2Cache !== undefined) return r2Cache;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_ENDPOINT;
  const bucket = process.env.R2_BUCKET;
  if (!key || !secret || !endpoint || !bucket) {
    r2Cache = null;
    return null;
  }
  r2Cache = {
    client: new AwsClient({
      accessKeyId: key,
      secretAccessKey: secret,
      service: "s3",
    }),
    endpoint: endpoint.replace(/\/$/, ""),
    bucket,
  };
  return r2Cache;
}

function r2Url(cfg: R2Config, key: string): string {
  return `${cfg.endpoint}/${cfg.bucket}/${key}`;
}

function uniqueFileName(fileName: string): string {
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `${baseName}-${Date.now()}${ext}`;
}

/**
 * Save an uploaded file. R2 优先，本地磁盘兜底。
 * 返回的 filePath：R2 为 `r2://resumes/<name>`，本地为相对路径。
 */
export async function saveFile(
  buffer: Buffer,
  fileName: string,
  subDir = "resumes"
): Promise<{ filePath: string; fileSize: number }> {
  const r2 = getR2();
  if (r2) {
    const name = uniqueFileName(fileName);
    const key = `${subDir}/${name}`;
    const res = await r2.client.fetch(r2Url(r2, key), {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
      },
      // aws4fetch 的 BodyInit 不识别 Node Buffer，传底层 ArrayBuffer
      body: buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      ) as ArrayBuffer,
    });
    if (!res.ok) {
      throw new Error(`R2 upload failed: ${res.status}`);
    }
    return { filePath: `r2://${key}`, fileSize: buffer.length };
  }

  const dir = path.join(process.cwd(), UPLOAD_DIR, subDir);
  await fs.mkdir(dir, { recursive: true });

  // Create a unique filename to avoid collisions
  const uniqueName = uniqueFileName(fileName);
  const filePath = path.join(dir, uniqueName);

  await fs.writeFile(filePath, buffer);

  const stat = await fs.stat(filePath);
  return { filePath: `${UPLOAD_DIR}/${subDir}/${uniqueName}`, fileSize: stat.size };
}

/**
 * Delete a file from the filesystem
 */
export async function deleteFile(filePath: string): Promise<void> {
  const r2 = getR2();
  if (r2 && filePath.startsWith("r2://")) {
    const key = filePath.slice("r2://".length);
    const res = await r2.client.fetch(r2Url(r2, key), { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      console.warn("R2 delete failed:", res.status);
    }
    return;
  }
  try {
    const absPath = path.join(process.cwd(), filePath);
    await fs.unlink(absPath);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Read a file as buffer
 */
export async function readFile(filePath: string): Promise<Buffer> {
  const r2 = getR2();
  if (r2 && filePath.startsWith("r2://")) {
    const key = filePath.slice("r2://".length);
    const res = await r2.client.fetch(r2Url(r2, key), { method: "GET" });
    if (!res.ok) {
      throw new Error(`R2 read failed: ${res.status}`);
    }
    return Buffer.from(await res.arrayBuffer());
  }
  const absPath = path.join(process.cwd(), filePath);
  return fs.readFile(absPath);
}
