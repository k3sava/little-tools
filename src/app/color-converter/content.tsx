"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface RGB {
  r: number;
  g: number;
  b: number;
}
interface HSL {
  h: number;
  s: number;
  l: number;
}
interface HSV {
  h: number;
  s: number;
  v: number;
}
interface CMYK {
  c: number;
  m: number;
  y: number;
  k: number;
}

/* ------------------------------------------------------------------ */
/*  Color math - all from scratch, no libraries                        */
/* ------------------------------------------------------------------ */

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// HEX <-> RGB
function hexToRgb(hex: string): RGB | null {
  const clean = hex.replace(/^#/, "");
  let full = clean;
  if (full.length === 3) {
    full = full[0] + full[0] + full[1] + full[1] + full[2] + full[2];
  }
  if (full.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex(rgb: RGB): string {
  const h = (n: number) =>
    clamp(Math.round(n), 0, 255)
      .toString(16)
      .padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

// RGB <-> HSL
function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;
  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  };
}

// RGB <-> HSV / HSB
function rgbToHsv(rgb: RGB): HSV {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, v: v * 100 };
}

function hsvToRgb(hsv: HSV): RGB {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  let r = 0,
    g = 0,
    b = 0;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// RGB <-> CMYK
function rgbToCmyk(rgb: RGB): CMYK {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: ((1 - r - k) / (1 - k)) * 100,
    m: ((1 - g - k) / (1 - k)) * 100,
    y: ((1 - b - k) / (1 - k)) * 100,
    k: k * 100,
  };
}

// sRGB <-> linear
function srgbToLinear(v: number): number {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

// Linear sRGB -> OKLAB (Björn Ottosson)
function rgbToOklab(rgb: RGB): { L: number; a: number; b: number } {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  const l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function rgbToOklch(rgb: RGB): { L: number; C: number; h: number } {
  const { L, a, b } = rgbToOklab(rgb);
  const C = Math.sqrt(a * a + b * b);
  let h = (Math.atan2(b, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C, h };
}

// Display-P3 conversion (approximate via sRGB linear -> P3 matrix)
function rgbToP3(rgb: RGB): { r: number; g: number; b: number } {
  // sRGB linear -> XYZ -> P3 linear -> P3 sRGB-encoded values (display-p3 uses sRGB transfer)
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  // sRGB -> XYZ (D65)
  const X = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const Y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const Z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  // XYZ -> Display-P3 (linear)
  const pR = 2.493497 * X - 0.931384 * Y - 0.402711 * Z;
  const pG = -0.829489 * X + 1.762664 * Y + 0.023625 * Z;
  const pB = 0.035846 * X - 0.076172 * Y + 0.956885 * Z;
  // Linear -> encoded (sRGB transfer for display-p3)
  const enc = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return { r: enc(pR), g: enc(pG), b: enc(pB) };
}

// Relative luminance (sRGB linearization)
function relativeLuminance(rgb: RGB): number {
  return (
    0.2126 * srgbToLinear(rgb.r) +
    0.7152 * srgbToLinear(rgb.g) +
    0.0722 * srgbToLinear(rgb.b)
  );
}

function contrastRatio(fg: RGB, bg: RGB): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Palette helpers - rotate hue in HSL
function rotateHue(rgb: RGB, degrees: number): RGB {
  const hsl = rgbToHsl(rgb);
  hsl.h = (hsl.h + degrees + 360) % 360;
  return hslToRgb(hsl);
}

/* ------------------------------------------------------------------ */
/*  Parsing user input strings                                         */
/* ------------------------------------------------------------------ */

function parseHexInput(v: string): RGB | null {
  return hexToRgb(v.trim());
}

function parseRgbInput(v: string): RGB | null {
  const m = v.match(
    /rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*[\d.]+\s*)?\)/i
  );
  if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  const parts = v.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^\d+$/.test(p))) {
    return { r: +parts[0], g: +parts[1], b: +parts[2] };
  }
  return null;
}

function parseHslInput(v: string): HSL | null {
  const m = v.match(
    /hsla?\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*(?:,\s*[\d.]+\s*)?\)/i
  );
  if (m) return { h: +m[1], s: +m[2], l: +m[3] };
  const parts = v
    .replace(/%/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^[\d.]+$/.test(p))) {
    return { h: +parts[0], s: +parts[1], l: +parts[2] };
  }
  return null;
}

function parseHsvInput(v: string): HSV | null {
  const m = v.match(
    /hsv\s*\(\s*([\d.]+)\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i
  );
  if (m) return { h: +m[1], s: +m[2], v: +m[3] };
  const parts = v
    .replace(/%/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 3 && parts.every((p) => /^[\d.]+$/.test(p))) {
    return { h: +parts[0], s: +parts[1], v: +parts[2] };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Format strings                                                     */
/* ------------------------------------------------------------------ */

function fmtHex(rgb: RGB) {
  return rgbToHex(rgb);
}
function fmtRgb(rgb: RGB) {
  return `rgb(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)})`;
}
function fmtHsl(rgb: RGB) {
  const h = rgbToHsl(rgb);
  return `hsl(${Math.round(h.h)}, ${Math.round(h.s)}%, ${Math.round(h.l)}%)`;
}
function fmtHsv(rgb: RGB) {
  const h = rgbToHsv(rgb);
  return `hsv(${Math.round(h.h)}, ${Math.round(h.s)}%, ${Math.round(h.v)}%)`;
}
function fmtCmyk(rgb: RGB) {
  const c = rgbToCmyk(rgb);
  return `cmyk(${Math.round(c.c)}%, ${Math.round(c.m)}%, ${Math.round(c.y)}%, ${Math.round(c.k)}%)`;
}
function fmtOklab(rgb: RGB) {
  const { L, a, b } = rgbToOklab(rgb);
  return `oklab(${(L * 100).toFixed(1)}% ${a.toFixed(3)} ${b.toFixed(3)})`;
}
function fmtOklch(rgb: RGB) {
  const { L, C, h } = rgbToOklch(rgb);
  return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${h.toFixed(1)})`;
}
function fmtP3(rgb: RGB) {
  const { r, g, b } = rgbToP3(rgb);
  return `color(display-p3 ${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)})`;
}

/* ------------------------------------------------------------------ */
/*  Copy-to-clipboard one-line row                                     */
/* ------------------------------------------------------------------ */

function FormatRow({ label, value, onParse, parseable }: {
  label: string;
  value: string;
  onParse?: (v: string) => void;
  parseable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    });
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className="w-16 shrink-0 text-xs font-semibold uppercase tracking-wide"
        style={{ color: "var(--kami-text-dim)" }}
      >
        {label}
      </span>
      <input
        value={parseable ? draft : value}
        readOnly={!parseable}
        onChange={
          parseable
            ? (e) => {
                setDraft(e.target.value);
                onParse?.(e.target.value);
              }
            : undefined
        }
        onClick={parseable ? undefined : copy}
        className="w-full px-3 py-2 font-mono text-xs focus:outline-none"
        style={{
          background: "var(--kami-input-bg, var(--kami-surface-solid))",
          color: "var(--kami-text)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-input-radius, 0.5rem)",
          cursor: parseable ? "text" : "pointer",
        }}
      />
      <button
        onClick={copy}
        className="shrink-0 px-2 py-2 text-xs"
        style={{
          background: copied ? "var(--kami-cta-bg)" : "var(--kami-surface)",
          color: copied ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-cta-radius, 0.5rem)",
          minWidth: 64,
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ColorConverterContent() {
  const [{ color: initialColor }, setToolState] = useToolState({ color: "#ff6600" });
  const initialRgb = useMemo(() => hexToRgb(initialColor) ?? { r: 255, g: 102, b: 0 }, []);
  const [rgb, setRgb] = useState<RGB>(initialRgb);

  // Sync from a new RGB source
  const syncAll = useCallback(
    (newRgb: RGB) => {
      setRgb(newRgb);
      setToolState({ color: rgbToHex(newRgb) });
    },
    [setToolState],
  );

  const onHexParse = (v: string) => {
    const parsed = parseHexInput(v);
    if (parsed) syncAll(parsed);
  };
  const onRgbParse = (v: string) => {
    const parsed = parseRgbInput(v);
    if (parsed) syncAll(parsed);
  };
  const onHslParse = (v: string) => {
    const parsed = parseHslInput(v);
    if (parsed) syncAll(hslToRgb(parsed));
  };
  const onHsvParse = (v: string) => {
    const parsed = parseHsvInput(v);
    if (parsed) syncAll(hsvToRgb(parsed));
  };

  const onPickerChange = (v: string) => {
    const parsed = hexToRgb(v);
    if (parsed) syncAll(parsed);
  };

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "Enter",
          meta: true,
          action: () => {
            navigator.clipboard.writeText(fmtHex(rgb));
          },
          label: "Copy HEX",
        },
      ],
      [rgb],
    ),
  );

  const hex = fmtHex(rgb);
  const whiteContrast = contrastRatio(rgb, { r: 255, g: 255, b: 255 });
  const blackContrast = contrastRatio(rgb, { r: 0, g: 0, b: 0 });

  // Palette items
  const complementary = rotateHue(rgb, 180);
  const analogous1 = rotateHue(rgb, 30);
  const analogous2 = rotateHue(rgb, -30);
  const triadic1 = rotateHue(rgb, 120);
  const triadic2 = rotateHue(rgb, 240);
  const splitComp1 = rotateHue(rgb, 150);
  const splitComp2 = rotateHue(rgb, 210);

  const paletteItems: { label: string; color: RGB }[] = [
    { label: "Complementary", color: complementary },
    { label: "Analogous +30", color: analogous1 },
    { label: "Analogous −30", color: analogous2 },
    { label: "Triadic A", color: triadic1 },
    { label: "Triadic B", color: triadic2 },
    { label: "Split-comp A", color: splitComp1 },
    { label: "Split-comp B", color: splitComp2 },
  ];

  // Shades
  const shades = useMemo(() => {
    const hsl = rgbToHsl(rgb);
    const lightnesses = [97, 93, 86, 77, 66, 50, 40, 32, 24, 17, 10];
    return lightnesses.map((l) => hslToRgb({ h: hsl.h, s: hsl.s, l }));
  }, [rgb]);

  // Color blindness sims
  const cbSims = useMemo(
    () => ({
      protanopia: simulateColorBlindness(rgb, "protanopia"),
      deuteranopia: simulateColorBlindness(rgb, "deuteranopia"),
      tritanopia: simulateColorBlindness(rgb, "tritanopia"),
    }),
    [rgb],
  );

  // Closest named CSS color
  const closestNamed = useMemo(() => {
    return CSS_NAMED_COLORS.map(([name, h]) => {
      const candidate = hexToRgb(h)!;
      return { name, hex: h, dist: colorDistance(rgb, candidate), rgb: candidate };
    })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 6);
  }, [rgb]);

  const copyHex = () => navigator.clipboard.writeText(hex);
  const copyAll = () => {
    navigator.clipboard.writeText(
      [fmtHex(rgb), fmtRgb(rgb), fmtHsl(rgb), fmtHsv(rgb), fmtOklch(rgb), fmtOklab(rgb), fmtP3(rgb), fmtCmyk(rgb)].join("\n"),
    );
  };

  return (
    <ToolShell
      title="Color Converter"
      tagline="HEX · RGB · HSL · HSV · OKLCH · OKLAB · Display-P3 · CMYK · contrast"
      accent="#8b5cf6"
      actions={
        <>
          <ToolActionButton onClick={copyAll} variant="outline">Copy all</ToolActionButton>
          <ToolActionButton onClick={copyHex} variant="solid">Copy HEX</ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Pick a color">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={hex}
                onChange={(e) => onPickerChange(e.target.value)}
                aria-label="Color picker"
                className="h-12 w-16 cursor-pointer"
                style={{
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                }}
              />
              <span className="font-mono text-sm" style={{ color: "var(--kami-text-muted)" }}>{hex.toUpperCase()}</span>
            </div>
          </ControlGroup>

          <ControlGroup label="Quick palette">
            <div className="grid grid-cols-4 gap-2">
              {paletteItems.map((p) => (
                <button
                  key={p.label}
                  onClick={() => syncAll(p.color)}
                  className="flex flex-col items-center gap-1"
                  title={`${p.label} · ${rgbToHex(p.color)}`}
                >
                  <span
                    className="block h-9 w-full"
                    style={{
                      background: rgbToHex(p.color),
                      border: "1px solid var(--kami-border)",
                      borderRadius: "var(--kami-cta-radius, 0.4rem)",
                    }}
                  />
                  <span className="truncate text-[10px]" style={{ color: "var(--kami-text-dim)" }}>{p.label}</span>
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup label="Closest CSS named">
            <div className="flex flex-wrap gap-1.5">
              {closestNamed.map((c) => (
                <button
                  key={c.name}
                  onClick={() => syncAll(c.rgb)}
                  className="flex items-center gap-1.5 px-2 py-1 text-[11px]"
                  style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border)",
                    borderRadius: "var(--kami-cta-radius, 0.4rem)",
                    color: "var(--kami-text-muted)",
                  }}
                >
                  <span
                    className="inline-block h-3 w-3"
                    style={{
                      background: c.hex,
                      border: "1px solid var(--kami-border)",
                      borderRadius: "2px",
                    }}
                  />
                  {c.name}
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup label="Color-blindness sim">
            <div className="grid grid-cols-3 gap-2">
              {(["protanopia", "deuteranopia", "tritanopia"] as const).map((t) => (
                <div key={t} className="flex flex-col items-center gap-1">
                  <span
                    className="block h-9 w-full"
                    style={{
                      background: rgbToHex(cbSims[t]),
                      border: "1px solid var(--kami-border)",
                      borderRadius: "var(--kami-cta-radius, 0.4rem)",
                    }}
                  />
                  <span className="text-[10px] capitalize" style={{ color: "var(--kami-text-dim)" }}>{t.replace("opia", ".")}</span>
                </div>
              ))}
            </div>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Type a color in any format (hex, rgb(), hsl(), hsv()) and see it converted to
            every other format simultaneously - including modern OKLCH, OKLAB and Display-P3.
            Click any field to copy.
          </p>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Made for</div>
            <p className="mt-1">Designers, front-end developers, brand teams.</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Reach for it when</div>
            <ul className="mt-1 space-y-1 text-xs">
              <li>· Translating a Figma hex into HSL or OKLCH</li>
              <li>· Checking a brand color works on white or black</li>
              <li>· Exporting a Display-P3 wide-gamut equivalent</li>
            </ul>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-[60vh] flex-col gap-3">
        {/* Big swatch + contrast inline */}
        <div
          className="flex flex-col gap-3 overflow-hidden sm:flex-row"
          style={{
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <div
            className="flex h-40 w-full items-end justify-between gap-2 p-4 sm:w-1/2"
            style={{
              background: hex,
              color: relativeLuminance(rgb) > 0.5 ? "#111" : "#fff",
            }}
          >
            <div className="font-mono text-xs uppercase tracking-wide opacity-80">{hex}</div>
          </div>
          <div
            className="grid w-full grid-cols-2 gap-2 p-4 sm:w-1/2"
            style={{ background: "var(--kami-surface-solid)" }}
          >
            <ContrastBadge label="vs white" ratio={whiteContrast} />
            <ContrastBadge label="vs black" ratio={blackContrast} />
            <div className="col-span-2 text-[11px]" style={{ color: "var(--kami-text-dim)" }}>
              Hue {Math.round(rgbToHsl(rgb).h)}° · Sat {Math.round(rgbToHsl(rgb).s)}% · Lum {Math.round(rgbToHsl(rgb).l)}%
            </div>
          </div>
        </div>

        {/* Format rows */}
        <div
          className="flex flex-col gap-2 p-3"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <FormatRow label="HEX" value={fmtHex(rgb)} parseable onParse={onHexParse} />
          <FormatRow label="RGB" value={fmtRgb(rgb)} parseable onParse={onRgbParse} />
          <FormatRow label="HSL" value={fmtHsl(rgb)} parseable onParse={onHslParse} />
          <FormatRow label="HSV" value={fmtHsv(rgb)} parseable onParse={onHsvParse} />
          <FormatRow label="OKLCH" value={fmtOklch(rgb)} />
          <FormatRow label="OKLAB" value={fmtOklab(rgb)} />
          <FormatRow label="P3" value={fmtP3(rgb)} />
          <FormatRow label="CMYK" value={fmtCmyk(rgb)} />
        </div>

        {/* Shade ramp */}
        <div
          className="p-3"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
          }}
        >
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
            Shades · 50 → 950
          </div>
          <div className="grid grid-cols-11 gap-1">
            {shades.map((s, i) => (
              <button
                key={i}
                onClick={() => syncAll(s)}
                title={`${i === 0 ? 50 : i === 10 ? 950 : i * 100} · ${rgbToHex(s)}`}
                className="flex h-12 items-end justify-center pb-1"
                style={{
                  background: rgbToHex(s),
                  color: relativeLuminance(s) > 0.5 ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.85)",
                  fontSize: 9,
                  fontWeight: 600,
                  borderRadius: 4,
                  border: "1px solid var(--kami-border)",
                }}
              >
                {i === 0 ? 50 : i === 10 ? 950 : i * 100}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}

function ContrastBadge({ label, ratio }: { label: string; ratio: number }) {
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA-Lg" : "Fail";
  const tone =
    ratio >= 4.5
      ? { bg: "rgba(34,197,94,0.14)", fg: "#16a34a", border: "rgba(34,197,94,0.30)" }
      : ratio >= 3
        ? { bg: "rgba(234,179,8,0.14)", fg: "#a16207", border: "rgba(234,179,8,0.30)" }
        : { bg: "rgba(239,68,68,0.14)", fg: "#b91c1c", border: "rgba(239,68,68,0.30)" };
  return (
    <div
      className="flex items-center justify-between rounded px-2 py-1.5 text-xs"
      style={{
        background: tone.bg,
        color: tone.fg,
        border: `1px solid ${tone.border}`,
        borderRadius: "var(--kami-cta-radius, 0.4rem)",
      }}
    >
      <span>{label}</span>
      <span className="font-mono">{ratio.toFixed(2)}:1 · {level}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Color blindness simulation (Brettel/Viénot matrices)               */
/* ------------------------------------------------------------------ */

function simulateColorBlindness(rgb: RGB, type: "protanopia" | "deuteranopia" | "tritanopia"): RGB {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const lr = lin(r), lg = lin(g), lb = lin(b);

  let sr: number, sg: number, sb: number;
  switch (type) {
    case "protanopia":
      sr = 0.152286 * lr + 1.052583 * lg - 0.204868 * lb;
      sg = 0.114503 * lr + 0.786281 * lg + 0.099216 * lb;
      sb = -0.003882 * lr - 0.048116 * lg + 1.051998 * lb;
      break;
    case "deuteranopia":
      sr = 0.367322 * lr + 0.860646 * lg - 0.227968 * lb;
      sg = 0.280085 * lr + 0.672501 * lg + 0.047413 * lb;
      sb = -0.01182 * lr + 0.04294 * lg + 0.968881 * lb;
      break;
    case "tritanopia":
      sr = 1.255528 * lr - 0.076749 * lg - 0.178779 * lb;
      sg = -0.078411 * lr + 0.930809 * lg + 0.147602 * lb;
      sb = 0.004733 * lr + 0.691367 * lg + 0.3039 * lb;
      break;
  }

  const delin = (v: number) => {
    const c = Math.max(0, Math.min(1, v));
    return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  };
  return {
    r: Math.round(delin(sr) * 255),
    g: Math.round(delin(sg) * 255),
    b: Math.round(delin(sb) * 255),
  };
}

/* ------------------------------------------------------------------ */
/*  Named CSS color list                                                */
/* ------------------------------------------------------------------ */

const CSS_NAMED_COLORS: [string, string][] = [
  ["aliceblue","#f0f8ff"],["antiquewhite","#faebd7"],["aqua","#00ffff"],["aquamarine","#7fffd4"],
  ["azure","#f0ffff"],["beige","#f5f5dc"],["bisque","#ffe4c4"],["black","#000000"],
  ["blanchedalmond","#ffebcd"],["blue","#0000ff"],["blueviolet","#8a2be2"],["brown","#a52a2a"],
  ["burlywood","#deb887"],["cadetblue","#5f9ea0"],["chartreuse","#7fff00"],["chocolate","#d2691e"],
  ["coral","#ff7f50"],["cornflowerblue","#6495ed"],["cornsilk","#fff8dc"],["crimson","#dc143c"],
  ["cyan","#00ffff"],["darkblue","#00008b"],["darkcyan","#008b8b"],["darkgoldenrod","#b8860b"],
  ["darkgray","#a9a9a9"],["darkgreen","#006400"],["darkkhaki","#bdb76b"],["darkmagenta","#8b008b"],
  ["darkolivegreen","#556b2f"],["darkorange","#ff8c00"],["darkorchid","#9932cc"],["darkred","#8b0000"],
  ["darksalmon","#e9967a"],["darkseagreen","#8fbc8f"],["darkslateblue","#483d8b"],["darkslategray","#2f4f4f"],
  ["darkturquoise","#00ced1"],["darkviolet","#9400d3"],["deeppink","#ff1493"],["deepskyblue","#00bfff"],
  ["dimgray","#696969"],["dodgerblue","#1e90ff"],["firebrick","#b22222"],["floralwhite","#fffaf0"],
  ["forestgreen","#228b22"],["fuchsia","#ff00ff"],["gainsboro","#dcdcdc"],["ghostwhite","#f8f8ff"],
  ["gold","#ffd700"],["goldenrod","#daa520"],["gray","#808080"],["green","#008000"],
  ["greenyellow","#adff2f"],["honeydew","#f0fff0"],["hotpink","#ff69b4"],["indianred","#cd5c5c"],
  ["indigo","#4b0082"],["ivory","#fffff0"],["khaki","#f0e68c"],["lavender","#e6e6fa"],
  ["lavenderblush","#fff0f5"],["lawngreen","#7cfc00"],["lemonchiffon","#fffacd"],["lightblue","#add8e6"],
  ["lightcoral","#f08080"],["lightcyan","#e0ffff"],["lightgoldenrodyellow","#fafad2"],["lightgray","#d3d3d3"],
  ["lightgreen","#90ee90"],["lightpink","#ffb6c1"],["lightsalmon","#ffa07a"],["lightseagreen","#20b2aa"],
  ["lightskyblue","#87cefa"],["lightslategray","#778899"],["lightsteelblue","#b0c4de"],["lightyellow","#ffffe0"],
  ["lime","#00ff00"],["limegreen","#32cd32"],["linen","#faf0e6"],["magenta","#ff00ff"],
  ["maroon","#800000"],["mediumaquamarine","#66cdaa"],["mediumblue","#0000cd"],["mediumorchid","#ba55d3"],
  ["mediumpurple","#9370db"],["mediumseagreen","#3cb371"],["mediumslateblue","#7b68ee"],["mediumspringgreen","#00fa9a"],
  ["mediumturquoise","#48d1cc"],["mediumvioletred","#c71585"],["midnightblue","#191970"],["mintcream","#f5fffa"],
  ["mistyrose","#ffe4e1"],["moccasin","#ffe4b5"],["navajowhite","#ffdead"],["navy","#000080"],
  ["oldlace","#fdf5e6"],["olive","#808000"],["olivedrab","#6b8e23"],["orange","#ffa500"],
  ["orangered","#ff4500"],["orchid","#da70d6"],["palegoldenrod","#eee8aa"],["palegreen","#98fb98"],
  ["paleturquoise","#afeeee"],["palevioletred","#db7093"],["papayawhip","#ffefd5"],["peachpuff","#ffdab9"],
  ["peru","#cd853f"],["pink","#ffc0cb"],["plum","#dda0dd"],["powderblue","#b0e0e6"],
  ["purple","#800080"],["rebeccapurple","#663399"],["red","#ff0000"],["rosybrown","#bc8f8f"],
  ["royalblue","#4169e1"],["saddlebrown","#8b4513"],["salmon","#fa8072"],["sandybrown","#f4a460"],
  ["seagreen","#2e8b57"],["seashell","#fff5ee"],["sienna","#a0522d"],["silver","#c0c0c0"],
  ["skyblue","#87ceeb"],["slateblue","#6a5acd"],["slategray","#708090"],["snow","#fffafa"],
  ["springgreen","#00ff7f"],["steelblue","#4682b4"],["tan","#d2b48c"],["teal","#008080"],
  ["thistle","#d8bfd8"],["tomato","#ff6347"],["turquoise","#40e0d0"],["violet","#ee82ee"],
  ["wheat","#f5deb3"],["white","#ffffff"],["whitesmoke","#f5f5f5"],["yellow","#ffff00"],
  ["yellowgreen","#9acd32"],
];

function colorDistance(a: RGB, b: RGB): number {
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}
