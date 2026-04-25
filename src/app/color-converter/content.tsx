"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

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

function cmykToRgb(cmyk: CMYK): RGB {
  const c = cmyk.c / 100;
  const m = cmyk.m / 100;
  const y = cmyk.y / 100;
  const k = cmyk.k / 100;
  return {
    r: Math.round(255 * (1 - c) * (1 - k)),
    g: Math.round(255 * (1 - m) * (1 - k)),
    b: Math.round(255 * (1 - y) * (1 - k)),
  };
}

// Relative luminance (sRGB linearization)
function relativeLuminance(rgb: RGB): number {
  const linearize = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return (
    0.2126 * linearize(rgb.r) +
    0.7152 * linearize(rgb.g) +
    0.0722 * linearize(rgb.b)
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
/*  Inline SVG icons                                                   */
/* ------------------------------------------------------------------ */

function CopyIcon() {
  return (
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Small reusable pieces                                              */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
      title="Copy"
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
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

function parseCmykInput(v: string): CMYK | null {
  const m = v.match(
    /cmyk\s*\(\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*,\s*([\d.]+)%?\s*\)/i
  );
  if (m) return { c: +m[1], m: +m[2], y: +m[3], k: +m[4] };
  const parts = v
    .replace(/%/g, "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length === 4 && parts.every((p) => /^[\d.]+$/.test(p))) {
    return { c: +parts[0], m: +parts[1], y: +parts[2], k: +parts[3] };
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

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function ColorConverterContent() {
  const [{ color: initialColor }, setToolState] = useToolState({ color: "#ff6600" });
  const initialRgb = useMemo(() => hexToRgb(initialColor) ?? { r: 255, g: 102, b: 0 }, []);
  const [rgb, setRgb] = useState<RGB>(initialRgb);

  // Text fields - kept as strings so user can type freely
  const [hexField, setHexField] = useState(fmtHex(initialRgb));
  const [rgbField, setRgbField] = useState(fmtRgb(initialRgb));
  const [hslField, setHslField] = useState(fmtHsl(initialRgb));
  const [hsvField, setHsvField] = useState(fmtHsv(initialRgb));
  const [cmykField, setCmykField] = useState(fmtCmyk(initialRgb));

  // Contrast checker
  const [fgColor, setFgColor] = useState<RGB>({ r: 255, g: 255, b: 255 });
  const [bgColor, setBgColor] = useState<RGB>(rgb);
  const [fgHex, setFgHex] = useState("#ffffff");
  const [bgHex, setBgHex] = useState(rgbToHex(rgb));

  // Sync all fields from a new RGB source, except the one being edited
  const syncAll = useCallback(
    (newRgb: RGB, except?: string) => {
      setRgb(newRgb);
      const newHex = fmtHex(newRgb);
      if (except !== "hex") setHexField(newHex);
      if (except !== "rgb") setRgbField(fmtRgb(newRgb));
      if (except !== "hsl") setHslField(fmtHsl(newRgb));
      if (except !== "hsv") setHsvField(fmtHsv(newRgb));
      if (except !== "cmyk") setCmykField(fmtCmyk(newRgb));
      setToolState({ color: newHex });
    },
    [setToolState]
  );

  // Handlers for each field
  const onHexChange = (v: string) => {
    setHexField(v);
    const parsed = parseHexInput(v);
    if (parsed) syncAll(parsed, "hex");
  };

  const onRgbChange = (v: string) => {
    setRgbField(v);
    const parsed = parseRgbInput(v);
    if (parsed) syncAll(parsed, "rgb");
  };

  const onHslChange = (v: string) => {
    setHslField(v);
    const parsed = parseHslInput(v);
    if (parsed) {
      const newRgb = hslToRgb(parsed);
      syncAll(newRgb, "hsl");
    }
  };

  const onHsvChange = (v: string) => {
    setHsvField(v);
    const parsed = parseHsvInput(v);
    if (parsed) {
      const newRgb = hsvToRgb(parsed);
      syncAll(newRgb, "hsv");
    }
  };

  const onCmykChange = (v: string) => {
    setCmykField(v);
    const parsed = parseCmykInput(v);
    if (parsed) {
      const newRgb = cmykToRgb(parsed);
      syncAll(newRgb, "cmyk");
    }
  };

  const onPickerChange = (v: string) => {
    const parsed = hexToRgb(v);
    if (parsed) syncAll(parsed);
  };

  // Keep bg in sync with main color on first load
  useEffect(() => {
    setBgColor(rgb);
    setBgHex(rgbToHex(rgb));
  }, [rgb]);

  const onFgHexChange = (v: string) => {
    setFgHex(v);
    const parsed = hexToRgb(v);
    if (parsed) setFgColor(parsed);
  };

  const onBgHexChange = (v: string) => {
    setBgHex(v);
    const parsed = hexToRgb(v);
    if (parsed) setBgColor(parsed);
  };

  const ratio = contrastRatio(fgColor, bgColor);

  // Palette
  const complementary = rotateHue(rgb, 180);
  const analogous1 = rotateHue(rgb, 30);
  const analogous2 = rotateHue(rgb, -30);
  const triadic1 = rotateHue(rgb, 120);
  const triadic2 = rotateHue(rgb, 240);
  const splitComp1 = rotateHue(rgb, 150);
  const splitComp2 = rotateHue(rgb, 210);

  const paletteItems: { label: string; color: RGB }[] = [
    { label: "Complementary", color: complementary },
    { label: "Analogous 1", color: analogous1 },
    { label: "Analogous 2", color: analogous2 },
    { label: "Triadic 1", color: triadic1 },
    { label: "Triadic 2", color: triadic2 },
    { label: "Split-comp 1", color: splitComp1 },
    { label: "Split-comp 2", color: splitComp2 },
  ];

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { navigator.clipboard.writeText(fmtHex(rgb)); }, label: "Copy HEX" },
  ], [rgb]));

  const inputClass =
    "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200";

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Color Converter"
          tagline="Convert any color between HEX, RGB, HSL, HSB/HSV, OKLCH, and CMYK - with live picker and contrast check."
          description="Type a color in any format (hex code, rgb(), hsl()) and see it converted to all others simultaneously. Drag the hue and saturation pickers to tweak it visually. Built-in WCAG contrast check against white and black tells you if the color is usable for text."
          audience={["Designers", "Front-end developers", "Brand teams"]}
          whenToUse={[
            "Translating a Figma hex into HSL for a CSS variable",
            "Checking if a brand color works as text on white",
            "Exploring a color's saturation/lightness neighbors",
          ]}
        />

        {/* Color preview + picker */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div
              className="h-28 w-28 shrink-0 rounded-xl border border-gray-200 shadow-sm"
              style={{ backgroundColor: rgbToHex(rgb) }}
            />
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-700">
                Color Picker
              </label>
              <input
                type="color"
                value={rgbToHex(rgb)}
                onChange={(e) => onPickerChange(e.target.value)}
                className="h-10 w-20 cursor-pointer rounded border border-gray-200"
              />
            </div>
          </div>
        </div>

        {/* Conversion fields */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Color Values</h2>
          <div className="grid gap-4">
            {/* HEX */}
            <div className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm font-medium text-gray-600">
                HEX
              </label>
              <input
                className={inputClass}
                value={hexField}
                onChange={(e) => onHexChange(e.target.value)}
              />
              <CopyButton text={hexField} />
            </div>
            {/* RGB */}
            <div className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm font-medium text-gray-600">
                RGB
              </label>
              <input
                className={inputClass}
                value={rgbField}
                onChange={(e) => onRgbChange(e.target.value)}
              />
              <CopyButton text={rgbField} />
            </div>
            {/* HSL */}
            <div className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm font-medium text-gray-600">
                HSL
              </label>
              <input
                className={inputClass}
                value={hslField}
                onChange={(e) => onHslChange(e.target.value)}
              />
              <CopyButton text={hslField} />
            </div>
            {/* HSV / HSB */}
            <div className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm font-medium text-gray-600">
                HSB
              </label>
              <input
                className={inputClass}
                value={hsvField}
                onChange={(e) => onHsvChange(e.target.value)}
              />
              <CopyButton text={hsvField} />
            </div>
            {/* CMYK */}
            <div className="flex items-center gap-3">
              <label className="w-16 shrink-0 text-sm font-medium text-gray-600">
                CMYK
              </label>
              <input
                className={inputClass}
                value={cmykField}
                onChange={(e) => onCmykChange(e.target.value)}
              />
              <CopyButton text={cmykField} />
            </div>
          </div>
        </div>

        {/* Contrast checker */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">
            Contrast Checker (WCAG)
          </h2>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Foreground (text)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={rgbToHex(fgColor)}
                  onChange={(e) => onFgHexChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-200"
                />
                <input
                  className={inputClass}
                  value={fgHex}
                  onChange={(e) => onFgHexChange(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-600">
                Background
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={rgbToHex(bgColor)}
                  onChange={(e) => onBgHexChange(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded border border-gray-200"
                />
                <input
                  className={inputClass}
                  value={bgHex}
                  onChange={(e) => onBgHexChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Live preview */}
          <div
            className="mb-4 rounded-lg p-6 text-center"
            style={{
              backgroundColor: rgbToHex(bgColor),
              color: rgbToHex(fgColor),
            }}
          >
            <p className="text-lg font-semibold">
              Sample Text - {ratio.toFixed(2)}:1
            </p>
            <p className="text-sm">
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>

          {/* Results grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              {
                label: "AA Normal",
                pass: ratio >= 4.5,
                req: "4.5:1",
              },
              {
                label: "AA Large",
                pass: ratio >= 3,
                req: "3:1",
              },
              {
                label: "AAA Normal",
                pass: ratio >= 7,
                req: "7:1",
              },
              {
                label: "AAA Large",
                pass: ratio >= 4.5,
                req: "4.5:1",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`rounded-lg border p-3 text-center text-sm font-medium ${
                  item.pass
                    ? "border-green-200 bg-green-50 text-green-800"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="mt-1">
                  {item.pass ? "Pass" : "Fail"}{" "}
                  <span className="text-xs font-normal text-gray-400">
                    ({item.req})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Palette generator */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Palette Generator</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {/* Current color */}
            <PaletteSwatch label="Current" color={rgb} />
            {paletteItems.map((item) => (
              <PaletteSwatch
                key={item.label}
                label={item.label}
                color={item.color}
              />
            ))}
          </div>
        </div>

        {/* Shade generator */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Shades & Tints</h2>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-11">
            {generateShades(rgb).map((shade, i) => (
              <PaletteSwatch
                key={i}
                label={`${i === 0 ? "50" : i === 10 ? "950" : i * 100}`}
                color={shade}
                compact
              />
            ))}
          </div>
        </div>

        {/* Color blindness simulation */}
        <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Color Blindness Simulation</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <PaletteSwatch label="Normal Vision" color={rgb} />
            <PaletteSwatch label="Protanopia (no red)" color={simulateColorBlindness(rgb, "protanopia")} />
            <PaletteSwatch label="Deuteranopia (no green)" color={simulateColorBlindness(rgb, "deuteranopia")} />
            <PaletteSwatch label="Tritanopia (no blue)" color={simulateColorBlindness(rgb, "tritanopia")} />
          </div>
        </div>

        {/* Named CSS colors lookup */}
        <NamedColorLookup currentRgb={rgb} onSelect={(c) => syncAll(c)} />

        {/* Footer */}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shade generation                                                    */
/* ------------------------------------------------------------------ */

function generateShades(rgb: RGB): RGB[] {
  const hsl = rgbToHsl(rgb);
  // Generate 11 shades: 50, 100, 200, ..., 900, 950
  const lightnesses = [97, 93, 86, 77, 66, 50, 40, 32, 24, 17, 10];
  return lightnesses.map((l) => hslToRgb({ h: hsl.h, s: hsl.s, l }));
}

/* ------------------------------------------------------------------ */
/*  Color blindness simulation (Brettel/Viénot matrices)               */
/* ------------------------------------------------------------------ */

function simulateColorBlindness(rgb: RGB, type: "protanopia" | "deuteranopia" | "tritanopia"): RGB {
  const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
  // Linearize sRGB
  const lin = (v: number) => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
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
      sb = -0.011820 * lr + 0.042940 * lg + 0.968881 * lb;
      break;
    case "tritanopia":
      sr = 1.255528 * lr - 0.076749 * lg - 0.178779 * lb;
      sg = -0.078411 * lr + 0.930809 * lg + 0.147602 * lb;
      sb = 0.004733 * lr + 0.691367 * lg + 0.303900 * lb;
      break;
  }

  // Delinearize
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
/*  Named CSS color lookup                                              */
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
  // Weighted Euclidean distance (human perception)
  const dr = a.r - b.r, dg = a.g - b.g, db = a.b - b.b;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

function NamedColorLookup({ currentRgb, onSelect }: { currentRgb: RGB; onSelect: (rgb: RGB) => void }) {
  const [search, setSearch] = useState("");

  const closest = useMemo(() => {
    return CSS_NAMED_COLORS
      .map(([name, hex]) => {
        const rgb = hexToRgb(hex)!;
        return { name, hex, rgb, dist: colorDistance(currentRgb, rgb) };
      })
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 5);
  }, [currentRgb]);

  const filtered = useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    return CSS_NAMED_COLORS
      .filter(([name]) => name.includes(q))
      .slice(0, 20)
      .map(([name, hex]) => ({ name, hex, rgb: hexToRgb(hex)! }));
  }, [search]);

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold">CSS Named Colors</h2>

      {/* Closest matches */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Closest named colors to current:</p>
        <div className="flex flex-wrap gap-2">
          {closest.map((c) => (
            <button
              key={c.name}
              onClick={() => onSelect(c.rgb)}
              className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm hover:shadow-md transition"
            >
              <div className="h-4 w-4 rounded border border-gray-100" style={{ backgroundColor: c.hex }} />
              <span className="text-gray-700">{c.name}</span>
              <span className="text-[10px] text-gray-400">{c.hex}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search 147 named colors..."
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
      />
      {filtered && filtered.length > 0 && (
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {filtered.map((c) => (
            <button
              key={c.name}
              onClick={() => { onSelect(c.rgb); setSearch(""); }}
              className="flex items-center gap-2 rounded-lg border border-gray-100 px-2.5 py-1.5 text-xs hover:bg-gray-50 transition"
            >
              <div className="h-3.5 w-3.5 rounded border border-gray-100 shrink-0" style={{ backgroundColor: c.hex }} />
              <span className="text-gray-700 truncate">{c.name}</span>
            </button>
          ))}
        </div>
      )}
      {filtered && filtered.length === 0 && (
        <p className="mt-2 text-xs text-gray-400">No matching color names</p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Palette swatch                                                     */
/* ------------------------------------------------------------------ */

function PaletteSwatch({ label, color, compact }: { label: string; color: RGB; compact?: boolean }) {
  const hex = rgbToHex(color);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  if (compact) {
    return (
      <button
        onClick={copy}
        className="case-preserve group flex flex-col items-center gap-1 rounded-lg border border-gray-100 p-1.5 text-center transition hover:shadow-md"
        title={`Copy ${hex}`}
      >
        <div
          className="h-8 w-full rounded border border-gray-100"
          style={{ backgroundColor: hex }}
        />
        <span className="text-[10px] text-gray-500">
          {copied ? "Copied!" : label}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={copy}
      className="case-preserve group flex flex-col items-center gap-1.5 rounded-lg border border-gray-200 p-3 text-center transition hover:shadow-md"
      title={`Copy ${hex}`}
    >
      <div
        className="h-12 w-full rounded-md border border-gray-100"
        style={{ backgroundColor: hex }}
      />
      <span className="text-xs font-medium text-gray-700">
        {copied ? "Copied!" : hex}
      </span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </button>
  );
}
