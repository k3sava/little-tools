"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, NumberStepper } from "@/components/tools/controls";

const ACCENT_PM = "#0ea5e9";

// --- Types ---

type Category = "new" | "improved" | "fixed" | "removed" | "security" | "deprecated" | "other";

interface ChangeItem {
  id: string;
  text: string;
  category: Category;
}

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  items: ChangeItem[];
}

// --- Constants ---

const CATEGORIES: { value: Category; label: string; hex: string; icon: string; keywords: string[] }[] = [
  { value: "new", label: "New", hex: "#10b981", icon: "✦", keywords: ["add", "added", "new", "introduce", "introduced", "launch", "launched", "create", "created", "support", "enable", "enabled"] },
  { value: "improved", label: "Improved", hex: "#2563eb", icon: "▲", keywords: ["improve", "improved", "update", "updated", "enhance", "enhanced", "upgrade", "upgraded", "optimize", "optimized", "better", "increase", "increased", "boost", "boosted", "refactor", "refactored", "redesign", "redesigned"] },
  { value: "fixed", label: "Fixed", hex: "#f59e0b", icon: "●", keywords: ["fix", "fixed", "resolve", "resolved", "patch", "patched", "bug", "bugfix", "correct", "corrected", "repair", "repaired", "address", "addressed"] },
  { value: "removed", label: "Removed", hex: "#dc2626", icon: "✕", keywords: ["remove", "removed", "delete", "deleted", "drop", "dropped", "eliminate", "eliminated"] },
  { value: "security", label: "Security", hex: "#9333ea", icon: "◆", keywords: ["security", "vulnerability", "cve", "auth", "authentication", "authorization", "encrypt", "encrypted", "ssl", "tls", "xss", "csrf", "injection"] },
  { value: "deprecated", label: "Deprecated", hex: "#6b7280", icon: "◇", keywords: ["deprecate", "deprecated", "sunset", "legacy", "end-of-life", "eol"] },
  { value: "other", label: "Other", hex: "#9ca3af", icon: "·", keywords: [] },
];

function categoryBadgeStyle(hex: string): React.CSSProperties {
  return {
    background: `color-mix(in srgb, ${hex} 12%, var(--kami-surface))`,
    color: `color-mix(in srgb, ${hex} 80%, var(--kami-text))`,
    border: `1px solid color-mix(in srgb, ${hex} 35%, transparent)`,
  };
}

const CATEGORY_MAP = new Map(CATEGORIES.map((c) => [c.value, c]));

function getCategoryMeta(cat: Category) {
  return CATEGORY_MAP.get(cat) ?? CATEGORIES[CATEGORIES.length - 1];
}

// --- Auto-categorize ---

function autoCategory(text: string): Category {
  const lower = text.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => {
      // Match word boundary to avoid false positives
      const re = new RegExp(`\\b${kw}\\b`, "i");
      return re.test(lower);
    })) {
      return cat.value;
    }
  }
  return "other";
}

// --- Parse raw text into items ---

function parseRawText(raw: string): ChangeItem[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^[\s\-\*•→►▸▹‣⁃]+/, "").trim())
    .filter((line) => line.length > 0)
    .map((text) => ({
      id: crypto.randomUUID(),
      text,
      category: autoCategory(text),
    }));
}

// --- Format output ---

function formatMarkdown(note: ReleaseNote): string {
  const lines: string[] = [];
  const heading = note.title
    ? `# ${note.title}`
    : `# ${note.version || "Release Notes"}`;
  lines.push(heading);
  if (note.version || note.date) {
    const meta = [note.version, note.date].filter(Boolean).join(" - ");
    lines.push(`_${meta}_`);
  }
  lines.push("");

  const grouped = groupByCategory(note.items);
  for (const [cat, items] of grouped) {
    const meta = getCategoryMeta(cat);
    lines.push(`## ${meta.icon} ${meta.label}`);
    for (const item of items) {
      lines.push(`- ${item.text}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function formatHTML(note: ReleaseNote): string {
  const lines: string[] = [];
  const heading = note.title || note.version || "Release Notes";
  lines.push(`<h1>${esc(heading)}</h1>`);
  if (note.version || note.date) {
    const meta = [note.version, note.date].filter(Boolean).join(" - ");
    lines.push(`<p><em>${esc(meta)}</em></p>`);
  }

  const grouped = groupByCategory(note.items);
  for (const [cat, items] of grouped) {
    const meta = getCategoryMeta(cat);
    lines.push(`<h2>${meta.icon} ${esc(meta.label)}</h2>`);
    lines.push("<ul>");
    for (const item of items) {
      lines.push(`  <li>${esc(item.text)}</li>`);
    }
    lines.push("</ul>");
  }
  return lines.join("\n");
}

function formatPlainText(note: ReleaseNote): string {
  const lines: string[] = [];
  const heading = note.title || note.version || "Release Notes";
  lines.push(heading.toUpperCase());
  if (note.version || note.date) {
    lines.push([note.version, note.date].filter(Boolean).join(" - "));
  }
  lines.push("─".repeat(40));
  lines.push("");

  const grouped = groupByCategory(note.items);
  for (const [cat, items] of grouped) {
    const meta = getCategoryMeta(cat);
    lines.push(`${meta.icon} ${meta.label}`);
    for (const item of items) {
      lines.push(`  • ${item.text}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function groupByCategory(items: ChangeItem[]): [Category, ChangeItem[]][] {
  const order: Category[] = ["new", "improved", "fixed", "security", "deprecated", "removed", "other"];
  const map = new Map<Category, ChangeItem[]>();
  for (const item of items) {
    const list = map.get(item.category) || [];
    list.push(item);
    map.set(item.category, list);
  }
  return order.filter((c) => map.has(c)).map((c) => [c, map.get(c)!]);
}

// --- Example data ---

const EXAMPLE_RAW = `Added dark mode support across all dashboard views
Improved search performance by 3x for large datasets
Fixed a bug where exported CSVs had incorrect date formatting
Added bulk actions for managing team members
Updated the onboarding flow with clearer step indicators
Fixed intermittent logout issue on mobile browsers
Removed legacy v1 API endpoints (deprecated since January)
Security patch for session token handling
Added webhook support for custom integrations
Improved error messages across all form validations
Deprecated the old analytics dashboard in favor of the new one
Fixed timezone display bug in scheduled reports`;

// --- Component ---

export default function ReleaseNotesFormatterContent() {

  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");


  const [rawText, setRawText] = useState(EXAMPLE_RAW);
  const [items, setItems] = useState<ChangeItem[]>(() => parseRawText(EXAMPLE_RAW));
  const [version, setVersion] = useState("v2.4.0");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [title, setTitle] = useState("");
  const [exportFormat, setExportFormat] = useState<"markdown" | "html" | "plain">("markdown");
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const note: ReleaseNote = useMemo(
    () => ({ version, date, title, items }),
    [version, date, title, items]
  );

  const formatted = useMemo(() => {
    switch (exportFormat) {
      case "markdown": return formatMarkdown(note);
      case "html": return formatHTML(note);
      case "plain": return formatPlainText(note);
    }
  }, [note, exportFormat]);

  const handleParse = useCallback(() => {
    setItems(parseRawText(rawText));
  }, [rawText]);

  const handleCategoryChange = useCallback((id: string, category: Category) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, category } : item)));
  }, []);

  const handleItemTextChange = useCallback((id: string, text: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, text } : item)));
  }, []);

  const handleRemoveItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [formatted]);

  const handleDownload = useCallback(() => {
    const ext = exportFormat === "markdown" ? "md" : exportFormat === "html" ? "html" : "txt";
    const mime = exportFormat === "html" ? "text/html" : "text/plain";
    const blob = new Blob([formatted], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `release-notes-${version || "draft"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [formatted, exportFormat, version]);

  const handleClear = useCallback(() => {
    setRawText("");
    setItems([]);
    setVersion("");
    setDate(new Date().toISOString().slice(0, 10));
    setTitle("");
    textareaRef.current?.focus();
  }, []);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "Enter", meta: true, action: handleParse, label: "Parse" },
        { key: "d", meta: true, action: handleDownload, label: "Download" },
      ],
      [handleParse, handleDownload]
    )
  );

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.max(160, el.scrollHeight) + "px";
    }
  }, [rawText]);

  const grouped = useMemo(() => groupByCategory(items), [items]);
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items]);

  const semverParts = useMemo(() => {
    const m = (version || "").match(/^v?(\d+)\.(\d+)\.(\d+)(.*)$/);
    if (!m) return null;
    return { major: parseInt(m[1]), minor: parseInt(m[2]), patch: parseInt(m[3]), suffix: m[4], prefix: version.startsWith("v") ? "v" : "" };
  }, [version]);
  const bumpSemver = useCallback((part: "major" | "minor" | "patch", delta: number) => {
    const sp = semverParts ?? { major: 1, minor: 0, patch: 0, suffix: "", prefix: "v" };
    const next = { ...sp, [part]: Math.max(0, sp[part] + delta) };
    if (part === "major" && delta > 0) { next.minor = 0; next.patch = 0; }
    if (part === "minor" && delta > 0) { next.patch = 0; }
    setVersion(`${next.prefix}${next.major}.${next.minor}.${next.patch}${next.suffix}`);
  }, [semverParts]);

  const inputStyle: React.CSSProperties = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  };

  const controls = (
    <>
      <ControlGroup label="Release info">
        <input type="text" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="v2.4.0" className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="w-full px-3 py-2 text-sm focus:outline-none" style={inputStyle} />
      </ControlGroup>
      <ControlGroup label="Semver bump">
        <div className="grid grid-cols-3 gap-1.5">
          {(["major", "minor", "patch"] as const).map((p) => (
            <NumberStepper
              key={p}
              value={(semverParts ? semverParts[p] : 0) as number}
              onChange={(n) => bumpSemver(p, n - (semverParts ? semverParts[p] : 0))}
              min={0}
              label={p}
            />
          ))}
        </div>
      </ControlGroup>
      <ControlGroup label="Output format">
        <Segment
          value={exportFormat}
          onChange={setExportFormat}
          options={[
            { value: "markdown" as const, label: "MD" },
            { value: "html" as const, label: "HTML" },
            { value: "plain" as const, label: "Plain" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="View">
        <Segment
          value={showPreview ? "preview" : "source"}
          onChange={(v) => setShowPreview(v === "preview")}
          options={[
            { value: "preview", label: "Preview" },
            { value: "source", label: "Source" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Stats">
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.filter((c) => stats[c.value]).map((c) => (
            <span
              key={c.value}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium"
              style={{ ...categoryBadgeStyle(c.hex), borderRadius: 6 }}
            >
              {c.icon} {c.label} · {stats[c.value]}
            </span>
          ))}
        </div>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleParse}>Parse</ToolActionButton>
      <ToolActionButton variant="outline" onClick={handleDownload}>Download</ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy}>
        {copied ? "Copied" : "Copy"}
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs kami-text-muted">
      <p>Paste raw bullets, click parse — we auto-categorize into Added / Changed / Fixed / Removed / Deprecated / Security (Keep a Changelog).</p>
      <p>Re-categorize any row with the dropdown. Export as Markdown (GitHub releases), HTML (blog), or plain text (email).</p>
      <p><strong>Tip:</strong> lead with the user-visible change, not the implementation. Keep bullets under ~12 words.</p>
    </div>
  );

  return (
    <ToolShell
      title="Release Notes Formatter"
      tagline="Auto-categorize · semver · MD / HTML / plain"
      accent={ACCENT_PM}
      materialFab={{ label: "Copy", onClick: handleCopy }}
      actions={actions}
      controls={controls}
      info={info}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Input</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>
      <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2`}>
          {/* Left: Input */}
          <div className="canvas-section glass-canvas-section space-y-4" data-panel="input">
            {/* Raw input */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold kami-text-muted">
                  Raw Changes
                </h2>
                <span className="text-xs kami-text-dim">
                  One change per line. Bullets/dashes are stripped automatically.
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"- Added dark mode support\n- Fixed login bug on Safari\n- Improved API response times by 40%\n- Removed deprecated v1 endpoints"}
                className="w-full resize-none px-3 py-2 font-mono text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  minHeight: 160,
                }}
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleParse}
                  className="px-4 py-2 text-sm font-medium"
                  style={{
                    background: "var(--kami-cta-bg)",
                    color: "var(--kami-cta-text)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    boxShadow: "var(--kami-cta-shadow, none)",
                  }}
                >
                  Parse &amp; Categorize
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2 text-sm"
                  style={{
                    background: "var(--kami-cta2-bg, var(--kami-surface-solid))",
                    color: "var(--kami-cta2-text, var(--kami-text-muted))",
                    border: "1px solid var(--kami-cta2-border, var(--kami-border-strong))",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Categorized items */}
            {items.length > 0 && (
              <div
                className="p-5"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold kami-text-muted">
                    Categorized ({items.length} items)
                  </h2>
                  <div className="flex gap-1.5">
                    {CATEGORIES.filter((c) => stats[c.value]).map((c) => (
                      <span
                        key={c.value}
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
                        style={{ ...categoryBadgeStyle(c.hex), borderRadius: "6px" }}
                      >
                        {c.icon} {stats[c.value]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="max-h-[28rem] space-y-1.5 overflow-y-auto">
                  {items.map((item) => {
                    const meta = getCategoryMeta(item.category);
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 px-3 py-2"
                        style={{
                          border: "1px solid var(--kami-border)",
                          borderRadius: "var(--kami-input-radius, 0.5rem)",
                        }}
                      >
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleCategoryChange(
                              item.id,
                              e.target.value as Category
                            )
                          }
                          className="mt-0.5 flex-shrink-0 px-2 py-1 text-xs font-medium cursor-pointer focus:outline-none"
                          style={{ ...categoryBadgeStyle(meta.hex), borderRadius: "6px" }}
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                              {c.icon} {c.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.text}
                          onChange={(e) =>
                            handleItemTextChange(item.id, e.target.value)
                          }
                          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm focus:outline-none focus:ring-0 kami-text"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-xs kami-text-dim"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: Preview / Source */}
          <div
            className="canvas-section glass-canvas-section"
            data-panel="output"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
              <div className="max-h-[36rem] overflow-y-auto p-5">
                {showPreview && items.length > 0 ? (
                  <div className="prose prose-sm max-w-none">
                    <h1 className="mb-1 text-xl font-bold kami-text">
                      {title || version || "Release Notes"}
                    </h1>
                    {(version || date) && (
                      <p className="mt-0 text-sm kami-text-muted">
                        {[version, date].filter(Boolean).join(" - ")}
                      </p>
                    )}
                    {grouped.map(([cat, catItems]) => {
                      const meta = getCategoryMeta(cat);
                      return (
                        <div key={cat} className="mt-5">
                          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium"
                              style={{ ...categoryBadgeStyle(meta.hex), borderRadius: "6px" }}
                            >
                              {meta.icon} {meta.label}
                            </span>
                          </h2>
                          <ul className="ml-1 list-none space-y-1 pl-0">
                            {catItems.map((item) => (
                              <li
                                key={item.id}
                                className="text-sm kami-text-muted"
                              >
                                <span className="mr-2 kami-text-dim">•</span>
                                {item.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : showPreview && items.length === 0 ? (
                  <p className="py-16 text-center text-sm kami-text-dim">
                    Paste your changes and click &quot;Parse &amp; Categorize&quot;
                  </p>
                ) : (
                  <pre
                    className="whitespace-pre-wrap p-3 font-mono text-xs"
                    style={{
                      background: "var(--kami-overlay-bg)",
                      color: "var(--kami-overlay-text)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  >
                    {formatted}
                  </pre>
                )}
              </div>
          </div>
      </div>
      </div>
    </ToolShell>
  );
}
