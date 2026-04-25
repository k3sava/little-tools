"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

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
    label: "Remove extra spaces",
    description: "Collapse multiple spaces into one",
  },
  {
    value: "extraLineBreaks",
    label: "Remove extra line breaks",
    description: "Collapse multiple blank lines into one",
  },
  {
    value: "specialChars",
    label: "Remove special characters",
    description: "Strip non-alphanumeric characters (keeps spaces and newlines)",
  },
  {
    value: "trimLines",
    label: "Trim whitespace per line",
    description: "Remove leading and trailing spaces from each line",
  },
  {
    value: "duplicateLines",
    label: "Remove duplicate lines",
    description: "Keep only the first occurrence of each line",
  },
  {
    value: "sortLines",
    label: "Sort lines alphabetically",
    description: "Sort all non-empty lines A \u2192 Z",
  },
  {
    value: "stripHtml",
    label: "Strip HTML tags",
    description: "Remove all HTML tags, keep inner text",
  },
  {
    value: "smartQuotes",
    label: "Smart quotes \u2192 straight quotes",
    description: 'Convert \u201c\u201d\u2018\u2019 to straight " and \'',
  },
  {
    value: "normalizeUnicode",
    label: "Normalize Unicode",
    description: "Replace em dash, en dash, ellipsis, bullet with ASCII equivalents",
  },
  {
    value: "removeUrlsEmails",
    label: "Remove URLs & emails",
    description: "Strip http/https links and email addresses",
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
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'");
  }

  if (ops.has("normalizeUnicode")) {
    result = result
      .replace(/\u2014/g, "--")   // em dash
      .replace(/\u2013/g, "-")    // en dash
      .replace(/\u2026/g, "...")   // ellipsis
      .replace(/\u2022/g, "*")    // bullet
      .replace(/\u00A0/g, " ")    // non-breaking space
      .replace(/\u2019/g, "'")    // right single quote (as apostrophe)
      .replace(/\u201A/g, ",")    // single low-9 quote
      .replace(/\u00AB/g, "<<")   // left guillemet
      .replace(/\u00BB/g, ">>")   // right guillemet
      .replace(/\u2010/g, "-")    // hyphen
      .replace(/\u2011/g, "-")    // non-breaking hyphen
      .replace(/\u2012/g, "-")    // figure dash
      .replace(/\u00B7/g, "*")    // middle dot
      .replace(/\u2027/g, "*");   // hyphenation point
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

  // Build LCS table
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

  // Trace back
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

  // Merge consecutive
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

export default function TextCleanerContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [ops, setOps] = useState<Set<CleanOp>>(
    new Set<CleanOp>(["extraSpaces", "extraLineBreaks", "trimLines"])
  );
  const [copied, setCopied] = useState(false);

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
  ], [handleCopy]));

  // Diff segments
  const diffSegments = useMemo(() => {
    if (!hasChanges) return null;
    if (input.length > 5000) return null;
    return computeInlineDiff(input, output);
  }, [input, output, hasChanges]);

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const ctaStyle = {
    background: "var(--kami-cta-bg)",
    color: "var(--kami-cta-text)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Text Cleaner"
          tagline="One-click fixes for messy pasted text - smart quotes, double spaces, zero-width characters, weird line endings."
          description="Paste text from anywhere (a PDF, a Word doc, a chat log) and toggle the fixes you want: convert smart quotes to straight, collapse multiple spaces, remove zero-width characters, normalize line endings, strip markdown, and more. Preview updates live; copy the cleaned output with one click."
          audience={["Writers", "Editors", "Developers", "Support"]}
          whenToUse={[
            "Pasting copy from Word or a PDF into a CMS",
            "Scrubbing invisible characters from a support ticket",
            "Normalizing line breaks before diffing two files",
          ]}
        />

        {/* Operation toggles */}
        <div className="mb-4 space-y-2">
          {OPERATIONS.map((op) => (
            <label
              key={op.value}
              className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              <input
                type="checkbox"
                checked={ops.has(op.value)}
                onChange={() => toggleOp(op.value)}
                className="mt-0.5 h-4 w-4"
                style={{ accentColor: "var(--kami-text)" }}
              />
              <div>
                <span className="text-sm font-medium">{op.label}</span>
                <span className="ml-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                  {op.description}
                </span>
              </div>
            </label>
          ))}
        </div>

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your messy text here..."
          className="w-full px-4 py-3 text-base focus:outline-none"
          style={inputStyle}
          rows={6}
          autoFocus
        />

        {/* Stats */}
        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
          <span>
            {lineCount} {lineCount === 1 ? "line" : "lines"} · {charCount}{" "}
            {charCount === 1 ? "character" : "characters"}
          </span>
          {input && (
            <button onClick={() => setInput("")}>
              Clear
            </button>
          )}
        </div>

        {/* Output */}
        {output && input && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Cleaned result
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
                style={ctaStyle}
              >
                {copied ? (
                  <>
                    <CheckIcon />
                    Copied
                  </>
                ) : (
                  <>
                    <CopyIcon />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="whitespace-pre-wrap px-4 py-3 text-base" style={cardStyle}>
              {output}
            </div>
          </div>
        )}

        {/* Preview diff */}
        {hasChanges && diffSegments && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Changes
                <span className="ml-2 text-xs font-normal" style={{ color: "var(--kami-text-dim)" }}>
                  removed / added
                </span>
              </span>
            </div>
            <div className="whitespace-pre-wrap px-4 py-3 text-base max-h-64 overflow-y-auto" style={cardStyle}>
              {diffSegments.map((seg, i) => {
                if (seg.type === "removed") {
                  return (
                    <span
                      key={i}
                      className="bg-red-100 text-red-700 line-through"
                    >
                      {seg.text}
                    </span>
                  );
                }
                if (seg.type === "added") {
                  return (
                    <span key={i} className="bg-green-100 text-green-700">
                      {seg.text}
                    </span>
                  );
                }
                return <span key={i}>{seg.text}</span>;
              })}
            </div>
          </div>
        )}

        {/* Footer */}
      </div>
    </div>
  );
}

// Inline SVG icons

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
