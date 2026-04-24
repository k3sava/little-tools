"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

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

type ExportFormat = "css" | "scss" | "tailwind" | "json";

const EXPORT_FORMATS: { id: ExportFormat; label: string }[] = [
  { id: "css", label: "CSS Variables" },
  { id: "scss", label: "SCSS" },
  { id: "tailwind", label: "Tailwind" },
  { id: "json", label: "JSON" },
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
  const [showExport, setShowExport] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
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
    }
  })();

  const luminance = (hex: string) => {
    const [r, g, b] = hexToRgb(hex).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  if (!mounted) {
    return (
      <div className="min-h-screen text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Color Palette Generator
          </h1>
          <p className="mt-2 text-gray-500">
            Generate color palettes with harmony modes. Press{" "}
            <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs">Space</kbd>{" "}
            to shuffle. Lock colors you like.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Color Palette Generator"
          tagline="Generate 5-color palettes using color-harmony rules — analogous, complementary, triadic, tetradic, and more."
          description={`Press spacebar to shuffle a fresh palette. Lock the colors you want to keep and reshuffle the rest. Every palette is built from a harmony rule (not just random) so the colors actually work together. Export as CSS variables, SCSS, Tailwind config, or a Figma-ready JSON.`}
          audience={["Designers", "Brand teams", "Developers"]}
          whenToUse={[
            "Kicking off a new brand or side-project",
            "Exploring accent colors around a primary brand color",
            "Generating a neutral scale to pair with a brand color",
          ]}
        />
        <p className="mt-4 text-xs text-gray-500">
          Tip: press{" "}
          <kbd className="rounded border border-gray-300 bg-gray-100 px-1.5 py-0.5 text-xs">Space</kbd>{" "}
          to shuffle. Click a swatch to lock it.
        </p>

        {/* Controls */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <select
            value={harmony}
            onChange={(e) => setHarmony(e.target.value as HarmonyMode)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
          >
            <option value="random">Random</option>
            <option value="complementary">Complementary</option>
            <option value="analogous">Analogous</option>
            <option value="triadic">Triadic</option>
            <option value="split-complementary">Split-Complementary</option>
            <option value="tetradic">Tetradic</option>
          </select>
          <button
            onClick={shuffle}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Shuffle
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            From Image
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <button
            onClick={addColor}
            disabled={colors.length >= 10}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-40"
          >
            + Add Color
          </button>
        </div>

        {/* Palette Display */}
        <div className="mt-6 flex overflow-hidden rounded-xl border border-gray-200 shadow-sm">
          {colors.map((color, i) => (
            <div
              key={i}
              className="group relative flex min-h-[220px] flex-1 flex-col items-center justify-end transition-all"
              style={{ backgroundColor: color.hex }}
            >
              {/* Remove button */}
              {colors.length > 2 && (
                <button
                  onClick={() => removeColor(i)}
                  className="absolute right-2 top-2 rounded-full bg-black/20 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Remove"
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

              {/* Lock button */}
              <button
                onClick={() => toggleLock(i)}
                className={`mb-2 rounded-full p-2 transition-all ${
                  color.locked
                    ? "bg-white/90 text-gray-800"
                    : "bg-black/20 text-white opacity-0 group-hover:opacity-100"
                }`}
                title={color.locked ? "Unlock" : "Lock"}
              >
                {color.locked ? "🔒" : "🔓"}
              </button>

              {/* Hex value */}
              <button
                onClick={() => copyColor(i)}
                className={`mb-3 rounded px-2 py-1 text-xs font-mono font-medium transition-colors ${
                  luminance(color.hex) > 0.5
                    ? "text-gray-800 bg-black/10 hover:bg-black/20"
                    : "text-white bg-white/20 hover:bg-white/30"
                }`}
              >
                {copied === i ? "Copied!" : color.hex.toUpperCase()}
              </button>

              {/* Color picker (hidden, triggered by swatch) */}
              <input
                type="color"
                value={color.hex}
                onChange={(e) => updateColor(i, e.target.value)}
                className="absolute bottom-0 left-0 h-6 w-full cursor-pointer opacity-0"
                title="Pick color"
              />
            </div>
          ))}
        </div>

        {/* Color details row */}
        <div className="mt-3 flex gap-1">
          {colors.map((color, i) => {
            const [h, s, l] = hexToHsl(color.hex);
            const [r, g, b] = hexToRgb(color.hex);
            return (
              <div
                key={i}
                className="flex-1 text-center text-[10px] text-gray-400 leading-tight"
              >
                <div>
                  RGB({r},{g},{b})
                </div>
                <div>
                  HSL({h},{s}%,{l}%)
                </div>
              </div>
            );
          })}
        </div>

        {/* Cross-link */}
        <div className="mt-4 text-sm text-gray-400">
          Need to convert individual colors?{" "}
          <a
            href="/contrast"
            className="text-gray-600 underline hover:text-gray-800"
          >
            Contrast Checker
          </a>
        </div>

        {/* Export */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <button
            onClick={() => setShowExport(!showExport)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="text-lg font-semibold">Export</h2>
            <span className="text-sm text-gray-400">
              {showExport ? "▲ Hide" : "▼ Show"}
            </span>
          </button>
          {showExport && (
            <div className="mt-4">
              <div className="mb-3 flex gap-2">
                {EXPORT_FORMATS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setExportFormat(f.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm ${
                      exportFormat === f.id
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                  <code>{exportText}</code>
                </pre>
                <button
                  onClick={() => navigator.clipboard.writeText(exportText)}
                  className="absolute right-3 top-3 rounded border border-gray-600 px-2 py-1 text-xs text-gray-300 hover:bg-gray-800"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PNG swatch export */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
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
            }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-100"
          >
            Download PNG Swatch
          </button>
        </div>
      </div>
    </div>
  );
}
