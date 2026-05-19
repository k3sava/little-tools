"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle } from "@/components/tools/controls";

// --- Cleaning operations ---

type CleanOp =
  | "extraSpaces"
  | "extraLineBreaks"
  | "specialChars"
  | "trimLines"
  | "duplicateLines"
  | "sortLines"
  | "stripHtml"
  | "smartQuotes"
  | "normalizeUnicode"
  | "removeUrlsEmails";

const OPERATIONS: { value: CleanOp; label: string; description: string }[] = [
  {
    value: "extraSpaces",
    label: "Collapse extra spaces",
    description: "Multiple spaces → one",
  },
  {
    value: "extraLineBreaks",
    label: "Remove extra blank lines",
    description: "Collapse 3+ newlines",
  },
  {
    value: "specialChars",
    label: "Strip special characters",
    description: "Keep alphanumeric only",
  },
  {
    value: "trimLines",
    label: "Trim each line",
    description: "Drop leading/trailing spaces",
  },
  {
    value: "duplicateLines",
    label: "Remove duplicate lines",
    description: "First occurrence wins",
  },
  {
    value: "sortLines",
    label: "Sort lines A → Z",
    description: "Alphabetical order",
  },
  {
    value: "stripHtml",
    label: "Strip HTML tags",
    description: "Keep inner text only",
  },
  {
    value: "smartQuotes",
    label: "Smart → straight quotes",
    description: '“”‘’ → " and \'',
  },
  {
    value: "normalizeUnicode",
    label: "Normalize Unicode",
    description: "Em/en dashes, ellipsis → ASCII",
  },
  {
    value: "removeUrlsEmails",
    label: "Remove URLs & emails",
    description: "Strip links and email addresses",
  },
];

function cleanText(text: string, ops: Set<CleanOp>): string {
  if (!text) return "";
  let result = text;

  if (ops.has("stripHtml")) {
    result = result.replace(/<[^>]*>/g, "");
  }

  if (ops.has("smartQuotes")) {
    result = result
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'");
  }

  if (ops.has("normalizeUnicode")) {
    result = result
      .replace(/—/g, "--")
      .replace(/–/g, "-")
      .replace(/…/g, "...")
      .replace(/•/g, "*")
      .replace(/ /g, " ")
      .replace(/’/g, "'")
      .replace(/‚/g, ",")
      .replace(/«/g, "<<")
      .replace(/»/g, ">>")
      .replace(/‐/g, "-")
      .replace(/‑/g, "-")
      .replace(/‒/g, "-")
      .replace(/·/g, "*")
      .replace(/‧/g, "*");
  }

  if (ops.has("removeUrlsEmails")) {
    result = result.replace(/https?:\/\/[^\s]+/g, "");
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "");
  }

  if (ops.has("trimLines")) {
    result = result
      .split("\n")
      .map((line) => line.trim())
      .join("\n");
  }

  if (ops.has("extraSpaces")) {
    result = result.replace(/[^\S\n]{2,}/g, " ");
  }

  if (ops.has("extraLineBreaks")) {
    result = result.replace(/\n{3,}/g, "\n\n");
  }

  if (ops.has("specialChars")) {
    result = result.replace(/[^\w\s]/g, "");
  }

  if (ops.has("duplicateLines")) {
    const seen = new Set<string>();
    result = result
      .split("\n")
      .filter((line) => {
        if (seen.has(line)) return false;
        seen.add(line);
        return true;
      })
      .join("\n");
  }

  if (ops.has("sortLines")) {
    const lines = result.split("\n");
    const nonEmpty = lines.filter((l) => l.trim());
    const sorted = nonEmpty.sort((a, b) => a.localeCompare(b));
    result = sorted.join("\n");
  }

  return result;
}

// --- Diff computation ---

interface DiffSegment {
  type: "same" | "removed" | "added";
  text: string;
}

function computeInlineDiff(original: string, modified: string): DiffSegment[] {
  if (original === modified) return [{ type: "same", text: original }];

  const maxLen = 5000;
  const a = original.length > maxLen ? original.slice(0, maxLen) : original;
  const b = modified.length > maxLen ? modified.slice(0, maxLen) : modified;

  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const ops: Array<{ type: "same" | "removed" | "added"; char: string }> = [];
  let ai = m;
  let bi = n;

  while (ai > 0 || bi > 0) {
    if (ai > 0 && bi > 0 && a[ai - 1] === b[bi - 1]) {
      ops.push({ type: "same", char: a[ai - 1] });
      ai--;
      bi--;
    } else if (bi > 0 && (ai === 0 || dp[ai][bi - 1] >= dp[ai - 1][bi])) {
      ops.push({ type: "added", char: b[bi - 1] });
      bi--;
    } else {
      ops.push({ type: "removed", char: a[ai - 1] });
      ai--;
    }
  }

  ops.reverse();

  const segments: DiffSegment[] = [];
  for (const op of ops) {
    if (segments.length > 0 && segments[segments.length - 1].type === op.type) {
      segments[segments.length - 1].text += op.char;
    } else {
      segments.push({ type: op.type, text: op.char });
    }
  }

  return segments;
}

// --- UI ---

type View = "diff" | "before" | "after";

export default function TextCleanerContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [ops, setOps] = useState<Set<CleanOp>>(
    new Set<CleanOp>(["extraSpaces", "extraLineBreaks", "trimLines"])
  );
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState<View>("diff");

  const toggleOp = useCallback((op: CleanOp) => {
    setOps((prev) => {
      const next = new Set(prev);
      if (next.has(op)) next.delete(op);
      else next.add(op);
      return next;
    });
  }, []);

  const output = useMemo(() => cleanText(input, ops), [input, ops]);

  const lineCount = input ? input.split("\n").length : 0;
  const charCount = input.length;
  const removedBytes = input.length - output.length;
  const hasChanges = input && output !== input;

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy" },
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [handleCopy, setInput]));

  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMetro = currentTheme === "metro";
  const isGlass    = currentTheme === "glass";

  const diffSegments = useMemo(() => {
    if (!hasChanges) return null;
    if (input.length > 5000) return null;
    return computeInlineDiff(input, output);
  }, [input, output, hasChanges]);

  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;

  const enableAll = () => setOps(new Set(OPERATIONS.map((o) => o.value)));
  const disableAll = () => setOps(new Set());

  const controls = (
    <>
      <ControlGroup label="View">
        <Segment
          value={view}
          onChange={setView}
          options={[
            { value: "before", label: "Before" },
            { value: "after", label: "After" },
            { value: "diff", label: "Diff" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup
        label="Cleaning rules"
        hint={`${ops.size}/${OPERATIONS.length} on`}
      >
        <div className="flex flex-col gap-2">
          {OPERATIONS.map((op) => (
            <Toggle
              key={op.value}
              checked={ops.has(op.value)}
              onChange={() => toggleOp(op.value)}
              label={op.label}
              hint={op.description}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={enableAll}
            className="kc-segment-btn"
            style={{ flex: 1, minHeight: 40 }}
          >
            Enable all
          </button>
          <button
            type="button"
            onClick={disableAll}
            className="kc-segment-btn"
            style={{ flex: 1, minHeight: 40 }}
          >
            Disable all
          </button>
        </div>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={() => setInput("")}>
        Clear
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy} disabled={!output}>
        {copied ? "Copied" : "Copy"}
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Text Cleaner"
      tagline="Smart quotes · whitespace · HTML strip · unicode normalize"
      accent="#6366f1"
      materialFab={{ label: "Copy", onClick: handleCopy }}
      actions={actions}
      controls={controls}
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Input</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>
      )}
      <div className="flex flex-col gap-3 p-4 md:p-6">
        {(!isMetro || metroCPivot === "input") && (<div className={isGlass ? "glass-canvas-section" : ""}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your messy text here..."
          className="w-full px-4 py-3 text-base focus:outline-none font-mono"
          style={{ ...inputStyle, minHeight: 160 }}
          rows={6}
          autoFocus
        />

        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--kami-text-dim)" }}
        >
          <span>
            {lineCount} {lineCount === 1 ? "line" : "lines"} · {charCount} chars
          </span>
          {removedBytes !== 0 && (
            <span
              style={{
                color:
                  removedBytes > 0
                    ? "color-mix(in srgb, #16a34a 70%, var(--kami-text))"
                    : "color-mix(in srgb, #ef4444 70%, var(--kami-text))",
              }}
            >
              {removedBytes > 0 ? `−${removedBytes}` : `+${Math.abs(removedBytes)}`} bytes
            </span>
          )}
        </div>
        </div>)}

        {(!isMetro || metroCPivot === "output") && (<div className={isGlass ? "glass-canvas-section" : ""}>
        {/* Output area */}
        {input && (view === "after" || (!hasChanges && view === "diff")) && (
          <div
            className="whitespace-pre-wrap px-4 py-3 text-base overflow-auto"
            style={{ ...cardStyle, minHeight: 160 }}
          >
            {output}
          </div>
        )}
        {input && view === "before" && (
          <div
            className="whitespace-pre-wrap px-4 py-3 text-base overflow-auto font-mono"
            style={{ ...cardStyle, minHeight: 160 }}
          >
            {input}
          </div>
        )}
        {hasChanges && view === "diff" && diffSegments && (
          <div
            className="whitespace-pre-wrap px-4 py-3 text-base overflow-auto"
            style={{ ...cardStyle, minHeight: 160 }}
          >
            {diffSegments.map((seg, i) => {
              if (seg.type === "removed") {
                return (
                  <span
                    key={i}
                    className="line-through"
                    style={{
                      background: "color-mix(in srgb, #ef4444 22%, var(--kami-surface-solid))",
                      color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))",
                    }}
                  >
                    {seg.text}
                  </span>
                );
              }
              if (seg.type === "added") {
                return (
                  <span
                    key={i}
                    style={{
                      background: "color-mix(in srgb, #16a34a 22%, var(--kami-surface-solid))",
                      color: "color-mix(in srgb, #16a34a 70%, var(--kami-text))",
                    }}
                  >
                    {seg.text}
                  </span>
                );
              }
              return <span key={i}>{seg.text}</span>;
            })}
          </div>
        )}
        </div>)}
      </div>
    </ToolShell>
  );
}
