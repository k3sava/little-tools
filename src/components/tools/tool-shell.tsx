"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Upload, X } from "lucide-react";
import { ShortcutContext } from "@/contexts/shortcut-context";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";

export interface ToolShellProps {
  title: string;
  tagline?: string;
  accent?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  controls?: React.ReactNode;
  info?: React.ReactNode;
  mobileAction?: React.ReactNode;
  hideControls?: boolean;
  controlsLabel?: string;
  panelWidth?: string;
}

// ── Inline Theme Switcher ────────────────────────────────────────────────────

const THEMES = [
  { id: "default",    label: "classic",   icon: "○" },
  { id: "brutalist",  label: "brutalist", icon: "■" },
  { id: "editorial",  label: "editorial", icon: "¶" },
  { id: "terminal",   label: "phosphor",  icon: ">" },
  { id: "zen",        label: "zen",       icon: "◯" },
  { id: "glass",      label: "glass",     icon: "◎" },
  { id: "material",   label: "material",  icon: "◆" },
  { id: "metro",      label: "metro",     icon: "▣" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

const COOKIE_OPTS = "path=/; domain=.iamkesava.com; max-age=31536000; SameSite=Lax";
function readCookie(): ThemeId | null {
  try {
    const ck = ("; " + document.cookie).split("; kami.theme=")[1];
    const v = ck ? ck.split(";")[0] : null;
    if (v && THEMES.some((t) => t.id === v)) return v as ThemeId;
  } catch { /* noop */ }
  return null;
}
function writeCookie(id: string) {
  try { document.cookie = `kami.theme=${id}; ${COOKIE_OPTS}`; } catch { /* noop */ }
}

function applyTheme(theme: ThemeId) {
  const html = document.documentElement;
  if (theme === "default") {
    html.removeAttribute("data-theme");
  } else {
    html.setAttribute("data-theme", theme);
  }
}

function InlineThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("brutalist");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = readCookie();
    if (cv) {
      try { localStorage.setItem("kami.theme", cv); } catch { /* noop */ }
      setTheme(cv);
      applyTheme(cv);
      return;
    }
    let saved = localStorage.getItem("kami.theme") as ThemeId | null;
    if (!saved) {
      const legacy = localStorage.getItem("theme") as ThemeId | null;
      if (legacy && THEMES.some((t) => t.id === legacy)) {
        saved = legacy;
        try { localStorage.setItem("kami.theme", legacy); } catch { /* noop */ }
      }
    }
    const id = (saved && THEMES.some((t) => t.id === saved)) ? saved : "brutalist";
    writeCookie(id);
    setTheme(id);
    applyTheme(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, [open]);

  const select = useCallback((id: ThemeId) => {
    setTheme(id);
    applyTheme(id);
    try { localStorage.setItem("kami.theme", id); } catch { /* noop */ }
    writeCookie(id);
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
          try { localStorage.setItem("kami.theme", next); } catch { /* noop */ }
          writeCookie(next);
          return next;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = THEMES.find((t) => t.id === theme)!;

  return (
    <div ref={ref} className="tool-theme-inline" aria-label="Switch theme">
      <button
        type="button"
        className="theme-switcher-pill"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Theme: ${current.label}. Press T to cycle.`}
        aria-expanded={open}
        title={`${current.label} (T)`}
      >
        <span className="theme-switcher-pill-icon">{current.icon}</span>
      </button>
      {open && (
        <div className="tool-theme-inline-picker theme-switcher-picker">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
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
  );
}

// ── Share button ─────────────────────────────────────────────────────────────

function ToolShareButton() {
  const [state, setState] = useState<"idle" | "copied">("idle");
  const onShare = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const title = document.title;
    if ("share" in navigator) {
      try { await navigator.share({ title, url }); return; } catch { /* fall through */ }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(url);
        setState("copied");
        window.setTimeout(() => setState("idle"), 1800);
      } catch { /* ignore */ }
    }
  }, []);
  return (
    <button
      type="button"
      onClick={onShare}
      aria-label="Share this tool"
      data-variant="ghost"
      className="tool-icon-btn"
    >
      {state === "copied" ? <Check size={14} /> : <Upload size={14} />}
    </button>
  );
}

// ── Keyboard shortcut formatting ─────────────────────────────────────────────

function formatShortcutKey(key: string, meta?: boolean, shift?: boolean, alt?: boolean) {
  const parts: string[] = [];
  if (meta) parts.push("⌘");
  if (alt) parts.push("⌥");
  if (shift) parts.push("⇧");
  const keyMap: Record<string, string> = {
    enter: "↵", return: "↵", escape: "Esc", backspace: "⌫",
    delete: "⌦", tab: "⇥", arrowup: "↑", arrowdown: "↓",
    arrowleft: "←", arrowright: "→", " ": "Space",
  };
  parts.push(keyMap[key.toLowerCase()] ?? key.toUpperCase());
  return parts.join("");
}

// ── ToolShell ────────────────────────────────────────────────────────────────

export function ToolShell({
  title,
  tagline,
  accent,
  actions,
  children,
  controls,
  info,
  mobileAction,
  hideControls,
  controlsLabel = "Controls",
  panelWidth = "320px",
}: ToolShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const shortcutCtx = useContext(ShortcutContext);
  const labeledShortcuts = shortcutCtx?.shortcuts.filter((s) => s.label) ?? [];
  const hasControls = !hideControls && controls != null;
  const hasInfo = info != null;
  const breadcrumbs = useBreadcrumb();

  useEffect(() => {
    if (!sheetOpen && !infoOpen && !helpOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen, infoOpen, helpOpen]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSheetOpen(false);
        setInfoOpen(false);
        setHelpOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="tool-shell"
      style={{ "--tool-shell-panel-w": panelWidth, color: "var(--kami-text)" } as React.CSSProperties}
    >
      {/* ── Header: 3-column layout (theme | center | actions) ── */}
      <header className="tool-shell-header">

        {/* Left: theme switcher + breadcrumb */}
        <div className="tool-shell-left">
          <InlineThemeSwitcher />
          {breadcrumbs.length > 0 ? (
            <nav className="tool-shell-breadcrumb" aria-label="Breadcrumb">
              {breadcrumbs.map((item, i) => (
                <span key={i}>
                  {i > 0 && <span className="tool-shell-breadcrumb-sep" aria-hidden="true">·</span>}
                  {item.href
                    ? <a href={item.href}>{item.label}</a>
                    : <span aria-current="page">{item.label}</span>
                  }
                </span>
              ))}
            </nav>
          ) : (
            <nav className="tool-shell-breadcrumb" aria-label="Breadcrumb">
              <a href="https://apps.iamkesava.com">home</a>
              <span className="tool-shell-breadcrumb-sep" aria-hidden="true">·</span>
              <a href="https://tools.iamkesava.com">tools</a>
            </nav>
          )}
        </div>

        {/* Center: name + tagline */}
        <div className="tool-shell-center">
          <div className="tool-shell-title-row">
            {accent && (
              <span aria-hidden="true" className="tool-shell-accent-dot" style={{ backgroundColor: accent }} />
            )}
            <h1 className="tool-shell-title">{title}</h1>
          </div>
          {tagline && (
            <p className="tool-shell-tagline">{tagline}</p>
          )}
        </div>

        {/* Right: actions */}
        <div className="tool-shell-actions">
          {actions}
          <ToolShareButton />
          {labeledShortcuts.length > 0 && (
            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              data-variant="ghost"
              className="tool-action-btn tool-help-btn"
            >
              ?
            </button>
          )}
        </div>

      </header>

      {/* ── Body grid ── */}
      <div className={`tool-shell-body ${hasControls ? "has-controls" : "no-controls"}`}>
        <main className="tool-shell-canvas">{children}</main>

        {hasControls && (
          <aside className={`tool-shell-panel ${sheetOpen ? "is-open" : ""}`} aria-label="Controls">
            <div className="tool-shell-panel-handle" aria-hidden="true" />
            <div className="tool-shell-panel-header md:hidden">
              <span className="text-sm font-semibold uppercase tracking-wide">{controlsLabel}</span>
              <button type="button" onClick={() => setSheetOpen(false)} className="tool-shell-icon-btn" aria-label="Close controls">
                <X size={16} />
              </button>
            </div>
            <div className="tool-shell-panel-inner">{controls}</div>
          </aside>
        )}
      </div>

      {/* ── Mobile FAB row ── */}
      <div className="tool-shell-fab-row">
        {mobileAction}
        {hasInfo && (
          <button type="button" className="tool-shell-fab" onClick={() => setInfoOpen((v) => !v)} aria-label="Show info">
            <span aria-hidden="true">?</span>
          </button>
        )}
        {hasControls && (
          <button
            type="button"
            className="tool-shell-fab is-primary"
            onClick={() => setSheetOpen((v) => !v)}
            aria-label={sheetOpen ? "Hide controls" : "Show controls"}
            aria-expanded={sheetOpen}
          >
            {sheetOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
            <span className="tool-shell-fab-label">{controlsLabel}</span>
          </button>
        )}
      </div>

      {/* ── Sheet backdrop ── */}
      {(sheetOpen || infoOpen) && (
        <button type="button" aria-label="Close panel" className="tool-shell-backdrop" onClick={() => { setSheetOpen(false); setInfoOpen(false); }} />
      )}

      {/* ── Info drawer ── */}
      {hasInfo && (
        <div className={`tool-shell-info ${infoOpen ? "is-open" : ""}`}>
          <div className="tool-shell-panel-handle" aria-hidden="true" />
          <div className="tool-shell-panel-header">
            <span className="text-sm font-semibold uppercase tracking-wide">About</span>
            <button type="button" onClick={() => setInfoOpen(false)} className="tool-shell-icon-btn" aria-label="Close info">
              <X size={16} />
            </button>
          </div>
          <div className="tool-shell-panel-inner">{info}</div>
        </div>
      )}

      {/* ── Keyboard shortcuts modal ── */}
      {helpOpen && (
        <>
          <div className="tool-shortcuts-overlay" onClick={() => setHelpOpen(false)} aria-hidden="true" />
          <div className="tool-shortcuts-modal" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
            <div className="tool-shortcuts-modal-header">
              <span className="text-sm font-semibold uppercase tracking-wide">Keyboard shortcuts</span>
              <button type="button" onClick={() => setHelpOpen(false)} className="tool-shell-icon-btn" aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="tool-shortcuts-modal-body">
              {labeledShortcuts.map((s, i) => (
                <div key={i} className="tool-shortcuts-row">
                  <kbd className="tool-shortcuts-kbd">{formatShortcutKey(s.key, s.meta, s.shift, s.alt)}</kbd>
                  <span className="tool-shortcuts-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

export function ControlGroup({ label, hint, children, inline }: {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <section className={`control-group ${inline ? "is-inline" : ""}`}>
      {label && (
        <div className="control-group-head">
          <label className="control-group-label">{label}</label>
          {hint && <span className="control-group-hint">{hint}</span>}
        </div>
      )}
      <div className="control-group-body">{children}</div>
    </section>
  );
}

export function CanvasToolbar({ children }: { children: React.ReactNode }) {
  return <div className="canvas-toolbar">{children}</div>;
}

export function ToolIconButton({ label, onClick, children, active, disabled, variant = "ghost" }: {
  label: string;
  onClick?: () => void;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  variant?: "ghost" | "solid" | "outline";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      data-variant={variant}
      data-active={active ? "true" : undefined}
      className="tool-icon-btn"
    >
      {children}
    </button>
  );
}

export function ToolActionButton({ onClick, children, variant = "ghost", disabled, type = "button" }: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "ghost" | "solid" | "outline" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} data-variant={variant} className="tool-action-btn">
      {children}
    </button>
  );
}
