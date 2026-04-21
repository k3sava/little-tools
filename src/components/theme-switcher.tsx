"use client";

import { useEffect, useState, useCallback } from "react";
import { usePathname } from "next/navigation";

const THEMES = [
  { id: "default", label: "classic", icon: "○" },
  { id: "brutalist", label: "brutalist", icon: "■" },
  { id: "editorial", label: "editorial", icon: "¶" },
  { id: "terminal", label: "phosphor", icon: ">" },
  { id: "zen", label: "zen", icon: "◯" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

function applyTheme(theme: ThemeId) {
  const html = document.documentElement;
  if (theme === "default") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", theme);
  }
}

export function ThemeSwitcher() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeId>("brutalist");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as ThemeId | null;
    if (saved && THEMES.some((t) => t.id === saved)) {
      setTheme(saved);
      applyTheme(saved);
      return;
    }
    applyTheme("brutalist");
    localStorage.setItem("theme", "brutalist");
  }, []);

  const select = useCallback((id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    localStorage.setItem("theme", id);
    setOpen(false);
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
          aria-label={`Current theme: ${current.label}. Click to change.`}
          title={current.label}
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
