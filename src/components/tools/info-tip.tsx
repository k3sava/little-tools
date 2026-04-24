"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Small inline info marker with click/hover popover — for explaining
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
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-gray-300 bg-white text-[10px] font-semibold text-gray-500 hover:border-gray-400 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
      >
        ?
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-6 z-20 w-64 -translate-x-1/2 rounded-lg border border-gray-200 bg-white p-3 text-left text-xs leading-relaxed text-gray-700 shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
