"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Slider, Toggle } from "@/components/tools/controls";

// --- Types ---

type GradientType = "linear" | "radial" | "conic";
type RadialShape = "circle" | "ellipse";
type RadialPosition = "center" | "top" | "bottom" | "left" | "right" | "custom";
type ColorFormat = "hex" | "rgb" | "hsl";
type OutputTab = "css" | "tailwind" | "scss" | "svg";

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

// --- SVG builder ---

function buildSvg(layers: GradientLayer[]): string {
  // Use the first layer for a simple SVG export (limited compared to CSS)
  const layer = layers[0];
  const sorted = [...layer.stops].sort((a, b) => a.position - b.position);
  const stops = sorted
    .map((s) => `    <stop offset="${s.position}%" stop-color="${s.color}"/>`)
    .join("\n");
  if (layer.type === "linear") {
    // Convert angle to x1/y1/x2/y2 in unit square
    const rad = ((layer.angle - 90) * Math.PI) / 180;
    const x1 = (50 - 50 * Math.cos(rad)).toFixed(2);
    const y1 = (50 - 50 * Math.sin(rad)).toFixed(2);
    const x2 = (50 + 50 * Math.cos(rad)).toFixed(2);
    const y2 = (50 + 50 * Math.sin(rad)).toFixed(2);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">
${stops}
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
</svg>`;
  }
  if (layer.type === "radial") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <radialGradient id="g" cx="50%" cy="50%" r="50%">
${stops}
    </radialGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
</svg>`;
  }
  // conic — SVG doesn't have native conic gradient; fall back to linear approximation comment
  return `<!-- conic gradient is not natively supported in SVG; using CSS preferred -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="0%">
${stops}
    </linearGradient>
  </defs>
  <rect width="100" height="100" fill="url(#g)"/>
</svg>`;
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
  const trackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{ index: number; pointerId: number } | null>(null);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<"visual" | "code">("visual");

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
  const isGlass    = currentTheme === "glass";

  const layer = layers[activeLayer] || defaultLayer();

  const gradient = useMemo(() => buildFullCSS(layers, colorFormat), [layers, colorFormat]);
  const cssOutput = useMemo(() => `background: ${gradient};`, [gradient]);
  const tailwindOutput = useMemo(() => buildTailwind(layers), [layers]);
  const scssOutput = useMemo(() => `$gradient: ${gradient};`, [gradient]);
  const svgOutput = useMemo(() => buildSvg(layers), [layers]);

  const outputMap: Record<OutputTab, string> = { css: cssOutput, tailwind: tailwindOutput, scss: scssOutput, svg: svgOutput };

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

  // --- Drag stops on the multi-stop track ---
  const sortedStops = [...layer.stops].sort((a, b) => a.position - b.position);
  // Map a sorted index back to the original index in layer.stops
  const sortedToOriginal = sortedStops.map((s) => layer.stops.indexOf(s));

  const handleTrackPointerDown = (
    e: React.PointerEvent<HTMLButtonElement>,
    originalIndex: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStateRef.current = { index: originalIndex, pointerId: e.pointerId };
  };

  const handleTrackPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    updateStop(drag.index, { position: Math.round(pct) });
  };

  const handleTrackPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const drag = dragStateRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      dragStateRef.current = null;
    }
  };

  const handleTrackDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    // Pick a color between neighbors
    const before = [...layer.stops].sort((a, b) => a.position - b.position).filter((s) => s.position <= pct).pop();
    const after = [...layer.stops].sort((a, b) => a.position - b.position).filter((s) => s.position > pct)[0];
    const color = before?.color ?? after?.color ?? "#888888";
    updateLayer(activeLayer, { stops: [...layer.stops, { color, position: pct }] });
  };

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

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;

  return (
    <ToolShell
      title="Gradient Generator"
      tagline="Linear · radial · conic · multi-stop · export CSS / Tailwind / SCSS / SVG"
      accent="#8b5cf6"
      materialFab={{ label: "Copy CSS", onClick: copyCSS }}
      actions={
        <>
          <ToolActionButton onClick={applyRandom} variant="ghost">Random</ToolActionButton>
          <ToolActionButton onClick={() => copy(outputMap[outputTab], "output")} variant="outline">
            {copiedKey === "output" ? "Copied!" : "Copy"}
          </ToolActionButton>
          <ToolActionButton onClick={() => setFullscreen(true)} variant="solid">Fullscreen</ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Type">
            <Segment
              value={layer.type}
              onChange={(v) => updateLayer(activeLayer, { type: v })}
              options={[
                { value: "linear", label: "Linear" },
                { value: "radial", label: "Radial" },
                { value: "conic", label: "Conic" },
              ]}
              full
            />
          </ControlGroup>

          <ControlGroup>
            <Toggle
              checked={layer.repeating}
              onChange={(v) => updateLayer(activeLayer, { repeating: v })}
              label="Repeating"
              hint="Repeat stops to fill the box"
            />
          </ControlGroup>

          {(layer.type === "linear" || layer.type === "conic") && (
            <ControlGroup label="Angle" hint={`${layer.angle}°`}>
              <Slider
                value={layer.angle}
                onChange={(v) => updateLayer(activeLayer, { angle: Math.round(v) })}
                min={0}
                max={360}
                unit="°"
              />
              <div className="mt-2 flex flex-wrap gap-1">
                {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                  <button
                    key={a}
                    onClick={() => updateLayer(activeLayer, { angle: a })}
                    className="px-2 py-1 text-[11px]"
                    style={
                      layer.angle === a
                        ? {
                            background: "var(--kami-cta-bg)",
                            color: "var(--kami-cta-text)",
                            borderRadius: "var(--kami-cta-radius, 0.25rem)",
                          }
                        : {
                            background: "var(--kami-surface)",
                            color: "var(--kami-text-muted)",
                            border: "1px solid var(--kami-border)",
                            borderRadius: "var(--kami-cta-radius, 0.25rem)",
                          }
                    }
                  >{a}°</button>
                ))}
              </div>
            </ControlGroup>
          )}

          {layer.type === "radial" && (
            <>
              <ControlGroup label="Radial shape">
                <Segment
                  value={layer.radialShape}
                  onChange={(v) => updateLayer(activeLayer, { radialShape: v })}
                  options={[
                    { value: "circle", label: "Circle" },
                    { value: "ellipse", label: "Ellipse" },
                  ]}
                  full
                />
              </ControlGroup>
              <ControlGroup label="Origin">
                <Segment
                  value={layer.radialPosition}
                  onChange={(v) => updateLayer(activeLayer, { radialPosition: v })}
                  options={[
                    { value: "center", label: "Ctr" },
                    { value: "top", label: "Top" },
                    { value: "bottom", label: "Bot" },
                    { value: "left", label: "Lft" },
                    { value: "right", label: "Rgt" },
                    { value: "custom", label: "Cstm" },
                  ]}
                  full
                />
              </ControlGroup>
              {layer.radialPosition === "custom" && (
                <>
                  <ControlGroup label="X" hint={`${layer.radialCustomX}%`}>
                    <Slider value={layer.radialCustomX} onChange={(v) => updateLayer(activeLayer, { radialCustomX: Math.round(v) })} min={0} max={100} unit="%" />
                  </ControlGroup>
                  <ControlGroup label="Y" hint={`${layer.radialCustomY}%`}>
                    <Slider value={layer.radialCustomY} onChange={(v) => updateLayer(activeLayer, { radialCustomY: Math.round(v) })} min={0} max={100} unit="%" />
                  </ControlGroup>
                </>
              )}
            </>
          )}

          <ControlGroup label="Color format">
            <Segment
              value={colorFormat}
              onChange={setColorFormat}
              options={[
                { value: "hex", label: "HEX" },
                { value: "rgb", label: "RGB" },
                { value: "hsl", label: "HSL" },
              ]}
              full
            />
          </ControlGroup>

          <ControlGroup label="Color stops">
            <div className="space-y-2">
              {layer.stops.map((stop, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="color"
                    value={stop.color}
                    onChange={(e) => updateStop(i, { color: e.target.value })}
                    aria-label={`Stop ${i + 1} color`}
                    className="h-9 w-9 cursor-pointer rounded"
                    style={{ border: "1px solid var(--kami-border-strong)" }}
                  />
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={stop.position}
                    onChange={(e) => updateStop(i, { position: Number(e.target.value) })}
                    aria-label={`Stop ${i + 1} position`}
                    className="kc-range flex-1"
                    style={{ ["--kc-fill" as string]: `${stop.position}%` }}
                  />
                  <span className="w-12 text-right text-[11px] font-mono" style={{ color: "var(--kami-text-dim)" }}>{stop.position}%</span>
                  {layer.stops.length > 2 && (
                    <button
                      onClick={() => removeStop(i)}
                      aria-label="Remove stop"
                      className="h-8 w-8 text-sm"
                      style={{ color: "var(--kami-text-dim)" }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addStop}
              className="mt-2 w-full py-2 text-xs"
              style={{
                border: "1px dashed var(--kami-border-strong)",
                color: "var(--kami-text-muted)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >+ Add stop</button>
          </ControlGroup>

          <ControlGroup label="Layers">
            <div className="flex flex-wrap gap-1.5">
              {layers.map((l, i) => (
                <div key={i} className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveLayer(i)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
                    style={
                      activeLayer === i
                        ? {
                            background: "var(--kami-cta-bg)",
                            color: "var(--kami-cta-text)",
                            border: "1px solid var(--kami-cta-bg)",
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
                      aria-label="Remove layer"
                      className="text-[10px]"
                      style={{ color: "var(--kami-text-dim)" }}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addLayer}
              className="mt-2 w-full py-2 text-xs"
              style={{
                border: "1px dashed var(--kami-border-strong)",
                color: "var(--kami-text-muted)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >+ Add layer</button>
          </ControlGroup>

          <ControlGroup label="Presets">
            {PRESET_CATEGORIES.map((cat) => (
              <div key={cat} className="mb-2 last:mb-0">
                <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>{cat}</div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESETS.filter((p) => p.category === cat).map((p) => (
                    <button key={p.name} onClick={() => applyPreset(p)} className="group flex flex-col items-center gap-1" title={p.name}>
                      <div
                        className="h-8 w-14 transition-transform group-hover:scale-105"
                        style={{
                          background: buildLayerCSS({ ...defaultLayer(), stops: p.stops, type: p.type, angle: p.angle }, "hex"),
                          border: "1px solid var(--kami-border-strong)",
                          borderRadius: "var(--kami-card-radius, 0.4rem)",
                        }}
                      />
                      <span className="text-[10px]" style={{ color: "var(--kami-text-dim)" }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </ControlGroup>

          <ControlGroup label="Import CSS">
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={importText}
                onChange={(e) => { setImportText(e.target.value); setImportError(""); }}
                placeholder="linear-gradient(135deg, #667eea, #764ba2)"
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                }}
              />
              <ToolActionButton onClick={handleImport} variant="outline">Parse</ToolActionButton>
              {importError && (
                <p className="text-xs" style={{ color: "var(--kami-accent, #ef4444)" }}>{importError}</p>
              )}
            </div>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Design linear, radial, or conic CSS gradients with multi-stop drag editing
            and stacked layers. Click the preview to set the angle (linear/conic).
            Double-click the gradient track to insert a stop.
          </p>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Made for</div>
            <p className="mt-1">Designers, front-end developers.</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Reach for it when</div>
            <ul className="mt-1 space-y-1 text-xs">
              <li>· Building a hero-section background</li>
              <li>· Designing a button with a subtle color sweep</li>
              <li>· Prototyping an aurora / mesh gradient</li>
            </ul>
          </div>
        </div>
      }
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "visual"}
            className={`metro-pivot-item${metroCPivot === "visual" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("visual")}>Visual</button>
          <button role="tab" aria-selected={metroCPivot === "code"}
            className={`metro-pivot-item${metroCPivot === "code" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("code")}>CSS</button>
        </nav>
      )}
      {(!isMetro || metroCPivot === "visual") && (
      <div className={isGlass ? "glass-canvas-section" : ""}><div className="flex h-full min-h-[60vh] flex-col gap-3">
        {/* Preview */}
        <div
          ref={previewRef}
          className="cursor-crosshair overflow-hidden"
          style={{
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
            flex: "1 1 auto",
            minHeight: 260,
          }}
          onClick={handlePreviewClick}
          title={layer.type !== "radial" ? "Click to set angle" : ""}
        >
          <div className="h-full w-full" style={{ background: gradient, minHeight: 260 }} />
        </div>

        {/* Multi-stop drag track */}
        <div className="px-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
              Stops · drag to position · double-click to add
            </span>
          </div>
          <div
            ref={trackRef}
            className="relative h-10 w-full cursor-copy overflow-hidden"
            style={{
              background: buildLayerCSS({ ...layer, type: "linear", angle: 90, repeating: false }, colorFormat),
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.5rem)",
            }}
            onDoubleClick={handleTrackDoubleClick}
          >
            {sortedStops.map((s, i) => {
              const original = sortedToOriginal[i];
              return (
                <button
                  key={`${original}-${i}`}
                  type="button"
                  onPointerDown={(e) => handleTrackPointerDown(e, original)}
                  onPointerMove={handleTrackPointerMove}
                  onPointerUp={handleTrackPointerUp}
                  onPointerCancel={handleTrackPointerUp}
                  aria-label={`Stop ${i + 1} at ${s.position}%`}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 touch-none"
                  style={{
                    left: `${s.position}%`,
                    width: 18,
                    height: 36,
                  }}
                >
                  <span
                    className="block h-full w-full rounded-md shadow"
                    style={{
                      background: s.color,
                      border: "2px solid #fff",
                      outline: "1px solid rgba(0,0,0,0.25)",
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>

      </div></div>
      )}
      {(!isMetro || metroCPivot === "code") && (
        <div className={isGlass ? "glass-canvas-section" : ""}><div className="overflow-hidden" style={cardStyle}>
          <div
            className="flex items-center justify-between gap-2 px-3 py-2"
            style={{ borderBottom: "1px solid var(--kami-border)" }}
          >
            <div className="flex gap-1 overflow-x-auto">
              {(["css", "tailwind", "scss", "svg"] as OutputTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setOutputTab(tab)}
                  className="px-2.5 py-1 text-xs font-medium uppercase"
                  style={
                    outputTab === tab
                      ? {
                          background: "var(--kami-cta-bg)",
                          color: "var(--kami-cta-text)",
                          borderRadius: "var(--kami-cta-radius, 0.5rem)",
                        }
                      : {
                          color: "var(--kami-text-muted)",
                          borderRadius: "var(--kami-cta-radius, 0.5rem)",
                        }
                  }
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => copy(outputMap[outputTab], "output")}
              className="px-2 py-1 text-xs"
              style={{
                border: "1px solid var(--kami-border-strong)",
                color: "var(--kami-text-muted)",
                borderRadius: "var(--kami-cta-radius, 0.25rem)",
              }}
            >
              {copiedKey === "output" ? "Copied" : "Copy"}
            </button>
          </div>
          <pre
            className="overflow-x-auto p-4 text-xs leading-relaxed"
            style={{
              background: "var(--kami-overlay-bg, #111827)",
              color: "var(--kami-overlay-text, #f3f4f6)",
              maxHeight: 200,
            }}
          ><code>{outputMap[outputTab]}</code></pre>
        </div></div>
      )}
    </ToolShell>
  );
}
