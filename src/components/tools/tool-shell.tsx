"use client";

/**
 * ToolShell — mobile-first app-shell layout for every tool.
 *
 * Layout:
 *   ┌────────────────────────────────────────┐
 *   │ Sticky tool header (title + actions)   │
 *   ├──────────────────────┬─────────────────┤
 *   │                      │                 │
 *   │   Canvas / workspace │  Controls panel │
 *   │                      │  (desktop side, │
 *   │                      │   mobile sheet) │
 *   │                      │                 │
 *   └──────────────────────┴─────────────────┘
 *
 * Mobile behaviour: canvas fills viewport. Controls collapse into a
 * bottom-sheet toggled by a floating "Controls" button. A second
 * floating button opens an optional secondary panel (e.g. Help/Info).
 *
 * Inspired by toys.iamkesava.com/wordart and /pixart — the workspace
 * is the centerpiece, controls are contextual and always reachable.
 */

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

export interface ToolShellProps {
  /** Tool title shown in the header */
  title: string;
  /** Optional one-line tagline shown under the title on desktop */
  tagline?: string;
  /** Optional accent dot color (matches the tool's primary collection) */
  accent?: string;
  /** Toolbar actions rendered top-right (copy, download, reset, share, ...) */
  actions?: React.ReactNode;
  /** Main workspace — text editor, canvas, preview, etc. */
  children: React.ReactNode;
  /** Side panel content — sliders, dropdowns, toggles */
  controls?: React.ReactNode;
  /** Optional secondary panel — usually help/info/tips */
  info?: React.ReactNode;
  /** Floating action bar pinned to bottom on mobile (CTA: copy/download/...) */
  mobileAction?: React.ReactNode;
  /** When true, hide the controls panel (e.g. tool has no settings) */
  hideControls?: boolean;
  /** Label used for the mobile bottom-sheet toggle button */
  controlsLabel?: string;
  /** Desktop side panel width in CSS units */
  panelWidth?: string;
}

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
  const hasControls = !hideControls && controls != null;
  const hasInfo = info != null;

  // Lock body scroll when bottom-sheet is open on mobile
  useEffect(() => {
    if (!sheetOpen && !infoOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen, infoOpen]);

  // Close sheets on Esc
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSheetOpen(false);
        setInfoOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      className="tool-shell"
      style={
        {
          "--tool-shell-panel-w": panelWidth,
          color: "var(--kami-text)",
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="tool-shell-header">
        <div className="tool-shell-title-block">
          {accent && (
            <span
              aria-hidden="true"
              className="tool-shell-accent-dot"
              style={{ backgroundColor: accent }}
            />
          )}
          <div className="min-w-0">
            <h1 className="tool-shell-title">{title}</h1>
            {tagline && <p className="tool-shell-tagline">{tagline}</p>}
          </div>
        </div>
        {actions && <div className="tool-shell-actions">{actions}</div>}
      </header>

      {/* Body grid */}
      <div
        className={`tool-shell-body ${
          hasControls ? "has-controls" : "no-controls"
        }`}
      >
        <main className="tool-shell-canvas">{children}</main>

        {hasControls && (
          <aside
            className={`tool-shell-panel ${sheetOpen ? "is-open" : ""}`}
            aria-label="Controls"
          >
            <div className="tool-shell-panel-handle" aria-hidden="true" />
            <div className="tool-shell-panel-header md:hidden">
              <span className="text-sm font-semibold uppercase tracking-wide">
                {controlsLabel}
              </span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
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

      {/* Mobile floating action: controls toggle + info toggle + extra action */}
      <div className="tool-shell-fab-row">
        {mobileAction}
        {hasInfo && (
          <button
            type="button"
            className="tool-shell-fab"
            onClick={() => setInfoOpen((v) => !v)}
            aria-label="Show info"
          >
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

      {/* Backdrop for open sheets */}
      {(sheetOpen || infoOpen) && (
        <button
          type="button"
          aria-label="Close panel"
          className="tool-shell-backdrop"
          onClick={() => {
            setSheetOpen(false);
            setInfoOpen(false);
          }}
        />
      )}

      {/* Info drawer (separate from controls; opens above sheet) */}
      {hasInfo && (
        <div className={`tool-shell-info ${infoOpen ? "is-open" : ""}`}>
          <div className="tool-shell-panel-handle" aria-hidden="true" />
          <div className="tool-shell-panel-header">
            <span className="text-sm font-semibold uppercase tracking-wide">
              About
            </span>
            <button
              type="button"
              onClick={() => setInfoOpen(false)}
              className="tool-shell-icon-btn"
              aria-label="Close info"
            >
              <X size={16} />
            </button>
          </div>
          <div className="tool-shell-panel-inner">{info}</div>
        </div>
      )}
    </div>
  );
}

/** Labeled group of controls inside the side panel. */
export function ControlGroup({
  label,
  hint,
  children,
  inline,
}: {
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

/** Sticky toolbar at the top of the canvas — desktop alternative to FAB row. */
export function CanvasToolbar({ children }: { children: React.ReactNode }) {
  return <div className="canvas-toolbar">{children}</div>;
}

/** Icon-only button used inside ToolShell actions / toolbars. */
export function ToolIconButton({
  label,
  onClick,
  children,
  active,
  disabled,
  variant = "ghost",
}: {
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

/** Standard text/icon action button used in ToolShell `actions` slot. */
export function ToolActionButton({
  onClick,
  children,
  variant = "ghost",
  disabled,
  type = "button",
}: {
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "ghost" | "solid" | "outline" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      className="tool-action-btn"
    >
      {children}
    </button>
  );
}
