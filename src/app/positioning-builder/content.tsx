"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- Types ---

type FrameworkId = "moore" | "dunford" | "blank" | "simple";

interface FrameworkField {
  key: string;
  label: string;
  hint: string;
  example: string;
  multiline?: boolean;
}

interface Framework {
  id: FrameworkId;
  name: string;
  author: string;
  template: string;
  fields: FrameworkField[];
}

// --- Frameworks ---

const FRAMEWORKS: Framework[] = [
  {
    id: "moore",
    name: "Geoffrey Moore",
    author: "Crossing the Chasm",
    template:
      "For {target_customer} who {statement_of_need}, {product_name} is a {product_category} that {key_benefit}. Unlike {competitive_alternative}, our product {key_differentiator}.",
    fields: [
      {
        key: "target_customer",
        label: "Who is your target customer?",
        hint: "The specific segment you serve",
        example: "e.g., mid-market SaaS companies with 50-500 employees",
      },
      {
        key: "statement_of_need",
        label: "What need or problem do they have?",
        hint: "The core pain point or job to be done",
        example: "e.g., need to reduce customer churn",
      },
      {
        key: "product_name",
        label: "What is your product called?",
        hint: "Your product or service name",
        example: "e.g., RetentionIQ",
      },
      {
        key: "product_category",
        label: "What category does it belong to?",
        hint: "The market category customers would recognize",
        example: "e.g., customer success platform",
      },
      {
        key: "key_benefit",
        label: "What is the key benefit?",
        hint: "The primary value delivered to the customer",
        example: "e.g., predicts churn risk 30 days before cancellation",
        multiline: true,
      },
      {
        key: "competitive_alternative",
        label: "What is the competitive alternative?",
        hint: "What customers use today instead of your product",
        example: "e.g., manual spreadsheet tracking and gut feel",
      },
      {
        key: "key_differentiator",
        label: "What makes you different?",
        hint: "Your unique capability that alternatives lack",
        example:
          "e.g., uses ML on product usage data, not just survey scores",
        multiline: true,
      },
    ],
  },
  {
    id: "dunford",
    name: "April Dunford",
    author: "Obviously Awesome",
    template:
      "{product_name} is a {market_category} for {target_customers} that {value_enabled}, unlike {competitive_alternatives} which {unique_attributes}.",
    fields: [
      {
        key: "product_name",
        label: "What is your product called?",
        hint: "Your product or service name",
        example: "e.g., RetentionIQ",
      },
      {
        key: "competitive_alternatives",
        label: "What would customers use if your product didn't exist?",
        hint: "Real alternatives customers compare you to (not just direct competitors)",
        example: "e.g., spreadsheets, manual outreach, existing CRM workflows",
        multiline: true,
      },
      {
        key: "unique_attributes",
        label: "What features/capabilities do you have that alternatives don't?",
        hint: "Concrete, defensible differentiators",
        example:
          "e.g., lack predictive signals from product usage data",
        multiline: true,
      },
      {
        key: "value_enabled",
        label: "What value do those attributes enable for customers?",
        hint: "The business outcome your unique capabilities drive",
        example: "e.g., reduces churn by identifying at-risk accounts 30 days early",
        multiline: true,
      },
      {
        key: "target_customers",
        label: "Who are the customers that care most about that value?",
        hint: "The segment where your differentiation matters most",
        example: "e.g., B2B SaaS teams with 500+ accounts and a CS team",
      },
      {
        key: "market_category",
        label: "What market context makes your value obvious?",
        hint: "The category frame that helps customers understand what you are",
        example: "e.g., predictive customer success platform",
      },
    ],
  },
  {
    id: "blank",
    name: "Steve Blank",
    author: "Customer Development",
    template:
      "We help {customer_segment} who want to {job_to_be_done} by {value_proposition} unlike {competitors}.",
    fields: [
      {
        key: "customer_segment",
        label: "Who is your customer segment?",
        hint: "The specific group of people or companies you serve",
        example: "e.g., early-stage SaaS founders",
      },
      {
        key: "job_to_be_done",
        label: "What job are they trying to get done?",
        hint: "The outcome they want to achieve",
        example: "e.g., acquire their first 100 paying customers",
        multiline: true,
      },
      {
        key: "value_proposition",
        label: "How do you help them do it?",
        hint: "Your mechanism or approach",
        example:
          "e.g., providing a self-serve onboarding flow that converts trial users in under 5 minutes",
        multiline: true,
      },
      {
        key: "competitors",
        label: "Who or what are the alternatives?",
        hint: "Competitors or status quo alternatives",
        example: "e.g., generic landing page builders and manual sales outreach",
      },
    ],
  },
  {
    id: "simple",
    name: "Simple / Internal",
    author: "General Purpose",
    template:
      "{product} helps {audience} {outcome} by {mechanism}. It's the only {category} that {differentiator}.",
    fields: [
      {
        key: "product",
        label: "Product name",
        hint: "Your product or service",
        example: "e.g., RetentionIQ",
      },
      {
        key: "audience",
        label: "Who does it help?",
        hint: "Your target audience",
        example: "e.g., B2B SaaS customer success teams",
      },
      {
        key: "outcome",
        label: "What outcome does it achieve?",
        hint: "The result your audience gets",
        example: "e.g., reduce churn by 25%",
      },
      {
        key: "mechanism",
        label: "How does it work?",
        hint: "The key mechanism or approach",
        example: "e.g., analyzing product usage patterns with ML",
        multiline: true,
      },
      {
        key: "category",
        label: "What category is it?",
        hint: "The market category",
        example: "e.g., customer success platform",
      },
      {
        key: "differentiator",
        label: "What makes it the only one?",
        hint: "Your unique differentiator within the category",
        example: "e.g., uses product signals instead of lagging survey data",
        multiline: true,
      },
    ],
  },
];

// --- Inline SVG Icons ---

function CopyIcon() {
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// --- Helpers ---

function buildStatement(
  template: string,
  values: Record<string, string>
): { parts: { text: string; filled: boolean }[] } {
  const parts: { text: string; filled: boolean }[] = [];
  const regex = /\{(\w+)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(template)) !== null) {
    // Text before the placeholder
    if (match.index > lastIndex) {
      parts.push({ text: template.slice(lastIndex, match.index), filled: false });
    }
    const key = match[1];
    const value = values[key]?.trim();
    if (value) {
      parts.push({ text: value, filled: true });
    } else {
      parts.push({ text: `[${key.replace(/_/g, " ")}]`, filled: false });
    }
    lastIndex = match.index + match[0].length;
  }

  // Trailing text
  if (lastIndex < template.length) {
    parts.push({ text: template.slice(lastIndex), filled: false });
  }

  return { parts };
}

function statementToPlainText(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key]?.trim();
    return value || `[${key.replace(/_/g, " ")}]`;
  });
}

function statementToMarkdown(
  template: string,
  values: Record<string, string>
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const value = values[key]?.trim();
    return value ? `**${value}**` : `_[${key.replace(/_/g, " ")}]_`;
  });
}

// --- Main Component ---

type ViewMode = "edit" | "compare";

export default function PositioningBuilderContent() {
  const [activeFramework, setActiveFramework] = useState<FrameworkId>("moore");
  const [allValues, setAllValues] = useState<Record<FrameworkId, Record<string, string>>>({
    moore: {},
    dunford: {},
    blank: {},
    simple: {},
  });
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [copiedFormatted, setCopiedFormatted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const copyTimeoutPlain = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimeoutFormatted = useRef<ReturnType<typeof setTimeout> | null>(null);

  const framework = useMemo(
    () => FRAMEWORKS.find((f) => f.id === activeFramework)!,
    [activeFramework]
  );

  const values = allValues[activeFramework];

  const setFieldValue = useCallback(
    (key: string, value: string) => {
      setAllValues((prev) => ({
        ...prev,
        [activeFramework]: { ...prev[activeFramework], [key]: value },
      }));
    },
    [activeFramework]
  );

  const clearForm = useCallback(() => {
    setAllValues((prev) => ({
      ...prev,
      [activeFramework]: {},
    }));
  }, [activeFramework]);

  const plainText = useMemo(
    () => statementToPlainText(framework.template, values),
    [framework.template, values]
  );

  const markdownText = useMemo(
    () => statementToMarkdown(framework.template, values),
    [framework.template, values]
  );

  const previewParts = useMemo(
    () => buildStatement(framework.template, values),
    [framework.template, values]
  );

  const hasAnyValue = useMemo(
    () => Object.values(values).some((v) => v.trim() !== ""),
    [values]
  );

  // Frameworks that have at least 1 field filled (for comparison view)
  const filledFrameworks = useMemo(() => {
    return FRAMEWORKS.filter((fw) => {
      const vals = allValues[fw.id];
      return Object.values(vals).some((v) => v.trim() !== "");
    });
  }, [allValues]);

  const handleCopyPlain = useCallback(() => {
    navigator.clipboard.writeText(plainText).then(() => {
      setCopiedPlain(true);
      if (copyTimeoutPlain.current) clearTimeout(copyTimeoutPlain.current);
      copyTimeoutPlain.current = setTimeout(() => setCopiedPlain(false), 2000);
    });
  }, [plainText]);

  const handleCopyFormatted = useCallback(() => {
    navigator.clipboard.writeText(markdownText).then(() => {
      setCopiedFormatted(true);
      if (copyTimeoutFormatted.current) clearTimeout(copyTimeoutFormatted.current);
      copyTimeoutFormatted.current = setTimeout(
        () => setCopiedFormatted(false),
        2000
      );
    });
  }, [markdownText]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "Enter",
          meta: true,
          action: () => handleCopyPlain(),
          label: "Copy statement",
        },
        {
          key: "k",
          meta: true,
          action: () => clearForm(),
          label: "Clear form",
        },
      ],
      [handleCopyPlain, clearForm]
    )
  );

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Positioning Statement Builder
          </h1>
          <p className="mt-2 text-gray-500">
            Build positioning statements with guided frameworks from April
            Dunford, Geoffrey Moore, and more
          </p>
        </div>

        {/* Framework pills */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {FRAMEWORKS.map((fw) => (
              <button
                key={fw.id}
                onClick={() => { setActiveFramework(fw.id); setViewMode("edit"); }}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  activeFramework === fw.id && viewMode === "edit"
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                {fw.name}
              </button>
            ))}
            {filledFrameworks.length > 0 && (
              <>
                <div className="mx-1 h-5 w-px bg-gray-200" />
                <button
                  onClick={() => setViewMode(viewMode === "compare" ? "edit" : "compare")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    viewMode === "compare"
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                  }`}
                >
                  Compare All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Comparison view */}
        {viewMode === "compare" && (
          <div className="mb-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {filledFrameworks.map((fw) => {
                const fwValues = allValues[fw.id];
                const filledCount = fw.fields.filter(
                  (f) => (fwValues[f.key] ?? "").trim() !== ""
                ).length;
                const totalCount = fw.fields.length;
                const statement = buildStatement(fw.template, fwValues);

                return (
                  <button
                    key={fw.id}
                    onClick={() => { setActiveFramework(fw.id); setViewMode("edit"); }}
                    className="group rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {fw.name}
                        </h3>
                        <p className="text-xs text-gray-400">{fw.author}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          filledCount === totalCount
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {filledCount}/{totalCount} fields
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {statement.parts.map((part, i) =>
                        part.filled ? (
                          <span key={i} className="font-semibold text-gray-900">
                            {part.text}
                          </span>
                        ) : part.text.startsWith("[") && part.text.endsWith("]") ? (
                          <span key={i} className="italic text-gray-300">
                            {part.text}
                          </span>
                        ) : (
                          <span key={i} className="text-gray-500">
                            {part.text}
                          </span>
                        )
                      )}
                    </p>
                    <p className="mt-3 text-xs text-gray-400 opacity-0 transition-opacity group-hover:opacity-100">
                      Click to edit
                    </p>
                  </button>
                );
              })}
            </div>
            {filledFrameworks.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-8">
                Fill in at least one framework to see the comparison.
              </p>
            )}
          </div>
        )}

        {/* Guided form */}
        {viewMode === "edit" && <><div className="mb-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide">
              {framework.name} Framework
            </h2>
            {hasAnyValue && (
              <button
                onClick={clearForm}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="space-y-5">
            {framework.fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`field-${field.key}`}
                  className="text-sm font-medium text-gray-800"
                >
                  {field.label}
                </label>
                <p className="text-xs text-gray-400">{field.hint}</p>
                {field.multiline ? (
                  <textarea
                    id={`field-${field.key}`}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setFieldValue(field.key, e.target.value)}
                    placeholder={field.example}
                    rows={3}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-300 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                  />
                ) : (
                  <input
                    id={`field-${field.key}`}
                    type="text"
                    value={values[field.key] ?? ""}
                    onChange={(e) => setFieldValue(field.key, e.target.value)}
                    placeholder={field.example}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-300 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-gray-50 p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Live Preview
          </h2>
          <p className="text-lg leading-relaxed">
            {previewParts.parts.map((part, i) =>
              part.filled ? (
                <span key={i} className="font-semibold text-gray-900">
                  {part.text}
                </span>
              ) : part.text.startsWith("[") && part.text.endsWith("]") ? (
                <span
                  key={i}
                  className="italic text-gray-400"
                >
                  {part.text}
                </span>
              ) : (
                <span key={i} className="text-gray-600">
                  {part.text}
                </span>
              )
            )}
          </p>
        </div>

        {/* Output section */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-500 uppercase tracking-wide">
            Export
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyPlain}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 flex items-center gap-1.5 transition-colors"
            >
              {copiedPlain ? <CheckIcon /> : <CopyIcon />}
              {copiedPlain ? "Copied" : "Copy as plain text"}
            </button>
            <button
              onClick={handleCopyFormatted}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-300 hover:text-gray-900 flex items-center gap-1.5 transition-colors"
            >
              {copiedFormatted ? <CheckIcon /> : <CopyIcon />}
              {copiedFormatted ? "Copied" : "Copy as formatted"}
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {FRAMEWORKS.filter((fw) => fw.id !== activeFramework).map((fw) => (
              <button
                key={fw.id}
                onClick={() => setActiveFramework(fw.id)}
                className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2 transition-colors"
              >
                Try {fw.name} framework
              </button>
            ))}
          </div>
        </div>
        </>}
      </div>
    </div>
  );
}
