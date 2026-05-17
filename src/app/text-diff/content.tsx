"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle } from "@/components/tools/controls";

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
  let removes: string[] = [];
  let adds: string[] = [];

  function flushChanges() {
    if (removes.length > 0 || adds.length > 0) {
      const removeText = removes.join("\n");
      const addText = adds.join("\n");
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
  return computeDiff(original.split(""), modified.split(""));
}

function preprocessText(
  text: string,
  options: { ignoreWhitespace: boolean; ignoreCase: boolean; ignoreBlankLines: boolean; ignoreLineEndings: boolean }
): string {
  let result = text;
  if (options.ignoreLineEndings) {
    result = result.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }
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

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
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

function InlineDiffView({
  diff,
  diffMode,
  showLineNumbers,
  changeRefs,
}: {
  diff: DiffEntry[];
  diffMode: DiffMode;
  showLineNumbers: boolean;
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
                return <span key={i} style={{ color: "var(--kami-text-muted)" }}>{entry.value}</span>;
              }
              if (entry.op === "add") {
                return (
                  <span key={i} ref={(el) => { changeRefs.current[ci] = el; }} style={addStrongStyle}>
                    {entry.value}
                  </span>
                );
              }
              return (
                <span key={i} ref={(el) => { changeRefs.current[ci] = el; }} className="line-through" style={removeStrongStyle}>
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
  let lineNum = 0;
  return (
    <div className="overflow-hidden" style={containerStyle}>
      <div className="overflow-x-auto">
        <pre className="px-4 py-3 text-sm font-mono leading-relaxed">
          {diff.map((entry, i) => {
            const isChange = entry.op !== "equal";
            if (isChange) changeIdx++;
            const ci = changeIdx;
            lineNum++;
            const lineMarker = showLineNumbers ? (
              <span
                className="select-none mr-2 tabular-nums"
                style={{ color: "var(--kami-text-dim)", width: 36, display: "inline-block", textAlign: "right" }}
              >
                {lineNum}
              </span>
            ) : null;
            if (entry.op === "equal") {
              return (
                <div key={i} style={{ color: "var(--kami-text-muted)" }}>
                  {lineMarker}
                  {"  "}
                  {entry.value}
                </div>
              );
            }
            if (entry.op === "add") {
              return (
                <div key={i} ref={(el) => { changeRefs.current[ci] = el; }} style={addStyle}>
                  {lineMarker}
                  + {entry.value}
                </div>
              );
            }
            return (
              <div key={i} ref={(el) => { changeRefs.current[ci] = el; }} style={removeStyle}>
                {lineMarker}
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
  showLineNumbers,
  changeRefs,
}: {
  diff: DiffEntry[];
  showLineNumbers: boolean;
  changeRefs: React.MutableRefObject<(HTMLElement | null)[]>;
}) {
  const left: { value: string; op: DiffOp }[] = [];
  const right: { value: string; op: DiffOp }[] = [];
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
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
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
                    ? (el) => { changeRefs.current[ci] = el; }
                    : undefined
                }
                style={lineStyle}
              >
                {showLineNumbers && (
                  <span
                    className="select-none mr-2 tabular-nums"
                    style={{
                      color: "var(--kami-text-dim)",
                      width: 36,
                      display: "inline-block",
                      textAlign: "right",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                {line.value || " "}
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
                    ? (el) => { changeRefs.current[ci] = el; }
                    : undefined
                }
                style={lineStyle}
              >
                {showLineNumbers && (
                  <span
                    className="select-none mr-2 tabular-nums"
                    style={{
                      color: "var(--kami-text-dim)",
                      width: 36,
                      display: "inline-block",
                      textAlign: "right",
                    }}
                  >
                    {i + 1}
                  </span>
                )}
                {line.value || " "}
              </div>
            );
          })}
        </pre>
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

  const [ignoreWhitespace, setIgnoreWhitespace] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [ignoreBlankLines, setIgnoreBlankLines] = useState(false);
  const [ignoreLineEndings, setIgnoreLineEndings] = useState(true);
  const [showLineNumbers, setShowLineNumbers] = useState(true);

  const [currentChangeIdx, setCurrentChangeIdx] = useState(0);
  const changeRefs = useRef<(HTMLElement | null)[]>([]);

  const diff = useMemo(() => {
    if (!original && !modified) return [];
    const procOriginal = preprocessText(original, { ignoreWhitespace, ignoreCase, ignoreBlankLines, ignoreLineEndings });
    const procModified = preprocessText(modified, { ignoreWhitespace, ignoreCase, ignoreBlankLines, ignoreLineEndings });
    if (diffMode === "char") return diffChars(procOriginal, procModified);
    if (diffMode === "word") return diffWords(procOriginal, procModified);
    return diffLines(procOriginal, procModified);
  }, [original, modified, diffMode, ignoreWhitespace, ignoreCase, ignoreBlankLines, ignoreLineEndings]);

  const totalChanges = useMemo(() => diff.filter((d) => d.op !== "equal").length, [diff]);
  const addedCount = useMemo(() => diff.filter((d) => d.op === "add").length, [diff]);
  const removedCount = useMemo(() => diff.filter((d) => d.op === "remove").length, [diff]);
  const similarity = useMemo(() => {
    const equal = diff.filter((d) => d.op === "equal").length;
    return diff.length > 0 ? Math.round((equal / diff.length) * 1000) / 10 : 100;
  }, [diff]);
  const levDist = useMemo(() => levenshteinDistance(original, modified), [original, modified]);

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

  const gitPatch = useMemo(() => {
    if (diffMode !== "line") return diffText;
    const lines: string[] = [`--- original`, `+++ modified`];
    for (const d of diff) {
      if (d.op === "equal") lines.push(` ${d.value}`);
      else if (d.op === "add") lines.push(`+${d.value}`);
      else lines.push(`-${d.value}`);
    }
    return lines.join("\n");
  }, [diff, diffMode, diffText]);

  const handleCopy = useCallback(async () => {
    if (!diffText) return;
    await navigator.clipboard.writeText(diffText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [diffText]);

  const handleExportPatch = useCallback(async () => {
    if (!gitPatch) return;
    const blob = new Blob([gitPatch], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "changes.patch";
    a.click();
    URL.revokeObjectURL(url);
  }, [gitPatch]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy diff" },
    { key: "k", meta: true, action: () => { setOriginal(""); setModified(""); }, label: "Clear" },
  ], [handleCopy, setOriginal, setModified]));

  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;

  const controls = (
    <>
      <ControlGroup label="View">
        <Segment
          value={viewMode}
          onChange={setViewMode}
          options={[
            { value: "inline", label: "Inline" },
            { value: "side-by-side", label: "Split" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Granularity">
        <Segment
          value={diffMode}
          onChange={setDiffMode}
          options={[
            { value: "line", label: "Line" },
            { value: "word", label: "Word" },
            { value: "char", label: "Char" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Ignore">
        <Toggle checked={ignoreWhitespace} onChange={setIgnoreWhitespace} label="Whitespace" />
        <Toggle checked={ignoreCase} onChange={setIgnoreCase} label="Case" />
        <Toggle checked={ignoreBlankLines} onChange={setIgnoreBlankLines} label="Blank lines" />
        <Toggle checked={ignoreLineEndings} onChange={setIgnoreLineEndings} label="Line endings" hint="CRLF → LF" />
      </ControlGroup>
      <ControlGroup label="Display">
        <Toggle checked={showLineNumbers} onChange={setShowLineNumbers} label="Line numbers" />
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleExportPatch} disabled={!diff.length}>
        Export .patch
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy} disabled={!diff.length}>
        {copied ? "Copied" : "Copy diff"}
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Text Diff"
      tagline="LCS · word + char level · ignore whitespace/case/CRLF · patch export"
      accent="#10b981"
      actions={actions}
      controls={controls}
    >
      <div className="flex flex-col gap-3 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
              Original
            </div>
            <textarea
              value={original}
              onChange={(e) => setOriginal(e.target.value)}
              placeholder="Paste original text..."
              className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
              style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
              rows={6}
              autoFocus
            />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
              Modified
            </div>
            <textarea
              value={modified}
              onChange={(e) => setModified(e.target.value)}
              placeholder="Paste modified text..."
              className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
              style={{ ...inputStyle, minHeight: 140, resize: "vertical" }}
              rows={6}
            />
          </div>
        </div>

        {/* Stats row */}
        {diff.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <span style={{ color: "#16a34a" }}>+{addedCount}</span>
            <span style={{ color: "#ef4444" }}>−{removedCount}</span>
            <span style={{ color: "var(--kami-text-muted)" }}>
              Similarity {similarity}%
            </span>
            <span style={{ color: "var(--kami-text-muted)" }}>
              Levenshtein {levDist}
            </span>
            {totalChanges > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={handlePrevChange}
                  className="kc-segment-btn"
                  style={{ minHeight: 32, minWidth: 36 }}
                  aria-label="Previous change"
                >
                  ←
                </button>
                <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {currentChangeIdx + 1}/{totalChanges}
                </span>
                <button
                  onClick={handleNextChange}
                  className="kc-segment-btn"
                  style={{ minHeight: 32, minWidth: 36 }}
                  aria-label="Next change"
                >
                  →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Diff output */}
        {diff.length > 0 &&
          (viewMode === "inline" || diffMode === "char" ? (
            <InlineDiffView
              diff={diff}
              diffMode={diffMode}
              showLineNumbers={showLineNumbers && diffMode === "line"}
              changeRefs={changeRefs}
            />
          ) : (
            <SideBySideDiffView
              diff={diff}
              showLineNumbers={showLineNumbers && diffMode === "line"}
              changeRefs={changeRefs}
            />
          ))}

        {(original || modified) && diff.length === 0 && (
          <div
            className="text-center py-8 text-sm"
            style={{ color: "var(--kami-text-dim)" }}
          >
            Texts are identical.
          </div>
        )}
      </div>
    </ToolShell>
  );
}
