"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ExampleGallery } from "@/components/tools/example-gallery";
import { InfoTip } from "@/components/tools/info-tip";
import { HowToSteps } from "@/components/tools/how-to-steps";
import { ReferencePanel } from "@/components/tools/reference-panel";

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
  /** One-line pitch for the framework itself. */
  tagline: string;
  /** When this framework is the right choice. */
  bestFor: string;
  /** A fully-filled sample for this framework the user can load. */
  sample?: Record<string, string>;
}

// --- Frameworks ---

const FRAMEWORKS: Framework[] = [
  {
    id: "moore",
    name: "Geoffrey Moore",
    author: "Crossing the Chasm",
    tagline: "The classic. Seven specific slots; fill them and a clear statement falls out.",
    bestFor: "Crossing the chasm from early adopters to mainstream - when you need to spell out segment, category, and competitor explicitly.",
    sample: {
      target_customer: "mid-market SaaS companies with 50-500 employees",
      statement_of_need: "struggle to predict and prevent customer churn",
      product_name: "RetentionIQ",
      product_category: "customer success platform",
      key_benefit: "identifies at-risk accounts 30 days before they cancel",
      competitive_alternative: "manual spreadsheet tracking and gut feel",
      key_differentiator: "uses ML on product-usage data, not just survey scores",
    },
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
    tagline: "Start from competitive alternatives. Let category fall out of your differentiation.",
    bestFor: "When you're in a crowded market, pivoting, or unsure what category you're really in. Dunford forces you to discover positioning instead of declaring it.",
    sample: {
      product_name: "RetentionIQ",
      competitive_alternatives: "spreadsheets, manual CS outreach, generic CRM reports",
      unique_attributes: "ingest product-usage signals and detect behavior drift automatically",
      value_enabled: "reduce churn by catching at-risk accounts 30 days before renewal",
      target_customers: "B2B SaaS teams with 500+ accounts and a dedicated CS function",
      market_category: "predictive customer success platform",
    },
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
    tagline: "Short and scrappy. Four slots, job-to-be-done framing.",
    bestFor: "Early-stage startups still proving product/market fit. Fast to fill and easy to iterate with customers.",
    sample: {
      customer_segment: "early-stage SaaS founders",
      job_to_be_done: "acquire their first 100 paying customers",
      value_proposition: "giving them a self-serve onboarding flow that converts trial users in under 5 minutes",
      competitors: "generic landing-page builders and manual sales outreach",
    },
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
    tagline: "A lightweight pitch for kickoff docs and internal alignment.",
    bestFor: "Internal briefs, one-line descriptions, or when you need to explain the product to a new team member without full GTM rigor.",
    sample: {
      product: "RetentionIQ",
      audience: "B2B SaaS customer success teams",
      outcome: "reduce churn by 25%",
      mechanism: "analyzing product usage patterns with ML",
      category: "customer success platform",
      differentiator: "uses product signals instead of lagging survey data",
    },
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

  const loadSample = useCallback(() => {
    const sample = framework.sample;
    if (!sample) return;
    setAllValues((prev) => ({
      ...prev,
      [activeFramework]: { ...sample },
    }));
  }, [activeFramework, framework.sample]);

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Positioning Statement Builder"
          tagline="Draft a sharp positioning statement in five minutes using proven frameworks."
          description="Pick a framework (Moore, Dunford, Blank, or a simple internal template), answer a guided set of questions, and watch a positioning statement assemble itself. Each framework forces you to think about a slightly different angle - pick the one that matches your situation, or fill in multiple and compare."
          audience={["PMMs", "Founders", "PMs", "Product marketers"]}
          whenToUse={[
            "Kicking off a launch or rebrand",
            "Sharpening a pitch that feels vague",
            "Aligning a team on what the product actually is",
          ]}
          quickLinks={[
            { label: "Which framework should I pick?", href: "#framework-guide" },
            { label: "How to write a good answer", href: "#writing-tips" },
          ]}
        />

        <HowToSteps
          steps={[
            { title: "Pick a framework below", body: "Not sure? Scroll to 'Which framework should I pick?' - we explain when each one fits." },
            { title: "Answer each question in plain language", body: "Hints and examples sit under every field. Press 'Load sample' to see a fully-filled statement you can edit." },
            { title: "Watch the live preview assemble", body: "Filled answers appear bold; [bracketed placeholders] show what's still missing." },
            { title: "Copy or compare", body: "Copy as plain text or markdown. Fill in a second framework and click 'Compare all' to see which sounds sharpest." },
          ]}
        />

        <div className="mb-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
            Pick a framework
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FRAMEWORKS.map((fw) => {
              const active = activeFramework === fw.id && viewMode === "edit";
              return (
                <button
                  key={fw.id}
                  onClick={() => { setActiveFramework(fw.id); setViewMode("edit"); }}
                  className="p-3 text-left transition-all"
                  style={
                    active
                      ? {
                          background: "var(--kami-cta-bg)",
                          color: "var(--kami-cta-text)",
                          border: "1px solid var(--kami-cta-bg)",
                          borderRadius: "var(--kami-card-radius, 0.75rem)",
                          boxShadow: "var(--kami-card-shadow, none)",
                        }
                      : {
                          background: "var(--kami-surface-solid)",
                          border: "1px solid var(--kami-border-strong)",
                          borderRadius: "var(--kami-card-radius, 0.75rem)",
                        }
                  }
                >
                  <div className="text-sm font-semibold" style={{ color: active ? "var(--kami-cta-text)" : "var(--kami-text)" }}>
                    {fw.name}
                  </div>
                  <div className="text-xs" style={{ color: active ? "var(--kami-overlay-text-dim)" : "var(--kami-text-muted)" }}>
                    {fw.author}
                  </div>
                  <div className="mt-1 text-xs" style={{ color: active ? "var(--kami-overlay-text-dim)" : "var(--kami-text-muted)" }}>
                    {fw.tagline}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div className="flex-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
              <span className="font-medium" style={{ color: "var(--kami-text)" }}>Best for:</span> {framework.bestFor}
            </div>
            {framework.sample && (
              <button
                onClick={loadSample}
                className="px-3 py-1 text-xs font-medium"
                style={{
                  background: "var(--kami-surface-solid)",
                  color: "var(--kami-text-muted)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "999px",
                }}
              >
                Load sample
              </button>
            )}
            {filledFrameworks.length > 0 && (
              <button
                onClick={() => setViewMode(viewMode === "compare" ? "edit" : "compare")}
                className="px-3 py-1 text-xs font-medium transition-colors"
                style={
                  viewMode === "compare"
                    ? {
                        background: "var(--kami-cta-bg)",
                        color: "var(--kami-cta-text)",
                        borderRadius: "999px",
                      }
                    : {
                        background: "var(--kami-surface-solid)",
                        color: "var(--kami-text-muted)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "999px",
                      }
                }
              >
                {viewMode === "compare" ? "Back to edit" : `Compare all (${filledFrameworks.length})`}
              </button>
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
                    className="group p-5 text-left transition-all"
                    style={{
                      background: "var(--kami-surface-solid)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-card-radius, 0.75rem)",
                      boxShadow: "var(--kami-card-shadow, none)",
                    }}
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
                          {fw.name}
                        </h3>
                        <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{fw.author}</p>
                      </div>
                      <span
                        className="px-2 py-0.5 text-xs font-medium"
                        style={
                          filledCount === totalCount
                            ? {
                                background: "color-mix(in srgb, #16a34a 10%, var(--kami-surface))",
                                color: "color-mix(in srgb, #16a34a 70%, var(--kami-text))",
                                borderRadius: "999px",
                              }
                            : {
                                background: "var(--kami-surface)",
                                color: "var(--kami-text-muted)",
                                borderRadius: "999px",
                              }
                        }
                      >
                        {filledCount}/{totalCount} fields
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      {statement.parts.map((part, i) =>
                        part.filled ? (
                          <span key={i} className="font-semibold" style={{ color: "var(--kami-text)" }}>
                            {part.text}
                          </span>
                        ) : part.text.startsWith("[") && part.text.endsWith("]") ? (
                          <span key={i} className="italic" style={{ color: "var(--kami-text-dim)" }}>
                            {part.text}
                          </span>
                        ) : (
                          <span key={i} style={{ color: "var(--kami-text-muted)" }}>
                            {part.text}
                          </span>
                        )
                      )}
                    </p>
                    <p className="mt-3 text-xs opacity-0 transition-opacity group-hover:opacity-100" style={{ color: "var(--kami-text-dim)" }}>
                      Click to edit
                    </p>
                  </button>
                );
              })}
            </div>
            {filledFrameworks.length === 0 && (
              <p className="text-center text-sm py-8" style={{ color: "var(--kami-text-dim)" }}>
                Fill in at least one framework to see the comparison.
              </p>
            )}
          </div>
        )}

        {/* Guided form */}
        {viewMode === "edit" && <><div
          className="mb-8 p-6"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
                {framework.name} · {framework.author}
              </h2>
              <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{framework.tagline}</p>
            </div>
            <div className="flex items-center gap-3">
              {framework.sample && (
                <button
                  onClick={loadSample}
                  className="text-xs font-medium underline underline-offset-2"
                  style={{ color: "var(--kami-text-muted)" }}
                >
                  Load sample
                </button>
              )}
              {hasAnyValue && (
                <button
                  onClick={clearForm}
                  className="text-xs transition-colors"
                  style={{ color: "var(--kami-text-dim)" }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div className="space-y-5">
            {framework.fields.map((field) => (
              <div key={field.key} className="flex flex-col gap-1.5">
                <label
                  htmlFor={`field-${field.key}`}
                  className="flex items-center gap-1.5 text-sm font-medium"
                  style={{ color: "var(--kami-text)" }}
                >
                  {field.label}
                  <InfoTip label={`About: ${field.label}`}>
                    <div className="font-semibold" style={{ color: "var(--kami-text)" }}>{field.hint}</div>
                    <div className="mt-1.5" style={{ color: "var(--kami-text-muted)" }}>{field.example}</div>
                  </InfoTip>
                </label>
                <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{field.hint}</p>
                {field.multiline ? (
                  <textarea
                    id={`field-${field.key}`}
                    value={values[field.key] ?? ""}
                    onChange={(e) => setFieldValue(field.key, e.target.value)}
                    placeholder={field.example}
                    rows={3}
                    className="px-3 py-2 text-sm focus:outline-none resize-none"
                    style={{
                      background: "var(--kami-input-bg, var(--kami-surface-solid))",
                      color: "var(--kami-text)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  />
                ) : (
                  <input
                    id={`field-${field.key}`}
                    type="text"
                    value={values[field.key] ?? ""}
                    onChange={(e) => setFieldValue(field.key, e.target.value)}
                    placeholder={field.example}
                    className="px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "var(--kami-input-bg, var(--kami-surface-solid))",
                      color: "var(--kami-text)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div
          className="mb-8 p-6"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
            Live Preview
          </h2>
          <p className="text-lg leading-relaxed">
            {previewParts.parts.map((part, i) =>
              part.filled ? (
                <span key={i} className="font-semibold" style={{ color: "var(--kami-text)" }}>
                  {part.text}
                </span>
              ) : part.text.startsWith("[") && part.text.endsWith("]") ? (
                <span
                  key={i}
                  className="italic"
                  style={{ color: "var(--kami-text-dim)" }}
                >
                  {part.text}
                </span>
              ) : (
                <span key={i} style={{ color: "var(--kami-text-muted)" }}>
                  {part.text}
                </span>
              )
            )}
          </p>
        </div>

        {/* Output section */}
        <div
          className="p-6"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
            Export
          </h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCopyPlain}
              className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors"
              style={{
                background: "var(--kami-cta-bg)",
                color: "var(--kami-cta-text)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              {copiedPlain ? <CheckIcon /> : <CopyIcon />}
              {copiedPlain ? "Copied" : "Copy as plain text"}
            </button>
            <button
              onClick={handleCopyFormatted}
              className="px-4 py-2 text-sm font-medium flex items-center gap-1.5 transition-colors"
              style={{
                background: "var(--kami-surface-solid)",
                color: "var(--kami-text-muted)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
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
                className="text-sm underline underline-offset-2 transition-colors"
                style={{ color: "var(--kami-text-muted)" }}
              >
                Try {fw.name} framework
              </button>
            ))}
          </div>
        </div>
        </>}

        <ReferencePanel
          id="framework-guide"
          title="Which framework should I pick?"
          summary="A short decision guide for the four frameworks in this tool."
          defaultOpen
        >
          <div className="space-y-4">
            {FRAMEWORKS.map((fw) => (
              <div
                key={fw.id}
                className="p-3"
                style={{
                  background: "var(--kami-surface)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.5rem)",
                }}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>{fw.name}</div>
                    <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{fw.author}</div>
                  </div>
                  <button
                    onClick={() => { setActiveFramework(fw.id); setViewMode("edit"); }}
                    className="text-xs font-medium underline underline-offset-2"
                    style={{ color: "var(--kami-text-muted)" }}
                  >
                    Use this →
                  </button>
                </div>
                <p className="mt-1 text-xs" style={{ color: "var(--kami-text)" }}>{fw.tagline}</p>
                <p className="mt-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  <span className="font-medium" style={{ color: "var(--kami-text)" }}>Best for:</span> {fw.bestFor}
                </p>
              </div>
            ))}
          </div>
        </ReferencePanel>

        <ReferencePanel
          id="writing-tips"
          title="How to write an answer that actually lands"
          summary="Common pitfalls and how to avoid them."
          defaultOpen={false}
        >
          <ul className="space-y-3">
            <li>
              <div className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Be specific, not aspirational.</div>
              <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                &quot;B2B SaaS teams with 500+ accounts&quot; beats &quot;enterprise customers.&quot;
                &quot;Reduce churn by 30%&quot; beats &quot;improve retention.&quot;
              </div>
            </li>
            <li>
              <div className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Name your real alternatives.</div>
              <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                The competitor field isn&apos;t just direct competitors - it&apos;s the spreadsheet,
                the intern, or the status quo. If you skip this, your positioning has no edge.
              </div>
            </li>
            <li>
              <div className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Differentiators must be defensible.</div>
              <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                &quot;Easy to use&quot; and &quot;fast&quot; aren&apos;t differentiators - everyone claims them.
                Look for something that requires specific data, tech, or expertise alternatives lack.
              </div>
            </li>
            <li>
              <div className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Category frames the value.</div>
              <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                The category you pick changes who compares you to what. &quot;Email tool&quot; competes
                with Gmail; &quot;sales engagement platform&quot; competes with Outreach. Pick the
                frame that makes your differentiation obvious.
              </div>
            </li>
            <li>
              <div className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>Test it out loud.</div>
              <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                Read the final statement to a target customer. If they say &quot;so what?&quot;, the
                value isn&apos;t concrete enough. If they say &quot;sounds like everyone,&quot; the
                differentiator isn&apos;t sharp enough.
              </div>
            </li>
          </ul>
        </ReferencePanel>

        <div className="mt-6 text-center text-xs" style={{ color: "var(--kami-text-dim)" }}>
          ⌘Enter copies the statement · ⌘K clears the form · Runs entirely in
          your browser - nothing is saved to a server.
        </div>
      </div>
    </div>
  );
}
