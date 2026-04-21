"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

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

/** Split text into words, handling camelCase, snake_case, kebab-case, dots, and spaces. */
function tokenize(text: string): string[] {
  return text
    .replace(/([a-z])([A-Z])/g, "$1 $2") // camelCase boundaries
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2") // ACRONYMWord boundaries
    .replace(/[_\-./]+/g, " ") // separators to spaces
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
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");
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
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("-");
}

// --- Title Case (AP/APA/Chicago) ---

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
      const tokens = line.split(/(\s+)/); // preserve whitespace
      const wordTokens = tokens.filter((w) => w.trim().length > 0);
      const lastWordIndex = wordTokens.length - 1;
      let wordCount = 0;
      let afterColon = false;

      return tokens
        .map((token) => {
          if (token.trim().length === 0) return token; // whitespace
          const isFirst = wordCount === 0;
          const isLast = wordCount === lastWordIndex;
          wordCount++;

          const lower = token.toLowerCase();

          if (
            !isFirst &&
            !isLast &&
            !afterColon &&
            minorWords.has(lower)
          ) {
            // Reset afterColon flag after processing
            afterColon = token.endsWith(":") || token.endsWith("\u2014");
            return lower;
          }

          // Check if this token ends with colon/em-dash for next word
          afterColon = token.endsWith(":") || token.endsWith("\u2014");

          // Capitalize first letter of each word segment (handles hyphens)
          return lower.replace(
            /\b([a-z])/g,
            (_, c: string) => c.toUpperCase()
          );
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
      return lower.replace(/(^|[.!?]\s+)([a-z])/g, (_, pre, c) => pre + c.toUpperCase());
    })
    .join("\n");
}

function convert(text: string, caseType: CaseType): string {
  if (!text) return "";

  // For upper/lower/sentence/title, operate on the full text preserving structure
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

  // For programming cases, convert line by line preserving blank lines
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

// --- Auto-detect input case ---

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

  // Use first line for detection
  const firstLine = trimmed.split("\n")[0].trim();
  if (!firstLine) return null;

  // Check for single-word to avoid false positives
  const hasSpaces = /\s/.test(firstLine);
  const hasUnderscores = /_/.test(firstLine);
  const hasHyphens = /-/.test(firstLine);
  const hasDots = /\./.test(firstLine);
  const hasUpper = /[A-Z]/.test(firstLine);
  const hasLower = /[a-z]/.test(firstLine);

  // CONSTANT_CASE: all uppercase with underscores
  if (hasUnderscores && hasUpper && !hasLower && !hasSpaces) {
    return "CONSTANT_CASE";
  }

  // snake_case: has underscores, all lowercase
  if (hasUnderscores && !hasUpper && !hasSpaces) {
    return "snake_case";
  }

  // Title-Kebab-Case: has hyphens, each segment starts uppercase
  if (hasHyphens && !hasSpaces && !hasUnderscores) {
    const segments = firstLine.split("-");
    const allTitleCase = segments.every(
      (s) => s.length > 0 && /^[A-Z]/.test(s) && (s.length === 1 || /[a-z]/.test(s.slice(1)))
    );
    if (allTitleCase) return "Title-Kebab-Case";
  }

  // kebab-case: has hyphens, all lowercase
  if (hasHyphens && !hasUpper && !hasSpaces && !hasUnderscores) {
    return "kebab-case";
  }

  // dot.case: has dots, all lowercase
  if (hasDots && !hasUpper && !hasSpaces && !hasUnderscores && !hasHyphens) {
    return "dot.case";
  }

  // UPPER CASE: all uppercase (may have spaces)
  if (hasUpper && !hasLower) {
    return "UPPER CASE";
  }

  // lower case: all lowercase (may have spaces)
  if (!hasUpper && hasLower) {
    return "lower case";
  }

  // No spaces, no separators — check for camel/pascal
  if (!hasSpaces && !hasUnderscores && !hasHyphens) {
    if (/^[a-z]/.test(firstLine) && hasUpper) {
      return "camelCase";
    }
    if (/^[A-Z]/.test(firstLine) && hasLower) {
      return "PascalCase";
    }
  }

  // Sentence case: starts with uppercase, rest mostly lower
  if (/^[A-Z]/.test(firstLine) && hasLower && hasSpaces) {
    return "Sentence case";
  }

  return "Mixed";
}

// --- UI ---

const CASES: { value: CaseType; label: string; example: string }[] = [
  { value: "upper", label: "UPPER CASE", example: "HELLO WORLD" },
  { value: "lower", label: "lower case", example: "hello world" },
  { value: "sentence", label: "Sentence case", example: "Hello world" },
  { value: "title-ap", label: "Title Case (AP)", example: "The Quick Brown Fox" },
  { value: "title-apa", label: "Title Case (APA)", example: "The Quick Brown Fox" },
  { value: "title-chicago", label: "Title Case (Chicago)", example: "The Quick Brown Fox" },
  { value: "camel", label: "camelCase", example: "helloWorld" },
  { value: "pascal", label: "PascalCase", example: "HelloWorld" },
  { value: "snake", label: "snake_case", example: "hello_world" },
  { value: "kebab", label: "kebab-case", example: "hello-world" },
  { value: "dot", label: "dot.case", example: "hello.world" },
  { value: "constant", label: "CONSTANT_CASE", example: "HELLO_WORLD" },
  { value: "title-kebab", label: "Title-Kebab-Case", example: "Hello-World" },
];

export default function CaseConverterContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [copiedCard, setCopiedCard] = useState<CaseType | null>(null);

  useKeyboardShortcuts(useMemo(() => [
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], []));

  const allConversions = useMemo(() => {
    if (!input.trim()) return [];
    return CASES.map((c) => ({
      ...c,
      result: convert(input, c.value),
    }));
  }, [input]);

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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Case Converter
          </h1>
          <p className="mt-2 text-gray-500">
            Convert text between naming conventions. No ads, no tracking.
          </p>
        </div>

        {/* Input */}
        <div className="relative">
          {detected && input.trim() && (
            <div className="mb-2">
              <span className="inline-block rounded-md bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                Detected: {detected}
              </span>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste your text here..."
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            rows={5}
            autoFocus
          />
        </div>

        {/* Stats */}
        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
          <span>
            {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount}{" "}
            {charCount === 1 ? "character" : "characters"}
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

        {/* All conversions grid */}
        {allConversions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {allConversions.map((c) => (
              <button
                key={c.value}
                onClick={() => handleCardCopy(c.value, c.result)}
                className="case-preserve group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-left transition-all hover:border-gray-300 hover:shadow-md cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    {c.label}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedCard === c.value ? (
                      <>
                        <CheckIcon />
                        <span className="text-gray-600 font-medium">
                          Copied!
                        </span>
                      </>
                    ) : (
                      <>
                        <CopyIcon />
                        Copy
                      </>
                    )}
                  </span>
                </div>
                <div className="font-mono text-sm text-gray-700 truncate">
                  {c.result}
                </div>
                {copiedCard === c.value && (
                  <div className="absolute inset-0 rounded-[inherit] border-2 border-gray-900 pointer-events-none" />
                )}
              </button>
            ))}
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
