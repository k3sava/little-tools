"use client";

/**
 * Touch-friendly control primitives used inside ToolShell side panels.
 *
 * All controls follow these rules:
 *   - Minimum 40×40 touch target on mobile
 *   - Use --kami-* tokens so they adapt to every theme
 *   - Keyboard accessible (Tab + arrow keys where appropriate)
 *   - Show value/state inline (no separate "current value" label needed)
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";

/* ============================================================
   Slider — range input with inline value badge and step controls.
   ============================================================ */
export function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  unit = "",
  format,
  label,
  ariaLabel,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  format?: (n: number) => string;
  label?: React.ReactNode;
  ariaLabel?: string;
}) {
  const id = useId();
  const display = format ? format(value) : `${value}${unit}`;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="kc-slider">
      {label && (
        <div className="kc-slider-head">
          <label htmlFor={id} className="kc-label">
            {label}
          </label>
          <span className="kc-value" aria-live="polite">
            {display}
          </span>
        </div>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        aria-label={ariaLabel ?? (typeof label === "string" ? label : undefined)}
        className="kc-range"
        style={{ ["--kc-fill" as string]: `${pct}%` }}
      />
    </div>
  );
}

/* ============================================================
   NumberStepper — touch number input with +/- buttons.
   ============================================================ */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit = "",
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: React.ReactNode;
}) {
  const set = (n: number) => {
    if (min !== undefined) n = Math.max(min, n);
    if (max !== undefined) n = Math.min(max, n);
    onChange(n);
  };
  return (
    <div className="kc-stepper-wrap">
      {label && <label className="kc-label">{label}</label>}
      <div className="kc-stepper">
        <button
          type="button"
          onClick={() => set(value - step)}
          aria-label="Decrease"
          className="kc-stepper-btn"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => set(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="kc-stepper-input"
        />
        {unit && <span className="kc-stepper-unit">{unit}</span>}
        <button
          type="button"
          onClick={() => set(value + step)}
          aria-label="Increase"
          className="kc-stepper-btn"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   Segment — segmented control (radio group with pill styling).
   ============================================================ */
export function Segment<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size = "md",
  full,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: React.ReactNode; hint?: string }>;
  label?: React.ReactNode;
  size?: "sm" | "md";
  full?: boolean;
}) {
  return (
    <div className="kc-segment-wrap">
      {label && <label className="kc-label">{label}</label>}
      <div
        className={`kc-segment ${size === "sm" ? "is-sm" : ""} ${
          full ? "is-full" : ""
        }`}
        role="radiogroup"
      >
        {options.map((o) => (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={value === o.value}
            type="button"
            onClick={() => onChange(o.value)}
            data-active={value === o.value}
            title={o.hint}
            className="kc-segment-btn"
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ============================================================
   Toggle — switch-style boolean control.
   ============================================================ */
export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <label className="kc-toggle">
      <span className="kc-toggle-text">
        <span className="kc-label">{label}</span>
        {hint && <span className="kc-hint">{hint}</span>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className="kc-toggle-track"
        data-on={checked}
      >
        <span className="kc-toggle-knob" />
      </span>
    </label>
  );
}

/* ============================================================
   Swatch — color swatch grid with optional custom color input.
   ============================================================ */
export function SwatchGrid({
  value,
  onChange,
  colors,
  label,
  allowCustom = true,
}: {
  value: string;
  onChange: (color: string) => void;
  colors: string[];
  label?: React.ReactNode;
  allowCustom?: boolean;
}) {
  return (
    <div className="kc-swatch-wrap">
      {label && <label className="kc-label">{label}</label>}
      <div className="kc-swatch-grid">
        {colors.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            data-active={value.toLowerCase() === c.toLowerCase()}
            aria-label={`Set color to ${c}`}
            className="kc-swatch"
            style={{ backgroundColor: c }}
          />
        ))}
        {allowCustom && (
          <label className="kc-swatch is-custom" aria-label="Custom color">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <span aria-hidden="true" className="kc-swatch-custom-icon">
              +
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Select — styled native select.
   ============================================================ */
export function Select<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
  label?: React.ReactNode;
}) {
  return (
    <div className="kc-select-wrap">
      {label && <label className="kc-label">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="kc-select"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ============================================================
   ActionRow — sticky bottom action row on mobile, inline on desktop.
   ============================================================ */
export function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="kc-action-row">{children}</div>;
}

/* ============================================================
   Hook — detect viewport size for tools that swap layout.
   ============================================================ */
export function useViewport() {
  const [w, setW] = useState(() =>
    typeof window === "undefined" ? 1200 : window.innerWidth
  );
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return { width: w, isMobile: w < 768, isTablet: w >= 768 && w < 1024 };
}
