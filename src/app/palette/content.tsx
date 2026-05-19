"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, NumberStepper, Toggle } from "@/components/tools/controls";

// --- Color utilities ---

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function randomHue(): number {
  return Math.floor(Math.random() * 360);
}

function randomSL(): [number, number] {
  return [40 + Math.floor(Math.random() * 40), 40 + Math.floor(Math.random() * 30)];
}

// --- Harmony modes ---

type HarmonyMode =
  | "random"
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "tetradic";

function generateHarmony(mode: HarmonyMode, count: number): string[] {
  const baseH = randomHue();
  const [s, l] = randomSL();
  const hues: number[] = [];

  switch (mode) {
    case "complementary":
      hues.push(baseH, (baseH + 180) % 360);
      // Fill remaining with slight variations
      for (let i = 2; i < count; i++)
        hues.push((baseH + (i % 2 === 0 ? 15 : 195) + i * 5) % 360);
      break;
    case "analogous":
      for (let i = 0; i < count; i++)
        hues.push((baseH + i * 30 - ((count - 1) * 15)) % 360);
      break;
    case "triadic":
      hues.push(baseH, (baseH + 120) % 360, (baseH + 240) % 360);
      for (let i = 3; i < count; i++)
        hues.push((baseH + 60 + i * 30) % 360);
      break;
    case "split-complementary":
      hues.push(baseH, (baseH + 150) % 360, (baseH + 210) % 360);
      for (let i = 3; i < count; i++)
        hues.push((baseH + i * 72) % 360);
      break;
    case "tetradic":
      hues.push(
        baseH,
        (baseH + 90) % 360,
        (baseH + 180) % 360,
        (baseH + 270) % 360,
      );
      for (let i = 4; i < count; i++)
        hues.push((baseH + 45 + i * 30) % 360);
      break;
    default: // random
      for (let i = 0; i < count; i++) hues.push(randomHue());
      break;
  }

  return hues
    .slice(0, count)
    .map((h, i) => {
      const sl = mode === "random" ? randomSL() : [s + (i * 5 - 10), l + (i * 3 - 6)];
      return hslToHex(
        (h + 360) % 360,
        Math.max(20, Math.min(90, sl[0])),
        Math.max(25, Math.min(75, sl[1])),
      );
    });
}

// --- Extract colors from image ---

function extractColorsFromImage(
  img: HTMLImageElement,
  count: number,
): string[] {
  const canvas = document.createElement("canvas");
  const size = 100;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // Simple k-means-ish: bucket colors
  const buckets: Map<string, { r: number; g: number; b: number; count: number }> =
    new Map();
  for (let i = 0; i < data.length; i += 4) {
    const r = Math.round(data[i] / 32) * 32;
    const g = Math.round(data[i + 1] / 32) * 32;
    const b = Math.round(data[i + 2] / 32) * 32;
    const key = `${r},${g},${b}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.r += data[i];
      existing.g += data[i + 1];
      existing.b += data[i + 2];
      existing.count++;
    } else {
      buckets.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], count: 1 });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, count)
    .map((b) => {
      const r = Math.round(b.r / b.count);
      const g = Math.round(b.g / b.count);
      const bl = Math.round(b.b / b.count);
      return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${bl.toString(16).padStart(2, "0")}`;
    });
}

// --- Export formats ---

function toCssVars(colors: string[]): string {
  return `:root {\n${colors.map((c, i) => `  --color-${i + 1}: ${c};`).join("\n")}\n}`;
}

function toScss(colors: string[]): string {
  return colors.map((c, i) => `$color-${i + 1}: ${c};`).join("\n");
}

function toTailwind(colors: string[]): string {
  const entries = colors
    .map((c, i) => `      '${(i + 1) * 100}': '${c}',`)
    .join("\n");
  return `// tailwind.config.js\nmodule.exports = {\n  theme: {\n    extend: {\n      colors: {\n        palette: {\n${entries}\n        },\n      },\n    },\n  },\n};`;
}

function toJson(colors: string[]): string {
  return JSON.stringify(colors, null, 2);
}

function toSvg(colors: string[]): string {
  const w = 200;
  const h = 200;
  const rects = colors
    .map(
      (c, i) =>
        `<rect x="${i * w}" y="0" width="${w}" height="${h}" fill="${c}"/>`,
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${
    colors.length * w
  } ${h}">${rects}</svg>`;
}

type ExportFormat = "css" | "scss" | "tailwind" | "json" | "svg";

const EXPORT_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "tailwind", label: "TW" },
  { value: "json", label: "JSON" },
  { value: "svg", label: "SVG" },
];

interface PaletteColor {
  hex: string;
  locked: boolean;
}

// --- Component ---

export default function PaletteContent() {
  const [colors, setColors] = useState<PaletteColor[]>([]);
  const [harmony, setHarmony] = useState<HarmonyMode>("random");
  const [mounted, setMounted] = useState(false);

  // Generate initial palette on client only to avoid hydration mismatch
  useEffect(() => {
    setColors(generateHarmony("random", 5).map((hex) => ({ hex, locked: false })));
    setMounted(true);
  }, []);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("css");
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<string>("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMetro = currentTheme === "metro";
  const [showAdjacentContrast, setShowAdjacentContrast] = useState(true);
  const [copied, setCopied] = useState<number | null>(null);
  const [exportCopied, setExportCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shuffle = useCallback(() => {
    const newColors = generateHarmony(harmony, colors.length);
    setColors((prev) =>
      prev.map((c, i) => (c.locked ? c : { hex: newColors[i], locked: false })),
    );
  }, [harmony, colors.length]);

  // Spacebar to shuffle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        shuffle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shuffle]);

  const toggleLock = (index: number) => {
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, locked: !c.locked } : c)),
    );
  };

  const updateColor = (index: number, hex: string) => {
    setColors((prev) =>
      prev.map((c, i) => (i === index ? { ...c, hex } : c)),
    );
  };

  const addColor = () => {
    if (colors.length >= 10) return;
    setColors((prev) => [
      ...prev,
      { hex: hslToHex(randomHue(), ...randomSL()), locked: false },
    ]);
  };

  const removeColor = (index: number) => {
    if (colors.length <= 2) return;
    setColors((prev) => prev.filter((_, i) => i !== index));
  };

  const setCount = (n: number) => {
    if (n < 2 || n > 10) return;
    setColors((prev) => {
      if (n > prev.length) {
        const extras = generateHarmony(harmony, n - prev.length).map((hex) => ({
          hex,
          locked: false,
        }));
        return [...prev, ...extras];
      }
      return prev.slice(0, n);
    });
  };

  const handleImageUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const img = new Image();
      img.onload = () => {
        const extracted = extractColorsFromImage(img, colors.length);
        setColors(extracted.map((hex) => ({ hex, locked: false })));
      };
      img.src = URL.createObjectURL(file);
    },
    [colors.length],
  );

  const copyColor = (index: number) => {
    navigator.clipboard.writeText(colors[index].hex);
    setCopied(index);
    setTimeout(() => setCopied(null), 1200);
  };

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => {
      const text = colors.map((c) => c.hex).join(", ");
      navigator.clipboard.writeText(text);
    }, label: "Copy" },
  ], [colors]));

  const hexColors = colors.map((c) => c.hex);
  const exportText = (() => {
    switch (exportFormat) {
      case "css": return toCssVars(hexColors);
      case "scss": return toScss(hexColors);
      case "tailwind": return toTailwind(hexColors);
      case "json": return toJson(hexColors);
      case "svg": return toSvg(hexColors);
    }
  })();

  const luminance = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const contrastRatio = (a: string, b: string) => {
    const l1 = luminance(a);
    const l2 = luminance(b);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const copyExport = () => {
    navigator.clipboard.writeText(exportText);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 1200);
  };

  const downloadPng = () => {
    const canvas = document.createElement("canvas");
    const w = colors.length * 200;
    canvas.width = w;
    canvas.height = 200;
    const ctx = canvas.getContext("2d")!;
    colors.forEach((c, i) => {
      ctx.fillStyle = c.hex;
      ctx.fillRect(i * 200, 0, 200, 200);
    });
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "palette.png";
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  if (!mounted) {
    return (
      <ToolShell
        title="Color Palette Generator"
        tagline="Generate harmonies you can ship"
        accent="#8b5cf6"
      >
        <div className="flex h-full min-h-[60vh] items-center justify-center text-sm" style={{ color: "var(--kami-text-dim)" }}>
          Loading palette…
        </div>
      </ToolShell>
    );
  }

  const harmonyOptions: { value: HarmonyMode; label: string }[] = [
    { value: "random", label: "Random" },
    { value: "complementary", label: "Complement" },
    { value: "analogous", label: "Analogous" },
    { value: "triadic", label: "Triadic" },
    { value: "split-complementary", label: "Split" },
    { value: "tetradic", label: "Tetradic" },
  ];

  return (
    <ToolShell
      title="Color Palette Generator"
      tagline="Five harmony rules · click to lock · export to CSS/Tailwind/SVG"
      accent="#8b5cf6"
      materialFab={{ label: "Copy", onClick: copyExport }}
      actions={
        <>
          <ToolActionButton onClick={copyExport} variant="outline">
            {exportCopied ? "Copied!" : "Copy"}
          </ToolActionButton>
          <ToolActionButton onClick={shuffle} variant="solid">
            New palette
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Harmony">
            <Segment
              value={harmony}
              onChange={setHarmony}
              options={harmonyOptions}
              full
            />
          </ControlGroup>

          <ControlGroup label="Swatch count">
            <NumberStepper
              value={colors.length}
              onChange={setCount}
              min={2}
              max={10}
            />
          </ControlGroup>

          <ControlGroup label="Export format">
            <Segment
              value={exportFormat}
              onChange={setExportFormat}
              options={EXPORT_FORMATS}
              full
            />
          </ControlGroup>

          <ControlGroup>
            <Toggle
              checked={showAdjacentContrast}
              onChange={setShowAdjacentContrast}
              label="Show contrast"
              hint="Ratio between adjacent swatches"
            />
          </ControlGroup>

          <ControlGroup label="Actions">
            <div className="flex flex-col gap-2">
              <ToolActionButton onClick={shuffle} variant="solid">
                Shuffle (Space)
              </ToolActionButton>
              <ToolActionButton onClick={addColor} variant="outline">
                + Add color
              </ToolActionButton>
              <ToolActionButton
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
              >
                Extract from image
              </ToolActionButton>
              <ToolActionButton onClick={downloadPng} variant="ghost">
                Download PNG
              </ToolActionButton>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Generate harmonious palettes from a chosen color-theory rule. Press
            Space to shuffle, click a swatch to lock it, then export to your
            framework of choice.
          </p>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
              Made for
            </div>
            <p className="mt-1">Designers, brand teams, developers.</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
              Reach for it when
            </div>
            <ul className="mt-1 space-y-1 text-xs">
              <li>· Kicking off a new brand or side-project</li>
              <li>· Exploring accent colors around a primary brand color</li>
              <li>· Generating a neutral scale</li>
            </ul>
          </div>
        </div>
      }
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Controls</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Palette</button>
        </nav>
      )}
      <div className="flex h-full min-h-[60vh] flex-col gap-3">
        {/* Palette swatches */}
        {(!isMetro || metroCPivot === "output") && (<><div
          className="flex flex-1 min-h-[260px] flex-col overflow-hidden sm:flex-row"
          style={{
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          {colors.map((color, i) => {
            const isLight = luminance(color.hex) > 0.5;
            return (
              <div
                key={i}
                className="group relative flex flex-1 flex-col items-center justify-end p-3 transition-all"
                style={{ backgroundColor: color.hex, minHeight: 120 }}
              >
                {colors.length > 2 && (
                  <button
                    onClick={() => removeColor(i)}
                    className="absolute right-2 top-2 rounded-full bg-black/30 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title="Remove"
                    aria-label="Remove color"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 3l8 8M11 3l-8 8"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}

                {/* Lock indicator: always visible when locked */}
                <button
                  onClick={() => toggleLock(i)}
                  className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full text-sm transition-all ${
                    color.locked
                      ? "bg-white/95 text-gray-900 shadow"
                      : "bg-black/25 text-white opacity-0 group-hover:opacity-100"
                  }`}
                  aria-label={color.locked ? "Unlock color" : "Lock color"}
                  title={color.locked ? "Unlock" : "Lock"}
                >
                  {color.locked ? "\u{1F512}" : "\u{1F513}"}
                </button>

                <button
                  onClick={() => copyColor(i)}
                  className={`mb-2 rounded-md px-2 py-1 text-xs font-mono font-semibold tracking-wide transition-colors ${
                    isLight
                      ? "bg-black/15 text-gray-900 hover:bg-black/25"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  {copied === i ? "Copied!" : color.hex.toUpperCase()}
                </button>

                {(() => {
                  const [h, s, l] = hexToHsl(color.hex);
                  return (
                    <div
                      className="text-[10px] font-mono leading-tight text-center"
                      style={{
                        color: isLight ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.8)",
                      }}
                    >
                      <div>HSL {h} {s}% {l}%</div>
                    </div>
                  );
                })()}

                {/* Hidden color picker spanning the cell bottom */}
                <input
                  type="color"
                  value={color.hex}
                  onChange={(e) => updateColor(i, e.target.value)}
                  className="absolute bottom-0 left-0 h-6 w-full cursor-pointer opacity-0"
                  title="Pick color"
                  aria-label="Pick color"
                />
              </div>
            );
          })}
        </div>

        {/* Adjacent contrast strip */}
        {showAdjacentContrast && colors.length > 1 && (
          <div
            className="grid gap-1 px-1"
            style={{
              gridTemplateColumns: `repeat(${colors.length - 1}, minmax(0, 1fr))`,
            }}
          >
            {colors.slice(0, -1).map((c, i) => {
              const ratio = contrastRatio(c.hex, colors[i + 1].hex);
              const label =
                ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Lg" : "Low";
              const tone =
                ratio >= 4.5
                  ? "#16a34a"
                  : ratio >= 3
                    ? "#a16207"
                    : "#dc2626";
              return (
                <div
                  key={i}
                  className="flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-mono"
                  style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    color: "var(--kami-text-muted)",
                  }}
                  title={`Contrast between swatch ${i + 1} and ${i + 2}`}
                >
                  <span style={{ color: tone }}>●</span>
                  {ratio.toFixed(2)}:1 · {label}
                </div>
              );
            })}
          </div>
        )}
        </>)}

        {/* Export preview */}
        {(!isMetro || metroCPivot === "input") && <div
          className="overflow-hidden"
          style={{
            background: "var(--kami-overlay-bg, #111827)",
            color: "var(--kami-overlay-text, #f3f4f6)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            border: "1px solid var(--kami-border-strong)",
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2 text-xs font-mono uppercase tracking-wide"
            style={{
              borderBottom:
                "1px solid color-mix(in srgb, var(--kami-overlay-text, #f3f4f6) 12%, transparent)",
              color:
                "color-mix(in srgb, var(--kami-overlay-text, #f3f4f6) 70%, transparent)",
            }}
          >
            <span>{EXPORT_FORMATS.find((f) => f.value === exportFormat)?.label}</span>
            <button
              onClick={copyExport}
              className="px-2 py-0.5 text-[10px] uppercase tracking-wide"
              style={{
                border:
                  "1px solid color-mix(in srgb, var(--kami-overlay-text, #f3f4f6) 30%, transparent)",
                color: "var(--kami-overlay-text, #d1d5db)",
                borderRadius: "var(--kami-cta-radius, 0.25rem)",
              }}
            >
              {exportCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
            <code>{exportText}</code>
          </pre>
        </div>}
      </div>
    </ToolShell>
  );
}
