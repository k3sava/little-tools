"use client";

import { useState, useCallback, useRef, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Select } from "@/components/tools/controls";

const ACCENT_PMM = "#14b8a6";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

type CellValue =
  | { type: "check" }
  | { type: "cross" }
  | { type: "partial" }
  | { type: "text"; text: string };

interface RowData {
  feature: string;
  values: CellValue[];
}

interface TableData {
  columns: string[];
  rows: RowData[];
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

const TEMPLATES: Record<string, TableData> = {
  scratch: {
    columns: ["Feature", "Option A", "Option B"],
    rows: [{ feature: "Feature 1", values: [{ type: "check" }, { type: "cross" }] }],
  },
  feature: {
    columns: ["Feature", "Us", "Competitor A", "Competitor B"],
    rows: [
      { feature: "Real-time sync", values: [{ type: "check" }, { type: "cross" }, { type: "partial" }] },
      { feature: "Mobile app", values: [{ type: "check" }, { type: "check" }, { type: "cross" }] },
      { feature: "API access", values: [{ type: "check" }, { type: "partial" }, { type: "check" }] },
      { feature: "Custom branding", values: [{ type: "check" }, { type: "cross" }, { type: "cross" }] },
      { feature: "SSO / SAML", values: [{ type: "check" }, { type: "check" }, { type: "partial" }] },
    ],
  },
  pricing: {
    columns: ["", "Starter", "Pro", "Enterprise"],
    rows: [
      { feature: "Price", values: [{ type: "text", text: "$9/mo" }, { type: "text", text: "$29/mo" }, { type: "text", text: "Custom" }] },
      { feature: "Users", values: [{ type: "text", text: "1" }, { type: "text", text: "10" }, { type: "text", text: "Unlimited" }] },
      { feature: "Storage", values: [{ type: "text", text: "5 GB" }, { type: "text", text: "100 GB" }, { type: "text", text: "Unlimited" }] },
      { feature: "Support", values: [{ type: "text", text: "Email" }, { type: "text", text: "Priority" }, { type: "text", text: "Dedicated" }] },
      { feature: "API Access", values: [{ type: "cross" }, { type: "check" }, { type: "check" }] },
    ],
  },
  integration: {
    columns: ["Integration", "Us", "Alt 1", "Alt 2"],
    rows: [
      { feature: "Salesforce", values: [{ type: "check" }, { type: "check" }, { type: "cross" }] },
      { feature: "HubSpot", values: [{ type: "check" }, { type: "partial" }, { type: "check" }] },
      { feature: "Slack", values: [{ type: "check" }, { type: "check" }, { type: "check" }] },
      { feature: "Zapier", values: [{ type: "check" }, { type: "cross" }, { type: "partial" }] },
      { feature: "API", values: [{ type: "check" }, { type: "check" }, { type: "cross" }] },
    ],
  },
};

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// ---------------------------------------------------------------------------
// Icons (inline SVG)
// ---------------------------------------------------------------------------

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="8" fill="#dcfce7" stroke="#16a34a" strokeWidth="1.2" />
      <path d="M5.5 9.5L7.5 11.5L12.5 6.5" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="8" fill="#fef2f2" stroke="#ef4444" strokeWidth="1.2" />
      <path d="M6.5 6.5L11.5 11.5M11.5 6.5L6.5 11.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function PartialIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="8" fill="#fef9c3" stroke="#ca8a04" strokeWidth="1.2" />
      <path d="M5.5 9H12.5" stroke="#ca8a04" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 3V11M7 3L4 6M7 3L10 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 11V3M7 11L4 8M7 11L10 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 7H11M3 7L6 4M3 7L6 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 7H3M11 7L8 4M11 7L8 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UndoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 5.5H9C10.3807 5.5 11.5 6.6193 11.5 8C11.5 9.3807 10.3807 10.5 9 10.5H7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 3L3 5.5L5.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Cell value cycling
// ---------------------------------------------------------------------------

function nextCellValue(current: CellValue): CellValue {
  if (current.type === "check") return { type: "cross" };
  if (current.type === "cross") return { type: "partial" };
  if (current.type === "partial") return { type: "text", text: "" };
  return { type: "check" };
}

// ---------------------------------------------------------------------------
// Export helpers
// ---------------------------------------------------------------------------

function cellToHtml(val: CellValue): string {
  if (val.type === "check") return '<span style="color:#16a34a;font-size:18px;">&#10003;</span>';
  if (val.type === "cross") return '<span style="color:#ef4444;font-size:18px;">&#10007;</span>';
  if (val.type === "partial") return '<span style="color:#ca8a04;font-size:18px;">&#8764;</span>';
  return escapeHtml(val.text);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function generateHtml(table: TableData): string {
  const cols = table.columns;
  let html = '<table style="border-collapse:collapse;width:100%;font-family:system-ui,sans-serif;font-size:14px;">\n';
  html += "  <thead>\n    <tr>\n";
  for (const col of cols) {
    html += `      <th style="padding:10px 14px;text-align:left;background:#111827;color:#fff;border:1px solid #374151;">${escapeHtml(col)}</th>\n`;
  }
  html += "    </tr>\n  </thead>\n  <tbody>\n";
  table.rows.forEach((row, ri) => {
    const bg = ri % 2 === 0 ? "#ffffff" : "#f9fafb";
    html += "    <tr>\n";
    html += `      <td style="padding:10px 14px;font-weight:600;border:1px solid #e5e7eb;background:${bg};">${escapeHtml(row.feature)}</td>\n`;
    row.values.forEach((val) => {
      html += `      <td style="padding:10px 14px;text-align:center;border:1px solid #e5e7eb;background:${bg};">${cellToHtml(val)}</td>\n`;
    });
    html += "    </tr>\n";
  });
  html += "  </tbody>\n</table>";
  return html;
}

function cellToMd(val: CellValue): string {
  if (val.type === "check") return "Yes";
  if (val.type === "cross") return "No";
  if (val.type === "partial") return "Partial";
  return val.text || "-";
}

function generateMarkdown(table: TableData): string {
  const cols = table.columns;
  const widths = cols.map((c) => Math.max(c.length, 3));
  table.rows.forEach((row) => {
    widths[0] = Math.max(widths[0], row.feature.length);
    row.values.forEach((val, i) => {
      widths[i + 1] = Math.max(widths[i + 1] ?? 3, cellToMd(val).length);
    });
  });

  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));

  let md = "| " + cols.map((c, i) => pad(c, widths[i])).join(" | ") + " |\n";
  md += "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |\n";
  table.rows.forEach((row) => {
    const cells = [pad(row.feature, widths[0]), ...row.values.map((v, i) => pad(cellToMd(v), widths[i + 1] ?? 3))];
    md += "| " + cells.join(" | ") + " |\n";
  });
  return md;
}

// ---------------------------------------------------------------------------
// Copy-to-clipboard helper
// ---------------------------------------------------------------------------

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

export default function ComparisonTableContent() {
  const [table, setTable] = useState<TableData>(() => deepClone(TEMPLATES.feature));
  const [toast, setToast] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("feature");
  const previewRef = useRef<HTMLDivElement>(null);

  // --- Undo stack (max 20) ---
  const MAX_UNDO = 20;
  const [undoStack, setUndoStack] = useState<TableData[]>([]);

  const pushUndo = useCallback((snapshot: TableData) => {
    setUndoStack((prev) => {
      const next = [...prev, deepClone(snapshot)];
      return next.length > MAX_UNDO ? next.slice(next.length - MAX_UNDO) : next;
    });
  }, []);

  const undo = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const restored = next.pop()!;
      setTable(restored);
      return next;
    });
  }, []);

  // Ctrl+Z / Cmd+Z keyboard shortcut for undo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo]);

  // --- Toast ---
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  // --- Column ops ---
  const addColumn = useCallback(() => {
    setTable((prev) => {
      pushUndo(prev);
      return {
        columns: [...prev.columns, `Option ${prev.columns.length}`],
        rows: prev.rows.map((row) => ({ ...row, values: [...row.values, { type: "check" as const }] })),
      };
    });
  }, [pushUndo]);

  const removeColumn = useCallback((colIdx: number) => {
    setTable((prev) => {
      if (prev.columns.length <= 2) return prev; // keep at least Feature + 1
      pushUndo(prev);
      return {
        columns: prev.columns.filter((_, i) => i !== colIdx),
        rows: prev.rows.map((row) => ({ ...row, values: row.values.filter((_, i) => i !== colIdx - 1) })),
      };
    });
  }, [pushUndo]);

  const updateColumnName = useCallback((colIdx: number, name: string) => {
    setTable((prev) => ({
      ...prev,
      columns: prev.columns.map((c, i) => (i === colIdx ? name : c)),
    }));
  }, []);

  // --- Row ops ---
  const addRow = useCallback(() => {
    setTable((prev) => {
      pushUndo(prev);
      return {
        ...prev,
        rows: [
          ...prev.rows,
          {
            feature: `Feature ${prev.rows.length + 1}`,
            values: Array.from({ length: prev.columns.length - 1 }, () => ({ type: "check" as const })),
          },
        ],
      };
    });
  }, [pushUndo]);

  const removeRow = useCallback((rowIdx: number) => {
    setTable((prev) => {
      pushUndo(prev);
      return {
        ...prev,
        rows: prev.rows.filter((_, i) => i !== rowIdx),
      };
    });
  }, [pushUndo]);

  const updateFeatureName = useCallback((rowIdx: number, name: string) => {
    setTable((prev) => ({
      ...prev,
      rows: prev.rows.map((r, i) => (i === rowIdx ? { ...r, feature: name } : r)),
    }));
  }, []);

  const toggleCell = useCallback((rowIdx: number, colIdx: number) => {
    setTable((prev) => {
      pushUndo(prev);
      return {
        ...prev,
        rows: prev.rows.map((r, ri) =>
          ri === rowIdx
            ? { ...r, values: r.values.map((v, ci) => (ci === colIdx ? nextCellValue(v) : v)) }
            : r,
        ),
      };
    });
  }, [pushUndo]);

  const updateCellText = useCallback((rowIdx: number, colIdx: number, text: string) => {
    setTable((prev) => ({
      ...prev,
      rows: prev.rows.map((r, ri) =>
        ri === rowIdx
          ? { ...r, values: r.values.map((v, ci) => (ci === colIdx ? { type: "text" as const, text } : v)) }
          : r,
      ),
    }));
  }, []);

  // --- Row reorder ---
  const moveRow = useCallback((rowIdx: number, direction: "up" | "down") => {
    setTable((prev) => {
      const target = direction === "up" ? rowIdx - 1 : rowIdx + 1;
      if (target < 0 || target >= prev.rows.length) return prev;
      pushUndo(prev);
      const rows = [...prev.rows];
      [rows[rowIdx], rows[target]] = [rows[target], rows[rowIdx]];
      return { ...prev, rows };
    });
  }, [pushUndo]);

  // --- Column reorder ---
  const moveColumn = useCallback((colIdx: number, direction: "left" | "right") => {
    setTable((prev) => {
      // colIdx is the index in table.columns (1-based for value columns since 0 is feature)
      const target = direction === "left" ? colIdx - 1 : colIdx + 1;
      // Don't swap with the feature column (index 0), and don't go past the end
      if (target < 1 || target >= prev.columns.length) return prev;
      pushUndo(prev);
      const columns = [...prev.columns];
      [columns[colIdx], columns[target]] = [columns[target], columns[colIdx]];
      const rows = prev.rows.map((row) => {
        const values = [...row.values];
        // values array is 0-indexed, columns are 1-indexed (offset by feature col)
        const vi = colIdx - 1;
        const vt = target - 1;
        [values[vi], values[vt]] = [values[vt], values[vi]];
        return { ...row, values };
      });
      return { columns, rows };
    });
  }, [pushUndo]);

  // --- Template ---
  const loadTemplate = useCallback((key: string) => {
    setSelectedTemplate(key);
    setTable((prev) => {
      pushUndo(prev);
      return deepClone(TEMPLATES[key]);
    });
  }, [pushUndo]);

  // --- Export ---
  const copyAsHtml = useCallback(async () => {
    const html = generateHtml(table);
    const ok = await copyText(html);
    showToast(ok ? "HTML copied to clipboard" : "Failed to copy");
  }, [table, showToast]);

  const copyAsMarkdown = useCallback(async () => {
    const md = generateMarkdown(table);
    const ok = await copyText(md);
    showToast(ok ? "Markdown copied to clipboard" : "Failed to copy");
  }, [table, showToast]);

  const downloadPng = useCallback(async () => {
    const el = previewRef.current;
    if (!el) return;
    try {
      const canvas = document.createElement("canvas");
      const scale = 2;
      canvas.width = el.scrollWidth * scale;
      canvas.height = el.scrollHeight * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const svgData = `
        <foreignObject width="${el.scrollWidth}" height="${el.scrollHeight}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:system-ui,sans-serif;">
            ${generateHtml(table)}
          </div>
        </foreignObject>`;
      const svgBlob = new Blob(
        [`<svg xmlns="http://www.w3.org/2000/svg" width="${el.scrollWidth}" height="${el.scrollHeight}">${svgData}</svg>`],
        { type: "image/svg+xml;charset=utf-8" },
      );
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        canvas.toBlob((blob) => {
          if (!blob) {
            showToast("PNG export failed");
            return;
          }
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = "comparison-table.png";
          a.click();
          URL.revokeObjectURL(a.href);
          showToast("PNG downloaded");
        }, "image/png");
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        showToast("PNG export failed - try HTML or Markdown instead");
      };
      img.src = url;
    } catch {
      showToast("PNG export failed - try HTML or Markdown instead");
    }
  }, [table, showToast]);

  // --- Keyboard shortcuts ---
  const shortcuts = useMemo(
    () => [
      { key: "Enter", meta: true, action: copyAsHtml, label: "Copy HTML" },
      { key: "k", meta: true, action: () => loadTemplate("scratch"), label: "Clear table" },
    ],
    [copyAsHtml, loadTemplate],
  );
  useKeyboardShortcuts(shortcuts);

  const controls = (
    <>
      <ControlGroup label="Template">
        <Select
          value={selectedTemplate}
          onChange={(v) => loadTemplate(v)}
          options={[
            { value: "scratch", label: "Blank" },
            { value: "feature", label: "Feature comparison" },
            { value: "pricing", label: "Pricing tiers" },
            { value: "integration", label: "Integration matrix" },
          ]}
        />
      </ControlGroup>
      <ControlGroup label="Edit">
        <button onClick={addColumn} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Column</button>
        <button onClick={addRow} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Row</button>
        <button onClick={undo} disabled={undoStack.length === 0} className="kc-segment-btn" style={{ minHeight: 40 }}>
          <span className="inline-flex items-center gap-1.5"><UndoIcon />Undo</span>
        </button>
      </ControlGroup>
      <ControlGroup label="Export">
        <button onClick={copyAsHtml} className="kc-segment-btn" style={{ minHeight: 40 }}>Copy HTML</button>
        <button onClick={copyAsMarkdown} className="kc-segment-btn" style={{ minHeight: 40 }}>Copy MD</button>
        <button onClick={downloadPng} className="kc-segment-btn" style={{ minHeight: 40 }}>Download PNG</button>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={addRow}>+ Row</ToolActionButton>
      <ToolActionButton variant="outline" onClick={addColumn}>+ Col</ToolActionButton>
      <ToolActionButton variant="solid" onClick={copyAsHtml}>Copy HTML</ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
      <p>Build the classic &quot;us vs. them&quot; feature table. Click a cell to cycle check / cross / partial / text. Rearrange rows & columns with arrows.</p>
      <p>Export as HTML (paste into a page), Markdown (paste into docs), or PNG (screenshot ready).</p>
    </div>
  );

  return (
    <ToolShell
      title="Comparison Table Builder"
      tagline="Drag-to-reorder · color-coded cells · export HTML / MD / PNG"
      accent={ACCENT_PMM}
      actions={actions}
      controls={controls}
      info={info}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">

      {/* Editable table */}
      <div className="mb-8 overflow-x-auto rounded-xl" style={{ border: "var(--kami-card-border)" }}>
        <table className="w-full min-w-[600px] border-collapse text-sm">
          <thead>
            <tr>
              {/* Reorder column (empty header) */}
              <th
                className="w-10"
                style={{ background: "var(--kami-cta-bg)", borderRight: "1px solid rgba(255,255,255,0.1)" }}
              />
              {table.columns.map((col, ci) => (
                <th
                  key={ci}
                  className="relative px-3 py-2.5"
                  style={{
                    background: "var(--kami-cta-bg)",
                    color: "var(--kami-cta-text)",
                    borderRight: ci < table.columns.length - 1 ? "1px solid rgba(255,255,255,0.1)" : "none",
                  }}
                >
                  {ci === 0 ? (
                    <span className="text-xs font-semibold uppercase tracking-wide opacity-60">Feature</span>
                  ) : (
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-1 w-full">
                        <input
                          type="text"
                          value={col}
                          onChange={(e) => updateColumnName(ci, e.target.value)}
                          className="w-full bg-transparent text-center text-sm font-semibold outline-none placeholder:opacity-40"
                          style={{ color: "var(--kami-cta-text)" }}
                          placeholder="Column name"
                        />
                        {table.columns.length > 2 && (
                          <button
                            onClick={() => removeColumn(ci)}
                            className="flex-shrink-0 rounded p-0.5 opacity-40 transition-opacity hover:opacity-100"
                            title="Remove column"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                              <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => moveColumn(ci, "left")}
                          disabled={ci <= 1}
                          className="rounded p-0.5 transition-colors disabled:opacity-20"
                          style={{ color: "var(--kami-cta-text)" }}
                          title="Move column left"
                        >
                          <ArrowLeftIcon />
                        </button>
                        <button
                          onClick={() => moveColumn(ci, "right")}
                          disabled={ci >= table.columns.length - 1}
                          className="rounded p-0.5 transition-colors disabled:opacity-20"
                          style={{ color: "var(--kami-cta-text)" }}
                          title="Move column right"
                        >
                          <ArrowRightIcon />
                        </button>
                      </div>
                    </div>
                  )}
                </th>
              ))}
              {/* Delete row column (empty header) */}
              <th className="w-10" style={{ background: "var(--kami-cta-bg)" }} />
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, ri) => (
              <tr
                key={ri}
                style={{ background: ri % 2 === 0 ? "var(--kami-surface-solid)" : "var(--kami-surface)" }}
              >
                {/* Reorder buttons */}
                <td className="px-1 text-center align-middle" style={{ borderRight: "1px solid var(--kami-border)" }}>
                  <div className="flex flex-col items-center gap-0.5">
                    <button
                      onClick={() => moveRow(ri, "up")}
                      disabled={ri === 0}
                      className="rounded p-0.5 transition-colors disabled:opacity-20"
                      style={{ color: "var(--kami-text-muted)" }}
                      title="Move up"
                    >
                      <ArrowUpIcon />
                    </button>
                    <button
                      onClick={() => moveRow(ri, "down")}
                      disabled={ri === table.rows.length - 1}
                      className="rounded p-0.5 transition-colors disabled:opacity-20"
                      style={{ color: "var(--kami-text-muted)" }}
                      title="Move down"
                    >
                      <ArrowDownIcon />
                    </button>
                  </div>
                </td>
                {/* Feature name */}
                <td className="px-3 py-2" style={{ borderRight: "1px solid var(--kami-border)" }}>
                  <input
                    type="text"
                    value={row.feature}
                    onChange={(e) => updateFeatureName(ri, e.target.value)}
                    className="w-full bg-transparent text-sm font-medium outline-none"
                    style={{
                      color: "var(--kami-text)",
                      fontFamily: "var(--kami-font-body)",
                    }}
                    placeholder="Feature name"
                  />
                </td>
                {/* Value cells */}
                {row.values.map((val, ci) => (
                  <td
                    key={ci}
                    className="px-3 py-2 text-center align-middle"
                    style={{
                      borderRight: ci < row.values.length - 1 ? "1px solid var(--kami-border)" : "none",
                    }}
                  >
                    {val.type === "text" ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={val.text}
                          onChange={(e) => updateCellText(ri, ci, e.target.value)}
                          className="w-full rounded bg-transparent px-1.5 py-0.5 text-center text-sm outline-none"
                          style={{
                            color: "var(--kami-text)",
                            background: "var(--kami-input-bg)",
                            border: "var(--kami-input-border)",
                          }}
                          placeholder="..."
                        />
                        <button
                          onClick={() => toggleCell(ri, ci)}
                          className="flex-shrink-0 rounded p-0.5 opacity-30 transition-opacity hover:opacity-70"
                          style={{ color: "var(--kami-text-muted)" }}
                          title="Switch to icon"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                            <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => toggleCell(ri, ci)}
                        className="mx-auto flex items-center justify-center rounded-md p-1 transition-colors"
                        style={{ cursor: "pointer" }}
                        title="Click to cycle: check / cross / partial / text"
                      >
                        {val.type === "check" && <CheckIcon />}
                        {val.type === "cross" && <CrossIcon />}
                        {val.type === "partial" && <PartialIcon />}
                      </button>
                    )}
                  </td>
                ))}
                {/* Delete row */}
                <td className="px-1 text-center align-middle">
                  <button
                    onClick={() => removeRow(ri)}
                    className="rounded p-1 opacity-30 transition-opacity hover:opacity-100"
                    style={{ color: "var(--kami-text-muted)" }}
                    title="Remove row"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M4 4L10 10M10 4L4 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Preview */}
      <div className="mb-6">
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: "var(--kami-text-muted)" }}
        >
          Preview
        </h2>
        <div
          ref={previewRef}
          className="overflow-x-auto rounded-xl p-4"
          style={{
            background: "var(--kami-surface-solid)",
            border: "var(--kami-card-border)",
            boxShadow: "var(--kami-card-shadow)",
          }}
        >
          <table className="w-full border-collapse text-sm" style={{ fontFamily: "var(--kami-font-body)" }}>
            <thead>
              <tr>
                {table.columns.map((col, ci) => (
                  <th
                    key={ci}
                    className="px-3 py-2.5 text-left text-sm font-semibold"
                    style={{
                      background: "#111827",
                      color: "#fff",
                      borderBottom: "2px solid #1f2937",
                      borderRight: ci < table.columns.length - 1 ? "1px solid #374151" : "none",
                    }}
                  >
                    {col || "\u00A0"}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri}>
                  <td
                    className="px-3 py-2 text-sm font-semibold"
                    style={{
                      background: ri % 2 === 0 ? "#ffffff" : "#f9fafb",
                      borderBottom: "1px solid #e5e7eb",
                      borderRight: "1px solid #e5e7eb",
                      color: "#1d1d1f",
                    }}
                  >
                    {row.feature}
                  </td>
                  {row.values.map((val, ci) => (
                    <td
                      key={ci}
                      className="px-3 py-2 text-center text-sm"
                      style={{
                        background: ri % 2 === 0 ? "#ffffff" : "#f9fafb",
                        borderBottom: "1px solid #e5e7eb",
                        borderRight: ci < row.values.length - 1 ? "1px solid #e5e7eb" : "none",
                        color: "#333",
                      }}
                    >
                      {val.type === "check" && <span className="inline-flex justify-center"><CheckIcon /></span>}
                      {val.type === "cross" && <span className="inline-flex justify-center"><CrossIcon /></span>}
                      {val.type === "partial" && <span className="inline-flex justify-center"><PartialIcon /></span>}
                      {val.type === "text" && (val.text || "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
