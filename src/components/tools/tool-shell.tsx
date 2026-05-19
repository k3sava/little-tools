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
      // Ensure target has position:relative for ripple containment
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

// ── Metro Pivot control ──────────────────────────────────────────────────────

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
    item.id === 'tool' || (item.id === 'controls' && hasControls) || (item.id === 'about' && hasInfo)
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

// ── Glass bottom tab bar ─────────────────────────────────────────────────────

function GlassTabBar({ onControls, onInfo, hasControls, hasInfo }: {
  onControls: () => void;
  onInfo: () => void;
  hasControls: boolean;
  hasInfo: boolean;
}) {
  return (
    <nav className="glass-tab-bar" aria-label="Navigation">
      <a href="https://tools.iamkesava.com" className="glass-tab-bar-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="1.5"/>
          <rect x="13" y="3" width="8" height="8" rx="1.5"/>
          <rect x="3" y="13" width="8" height="8" rx="1.5"/>
          <rect x="13" y="13" width="8" height="8" rx="1.5"/>
        </svg>
        <span>Tools</span>
      </a>
      <a href="https://tools.iamkesava.com#search" className="glass-tab-bar-item">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <span>Search</span>
      </a>
      {hasControls && (
        <button type="button" className="glass-tab-bar-item" onClick={onControls}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="6" x2="20" y2="6"/>
            <circle cx="8" cy="6" r="2" fill="var(--kami-bg,#fff)" stroke="currentColor"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <circle cx="16" cy="12" r="2" fill="var(--kami-bg,#fff)" stroke="currentColor"/>
            <line x1="4" y1="18" x2="20" y2="18"/>
            <circle cx="10" cy="18" r="2" fill="var(--kami-bg,#fff)" stroke="currentColor"/>
          </svg>
          <span>Controls</span>
        </button>
      )}
      {hasInfo && (
        <button type="button" className="glass-tab-bar-item" onClick={onInfo}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/>
            <path d="M12 8v4M12 16h.01"/>
          </svg>
          <span>About</span>
        </button>
      )}
    </nav>
  );
}

// ── ToolShell ────────────────────────────────────────────────────────────────

const DEFAULT_FAB_ICON = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
);

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<string>('default');
  const [metroPivot, setMetroPivot] = useState<MetroPivotId>('tool');
  const shortcutCtx = useContext(ShortcutContext);
  const shellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute('data-theme') || 'default';
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => {
      const t = readTheme();
      setCurrentTheme(t);
      // Reset pivot to 'tool' when switching away from metro
      if (t !== 'metro') setMetroPivot('tool');
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  const isGlass = currentTheme === 'glass';
  const isMaterial = currentTheme === 'material';
  const isMetro = currentTheme === 'metro';

  // Material ripple — active when material theme
  useRipple(isMaterial, shellRef as React.RefObject<HTMLElement | null>);

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

  // Metro: pivot-driven visibility
  const showCanvas   = !isMetro || metroPivot === 'tool';
  const showControls = hasControls && (!isMetro || metroPivot === 'controls');
  const showInfo     = hasInfo && (!isMetro || metroPivot === 'about');

  // Metro breadcrumb separator is > not ·
  const breadcrumbSep = isMetro ? '›' : '·';

  return (
    <div
      ref={shellRef}
      className={`tool-shell theme-${currentTheme}`}
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
                  {i > 0 && <span className="tool-shell-breadcrumb-sep" aria-hidden="true">{breadcrumbSep}</span>}
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
              <span className="tool-shell-breadcrumb-sep" aria-hidden="true">{breadcrumbSep}</span>
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

        {/* Right: actions (Metro: command bar labels) */}
        <div className={`tool-shell-actions${isMetro ? ' is-command-bar' : ''}`}>
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
              <span className="tool-action-btn-label">Help</span>
            </button>
          )}
        </div>

      </header>

      {/* Metro Pivot — horizontal tab row below header */}
      {isMetro && (
        <MetroPivot
          active={metroPivot}
          onChange={(id) => {
            setMetroPivot(id);
            if (id === 'controls') { setSheetOpen(true); setInfoOpen(false); }
            else if (id === 'about') { setInfoOpen(true); setSheetOpen(false); }
            else { setSheetOpen(false); setInfoOpen(false); }
          }}
          hasControls={hasControls}
          hasInfo={hasInfo}
        />
      )}

      {/* Glass large title — iOS HIG: large title below floating header, collapses on scroll */}
      {isGlass && title && (
        <div className="tool-shell-large-title" aria-hidden="true">
          <div className="tool-shell-large-title-inner">
            <div className="tool-shell-large-title-eyebrow">tool</div>
            <h2 className="tool-shell-large-title-text">{title}</h2>
            {tagline && <p className="tool-shell-large-title-sub">{tagline}</p>}
          </div>
        </div>
      )}

      {/* ── Body grid ── */}
      <div className={`tool-shell-body ${hasControls ? "has-controls" : "no-controls"}`}>
        {isMaterial && (
          <nav className="tool-shell-nav-rail" aria-label="Navigation rail">
            <a href="/" className="tool-shell-nav-rail-item" title="All tools">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="3" y="3" width="8" height="8" rx="1.5"/>
                <rect x="13" y="3" width="8" height="8" rx="1.5"/>
                <rect x="3" y="13" width="8" height="8" rx="1.5"/>
                <rect x="13" y="13" width="8" height="8" rx="1.5"/>
              </svg>
              <span>All</span>
            </a>
            <a href="/designkit" className="tool-shell-nav-rail-item" title="Design">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2"/>
              </svg>
              <span>Design</span>
            </a>
            <a href="/devkit" className="tool-shell-nav-rail-item" title="Dev">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <polyline points="16 18 22 12 16 6"/>
                <polyline points="8 6 2 12 8 18"/>
              </svg>
              <span>Dev</span>
            </a>
            <a href="/textkit" className="tool-shell-nav-rail-item" title="Text">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6h16M4 12h10M4 18h14"/>
              </svg>
              <span>Text</span>
            </a>
          </nav>
        )}

        {showCanvas && (
          <main className="tool-shell-canvas">{children}</main>
        )}

        {showControls && (
          <aside className={`tool-shell-panel ${sheetOpen ? "is-open" : ""}`} aria-label="Controls">
            <div className="tool-shell-panel-handle" aria-hidden="true" />
            <div className="tool-shell-panel-header md:hidden">
              <span className="text-sm font-semibold uppercase tracking-wide">{controlsLabel}</span>
              <button type="button" onClick={() => { setSheetOpen(false); if (isMetro) setMetroPivot('tool'); }} className="tool-shell-icon-btn" aria-label="Close controls">
                <X size={16} />
              </button>
            </div>
            <div className="tool-shell-panel-inner">{controls}</div>
          </aside>
        )}

        {/* Metro: About panel renders inline in body when pivot=about */}
        {isMetro && showInfo && (
          <div className="tool-shell-canvas metro-about-pane">
            <div className="tool-shell-panel-inner">{info}</div>
          </div>
        )}
      </div>

      {/* ── Mobile nav: Glass tab bar OR Material FAB row OR default FAB ── */}
      {isGlass ? (
        <GlassTabBar
          onControls={() => setSheetOpen((v) => !v)}
          onInfo={() => setInfoOpen((v) => !v)}
          hasControls={hasControls}
          hasInfo={hasInfo}
        />
      ) : !isMetro ? (
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
              className={`tool-shell-fab${isMaterial ? ' is-material-fab' : ''} is-primary`}
              onClick={() => setSheetOpen((v) => !v)}
              aria-label={sheetOpen ? "Hide controls" : "Show controls"}
              aria-expanded={sheetOpen}
            >
              {sheetOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              <span className="tool-shell-fab-label">{controlsLabel}</span>
            </button>
          )}
        </div>
      ) : null}

      {/* ── Material: primary FAB (desktop, above mobile FAB row) ── */}
      {isMaterial && materialFab && (
        <button
          type="button"
          onClick={materialFab.onClick}
          title={materialFab.label}
          aria-label={materialFab.label}
          style={{
            position: "fixed",
            bottom: 88,
            right: 24,
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "#6750a4",
            color: "#fff",
            border: "none",
            boxShadow: "0 3px 12px rgba(103,80,164,0.45), 0 1px 4px rgba(103,80,164,0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 20,
            transition: "box-shadow 0.2s",
          }}
        >
          {materialFab.icon ?? DEFAULT_FAB_ICON}
        </button>
      )}

      {/* ── Sheet backdrop ── */}
      {(sheetOpen || infoOpen) && (
        <button type="button" aria-label="Close panel" className="tool-shell-backdrop" onClick={() => { setSheetOpen(false); setInfoOpen(false); if (isMetro) setMetroPivot('tool'); }} />
      )}

      {/* ── Info drawer — not shown on Metro (uses pivot instead) ── */}
      {hasInfo && !isMetro && (
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
