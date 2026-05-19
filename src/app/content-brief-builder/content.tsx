"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Select } from "@/components/tools/controls";

const ACCENT_SEO = "#3b82f6";

// --- Types ---

type SearchIntent = "informational" | "navigational" | "commercial" | "transactional";
type ContentType = "blog-post" | "landing-page" | "guide" | "comparison" | "how-to" | "listicle" | "case-study" | "whitepaper";

interface Section {
  id: string;
  heading: string;
  notes: string;
}

interface ContentBrief {
  // Core
  title: string;
  primaryKeyword: string;
  secondaryKeywords: string;
  searchIntent: SearchIntent;
  contentType: ContentType;
  // Audience
  targetAudience: string;
  audiencePainPoints: string;
  // Content spec
  wordCountMin: string;
  wordCountMax: string;
  tone: string;
  sections: Section[];
  keyPoints: string;
  // SEO
  internalLinks: string;
  externalLinks: string;
  metaTitle: string;
  metaDescription: string;
  // CTA
  primaryCta: string;
  ctaPlacement: string;
  // Notes
  additionalNotes: string;
}

// --- Constants ---

const INTENTS: { value: SearchIntent; label: string; desc: string }[] = [
  { value: "informational", label: "Informational", desc: "User wants to learn" },
  { value: "navigational", label: "Navigational", desc: "User wants to find a page" },
  { value: "commercial", label: "Commercial", desc: "User is comparing options" },
  { value: "transactional", label: "Transactional", desc: "User is ready to buy" },
];

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "blog-post", label: "Blog Post" },
  { value: "landing-page", label: "Landing Page" },
  { value: "guide", label: "Guide / Pillar Page" },
  { value: "comparison", label: "Comparison Article" },
  { value: "how-to", label: "How-To / Tutorial" },
  { value: "listicle", label: "Listicle" },
  { value: "case-study", label: "Case Study" },
  { value: "whitepaper", label: "Whitepaper" },
];

const TONES = ["Professional", "Conversational", "Technical", "Friendly", "Authoritative", "Educational"];

const LS_KEY = "kami-content-brief-builder";

const DEFAULT_BRIEF: ContentBrief = {
  title: "How to Choose the Right Business Phone System in 2026",
  primaryKeyword: "business phone system",
  secondaryKeywords: "VoIP for business, cloud phone system, business calling software",
  searchIntent: "commercial",
  contentType: "comparison",
  targetAudience: "SMB operations managers evaluating phone systems for 10-200 person teams",
  audiencePainPoints: "Existing system is expensive and hard to manage. Dropped calls. Poor mobile experience. No integrations with CRM.",
  wordCountMin: "2000",
  wordCountMax: "3000",
  tone: "Professional",
  sections: [
    { id: crypto.randomUUID(), heading: "Why your phone system matters", notes: "Cost of missed calls, productivity impact" },
    { id: crypto.randomUUID(), heading: "Key features to evaluate", notes: "Call quality, mobile app, integrations, analytics, AI" },
    { id: crypto.randomUUID(), heading: "Top 5 business phone systems compared", notes: "Feature comparison table, pricing, pros/cons" },
    { id: crypto.randomUUID(), heading: "How to evaluate for your team", notes: "Decision framework, free trial checklist" },
    { id: crypto.randomUUID(), heading: "Making the switch", notes: "Migration steps, porting numbers, training" },
  ],
  keyPoints: "Include real pricing (not just 'contact sales'). Address hybrid/remote work. Mention AI features as differentiator.",
  internalLinks: "/features, /pricing, /integrations",
  externalLinks: "G2 reviews, Gartner market guide",
  metaTitle: "",
  metaDescription: "",
  primaryCta: "Start free trial",
  ctaPlacement: "After comparison table and at end of article",
  additionalNotes: "",
};

// --- Export ---

function exportMarkdown(brief: ContentBrief): string {
  const lines: string[] = [];
  lines.push("# Content Brief");
  lines.push("");
  lines.push(`**Title:** ${brief.title}`);
  lines.push(`**Primary Keyword:** ${brief.primaryKeyword}`);
  if (brief.secondaryKeywords) lines.push(`**Secondary Keywords:** ${brief.secondaryKeywords}`);
  lines.push(`**Search Intent:** ${INTENTS.find((i) => i.value === brief.searchIntent)?.label || brief.searchIntent}`);
  lines.push(`**Content Type:** ${CONTENT_TYPES.find((t) => t.value === brief.contentType)?.label || brief.contentType}`);
  lines.push(`**Word Count:** ${brief.wordCountMin}-${brief.wordCountMax}`);
  if (brief.tone) lines.push(`**Tone:** ${brief.tone}`);
  lines.push("");

  lines.push("## Target Audience");
  lines.push(brief.targetAudience);
  if (brief.audiencePainPoints) {
    lines.push("");
    lines.push("**Pain Points:**");
    lines.push(brief.audiencePainPoints);
  }
  lines.push("");

  lines.push("## Outline");
  for (const s of brief.sections) {
    lines.push(`### ${s.heading}`);
    if (s.notes) lines.push(`_${s.notes}_`);
    lines.push("");
  }

  if (brief.keyPoints) {
    lines.push("## Key Points to Cover");
    lines.push(brief.keyPoints);
    lines.push("");
  }

  if (brief.internalLinks || brief.externalLinks) {
    lines.push("## Links");
    if (brief.internalLinks) lines.push(`**Internal:** ${brief.internalLinks}`);
    if (brief.externalLinks) lines.push(`**External:** ${brief.externalLinks}`);
    lines.push("");
  }

  if (brief.metaTitle || brief.metaDescription) {
    lines.push("## SEO Meta");
    if (brief.metaTitle) lines.push(`**Meta Title:** ${brief.metaTitle}`);
    if (brief.metaDescription) lines.push(`**Meta Description:** ${brief.metaDescription}`);
    lines.push("");
  }

  if (brief.primaryCta) {
    lines.push("## CTA");
    lines.push(`**Primary:** ${brief.primaryCta}`);
    if (brief.ctaPlacement) lines.push(`**Placement:** ${brief.ctaPlacement}`);
    lines.push("");
  }

  if (brief.additionalNotes) {
    lines.push("## Additional Notes");
    lines.push(brief.additionalNotes);
  }

  return lines.join("\n");
}

// --- Component ---

export default function ContentBriefBuilderContent() {
  const [brief, setBrief] = useState<ContentBrief>(DEFAULT_BRIEF);
  const [copied, setCopied] = useState(false);
  const [metroCPivot, setMetroCPivot] = useState<string>("input");


  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.title !== undefined) {
          setBrief(parsed);
        }
      }
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(brief));
    } catch {}
  }, [brief]);

  const update = useCallback(
    <K extends keyof ContentBrief>(field: K, value: ContentBrief[K]) => {
      setBrief((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const addSection = useCallback(() => {
    setBrief((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        { id: crypto.randomUUID(), heading: "", notes: "" },
      ],
    }));
  }, []);

  const updateSection = useCallback(
    (id: string, field: "heading" | "notes", value: string) => {
      setBrief((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === id ? { ...s, [field]: value } : s
        ),
      }));
    },
    []
  );

  const removeSection = useCallback((id: string) => {
    setBrief((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
  }, []);

  const moveSection = useCallback((id: string, dir: -1 | 1) => {
    setBrief((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.sections.length) return prev;
      const copy = [...prev.sections];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return { ...prev, sections: copy };
    });
  }, []);

  const formatted = useMemo(() => exportMarkdown(brief), [brief]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [formatted]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([formatted], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-brief-${brief.primaryKeyword.replace(/\s+/g, "-") || "draft"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [formatted, brief.primaryKeyword]);

  const handleClear = useCallback(() => {
    setBrief({
      ...DEFAULT_BRIEF,
      title: "",
      primaryKeyword: "",
      secondaryKeywords: "",
      targetAudience: "",
      audiencePainPoints: "",
      wordCountMin: "",
      wordCountMax: "",
      tone: "",
      sections: [{ id: crypto.randomUUID(), heading: "", notes: "" }],
      keyPoints: "",
      internalLinks: "",
      externalLinks: "",
      metaTitle: "",
      metaDescription: "",
      primaryCta: "",
      ctaPlacement: "",
      additionalNotes: "",
    });
    localStorage.removeItem(LS_KEY);
  }, []);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "Enter", meta: true, action: handleCopy, label: "Copy" },
        { key: "d", meta: true, action: handleDownload, label: "Download" },
      ],
      [handleCopy, handleDownload]
    )
  );

  // Completeness score
  const completeness = useMemo(() => {
    let filled = 0;
    let total = 8;
    if (brief.title.trim()) filled++;
    if (brief.primaryKeyword.trim()) filled++;
    if (brief.targetAudience.trim()) filled++;
    if (brief.sections.some((s) => s.heading.trim())) filled++;
    if (brief.wordCountMin || brief.wordCountMax) filled++;
    if (brief.keyPoints.trim()) filled++;
    if (brief.primaryCta.trim()) filled++;
    if (brief.tone) filled++;
    return Math.round((filled / total) * 100);
  }, [brief]);

  const inputClass = "w-full px-3 py-2 text-sm focus:outline-none";
  const inputStyle: React.CSSProperties = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  };
  const labelClass = "mb-1 block text-xs font-medium";
  const labelStyle: React.CSSProperties = { color: "var(--kami-text-muted)" };
  const cardStyle: React.CSSProperties = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  };

  const controls = (
    <>
      <ControlGroup label="Completeness">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs kami-text-muted">
            <span>Brief filled</span>
            <span className="tabular-nums font-bold kami-text">{completeness}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--kami-border)" }}>
            <div style={{ width: `${completeness}%`, height: "100%", background: completeness >= 80 ? "#10b981" : completeness >= 50 ? "#f59e0b" : ACCENT_SEO }} />
          </div>
        </div>
      </ControlGroup>
      <ControlGroup label="Intent">
        <Select
          value={brief.searchIntent}
          onChange={(v) => update("searchIntent", v as SearchIntent)}
          options={INTENTS.map((i) => ({ value: i.value as string, label: i.label }))}
        />
      </ControlGroup>
      <ControlGroup label="Content type">
        <Select
          value={brief.contentType}
          onChange={(v) => update("contentType", v as ContentType)}
          options={CONTENT_TYPES.map((t) => ({ value: t.value as string, label: t.label }))}
        />
      </ControlGroup>
      <ControlGroup label="Tone">
        <Select
          value={brief.tone}
          onChange={(v) => update("tone", v)}
          options={[{ value: "", label: "—" }, ...TONES.map((t) => ({ value: t, label: t }))]}
        />
      </ControlGroup>
      <ControlGroup label="Manage">
        <button onClick={addSection} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Add section</button>
        <button onClick={handleClear} className="kc-segment-btn" style={{ minHeight: 40 }}>Clear all</button>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleDownload}>Download .md</ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy}>
        {copied ? "Copied" : "Copy MD"}
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs kami-text-muted">
      <p>Produce a writer-ready content brief: target keyword, audience, intent, outline, links, CTAs. Auto-saves to localStorage.</p>
      <p>Export as Markdown to paste into Notion / Docs / Linear. Completeness score helps you spot gaps before handing off.</p>
    </div>
  );

  return (
    <ToolShell
      title="Content Brief Builder"
      tagline="Structured fields · outline · auto-save · export to Markdown"
      accent={ACCENT_SEO}
      actions={actions}
      controls={controls}
      info={info}
    >
      <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
        <button role="tab" aria-selected={metroCPivot === "input"}
          className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
          onClick={() => setMetroCPivot("input")}>Brief</button>
        <button role="tab" aria-selected={metroCPivot === "output"}
          className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
          onClick={() => setMetroCPivot("output")}>Output</button>
      </nav>
      <div className="grid grid-cols-1 gap-4 p-4 md:p-6 lg:grid-cols-3">
          {/* Left column: form */}
          <div className="canvas-section glass-canvas-section" data-panel="input"><div className="space-y-4 lg:col-span-2">
            {/* Core */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 text-sm font-semibold kami-text-muted">
                Content Spec
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass} style={labelStyle}>Working Title</label>
                  <input
                    type="text"
                    value={brief.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="How to Choose the Right Business Phone System"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} style={labelStyle}>Primary Keyword</label>
                    <input
                      type="text"
                      value={brief.primaryKeyword}
                      onChange={(e) =>
                        update("primaryKeyword", e.target.value)
                      }
                      placeholder="business phone system"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>
                      Secondary Keywords (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={brief.secondaryKeywords}
                      onChange={(e) =>
                        update("secondaryKeywords", e.target.value)
                      }
                      placeholder="VoIP for business, cloud phone"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} style={labelStyle}>Min Words</label>
                    <input
                      type="number"
                      value={brief.wordCountMin}
                      onChange={(e) =>
                        update("wordCountMin", e.target.value)
                      }
                      placeholder="1500"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>Max Words</label>
                    <input
                      type="number"
                      value={brief.wordCountMax}
                      onChange={(e) =>
                        update("wordCountMax", e.target.value)
                      }
                      placeholder="2500"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Audience */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 text-sm font-semibold kami-text-muted">
                Target Audience
              </h2>
              <div className="space-y-3">
                <div>
                  <label className={labelClass} style={labelStyle}>Who is this for?</label>
                  <input
                    type="text"
                    value={brief.targetAudience}
                    onChange={(e) =>
                      update("targetAudience", e.target.value)
                    }
                    placeholder="SMB ops managers evaluating phone systems"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Pain points / problems they have
                  </label>
                  <textarea
                    value={brief.audiencePainPoints}
                    onChange={(e) =>
                      update("audiencePainPoints", e.target.value)
                    }
                    placeholder="Expensive legacy system, poor mobile experience, no CRM integration"
                    rows={2}
                    className={inputClass + " resize-none"}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Outline */}
            <div className="p-5" style={cardStyle}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-sm font-semibold kami-text-muted">
                  Outline ({brief.sections.length} sections)
                </h2>
              </div>
              <div className="space-y-2">
                {brief.sections.map((s, i) => (
                  <div
                    key={s.id}
                    className="group flex items-start gap-2 px-3 py-2"
                    style={{
                      border: "1px solid var(--kami-border)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  >
                    <span className="mt-2 flex-shrink-0 text-xs font-medium kami-text-dim">
                      H2
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <input
                        type="text"
                        value={s.heading}
                        onChange={(e) =>
                          updateSection(s.id, "heading", e.target.value)
                        }
                        placeholder={`Section ${i + 1} heading`}
                        className="w-full border-0 bg-transparent px-0 py-0 text-sm font-medium focus:outline-none focus:ring-0 kami-text"
                      />
                      <input
                        type="text"
                        value={s.notes}
                        onChange={(e) =>
                          updateSection(s.id, "notes", e.target.value)
                        }
                        placeholder="Notes for writer"
                        className="w-full border-0 bg-transparent px-0 py-0 text-xs focus:outline-none focus:ring-0 kami-text-muted"
                      />
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => moveSection(s.id, -1)}
                        disabled={i === 0}
                        className="rounded px-1 py-0.5 text-xs disabled:opacity-30 kami-text-dim"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveSection(s.id, 1)}
                        disabled={i === brief.sections.length - 1}
                        className="rounded px-1 py-0.5 text-xs disabled:opacity-30 kami-text-dim"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeSection(s.id)}
                        className="rounded px-1 py-0.5 text-xs kami-text-dim"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={addSection}
                className="mt-2 w-full px-4 py-2 text-sm transition-colors"
                style={{
                  border: "1px dashed var(--kami-border-strong)",
                  color: "var(--kami-text-muted)",
                  borderRadius: "var(--kami-cta-radius, 0.5rem)",
                }}
              >
                + Add Section
              </button>
            </div>

            {/* Key points */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 text-sm font-semibold kami-text-muted">
                Key Points &amp; Requirements
              </h2>
              <textarea
                value={brief.keyPoints}
                onChange={(e) => update("keyPoints", e.target.value)}
                placeholder="Must-include facts, angles, or constraints for the writer"
                rows={3}
                className={inputClass + " resize-none"}
                style={inputStyle}
              />
            </div>

            {/* SEO & Links */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 text-sm font-semibold kami-text-muted">
                SEO &amp; Links
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} style={labelStyle}>Internal Links</label>
                    <input
                      type="text"
                      value={brief.internalLinks}
                      onChange={(e) =>
                        update("internalLinks", e.target.value)
                      }
                      placeholder="/features, /pricing"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelClass} style={labelStyle}>External Links</label>
                    <input
                      type="text"
                      value={brief.externalLinks}
                      onChange={(e) =>
                        update("externalLinks", e.target.value)
                      }
                      placeholder="G2 reviews, industry reports"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Meta Title (optional)</label>
                  <input
                    type="text"
                    value={brief.metaTitle}
                    onChange={(e) => update("metaTitle", e.target.value)}
                    placeholder="Leave blank to auto-derive from title"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>
                    Meta Description (optional)
                  </label>
                  <input
                    type="text"
                    value={brief.metaDescription}
                    onChange={(e) =>
                      update("metaDescription", e.target.value)
                    }
                    placeholder="150-160 characters"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 text-sm font-semibold kami-text-muted">
                Call to Action
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} style={labelStyle}>Primary CTA</label>
                  <input
                    type="text"
                    value={brief.primaryCta}
                    onChange={(e) => update("primaryCta", e.target.value)}
                    placeholder="Start free trial"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className={labelClass} style={labelStyle}>Placement</label>
                  <input
                    type="text"
                    value={brief.ctaPlacement}
                    onChange={(e) =>
                      update("ctaPlacement", e.target.value)
                    }
                    placeholder="After comparison table and at end"
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {/* Additional notes */}
            <div className="p-5" style={cardStyle}>
              <h2 className="mb-4 text-sm font-semibold kami-text-muted">
                Additional Notes
              </h2>
              <textarea
                value={brief.additionalNotes}
                onChange={(e) =>
                  update("additionalNotes", e.target.value)
                }
                placeholder="Anything else the writer should know"
                rows={3}
                className={inputClass + " resize-none"}
                style={inputStyle}
              />
            </div>
          </div></div>

          {/* Right column: preview */}
          <div className="canvas-section glass-canvas-section" data-panel="output"><div className="lg:col-span-1">
            <div className="sticky top-4" style={cardStyle}>
              <div className="px-5 py-3 kami-border-bottom">
                <h2 className="text-sm font-semibold kami-text-muted">
                  Preview
                </h2>
              </div>
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto p-5">
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed kami-text-muted">
                  {formatted}
                </pre>
              </div>
            </div>
          </div></div>
      </div>
    </ToolShell>
  );
}
