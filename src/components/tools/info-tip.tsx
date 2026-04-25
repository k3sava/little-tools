"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Small inline info marker with click/hover popover - for explaining
 * cryptic labels or options without bloating the main layout.
 *
 * Usage: <InfoTip>APA treats prepositions of 4+ letters as major words.</InfoTip>
 */
export function InfoTip({
  children,
  label = "What is this?",
}: {
  children: React.ReactNode;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="kami-info-tip-trigger inline-flex h-4 w-4 items-center justify-center text-[10px] font-semibold focus:outline-none"
        style={{
          background: "var(--kami-surface)",
          color: "var(--kami-text-dim)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-cta-radius, 999px)",
        }}
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="kami-info-tip-popover absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 p-3 text-left text-xs leading-relaxed"
          style={{
            background: "var(--kami-surface-solid, var(--kami-surface))",
            color: "var(--kami-text)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.5rem)",
            boxShadow: "var(--kami-card-shadow, 0 10px 30px rgba(0,0,0,0.15))",
          }}
        >
          {children}
        </span>
      )}
    </span>
  );
}
