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

interface Preset {
  id: string;
  name: string;
  rules: Array<{ find: string; replace: string }>;
}

// --- Regex library ---

const REGEX_LIBRARY = [
  { label: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
  { label: "URL", pattern: "https?://[^\\s]+" },
  { label: "Phone", pattern: "\\+?[\\d\\s\\-()]{7,}" },
  { label: "Date", pattern: "\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4}" },
  { label: "IP", pattern: "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" },
  { label: "Whitespace", pattern: "\\s+" },
];

const PRESETS_KEY = "kami_find_replace_presets";

// --- Find & Replace logic ---

function buildRegex(
  find: string,
  isRegex: boolean,
  caseSensitive: boolean,
  global: boolean,
  wholeWord: boolean,
  multiline: boolean
): RegExp | null {
  if (!find) return null;
  let pattern = isRegex ? find : find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (wholeWord) pattern = `\\b${pattern}\\b`;
  const flags = (global ? "g" : "") + (caseSensitive ? "" : "i") + (multiline ? "m" : "");
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
  replaceAll: boolean,
  wholeWord: boolean,
  multiline: boolean
): MatchResult {
  if (!text || !find) return { output: text, matchCount: 0, error: null };
  const countRegex = buildRegex(find, isRegex, caseSensitive, true, wholeWord, multiline);
  if (!countRegex) {
    return { output: text, matchCount: 0, error: "Invalid regex pattern" };
  }
  const matches = text.match(countRegex);
  const matchCount = matches ? matches.length : 0;
  const replaceRegex = buildRegex(find, isRegex, caseSensitive, replaceAll, wholeWord, multiline);
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
  caseSensitive: boolean,
  wholeWord: boolean,
  multiline: boolean
): MatchResult {
  if (!text) return { output: text, matchCount: 0, error: null };
  let result = text;
  let totalMatches = 0;
  for (const rule of rules) {
    if (!rule.find) continue;
    const r = findAndReplace(result, rule.find, rule.replace, isRegex, caseSensitive, true, wholeWord, multiline);
    if (r.error) return { output: text, matchCount: 0, error: `Rule "${rule.find}": ${r.error}` };
    totalMatches += r.matchCount;
    result = r.output;
  }
  return { output: result, matchCount: totalMatches, error: null };
}

function buildLCS(a: string, b: string): number[][] {
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

function computeDiff(original: string, modified: string): DiffSegment[] {
  if (original === modified) return [{ type: "same", text: original }];
  const segments: DiffSegment[] = [];
  const lcs = buildLCS(original, modified);
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
  for (const op of ops) {
    if (segments.length > 0 && segments[segments.length - 1].type === op.type) {
      segments[segments.length - 1].text += op.char;
    } else {
      segments.push({ type: op.type, text: op.char });
    }
  }
  return segments;
}

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
  const [wholeWord, setWholeWord] = useState(false);
  const [multiline, setMultiline] = useState(false);
  const [replaceAllMode, setReplaceAllMode] = useState(true);
  const [copied, setCopied] = useState(false);

  const [mode, setMode] = useState<"single" | "rules">("single");
  const [rules, setRules] = useState<Rule[]>([
    { id: nextRuleId(), find: "", replace: "" },
    { id: nextRuleId(), find: "", replace: "" },
  ]);

  const [showPreview, setShowPreview] = useState(true);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroFRPivot, setMetroFRPivot] = useState<"input" | "output">("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMaterial = currentTheme === "material";
  const isMetro    = currentTheme === "metro";
  const isGlass    = currentTheme === "glass";

  // Load presets
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESETS_KEY);
      if (raw) setPresets(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const result = useMemo(
    () =>
      mode === "single"
        ? findAndReplace(input, find, replace, isRegex, caseSensitive, replaceAllMode, wholeWord, multiline)
        : batchReplace(input, rules, isRegex, caseSensitive, wholeWord, multiline),
    [input, find, replace, isRegex, caseSensitive, replaceAllMode, mode, rules, wholeWord, multiline]
  );

  const matchCount = useMemo(() => {
    if (!input) return 0;
    if (mode === "single") {
      if (!find) return 0;
      const countRegex = buildRegex(find, isRegex, caseSensitive, true, wholeWord, multiline);
      if (!countRegex) return 0;
      const matches = input.match(countRegex);
      return matches ? matches.length : 0;
    }
    return result.matchCount;
  }, [input, find, isRegex, caseSensitive, mode, result.matchCount, wholeWord, multiline]);

  const handleCopy = useCallback(async () => {
    if (!result.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result.output]);

  const handleApply = useCallback(() => {
    if (result.error || !matchCount) return;
    setInput(result.output);
  }, [result, matchCount]);

  const addRule = useCallback(() => {
    setRules((prev) => [...prev, { id: nextRuleId(), find: "", replace: "" }]);
  }, []);

  const removeRule = useCallback((id: string) => {
    setRules((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateRule = useCallback((id: string, field: "find" | "replace", value: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }, []);

  const savePreset = useCallback(() => {
    const name = window.prompt("Preset name:");
    if (!name) return;
    const payload: Preset = {
      id: `preset-${Date.now()}`,
      name,
      rules:
        mode === "single"
          ? [{ find, replace }]
          : rules.map((r) => ({ find: r.find, replace: r.replace })),
    };
    setPresets((prev) => {
      const next = [...prev, payload];
      try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, [mode, find, replace, rules]);

  const loadPreset = useCallback((p: Preset) => {
    if (p.rules.length <= 1) {
      setMode("single");
      setFind(p.rules[0]?.find ?? "");
      setReplace(p.rules[0]?.replace ?? "");
    } else {
      setMode("rules");
      setRules(p.rules.map((r) => ({ id: nextRuleId(), find: r.find, replace: r.replace })));
    }
  }, [setFind, setReplace]);

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const insertRegexPattern = useCallback((pattern: string) => {
    if (mode === "single") setFind(pattern);
    setIsRegex(true);
  }, [mode, setFind]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy result" },
    { key: "k", meta: true, action: () => { setInput(""); setFind(""); setReplace(""); }, label: "Clear" },
  ], [handleCopy, setFind, setReplace]));

  const hasChanges = input && matchCount > 0;

  const diffSegments = useMemo(() => {
    if (!hasChanges || !showPreview) return null;
    if (input.length > 5000) return null;
    return computeDiff(input, result.output);
  }, [input, result.output, hasChanges, showPreview]);

  const inputStyle: React.CSSProperties = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  };
  const cardStyle: React.CSSProperties = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  };

  const controls = (
    <>
      <ControlGroup label="Mode">
        <Segment
          value={mode}
          onChange={setMode}
          options={[
            { value: "single", label: "Single" },
            { value: "rules", label: "Rules" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Flags">
        <Toggle checked={isRegex} onChange={setIsRegex} label="Regex" hint=".* $1 captures" />
        <Toggle checked={caseSensitive} onChange={setCaseSensitive} label="Case sensitive" />
        <Toggle checked={wholeWord} onChange={setWholeWord} label="Whole word" hint="\\bword\\b" />
        <Toggle checked={multiline} onChange={setMultiline} label="Multiline" hint="^ and $ per line" />
        {mode === "single" && (
          <Toggle checked={replaceAllMode} onChange={setReplaceAllMode} label="Replace all" />
        )}
      </ControlGroup>
      <ControlGroup label="Preview">
        <Toggle checked={showPreview} onChange={setShowPreview} label="Show diff" />
      </ControlGroup>
      <ControlGroup label="Regex library" hint="Insert pattern">
        <div className="grid grid-cols-2 gap-2">
          {REGEX_LIBRARY.map((item) => (
            <button
              key={item.label}
              onClick={() => insertRegexPattern(item.pattern)}
              className="kc-segment-btn"
              style={{ minHeight: 36 }}
              title={item.pattern}
            >
              {item.label}
            </button>
          ))}
        </div>
      </ControlGroup>
      <ControlGroup label="Presets" hint={`${presets.length} saved`}>
        <div className="flex flex-col gap-2">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <button
                onClick={() => loadPreset(p)}
                className="kc-segment-btn flex-1 truncate text-left"
                style={{ minHeight: 36, padding: "6px 10px", justifyContent: "flex-start" }}
                title={p.name}
              >
                {p.name}
              </button>
              <button
                onClick={() => deletePreset(p.id)}
                className="kc-segment-btn"
                style={{ minHeight: 36, minWidth: 36 }}
                aria-label="Delete preset"
              >
                ×
              </button>
            </div>
          ))}
          <button onClick={savePreset} className="kc-segment-btn" style={{ minHeight: 40 }}>
            + Save current
          </button>
        </div>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleApply} disabled={!hasChanges}>
        Apply
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy} disabled={!hasChanges}>
        {copied ? "Copied" : "Copy result"}
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Find & Replace"
      tagline="Regex · whole word · multiline · presets · live preview"
      accent="#6366f1"
      actions={actions}
      controls={controls}
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button
            role="tab"
            aria-selected={metroFRPivot === "input"}
            className={`metro-pivot-item${metroFRPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroFRPivot("input")}
          >
            Input
          </button>
          <button
            role="tab"
            aria-selected={metroFRPivot === "output"}
            className={`metro-pivot-item${metroFRPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroFRPivot("output")}
          >
            Output
          </button>
        </nav>
      )}
      <div className="relative flex flex-col gap-3 p-4 md:p-6">
      {(!isMetro || metroFRPivot === "input") && (<div className={isGlass ? "glass-canvas-section" : ""}><>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your text here..."
          className="w-full px-4 py-3 text-base font-mono focus:outline-none"
          style={{ ...inputStyle, minHeight: 140 }}
          rows={6}
          autoFocus
        />

        {/* Find / Replace fields - Single mode */}
        {mode === "single" && (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div className="relative">
              <input
                type="text"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                placeholder="Find..."
                className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
                style={inputStyle}
              />
              {find && matchCount > 0 && (
                <span
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    borderRadius: 999,
                  }}
                >
                  {matchCount}
                </span>
              )}
              {result.error && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: "#ef4444" }}>
                  {result.error}
                </span>
              )}
            </div>
            <input
              type="text"
              value={replace}
              onChange={(e) => setReplace(e.target.value)}
              placeholder="Replace with..."
              className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
              style={inputStyle}
            />
          </div>
        )}

        {/* Rules mode */}
        {mode === "rules" && (
          <div className="flex flex-col gap-2">
            {rules.map((rule, index) => (
              <div key={rule.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                <input
                  type="text"
                  value={rule.find}
                  onChange={(e) => updateRule(rule.id, "find", e.target.value)}
                  placeholder={`Find #${index + 1}`}
                  className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
                  style={inputStyle}
                />
                <input
                  type="text"
                  value={rule.replace}
                  onChange={(e) => updateRule(rule.id, "replace", e.target.value)}
                  placeholder="Replace with..."
                  className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
                  style={inputStyle}
                />
                <button
                  onClick={() => removeRule(rule.id)}
                  className="kc-segment-btn"
                  style={{ minHeight: 40, minWidth: 40 }}
                  aria-label="Remove rule"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addRule}
              className="kc-segment-btn"
              style={{ minHeight: 40, borderStyle: "dashed" }}
            >
              + Add rule
            </button>
            {result.error && (
              <p className="text-xs" style={{ color: "#ef4444" }}>{result.error}</p>
            )}
          </div>
        )}

        {/* Stats line */}
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--kami-text-dim)" }}
        >
          <span>{input.length} chars</span>
          {matchCount > 0 && (
            <span style={{ color: "var(--kami-text-muted)" }}>
              {matchCount} {matchCount === 1 ? "match" : "matches"}
            </span>
          )}
          {isMetro && hasChanges && (
            <button
              className="metro-pivot-item is-active"
              style={{ fontSize: 11, padding: "2px 10px", height: "auto" }}
              onClick={() => setMetroFRPivot("output")}
            >
              See output →
            </button>
          )}
        </div>
      </></div>)}
      {(!isMetro || metroFRPivot === "output") && (<div className={isGlass ? "glass-canvas-section" : ""}><>

        {/* Preview diff */}
        {hasChanges && showPreview && diffSegments && (
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: "var(--kami-text-muted)" }}>
              Preview
            </div>
            <div
              className="whitespace-pre-wrap px-4 py-3 text-sm overflow-auto"
              style={{ ...cardStyle, maxHeight: 260 }}
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
          </div>
        )}

        {/* Result output */}
        {hasChanges && (
          <div>
            <div className="text-sm font-medium mb-1" style={{ color: "var(--kami-text-muted)" }}>
              Result
            </div>
            <div
              className="whitespace-pre-wrap px-4 py-3 text-sm font-mono overflow-auto"
              style={{ ...cardStyle, maxHeight: 300 }}
            >
              {result.output}
            </div>
          </div>
        )}
      </></div>)}
      {isMaterial && hasChanges && (
        <button
          onClick={handleCopy}
          title="Copy result"
          aria-label="Copy result"
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#6750a4",
            color: "#fff",
            border: "none",
            boxShadow: "0 3px 12px rgba(103,80,164,0.45), 0 1px 4px rgba(103,80,164,0.25)",
            fontSize: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 20,
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      )}
      </div>
    </ToolShell>
  );
}
