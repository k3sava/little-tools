"use client";

import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { ShortcutContext } from "@/contexts/shortcut-context";
import { useBreadcrumb } from "@/contexts/breadcrumb-context";

export interface ToolShellProps {
  title: string;
  tagline?: string;
  /** Dynamic accent hex colour — injected as --tool-accent CSS var, not inline style. */
  accent?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  controls?: React.ReactNode;
  info?: React.ReactNode;
  /** Mobile bottom bar action buttons (e.g. Animate / Cursor). Slot left of About/Controls. */
  mobileAction?: React.ReactNode;
  hideControls?: boolean;
  controlsLabel?: string;
  panelWidth?: string;
  /** M3 primary FAB — only rendered when theme=material */
  materialFab?: { label: string; onClick: () => void; icon?: React.ReactNode };
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

  // T key cycles themes, consistent with toys/wordart/pixart.
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
      className="tool-icon-btn"
      title="Share"
    >
      {state === "copied" ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
          <polyline points="16 6 12 2 8 6"/>
          <line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      )}
    </button>
  );
}

// ── Shortcut key formatting ───────────────────────────────────────────────────

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

// ── Material ripple effect ───────────────────────────────────────────────────

function useRipple(enabled: boolean, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    function onPointerDown(e: PointerEvent) {
      const target = (e.target as Element)?.closest('button, a[href], [role="button"]') as HTMLElement | null;
      if (!target || !el!.contains(target)) return;
      const rect = target.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const r = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
      const ripple = document.createElement('span');
      ripple.className = 'md-ripple';
      ripple.style.cssText = `left:${x}px;top:${y}px;width:${r * 2}px;height:${r * 2}px`;
      const pos = getComputedStyle(target).position;
      if (pos === 'static') target.style.position = 'relative';
      target.style.overflow = 'hidden';
      target.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    }
    el.addEventListener('pointerdown', onPointerDown);
    return () => el.removeEventListener('pointerdown', onPointerDown);
  }, [enabled, ref]);
}

// ── Metro Pivot ──────────────────────────────────────────────────────────────

const METRO_PIVOT_ITEMS = [
  { label: 'Tool', id: 'tool' },
  { label: 'Controls', id: 'controls' },
  { label: 'About', id: 'about' },
] as const;

type MetroPivotId = (typeof METRO_PIVOT_ITEMS)[number]['id'];

function MetroPivot({ active, onChange, hasControls, hasInfo }: {
  active: MetroPivotId;
  onChange: (id: MetroPivotId) => void;
  hasControls: boolean;
  hasInfo: boolean;
}) {
  const items = METRO_PIVOT_ITEMS.filter(item =>
    item.id === 'tool' ||
    (item.id === 'controls' && hasControls) ||
    (item.id === 'about' && hasInfo)
  );
  return (
    <nav className="metro-pivot" aria-label="Sections" role="tablist">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          className={`metro-pivot-item${active === item.id ? ' is-active' : ''}`}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

// ── Default FAB icon ──────────────────────────────────────────────────────────

const DEFAULT_FAB_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

// ── ToolShell ────────────────────────────────────────────────────────────────

const SPLASH_SEEN_KEY = 'kami.splash.seen';

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
  materialFab,
}: ToolShellProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [splashOpen, setSplashOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [metroPivot, setMetroPivot] = useState<MetroPivotId>('tool');
  const shortcutCtx = useContext(ShortcutContext);
  const shellRef = useRef<HTMLDivElement>(null);

  // Track theme changes
  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute('data-theme') || 'default';
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => {
      const t = readTheme();
      setCurrentTheme(t);
      if (t !== 'metro') setMetroPivot('tool');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // First-run splash — small delay so tool shortcuts register first
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        if (!localStorage.getItem(SPLASH_SEEN_KEY)) setSplashOpen(true);
      } catch { /* noop */ }
    }, 300);
    return () => clearTimeout(t);
  }, []);

  const isGlass    = currentTheme === 'glass';
  const isMaterial = currentTheme === 'material';
  const isMetro    = currentTheme === 'metro';

  useRipple(isMaterial, shellRef as React.RefObject<HTMLElement | null>);

  const labeledShortcuts = shortcutCtx?.shortcuts.filter((s) => s.label) ?? [];
  const hasControls = !hideControls && controls != null;
  const hasInfo = info != null;
  const breadcrumbs = useBreadcrumb();

  // Body scroll lock
  useEffect(() => {
    if (!sheetOpen && !infoOpen && !splashOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen, infoOpen, splashOpen]);

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSplashOpen(false);
        setSheetOpen(false);
        setInfoOpen(false);
        return;
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const t = e.target as Element | null;
        if (t?.matches?.("input, textarea, select, [contenteditable='true']")) return;
        e.preventDefault();
        setSplashOpen(v => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const dismissSplash = useCallback(() => {
    setSplashOpen(false);
    try { localStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch { /* noop */ }
  }, []);

  const breadcrumbSep = isMetro ? '›' : '·';

  return (
    <div
      ref={shellRef}
      className={`tool-shell theme-${currentTheme}`}
      data-metro-view={isMetro ? metroPivot : undefined}
      style={{
        "--tool-shell-panel-w": panelWidth,
        "--tool-accent": accent ?? "transparent",
      } as React.CSSProperties}
    >

      {/* ── Header ── */}
      <header className="tool-shell-header">
        <div className="tool-shell-left">
          <InlineThemeSwitcher />
          <nav className="tool-shell-breadcrumb" aria-label="Breadcrumb">
            {breadcrumbs.length > 0 ? (
              breadcrumbs.map((item, i) => (
                <span key={i}>
                  {i > 0 && <span className="tool-shell-breadcrumb-sep" aria-hidden="true">{breadcrumbSep}</span>}
                  {item.href
                    ? <a href={item.href}>{item.label}</a>
                    : <span aria-current="page">{item.label}</span>
                  }
                </span>
              ))
            ) : (
              <>
                <a href="https://apps.iamkesava.com">home</a>
                <span className="tool-shell-breadcrumb-sep" aria-hidden="true">{breadcrumbSep}</span>
                <a href="https://tools.iamkesava.com">tools</a>
              </>
            )}
          </nav>
        </div>

        <div className="tool-shell-center">
          <div className="tool-shell-title-row">
            {accent && <span aria-hidden="true" className="tool-shell-accent-dot" />}
            <h1 className="tool-shell-title">{title}</h1>
          </div>
          {tagline && <p className="tool-shell-tagline">{tagline}</p>}
        </div>

        <div className="tool-shell-actions">
          {actions}
          <ToolShareButton />
          <button
            type="button"
            onClick={() => setSplashOpen(v => !v)}
            aria-label="Keyboard shortcuts"
            className="tool-icon-btn tool-help-btn"
            title="Help (?)"
          >
            ?
          </button>
        </div>
      </header>

      {/* Metro Pivot — always in DOM when Metro, CSS drives visibility */}
      <nav className="metro-pivot" aria-label="Sections" role="tablist">
        <button
          type="button" role="tab"
          aria-selected={metroPivot === 'tool'}
          className={`metro-pivot-item${metroPivot === 'tool' ? ' is-active' : ''}`}
          onClick={() => { setMetroPivot('tool'); setSheetOpen(false); setInfoOpen(false); }}
        >
          Tool
        </button>
        {hasControls && (
          <button
            type="button" role="tab"
            aria-selected={metroPivot === 'controls'}
            className={`metro-pivot-item${metroPivot === 'controls' ? ' is-active' : ''}`}
            onClick={() => { setMetroPivot('controls'); setSheetOpen(true); setInfoOpen(false); }}
          >
            Controls
          </button>
        )}
        {hasInfo && (
          <button
            type="button" role="tab"
            aria-selected={metroPivot === 'about'}
            className={`metro-pivot-item${metroPivot === 'about' ? ' is-active' : ''}`}
            onClick={() => { setMetroPivot('about'); setInfoOpen(true); setSheetOpen(false); }}
          >
            About
          </button>
        )}
      </nav>

      {/* Large title — Glass (iOS) and Metro (Zune panoramic) */}
      {(isGlass || isMetro) && title && (
        <div className="tool-shell-large-title" aria-hidden="true">
          <div className="tool-shell-large-title-inner">
            {isGlass && <div className="tool-shell-large-title-eyebrow">tool</div>}
            <h2 className="tool-shell-large-title-text">{title}</h2>
            {tagline && <p className="tool-shell-large-title-sub">{tagline}</p>}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div className={`tool-shell-body${hasControls ? " has-controls" : " no-controls"}`}>
        <main className="tool-shell-canvas">{children}</main>

        {hasControls && (
          <aside className={`tool-shell-panel${sheetOpen ? " is-open" : ""}`} aria-label="Controls">
            <div className="tool-shell-panel-handle" aria-hidden="true" />
            <div className="tool-shell-panel-header">
              <span className="tool-shell-panel-label">{controlsLabel}</span>
              <button
                type="button"
                onClick={() => { setSheetOpen(false); if (isMetro) setMetroPivot('tool'); }}
                className="tool-shell-icon-btn"
                aria-label="Close controls"
              >
                <X size={16} />
              </button>
            </div>
            <div className="tool-shell-panel-inner">{controls}</div>
          </aside>
        )}
      </div>

      {/* ── Material primary FAB ── */}
      {isMaterial && materialFab && (
        <button
          type="button"
          onClick={materialFab.onClick}
          title={materialFab.label}
          aria-label={materialFab.label}
          className="tool-material-fab"
        >
          {materialFab.icon ?? DEFAULT_FAB_ICON}
        </button>
      )}

      {/* ── Mobile bottom action bar ── */}
      <div className="tool-mode-bottom">
        {mobileAction}
        {hasInfo && (
          <button
            type="button"
            className={`tool-mode-btn${infoOpen ? ' is-active' : ''}`}
            onClick={() => setInfoOpen(v => !v)}
          >
            About
          </button>
        )}
        {hasControls && (
          <button
            type="button"
            className={`tool-mode-btn is-primary${sheetOpen ? ' is-active' : ''}`}
            onClick={() => setSheetOpen(v => !v)}
            aria-expanded={sheetOpen}
          >
            {controlsLabel}
          </button>
        )}
      </div>

      {/* ── Sheet / info backdrop ── */}
      {(sheetOpen || infoOpen) && (
        <button
          type="button"
          aria-label="Close panel"
          className="tool-shell-backdrop"
          onClick={() => {
            setSheetOpen(false);
            setInfoOpen(false);
            if (isMetro) setMetroPivot('tool');
          }}
        />
      )}

      {/* ── Info drawer ── */}
      {hasInfo && (
        <div className={`tool-shell-info${infoOpen ? " is-open" : ""}`}>
          <div className="tool-shell-panel-handle" aria-hidden="true" />
          <div className="tool-shell-panel-header">
            <span className="tool-shell-panel-label">About</span>
            <button type="button" onClick={() => setInfoOpen(false)} className="tool-shell-icon-btn" aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <div className="tool-shell-panel-inner">{info}</div>
        </div>
      )}

      {/* ── Splash / help overlay ── */}
      {splashOpen && (
        <div className="tool-splash" role="dialog" aria-label="Keyboard shortcuts" onClick={dismissSplash}>
          <div className="tool-splash-inner">
            <div className="tool-splash-title">{title}</div>
            {tagline && <div className="tool-splash-tag">{tagline}</div>}
            <div className="tool-splash-grid">
              <span><kbd>T</kbd></span><span>cycle theme</span>
              {labeledShortcuts.map((s, i) => (
                <React.Fragment key={i}>
                  <span><kbd>{formatShortcutKey(s.key, s.meta, s.shift, s.alt)}</kbd></span>
                  <span>{s.label}</span>
                </React.Fragment>
              ))}
              <span><kbd>?</kbd></span><span>show this again</span>
              <span><kbd>Esc</kbd></span><span>close</span>
            </div>
            <div className="tool-splash-tap">click anywhere to begin</div>
          </div>
        </div>
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
    <section className={`control-group${inline ? " is-inline" : ""}`}>
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
