"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

const ACCENT_PMM = "#14b8a6";

// --- Types ---

interface FeatureRow {
  id: string;
  feature: string;
  benefit: string;
  audience: string;
}

type ValidationStatus = "valid" | "missing-benefit" | "feature-speak" | "empty";

// --- Constants ---

const FEATURE_SPEAK_PATTERNS = [
  /\bapi\b/i, /\bsdk\b/i, /\bendpoint\b/i, /\binfrastructure\b/i,
  /\bmodule\b/i, /\bcomponent\b/i, /\barchitecture\b/i, /\bpipeline\b/i,
  /\bintegrat(?:ion|ed|es)\b/i, /\bframework\b/i, /\bplatform\b/i,
  /\bengine\b/i, /\bstack\b/i, /\bmicroservice/i, /\bwebhook/i,
  /\bdatabase\b/i, /\bcache\b/i, /\bqueue\b/i, /\bschema\b/i,
];

const BENEFIT_SIGNAL_PATTERNS = [
  /\bsave\b/i, /\breduce\b/i, /\bincrease\b/i, /\bimprove\b/i,
  /\bfaster\b/i, /\beasier\b/i, /\bsimpler\b/i, /\bautomat/i,
  /\beliminate\b/i, /\bavoid\b/i, /\bwithout\b/i, /\bnever\b/i,
  /\bless\b/i, /\bmore\b/i, /\bbetter\b/i, /\bconfiden/i,
  /\bpeace of mind\b/i, /\btime\b/i, /\bmoney\b/i, /\brisk\b/i,
  /\%/, /\bminute/i, /\bhour/i, /\bclick/i,
];

const LS_KEY = "kami-feature-benefit-mapper";

// --- Helpers ---

function getValidation(row: FeatureRow): ValidationStatus {
  if (!row.feature.trim() && !row.benefit.trim()) return "empty";
  if (row.feature.trim() && !row.benefit.trim()) return "missing-benefit";
  if (
    row.benefit.trim() &&
    !BENEFIT_SIGNAL_PATTERNS.some((p) => p.test(row.benefit)) &&
    FEATURE_SPEAK_PATTERNS.some((p) => p.test(row.benefit))
  ) {
    return "feature-speak";
  }
  return "valid";
}

function getStatusLabel(status: ValidationStatus): {
  label: string;
  style: React.CSSProperties;
} {
  switch (status) {
    case "valid":
      return {
        label: "Good",
        style: {
          color: "color-mix(in srgb, #10b981 70%, var(--kami-text))",
          background: "color-mix(in srgb, #10b981 10%, var(--kami-surface))",
          border: "1px solid color-mix(in srgb, #10b981 30%, transparent)",
        },
      };
    case "missing-benefit":
      return {
        label: "Needs benefit",
        style: {
          color: "color-mix(in srgb, #f59e0b 70%, var(--kami-text))",
          background: "color-mix(in srgb, #f59e0b 10%, var(--kami-surface))",
          border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
        },
      };
    case "feature-speak":
      return {
        label: "Feature-speak",
        style: {
          color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))",
          background: "color-mix(in srgb, #ef4444 10%, var(--kami-surface))",
          border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
        },
      };
    case "empty":
      return { label: "", style: { color: "var(--kami-text-dim)" } };
  }
}

function createRow(): FeatureRow {
  return { id: crypto.randomUUID(), feature: "", benefit: "", audience: "" };
}

const EXAMPLE_ROWS: FeatureRow[] = [
  { id: crypto.randomUUID(), feature: "AI-powered call scoring", benefit: "Managers save 4 hours per week by reviewing scores instead of listening to full calls", audience: "Sales managers" },
  { id: crypto.randomUUID(), feature: "Real-time transcription", benefit: "Reps never miss action items from calls, reducing follow-up mistakes by 60%", audience: "Sales reps" },
  { id: crypto.randomUUID(), feature: "CRM integration", benefit: "", audience: "Sales ops" },
  { id: crypto.randomUUID(), feature: "Custom API endpoints", benefit: "Webhook infrastructure enables pipeline automation", audience: "Developers" },
  { id: crypto.randomUUID(), feature: "Team analytics dashboard", benefit: "Leaders identify coaching opportunities 3x faster than manual review", audience: "VPs of Sales" },
];

// --- Export ---

function exportMarkdown(rows: FeatureRow[]): string {
  const lines = [
    "# Feature-Benefit Map",
    "",
    "| Feature | Benefit | Audience |",
    "| ------- | ------- | -------- |",
    ...rows
      .filter((r) => r.feature.trim())
      .map((r) => `| ${r.feature} | ${r.benefit || "-"} | ${r.audience || "-"} |`),
  ];
  return lines.join("\n");
}

function exportCSV(rows: FeatureRow[]): string {
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const lines = [
    "Feature,Benefit,Audience,Status",
    ...rows
      .filter((r) => r.feature.trim())
      .map((r) => [escape(r.feature), escape(r.benefit), escape(r.audience), escape(getValidation(r))].join(",")),
  ];
  return lines.join("\n");
}

// --- Component ---

export default function FeatureBenefitMapperContent() {
  const [rows, setRows] = useState<FeatureRow[]>(EXAMPLE_ROWS);
  const [copied, setCopied] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRows(parsed);
        }
      }
    } catch {}
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(rows));
    } catch {}
  }, [rows]);

  const addRow = useCallback(() => {
    setRows((prev) => [...prev, createRow()]);
  }, []);

  const updateRow = useCallback(
    (id: string, field: keyof FeatureRow, value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setRows([createRow(), createRow(), createRow()]);
  }, []);

  const handleCopyMarkdown = useCallback(async () => {
    await navigator.clipboard.writeText(exportMarkdown(rows));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [rows]);

  const handleDownloadCSV = useCallback(() => {
    const blob = new Blob([exportCSV(rows)], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "feature-benefit-map.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [rows]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "n", meta: true, action: addRow, label: "Add Row" },
        { key: "Enter", meta: true, action: handleCopyMarkdown, label: "Copy" },
      ],
      [addRow, handleCopyMarkdown]
    )
  );

  const stats = useMemo(() => {
    const filled = rows.filter((r) => r.feature.trim());
    const valid = filled.filter((r) => getValidation(r) === "valid").length;
    const needsBenefit = filled.filter(
      (r) => getValidation(r) === "missing-benefit"
    ).length;
    const featureSpeak = filled.filter(
      (r) => getValidation(r) === "feature-speak"
    ).length;
    const score =
      filled.length > 0 ? Math.round((valid / filled.length) * 100) : 0;
    return { total: filled.length, valid, needsBenefit, featureSpeak, score };
  }, [rows]);

  const customerLangPrompt = useMemo(() => {
    const filled = rows.filter((r) => r.feature.trim());
    if (!filled.length) return "";
    const features = filled.map((r) => `- ${r.feature}${r.benefit ? ` → ${r.benefit}` : ""}`).join("\n");
    return `Translate these product features into customer-language benefits. Use concrete outcomes (time saved, money made, risk avoided). One sentence each.\n\n${features}`;
  }, [rows]);

  const handleCopyPrompt = useCallback(() => {
    navigator.clipboard.writeText(customerLangPrompt);
  }, [customerLangPrompt]);

  const controls = (
    <>
      <ControlGroup label="Score">
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs kami-text-muted">
            <span>Benefit coverage</span>
            <span className="tabular-nums font-bold kami-text">{stats.score}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--kami-border)" }}>
            <div
              style={{
                width: `${stats.score}%`,
                height: "100%",
                background: stats.score >= 80 ? "var(--kami-success)" : stats.score >= 50 ? "#f59e0b" : "#ef4444",
              }}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs mt-2">
          <div>
            <span className="block font-bold kami-text-success">{stats.valid}</span>
            <span className="kami-text-dim">mapped</span>
          </div>
          <div>
            <span className="block font-bold kami-text-warning">{stats.needsBenefit}</span>
            <span className="kami-text-dim">missing</span>
          </div>
          <div>
            <span className="block font-bold kami-text-error">{stats.featureSpeak}</span>
            <span className="kami-text-dim">spec-y</span>
          </div>
        </div>
      </ControlGroup>
      <ControlGroup label="Manage">
        <button onClick={addRow} className="kc-segment-btn" style={{ minHeight: 40 }}>+ Add row</button>
        <button onClick={clearAll} className="kc-segment-btn" style={{ minHeight: 40 }}>Reset</button>
      </ControlGroup>
      <ControlGroup label="AI prompt">
        <button onClick={handleCopyPrompt} disabled={!customerLangPrompt} className="kc-segment-btn" style={{ minHeight: 40 }}>
          Copy &quot;translate to customer language&quot; prompt
        </button>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleDownloadCSV}>CSV</ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopyMarkdown}>
        {copied ? "Copied" : "Copy MD"}
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs kami-text-muted">
      <p>Map features → benefits → outcomes. We flag &quot;feature-speak&quot; rows (api/integration/architecture words) and rows missing a benefit.</p>
      <p><strong>Rewrite formula:</strong> state the feature → ask &quot;so what?&quot; until it hits a human outcome → rewrite as what the customer gains.</p>
      <p>If you can put &quot;so what?&quot; after your sentence and it still needs an answer, it&apos;s a feature.</p>
    </div>
  );



  return (
    <ToolShell
      title="Feature-Benefit Mapper"
      tagline="Feature → benefit → outcome · feature-speak detection · export MD/CSV"
      accent={ACCENT_PMM}
      materialFab={{ label: "Copy Markdown", onClick: handleCopyMarkdown }}
      actions={actions}
      controls={controls}
      info={info}
    >
      <div className="glass-canvas-section">
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {/* Table */}
        <div
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          {/* Header */}
          <div
            className="hidden px-5 py-3 sm:grid sm:grid-cols-12 sm:gap-3 kami-border-bottom"
          >
            <div className="col-span-3 text-xs font-semibold uppercase tracking-wider kami-text-muted">
              Feature
            </div>
            <div className="col-span-5 text-xs font-semibold uppercase tracking-wider kami-text-muted">
              Customer Benefit
            </div>
            <div className="col-span-2 text-xs font-semibold uppercase tracking-wider kami-text-muted">
              Audience
            </div>
            <div className="col-span-1 text-xs font-semibold uppercase tracking-wider kami-text-muted">
              Status
            </div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          <div>
            {rows.map((row) => {
              const status = getValidation(row);
              const statusMeta = getStatusLabel(status);
              return (
                <div
                  key={row.id}
                  className="group grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-12 sm:gap-3 sm:py-2"
                >
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs sm:hidden kami-text-dim">
                      Feature
                    </label>
                    <input
                      type="text"
                      value={row.feature}
                      onChange={(e) =>
                        updateRow(row.id, "feature", e.target.value)
                      }
                      placeholder="What you built"
                      className="w-full px-3 py-2 text-sm focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                      }}
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="mb-1 block text-xs sm:hidden kami-text-dim">
                      Customer Benefit
                    </label>
                    <input
                      type="text"
                      value={row.benefit}
                      onChange={(e) =>
                        updateRow(row.id, "benefit", e.target.value)
                      }
                      placeholder="Why the customer cares"
                      className="w-full px-3 py-2 text-sm focus:outline-none"
                      style={{
                        color: "var(--kami-text)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                        ...(status === "missing-benefit"
                          ? {
                              border: "1px solid color-mix(in srgb, #f59e0b 40%, var(--kami-border-strong))",
                              background: "color-mix(in srgb, #f59e0b 6%, var(--kami-surface-solid))",
                            }
                          : status === "feature-speak"
                          ? {
                              border: "1px solid color-mix(in srgb, #ef4444 40%, var(--kami-border-strong))",
                              background: "color-mix(in srgb, #ef4444 6%, var(--kami-surface-solid))",
                            }
                          : {
                              border: "1px solid var(--kami-border-strong)",
                              background: "var(--kami-input-bg, var(--kami-surface-solid))",
                            }),
                      }}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs sm:hidden kami-text-dim">
                      Audience
                    </label>
                    <input
                      type="text"
                      value={row.audience}
                      onChange={(e) =>
                        updateRow(row.id, "audience", e.target.value)
                      }
                      placeholder="Who"
                      className="w-full px-3 py-2 text-sm focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                      }}
                    />
                  </div>
                  <div className="flex items-center sm:col-span-1">
                    {status !== "empty" && (
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-medium"
                        style={{
                          ...statusMeta.style,
                          borderRadius: "var(--kami-cta-radius, 0.375rem)",
                        }}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end sm:col-span-1">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="rounded px-1.5 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100 kami-text-dim"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add row */}
          <div className="px-5 py-3 kami-border-top">
            <button
              onClick={addRow}
              className="w-full px-4 py-2 text-sm transition-colors"
              style={{
                border: "1px dashed var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
                color: "var(--kami-text-muted)",
              }}
            >
              + Add Feature
            </button>
          </div>
        </div>
      </div>
      </div>
    </ToolShell>
  );
}

// stale legacy markup retained below for reference
function _unused() { return null; }
const _stale = (
  <div style={{ display: "none" }}>
    {false && (
      <div>
        {/* Tips */}
        <div
          className="mt-6 p-5"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <h2 className="mb-3 text-sm font-semibold kami-text-muted">
            Writing better benefits
          </h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium" style={{ color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))" }}>
                Feature-speak (avoid)
              </p>
              <ul className="space-y-1 kami-text-muted">
                <li>
                  <span className="kami-text-dim">•</span> &quot;Webhook
                  infrastructure enables pipeline automation&quot;
                </li>
                <li>
                  <span className="kami-text-dim">•</span> &quot;Built on a
                  microservices architecture&quot;
                </li>
                <li>
                  <span className="kami-text-dim">•</span> &quot;Native CRM
                  integration&quot;
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium" style={{ color: "color-mix(in srgb, #10b981 70%, var(--kami-text))" }}>
                Customer benefit (use)
              </p>
              <ul className="space-y-1 kami-text-muted">
                <li>
                  <span className="kami-text-dim">•</span> &quot;Reps save 30
                  min per day by eliminating manual data entry&quot;
                </li>
                <li>
                  <span className="kami-text-dim">•</span> &quot;99.99% uptime
                  means your team never misses a call&quot;
                </li>
                <li>
                  <span className="kami-text-dim">•</span> &quot;One-click sync
                  keeps your CRM accurate without copy-pasting&quot;
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    )}
  </div>
);
