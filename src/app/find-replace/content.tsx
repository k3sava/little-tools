"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Types ---

interface MatchResult {
  output: string;
  matchCount: number;
  error: string | null;
}

interface Rule {
  id: string;
  find: string;
  replace: string;
}

interface DiffSegment {
  type: "same" | "removed" | "added";
  text: string;
}

// --- Regex library ---

const REGEX_LIBRARY = [
  { label: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
  { label: "URL", pattern: "https?://[^\\s]+" },
  { label: "Phone", pattern: "\\+?[\\d\\s\\-()]{7,}" },
  { label: "Date", pattern: "\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}" },
  { label: "IP Address", pattern: "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" },
  { label: "Whitespace", pattern: "\\s+" },
];

// --- Find & Replace logic ---

function buildRegex(
  find: string,
  isRegex: boolean,
  caseSensitive: boolean,
  global: boolean
): RegExp | null {
  if (!find) return null;
  const pattern = isRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const flags = (global ? "g" : "") + (caseSensitive ? "" : "i");
  try {
    return new RegExp(pattern, flags);
  } catch {
    return null;
  }
}

function findAndReplace(
  text: string,
  find: string,
  replace: string,
  isRegex: boolean,
  caseSensitive: boolean,
  replaceAll: boolean
): MatchResult {
  if (!text || !find) return { output: text, matchCount: 0, error: null };

  const countRegex = buildRegex(find, isRegex, caseSensitive, true);
  if (!countRegex) {
    return { output: text, matchCount: 0, error: "Invalid regex pattern" };
  }

  const matches = text.match(countRegex);
  const matchCount = matches ? matches.length : 0;

  const replaceRegex = buildRegex(find, isRegex, caseSensitive, replaceAll);
  if (!replaceRegex) {
    return { output: text, matchCount, error: "Invalid regex pattern" };
  }

  const output = text.replace(replaceRegex, replace);
  return { output, matchCount, error: null };
}

function batchReplace(
  text: string,
  rules: Rule[],
  isRegex: boolean,
  caseSensitive: boolean
): MatchResult {
  if (!text) return { output: text, matchCount: 0, error: null };
  let result = text;
  let totalMatches = 0;

  for (const rule of rules) {
    if (!rule.find) continue;
    const r = findAndReplace(result, rule.find, rule.replace, isRegex, caseSensitive, true);
    if (r.error) return { output: text, matchCount: 0, error: `Rule "${rule.find}": ${r.error}` };
    totalMatches += r.matchCount;
    result = r.output;
  }

  return { output: result, matchCount: totalMatches, error: null };
}

// --- Diff computation ---

function computeDiff(original: string, modified: string): DiffSegment[] {
  if (original === modified) return [{ type: "same", text: original }];

  const segments: DiffSegment[] = [];
  // Simple LCS-based character diff
  const lcs = buildLCS(original, modified);

  // Trace back through LCS to build diff
  const ops: Array<{ type: "same" | "removed" | "added"; char: string }> = [];

  let a = original.length;
  let b = modified.length;

  while (a > 0 || b > 0) {
    if (a > 0 && b > 0 && original[a - 1] === modified[b - 1]) {
      ops.push({ type: "same", char: original[a - 1] });
      a--;
      b--;
    } else if (b > 0 && (a === 0 || (lcs[a] && lcs[a][b - 1] >= (lcs[a - 1]?.[b] ?? 0)))) {
      ops.push({ type: "added", char: modified[b - 1] });
      b--;
    } else {
      ops.push({ type: "removed", char: original[a - 1] });
      a--;
    }
  }

  ops.reverse();

  // Merge consecutive ops of same type
  for (const op of ops) {
    if (segments.length > 0 && segments[segments.length - 1].type === op.type) {
      segments[segments.length - 1].text += op.char;
    } else {
      segments.push({ type: op.type, text: op.char });
    }
  }

  return segments;
}

function buildLCS(a: string, b: string): number[][] {
  // For very long strings, truncate diff to avoid perf issues
  const maxLen = 5000;
  const sa = a.length > maxLen ? a.slice(0, maxLen) : a;
  const sb = b.length > maxLen ? b.slice(0, maxLen) : b;

  const m = sa.length;
  const n = sb.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (sa[i - 1] === sb[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp;
}

// --- Highlight matches ---

function getHighlightedSegments(
  text: string,
  find: string,
  isRegex: boolean,
  caseSensitive: boolean
): Array<{ text: string; highlighted: boolean }> {
  if (!text || !find) return [{ text, highlighted: false }];

  const regex = buildRegex(find, isRegex, caseSensitive, true);
  if (!regex) return [{ text, highlighted: false }];

  const segments: Array<{ text: string; highlighted: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex
  regex.lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), highlighted: false });
    }
    segments.push({ text: match[0], highlighted: true });
    lastIndex = match.index + match[0].length;
    if (match[0].length === 0) {
      regex.lastIndex++;
    }
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), highlighted: false });
  }

  return segments.length > 0 ? segments : [{ text, highlighted: false }];
}

// --- UI ---

let ruleIdCounter = 0;
function nextRuleId() {
  return `rule-${++ruleIdCounter}`;
}

export default function FindReplaceContent() {
  const [input, setInput] = useState("");
  const [toolState, setToolState] = useToolState({ find: "", replace: "" });
  const find = toolState.find;
  const replace = toolState.replace;
  const setFind = useCallback((v: string) => setToolState({ find: v }), [setToolState]);
  const setReplace = useCallback((v: string) => setToolState({ replace: v }), [setToolState]);
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(true);
  const [replaceAllMode, setReplaceAllMode] = useState(true);
  const [copied, setCopied] = useState(false);

  // Batch rules mode
  const [mode, setMode] = useState<"single" | "rules">("single");
  const [rules, setRules] = useState<Rule[]>([
    { id: nextRuleId(), find: "", replace: "" },
    { id: nextRuleId(), find: "", replace: "" },
  ]);

  // Regex library
  const [showRegexLib, setShowRegexLib] = useState(false);

  // Preview diff
  const [showPreview, setShowPreview] = useState(true);

  // Single mode result
  const result = useMemo(
    () =>
      mode === "single"
        ? findAndReplace(input, find, replace, isRegex, caseSensitive, replaceAllMode)
        : batchReplace(input, rules, isRegex, caseSensitive),
    [input, find, replace, isRegex, caseSensitive, replaceAllMode, mode, rules]
  );

  const matchCount = useMemo(() => {
    if (!input) return 0;
    if (mode === "single") {
      if (!find) return 0;
      const countRegex = buildRegex(find, isRegex, caseSensitive, true);
      if (!countRegex) return 0;
      const matches = input.match(countRegex);
      return matches ? matches.length : 0;
    }
    return result.matchCount;
  }, [input, find, isRegex, caseSensitive, mode, result.matchCount]);

  const handleCopy = useCallback(async () => {
    if (!result.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result.output]);

  const addRule = useCallback(() => {
    setRules((prev) => [...prev, { id: nextRuleId(), find: "", replace: "" }]);
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateRule = useCallback((id: string, field: "find" | "replace", value: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const insertRegexPattern = useCallback((pattern: string) => {
    if (mode === "single") {
      setFind(pattern);
    }
    setIsRegex(true);
  }, [mode]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy result" },
    { key: "k", meta: true, action: () => { setInput(""); setFind(""); setReplace(""); }, label: "Clear" },
  ], [handleCopy]));

  const hasChanges = input && matchCount > 0;

  // Highlighted segments for source text
  const highlightedSegments = useMemo(() => {
    if (mode !== "single" || !find || !input) return null;
    return getHighlightedSegments(input, find, isRegex, caseSensitive);
  }, [input, find, isRegex, caseSensitive, mode]);

  // Diff segments
  const diffSegments = useMemo(() => {
    if (!hasChanges || !showPreview) return null;
    if (input.length > 5000) return null; // Skip diff for very long texts
    return computeDiff(input, result.output);
  }, [input, result.output, hasChanges, showPreview]);

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Find &amp; Replace"
          tagline="Bulk find-and-replace across pasted text - with regex, case-insensitive matching, whole-word matching, and match counting."
          description="Paste your text, type what to find, type what to replace it with. Regex mode unlocks capture groups ($1, $2). Matches are highlighted live, and the result area shows the count before you commit. Works for renaming variables, cleaning up CSVs, swapping brand terms, or any bulk edit."
          audience={["Developers", "Writers", "Editors", "Data folks"]}
          whenToUse={[
            "Renaming a variable across pasted code",
            "Swapping brand terms site-wide before republishing",
            "Cleaning up a CSV field before importing",
          ]}
        />

        {/* Mode toggle */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode("single")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "single"
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            Single
          </button>
          <button
            onClick={() => setMode("rules")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "rules"
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            Rules
          </button>
        </div>

        {/* Input with match highlighting */}
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste your text here..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            rows={6}
            autoFocus
          />
        </div>

        {/* Match highlighting display */}
        {highlightedSegments && matchCount > 0 && (
          <div className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm max-h-48 overflow-y-auto">
            {highlightedSegments.map((seg, i) =>
              seg.highlighted ? (
                <mark key={i} className="bg-yellow-200 rounded-sm px-0.5">
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )}
          </div>
        )}

        {/* Stats */}
        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
          <span>
            {input.length} {input.length === 1 ? "character" : "characters"}
          </span>
          {input && (
            <button
              onClick={() => setInput("")}
              className="text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Find / Replace fields - Single mode */}
        {mode === "single" && (
          <div className="mt-5 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Find..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              {find && matchCount > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {matchCount} {matchCount === 1 ? "match" : "matches"}
                </span>
              )}
              {result.error && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-500">
                  {result.error}
                </span>
              )}
            </div>

            <input
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace with..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
        )}

        {/* Rules mode */}
        {mode === "rules" && (
          <div className="mt-5 space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={rule.find}
                    onChange={(e) => updateRule(rule.id, "find", e.target.value)}
                    placeholder={`Find #${index + 1}...`}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <input
                    type="text"
                    value={rule.replace}
                    onChange={(e) => updateRule(rule.id, "replace", e.target.value)}
                    placeholder="Replace with..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <button
                  onClick={() => removeRule(rule.id)}
                  className="mt-2 rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title="Remove rule"
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
            <button
              onClick={addRule}
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors w-full justify-center"
            >
              <PlusIcon /> Add Rule
            </button>
            {result.error && (
              <p className="text-xs text-red-500 mt-1">{result.error}</p>
            )}
            {matchCount > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {matchCount} total {matchCount === 1 ? "match" : "matches"} across all rules
              </p>
            )}
          </div>
        )}

        {/* Toggles */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => setIsRegex((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isRegex
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            .* Regex
          </button>
          <button
            onClick={() => setCaseSensitive((v) => !v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              caseSensitive
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
            }`}
          >
            Aa Case sensitive
          </button>
          {mode === "single" && (
            <button
              onClick={() => setReplaceAllMode((v) => !v)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                replaceAllMode
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Replace all
            </button>
          )}
        </div>

        {/* Regex library */}
        <div className="mt-4">
          <button
            onClick={() => setShowRegexLib((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ChevronIcon open={showRegexLib} />
            Common regex patterns
          </button>
          {showRegexLib && (
            <div className="mt-2 flex flex-wrap gap-2">
              {REGEX_LIBRARY.map((item) => (
                <button
                  key={item.label}
                  onClick={() => insertRegexPattern(item.pattern)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-gray-300 hover:text-gray-900 transition-colors"
                  title={item.pattern}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Replace preview (diff) */}
        {hasChanges && diffSegments && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Preview</span>
              <button
                onClick={() => setShowPreview((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {showPreview ? "Hide" : "Show"} preview
              </button>
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm max-h-64 overflow-y-auto">
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

        {/* Output */}
        {hasChanges && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">
                Result{" "}
                <span className="text-gray-400 font-normal">
                  - {mode === "rules" ? "all rules applied" : replaceAllMode ? "all" : "first"} replaced
                </span>
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
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
            <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm">
              {result.output}
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

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

function PlusIcon() {
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
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
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
      className={`transition-transform ${open ? "rotate-90" : ""}`}
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
