"use client";

import { useEffect, useState } from "react";
import type { RoleTree } from "@/types/role-profile";

const MAX_ROLES = 3;

interface RoleSelectorProps {
  value: string[];
  onChange: (ids: string[]) => void;
}

export default function RoleSelector({ value, onChange }: RoleSelectorProps) {
  const [tree, setTree] = useState<RoleTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/role-profiles");
        const data = await res.json();
        if (!active) return;
        if (!data.success) {
          setErrorMsg("岗位画像加载失败");
          return;
        }
        setTree(data.data);
      } catch {
        if (active) setErrorMsg("岗位画像加载失败");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else if (value.length < MAX_ROLES) {
      onChange([...value, id]);
    }
  };

  const nameOf = (id: string): string => {
    for (const c of tree?.categories ?? []) {
      for (const f of c.families) {
        const r = f.roles.find((r) => r.id === id);
        if (r) return r.name;
      }
    }
    return id;
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">岗位画像加载中...</p>;
  }
  if (errorMsg || !tree) {
    return <p className="text-sm text-muted-foreground">{errorMsg || "暂无岗位画像"}</p>;
  }

  const atLimit = value.length >= MAX_ROLES;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        已选 {value.length}/{MAX_ROLES}
        {atLimit && "（已达上限，取消勾选可换选）"}
      </p>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className="px-2 py-1 text-xs bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors"
            >
              {nameOf(id)} ✕
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4 max-h-64 overflow-y-auto border border-border rounded-lg p-3">
        {tree.categories.map((category) =>
          category.families.map((family) => (
            <div key={family.name}>
              <p className="text-xs font-medium text-muted-foreground mb-1">{family.name}</p>
              <div className="flex flex-wrap gap-2">
                {family.roles.map((role) => {
                  const checked = value.includes(role.id);
                  const disabled = !checked && atLimit;
                  return (
                    <label
                      key={role.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-sm border rounded-lg cursor-pointer transition-colors ${
                        checked
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : disabled
                            ? "border-border opacity-40 cursor-not-allowed"
                            : "border-border hover:bg-secondary"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={disabled}
                        onChange={() => toggle(role.id)}
                        className="sr-only"
                      />
                      {role.name}
                    </label>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
