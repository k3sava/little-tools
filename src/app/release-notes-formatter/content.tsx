"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

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

const CATEGORIES: { value: Category; label: string; color: string; bg: string; icon: string; keywords: string[] }[] = [
  { value: "new", label: "New", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200", icon: "✦", keywords: ["add", "added", "new", "introduce", "introduced", "launch", "launched", "create", "created", "support", "enable", "enabled"] },
  { value: "improved", label: "Improved", color: "text-blue-700", bg: "bg-blue-50 border-blue-200", icon: "▲", keywords: ["improve", "improved", "update", "updated", "enhance", "enhanced", "upgrade", "upgraded", "optimize", "optimized", "better", "increase", "increased", "boost", "boosted", "refactor", "refactored", "redesign", "redesigned"] },
  { value: "fixed", label: "Fixed", color: "text-amber-700", bg: "bg-amber-50 border-amber-200", icon: "●", keywords: ["fix", "fixed", "resolve", "resolved", "patch", "patched", "bug", "bugfix", "correct", "corrected", "repair", "repaired", "address", "addressed"] },
  { value: "removed", label: "Removed", color: "text-red-700", bg: "bg-red-50 border-red-200", icon: "✕", keywords: ["remove", "removed", "delete", "deleted", "drop", "dropped", "eliminate", "eliminated"] },
  { value: "security", label: "Security", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: "◆", keywords: ["security", "vulnerability", "cve", "auth", "authentication", "authorization", "encrypt", "encrypted", "ssl", "tls", "xss", "csrf", "injection"] },
  { value: "deprecated", label: "Deprecated", color: "text-gray-600", bg: "bg-gray-50 border-gray-200", icon: "◇", keywords: ["deprecate", "deprecated", "sunset", "legacy", "end-of-life", "eol"] },
  { value: "other", label: "Other", color: "text-gray-500", bg: "bg-gray-50 border-gray-200", icon: "·", keywords: [] },
];

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
    const meta = [note.version, note.date].filter(Boolean).join(" — ");
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
    const meta = [note.version, note.date].filter(Boolean).join(" — ");
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
    lines.push([note.version, note.date].filter(Boolean).join(" — "));
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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Release Notes Formatter
          </h1>
          <p className="mt-2 text-gray-500">
            Paste raw changelog bullets. Auto-categorize, edit, and export as
            Markdown, HTML, or plain text.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Left: Input */}
          <div className="space-y-4">
            {/* Metadata */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-gray-700">
                Release Info
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Version
                  </label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="v2.4.0"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Performance and Reliability"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
            </div>

            {/* Raw input */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  Raw Changes
                </h2>
                <span className="text-xs text-gray-400">
                  One change per line. Bullets/dashes are stripped automatically.
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={"- Added dark mode support\n- Fixed login bug on Safari\n- Improved API response times by 40%\n- Removed deprecated v1 endpoints"}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                style={{ minHeight: 160 }}
              />
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleParse}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Parse &amp; Categorize
                </button>
                <button
                  onClick={handleClear}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:border-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Categorized items */}
            {items.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Categorized ({items.length} items)
                  </h2>
                  <div className="flex gap-1.5">
                    {CATEGORIES.filter((c) => stats[c.value]).map((c) => (
                      <span
                        key={c.value}
                        className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${c.bg} ${c.color}`}
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
                        className="flex items-start gap-2 rounded-lg border border-gray-100 px-3 py-2 hover:border-gray-200"
                      >
                        <select
                          value={item.category}
                          onChange={(e) =>
                            handleCategoryChange(
                              item.id,
                              e.target.value as Category
                            )
                          }
                          className={`mt-0.5 flex-shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${meta.bg} ${meta.color} cursor-pointer focus:outline-none`}
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
                          className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm focus:outline-none focus:ring-0"
                        />
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="mt-0.5 flex-shrink-0 rounded px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600"
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

          {/* Right: Preview & Export */}
          <div className="space-y-4">
            {/* Export format selector */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">Output</h2>
                <div className="flex gap-1">
                  {(["markdown", "html", "plain"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                        exportFormat === fmt
                          ? "bg-gray-900 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {fmt === "markdown"
                        ? "Markdown"
                        : fmt === "html"
                        ? "HTML"
                        : "Plain Text"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  {copied ? "Copied!" : "Copy to Clipboard"}
                </button>
                <button
                  onClick={handleDownload}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:border-gray-300"
                >
                  Download
                </button>
              </div>
            </div>

            {/* Toggle preview/code */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setShowPreview(true)}
                  className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                    showPreview
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setShowPreview(false)}
                  className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors ${
                    !showPreview
                      ? "border-b-2 border-gray-900 text-gray-900"
                      : "text-gray-400 hover:text-gray-600"
                  }`}
                >
                  Source
                </button>
              </div>

              <div className="max-h-[36rem] overflow-y-auto p-5">
                {showPreview && items.length > 0 ? (
                  <div className="prose prose-sm max-w-none">
                    <h1 className="mb-1 text-xl font-bold">
                      {title || version || "Release Notes"}
                    </h1>
                    {(version || date) && (
                      <p className="mt-0 text-sm text-gray-500">
                        {[version, date].filter(Boolean).join(" — ")}
                      </p>
                    )}
                    {grouped.map(([cat, catItems]) => {
                      const meta = getCategoryMeta(cat);
                      return (
                        <div key={cat} className="mt-5">
                          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.bg} ${meta.color}`}
                            >
                              {meta.icon} {meta.label}
                            </span>
                          </h2>
                          <ul className="ml-1 list-none space-y-1 pl-0">
                            {catItems.map((item) => (
                              <li
                                key={item.id}
                                className="text-sm text-gray-700"
                              >
                                <span className="mr-2 text-gray-300">•</span>
                                {item.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                ) : showPreview && items.length === 0 ? (
                  <p className="py-16 text-center text-sm text-gray-400">
                    Paste your changes and click &quot;Parse &amp; Categorize&quot;
                  </p>
                ) : (
                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-700">
                    {formatted}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
