"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";

interface Resume {
  id: string;
  fileName: string;
  version: number;
  source: string;
  createdAt: string;
}

export default function ResumesPage() {
  const router = useRouter();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchResumes = useCallback(async () => {
    const res = await fetch("/api/resumes");
    const data = await res.json();
    if (!data.success) {
      router.push("/auth/login");
      return;
    }
    setResumes(data.data || []);
  }, [router]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/resumes");
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          router.push("/auth/login");
          return;
        }
        setResumes(data.data || []);
      } catch {
        if (active) router.push("/auth/login");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        await fetchResumes();
      }
    } catch (e) {
      console.error("Upload failed:", e);
    } finally {
      setUploading(false);
    }
  }, [fetchResumes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    maxSize: 10485760,
  });

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold">简历管理</h1>
          <p className="text-muted-foreground">上传和管理你的简历版本</p>
        </div>

        {/* Upload area */}
        <div
          {...getRootProps()}
          className={`p-10 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-500 bg-blue-50"
              : "border-border hover:border-blue-300"
          }`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-muted-foreground">上传中，请稍候...</p>
          ) : isDragActive ? (
            <p className="text-blue-500">放下文件以上传</p>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-medium">拖拽 PDF 简历到此处</p>
              <p className="text-sm text-muted-foreground">
                或点击选择文件（支持 PDF，最大 10MB）
              </p>
            </div>
          )}
        </div>

        {/* Resume list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">
            简历版本 ({resumes.length})
          </h2>
          {resumes.length === 0 ? (
            <p className="text-muted-foreground text-sm py-8 text-center">
              还没有上传过简历
            </p>
          ) : (
            <div className="space-y-2">
              {resumes.map((resume) => (
                <div
                  key={resume.id}
                  className="p-4 border border-border rounded-lg flex items-center justify-between hover:border-blue-300 transition-colors"
                >
                  <div>
                    <p className="font-medium">{resume.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      v{resume.version} ·{" "}
                      {new Date(resume.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-secondary rounded-full">
                    {resume.source === "upload" ? "已上传" : resume.source}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
