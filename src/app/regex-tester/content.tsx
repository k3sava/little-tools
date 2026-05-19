"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle } from "@/components/tools/controls";

// --- Common regex patterns ---

const PATTERN_CATEGORIES = [
  {
    label: "Validation",
    patterns: [
      { label: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
      { label: "URL", pattern: "https?:\\/\\/[^\\s]+" },
      { label: "IPv4", pattern: "\\b\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\b" },
      { label: "Phone (US)", pattern: "\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}" },
      { label: "Date YYYY-MM-DD", pattern: "\\d{4}-\\d{2}-\\d{2}" },
      { label: "Hex Color", pattern: "#[0-9a-fA-F]{3,8}\\b" },
      { label: "UUID", pattern: "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" },
    ],
  },
  {
    label: "Extraction",
    patterns: [
      { label: "HTML Tag", pattern: "<([a-z]+)[^>]*>(.*?)<\\/\\1>" },
      { label: "Markdown Link", pattern: "\\[([^\\]]+)\\]\\(([^)]+)\\)" },
      { label: "JSON Key-Value", pattern: '"([^"]+)"\\s*:\\s*"([^"]*)"' },
    ],
  },
  {
    label: "Numbers",
    patterns: [
      { label: "Integer", pattern: "-?\\d+" },
      { label: "Float", pattern: "-?\\d+\\.\\d+" },
      { label: "Currency", pattern: "\\$\\d{1,3}(,\\d{3})*(\\.\\d{2})?" },
    ],
  },
];

const CHEAT_SHEET = [
  { cat: "Characters", items: [
    [".", "Any character (except newline)"],
    ["\\d", "Digit [0-9]"],
    ["\\w", "Word char [a-zA-Z0-9_]"],
    ["\\s", "Whitespace"],
    ["\\b", "Word boundary"],
  ]},
  { cat: "Quantifiers", items: [
    ["*", "0 or more"],
    ["+", "1 or more"],
    ["?", "0 or 1 (optional)"],
    ["{n}", "Exactly n"],
    ["{n,m}", "Between n and m"],
  ]},
  { cat: "Groups", items: [
    ["(abc)", "Capture group"],
    ["(?:abc)", "Non-capture group"],
    ["(?<name>abc)", "Named group"],
    ["a|b", "Alternation (or)"],
  ]},
  { cat: "Anchors / sets", items: [
    ["^", "Start of string/line"],
    ["$", "End of string/line"],
    ["[abc]", "Character set"],
    ["[^abc]", "Negated set"],
  ]},
];

interface MatchInfo {
  fullMatch: string;
  index: number;
  groups: string[];
  namedGroups: Record<string, string>;
}

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

function highlightText(text: string, matches: MatchInfo[]): React.ReactNode[] {
  if (matches.length === 0) return [text];
  const parts: React.ReactNode[] = [];
  let lastEnd = 0;
  const hues = ["#fde047", "#86efac", "#93c5fd", "#f9a8d4", "#fdba74", "#d8b4fe"];
  matches.forEach((m, i) => {
    if (m.index > lastEnd) {
      parts.push(<span key={`t-${i}`}>{text.slice(lastEnd, m.index)}</span>);
    }
    const hue = hues[i % hues.length];
    parts.push(
      <mark
        key={`m-${i}`}
        className="px-0.5"
        style={{
          background: `color-mix(in srgb, ${hue} 55%, var(--kami-surface-solid))`,
          color: "var(--kami-text)",
          borderRadius: "var(--kami-cta-radius, 0.25rem)",
        }}
        title={`Match ${i + 1} at index ${m.index}`}
      >
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
        "?": "Literal question mark",
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
        tokens.push({ token: "(?:", desc: "Non-capturing group" });
        i += 3;
      } else if (pattern.slice(i, i + 3) === "(?=") {
        tokens.push({ token: "(?=", desc: "Positive lookahead" });
        i += 3;
      } else if (pattern.slice(i, i + 3) === "(?!") {
        tokens.push({ token: "(?!", desc: "Negative lookahead" });
        i += 3;
      } else {
        tokens.push({ token: "(", desc: "Capture group" });
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
        ".": "Any character", "*": "0 or more (greedy)", "+": "1 or more (greedy)",
        "?": "Optional (0 or 1)", "^": "Start of string/line", "$": "End of string/line",
        "|": "OR (alternation)",
      };
      tokens.push({ token: ch, desc: simple[ch] || `Literal "${ch}"` });
      i++;
    }
  }
  return tokens;
}

type Mode = "match" | "replace";

export default function RegexTesterContent() {
  const [toolState, setToolState] = useToolState({ pattern: "", test: "" });
  const pattern = toolState.pattern;
  const testString = toolState.test;
  const setPattern = useCallback((v: string) => setToolState({ pattern: v }), [setToolState]);
  const setTestString = useCallback((v: string) => setToolState({ test: v }), [setToolState]);
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

  const [flagG, setFlagG] = useState(true);
  const [flagI, setFlagI] = useState(false);
  const [flagM, setFlagM] = useState(false);
  const [flagS, setFlagS] = useState(false);
  const [mode, setMode] = useState<Mode>("match");
  const [replacement, setReplacement] = useState("");
  const [showCheat, setShowCheat] = useState(false);
  const [showExplain, setShowExplain] = useState(false);
  const [showPatterns, setShowPatterns] = useState(false);
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
  ], [matches, replaceResult, mode, handleCopy, setPattern, setTestString]));

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
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  } as const;

  return (
    <ToolShell
      title="Regex Tester"
      tagline="Live highlight · captures · replace · explain"
      accent="#10b981"
      materialFab={{ label: "Copy result", onClick: () => { if (mode === "replace" && replaceResult) handleCopy(replaceResult, "result"); else if (matches.length) handleCopy(matches.map((m) => m.fullMatch).join("\n"), "matches"); } }}
      actions={
        <>
          {(pattern || testString) && (
            <ToolActionButton onClick={() => { setPattern(""); setTestString(""); }} variant="ghost">
              Clear
            </ToolActionButton>
          )}
          {matches.length > 0 && mode === "match" && (
            <ToolActionButton
              onClick={() => handleCopy(matches.map((m) => m.fullMatch).join("\n"), "matches")}
              variant="solid"
            >
              {copied === "matches" ? "Copied" : "Copy matches"}
            </ToolActionButton>
          )}
          {mode === "replace" && replaceResult && (
            <ToolActionButton onClick={() => handleCopy(replaceResult, "result")} variant="solid">
              {copied === "result" ? "Copied" : "Copy result"}
            </ToolActionButton>
          )}
        </>
      }
      controls={
        <>
          <ControlGroup label="Mode">
            <Segment<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: "match", label: "Match" },
                { value: "replace", label: "Replace" },
              ]}
              full
            />
          </ControlGroup>
          <ControlGroup label="Flags">
            <div className="flex flex-col gap-2">
              <Toggle label="g — global" checked={flagG} onChange={setFlagG} />
              <Toggle label="i — case-insensitive" checked={flagI} onChange={setFlagI} />
              <Toggle label="m — multiline" checked={flagM} onChange={setFlagM} />
              <Toggle label="s — dotAll" checked={flagS} onChange={setFlagS} />
            </div>
          </ControlGroup>
          <ControlGroup label="Helpers">
            <div className="flex flex-col gap-2">
              <Toggle label="Explain pattern" checked={showExplain} onChange={setShowExplain} />
              <Toggle label="Cheat sheet" checked={showCheat} onChange={setShowCheat} />
              <Toggle label="Common patterns" checked={showPatterns} onChange={setShowPatterns} />
            </div>
          </ControlGroup>
        </>
      }
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Pattern</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Matches</button>
        </nav>
      )}
      <div className="flex flex-col gap-3">
        {(!isMetro || metroCPivot === "input") && (
          <>
            {/* Pattern input */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono select-none" style={{ color: "var(--kami-text-dim)" }}>/</span>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="Enter regex pattern..."
                className="flex-1 px-4 py-3 text-base font-mono focus:outline-none"
                style={{ ...inputStyle, minHeight: 44 }}
                autoFocus
                spellCheck={false}
              />
              <span className="text-lg font-mono select-none" style={{ color: "var(--kami-text-dim)" }}>/{flags}</span>
            </div>
            {error && <p className="text-xs" style={{ color: "#ef4444" }}>{error}</p>}

            {/* Replacement input */}
            {mode === "replace" && (
              <div className="flex flex-col gap-2">
                <input
                  value={replacement}
                  onChange={(e) => setReplacement(e.target.value)}
                  placeholder="Replacement string... ($1 for groups, $& for full match)"
                  className="w-full px-4 py-3 text-base font-mono focus:outline-none"
                  style={{ ...inputStyle, minHeight: 44 }}
                  spellCheck={false}
                />
                <div className="flex flex-wrap gap-1">
                  {["$1", "$&", "$`", "$'"].map((ref) => (
                    <button
                      key={ref}
                      onClick={() => setReplacement((r) => r + ref)}
                      className="px-2 py-1 text-xs font-mono"
                      style={{
                        background: "var(--kami-surface)",
                        color: "var(--kami-text-muted)",
                        border: "1px solid var(--kami-border)",
                        borderRadius: "var(--kami-cta-radius, 0.25rem)",
                        minHeight: 32,
                      }}
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Test string */}
            <textarea
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter test string..."
              className="w-full px-4 py-3 text-base focus:outline-none"
              style={{ ...inputStyle, minHeight: 160 }}
              rows={6}
              spellCheck={false}
            />

            <div className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
              {matches.length} match{matches.length !== 1 ? "es" : ""}
              {testString && ` in ${testString.length} chars`}
            </div>
          </>
        )}

        {(!isMetro || metroCPivot === "output") && (
          <>
            {/* Explain panel */}
            {showExplain && pattern && explanation.length > 0 && (
              <div className="p-4" style={cardStyle}>
                <h3 className="mb-3 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Pattern breakdown</h3>
                <div className="flex flex-wrap gap-1">
                  {explanation.map((tok, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center px-2 py-1 font-mono text-sm"
                      style={{
                        background: "var(--kami-surface)",
                        border: "1px solid var(--kami-border)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                      title={tok.desc}
                    >
                      <span style={{ color: "var(--kami-text)" }}>{tok.token}</span>
                      <span className="ml-2 text-xs" style={{ color: "var(--kami-text-muted)" }}>{tok.desc}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cheat sheet */}
            {showCheat && (
              <div className="p-4" style={cardStyle}>
                <h3 className="mb-3 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Cheat sheet</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {CHEAT_SHEET.map((cat) => (
                    <div key={cat.cat}>
                      <h4 className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>{cat.cat}</h4>
                      <div className="space-y-1">
                        {cat.items.map(([token, desc]) => (
                          <div key={token} className="flex items-baseline gap-2">
                            <code
                              className="px-1.5 py-0.5 text-xs font-mono"
                              style={{
                                background: "var(--kami-surface)",
                                color: "var(--kami-text)",
                                border: "1px solid var(--kami-border)",
                                borderRadius: "var(--kami-cta-radius, 0.25rem)",
                              }}
                            >{token}</code>
                            <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common patterns */}
            {showPatterns && (
              <div className="p-4" style={cardStyle}>
                <h3 className="mb-3 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Common patterns</h3>
                {PATTERN_CATEGORIES.map((cat) => (
                  <div key={cat.label} className="mb-3 last:mb-0">
                    <h4 className="mb-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>{cat.label}</h4>
                    <div className="grid gap-1.5 sm:grid-cols-2">
                      {cat.patterns.map((p) => (
                        <button
                          key={p.label}
                          onClick={() => setPattern(p.pattern)}
                          className="flex items-center justify-between px-3 py-2 text-left transition-colors"
                          style={{
                            background: "var(--kami-surface-solid)",
                            border: "1px solid var(--kami-border)",
                            borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            minHeight: 44,
                          }}
                        >
                          <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>{p.label}</span>
                          <span className="text-xs font-mono truncate ml-2 max-w-[140px]" style={{ color: "var(--kami-text-dim)" }}>{p.pattern}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Highlighted preview */}
            {testString && pattern && !error && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Highlighted</span>
                <div
                  className="whitespace-pre-wrap px-4 py-3 font-mono text-sm max-h-[300px] overflow-auto break-all"
                  style={cardStyle}
                >
                  {highlighted}
                </div>
              </div>
            )}

            {/* Replace result */}
            {mode === "replace" && replaceResult && testString && pattern && !error && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Replace result</span>
                  <ToolActionButton onClick={() => handleCopy(replaceResult, "result")} variant="solid">
                    {copied === "result" ? "Copied" : "Copy"}
                  </ToolActionButton>
                </div>
                <div
                  className="whitespace-pre-wrap px-4 py-3 font-mono text-sm max-h-[300px] overflow-auto break-all"
                  style={cardStyle}
                >
                  {replaceResult}
                </div>
              </div>
            )}

            {/* Match cards */}
            {matches.length > 0 && mode === "match" && (
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                  Matches ({matches.length})
                </span>
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                  {matches.slice(0, 200).map((m, i) => (
                    <div
                      key={i}
                      className="p-3"
                      style={cardStyle}
                    >
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <span className="font-mono text-sm font-semibold break-all" style={{ color: "var(--kami-text)" }}>
                          {m.fullMatch}
                        </span>
                        <span className="text-[10px] shrink-0" style={{ color: "var(--kami-text-dim)" }}>
                          #{i + 1} · idx {m.index}
                        </span>
                      </div>
                      {m.groups.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {m.groups.map((g, gi) => (
                            <span
                              key={gi}
                              className="px-1.5 py-0.5 text-xs font-mono"
                              style={{
                                background: "var(--kami-surface)",
                                color: "var(--kami-text-muted)",
                                border: "1px solid var(--kami-border)",
                                borderRadius: "var(--kami-cta-radius, 0.375rem)",
                              }}
                            >
                              ${gi + 1}: {g ?? "—"}
                            </span>
                          ))}
                        </div>
                      )}
                      {Object.keys(m.namedGroups).length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {Object.entries(m.namedGroups).map(([name, val]) => (
                            <span
                              key={name}
                              className="px-1.5 py-0.5 text-xs font-mono"
                              style={{
                                background: "color-mix(in srgb, #3b82f6 15%, var(--kami-surface-solid))",
                                color: "color-mix(in srgb, #3b82f6 60%, var(--kami-text))",
                                borderRadius: "var(--kami-cta-radius, 0.375rem)",
                              }}
                            >
                              {name}: {val}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {matches.length > 200 && (
                  <div className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
                    Showing 200 of {matches.length} matches
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </ToolShell>
  );
}
