"use client";

import { useState, useMemo, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- Types ---

interface ShadowLayer {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  inset: boolean;
}

type OutputFormat = "css" | "tailwind" | "react-native";

interface Preset {
  name: string;
  layers: ShadowLayer[];
}

// --- Presets ---

const PRESETS: Preset[] = [
  {
    name: "Subtle",
    layers: [{ x: 0, y: 1, blur: 3, spread: 0, color: "#000000", opacity: 10, inset: false }],
  },
  {
    name: "Medium",
    layers: [{ x: 0, y: 4, blur: 6, spread: -1, color: "#000000", opacity: 10, inset: false }, { x: 0, y: 2, blur: 4, spread: -2, color: "#000000", opacity: 10, inset: false }],
  },
  {
    name: "Large",
    layers: [{ x: 0, y: 10, blur: 15, spread: -3, color: "#000000", opacity: 10, inset: false }, { x: 0, y: 4, blur: 6, spread: -4, color: "#000000", opacity: 10, inset: false }],
  },
  {
    name: "Elevated",
    layers: [{ x: 0, y: 20, blur: 25, spread: -5, color: "#000000", opacity: 10, inset: false }, { x: 0, y: 8, blur: 10, spread: -6, color: "#000000", opacity: 10, inset: false }],
  },
  {
    name: "Sharp",
    layers: [{ x: 4, y: 4, blur: 0, spread: 0, color: "#000000", opacity: 100, inset: false }],
  },
  {
    name: "Soft Glow",
    layers: [{ x: 0, y: 0, blur: 20, spread: 2, color: "#3b82f6", opacity: 30, inset: false }],
  },
  {
    name: "Neumorphism",
    layers: [
      { x: 6, y: 6, blur: 12, spread: 0, color: "#000000", opacity: 15, inset: false },
      { x: -6, y: -6, blur: 12, spread: 0, color: "#ffffff", opacity: 80, inset: false },
    ],
  },
  {
    name: "Inner",
    layers: [{ x: 0, y: 2, blur: 8, spread: 0, color: "#000000", opacity: 15, inset: true }],
  },
  {
    name: "Layered",
    layers: [
      { x: 0, y: 1, blur: 2, spread: 0, color: "#000000", opacity: 5, inset: false },
      { x: 0, y: 2, blur: 4, spread: 0, color: "#000000", opacity: 5, inset: false },
      { x: 0, y: 5, blur: 10, spread: 0, color: "#000000", opacity: 5, inset: false },
      { x: 0, y: 10, blur: 20, spread: 0, color: "#000000", opacity: 5, inset: false },
    ],
  },
  {
    name: "3D Button",
    layers: [
      { x: 0, y: 4, blur: 0, spread: 0, color: "#000000", opacity: 25, inset: false },
      { x: 0, y: -2, blur: 4, spread: 0, color: "#ffffff", opacity: 20, inset: true },
    ],
  },
  {
    name: "Material",
    layers: [
      { x: 0, y: 3, blur: 5, spread: -1, color: "#000000", opacity: 20, inset: false },
      { x: 0, y: 6, blur: 10, spread: 0, color: "#000000", opacity: 14, inset: false },
      { x: 0, y: 1, blur: 18, spread: 0, color: "#000000", opacity: 12, inset: false },
    ],
  },
  {
    name: "Neon",
    layers: [
      { x: 0, y: 0, blur: 10, spread: 0, color: "#ff00ff", opacity: 50, inset: false },
      { x: 0, y: 0, blur: 40, spread: 0, color: "#ff00ff", opacity: 30, inset: false },
    ],
  },
];

const DEFAULT_LAYER: ShadowLayer = {
  x: 4,
  y: 4,
  blur: 10,
  spread: 0,
  color: "#000000",
  opacity: 25,
  inset: false,
};

// --- Helpers ---

function layerToCSS(l: ShadowLayer): string {
  const r = parseInt(l.color.slice(1, 3), 16);
  const g = parseInt(l.color.slice(3, 5), 16);
  const b = parseInt(l.color.slice(5, 7), 16);
  const a = (l.opacity / 100).toFixed(2);
  return `${l.inset ? "inset " : ""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgba(${r}, ${g}, ${b}, ${a})`;
}

function layersToTailwind(layers: ShadowLayer[]): string {
  // Map to closest Tailwind shadow class
  if (layers.length === 1 && !layers[0].inset) {
    const l = layers[0];
    if (l.blur === 0 && l.spread === 0) return "shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]";
    if (l.blur <= 2 && l.opacity <= 15) return "shadow-sm";
    if (l.blur <= 6 && l.opacity <= 15) return "shadow";
    if (l.blur <= 15 && l.opacity <= 15) return "shadow-md";
    if (l.blur <= 25 && l.opacity <= 15) return "shadow-lg";
    if (l.blur <= 50) return "shadow-xl";
    return "shadow-2xl";
  }
  // Custom arbitrary value
  const val = layers.map(layerToCSS).join(",_");
  return `shadow-[${val.replace(/\s+/g, "_")}]`;
}

function layersToReactNative(layers: ShadowLayer[]): string {
  const l = layers[0]; // RN only supports single shadow
  const r = parseInt(l.color.slice(1, 3), 16);
  const g = parseInt(l.color.slice(3, 5), 16);
  const b = parseInt(l.color.slice(5, 7), 16);
  return `shadowColor: "${l.color}",
shadowOffset: { width: ${l.x}, height: ${l.y} },
shadowOpacity: ${(l.opacity / 100).toFixed(2)},
shadowRadius: ${l.blur},
elevation: ${Math.max(1, Math.round(l.blur / 2))},`;
}

// --- Main ---

export default function BoxShadowContent() {
  const [layers, setLayers] = useState<ShadowLayer[]>([{ ...DEFAULT_LAYER }]);
  const [copied, setCopied] = useState(false);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [cardColor, setCardColor] = useState("#ffffff");
  const [cardRadius, setCardRadius] = useState(16);
  const [cardSize, setCardSize] = useState(192);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("css");

  const cssValue = layers.map(layerToCSS).join(",\n    ");
  const fullCSS = `box-shadow: ${cssValue};`;

  const outputCode = useMemo(() => {
    switch (outputFormat) {
      case "css": return fullCSS;
      case "tailwind": return `className="${layersToTailwind(layers)}"`;
      case "react-native": return layersToReactNative(layers);
    }
  }, [outputFormat, layers, fullCSS]);

  const updateLayer = useCallback((index: number, updates: Partial<ShadowLayer>) => {
    setLayers((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates } : l)),
    );
  }, []);

  const addLayer = useCallback(() => {
    setLayers((prev) => [...prev, { ...DEFAULT_LAYER, y: (prev.length + 1) * 4 }]);
  }, []);

  const removeLayer = useCallback((index: number) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((_, i) => i !== index));
  }, [layers.length]);

  const duplicateLayer = useCallback((index: number) => {
    setLayers((prev) => {
      const copy = { ...prev[index] };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }, []);

  const moveLayer = useCallback((index: number, dir: -1 | 1) => {
    setLayers((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setLayers(preset.layers.map((l) => ({ ...l })));
  }, []);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [outputCode]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: copy, label: "Copy" },
  ], [copy]));

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Box Shadow Generator</h1>
          <p className="mt-2 text-gray-500">Multi-layer shadows with presets. CSS, Tailwind, and React Native output.</p>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <span className="text-xs font-medium text-gray-500 mb-2 block">Presets</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="group flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm hover:border-gray-300 hover:shadow-sm transition"
              >
                <div
                  className="h-6 w-6 rounded bg-white border border-gray-100"
                  style={{ boxShadow: preset.layers.map(layerToCSS).join(", ") }}
                />
                <span className="text-gray-600 group-hover:text-gray-900">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Preview */}
          <div className="rounded-xl border border-gray-200 p-8 shadow-sm" style={{ backgroundColor: bgColor }}>
            <div className="flex min-h-[300px] items-center justify-center">
              <div
                style={{
                  width: cardSize,
                  height: cardSize,
                  backgroundColor: cardColor,
                  boxShadow: layers.map(layerToCSS).join(", "),
                  borderRadius: cardRadius,
                }}
              />
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <label className="flex items-center gap-1.5">
                BG:
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-6 w-6 cursor-pointer rounded" />
              </label>
              <label className="flex items-center gap-1.5">
                Card:
                <input type="color" value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="h-6 w-6 cursor-pointer rounded" />
              </label>
              <label className="flex items-center gap-1.5">
                Size:
                <input type="range" min={80} max={320} value={cardSize} onChange={(e) => setCardSize(Number(e.target.value))} className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700" />
                <span className="font-mono w-8">{cardSize}</span>
              </label>
              <label className="flex items-center gap-1.5">
                Radius:
                <input type="range" min={0} max={100} value={cardRadius} onChange={(e) => setCardRadius(Number(e.target.value))} className="h-1.5 w-20 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700" />
                <span className="font-mono w-8">{cardRadius}</span>
              </label>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {layers.map((layer, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Layer {i + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 text-xs text-gray-500">
                      <input
                        type="checkbox"
                        checked={layer.inset}
                        onChange={(e) => updateLayer(i, { inset: e.target.checked })}
                        className="rounded"
                      />
                      Inset
                    </label>
                    {layers.length > 1 && (
                      <>
                        <button onClick={() => moveLayer(i, -1)} className="text-xs text-gray-400 hover:text-gray-600 px-1" title="Move up">↑</button>
                        <button onClick={() => moveLayer(i, 1)} className="text-xs text-gray-400 hover:text-gray-600 px-1" title="Move down">↓</button>
                      </>
                    )}
                    <button onClick={() => duplicateLayer(i)} className="text-xs text-gray-400 hover:text-gray-600 px-1" title="Duplicate">⧉</button>
                    {layers.length > 1 && (
                      <button onClick={() => removeLayer(i)} className="text-xs text-gray-400 hover:text-red-500 px-1" title="Remove">×</button>
                    )}
                  </div>
                </div>
                <Slider label="X" value={layer.x} min={-50} max={50} onChange={(v) => updateLayer(i, { x: v })} />
                <Slider label="Y" value={layer.y} min={-50} max={50} onChange={(v) => updateLayer(i, { y: v })} />
                <Slider label="Blur" value={layer.blur} min={0} max={100} onChange={(v) => updateLayer(i, { blur: v })} />
                <Slider label="Spread" value={layer.spread} min={-50} max={50} onChange={(v) => updateLayer(i, { spread: v })} />
                <Slider label="Opacity" value={layer.opacity} min={0} max={100} suffix="%" onChange={(v) => updateLayer(i, { opacity: v })} />
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs text-gray-500">Color</label>
                  <input type="color" value={layer.color} onChange={(e) => updateLayer(i, { color: e.target.value })} className="h-7 w-7 cursor-pointer rounded border border-gray-200" />
                  <span className="text-xs font-mono text-gray-400">{layer.color}</span>
                </div>
              </div>
            ))}
            <button
              onClick={addLayer}
              className="w-full rounded-lg border border-dashed border-gray-300 bg-white py-2 text-sm text-gray-500 hover:border-gray-400 hover:bg-gray-50"
            >
              + Add Shadow Layer
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 px-1 py-0.5">
              {(["css", "tailwind", "react-native"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                    outputFormat === fmt ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {fmt === "css" ? "CSS" : fmt === "tailwind" ? "Tailwind" : "React Native"}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
            >
              {copied ? (
                <><CheckIcon /> Copied</>
              ) : (
                <><CopyIcon /> Copy</>
              )}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100"><code>{outputCode}</code></pre>
        </div>
      </div>
    </div>
  );
}

// --- Slider ---

function Slider({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-14 text-xs text-gray-500">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
      />
      <span className="w-12 text-right text-xs font-mono text-gray-400">
        {value}{suffix || "px"}
      </span>
    </div>
  );
}

// --- Icons ---

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
