"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ExampleGallery } from "@/components/tools/example-gallery";
import { InfoTip } from "@/components/tools/info-tip";
import {
  ReferencePanel,
  RuleRow,
} from "@/components/tools/reference-panel";

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

// --- Case catalog (with explanations) ---

interface CaseInfo {
  value: CaseType;
  label: string;
  example: string;
  group: "writing" | "title" | "programming";
  description: React.ReactNode;
  commonUse: string;
}

const CASES: CaseInfo[] = [
  {
    value: "upper",
    label: "UPPER CASE",
    example: "HELLO WORLD",
    group: "writing",
    description: "Every letter is capitalized.",
    commonUse: "Acronyms, warnings, all-caps headings.",
  },
  {
    value: "lower",
    label: "lower case",
    example: "hello world",
    group: "writing",
    description: "Every letter is lowercase.",
    commonUse: "URLs, tags, relaxed/minimalist copy.",
  },
  {
    value: "sentence",
    label: "Sentence case",
    example: "Hello world",
    group: "writing",
    description:
      "Only the first word of each sentence and proper nouns are capitalized.",
    commonUse: "Most body copy, UI microcopy, product descriptions.",
  },
  {
    value: "title-ap",
    label: "Title Case (AP)",
    example: "The Quick Brown Fox",
    group: "title",
    description: (
      <>
        Associated Press style. Capitalize all words <em>except</em> articles
        and short (≤3 letter) prepositions/conjunctions in the middle of a
        title. The first and last word are always capitalized.
      </>
    ),
    commonUse: "News headlines, most blog headlines.",
  },
  {
    value: "title-apa",
    label: "Title Case (APA)",
    example: "The Quick Brown Fox",
    group: "title",
    description: (
      <>
        APA 7th edition. Capitalize all words of four letters or more,
        plus nouns, verbs, adjectives, adverbs, and pronouns. Lowercase
        articles and conjunctions under 4 letters.
      </>
    ),
    commonUse: "Academic papers, scholarly articles.",
  },
  {
    value: "title-chicago",
    label: "Title Case (Chicago)",
    example: "The Quick Brown Fox",
    group: "title",
    description: (
      <>
        Chicago Manual of Style. Capitalize the first and last word, nouns,
        verbs, adjectives, adverbs, pronouns, and subordinating conjunctions.
        Lowercase articles, coordinating conjunctions, and prepositions
        regardless of length.
      </>
    ),
    commonUse: "Books, long-form essays, book-style publications.",
  },
  {
    value: "camel",
    label: "camelCase",
    example: "helloWorld",
    group: "programming",
    description:
      "First word lowercase, subsequent words start with a capital. No separators.",
    commonUse: "JavaScript/TypeScript variables, Java methods.",
  },
  {
    value: "pascal",
    label: "PascalCase",
    example: "HelloWorld",
    group: "programming",
    description: "Every word starts with a capital. No separators.",
    commonUse: "Class names, React components, .NET identifiers.",
  },
  {
    value: "snake",
    label: "snake_case",
    example: "hello_world",
    group: "programming",
    description: "All lowercase, words joined with underscores.",
    commonUse: "Python, Ruby, Rust, DB column names.",
  },
  {
    value: "kebab",
    label: "kebab-case",
    example: "hello-world",
    group: "programming",
    description: "All lowercase, words joined with hyphens.",
    commonUse: "URLs, CSS classes, HTML data-attributes, filenames.",
  },
  {
    value: "dot",
    label: "dot.case",
    example: "hello.world",
    group: "programming",
    description: "All lowercase, words joined with dots.",
    commonUse: "Feature flags, config keys, i18n namespaces.",
  },
  {
    value: "constant",
    label: "CONSTANT_CASE",
    example: "HELLO_WORLD",
    group: "programming",
    description:
      "SCREAMING_SNAKE_CASE - all uppercase, words joined with underscores.",
    commonUse: "Constants, environment variables.",
  },
  {
    value: "title-kebab",
    label: "Title-Kebab-Case",
    example: "Hello-World",
    group: "programming",
    description: "Each word capitalized, joined with hyphens.",
    commonUse: "HTTP headers (Content-Type), some filename styles.",
  },
];

const GROUPS: { id: CaseInfo["group"]; label: string; hint: string }[] = [
  { id: "writing", label: "Plain writing", hint: "Everyday prose and UI copy" },
  { id: "title", label: "Title case styles", hint: "For headlines - three competing style guides" },
  { id: "programming", label: "Programming", hint: "Identifiers, filenames, config keys" },
];

// --- Examples ---

const EXAMPLES = [
  { label: "Blog headline", value: "the quick brown fox jumps over the lazy dog", hint: "try title case" },
  { label: "API identifier", value: "getUserByIdAndEmail", hint: "try snake / kebab" },
  { label: "ENV variable", value: "DATABASE_CONNECTION_URL", hint: "try camel / kebab" },
  { label: "Long sentence", value: "this is a sentence. and here is another one! and a third?", hint: "try sentence case" },
];

// --- Component ---

export default function CaseConverterContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback(
    (v: string) => setToolState({ q: v }),
    [setToolState]
  );
  const [copiedCard, setCopiedCard] = useState<CaseType | null>(null);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "k", meta: true, action: () => setInput(""), label: "Clear" }],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    )
  );

  const allConversions = useMemo(() => {
    if (!input.trim()) return [];
    return CASES.map((c) => ({ ...c, result: convert(input, c.value) }));
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

  const grouped = useMemo(() => {
    const map: Record<CaseInfo["group"], typeof allConversions> = {
      writing: [],
      title: [],
      programming: [],
    };
    for (const c of allConversions) map[c.group].push(c);
    return map;
  }, [allConversions]);

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Case Converter"
          tagline="Convert text between 13 naming conventions - and learn the rules behind each one."
          description="Paste any text and see it converted every way at once: camelCase, snake_case, kebab-case, AP/APA/Chicago title case, and more. Click any card to copy. We detect what case your input is in, and the rules reference at the bottom explains exactly when to use each style."
          audience={["Writers", "Engineers", "Designers", "Editors"]}
          whenToUse={[
            "Turn a copied sentence into a slug or variable",
            "Rename an identifier without retyping it",
            "Apply consistent title-case to every headline on a page",
          ]}
          quickLinks={[
            { label: "Jump to title-case rules", href: "#title-case-rules" },
            { label: "Programming case guide", href: "#programming-case-guide" },
          ]}
        />

        <ExampleGallery
          title="Try one"
          examples={EXAMPLES}
          onPick={(v) => setInput(v)}
        />

        <div className="relative">
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
                  style={{
                    background: "var(--kami-accent, #16a34a)",
                    borderRadius: "999px",
                  }}
                />
                Detected: {detected}
              </span>
            </div>
          )}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type or paste text here - conversions appear below as you type."
            className="w-full px-4 py-3 text-base focus:outline-none"
            style={{
              background: "var(--kami-input-bg, var(--kami-surface-solid))",
              color: "var(--kami-text)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-input-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
            rows={5}
            autoFocus
          />
        </div>

        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
          <span>
            {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount}{" "}
            {charCount === 1 ? "character" : "characters"}
          </span>
          {input && (
            <button
              onClick={() => setInput("")}
              style={{ color: "var(--kami-text-dim)" }}
            >
              Clear (⌘K)
            </button>
          )}
        </div>

        {allConversions.length === 0 && (
          <div
            className="mt-6 p-8 text-center text-sm"
            style={{
              background: "var(--kami-surface)",
              border: "1px dashed var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              color: "var(--kami-text-dim)",
            }}
          >
            Start typing above - or click an example - to see all 13 case
            conversions.
          </div>
        )}

        {allConversions.length > 0 && (
          <div className="mt-6 space-y-6">
            {GROUPS.map((g) => {
              const items = grouped[g.id];
              if (!items.length) return null;
              return (
                <div key={g.id}>
                  <div className="mb-2 flex items-baseline justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
                      {g.label}
                    </div>
                    <div className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{g.hint}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {items.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => handleCardCopy(c.value, c.result)}
                        className="case-preserve group relative p-4 text-left transition-all"
                        style={{
                          background: "var(--kami-surface-solid)",
                          border: "1px solid var(--kami-border-strong)",
                          borderRadius: "var(--kami-card-radius, 0.75rem)",
                          boxShadow: "var(--kami-card-shadow, none)",
                          color: "var(--kami-text)",
                        }}
                      >
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
                            {c.label}
                            <InfoTip label={`About ${c.label}`}>
                              <div className="mb-1.5 font-semibold" style={{ color: "var(--kami-text)" }}>
                                {c.label}
                              </div>
                              <div className="mb-2">{c.description}</div>
                              <div style={{ color: "var(--kami-text-dim)" }}>
                                <strong>Common use:</strong> {c.commonUse}
                              </div>
                            </InfoTip>
                          </span>
                          <span
                            className="flex items-center gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ color: "var(--kami-text-dim)" }}
                          >
                            {copiedCard === c.value ? (
                              <>
                                <CheckIcon />
                                <span className="font-medium" style={{ color: "var(--kami-text)" }}>
                                  Copied
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
                        <div className="truncate font-mono text-sm" style={{ color: "var(--kami-text)" }}>
                          {c.result}
                        </div>
                        {copiedCard === c.value && (
                          <div
                            className="pointer-events-none absolute inset-0"
                            style={{
                              border: "2px solid var(--kami-text)",
                              borderRadius: "inherit",
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Rules reference - the titlecaseconverter.com feature */}
        <ReferencePanel
          id="title-case-rules"
          title="Title-case rules, by style guide"
          summary="AP, APA, and Chicago disagree. Here's exactly what each one does."
          defaultOpen
        >
          <div className="space-y-5">
            <StyleRuleCard
              name="Associated Press (AP)"
              tagline="News headlines, most blog headlines."
              rules={[
                "Capitalize the first and last word of the title.",
                "Capitalize all nouns, verbs, adjectives, adverbs, and pronouns.",
                "Capitalize prepositions and conjunctions of 4+ letters (e.g. About, After, With).",
                "Lowercase short articles and conjunctions (a, an, the, and, but, or, for, nor).",
                "Lowercase short prepositions (≤3 letters) - e.g. of, to, in, on, at, by.",
              ]}
              example="A Guide to the Habits of Highly Effective People"
            />
            <StyleRuleCard
              name="APA (7th edition)"
              tagline="Academic papers and scholarly articles."
              rules={[
                "Capitalize the first word of the title and subtitle.",
                "Capitalize major words (nouns, verbs, adjectives, adverbs, pronouns).",
                "Capitalize all words of 4 letters or more, regardless of part of speech.",
                "Lowercase articles, conjunctions, and prepositions shorter than 4 letters.",
                "Capitalize the first word after a colon or em-dash.",
              ]}
              example="A Guide to the Habits of Highly Effective People"
            />
            <StyleRuleCard
              name="Chicago Manual of Style"
              tagline="Books and long-form essays."
              rules={[
                "Capitalize the first and last word.",
                "Capitalize nouns, verbs, adjectives, adverbs, pronouns, and subordinating conjunctions (because, if, although…).",
                "Lowercase articles (a, an, the).",
                "Lowercase coordinating conjunctions (and, but, for, or, nor).",
                "Lowercase prepositions regardless of length (of, between, throughout).",
                "Capitalize the first word after a colon or em-dash.",
              ]}
              example="A Guide to the Habits of Highly Effective People"
            />
            <div
              className="p-3 text-xs"
              style={{
                background: "color-mix(in srgb, var(--kami-accent, #f59e0b) 10%, var(--kami-surface))",
                color: "var(--kami-text)",
                border: "1px solid color-mix(in srgb, var(--kami-accent, #f59e0b) 30%, transparent)",
                borderRadius: "var(--kami-card-radius, 0.5rem)",
              }}
            >
              <strong>Heads up:</strong> no style guide handles every edge
              case identically. For brand names, hyphenated terms, or unusual
              acronyms, prefer your team's style guide over any automated
              rule.
            </div>
          </div>
        </ReferencePanel>

        <ReferencePanel
          id="programming-case-guide"
          title="Programming case - which to use where"
          summary="The conventions most ecosystems agree on."
          defaultOpen={false}
        >
          <div className="grid gap-1 sm:grid-cols-1">
            <RuleRow
              rule="camelCase"
              explanation="JavaScript, TypeScript, Java, Swift variables and functions."
              example="getUserById"
            />
            <RuleRow
              rule="PascalCase"
              explanation="Class names, React/Vue components, .NET, TypeScript types."
              example="UserProfile"
            />
            <RuleRow
              rule="snake_case"
              explanation="Python, Rust, Ruby, PostgreSQL column names."
              example="get_user_by_id"
            />
            <RuleRow
              rule="kebab-case"
              explanation="URLs, CSS classes, HTML attributes, most filenames."
              example="user-profile"
            />
            <RuleRow
              rule="SCREAMING_SNAKE"
              explanation="Constants and environment variables across almost every language."
              example="MAX_RETRY_COUNT"
            />
            <RuleRow
              rule="dot.case"
              explanation="Feature flags, i18n keys, config keys."
              example="checkout.payment.retry"
            />
            <RuleRow
              rule="Title-Kebab"
              explanation="HTTP headers - one of the few places this hybrid is idiomatic."
              example="Content-Type"
            />
          </div>
        </ReferencePanel>

        <div className="mt-6 text-center text-xs" style={{ color: "var(--kami-text-dim)" }}>
          ⌘K clears the input · Click any card to copy · Runs entirely in your
          browser - nothing is uploaded.
        </div>
      </div>
    </div>
  );
}

// --- Small subcomponent for rule blocks ---

function StyleRuleCard({
  name,
  tagline,
  rules,
  example,
}: {
  name: string;
  tagline: string;
  rules: string[];
  example: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>{name}</div>
        <div className="text-xs text-right" style={{ color: "var(--kami-text-dim)" }}>{tagline}</div>
      </div>
      <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
        {rules.map((r, i) => (
          <li key={i} className="flex gap-2">
            <span style={{ color: "var(--kami-text-dim)" }}>•</span>
            <span>{r}</span>
          </li>
        ))}
      </ul>
      <div
        className="mt-3 px-3 py-2 font-mono text-xs"
        style={{
          background: "var(--kami-surface-solid)",
          color: "var(--kami-text)",
          border: "1px solid var(--kami-border)",
          borderRadius: "var(--kami-cta-radius, 0.375rem)",
        }}
      >
        {example}
      </div>
    </div>
  );
}

// --- Icons ---

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
