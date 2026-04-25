"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Simple LCS-based diff ---

type DiffOp = "equal" | "add" | "remove";
type DiffEntry = { op: DiffOp; value: string };

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp;
}

function computeDiff(a: string[], b: string[]): DiffEntry[] {
  const dp = lcs(a, b);
  const result: DiffEntry[] = [];
  let i = a.length;
  let j = b.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ op: "equal", value: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ op: "add", value: b[j - 1] });
      j--;
    } else {
      result.push({ op: "remove", value: a[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

function diffLines(original: string, modified: string): DiffEntry[] {
  return computeDiff(original.split("\n"), modified.split("\n"));
}

function diffWords(original: string, modified: string): DiffEntry[] {
  const origLines = original.split("\n");
  const modLines = modified.split("\n");
  const lineDiff = computeDiff(origLines, modLines);

  const result: DiffEntry[] = [];
  // Collect consecutive remove/add entries to diff at word level
  let removes: string[] = [];
  let adds: string[] = [];

  function flushChanges() {
    if (removes.length > 0 || adds.length > 0) {
      const removeText = removes.join("\n");
      const addText = adds.join("\n");
      // Split into words preserving whitespace tokens
      const removeWords = removeText.split(/(\s+)/);
      const addWords = addText.split(/(\s+)/);
      const wordDiff = computeDiff(removeWords, addWords);
      for (const wd of wordDiff) {
        result.push(wd);
      }
      removes = [];
      adds = [];
    }
  }

  for (const entry of lineDiff) {
    if (entry.op === "equal") {
      flushChanges();
      result.push(entry);
    } else if (entry.op === "remove") {
      removes.push(entry.value);
    } else {
      adds.push(entry.value);
    }
  }
  flushChanges();
  return result;
}

function diffChars(original: string, modified: string): DiffEntry[] {
  const a = original.split("");
  const b = modified.split("");
  return computeDiff(a, b);
}

// --- Preprocessing for ignore options ---

function preprocessText(
  text: string,
  options: { ignoreWhitespace: boolean; ignoreCase: boolean; ignoreBlankLines: boolean }
): string {
  let result = text;
  if (options.ignoreBlankLines) {
    result = result
      .split("\n")
      .filter((line) => line.trim() !== "")
      .join("\n");
  }
  if (options.ignoreWhitespace) {
    result = result
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .join("\n");
  }
  if (options.ignoreCase) {
    result = result.toLowerCase();
  }
  return result;
}

// --- Levenshtein distance ---

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  // Use two rows to save memory
  let prev = new Array(n + 1);
  let curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j], curr[j - 1], prev[j - 1]);
      }
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

type ViewMode = "inline" | "side-by-side";
type DiffMode = "line" | "word" | "char";

function DiffStats({ diff }: { diff: DiffEntry[] }) {
  const added = diff.filter((d) => d.op === "add").length;
  const removed = diff.filter((d) => d.op === "remove").length;
  const unchanged = diff.filter((d) => d.op === "equal").length;

  return (
    <div className="flex gap-4 text-sm">
      <span style={{ color: "#16a34a" }}>+{added} added</span>
      <span style={{ color: "#ef4444" }}>-{removed} removed</span>
      <span style={{ color: "var(--kami-text-muted)" }}>{unchanged} unchanged</span>
    </div>
  );
}

function SimilarityStats({
  original,
  modified,
  diff,
  diffMode,
}: {
  original: string;
  modified: string;
  diff: DiffEntry[];
  diffMode: DiffMode;
}) {
  const { similarity, levDist } = useMemo(() => {
    const equal = diff.filter((d) => d.op === "equal").length;
    const total = diff.length;
    const sim = total > 0 ? Math.round((equal / total) * 10000) / 100 : 100;
    // Levenshtein at character level
    const lev = levenshteinDistance(original, modified);
    return { similarity: sim, levDist: lev };
  }, [original, modified, diff]);

  return (
    <div
      className="flex flex-wrap gap-4 text-sm px-4 py-3"
      style={{
        background: "var(--kami-surface-solid)",
        border: "1px solid var(--kami-border-strong)",
        borderRadius: "var(--kami-card-radius, 0.75rem)",
        boxShadow: "var(--kami-card-shadow, none)",
      }}
    >
      <div>
        <span style={{ color: "var(--kami-text-muted)" }}>Similarity: </span>
        <span className="font-medium" style={{ color: "var(--kami-text)" }}>{similarity}%</span>
        <span className="ml-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
          ({diffMode}-level)
        </span>
      </div>
      <div className="pl-4" style={{ borderLeft: "1px solid var(--kami-border-strong)" }}>
        <span style={{ color: "var(--kami-text-muted)" }}>Levenshtein distance: </span>
        <span className="font-medium" style={{ color: "var(--kami-text)" }}>
          {levDist.toLocaleString()}
        </span>
        <span className="ml-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>(char-level)</span>
      </div>
    </div>
  );
}

function InlineDiffView({
  diff,
  diffMode,
  changeRefs,
}: {
  diff: DiffEntry[];
  diffMode: DiffMode;
  changeRefs: React.MutableRefObject<(HTMLElement | null)[]>;
}) {
  const containerStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const addStyle = {
    background: "color-mix(in srgb, #16a34a 22%, var(--kami-surface-solid))",
    color: "color-mix(in srgb, #16a34a 70%, var(--kami-text))",
  } as const;
  const addStrongStyle = {
    background: "color-mix(in srgb, #16a34a 35%, var(--kami-surface-solid))",
    color: "color-mix(in srgb, #16a34a 70%, var(--kami-text))",
  } as const;
  const removeStyle = {
    background: "color-mix(in srgb, #ef4444 22%, var(--kami-surface-solid))",
    color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))",
  } as const;
  const removeStrongStyle = {
    background: "color-mix(in srgb, #ef4444 35%, var(--kami-surface-solid))",
    color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))",
  } as const;

  if (diffMode === "char") {
    let changeIdx = -1;
    return (
      <div className="overflow-hidden" style={containerStyle}>
        <div className="overflow-x-auto">
          <pre className="px-4 py-3 text-sm font-mono leading-relaxed whitespace-pre-wrap break-all">
            {diff.map((entry, i) => {
              const isChange = entry.op !== "equal";
              if (isChange) changeIdx++;
              const ci = changeIdx;
              if (entry.op === "equal") {
                return (
                  <span key={i} style={{ color: "var(--kami-text-muted)" }}>
                    {entry.value}
                  </span>
                );
              }
              if (entry.op === "add") {
                return (
                  <span
                    key={i}
                    ref={(el) => {
                      changeRefs.current[ci] = el;
                    }}
                    style={addStrongStyle}
                  >
                    {entry.value}
                  </span>
                );
              }
              return (
                <span
                  key={i}
                  ref={(el) => {
                    changeRefs.current[ci] = el;
                  }}
                  className="line-through"
                  style={removeStrongStyle}
                >
                  {entry.value}
                </span>
              );
            })}
          </pre>
        </div>
      </div>
    );
  }

  let changeIdx = -1;
  return (
    <div className="overflow-hidden" style={containerStyle}>
      <div className="overflow-x-auto">
        <pre className="px-4 py-3 text-sm font-mono leading-relaxed">
          {diff.map((entry, i) => {
            const isChange = entry.op !== "equal";
            if (isChange) changeIdx++;
            const ci = changeIdx;
            if (entry.op === "equal") {
              return (
                <div key={i} style={{ color: "var(--kami-text-muted)" }}>
                  {"  "}
                  {entry.value}
                </div>
              );
            }
            if (entry.op === "add") {
              return (
                <div
                  key={i}
                  ref={(el) => {
                    changeRefs.current[ci] = el;
                  }}
                  style={addStyle}
                >
                  + {entry.value}
                </div>
              );
            }
            return (
              <div
                key={i}
                ref={(el) => {
                  changeRefs.current[ci] = el;
                }}
                style={removeStyle}
              >
                - {entry.value}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

function SideBySideDiffView({
  diff,
  changeRefs,
}: {
  diff: DiffEntry[];
  changeRefs: React.MutableRefObject<(HTMLElement | null)[]>;
}) {
  const left: { value: string; op: DiffOp }[] = [];
  const right: { value: string; op: DiffOp }[] = [];
  // Track which rows in left/right correspond to a change for ref assignment
  const leftChangeIndices: (number | null)[] = [];
  const rightChangeIndices: (number | null)[] = [];

  let li = 0;
  let ri = 0;
  let changeIdx = 0;

  for (const entry of diff) {
    if (entry.op === "equal") {
      while (li < left.length && ri < right.length) {
        li++;
        ri++;
      }
      while (left.length > right.length) {
        right.push({ value: "", op: "equal" });
        rightChangeIndices.push(null);
      }
      while (right.length > left.length) {
        left.push({ value: "", op: "equal" });
        leftChangeIndices.push(null);
      }
      left.push({ value: entry.value, op: "equal" });
      leftChangeIndices.push(null);
      right.push({ value: entry.value, op: "equal" });
      rightChangeIndices.push(null);
      li = left.length;
      ri = right.length;
    } else if (entry.op === "remove") {
      left.push({ value: entry.value, op: "remove" });
      leftChangeIndices.push(changeIdx);
      changeIdx++;
    } else {
      right.push({ value: entry.value, op: "add" });
      rightChangeIndices.push(changeIdx);
      changeIdx++;
    }
  }

  while (left.length < right.length) {
    left.push({ value: "", op: "equal" });
    leftChangeIndices.push(null);
  }
  while (right.length < left.length) {
    right.push({ value: "", op: "equal" });
    rightChangeIndices.push(null);
  }

  const panelStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const headerStyle = {
    borderBottom: "1px solid var(--kami-border)",
    color: "var(--kami-text-muted)",
  } as const;
  const addRow = {
    background: "color-mix(in srgb, #16a34a 22%, var(--kami-surface-solid))",
    color: "color-mix(in srgb, #16a34a 70%, var(--kami-text))",
  } as const;
  const removeRow = {
    background: "color-mix(in srgb, #ef4444 22%, var(--kami-surface-solid))",
    color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))",
  } as const;

  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="overflow-hidden" style={panelStyle}>
        <div className="px-3 py-2 text-xs font-medium" style={headerStyle}>
          Original
        </div>
        <pre className="px-4 py-3 text-sm font-mono leading-relaxed overflow-x-auto">
          {left.map((line, i) => {
            const ci = leftChangeIndices[i];
            const isEmpty = line.value === "";
            const lineStyle =
              line.op === "remove"
                ? removeRow
                : isEmpty
                  ? { color: "transparent" }
                  : { color: "var(--kami-text-muted)" };
            return (
              <div
                key={i}
                ref={
                  ci !== null
                    ? (el) => {
                        changeRefs.current[ci] = el;
                      }
                    : undefined
                }
                className={isEmpty && line.op !== "remove" ? "select-none" : ""}
                style={lineStyle}
              >
                {line.value || "\u00A0"}
              </div>
            );
          })}
        </pre>
      </div>
      <div className="overflow-hidden" style={panelStyle}>
        <div className="px-3 py-2 text-xs font-medium" style={headerStyle}>
          Modified
        </div>
        <pre className="px-4 py-3 text-sm font-mono leading-relaxed overflow-x-auto">
          {right.map((line, i) => {
            const ci = rightChangeIndices[i];
            const isEmpty = line.value === "";
            const lineStyle =
              line.op === "add"
                ? addRow
                : isEmpty
                  ? { color: "transparent" }
                  : { color: "var(--kami-text-muted)" };
            return (
              <div
                key={i}
                ref={
                  ci !== null
                    ? (el) => {
                        changeRefs.current[ci] = el;
                      }
                    : undefined
                }
                className={isEmpty && line.op !== "add" ? "select-none" : ""}
                style={lineStyle}
              >
                {line.value || "\u00A0"}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
}

// --- Drag-drop text area ---

function DragDropTextarea({
  value,
  onChange,
  placeholder,
  label,
  autoFocus,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
}) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          onChange(text);
        }
      };
      reader.readAsText(file);
    },
    [onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
          {label}
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="text-xs transition-colors px-2 py-0.5"
          style={{
            color: "var(--kami-text-dim)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-cta-radius, 0.375rem)",
          }}
        >
          Upload
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      <div
        className="relative transition-all"
        style={{
          background: dragging ? "var(--kami-surface)" : "var(--kami-surface-solid)",
          border: dragging
            ? "1px solid var(--kami-text-muted)"
            : "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-input-radius, 0.75rem)",
          boxShadow: "var(--kami-card-shadow, none)",
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent px-4 py-3 text-base focus:outline-none font-mono text-sm resize-y"
          style={{
            color: "var(--kami-text)",
            borderRadius: "var(--kami-input-radius, 0.75rem)",
          }}
          rows={8}
          autoFocus={autoFocus}
        />
        {dragging && (
          <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{
              background: "color-mix(in srgb, var(--kami-surface) 80%, transparent)",
              borderRadius: "var(--kami-input-radius, 0.75rem)",
            }}
          >
            <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
              Drop file here
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TextDiffContent() {
  const [toolState, setToolState] = useToolState({ a: "", b: "" });
  const original = toolState.a;
  const modified = toolState.b;
  const setOriginal = useCallback((v: string) => setToolState({ a: v }), [setToolState]);
  const setModified = useCallback((v: string) => setToolState({ b: v }), [setToolState]);
  const [viewMode, setViewMode] = useState<ViewMode>("inline");
  const [diffMode, setDiffMode] = useState<DiffMode>("line");
  const [copied, setCopied] = useState(false);

  // Ignore options
  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreBlankLines, setIgnoreBlankLines] = useState(false);

  // Change navigation
  const [currentChangeIdx, setCurrentChangeIdx] = useState(0);
  const changeRefs = useRef<(HTMLElement | null)[]>([]);

  const diff = useMemo(() => {
    if (!original && !modified) return [];

    const procOriginal = preprocessText(original, {
      ignoreWhitespace,
      ignoreCase,
      ignoreBlankLines,
    });
    const procModified = preprocessText(modified, {
      ignoreWhitespace,
      ignoreCase,
      ignoreBlankLines,
    });

    if (diffMode === "char") {
      return diffChars(procOriginal, procModified);
    }
    if (diffMode === "word") {
      return diffWords(procOriginal, procModified);
    }
    return diffLines(procOriginal, procModified);
  }, [original, modified, diffMode, ignoreWhitespace, ignoreCase, ignoreBlankLines]);

  const totalChanges = useMemo(
    () => diff.filter((d) => d.op !== "equal").length,
    [diff]
  );

  // Reset refs array size and current index when diff changes
  useEffect(() => {
    changeRefs.current = new Array(totalChanges).fill(null);
    setCurrentChangeIdx(0);
  }, [totalChanges]);

  const scrollToChange = useCallback(
    (idx: number) => {
      if (idx < 0 || idx >= totalChanges) return;
      setCurrentChangeIdx(idx);
      const el = changeRefs.current[idx];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Brief highlight flash
        el.style.outline = "2px solid var(--kami-text)";
        el.style.outlineOffset = "1px";
        setTimeout(() => {
          el.style.outline = "";
          el.style.outlineOffset = "";
        }, 1200);
      }
    },
    [totalChanges]
  );

  const handlePrevChange = useCallback(() => {
    const next = currentChangeIdx > 0 ? currentChangeIdx - 1 : totalChanges - 1;
    scrollToChange(next);
  }, [currentChangeIdx, totalChanges, scrollToChange]);

  const handleNextChange = useCallback(() => {
    const next = currentChangeIdx < totalChanges - 1 ? currentChangeIdx + 1 : 0;
    scrollToChange(next);
  }, [currentChangeIdx, totalChanges, scrollToChange]);

  const diffText = useMemo(() => {
    return diff
      .map((d) => {
        if (d.op === "equal") return `  ${d.value}`;
        if (d.op === "add") return `+ ${d.value}`;
        return `- ${d.value}`;
      })
      .join(diffMode === "char" ? "" : "\n");
  }, [diff, diffMode]);

  const handleCopy = useCallback(async () => {
    if (!diffText) return;
    await navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diffText]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy diff" },
    { key: "k", meta: true, action: () => { setOriginal(""); setModified(""); }, label: "Clear" },
  ], [handleCopy]));

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Text Diff"
          tagline="Paste two versions of anything - docs, emails, code - and see a line-by-line diff with word-level highlighting."
          description="Side-by-side or unified view, word-level diffs (not just lines), case-insensitive and whitespace-insensitive toggles, and stats showing how many lines were added, removed, or changed. Works on any text - copy/pasted docs, SQL, JSON, email drafts, chapter revisions."
          audience={["Developers", "Writers", "Editors", "Lawyers"]}
          whenToUse={[
            "Reviewing edits to a document",
            "Comparing two SQL queries or config files",
            "Spotting subtle changes before publishing a revision",
          ]}
        />

        {/* Input textareas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <DragDropTextarea
            value={original}
            onChange={setOriginal}
            placeholder="Paste original text or drop a .txt file..."
            label="Original"
            autoFocus
          />
          <DragDropTextarea
            value={modified}
            onChange={setModified}
            placeholder="Paste modified text or drop a .txt file..."
            label="Modified"
          />
        </div>

        {/* Ignore options */}
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Ignore:</span>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none" style={{ color: "var(--kami-text-muted)" }}>
            <input
              type="checkbox"
              checked={ignoreWhitespace}
              onChange={(e) => setIgnoreWhitespace(e.target.checked)}
              className="h-3.5 w-3.5"
              style={{ accentColor: "var(--kami-text)" }}
            />
            Whitespace
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none" style={{ color: "var(--kami-text-muted)" }}>
            <input
              type="checkbox"
              checked={ignoreCase}
              onChange={(e) => setIgnoreCase(e.target.checked)}
              className="h-3.5 w-3.5"
              style={{ accentColor: "var(--kami-text)" }}
            />
            Case
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer select-none" style={{ color: "var(--kami-text-muted)" }}>
            <input
              type="checkbox"
              checked={ignoreBlankLines}
              onChange={(e) => setIgnoreBlankLines(e.target.checked)}
              className="h-3.5 w-3.5"
              style={{ accentColor: "var(--kami-text)" }}
            />
            Blank lines
          </label>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            {/* View mode toggle */}
            <div
              className="flex overflow-hidden"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              <button
                onClick={() => setViewMode("inline")}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={
                  viewMode === "inline"
                    ? { background: "var(--kami-cta-bg)", color: "var(--kami-cta-text)" }
                    : { color: "var(--kami-text-muted)" }
                }
              >
                Inline
              </button>
              <button
                onClick={() => setViewMode("side-by-side")}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={
                  viewMode === "side-by-side"
                    ? { background: "var(--kami-cta-bg)", color: "var(--kami-cta-text)" }
                    : { color: "var(--kami-text-muted)" }
                }
              >
                Side by side
              </button>
            </div>

            {/* Diff mode toggle */}
            <div
              className="flex overflow-hidden"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              <button
                onClick={() => setDiffMode("line")}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={
                  diffMode === "line"
                    ? { background: "var(--kami-cta-bg)", color: "var(--kami-cta-text)" }
                    : { color: "var(--kami-text-muted)" }
                }
              >
                Line
              </button>
              <button
                onClick={() => setDiffMode("word")}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={
                  diffMode === "word"
                    ? { background: "var(--kami-cta-bg)", color: "var(--kami-cta-text)" }
                    : { color: "var(--kami-text-muted)" }
                }
              >
                Word
              </button>
              <button
                onClick={() => setDiffMode("char")}
                className="px-3 py-1.5 text-sm font-medium transition-colors"
                style={
                  diffMode === "char"
                    ? { background: "var(--kami-cta-bg)", color: "var(--kami-cta-text)" }
                    : { color: "var(--kami-text-muted)" }
                }
              >
                Char
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {diff.length > 0 && <DiffStats diff={diff} />}
            {diff.length > 0 && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  background: "var(--kami-cta-bg)",
                  color: "var(--kami-cta-text)",
                  borderRadius: "var(--kami-cta-radius, 0.5rem)",
                }}
              >
                {copied ? "Copied!" : "Copy diff"}
              </button>
            )}
          </div>
        </div>

        {/* Similarity & Levenshtein stats */}
        {diff.length > 0 && (
          <div className="mb-4">
            <SimilarityStats
              original={original}
              modified={modified}
              diff={diff}
              diffMode={diffMode}
            />
          </div>
        )}

        {/* Change navigation */}
        {totalChanges > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handlePrevChange}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: "var(--kami-surface-solid)",
                color: "var(--kami-text-muted)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              &larr; Prev
            </button>
            <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
              Change {currentChangeIdx + 1} of {totalChanges}
            </span>
            <button
              onClick={handleNextChange}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: "var(--kami-surface-solid)",
                color: "var(--kami-text-muted)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              Next &rarr;
            </button>
          </div>
        )}

        {/* Diff output */}
        {diff.length > 0 &&
          (viewMode === "inline" || diffMode === "char" ? (
            <InlineDiffView
              diff={diff}
              diffMode={diffMode}
              changeRefs={changeRefs}
            />
          ) : (
            <SideBySideDiffView diff={diff} changeRefs={changeRefs} />
          ))}

        {(original || modified) && diff.length === 0 && (
          <div className="text-center py-8 text-sm" style={{ color: "var(--kami-text-dim)" }}>
            Texts are identical.
          </div>
        )}

        {/* Footer */}
      </div>
    </div>
  );
}
