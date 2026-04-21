"use client";

import { useState, useMemo, useCallback } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- Common regex patterns ---

const PATTERN_CATEGORIES = [
  {
    label: "Validation",
    patterns: [
      { label: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
      { label: "URL", pattern: "https?:\\/\\/[^\\s]+" },
      { label: "IPv4", pattern: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b" },
      { label: "Phone (US)", pattern: "\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}" },
      { label: "Phone (Intl)", pattern: "\\+?\\d{1,4}[-.\\s]?\\(?\\d{1,4}\\)?[-.\\s]?\\d{1,4}[-.\\s]?\\d{1,9}" },
      { label: "Date (YYYY-MM-DD)", pattern: "\\d{4}-\\d{2}-\\d{2}" },
      { label: "Time (HH:MM)", pattern: "([01]\\d|2[0-3]):[0-5]\\d" },
      { label: "Hex Color", pattern: "#[0-9a-fA-F]{3,8}\\b" },
      { label: "UUID", pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" },
    ],
  },
  {
    label: "Extraction",
    patterns: [
      { label: "HTML Tag", pattern: "<([a-z]+)[^>]*>(.*?)<\\/\\1>" },
      { label: "CSS Property", pattern: "([a-z-]+)\\s*:\\s*([^;]+)" },
      { label: "JSON Key-Value", pattern: '"([^"]+)"\\s*:\\s*"([^"]*)"' },
      { label: "Markdown Link", pattern: "\\[([^\\]]+)\\]\\(([^)]+)\\)" },
      { label: "Import Statement", pattern: 'import\\s+.*?from\\s+["\']([^"\']+)["\']' },
    ],
  },
  {
    label: "Numbers",
    patterns: [
      { label: "Integer", pattern: "-?\\d+" },
      { label: "Float", pattern: "-?\\d+\\.\\d+" },
      { label: "Scientific", pattern: "-?\\d+\\.?\\d*[eE][+-]?\\d+" },
      { label: "Currency", pattern: "\\$\\d{1,3}(,\\d{3})*(\\.\\d{2})?" },
      { label: "Percentage", pattern: "\\d+\\.?\\d*%" },
    ],
  },
  {
    label: "Text",
    patterns: [
      { label: "Words", pattern: "\\b\\w+\\b" },
      { label: "Sentences", pattern: "[A-Z][^.!?]*[.!?]" },
      { label: "Whitespace", pattern: "\\s+" },
      { label: "Duplicate Lines", pattern: "^(.+)$\\n(?=.*^\\1$)" },
      { label: "Quoted String", pattern: '(["\'])(?:(?!\\1).)*\\1' },
    ],
  },
];

// --- Cheat sheet data ---

const CHEAT_SHEET = [
  { cat: "Characters", items: [
    [".", "Any character (except newline)"],
    ["\\d", "Digit [0-9]"],
    ["\\D", "Non-digit"],
    ["\\w", "Word char [a-zA-Z0-9_]"],
    ["\\W", "Non-word char"],
    ["\\s", "Whitespace"],
    ["\\S", "Non-whitespace"],
    ["\\b", "Word boundary"],
  ]},
  { cat: "Quantifiers", items: [
    ["*", "0 or more"],
    ["+", "1 or more"],
    ["?", "0 or 1 (optional)"],
    ["{n}", "Exactly n"],
    ["{n,}", "n or more"],
    ["{n,m}", "Between n and m"],
    ["*?", "0+ (lazy)"],
    ["+?", "1+ (lazy)"],
  ]},
  { cat: "Groups & Refs", items: [
    ["(abc)", "Capture group"],
    ["(?:abc)", "Non-capture group"],
    ["(?<name>abc)", "Named group"],
    ["\\1", "Back-reference"],
    ["a|b", "Alternation (or)"],
    ["(?=abc)", "Positive lookahead"],
    ["(?!abc)", "Negative lookahead"],
    ["(?<=abc)", "Positive lookbehind"],
  ]},
  { cat: "Anchors & Sets", items: [
    ["^", "Start of string/line"],
    ["$", "End of string/line"],
    ["[abc]", "Character set"],
    ["[^abc]", "Negated set"],
    ["[a-z]", "Range"],
    ["\\n", "Newline"],
    ["\\t", "Tab"],
    ["\\\\", "Literal backslash"],
  ]},
];

// --- Types ---

interface MatchInfo {
  fullMatch: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

// --- Logic ---

function buildRegex(pattern: string, flags: string): { regex: RegExp | null; error: string | null } {
  if (!pattern) return { regex: null, error: null };
  try {
    return { regex: new RegExp(pattern, flags), error: null };
  } catch (e) {
    return { regex: null, error: (e as Error).message };
  }
}

function findMatches(regex: RegExp, text: string): MatchInfo[] {
  const matches: MatchInfo[] = [];
  if (!regex.global) {
    const m = regex.exec(text);
    if (m) {
      matches.push({
        fullMatch: m[0],
        index: m.index,
        groups: m.slice(1),
        namedGroups: m.groups ? { ...m.groups } : {},
      });
    }
    return matches;
  }
  let m: RegExpExecArray | null;
  let safety = 0;
  while ((m = regex.exec(text)) !== null && safety < 10000) {
    matches.push({
      fullMatch: m[0],
      index: m.index,
      groups: m.slice(1),
      namedGroups: m.groups ? { ...m.groups } : {},
    });
    if (m[0].length === 0) regex.lastIndex++;
    safety++;
  }
  return matches;
}

// --- Highlight ---

function highlightText(text: string, matches: MatchInfo[]): React.ReactNode[] {
  if (matches.length === 0) return [text];
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;
  const colors = ["bg-yellow-200", "bg-green-200", "bg-blue-200", "bg-pink-200", "bg-orange-200", "bg-purple-200"];
  matches.forEach((m, i) => {
    if (m.index > lastEnd) {
      parts.push(<span key={`t-${i}`}>{text.slice(lastEnd, m.index)}</span>);
    }
    parts.push(
      <mark key={`m-${i}`} className={`${colors[i % colors.length]} rounded px-0.5`} title={`Match ${i + 1} at index ${m.index}`}>
        {m.fullMatch}
      </mark>
    );
    lastEnd = m.index + m.fullMatch.length;
  });
  if (lastEnd < text.length) {
    parts.push(<span key="end">{text.slice(lastEnd)}</span>);
  }
  return parts;
}

// --- Explain regex (simple tokenizer) ---

interface ExplainToken {
  token: string;
  desc: string;
}

function explainRegex(pattern: string): ExplainToken[] {
  const tokens: ExplainToken[] = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "\\") {
      const next = pattern[i + 1] || "";
      const escapes: Record<string, string> = {
        d: "Any digit [0-9]", D: "Non-digit", w: "Word character [a-zA-Z0-9_]",
        W: "Non-word character", s: "Whitespace", S: "Non-whitespace",
        b: "Word boundary", B: "Non-word boundary", n: "Newline",
        t: "Tab", r: "Carriage return", "\\": "Literal backslash",
        ".": "Literal dot", "*": "Literal asterisk", "+": "Literal plus",
        "?": "Literal question mark", "(": "Literal (", ")": "Literal )",
        "[": "Literal [", "]": "Literal ]", "{": "Literal {", "}": "Literal }",
        "^": "Literal ^", "$": "Literal $", "|": "Literal |", "/": "Literal /",
      };
      if (/\d/.test(next)) {
        tokens.push({ token: `\\${next}`, desc: `Back-reference to group ${next}` });
      } else {
        tokens.push({ token: `\\${next}`, desc: escapes[next] || `Escaped "${next}"` });
      }
      i += 2;
    } else if (ch === "[") {
      let j = i + 1;
      if (pattern[j] === "^") j++;
      while (j < pattern.length && pattern[j] !== "]") {
        if (pattern[j] === "\\") j++;
        j++;
      }
      const set = pattern.slice(i, j + 1);
      const negated = pattern[i + 1] === "^";
      tokens.push({ token: set, desc: `${negated ? "Not " : ""}Character set: ${set}` });
      i = j + 1;
    } else if (ch === "(") {
      if (pattern.slice(i, i + 3) === "(?:") {
        tokens.push({ token: "(?:", desc: "Non-capturing group start" });
        i += 3;
      } else if (pattern.slice(i, i + 3) === "(?=") {
        tokens.push({ token: "(?=", desc: "Positive lookahead" });
        i += 3;
      } else if (pattern.slice(i, i + 3) === "(?!") {
        tokens.push({ token: "(?!", desc: "Negative lookahead" });
        i += 3;
      } else if (pattern.slice(i, i + 4) === "(?<=") {
        tokens.push({ token: "(?<=", desc: "Positive lookbehind" });
        i += 4;
      } else if (pattern.slice(i, i + 4) === "(?<!") {
        tokens.push({ token: "(?<!", desc: "Negative lookbehind" });
        i += 4;
      } else if (pattern[i + 1] === "?" && pattern[i + 2] === "<") {
        let j = i + 3;
        while (j < pattern.length && pattern[j] !== ">") j++;
        const name = pattern.slice(i + 3, j);
        tokens.push({ token: pattern.slice(i, j + 1), desc: `Named capture group "${name}"` });
        i = j + 1;
      } else {
        tokens.push({ token: "(", desc: "Capture group start" });
        i++;
      }
    } else if (ch === ")") {
      tokens.push({ token: ")", desc: "Group end" });
      i++;
    } else if (ch === "{") {
      let j = i + 1;
      while (j < pattern.length && pattern[j] !== "}") j++;
      const quant = pattern.slice(i, j + 1);
      const inner = quant.slice(1, -1);
      if (inner.includes(",")) {
        const [min, max] = inner.split(",");
        tokens.push({ token: quant, desc: max ? `Between ${min} and ${max} times` : `${min} or more times` });
      } else {
        tokens.push({ token: quant, desc: `Exactly ${inner} times` });
      }
      i = j + 1;
    } else {
      const simple: Record<string, string> = {
        ".": "Any character (except newline)", "*": "0 or more (greedy)", "+": "1 or more (greedy)",
        "?": "Optional (0 or 1)", "^": "Start of string/line", "$": "End of string/line",
        "|": "OR (alternation)",
      };
      if (simple[ch]) {
        tokens.push({ token: ch, desc: simple[ch] });
      } else {
        tokens.push({ token: ch, desc: `Literal "${ch}"` });
      }
      i++;
    }
  }
  return tokens;
}

// --- UI ---

type Mode = "match" | "replace";

export default function RegexTesterContent() {
  const [toolState, setToolState] = useToolState({ pattern: "", test: "" });
  const pattern = toolState.pattern;
  const testString = toolState.test;
  const setPattern = useCallback((v: string) => setToolState({ pattern: v }), [setToolState]);
  const setTestString = useCallback((v: string) => setToolState({ test: v }), [setToolState]);
  const [flagG, setFlagG] = useState(true);
  const [flagI, setFlagI] = useState(false);
  const [flagM, setFlagM] = useState(false);
  const [flagS, setFlagS] = useState(false);
  const [mode, setMode] = useState<Mode>("match");
  const [replacement, setReplacement] = useState("");
  const [showRef, setShowRef] = useState(false);
  const [showCheat, setShowCheat] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const flags = useMemo(() => {
    let f = "";
    if (flagG) f += "g";
    if (flagI) f += "i";
    if (flagM) f += "m";
    if (flagS) f += "s";
    return f;
  }, [flagG, flagI, flagM, flagS]);

  const { regex, error } = useMemo(() => buildRegex(pattern, flags), [pattern, flags]);

  const matches = useMemo(() => {
    if (!regex || !testString) return [];
    return findMatches(regex, testString);
  }, [regex, testString]);

  const highlighted = useMemo(() => {
    if (!testString) return [];
    return highlightText(testString, matches);
  }, [testString, matches]);

  const replaceResult = useMemo(() => {
    if (!regex || !testString || mode !== "replace") return "";
    try {
      return testString.replace(regex, replacement);
    } catch {
      return "";
    }
  }, [regex, testString, replacement, mode]);

  const explanation = useMemo(() => {
    if (!pattern) return [];
    return explainRegex(pattern);
  }, [pattern]);

  const handleCopy = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => {
      if (mode === "replace" && replaceResult) handleCopy(replaceResult, "result");
      else if (matches.length) handleCopy(matches.map((m) => m.fullMatch).join("\n"), "matches");
    }, label: "Copy" },
    { key: "k", meta: true, action: () => { setPattern(""); setTestString(""); }, label: "Clear" },
  ], [matches, replaceResult, mode, handleCopy]));

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Regex Tester</h1>
          <p className="mt-2 text-gray-500">
            Test, match, replace, and understand regular expressions. No ads, no tracking.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-4 flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-0.5">
            <button
              onClick={() => setMode("match")}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === "match" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              Match
            </button>
            <button
              onClick={() => setMode("replace")}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${mode === "replace" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"}`}
            >
              Replace
            </button>
          </div>
        </div>

        {/* Pattern input */}
        <div className="mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg font-mono text-gray-400 select-none">/</span>
            <input
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regex pattern..."
              className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-mono shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              autoFocus
              spellCheck={false}
            />
            <span className="text-lg font-mono text-gray-400 select-none">/{flags}</span>
          </div>
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>

        {/* Replacement input */}
        {mode === "replace" && (
          <div className="mb-3">
            <input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Replacement string... ($1 for groups, $& for match)"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-mono shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              spellCheck={false}
            />
            <div className="mt-1 flex gap-2">
              {["$1", "$&", "$`", "$'", "\\n"].map((ref) => (
                <button
                  key={ref}
                  onClick={() => setReplacement((r) => r + ref)}
                  className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-500 hover:bg-gray-200"
                >
                  {ref}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Flags + toggles */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Flags:</span>
          {([
            ["g", "Global", flagG, setFlagG],
            ["i", "Case-insensitive", flagI, setFlagI],
            ["m", "Multiline", flagM, setFlagM],
            ["s", "Dotall", flagS, setFlagS],
          ] as const).map(([flag, label, value, setter]) => (
            <button
              key={flag}
              onClick={() => (setter as (v: boolean) => void)(!value)}
              title={label}
              className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                value
                  ? "bg-gray-900 text-white"
                  : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              {flag}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => { setShowExplain(!showExplain); setShowRef(false); setShowCheat(false); }}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${showExplain ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"}`}
            >
              Explain
            </button>
            <button
              onClick={() => { setShowRef(!showRef); setShowExplain(false); setShowCheat(false); }}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${showRef ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"}`}
            >
              Patterns
            </button>
            <button
              onClick={() => { setShowCheat(!showCheat); setShowExplain(false); setShowRef(false); }}
              className={`rounded-lg border px-3 py-1 text-xs font-medium transition-colors ${showCheat ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"}`}
            >
              Cheat Sheet
            </button>
          </div>
        </div>

        {/* Explain panel */}
        {showExplain && pattern && explanation.length > 0 && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-gray-500">Pattern Breakdown</h3>
            <div className="flex flex-wrap gap-1">
              {explanation.map((tok, i) => (
                <span
                  key={i}
                  className="group relative inline-flex items-center rounded-md bg-gray-100 px-1.5 py-1 font-mono text-sm cursor-help"
                  title={tok.desc}
                >
                  <span className="text-gray-900">{tok.token}</span>
                  <span className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-gray-900 px-2 py-1 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {tok.desc}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cheat sheet panel */}
        {showCheat && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-gray-500">Quick Reference</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {CHEAT_SHEET.map((cat) => (
                <div key={cat.cat}>
                  <h4 className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">{cat.cat}</h4>
                  <div className="space-y-1">
                    {cat.items.map(([token, desc]) => (
                      <div key={token} className="flex items-baseline gap-2">
                        <code className="w-16 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono text-gray-900">{token}</code>
                        <span className="text-xs text-gray-500">{desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Common patterns reference */}
        {showRef && (
          <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-medium text-gray-500">Common Patterns</h3>
            {PATTERN_CATEGORIES.map((cat) => (
              <div key={cat.label} className="mb-3 last:mb-0">
                <h4 className="mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">{cat.label}</h4>
                <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.patterns.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => setPattern(p.pattern)}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                    >
                      <span className="text-sm text-gray-700">{p.label}</span>
                      <span className="text-xs font-mono text-gray-400 truncate ml-2 max-w-[140px]">{p.pattern}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Test string */}
        <textarea
          value={testString}
          onChange={(e) => setTestString(e.target.value)}
          placeholder="Enter test string..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
          rows={6}
          spellCheck={false}
        />

        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {matches.length} match{matches.length !== 1 ? "es" : ""}
            {testString && ` in ${testString.length} chars`}
          </span>
          {testString && (
            <button onClick={() => setTestString("")} className="text-gray-400 hover:text-gray-600">
              Clear
            </button>
          )}
        </div>

        {/* Highlighted preview */}
        {testString && pattern && !error && (
          <div className="mt-6">
            <span className="text-sm font-medium text-gray-500">Highlighted</span>
            <div className="mt-2 whitespace-pre-wrap rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm shadow-sm max-h-[300px] overflow-auto break-all">
              {highlighted}
            </div>
          </div>
        )}

        {/* Replace result */}
        {mode === "replace" && replaceResult && testString && pattern && !error && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Replace Result</span>
              <button
                onClick={() => handleCopy(replaceResult, "result")}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {copied === "result" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
              </button>
            </div>
            <div className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm shadow-sm max-h-[300px] overflow-auto break-all">
              {replaceResult}
            </div>
          </div>
        )}

        {/* Match list */}
        {matches.length > 0 && mode === "match" && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">
                Matches ({matches.length})
              </span>
              <button
                onClick={() => handleCopy(matches.map((m) => m.fullMatch).join("\n"), "matches")}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {copied === "matches" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy All</>}
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100 max-h-[300px] overflow-auto">
              {matches.slice(0, 200).map((m, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <span className="font-mono text-sm text-gray-900 break-all">{m.fullMatch}</span>
                    <span className="text-xs text-gray-400 shrink-0">index {m.index}</span>
                  </div>
                  {m.groups.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {m.groups.map((g, gi) => (
                        <span key={gi} className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-600">
                          ${gi + 1}: {g ?? "undefined"}
                        </span>
                      ))}
                    </div>
                  )}
                  {Object.keys(m.namedGroups).length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {Object.entries(m.namedGroups).map(([name, val]) => (
                        <span key={name} className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono text-blue-600">
                          {name}: {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {matches.length > 200 && (
                <div className="px-4 py-2 text-xs text-gray-400">
                  Showing 200 of {matches.length} matches
                </div>
              )}
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
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
