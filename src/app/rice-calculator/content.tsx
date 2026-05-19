"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

const ACCENT_PM = "#0ea5e9";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

interface RiceItem {
  id: string;
  name: string;
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
}

type SortField = "score" | "name" | "reach" | "impact" | "confidence" | "effort";
type SortDir = "asc" | "desc";

const IMPACT_OPTIONS = [
  { value: 3, label: "Massive (3x)" },
  { value: 2, label: "High (2x)" },
  { value: 1, label: "Medium (1x)" },
  { value: 0.5, label: "Low (0.5x)" },
  { value: 0.25, label: "Minimal (0.25x)" },
];

const CONFIDENCE_OPTIONS = [
  { value: 1, label: "High (100%)" },
  { value: 0.8, label: "Medium (80%)" },
  { value: 0.5, label: "Low (50%)" },
];

const STORAGE_KEY = "kami-rice-calculator";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function calcScore(item: RiceItem): number {
  if (item.effort <= 0) return 0;
  return (item.reach * item.impact * item.confidence) / item.effort;
}

function scoreColorClass(score: number): string {
  if (score >= 5) return "text-green-600";
  if (score >= 2) return "text-amber-600";
  return "text-red-500";
}

function scoreColorHex(score: number): string {
  if (score >= 5) return "#16a34a";
  if (score >= 2) return "#d97706";
  return "#ef4444";
}

function scoreBgClass(score: number): string {
  if (score >= 5) return "bg-green-50";
  if (score >= 2) return "bg-amber-50";
  return "bg-red-50";
}

function defaultItems(): RiceItem[] {
  return [
    { id: newId(), name: "Self-serve onboarding flow", reach: 5000, impact: 3, confidence: 0.8, effort: 3 },
    { id: newId(), name: "Dark mode support", reach: 2000, impact: 1, confidence: 1, effort: 1 },
    { id: newId(), name: "AI-powered search", reach: 3000, impact: 2, confidence: 0.5, effort: 4 },
  ];
}

function loadItems(): RiceItem[] {
  if (typeof window === "undefined") return defaultItems();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore
  }
  return defaultItems();
}

function saveItems(items: RiceItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function toCsv(items: RiceItem[]): string {
  const sorted = [...items].sort((a, b) => calcScore(b) - calcScore(a));
  const header = "Name,Reach,Impact,Confidence,Effort,RICE Score";
  const rows = sorted.map((item) => {
    const score = calcScore(item);
    return `"${item.name.replace(/"/g, '""')}",${item.reach},${item.impact},${item.confidence},${item.effort},${score.toFixed(1)}`;
  });
  return [header, ...rows].join("\n");
}

function toMarkdown(items: RiceItem[]): string {
  const sorted = [...items].sort((a, b) => calcScore(b) - calcScore(a));
  const impactLabel = (v: number) => IMPACT_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
  const confLabel = (v: number) => CONFIDENCE_OPTIONS.find((o) => o.value === v)?.label ?? `${v * 100}%`;

  let md = "| # | Feature | Reach | Impact | Confidence | Effort | Score |\n";
  md += "| --- | --- | ---: | --- | --- | ---: | ---: |\n";
  sorted.forEach((item, i) => {
    const score = calcScore(item);
    md += `| ${i + 1} | ${item.name} | ${item.reach.toLocaleString()} | ${impactLabel(item.impact)} | ${confLabel(item.confidence)} | ${item.effort} | ${score.toFixed(1)} |\n`;
  });
  return md;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function RiceCalculatorContent() {

  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");


  const [items, setItems] = useState<RiceItem[]>(() => loadItems());
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [toast, setToast] = useState<string | null>(null);

  // Persist on every change
  useEffect(() => {
    saveItems(items);
  }, [items]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // --- Item ops ---
  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { id: newId(), name: "", reach: 1000, impact: 1, confidence: 0.8, effort: 1 },
    ]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<RiceItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const resetDefaults = useCallback(() => {
    setItems(defaultItems());
  }, []);

  // --- Sorting ---
  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "desc" ? "asc" : "desc"));
        return prev;
      }
      setSortDir("desc");
      return field;
    });
  }, []);

  const sortedItems = useMemo(() => {
    const copy = [...items];
    copy.sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      if (sortField === "score") {
        va = calcScore(a);
        vb = calcScore(b);
      } else if (sortField === "name") {
        va = a.name.toLowerCase();
        vb = b.name.toLowerCase();
      } else {
        va = a[sortField];
        vb = b[sortField];
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [items, sortField, sortDir]);

  // --- Summary ---
  const summary = useMemo(() => {
    if (items.length === 0) return null;
    const scores = items.map(calcScore);
    return {
      total: items.length,
      avg: scores.reduce((s, v) => s + v, 0) / scores.length,
      highest: Math.max(...scores),
      lowest: Math.min(...scores),
    };
  }, [items]);

  // --- Export ---
  const exportCsv = useCallback(() => {
    const csv = toCsv(items);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rice-scores.csv";
    a.click();
    URL.revokeObjectURL(url);
    showToast("CSV downloaded");
  }, [items, showToast]);

  const copyMarkdown = useCallback(async () => {
    const md = toMarkdown(items);
    const ok = await copyText(md);
    showToast(ok ? "Markdown copied to clipboard" : "Failed to copy");
  }, [items, showToast]);

  // --- Keyboard shortcuts ---
  const shortcuts = useMemo(
    () => [
      { key: "n", meta: true, action: addItem, label: "New row" },
      { key: "Enter", meta: true, action: copyMarkdown, label: "Copy Markdown" },
    ],
    [addItem, copyMarkdown],
  );
  useKeyboardShortcuts(shortcuts);

  // --- Sort indicator ---
  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1 inline opacity-30">
          <path d="M5 2L8 5H2L5 2Z" fill="currentColor" />
          <path d="M5 8L2 5H8L5 8Z" fill="currentColor" />
        </svg>
      );
    }
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-1 inline">
        {sortDir === "desc" ? (
          <path d="M5 8L2 4H8L5 8Z" fill="currentColor" />
        ) : (
          <path d="M5 2L8 6H2L5 2Z" fill="currentColor" />
        )}
      </svg>
    );
  };

  // CSV import
  const fileRef = useRef<HTMLInputElement | null>(null);
  const handleImportCsv = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const lines = text.split(/\r?\n/).filter(Boolean);
      const dataLines = lines[0]?.toLowerCase().includes("name") ? lines.slice(1) : lines;
      const newItems: RiceItem[] = [];
      for (const ln of dataLines) {
        const parts = ln.match(/("([^"]|"")*"|[^,]+)/g) || [];
        const cleaned = parts.map((p) => p.replace(/^"|"$/g, "").replace(/""/g, '"').trim());
        if (cleaned.length < 5) continue;
        newItems.push({
          id: newId(),
          name: cleaned[0] || "Imported",
          reach: Number(cleaned[1]) || 0,
          impact: Number(cleaned[2]) || 1,
          confidence: Number(cleaned[3]) || 0.8,
          effort: Number(cleaned[4]) || 1,
        });
      }
      if (newItems.length) setItems(newItems);
    };
    reader.readAsText(f);
    e.target.value = "";
  }, []);

  void scoreColorClass; void scoreBgClass;

  const controls = (
    <>
      <ControlGroup label="Scoreboard">
        {summary ? (
          <div className="grid grid-cols-2 gap-2 text-xs kami-text-muted">
            <div>
              <span className="block text-base font-bold kami-text">{summary.total}</span>
              features
            </div>
            <div>
              <span className="block text-base font-bold" style={{ color: scoreColorHex(summary.avg) }}>{summary.avg.toFixed(1)}</span>
              avg
            </div>
            <div>
              <span className="block text-base font-bold" style={{ color: scoreColorHex(summary.highest) }}>{summary.highest.toFixed(1)}</span>
              top
            </div>
            <div>
              <span className="block text-base font-bold" style={{ color: scoreColorHex(summary.lowest) }}>{summary.lowest.toFixed(1)}</span>
              low
            </div>
          </div>
        ) : (
          <p className="text-xs kami-text-dim">Add features to score.</p>
        )}
      </ControlGroup>
      <ControlGroup label="Manage">
        <button onClick={addItem} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Add feature</button>
        <button onClick={resetDefaults} className="kc-segment-btn" style={{ minHeight: 40 }}>Load examples</button>
        <button onClick={clearAll} disabled={items.length === 0} className="kc-segment-btn" style={{ minHeight: 40 }}>Clear all</button>
      </ControlGroup>
      <ControlGroup label="Import / export">
        <label className="kc-segment-btn block text-center" style={{ minHeight: 40, cursor: "pointer" }}>
          Import CSV
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleImportCsv} className="sr-only" />
        </label>
        <button onClick={exportCsv} disabled={items.length === 0} className="kc-segment-btn" style={{ minHeight: 40 }}>Export CSV</button>
      </ControlGroup>
      <ControlGroup label="Sort by">
        <div className="grid grid-cols-2 gap-2">
          {(["score", "name", "reach", "impact", "confidence", "effort"] as SortField[]).map((f) => (
            <button
              key={f}
              onClick={() => toggleSort(f)}
              data-active={sortField === f}
              className="kc-segment-btn"
              style={{ minHeight: 44 }}
            >
              {f}{sortField === f ? (sortDir === "desc" ? " ↓" : " ↑") : ""}
            </button>
          ))}
        </div>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={addItem}>+ Feature</ToolActionButton>
      <ToolActionButton variant="solid" onClick={copyMarkdown} disabled={items.length === 0}>
        Copy MD
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs kami-text-muted">
      <p>RICE prioritizes ideas by (Reach × Impact × Confidence) / Effort. Higher score wins. Originally from Intercom.</p>
      <p><strong>Reach:</strong> users/qtr affected. <strong>Impact:</strong> 0.25–3. <strong>Confidence:</strong> 50–100%. <strong>Effort:</strong> person-months.</p>
      <p>State auto-saves to localStorage. Import/export CSV to share with stakeholders.</p>
    </div>
  );

  // --- Render ---
  return (
    <ToolShell
      title="RICE Scoring Calculator"
      tagline="Prioritize features · sortable scorecard · CSV import/export · auto-save"
      accent={ACCENT_PM}
      actions={actions}
      controls={controls}
      info={info}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Inputs</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>

      {/* Desktop table */}
      <div className="canvas-section glass-canvas-section" data-panel="input">
      {items.length > 0 ? (
        <>
          {/* Table view (hidden on mobile) */}
          <div className="hidden sm:block mb-8 overflow-x-auto rounded-xl" style={{ border: "var(--kami-card-border)" }}>
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr>
                  <th
                    className="sticky top-0 z-10 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                    style={{
                      background: "var(--kami-cta-bg)",
                      color: "var(--kami-cta-text)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                      width: "30%",
                    }}
                    onClick={() => toggleSort("name")}
                  >
                    Feature <SortArrow field="name" />
                  </th>
                  <th
                    className="sticky top-0 z-10 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                    style={{
                      background: "var(--kami-cta-bg)",
                      color: "var(--kami-cta-text)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                      width: "12%",
                    }}
                    onClick={() => toggleSort("reach")}
                  >
                    Reach <SortArrow field="reach" />
                  </th>
                  <th
                    className="sticky top-0 z-10 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                    style={{
                      background: "var(--kami-cta-bg)",
                      color: "var(--kami-cta-text)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                      width: "16%",
                    }}
                    onClick={() => toggleSort("impact")}
                  >
                    Impact <SortArrow field="impact" />
                  </th>
                  <th
                    className="sticky top-0 z-10 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                    style={{
                      background: "var(--kami-cta-bg)",
                      color: "var(--kami-cta-text)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                      width: "14%",
                    }}
                    onClick={() => toggleSort("confidence")}
                  >
                    Confidence <SortArrow field="confidence" />
                  </th>
                  <th
                    className="sticky top-0 z-10 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                    style={{
                      background: "var(--kami-cta-bg)",
                      color: "var(--kami-cta-text)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                      width: "12%",
                    }}
                    onClick={() => toggleSort("effort")}
                  >
                    Effort <SortArrow field="effort" />
                  </th>
                  <th
                    className="sticky top-0 z-10 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide cursor-pointer select-none"
                    style={{
                      background: "var(--kami-cta-bg)",
                      color: "var(--kami-cta-text)",
                      borderRight: "1px solid rgba(255,255,255,0.1)",
                      width: "10%",
                    }}
                    onClick={() => toggleSort("score")}
                  >
                    Score <SortArrow field="score" />
                  </th>
                  <th
                    className="sticky top-0 z-10 w-10"
                    style={{ background: "var(--kami-cta-bg)" }}
                  />
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, ri) => {
                  const score = calcScore(item);
                  return (
                    <tr
                      key={item.id}
                      style={{
                        background: ri % 2 === 0 ? "var(--kami-surface-solid)" : "var(--kami-surface)",
                      }}
                    >
                      {/* Name */}
                      <td className="px-3 py-2 kami-border-right">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                          className="w-full bg-transparent text-sm font-medium outline-none"
                          style={{ color: "var(--kami-text)", fontFamily: "var(--kami-font-body)" }}
                          placeholder="Feature name..."
                          autoFocus={item.name === "" && ri === sortedItems.length - 1}
                        />
                      </td>

                      {/* Reach */}
                      <td className="px-3 py-2 text-center kami-border-right">
                        <input
                          type="number"
                          value={item.reach}
                          onChange={(e) => updateItem(item.id, { reach: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-full rounded-lg bg-transparent px-2 py-1 text-center text-sm tabular-nums outline-none"
                          style={{
                            color: "var(--kami-text)",
                            background: "var(--kami-input-bg)",
                            border: "var(--kami-input-border)",
                          }}
                          min={0}
                        />
                      </td>

                      {/* Impact */}
                      <td className="px-3 py-2 text-center kami-border-right">
                        <select
                          value={item.impact}
                          onChange={(e) => updateItem(item.id, { impact: Number(e.target.value) })}
                          className="w-full rounded-lg px-2 py-1 text-sm outline-none"
                          style={{
                            color: "var(--kami-text)",
                            background: "var(--kami-input-bg)",
                            border: "var(--kami-input-border)",
                            borderRadius: "var(--kami-input-radius)",
                          }}
                        >
                          {IMPACT_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Confidence */}
                      <td className="px-3 py-2 text-center kami-border-right">
                        <select
                          value={item.confidence}
                          onChange={(e) => updateItem(item.id, { confidence: Number(e.target.value) })}
                          className="w-full rounded-lg px-2 py-1 text-sm outline-none"
                          style={{
                            color: "var(--kami-text)",
                            background: "var(--kami-input-bg)",
                            border: "var(--kami-input-border)",
                            borderRadius: "var(--kami-input-radius)",
                          }}
                        >
                          {CONFIDENCE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Effort */}
                      <td className="px-3 py-2 text-center kami-border-right">
                        <input
                          type="number"
                          value={item.effort}
                          onChange={(e) => updateItem(item.id, { effort: Math.max(0.1, Number(e.target.value) || 0.1) })}
                          className="w-full rounded-lg bg-transparent px-2 py-1 text-center text-sm tabular-nums outline-none"
                          style={{
                            color: "var(--kami-text)",
                            background: "var(--kami-input-bg)",
                            border: "var(--kami-input-border)",
                          }}
                          min={0.1}
                          step={0.5}
                        />
                      </td>

                      {/* Score */}
                      <td
                        className="px-3 py-2 text-center kami-border-right"
                      >
                        <span
                          className="inline-block rounded-lg px-3 py-1 text-base font-bold tabular-nums"
                          style={{
                            color: scoreColorHex(score),
                            background: score >= 5 ? "rgba(22,163,74,0.08)" : score >= 2 ? "rgba(217,119,6,0.08)" : "rgba(239,68,68,0.08)",
                          }}
                        >
                          {score.toFixed(1)}
                        </span>
                      </td>

                      {/* Delete */}
                      <td className="px-1 text-center align-middle">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="rounded p-1 opacity-30 transition-opacity hover:opacity-100 kami-text-muted"
                          title="Remove feature"
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view (hidden on desktop) */}
          <div className="sm:hidden mb-8 space-y-3">
            {sortedItems.map((item) => {
              const score = calcScore(item);
              return (
                <div
                  key={item.id}
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--kami-surface)",
                    border: "var(--kami-card-border)",
                    boxShadow: "var(--kami-card-shadow)",
                  }}
                >
                  {/* Card header: name + score + delete */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                      className="flex-1 bg-transparent text-sm font-semibold outline-none kami-text"
                      placeholder="Feature name..."
                    />
                    <span
                      className="shrink-0 rounded-lg px-3 py-1 text-lg font-bold tabular-nums"
                      style={{
                        color: scoreColorHex(score),
                        background: score >= 5 ? "rgba(22,163,74,0.08)" : score >= 2 ? "rgba(217,119,6,0.08)" : "rgba(239,68,68,0.08)",
                      }}
                    >
                      {score.toFixed(1)}
                    </span>
                  </div>

                  {/* Fields grid */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Reach */}
                    <div>
                      <label className="mb-1 block text-xs font-medium kami-text-muted">
                        Reach (users/qtr)
                      </label>
                      <input
                        type="number"
                        value={item.reach}
                        onChange={(e) => updateItem(item.id, { reach: Math.max(0, Number(e.target.value) || 0) })}
                        className="w-full rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
                        style={{
                          color: "var(--kami-text)",
                          background: "var(--kami-input-bg)",
                          border: "var(--kami-input-border)",
                        }}
                        min={0}
                      />
                    </div>

                    {/* Effort */}
                    <div>
                      <label className="mb-1 block text-xs font-medium kami-text-muted">
                        Effort (person-months)
                      </label>
                      <input
                        type="number"
                        value={item.effort}
                        onChange={(e) => updateItem(item.id, { effort: Math.max(0.1, Number(e.target.value) || 0.1) })}
                        className="w-full rounded-lg px-3 py-2 text-sm tabular-nums outline-none"
                        style={{
                          color: "var(--kami-text)",
                          background: "var(--kami-input-bg)",
                          border: "var(--kami-input-border)",
                        }}
                        min={0.1}
                        step={0.5}
                      />
                    </div>

                    {/* Impact */}
                    <div>
                      <label className="mb-1 block text-xs font-medium kami-text-muted">
                        Impact
                      </label>
                      <select
                        value={item.impact}
                        onChange={(e) => updateItem(item.id, { impact: Number(e.target.value) })}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{
                          color: "var(--kami-text)",
                          background: "var(--kami-input-bg)",
                          border: "var(--kami-input-border)",
                          borderRadius: "var(--kami-input-radius)",
                        }}
                      >
                        {IMPACT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Confidence */}
                    <div>
                      <label className="mb-1 block text-xs font-medium kami-text-muted">
                        Confidence
                      </label>
                      <select
                        value={item.confidence}
                        onChange={(e) => updateItem(item.id, { confidence: Number(e.target.value) })}
                        className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                        style={{
                          color: "var(--kami-text)",
                          background: "var(--kami-input-bg)",
                          border: "var(--kami-input-border)",
                          borderRadius: "var(--kami-input-radius)",
                        }}
                      >
                        {CONFIDENCE_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="rounded px-2 py-1 text-xs transition-opacity hover:opacity-80 kami-text-muted"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        /* Empty state */
        <div
          className="mb-8 flex flex-col items-center justify-center rounded-xl py-16"
          style={{
            background: "var(--kami-surface)",
            border: "var(--kami-card-border)",
          }}
        >
          <div className="mb-2 text-4xl opacity-20">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="8" width="32" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
              <line x1="18" y1="24" x2="30" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="24" y1="18" x2="24" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <p className="mb-4 text-sm kami-text-muted">
            Add your first feature to start prioritizing.
          </p>
          <button onClick={addItem} className="kami-btn-primary">
            + Add Feature
          </button>
          <button
            onClick={resetDefaults}
            className="mt-2 text-xs underline kami-text-muted"
          >
            or load example features
          </button>
        </div>
      )}
      </div>

      {/* Score panel */}
      <div className="canvas-section glass-canvas-section" data-panel="output">
          <div
            className="rounded-xl p-6"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            {items.length === 0 ? (
              <p className="text-sm text-center py-8 kami-text-dim">
                Add features in the Inputs tab to see scores here.
              </p>
            ) : (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide mb-4 kami-text-muted">RICE Scores</h2>
                {sortedItems.map((item, i) => {
                  const score = calcScore(item);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg"
                      style={{
                        background: i % 2 === 0 ? "var(--kami-surface)" : "var(--kami-surface-solid)",
                        border: "1px solid var(--kami-border)",
                      }}
                    >
                      <span className="text-sm font-medium flex-1 truncate kami-text">
                        {item.name || "Unnamed feature"}
                      </span>
                      <span
                        className="text-lg font-bold tabular-nums shrink-0"
                        style={{ color: scoreColorHex(score) }}
                      >
                        {score.toFixed(1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2 text-sm font-medium shadow-lg"
            style={{ background: "var(--kami-cta-bg)", color: "var(--kami-cta-text)" }}
          >
            {toast}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
