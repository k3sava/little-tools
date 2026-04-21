"use client";

import { useState } from "react";
import Link from "next/link";
import { SearchDialog } from "./search-dialog";

export function HelpHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/help" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white font-bold text-sm">
                J
              </div>
              <span className="font-semibold text-[var(--text-primary)]">
                Help Center
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm text-[var(--text-secondary,#737373)] hover:border-[var(--primary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <span className="hidden sm:inline">Search articles...</span>
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-[var(--bg-muted)] px-1.5 font-mono text-[10px] text-[var(--text-secondary,#737373)]">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
            <Link
              href="https://justcall.io"
              className="text-sm text-[var(--text-secondary,#737373)] hover:text-[var(--text-primary)] transition-colors"
            >
              JustCall.io
            </Link>
            <Link
              href="https://app.justcall.io"
              className="rounded-md bg-[var(--primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--primary-hover)] transition-colors"
            >
              Login
            </Link>
          </div>
        </div>
      </header>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
