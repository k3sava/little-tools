"use client";

import { useState } from "react";

/**
 * Collapsible reference section for embedding the "why" and the rules
 * alongside a tool — e.g. AP vs APA title case rules, WCAG contrast
 * thresholds, regex flag meanings, framework comparisons.
 *
 * Default is open on first visit so users actually learn something.
 */
export function ReferencePanel({
  id,
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      id={id}
      className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">{title}</div>
          {summary && (
            <p className="mt-0.5 text-xs text-gray-500">{summary}</p>
          )}
        </div>
        <span
          className={`mt-0.5 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-700">
          {children}
        </div>
      )}
    </section>
  );
}

/**
 * A reusable, consistent rule row for use inside <ReferencePanel>.
 * Shows a "do" vs "don't" contrast or a simple explanation with an example.
 */
export function RuleRow({
  rule,
  explanation,
  example,
}: {
  rule: React.ReactNode;
  explanation?: React.ReactNode;
  example?: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 py-2.5 sm:grid-cols-[auto,1fr,auto] sm:items-baseline sm:gap-4">
      <div className="text-sm font-medium text-gray-900">{rule}</div>
      {explanation && (
        <div className="text-xs text-gray-600">{explanation}</div>
      )}
      {example && (
        <div className="font-mono text-xs text-gray-500">{example}</div>
      )}
    </div>
  );
}
