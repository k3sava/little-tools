"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Types ---

type GradientType = "linear" | "radial" | "conic";
type RadialShape = "circle" | "ellipse";
type RadialPosition = "center" | "top" | "bottom" | "left" | "right" | "custom";
type ColorFormat = "hex" | "rgb" | "hsl";
type OutputTab = "css" | "tailwind" | "scss" | "custom-property";

interface ColorStop {
  color: string;
  position: number;
}

interface GradientLayer {
  type: GradientType;
  angle: number;
  stops: ColorStop[];
  repeating: boolean;
  radialShape: RadialShape;
  radialPosition: RadialPosition;
  radialCustomX: number;
  radialCustomY: number;
}

interface Preset {
  name: string;
  category: string;
  stops: ColorStop[];
  type: GradientType;
  angle: number;
}

// --- Presets ---

const PRESETS: Preset[] = [
  // Warm
  { name: "Sunset", category: "Warm", stops: [{ color: "#ff6b6b", position: 0 }, { color: "#feca57", position: 100 }], type: "linear", angle: 135 },
  { name: "Fire", category: "Warm", stops: [{ color: "#f12711", position: 0 }, { color: "#f5af19", position: 100 }], type: "linear", angle: 135 },
  { name: "Peach", category: "Warm", stops: [{ color: "#ffecd2", position: 0 }, { color: "#fcb69f", position: 100 }], type: "linear", angle: 135 },
  { name: "Coral", category: "Warm", stops: [{ color: "#ff9a9e", position: 0 }, { color: "#fad0c4", position: 100 }], type: "linear", angle: 90 },
  { name: "Golden Hour", category: "Warm", stops: [{ color: "#f093fb", position: 0 }, { color: "#f5576c", position: 50 }, { color: "#ffd452", position: 100 }], type: "linear", angle: 45 },
  // Cool
  { name: "Ocean", category: "Cool", stops: [{ color: "#667eea", position: 0 }, { color: "#764ba2", position: 100 }], type: "linear", angle: 135 },
  { name: "Arctic", category: "Cool", stops: [{ color: "#e0eafc", position: 0 }, { color: "#cfdef3", position: 100 }], type: "linear", angle: 180 },
  { name: "Twilight", category: "Cool", stops: [{ color: "#0f0c29", position: 0 }, { color: "#302b63", position: 50 }, { color: "#24243e", position: 100 }], type: "linear", angle: 135 },
  { name: "Deep Sea", category: "Cool", stops: [{ color: "#1a2980", position: 0 }, { color: "#26d0ce", position: 100 }], type: "linear", angle: 180 },
  { name: "Lavender", category: "Cool", stops: [{ color: "#c9d6ff", position: 0 }, { color: "#e2e2e2", position: 100 }], type: "linear", angle: 135 },
  // Nature
  { name: "Forest", category: "Nature", stops: [{ color: "#11998e", position: 0 }, { color: "#38ef7d", position: 100 }], type: "linear", angle: 135 },
  { name: "Earth", category: "Nature", stops: [{ color: "#8b6914", position: 0 }, { color: "#dab96f", position: 50 }, { color: "#6b8f3c", position: 100 }], type: "linear", angle: 135 },
  { name: "Sky", category: "Nature", stops: [{ color: "#56ccf2", position: 0 }, { color: "#2f80ed", position: 100 }], type: "linear", angle: 180 },
  { name: "Aurora", category: "Nature", stops: [{ color: "#a8edea", position: 0 }, { color: "#fed6e3", position: 50 }, { color: "#d299c2", position: 100 }], type: "linear", angle: 45 },
  // Bold
  { name: "Neon", category: "Bold", stops: [{ color: "#00f260", position: 0 }, { color: "#0575e6", position: 100 }], type: "linear", angle: 90 },
  { name: "Berry", category: "Bold", stops: [{ color: "#8e2de2", position: 0 }, { color: "#4a00e0", position: 100 }], type: "linear", angle: 135 },
  { name: "Electric", category: "Bold", stops: [{ color: "#fc00ff", position: 0 }, { color: "#00dbde", position: 100 }], type: "linear", angle: 90 },
  { name: "Cyberpunk", category: "Bold", stops: [{ color: "#f72585", position: 0 }, { color: "#7209b7", position: 40 }, { color: "#3a0ca3", position: 70 }, { color: "#4cc9f0", position: 100 }], type: "linear", angle: 135 },
  // Neutral
  { name: "Smoke", category: "Neutral", stops: [{ color: "#f5f5f5", position: 0 }, { color: "#d9d9d9", position: 100 }], type: "linear", angle: 180 },
  { name: "Silver", category: "Neutral", stops: [{ color: "#bdc3c7", position: 0 }, { color: "#2c3e50", position: 100 }], type: "linear", angle: 135 },
  { name: "Slate", category: "Neutral", stops: [{ color: "#333333", position: 0 }, { color: "#666666", position: 50 }, { color: "#999999", position: 100 }], type: "linear", angle: 180 },
];

const PRESET_CATEGORIES = ["Warm", "Cool", "Nature", "Bold", "Neutral"];

// --- Color conversion helpers ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
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

function formatColor(hex: string, format: ColorFormat): string {
  if (format === "hex") return hex;
  const [r, g, b] = hexToRgb(hex);
  if (format === "rgb") return `rgb(${r}, ${g}, ${b})`;
  const [h, s, l] = rgbToHsl(r, g, b);
  return `hsl(${h}, ${s}%, ${l}%)`;
}

// --- CSS builders ---

function buildRadialPrefix(shape: RadialShape, position: RadialPosition, cx: number, cy: number): string {
  const posMap: Record<string, string> = { center: "at center", top: "at center top", bottom: "at center bottom", left: "at left center", right: "at right center", custom: `at ${cx}% ${cy}%` };
  return `${shape} ${posMap[position]}`;
}

function buildLayerCSS(layer: GradientLayer, colorFmt: ColorFormat): string {
  const sorted = [...layer.stops].sort((a, b) => a.position - b.position);
  const stopsStr = sorted.map((s) => `${formatColor(s.color, colorFmt)} ${s.position}%`).join(", ");
  const rep = layer.repeating ? "repeating-" : "";
  switch (layer.type) {
    case "linear":
      return `${rep}linear-gradient(${layer.angle}deg, ${stopsStr})`;
    case "radial": {
      const prefix = buildRadialPrefix(layer.radialShape, layer.radialPosition, layer.radialCustomX, layer.radialCustomY);
      return `${rep}radial-gradient(${prefix}, ${stopsStr})`;
    }
    case "conic":
      return `${rep}conic-gradient(from ${layer.angle}deg, ${stopsStr})`;
  }
}

function buildFullCSS(layers: GradientLayer[], colorFmt: ColorFormat): string {
  return layers.map((l) => buildLayerCSS(l, colorFmt)).join(", ");
}

function defaultLayer(): GradientLayer {
  return { type: "linear", angle: 135, stops: [{ color: "#667eea", position: 0 }, { color: "#764ba2", position: 100 }], repeating: false, radialShape: "circle", radialPosition: "center", radialCustomX: 50, radialCustomY: 50 };
}

// --- Random gradient ---

function randomHex(): string {
  return "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");
}

function randomGradient(): GradientLayer {
  const count = 2 + Math.floor(Math.random() * 2);
  const stops: ColorStop[] = [];
  for (let i = 0; i < count; i++) stops.push({ color: randomHex(), position: Math.round((i / (count - 1)) * 100) });
  return { ...defaultLayer(), angle: Math.round(Math.random() * 360), stops };
}

// --- CSS parser ---

function parseGradientCSS(input: string): GradientLayer | null {
  const trimmed = input.replace(/^background\s*:\s*/, "").replace(/;$/, "").trim();
  const match = trimmed.match(/^(repeating-)?(linear|radial|conic)-gradient\(([\s\S]+)\)$/);
  if (!match) return null;
  const repeating = !!match[1];
  const type = match[2] as GradientType;
  const inner = match[3];

  const layer = defaultLayer();
  layer.type = type;
  layer.repeating = repeating;

  // Split on commas not inside parens
  const parts: string[] = [];
  let depth = 0, buf = "";
  for (const ch of inner) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) { parts.push(buf.trim()); buf = ""; }
    else buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());

  let stopStart = 0;
  if (type === "linear") {
    const angleMatch = parts[0]?.match(/^(\d+)deg$/);
    if (angleMatch) { layer.angle = parseInt(angleMatch[1]); stopStart = 1; }
  } else if (type === "conic") {
    const fromMatch = parts[0]?.match(/^from\s+(\d+)deg$/);
    if (fromMatch) { layer.angle = parseInt(fromMatch[1]); stopStart = 1; }
  } else if (type === "radial") {
    if (parts[0] && !parts[0].match(/^(#|rgb|hsl)/)) { stopStart = 1; }
  }

  const stops: ColorStop[] = [];
  for (let i = stopStart; i < parts.length; i++) {
    const s = parts[i].trim();
    const colorMatch = s.match(/^(#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|hsl\([^)]+\))\s*(\d+)?%?$/);
    if (colorMatch) {
      let hex = colorMatch[1];
      if (hex.startsWith("rgb")) {
        const nums = hex.match(/\d+/g);
        if (nums && nums.length >= 3) hex = "#" + nums.slice(0, 3).map((n) => parseInt(n).toString(16).padStart(2, "0")).join("");
      } else if (hex.startsWith("hsl")) {
        hex = "#888888"; // approximate fallback
      }
      if (hex.length === 4) hex = "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
      stops.push({ color: hex.slice(0, 7), position: colorMatch[2] ? parseInt(colorMatch[2]) : Math.round((i - stopStart) / Math.max(parts.length - stopStart - 1, 1) * 100) });
    }
  }
  if (stops.length < 2) return null;
  layer.stops = stops;
  return layer;
}

// --- Tailwind approximation ---

function closestTailwindColor(hex: string): string {
  // Return the hex as arbitrary value since exact matching is complex
  return `[${hex}]`;
}

function buildTailwind(layers: GradientLayer[]): string {
  if (layers.length !== 1 || layers[0].type !== "linear" || layers[0].repeating) {
    return `bg-[${buildFullCSS(layers, "hex").replace(/\s/g, "_")}]`;
  }
  const l = layers[0];
  const sorted = [...l.stops].sort((a, b) => a.position - b.position);
  const dirMap: Record<number, string> = { 0: "t", 45: "tr", 90: "r", 135: "br", 180: "b", 225: "bl", 270: "l", 315: "tl" };
  const dir = dirMap[l.angle] || `[${l.angle}deg]`;
  const from = `from-${closestTailwindColor(sorted[0].color)}`;
  const to = `to-${closestTailwindColor(sorted[sorted.length - 1].color)}`;
  const via = sorted.length === 3 ? ` via-${closestTailwindColor(sorted[1].color)}` : "";
  return `bg-gradient-to-${dir} ${from}${via} ${to}`;
}

// --- Component ---

export default function GradientContent() {
  const [layers, setLayers] = useState<GradientLayer[]>([defaultLayer()]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [outputTab, setOutputTab] = useState<OutputTab>("css");
  const [colorFormat, setColorFormat] = useState<ColorFormat>("hex");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);
  const angleWheelRef = useRef<HTMLDivElement>(null);

  const layer = layers[activeLayer] || defaultLayer();

  const gradient = useMemo(() => buildFullCSS(layers, colorFormat), [layers, colorFormat]);
  const cssOutput = useMemo(() => `background: ${gradient};`, [gradient]);
  const tailwindOutput = useMemo(() => buildTailwind(layers), [layers]);
  const scssOutput = useMemo(() => `$gradient: ${gradient};`, [gradient]);
  const customPropOutput = useMemo(() => `--gradient: ${gradient};`, [gradient]);

  const outputMap: Record<OutputTab, string> = { css: cssOutput, tailwind: tailwindOutput, scss: scssOutput, "custom-property": customPropOutput };

  const updateLayer = (index: number, updates: Partial<GradientLayer>) => {
    setLayers((prev) => prev.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  };

  const updateStop = (stopIndex: number, updates: Partial<ColorStop>) => {
    const newStops = layer.stops.map((s, i) => (i === stopIndex ? { ...s, ...updates } : s));
    updateLayer(activeLayer, { stops: newStops });
  };

  const addStop = () => {
    const sorted = [...layer.stops].sort((a, b) => a.position - b.position);
    const mid = sorted.length > 1 ? Math.round((sorted[sorted.length - 2].position + sorted[sorted.length - 1].position) / 2) : 50;
    updateLayer(activeLayer, { stops: [...layer.stops, { color: "#888888", position: mid }] });
  };

  const removeStop = (index: number) => {
    if (layer.stops.length <= 2) return;
    updateLayer(activeLayer, { stops: layer.stops.filter((_, i) => i !== index) });
  };

  const addLayer = () => {
    const nl = defaultLayer();
    nl.stops = [{ color: "#ffffff", position: 0 }, { color: "#000000", position: 100 }];
    nl.angle = 45;
    setLayers((prev) => [...prev, nl]);
    setActiveLayer(layers.length);
  };

  const removeLayer = (index: number) => {
    if (layers.length <= 1) return;
    setLayers((prev) => prev.filter((_, i) => i !== index));
    setActiveLayer((prev) => Math.min(prev, layers.length - 2));
  };

  const applyPreset = (preset: Preset) => {
    updateLayer(activeLayer, { stops: preset.stops.map((s) => ({ ...s })), type: preset.type, angle: preset.angle, repeating: false });
  };

  const applyRandom = () => {
    const rl = randomGradient();
    updateLayer(activeLayer, { ...rl });
  };

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1200);
  };

  const handleImport = () => {
    const parsed = parseGradientCSS(importText);
    if (!parsed) { setImportError("Could not parse gradient. Paste a valid CSS gradient value."); return; }
    setImportError("");
    setLayers([parsed]);
    setActiveLayer(0);
    setImportText("");
  };

  const handleAngleWheel = (e: React.MouseEvent<HTMLDivElement>) => {
    if (layer.type === "radial") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
    const deg = Math.round(((rad * 180) / Math.PI + 90 + 360) % 360);
    updateLayer(activeLayer, { angle: deg });
  };

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (layer.type === "radial") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const rad = Math.atan2(e.clientY - cy, e.clientX - cx);
    const deg = Math.round(((rad * 180) / Math.PI + 90 + 360) % 360);
    updateLayer(activeLayer, { angle: deg });
  };

  const copyCSS = useCallback(() => { copy(cssOutput, "css"); }, [cssOutput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: copyCSS, label: "Copy CSS" },
    { key: "f", meta: true, shift: true, action: () => setFullscreen((v) => !v), label: "Fullscreen" },
  ], [copyCSS]));

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 cursor-pointer" style={{ background: gradient }} onClick={() => setFullscreen(false)}>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white backdrop-blur">
          Click anywhere or press <kbd className="mx-1 rounded border border-white/30 px-1.5 py-0.5 text-xs">Esc</kbd> to exit
        </div>
      </div>
    );
  }

  const sortedStops = [...layer.stops].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Gradient Generator"
          tagline="Design linear, radial, or conic CSS gradients with multiple color stops and layered gradients - with copy-ready CSS."
          description="Drag color stops on a linear / radial / conic gradient preview. Add multiple layers for richer effects. Presets cover the popular &quot;mesh&quot; and &quot;aurora&quot; looks. Copy output as plain CSS (background-image) or Tailwind class. Fullscreen mode lets you eyeball the gradient at real size before shipping."
          audience={["Designers", "Front-end developers"]}
          whenToUse={[
            "Building a hero-section background",
            "Designing a button with a subtle color sweep",
            "Prototyping a brand-compliant aurora / mesh gradient",
          ]}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={applyRandom}
            className="px-3 py-2 text-sm"
            style={{
              background: "var(--kami-surface)",
              color: "var(--kami-text-muted)",
              borderRadius: "var(--kami-cta-radius, 0.5rem)",
            }}
          >Random</button>
          <button
            onClick={() => setFullscreen(true)}
            className="px-3 py-2 text-sm"
            style={{
              background: "var(--kami-cta-bg, #111827)",
              color: "var(--kami-cta-text, #ffffff)",
              borderRadius: "var(--kami-cta-radius, 0.5rem)",
            }}
          >Fullscreen</button>
        </div>

        {/* Preset Gallery */}
        <div
          className="mt-6 p-4"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <h2 className="mb-3 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Presets</h2>
          {PRESET_CATEGORIES.map((cat) => (
            <div key={cat} className="mb-3 last:mb-0">
              <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>{cat}</span>
              <div className="flex flex-wrap gap-2">
                {PRESETS.filter((p) => p.category === cat).map((p) => (
                  <button key={p.name} onClick={() => applyPreset(p)} className="group flex flex-col items-center gap-1">
                    <div
                      className="h-10 w-16 transition-transform group-hover:scale-105"
                      style={{
                        background: buildLayerCSS({ ...defaultLayer(), stops: p.stops, type: p.type, angle: p.angle }, "hex"),
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-card-radius, 0.5rem)",
                      }}
                    />
                    <span className="text-[10px]" style={{ color: "var(--kami-text-dim)" }}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Left column */}
          <div className="space-y-4">
            {/* Preview */}
            <div
              ref={previewRef}
              className="cursor-crosshair overflow-hidden"
              style={{
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
              onClick={handlePreviewClick}
              title={layer.type !== "radial" ? "Click to set angle" : ""}
            >
              <div className="min-h-[340px]" style={{ background: gradient }} />
            </div>

            {/* Gradient Strip */}
            <div
              className="p-4"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Color Ramp</h2>
              <div
                className="relative h-8 w-full overflow-hidden"
                style={{
                  background: buildLayerCSS({ ...layer, type: "linear", angle: 90, repeating: false }, colorFormat),
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.5rem)",
                }}
              >
                {sortedStops.map((s, i) => (
                  <div key={i} className="absolute top-0 h-full w-0.5 bg-white/80" style={{ left: `${s.position}%` }}>
                    <div className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white shadow" style={{ background: s.color }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Import */}
            <div
              className="p-4"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Import CSS Gradient</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={importText}
                  onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
                  placeholder="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: "var(--kami-input-bg, var(--kami-surface-solid))",
                    color: "var(--kami-text)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-input-radius, 0.5rem)",
                  }}
                />
                <button
                  onClick={handleImport}
                  className="px-3 py-2 text-sm"
                  style={{
                    background: "var(--kami-cta-bg, #111827)",
                    color: "var(--kami-cta-text, #ffffff)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  }}
                >Parse</button>
              </div>
              {importError && (
                <p
                  className="mt-1.5 text-xs"
                  style={{ color: "var(--kami-accent, #ef4444)" }}
                >{importError}</p>
              )}
            </div>

            {/* Multi-format Output */}
            <div
              className="p-4"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {(["css", "tailwind", "scss", "custom-property"] as OutputTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setOutputTab(tab)}
                      className="px-2.5 py-1 text-xs font-medium capitalize"
                      style={
                        outputTab === tab
                          ? {
                              background: "var(--kami-cta-bg, #111827)",
                              color: "var(--kami-cta-text, #ffffff)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                          : {
                              color: "var(--kami-text-muted)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                      }
                    >
                      {tab === "custom-property" ? "CSS Var" : tab.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => copy(outputMap[outputTab], "output")}
                  className="flex items-center gap-1 px-2 py-1 text-xs"
                  style={{
                    border: "1px solid var(--kami-border-strong)",
                    color: "var(--kami-text-muted)",
                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                  }}
                >
                  {copiedKey === "output" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                </button>
              </div>
              <pre
                className="overflow-x-auto p-4 text-sm"
                style={{
                  background: "var(--kami-overlay-bg, #111827)",
                  color: "var(--kami-overlay-text, #f3f4f6)",
                  borderRadius: "var(--kami-card-radius, 0.5rem)",
                }}
              ><code>{outputMap[outputTab]}</code></pre>
            </div>
          </div>

          {/* Right column - Controls */}
          <div className="space-y-4">
            {/* Layers */}
            <div
              className="p-4"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Layers</h2>
                <button onClick={addLayer} className="text-xs" style={{ color: "var(--kami-text-muted)" }}>+ Add</button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {layers.map((l, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <button
                      onClick={() => setActiveLayer(i)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
                      style={
                        activeLayer === i
                          ? {
                              background: "var(--kami-cta-bg, #111827)",
                              color: "var(--kami-cta-text, #ffffff)",
                              border: "1px solid var(--kami-cta-bg, #111827)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                          : {
                              color: "var(--kami-text-muted)",
                              border: "1px solid var(--kami-border-strong)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                      }
                    >
                      <span className="inline-block h-3 w-5 rounded" style={{ background: buildLayerCSS(l, "hex") }} />
                      {i + 1}
                    </button>
                    {layers.length > 1 && (
                      <button
                        onClick={() => removeLayer(i)}
                        className="text-[10px]"
                        style={{ color: "var(--kami-text-dim)" }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Type + Repeating */}
            <div
              className="p-4"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <label className="mb-2 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Type</label>
              <div className="flex gap-2">
                {(["linear", "radial", "conic"] as GradientType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateLayer(activeLayer, { type: t })}
                    className="px-3 py-1.5 text-sm capitalize"
                    style={
                      layer.type === t
                        ? {
                            background: "var(--kami-cta-bg, #111827)",
                            color: "var(--kami-cta-text, #ffffff)",
                            borderRadius: "var(--kami-cta-radius, 0.5rem)",
                          }
                        : {
                            background: "var(--kami-surface)",
                            color: "var(--kami-text-muted)",
                            borderRadius: "var(--kami-cta-radius, 0.5rem)",
                          }
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                <input
                  type="checkbox"
                  checked={layer.repeating}
                  onChange={(e) => updateLayer(activeLayer, { repeating: e.target.checked })}
                  style={{ accentColor: "var(--kami-text)" }}
                />
                Repeating
              </label>
            </div>

            {/* Angle (visual wheel + slider) */}
            {(layer.type === "linear" || layer.type === "conic") && (
              <div
                className="p-4"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                <label className="mb-2 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Angle</label>
                <div className="flex items-center gap-4">
                  {/* Visual angle wheel */}
                  <div
                    ref={angleWheelRef}
                    onClick={handleAngleWheel}
                    className="relative h-16 w-16 flex-shrink-0 cursor-pointer rounded-full"
                    style={{
                      border: "2px solid var(--kami-border-strong)",
                      background: "var(--kami-surface)",
                    }}
                  >
                    <div
                      className="absolute left-1/2 top-1/2 h-6 w-0.5 origin-bottom -translate-x-1/2 rounded"
                      style={{
                        background: "var(--kami-text)",
                        transform: `translate(-50%, -100%) rotate(${layer.angle}deg)`,
                        transformOrigin: "bottom center",
                      }}
                    />
                    <div
                      className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ background: "var(--kami-text)" }}
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={layer.angle}
                      onChange={(e) => updateLayer(activeLayer, { angle: Number(e.target.value) })}
                      className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                      style={{
                        background: "var(--kami-border)",
                        accentColor: "var(--kami-text)",
                      }}
                    />
                    <div className="mt-1 flex justify-between">
                      <span className="text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>{layer.angle}°</span>
                      <div className="flex gap-1">
                        {[0, 45, 90, 135, 180, 270].map((a) => (
                          <button
                            key={a}
                            onClick={() => updateLayer(activeLayer, { angle: a })}
                            className="px-1.5 py-0.5 text-[10px]"
                            style={
                              layer.angle === a
                                ? {
                                    background: "var(--kami-cta-bg, #111827)",
                                    color: "var(--kami-cta-text, #ffffff)",
                                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                                  }
                                : {
                                    background: "var(--kami-surface)",
                                    color: "var(--kami-text-muted)",
                                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                                  }
                            }
                          >{a}°</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Radial options */}
            {layer.type === "radial" && (
              <div
                className="p-4"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                <label className="mb-2 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Radial Options</label>
                <div className="flex gap-2">
                  {(["circle", "ellipse"] as RadialShape[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateLayer(activeLayer, { radialShape: s })}
                      className="px-3 py-1.5 text-sm capitalize"
                      style={
                        layer.radialShape === s
                          ? {
                              background: "var(--kami-cta-bg, #111827)",
                              color: "var(--kami-cta-text, #ffffff)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                          : {
                              background: "var(--kami-surface)",
                              color: "var(--kami-text-muted)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                      }
                    >{s}</button>
                  ))}
                </div>
                <label className="mt-3 mb-1.5 block text-xs" style={{ color: "var(--kami-text-muted)" }}>Position</label>
                <div className="flex flex-wrap gap-1.5">
                  {(["center", "top", "bottom", "left", "right", "custom"] as RadialPosition[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => updateLayer(activeLayer, { radialPosition: p })}
                      className="px-2 py-1 text-xs capitalize"
                      style={
                        layer.radialPosition === p
                          ? {
                              background: "var(--kami-cta-bg, #111827)",
                              color: "var(--kami-cta-text, #ffffff)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                          : {
                              background: "var(--kami-surface)",
                              color: "var(--kami-text-muted)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                      }
                    >{p}</button>
                  ))}
                </div>
                {layer.radialPosition === "custom" && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px]" style={{ color: "var(--kami-text-dim)" }}>X %</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={layer.radialCustomX}
                        onChange={(e) => updateLayer(activeLayer, { radialCustomX: Number(e.target.value) })}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                        style={{ background: "var(--kami-border)", accentColor: "var(--kami-text)" }}
                      />
                      <span className="text-[10px] font-mono" style={{ color: "var(--kami-text-dim)" }}>{layer.radialCustomX}%</span>
                    </div>
                    <div>
                      <label className="text-[10px]" style={{ color: "var(--kami-text-dim)" }}>Y %</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={layer.radialCustomY}
                        onChange={(e) => updateLayer(activeLayer, { radialCustomY: Number(e.target.value) })}
                        className="h-1.5 w-full cursor-pointer appearance-none rounded-full"
                        style={{ background: "var(--kami-border)", accentColor: "var(--kami-text)" }}
                      />
                      <span className="text-[10px] font-mono" style={{ color: "var(--kami-text-dim)" }}>{layer.radialCustomY}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Color Stops */}
            <div
              className="p-4"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Color Stops</label>
                <div className="flex gap-1">
                  {(["hex", "rgb", "hsl"] as ColorFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setColorFormat(f)}
                      className="px-2 py-0.5 text-[10px] font-medium uppercase"
                      style={
                        colorFormat === f
                          ? {
                              background: "var(--kami-cta-bg, #111827)",
                              color: "var(--kami-cta-text, #ffffff)",
                              borderRadius: "var(--kami-cta-radius, 0.25rem)",
                            }
                          : {
                              background: "var(--kami-surface)",
                              color: "var(--kami-text-muted)",
                              borderRadius: "var(--kami-cta-radius, 0.25rem)",
                            }
                      }
                    >{f}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                {layer.stops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(e) => updateStop(i, { color: e.target.value })}
                      className="h-8 w-8 cursor-pointer"
                      style={{
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.25rem)",
                      }}
                    />
                    <span className="w-[110px] truncate text-[11px] font-mono" style={{ color: "var(--kami-text-muted)" }}>{formatColor(stop.color, colorFormat)}</span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={stop.position}
                      onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
                      className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                      style={{ background: "var(--kami-border)", accentColor: "var(--kami-text)" }}
                    />
                    <span className="w-8 text-right text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>{stop.position}%</span>
                    {layer.stops.length > 2 && (
                      <button
                        onClick={() => removeStop(i)}
                        className="text-xs"
                        style={{ color: "var(--kami-text-dim)" }}
                      >×</button>
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={addStop}
                className="mt-3 w-full py-1.5 text-xs"
                style={{
                  border: "1px dashed var(--kami-border-strong)",
                  color: "var(--kami-text-muted)",
                  borderRadius: "var(--kami-cta-radius, 0.5rem)",
                }}
              >
                + Add Stop
              </button>
            </div>
          </div>
        </div>
      </div>
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
