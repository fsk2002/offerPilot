// ============================================================
// 行级文本 Diff 工具（Phase 7）
// 用途：AI 智能修改后，计算原简历与修改版之间的差异，
//       分组为可逐条确认的 change items。
// ============================================================

export interface DiffChange {
  id: string;
  type: "replace" | "insert" | "delete";
  oldStart: number; // 0-based 行号（原文本），exclusive end = oldEnd
  oldEnd: number;
  newStart: number; // 0-based 行号（新文本）
  newEnd: number;
  oldText: string;  // 原文本片段（可能为空，insert 时）
  newText: string;  // 新文本片段（可能为空，delete 时）
}

/**
 * 计算 oldText → newText 的行级 diff，并把相邻变更合并为可确认的 hunk。
 * 基于最长公共子序列（LCS），O(n*m)；简历通常几百行，性能可接受。
 */
export function computeDiff(oldText: string, newText: string): DiffChange[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");
  const n = oldLines.length;
  const m = newLines.length;

  // LCS DP（反向填充，便于回溯）
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        oldLines[i] === newLines[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // 回溯生成编辑序列：equal / remove / add
  const ops: Array<{ type: "equal" | "remove" | "add"; oldIdx: number; newIdx: number }> = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (oldLines[i] === newLines[j]) {
      ops.push({ type: "equal", oldIdx: i, newIdx: j });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "remove", oldIdx: i, newIdx: j });
      i++;
    } else {
      ops.push({ type: "add", oldIdx: i, newIdx: j });
      j++;
    }
  }
  while (i < n) {
    ops.push({ type: "remove", oldIdx: i, newIdx: j });
    i++;
  }
  while (j < m) {
    ops.push({ type: "add", oldIdx: i, newIdx: j });
    j++;
  }

  // 把相邻非 equal 操作合并为一个 change item
  const changes: DiffChange[] = [];
  let idx = 0;
  while (idx < ops.length) {
    if (ops[idx].type === "equal") {
      idx++;
      continue;
    }

    const oldStart = ops[idx].oldIdx;
    const newStart = ops[idx].newIdx;
    const oldParts: string[] = [];
    const newParts: string[] = [];

    while (idx < ops.length && ops[idx].type !== "equal") {
      const op = ops[idx];
      if (op.type === "remove") oldParts.push(oldLines[op.oldIdx]);
      else newParts.push(newLines[op.newIdx]);
      idx++;
    }

    const oldEnd = oldStart + oldParts.length;
    const newEnd = newStart + newParts.length;
    changes.push({
      id: `change-${changes.length + 1}`,
      type:
        oldParts.length > 0 && newParts.length > 0
          ? "replace"
          : oldParts.length > 0
            ? "delete"
            : "insert",
      oldStart,
      oldEnd,
      newStart,
      newEnd,
      oldText: oldParts.join("\n"),
      newText: newParts.join("\n"),
    });
  }

  return changes;
}

/**
 * 把用户确认后的修改应用到原始文本。
 * @param original 原始文本
 * @param accepted 每个 change 是否接受（与 changes 等长）
 */
export function applyAcceptedChanges(
  original: string,
  changes: DiffChange[],
  accepted: boolean[]
): string {
  if (changes.length !== accepted.length) {
    throw new Error("changes 与 accepted 长度不一致");
  }

  const lines = original.split("\n");

  // 从后往前应用，保证前面的行号不被破坏
  for (let k = changes.length - 1; k >= 0; k--) {
    if (!accepted[k]) continue;
    const c = changes[k];
    if (c.type === "delete" || c.type === "replace") {
      lines.splice(c.oldStart, c.oldEnd - c.oldStart);
    }
    if (c.type === "insert" || c.type === "replace") {
      const newLines = c.newText.split("\n");
      lines.splice(c.oldStart, 0, ...newLines);
    }
  }

  return lines.join("\n");
}
