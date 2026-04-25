"use client";

import { useState, useEffect } from "react";

/**
 * A friendly introduction block that sits at the top of every tool.
 *
 * Unlike a minimalist <h1><p/> pair, this makes it obvious WHAT the tool does,
 * WHO it's for, and WHEN to use it - and optionally links to a deeper reference.
 *
 * Users can dismiss it after their first successful use; dismissal is remembered
 * per tool via localStorage so it doesn't nag power users.
 */
export interface ToolIntroProps {
  title: string;
  /** One-line tagline, shown directly under the title. */
  tagline: string;
  /** 1-3 sentence plain-English description of what this tool does. */
  description: string;
  /** Typical users / use cases as short chips ("writers", "engineers"…). */
  audience?: string[];
  /** Short bullet list of when to reach for this tool. */
  whenToUse?: string[];
  /** Optional anchor links inside the page (e.g. "#rules", "#examples"). */
  quickLinks?: { label: string; href: string }[];
  /** Storage key used to remember dismissal. Defaults to the title. */
  storageKey?: string;
  /** Override: always show, never hide the dismiss button. */
  alwaysShow?: boolean;
}

export function ToolIntro({
  title,
  tagline,
  description,
  audience,
  whenToUse,
  quickLinks,
  storageKey,
  alwaysShow,
}: ToolIntroProps) {
  const key = `intro-dismissed:${storageKey ?? title}`;
  const [dismissed, setDismissed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    if (!alwaysShow && typeof window !== "undefined") {
      setDismissed(window.localStorage.getItem(key) === "1");
    }
  }, [alwaysShow, key]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, "1");
    }
  };

  const reopen = () => {
    setDismissed(false);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(key);
    }
  };

  return (
    <div className="kami-tool-intro mb-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--kami-text)" }}>
          {title}
        </h1>
        <p className="mt-2 text-base" style={{ color: "var(--kami-text-muted)" }}>{tagline}</p>
      </div>

      {!dismissed && (
        <div
          className="kami-tool-intro-card mt-5 p-5 text-sm sm:p-6"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 1rem)",
            color: "var(--kami-text-muted)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <div className="flex items-start gap-3">
            <div
              className="kami-tool-intro-badge flex h-8 w-8 shrink-0 items-center justify-center text-xs font-semibold"
              style={{
                background: "var(--kami-cta-bg)",
                color: "var(--kami-cta-text)",
                borderRadius: "var(--kami-cta-radius, 999px)",
              }}
            >
              i
            </div>
            <div className="flex-1">
              <p className="leading-relaxed" style={{ color: "var(--kami-text)" }}>{description}</p>

              {(audience?.length || whenToUse?.length) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {audience?.length ? (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
                        Made for
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {audience.map((a) => (
                          <span
                            key={a}
                            className="kami-tool-intro-chip px-2.5 py-0.5 text-xs font-medium"
                            style={{
                              background: "var(--kami-cta2-bg-hover, var(--kami-surface))",
                              color: "var(--kami-text-muted)",
                              border: "1px solid var(--kami-border)",
                              borderRadius: "var(--kami-card-radius, 999px)",
                            }}
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {whenToUse?.length ? (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
                        Reach for it when
                      </div>
                      <ul className="mt-1.5 space-y-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                        {whenToUse.map((w) => (
                          <li key={w} className="flex gap-1.5">
                            <span style={{ color: "var(--kami-text-dim)" }}>•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              )}

              {quickLinks?.length ? (
                <div className="mt-4 flex flex-wrap gap-3 text-xs">
                  {quickLinks.map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      className="font-medium underline underline-offset-2"
                      style={{ color: "var(--kami-text)" }}
                    >
                      {l.label} →
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
            {!alwaysShow && (
              <button
                onClick={dismiss}
                aria-label="Hide intro"
                className="kami-tool-intro-dismiss shrink-0 p-1"
                style={{ color: "var(--kami-text-dim)" }}
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
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}

      {dismissed && !alwaysShow && hydrated && (
        <div className="mt-3 text-center">
          <button
            onClick={reopen}
            className="text-xs underline underline-offset-2"
            style={{ color: "var(--kami-text-dim)" }}
          >
            Show intro
          </button>
        </div>
      )}
    </div>
  );
}
