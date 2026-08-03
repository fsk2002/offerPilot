"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  createdAt: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedHint, setSavedHint] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          router.push("/auth/login");
          return;
        }
        setUser(data.data);
        setName(data.data.name);
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

  const handleSave = async () => {
    setSaving(true);
    setSavedHint("");
    setError("");
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.data);
        setName(data.data.name);
        setSavedHint("已保存");
      } else {
        setError(data.error?.message || "保存失败");
      }
    } catch {
      setError("保存失败，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">加载中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">个人设置</h1>
          <Link href="/dashboard" className="text-sm text-blue-500 hover:underline">
            ← 返回工作台
          </Link>
        </div>

        {savedHint && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            {savedHint}
          </p>
        )}
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        )}

        <div className="p-6 border border-border rounded-xl space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">昵称</p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">邮箱</p>
            <input
              type="email"
              value={user?.email ?? ""}
              readOnly
              className="w-full px-3 py-2 border border-border rounded-lg bg-secondary text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground mt-1">
              邮箱作为登录标识，暂不支持修改。
            </p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !name.trim()}
            className="px-5 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </main>
  );
}
