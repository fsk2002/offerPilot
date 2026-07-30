import fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./public/uploads";

/**
 * Save an uploaded file to the local filesystem
 */
export async function saveFile(
  buffer: Buffer,
  fileName: string,
  subDir = "resumes"
): Promise<{ filePath: string; fileSize: number }> {
  const dir = path.join(process.cwd(), UPLOAD_DIR, subDir);
  await fs.mkdir(dir, { recursive: true });

  // Create a unique filename to avoid collisions
  const ext = path.extname(fileName);
  const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
  const uniqueName = `${baseName}-${Date.now()}${ext}`;
  const filePath = path.join(dir, uniqueName);

  await fs.writeFile(filePath, buffer);

  const stat = await fs.stat(filePath);
  return { filePath: `${UPLOAD_DIR}/${subDir}/${uniqueName}`, fileSize: stat.size };
}

/**
 * Delete a file from the filesystem
 */
export async function deleteFile(filePath: string): Promise<void> {
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
  const absPath = path.join(process.cwd(), filePath);
  return fs.readFile(absPath);
}
