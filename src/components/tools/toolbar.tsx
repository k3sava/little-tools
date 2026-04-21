"use client";

import Link from "next/link";
import { useToolsTheme } from "./theme-provider";

interface Crumb {
  label: string;
  href?: string;
}

interface ToolbarProps {
  breadcrumbs: Crumb[];
  accent?: string; // hex color for the accent dot
}

export function Toolbar({ breadcrumbs, accent }: ToolbarProps) {
  const { theme, toggle } = useToolsTheme();

  return (
    <div className="tools-toolbar flex items-center justify-between border-b px-4 py-3 sm:px-6">
      <nav className="flex items-center gap-1.5 text-sm">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="tools-text-muted select-none">/</span>
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="tools-text-secondary hover:tools-text transition-colors"
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="tools-text font-medium flex items-center gap-1.5">
                {accent && (
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                )}
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            // dispatch custom event for command palette
            window.dispatchEvent(new CustomEvent("open-command-palette"));
          }}
          className="tools-text-muted hover:tools-text hidden sm:flex items-center gap-1.5 rounded-md tools-surface-hover px-2 py-1 text-xs transition-colors"
        >
          <kbd className="font-mono">⌘K</kbd>
        </button>

        <button
          onClick={toggle}
          className="tools-text-muted hover:tools-text flex h-8 w-8 items-center justify-center rounded-lg tools-surface-hover transition-all active:scale-95"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 9.27A6.5 6.5 0 1 1 6.73 2 5 5 0 0 0 14 9.27Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
