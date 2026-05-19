"use client";

import { useEffect, useState, useCallback } from "react";

const THEMES = [
  { id: "default", label: "classic", icon: "○" },
  { id: "brutalist", label: "brutalist", icon: "■" },
  { id: "editorial", label: "editorial", icon: "¶" },
  { id: "terminal", label: "phosphor", icon: ">" },
  { id: "zen", label: "zen", icon: "◯" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "kami.theme";
const LEGACY_KEY = "theme";
const DEFAULT: ThemeId = "brutalist";

function readStored(): ThemeId {
  try {
    let v = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (!v) {
      const legacy = localStorage.getItem(LEGACY_KEY) as ThemeId | null;
      if (legacy && THEMES.some((t) => t.id === legacy)) {
        v = legacy;
        localStorage.setItem(STORAGE_KEY, legacy);
      }
    }
    if (v && THEMES.some((t) => t.id === v)) return v as ThemeId;
  } catch { /* noop */ }
  return DEFAULT;
}

function applyTheme(theme: ThemeId) {
  const html = document.documentElement;
  if (theme === "default") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", theme);
  }
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>(DEFAULT);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = readStored();
    setTheme(saved);
    applyTheme(saved);
  }, []);

  const select = useCallback((id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    try { localStorage.setItem(STORAGE_KEY, id); } catch { /* noop */ }
    setOpen(false);
  }, []);

  // T key cycles themes, consistent with toys and wordart/pixart.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.documentElement.getAttribute("data-kami-shortcuts") === "off") return;
      const t = e.target as Element | null;
      if (t?.matches?.("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === "t" || e.key === "T") {
        setTheme((cur) => {
          const i = THEMES.findIndex((x) => x.id === cur);
          const next = THEMES[(i + 1) % THEMES.length].id;
          applyTheme(next);
          try { localStorage.setItem(STORAGE_KEY, next); } catch { /* noop */ }
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = THEMES.find((t) => t.id === theme)!;

  return (
    <>
      {open && (
        <div
          className="theme-switcher-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="theme-switcher-container">
        <button
          className="theme-switcher-pill"
          onClick={() => setOpen(!open)}
          aria-label={`Current theme: ${current.label}. Click or press T to change.`}
          title={`${current.label} (T)`}
        >
          <span className="theme-switcher-pill-icon">{current.icon}</span>
        </button>

        {open && (
          <div className="theme-switcher-picker">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={`theme-switcher-option${t.id === theme ? " active" : ""}`}
                onClick={() => select(t.id)}
              >
                <span className="theme-switcher-option-icon">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
