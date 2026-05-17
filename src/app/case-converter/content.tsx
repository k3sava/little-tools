"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Toggle, Segment } from "@/components/tools/controls";

// --- Case conversion logic ---

type CaseType =
  | "upper"
  | "lower"
  | "sentence"
  | "title-ap"
  | "title-apa"
  | "title-chicago"
  | "camel"
  | "snake"
  | "kebab"
  | "pascal"
  | "dot"
  | "constant"
  | "title-kebab";

function tokenize(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[_\-./]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function toCamelCase(words: string[]): string {
  if (words.length === 0) return "";
  return words
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

function toPascalCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("");
}

function toSnakeCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join("_");
}

function toKebabCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join("-");
}

function toDotCase(words: string[]): string {
  return words.map((w) => w.toLowerCase()).join(".");
}

function toConstantCase(words: string[]): string {
  return words.map((w) => w.toUpperCase()).join("_");
}

function toTitleKebabCase(words: string[]): string {
  return words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join("-");
}

const AP_MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "in",
  "nor", "of", "on", "or", "so", "the", "to", "up", "yet",
]);
const APA_MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "if", "in",
  "nor", "of", "on", "or", "so", "the", "to", "up", "via", "yet",
]);
const CHICAGO_MINOR_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "if",
  "in", "into", "nor", "of", "on", "onto", "or", "over", "so",
  "the", "to", "up", "upon", "with", "yet",
]);

type TitleStyle = "ap" | "apa" | "chicago";
const TITLE_STYLE_WORDS: Record<TitleStyle, Set<string>> = {
  ap: AP_MINOR_WORDS,
  apa: APA_MINOR_WORDS,
  chicago: CHICAGO_MINOR_WORDS,
};

function toTitleCase(text: string, style: TitleStyle): string {
  const minorWords = TITLE_STYLE_WORDS[style];
  return text
    .split("\n")
    .map((line) => {
      const tokens = line.split(/(\s+)/);
      const wordTokens = tokens.filter((w) => w.trim().length > 0);
      const lastWordIndex = wordTokens.length - 1;
      let wordCount = 0;
      let afterColon = false;
      return tokens
        .map((token) => {
          if (token.trim().length === 0) return token;
          const isFirst = wordCount === 0;
          const isLast = wordCount === lastWordIndex;
          wordCount++;
          const lower = token.toLowerCase();
          if (!isFirst && !isLast && !afterColon && minorWords.has(lower)) {
            afterColon = token.endsWith(":") || token.endsWith("-");
            return lower;
          }
          afterColon = token.endsWith(":") || token.endsWith("-");
          return lower.replace(/\b([a-z])/g, (_, c: string) => c.toUpperCase());
        })
        .join("");
    })
    .join("\n");
}

function toSentenceCase(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const lower = line.toLowerCase();
      return lower.replace(
        /(^|[.!?]\s+)([a-z])/g,
        (_, pre, c) => pre + c.toUpperCase()
      );
    })
    .join("\n");
}

function convert(text: string, caseType: CaseType): string {
  if (!text) return "";
  switch (caseType) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "sentence":
      return toSentenceCase(text);
    case "title-ap":
      return toTitleCase(text, "ap");
    case "title-apa":
      return toTitleCase(text, "apa");
    case "title-chicago":
      return toTitleCase(text, "chicago");
  }
  return text
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      const words = tokenize(line);
      switch (caseType) {
        case "camel":
          return toCamelCase(words);
        case "pascal":
          return toPascalCase(words);
        case "snake":
          return toSnakeCase(words);
        case "kebab":
          return toKebabCase(words);
        case "dot":
          return toDotCase(words);
        case "constant":
          return toConstantCase(words);
        case "title-kebab":
          return toTitleKebabCase(words);
        default:
          return line;
      }
    })
    .join("\n");
}

type DetectedCase =
  | "UPPER CASE"
  | "lower case"
  | "Sentence case"
  | "camelCase"
  | "PascalCase"
  | "snake_case"
  | "kebab-case"
  | "dot.case"
  | "CONSTANT_CASE"
  | "Title-Kebab-Case"
  | "Mixed";

function detectCase(text: string): DetectedCase | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const firstLine = trimmed.split("\n")[0].trim();
  if (!firstLine) return null;
  const hasSpaces = /\s/.test(firstLine);
  const hasUnderscores = /_/.test(firstLine);
  const hasHyphens = /-/.test(firstLine);
  const hasDots = /\./.test(firstLine);
  const hasUpper = /[A-Z]/.test(firstLine);
  const hasLower = /[a-z]/.test(firstLine);
  if (hasUnderscores && hasUpper && !hasLower && !hasSpaces) return "CONSTANT_CASE";
  if (hasUnderscores && !hasUpper && !hasSpaces) return "snake_case";
  if (hasHyphens && !hasSpaces && !hasUnderscores) {
    const segments = firstLine.split("-");
    const allTitleCase = segments.every(
      (s) =>
        s.length > 0 &&
        /^[A-Z]/.test(s) &&
        (s.length === 1 || /[a-z]/.test(s.slice(1)))
    );
    if (allTitleCase) return "Title-Kebab-Case";
  }
  if (hasHyphens && !hasUpper && !hasSpaces && !hasUnderscores) return "kebab-case";
  if (hasDots && !hasUpper && !hasSpaces && !hasUnderscores && !hasHyphens) return "dot.case";
  if (hasUpper && !hasLower) return "UPPER CASE";
  if (!hasUpper && hasLower) return "lower case";
  if (!hasSpaces && !hasUnderscores && !hasHyphens) {
    if (/^[a-z]/.test(firstLine) && hasUpper) return "camelCase";
    if (/^[A-Z]/.test(firstLine) && hasLower) return "PascalCase";
  }
  if (/^[A-Z]/.test(firstLine) && hasLower && hasSpaces) return "Sentence case";
  return "Mixed";
}

interface CaseInfo {
  value: CaseType;
  label: string;
  group: "writing" | "title" | "programming";
}

const CASES: CaseInfo[] = [
  { value: "upper", label: "UPPER", group: "writing" },
  { value: "lower", label: "lower", group: "writing" },
  { value: "sentence", label: "Sentence", group: "writing" },
  { value: "title-ap", label: "Title (AP)", group: "title" },
  { value: "title-apa", label: "Title (APA)", group: "title" },
  { value: "title-chicago", label: "Title (Chicago)", group: "title" },
  { value: "camel", label: "camelCase", group: "programming" },
  { value: "pascal", label: "PascalCase", group: "programming" },
  { value: "snake", label: "snake_case", group: "programming" },
  { value: "kebab", label: "kebab-case", group: "programming" },
  { value: "dot", label: "dot.case", group: "programming" },
  { value: "constant", label: "CONSTANT", group: "programming" },
  { value: "title-kebab", label: "Title-Kebab", group: "programming" },
];

const GROUP_LABELS: Record<CaseInfo["group"], string> = {
  writing: "Plain writing",
  title: "Title case",
  programming: "Programming",
};

const HISTORY_KEY = "kami_case_history";
const MAX_HISTORY = 6;

export default function CaseConverterContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [copiedCard, setCopiedCard] = useState<CaseType | null>(null);
  const [selectionOnly, setSelectionOnly] = useState(false);
  const [groupFilter, setGroupFilter] = useState<"all" | CaseInfo["group"]>("all");
  const [history, setHistory] = useState<string[]>([]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [setInput]));

  // Load history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (raw) setHistory(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Save history (debounced)
  useEffect(() => {
    if (!input.trim() || input.length > 500) return;
    const t = setTimeout(() => {
      setHistory((prev) => {
        const next = [input, ...prev.filter((x) => x !== input)].slice(0, MAX_HISTORY);
        try {
          localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
        } catch { /* ignore */ }
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [input]);

  const allConversions = useMemo(() => {
    if (!input.trim()) return [];
    return CASES.map((c) => ({ ...c, result: convert(input, c.value) }));
  }, [input]);

  const filteredConversions = useMemo(() => {
    if (groupFilter === "all") return allConversions;
    return allConversions.filter((c) => c.group === groupFilter);
  }, [allConversions, groupFilter]);

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const charCount = input.length;
  const detected = useMemo(() => detectCase(input), [input]);

  const handleCardCopy = useCallback(
    async (caseType: CaseType, text: string) => {
      if (!text) return;
      await navigator.clipboard.writeText(text);
      setCopiedCard(caseType);
      setTimeout(() => setCopiedCard(null), 2000);
    },
    []
  );

  const controls = (
    <>
      <ControlGroup label="Filter">
        <Segment
          value={groupFilter}
          onChange={setGroupFilter}
          options={[
            { value: "all", label: "All" },
            { value: "writing", label: "Writing" },
            { value: "title", label: "Title" },
            { value: "programming", label: "Code" },
          ]}
          full
          size="sm"
        />
      </ControlGroup>
      <ControlGroup label="Options">
        <Toggle
          checked={selectionOnly}
          onChange={setSelectionOnly}
          label="Apply to selection"
          hint="Highlight text first in your editor"
        />
      </ControlGroup>
      {history.length > 0 && (
        <ControlGroup label="Recent" hint={`${history.length}`}>
          <div className="flex flex-col gap-1">
            {history.map((h, i) => (
              <button
                key={i}
                onClick={() => setInput(h)}
                className="kc-segment-btn truncate text-left"
                style={{ minHeight: 36, padding: "6px 10px", justifyContent: "flex-start" }}
                title={h}
              >
                {h.length > 40 ? h.slice(0, 40) + "…" : h}
              </button>
            ))}
            <button
              onClick={() => {
                setHistory([]);
                try { localStorage.removeItem(HISTORY_KEY); } catch { /* ignore */ }
              }}
              className="text-xs mt-1"
              style={{ color: "var(--kami-text-dim)", textAlign: "left" }}
            >
              Clear history
            </button>
          </div>
        </ControlGroup>
      )}
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={() => setInput("")}>
        Clear
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Case Converter"
      tagline="13 cases · click any card to copy · auto-detect input"
      accent="#6366f1"
      actions={actions}
      controls={controls}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <div>
          {detected && input.trim() && (
            <div className="mb-2">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium"
                style={{
                  background: "var(--kami-surface)",
                  color: "var(--kami-text-muted)",
                  border: "1px solid var(--kami-border)",
                  borderRadius: "var(--kami-cta-radius, 0.375rem)",
                }}
              >
                <span
                  className="h-1.5 w-1.5"
                  style={{ background: "#6366f1", borderRadius: 999 }}
                />
                Detected: {detected}
              </span>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text — conversions appear below."
            className="w-full px-4 py-3 text-base focus:outline-none"
            style={{
              background: "var(--kami-input-bg, var(--kami-surface-solid))",
              color: "var(--kami-text)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-input-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
              minHeight: 120,
            }}
            rows={4}
            autoFocus
          />
          <div
            className="mt-1.5 flex items-center justify-between text-xs"
            style={{ color: "var(--kami-text-dim)" }}
          >
            <span>
              {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount}{" "}
              {charCount === 1 ? "char" : "chars"}
            </span>
          </div>
        </div>

        {filteredConversions.length === 0 ? (
          <div
            className="p-8 text-center text-sm"
            style={{
              background: "var(--kami-surface)",
              border: "1px dashed var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              color: "var(--kami-text-dim)",
            }}
          >
            Type something above to see all 13 case conversions.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {filteredConversions.map((c) => (
              <button
                key={c.value}
                onClick={() => handleCardCopy(c.value, c.result)}
                className="case-preserve group relative p-3 text-left transition-all"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                  color: "var(--kami-text)",
                  minHeight: 64,
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className="text-xs font-medium uppercase tracking-wide"
                    style={{ color: "var(--kami-text-muted)" }}
                  >
                    {c.label}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: copiedCard === c.value ? "#16a34a" : "var(--kami-text-dim)" }}
                  >
                    {copiedCard === c.value ? "Copied" : "Tap to copy"}
                  </span>
                </div>
                <div className="truncate font-mono text-sm" style={{ color: "var(--kami-text)" }}>
                  {c.result}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
