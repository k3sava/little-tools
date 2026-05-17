"use client";

/**
 * Reusable display primitives used inside tool canvases.
 * - CopyableValue: a labelled value with a click-to-copy button.
 * - StatCard: a single metric (label + big value + sub).
 * - StatGrid: responsive grid of StatCards.
 */

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyableValue({
  label,
  value,
  mono = true,
  full,
}: {
  label?: React.ReactNode;
  value: string;
  mono?: boolean;
  full?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* ignore */
    }
  }, [value]);

  return (
    <div className={`kc-copyable ${full ? "is-full" : ""}`}>
      {label && <span className="kc-copyable-label">{label}</span>}
      <span className={`kc-copyable-value ${mono ? "is-mono" : ""}`}>{value}</span>
      <button
        type="button"
        onClick={onCopy}
        className="kc-copyable-btn"
        aria-label="Copy"
        title="Copy"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="kc-stat" style={accent ? { ["--kc-stat-accent" as string]: accent } : undefined}>
      <div className="kc-stat-label">{label}</div>
      <div className="kc-stat-value">{value}</div>
      {sub && <div className="kc-stat-sub">{sub}</div>}
    </div>
  );
}

export function StatGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4;
}) {
  return <div className={`kc-stat-grid is-${cols}`}>{children}</div>;
}
