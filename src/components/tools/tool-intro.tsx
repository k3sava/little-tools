"use client";

import { useState, useEffect } from "react";

/**
 * A friendly introduction block that sits at the top of every tool.
 *
 * Unlike a minimalist <h1><p/> pair, this makes it obvious WHAT the tool does,
 * WHO it's for, and WHEN to use it — and optionally links to a deeper reference.
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
    <div className="mb-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          {title}
        </h1>
        <p className="mt-2 text-base text-gray-600">{tagline}</p>
      </div>

      {hydrated && !dismissed && !alwaysShow === false ? null : null}

      {!dismissed && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white/70 p-5 text-sm text-gray-700 shadow-sm backdrop-blur-sm sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              i
            </div>
            <div className="flex-1">
              <p className="leading-relaxed text-gray-700">{description}</p>

              {(audience?.length || whenToUse?.length) && (
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {audience?.length ? (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Made for
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {audience.map((a) => (
                          <span
                            key={a}
                            className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                          >
                            {a}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {whenToUse?.length ? (
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Reach for it when
                      </div>
                      <ul className="mt-1.5 space-y-1 text-xs text-gray-600">
                        {whenToUse.map((w) => (
                          <li key={w} className="flex gap-1.5">
                            <span className="text-gray-300">•</span>
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
                      className="font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900"
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
                className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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

      {dismissed && !alwaysShow && (
        <div className="mt-3 text-center">
          <button
            onClick={reopen}
            className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600"
          >
            Show intro
          </button>
        </div>
      )}
    </div>
  );
}
