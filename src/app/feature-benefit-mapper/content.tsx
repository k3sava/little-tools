"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ReferencePanel } from "@/components/tools/reference-panel";

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
  color: string;
  bg: string;
} {
  switch (status) {
    case "valid":
      return { label: "Good", color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" };
    case "missing-benefit":
      return { label: "Needs benefit", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
    case "feature-speak":
      return { label: "Feature-speak", color: "text-red-600", bg: "bg-red-50 border-red-200" };
    case "empty":
      return { label: "", color: "text-gray-400", bg: "" };
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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Feature-Benefit Mapper"
          tagline="Turn every feature into a customer benefit - and get warned when your copy is still 'feature-speak.'"
          description="List your features in the left column. For each, write the benefit it delivers - what the customer gains, not what the product does. We flag rows that are still technical-sounding (&quot;API endpoint&quot;, &quot;integration&quot;) and suggest verbs that re-frame them as outcomes. Export the mapped table to use in your landing page copy."
          audience={["PMMs", "Copywriters", "Founders", "Growth"]}
          whenToUse={[
            "Rewriting a feature-dense landing page",
            "Turning a changelog into marketing copy",
            "Reviewing ad copy for customer-speak",
          ]}
          quickLinks={[
            { label: "Features vs benefits, explained", href: "#feat-vs-benefit" },
          ]}
        />

        {/* Score bar */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div
                  className={`text-3xl font-bold ${
                    stats.score >= 80
                      ? "text-emerald-600"
                      : stats.score >= 50
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {stats.score}%
                </div>
                <div className="text-xs text-gray-500">Benefit Coverage</div>
              </div>
              <div className="h-10 w-px bg-gray-200" />
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-600">
                  {stats.valid} mapped
                </span>
                <span className="text-amber-600">
                  {stats.needsBenefit} missing
                </span>
                {stats.featureSpeak > 0 && (
                  <span className="text-red-600">
                    {stats.featureSpeak} feature-speak
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCopyMarkdown}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                {copied ? "Copied!" : "Copy Markdown"}
              </button>
              <button
                onClick={handleDownloadCSV}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:border-gray-300"
              >
                CSV
              </button>
              <button
                onClick={clearAll}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:border-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                stats.score >= 80
                  ? "bg-emerald-500"
                  : stats.score >= 50
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${stats.score}%` }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          {/* Header */}
          <div className="hidden border-b border-gray-100 px-5 py-3 sm:grid sm:grid-cols-12 sm:gap-3">
            <div className="col-span-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Feature
            </div>
            <div className="col-span-5 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Customer Benefit
            </div>
            <div className="col-span-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Audience
            </div>
            <div className="col-span-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Status
            </div>
            <div className="col-span-1" />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {rows.map((row) => {
              const status = getValidation(row);
              const statusMeta = getStatusLabel(status);
              return (
                <div
                  key={row.id}
                  className="group grid grid-cols-1 gap-2 px-5 py-3 sm:grid-cols-12 sm:gap-3 sm:py-2"
                >
                  <div className="sm:col-span-3">
                    <label className="mb-1 block text-xs text-gray-400 sm:hidden">
                      Feature
                    </label>
                    <input
                      type="text"
                      value={row.feature}
                      onChange={(e) =>
                        updateRow(row.id, "feature", e.target.value)
                      }
                      placeholder="What you built"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <label className="mb-1 block text-xs text-gray-400 sm:hidden">
                      Customer Benefit
                    </label>
                    <input
                      type="text"
                      value={row.benefit}
                      onChange={(e) =>
                        updateRow(row.id, "benefit", e.target.value)
                      }
                      placeholder="Why the customer cares"
                      className={`w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-200 ${
                        status === "missing-benefit"
                          ? "border-amber-300 bg-amber-50/50"
                          : status === "feature-speak"
                          ? "border-red-300 bg-red-50/50"
                          : "border-gray-200 bg-white"
                      }`}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs text-gray-400 sm:hidden">
                      Audience
                    </label>
                    <input
                      type="text"
                      value={row.audience}
                      onChange={(e) =>
                        updateRow(row.id, "audience", e.target.value)
                      }
                      placeholder="Who"
                      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                    />
                  </div>
                  <div className="flex items-center sm:col-span-1">
                    {status !== "empty" && (
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-xs font-medium ${statusMeta.bg} ${statusMeta.color}`}
                      >
                        {statusMeta.label}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-end sm:col-span-1">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="rounded px-1.5 py-0.5 text-xs text-gray-400 opacity-0 transition-opacity hover:text-gray-600 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add row */}
          <div className="border-t border-gray-100 px-5 py-3">
            <button
              onClick={addRow}
              className="w-full rounded-lg border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-700"
            >
              + Add Feature
            </button>
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">
            Writing better benefits
          </h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 font-medium text-red-600">
                Feature-speak (avoid)
              </p>
              <ul className="space-y-1 text-gray-600">
                <li>
                  <span className="text-gray-300">•</span> &quot;Webhook
                  infrastructure enables pipeline automation&quot;
                </li>
                <li>
                  <span className="text-gray-300">•</span> &quot;Built on a
                  microservices architecture&quot;
                </li>
                <li>
                  <span className="text-gray-300">•</span> &quot;Native CRM
                  integration&quot;
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium text-emerald-600">
                Customer benefit (use)
              </p>
              <ul className="space-y-1 text-gray-600">
                <li>
                  <span className="text-gray-300">•</span> &quot;Reps save 30
                  min per day by eliminating manual data entry&quot;
                </li>
                <li>
                  <span className="text-gray-300">•</span> &quot;99.99% uptime
                  means your team never misses a call&quot;
                </li>
                <li>
                  <span className="text-gray-300">•</span> &quot;One-click sync
                  keeps your CRM accurate without copy-pasting&quot;
                </li>
              </ul>
            </div>
          </div>
        </div>

        <ReferencePanel
          id="feat-vs-benefit"
          title="Features vs benefits - the rewrite formula"
          summary="A three-step translation that works on almost any feature."
          defaultOpen
        >
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 1</div>
              <div className="mt-1 font-medium text-gray-900">State the feature (what it does)</div>
              <div className="mt-1 text-xs text-gray-600">&quot;AES-256 encryption at rest and in transit.&quot;</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 2</div>
              <div className="mt-1 font-medium text-gray-900">Ask &quot;so what?&quot; until it hits a human outcome</div>
              <div className="mt-1 text-xs text-gray-600">Encrypted → unreadable if stolen → customer data stays safe → you don&apos;t make the news.</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Step 3</div>
              <div className="mt-1 font-medium text-gray-900">Rewrite as what the customer gains</div>
              <div className="mt-1 text-xs text-gray-600">&quot;Your customer data stays private - even if a backup is stolen.&quot;</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Rule of thumb:</strong> if you can put &quot;so what?&quot; after your
              sentence and it still needs an answer, it&apos;s a feature. If the reader&apos;s
              reaction is &quot;oh - I want that,&quot; it&apos;s a benefit.
            </div>
          </div>
        </ReferencePanel>
      </div>
    </div>
  );
}
