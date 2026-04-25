"use client";

import { useState, useMemo, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

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

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const ctaStyle = {
    background: "var(--kami-cta-bg)",
    color: "var(--kami-cta-text)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Box Shadow Generator"
          tagline="Stack multiple shadow layers for realistic depth - with presets modeled on Material, iOS, and Tailwind conventions."
          description="Drag the offset / blur / spread sliders on each layer. Stacking two shadows (a tight dark one and a loose soft one) is what makes UI shadows look real instead of cheap. Presets cover flat, Material 2-24, iOS, Tailwind sm-2xl, and inner shadow variants. Export as CSS, Tailwind, or React Native."
          audience={["Designers", "Front-end developers"]}
          whenToUse={[
            "Matching a design-system shadow token",
            "Adding believable depth to a card or button",
            "Exploring inner-shadow (pressed-button) effects",
          ]}
        />

        {/* Presets */}
        <div className="mb-6">
          <span className="text-xs font-medium mb-2 block" style={{ color: "var(--kami-text-muted)" }}>Presets</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="group flex items-center gap-2 px-3 py-2 text-sm transition"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  color: "var(--kami-text-muted)",
                }}
              >
                <div
                  className="h-6 w-6"
                  style={{
                    background: "#ffffff",
                    border: "1px solid var(--kami-border)",
                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                    boxShadow: preset.layers.map(layerToCSS).join(", "),
                  }}
                />
                <span>{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Preview */}
          <div
            className="p-8"
            style={{
              backgroundColor: bgColor,
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
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
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--kami-text-muted)" }}>
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
                <input type="range" min={80} max={320} value={cardSize} onChange={(e) => setCardSize(Number(e.target.value))} className="h-1.5 w-20 cursor-pointer appearance-none rounded-full" style={{ background: "var(--kami-border-strong)", accentColor: "var(--kami-text)" }} />
                <span className="font-mono w-8">{cardSize}</span>
              </label>
              <label className="flex items-center gap-1.5">
                Radius:
                <input type="range" min={0} max={100} value={cardRadius} onChange={(e) => setCardRadius(Number(e.target.value))} className="h-1.5 w-20 cursor-pointer appearance-none rounded-full" style={{ background: "var(--kami-border-strong)", accentColor: "var(--kami-text)" }} />
                <span className="font-mono w-8">{cardRadius}</span>
              </label>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {layers.map((layer, i) => (
              <div key={i} className="p-4" style={cardStyle}>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Layer {i + 1}</span>
                  <div className="flex items-center gap-1.5">
                    <label className="flex items-center gap-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                      <input
                        type="checkbox"
                        checked={layer.inset}
                        onChange={(e) => updateLayer(i, { inset: e.target.checked })}
                        style={{ accentColor: "var(--kami-text)" }}
                      />
                      Inset
                    </label>
                    {layers.length > 1 && (
                      <>
                        <button onClick={() => moveLayer(i, -1)} className="text-xs px-1" style={{ color: "var(--kami-text-dim)" }} title="Move up">↑</button>
                        <button onClick={() => moveLayer(i, 1)} className="text-xs px-1" style={{ color: "var(--kami-text-dim)" }} title="Move down">↓</button>
                      </>
                    )}
                    <button onClick={() => duplicateLayer(i)} className="text-xs px-1" style={{ color: "var(--kami-text-dim)" }} title="Duplicate">⧉</button>
                    {layers.length > 1 && (
                      <button onClick={() => removeLayer(i)} className="text-xs px-1" style={{ color: "var(--kami-text-dim)" }} title="Remove">×</button>
                    )}
                  </div>
                </div>
                <Slider label="X" value={layer.x} min={-50} max={50} onChange={(v) => updateLayer(i, { x: v })} />
                <Slider label="Y" value={layer.y} min={-50} max={50} onChange={(v) => updateLayer(i, { y: v })} />
                <Slider label="Blur" value={layer.blur} min={0} max={100} onChange={(v) => updateLayer(i, { blur: v })} />
                <Slider label="Spread" value={layer.spread} min={-50} max={50} onChange={(v) => updateLayer(i, { spread: v })} />
                <Slider label="Opacity" value={layer.opacity} min={0} max={100} suffix="%" onChange={(v) => updateLayer(i, { opacity: v })} />
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs" style={{ color: "var(--kami-text-muted)" }}>Color</label>
                  <input type="color" value={layer.color} onChange={(e) => updateLayer(i, { color: e.target.value })} className="h-7 w-7 cursor-pointer" style={{ border: "1px solid var(--kami-border-strong)", borderRadius: "var(--kami-cta-radius, 0.25rem)" }} />
                  <span className="text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>{layer.color}</span>
                </div>
              </div>
            ))}
            <button
              onClick={addLayer}
              className="w-full py-2 text-sm"
              style={{
                background: "var(--kami-surface-solid)",
                color: "var(--kami-text-muted)",
                border: "1px dashed var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              + Add Shadow Layer
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="mt-6 p-4" style={cardStyle}>
          <div className="mb-3 flex items-center justify-between">
            <div
              className="flex items-center gap-1 px-1 py-0.5"
              style={{
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              {(["css", "tailwind", "react-native"] as const).map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setOutputFormat(fmt)}
                  className="px-3 py-1 text-xs font-medium transition-colors"
                  style={{
                    background: outputFormat === fmt ? "var(--kami-cta-bg)" : "transparent",
                    color: outputFormat === fmt ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                  }}
                >
                  {fmt === "css" ? "CSS" : fmt === "tailwind" ? "Tailwind" : "React Native"}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium"
              style={ctaStyle}
            >
              {copied ? (
                <><CheckIcon /> Copied</>
              ) : (
                <><CopyIcon /> Copy</>
              )}
            </button>
          </div>
          <pre
            className="overflow-x-auto p-4 text-sm"
            style={{
              background: "var(--kami-overlay-bg, #0d1117)",
              color: "var(--kami-overlay-text, #f1f5f9)",
              borderRadius: "var(--kami-card-radius, 0.5rem)",
            }}
          ><code>{outputCode}</code></pre>
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
      <span className="w-14 text-xs" style={{ color: "var(--kami-text-muted)" }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
        style={{ background: "var(--kami-border-strong)", accentColor: "var(--kami-text)" }}
      />
      <span className="w-12 text-right text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>
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
