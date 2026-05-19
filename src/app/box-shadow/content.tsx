"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
  ToolIconButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment, Toggle, SwatchGrid } from "@/components/tools/controls";

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

type OutputFormat = "css" | "tailwind" | "scss" | "react-native";

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
    name: "Hard",
    layers: [{ x: 4, y: 4, blur: 0, spread: 0, color: "#000000", opacity: 100, inset: false }],
  },
  {
    name: "Soft Glow",
    layers: [{ x: 0, y: 0, blur: 20, spread: 2, color: "#3b82f6", opacity: 30, inset: false }],
  },
  {
    name: "Neumorphic",
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

const MAX_LAYERS = 6;

const COLOR_SWATCHES = [
  "#000000",
  "#1f2937",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#14b8a6",
  "#ffffff",
];

// --- Helpers ---

function layerToCSS(l: ShadowLayer): string {
  const r = parseInt(l.color.slice(1, 3), 16);
  const g = parseInt(l.color.slice(3, 5), 16);
  const b = parseInt(l.color.slice(5, 7), 16);
  const a = (l.opacity / 100).toFixed(2);
  return `${l.inset ? "inset " : ""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px rgba(${r}, ${g}, ${b}, ${a})`;
}

function layersToTailwind(layers: ShadowLayer[]): string {
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
  const val = layers.map(layerToCSS).join(",_");
  return `shadow-[${val.replace(/\s+/g, "_")}]`;
}

function layersToScss(layers: ShadowLayer[]): string {
  const val = layers.map(layerToCSS).join(",\n    ");
  return `@mixin box-shadow {\n  box-shadow: ${val};\n}`;
}

function layersToReactNative(layers: ShadowLayer[]): string {
  const l = layers[0];
  return `shadowColor: "${l.color}",
shadowOffset: { width: ${l.x}, height: ${l.y} },
shadowOpacity: ${(l.opacity / 100).toFixed(2)},
shadowRadius: ${l.blur},
elevation: ${Math.max(1, Math.round(l.blur / 2))},`;
}

// --- Main ---

export default function BoxShadowContent() {
  const [layers, setLayers] = useState<ShadowLayer[]>([{ ...DEFAULT_LAYER }]);
  const [activeLayer, setActiveLayer] = useState(0);
  const [copied, setCopied] = useState(false);
  const [bgColor, setBgColor] = useState("#f1f5f9");
  const [cardColor, setCardColor] = useState("#ffffff");
  const [cardRadius, setCardRadius] = useState(16);
  const [cardSize, setCardSize] = useState(192);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("css");
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

  const cssValue = layers.map(layerToCSS).join(",\n    ");
  const fullCSS = `box-shadow: ${cssValue};`;

  const outputCode = useMemo(() => {
    switch (outputFormat) {
      case "css": return fullCSS;
      case "tailwind": return `className="${layersToTailwind(layers)}"`;
      case "scss": return layersToScss(layers);
      case "react-native": return layersToReactNative(layers);
    }
  }, [outputFormat, layers, fullCSS]);

  const updateLayer = useCallback((index: number, updates: Partial<ShadowLayer>) => {
    setLayers((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...updates } : l)),
    );
  }, []);

  const addLayer = useCallback(() => {
    setLayers((prev) => {
      if (prev.length >= MAX_LAYERS) return prev;
      const next = [...prev, { ...DEFAULT_LAYER, y: (prev.length + 1) * 4 }];
      setActiveLayer(next.length - 1);
      return next;
    });
  }, []);

  const removeLayer = useCallback((index: number) => {
    setLayers((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      setActiveLayer((cur) => Math.min(cur, next.length - 1));
      return next;
    });
  }, []);

  const duplicateLayer = useCallback((index: number) => {
    setLayers((prev) => {
      if (prev.length >= MAX_LAYERS) return prev;
      const copy = { ...prev[index] };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      setActiveLayer(index + 1);
      return next;
    });
  }, []);

  const moveLayer = useCallback((index: number, dir: -1 | 1) => {
    setLayers((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      setActiveLayer(target);
      return next;
    });
  }, []);

  const applyPreset = useCallback((preset: Preset) => {
    setLayers(preset.layers.map((l) => ({ ...l })));
    setActiveLayer(0);
  }, []);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [outputCode]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: copy, label: "Copy" },
  ], [copy]));

  // Drag offset on preview to set X/Y of active layer
  const onPreviewDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const layer = layers[activeLayer];
    if (!layer) return;
    const startLx = layer.x;
    const startLy = layer.y;

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      updateLayer(activeLayer, {
        x: Math.max(-50, Math.min(50, Math.round(startLx + dx / 4))),
        y: Math.max(-50, Math.min(50, Math.round(startLy + dy / 4))),
      });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, [activeLayer, layers, updateLayer]);

  const layer = layers[activeLayer] ?? layers[0];

  return (
    <ToolShell
      title="Box Shadow"
      tagline="Multi-layer shadows with live drag-to-offset preview"
      accent="#8b5cf6"
      materialFab={{ label: "Copy CSS", onClick: copy }}
      actions={
        <>
          <Segment
            value={outputFormat}
            onChange={setOutputFormat}
            options={[
              { value: "css", label: "CSS" },
              { value: "tailwind", label: "TW" },
              { value: "scss", label: "SCSS" },
              { value: "react-native", label: "RN" },
            ]}
            size="sm"
          />
          <ToolActionButton onClick={copy} variant="solid">
            {copied ? "Copied!" : "Copy"}
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Presets">
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="flex flex-col items-center gap-1.5 p-2 text-[11px] transition"
                  style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    color: "var(--kami-text-muted)",
                    minHeight: 64,
                  }}
                >
                  <div
                    className="h-7 w-7"
                    style={{
                      background: "#ffffff",
                      border: "1px solid var(--kami-border)",
                      borderRadius: 6,
                      boxShadow: preset.layers.map(layerToCSS).join(", "),
                    }}
                  />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup label="Layers" hint={`${layers.length}/${MAX_LAYERS}`}>
            <div className="flex flex-wrap gap-1.5">
              {layers.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveLayer(i)}
                  className="px-2.5 py-1.5 text-xs font-mono transition"
                  style={{
                    background: i === activeLayer ? "var(--kami-cta-bg)" : "var(--kami-surface)",
                    color: i === activeLayer ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    minHeight: 32,
                    minWidth: 32,
                  }}
                >
                  L{i + 1}
                </button>
              ))}
              {layers.length < MAX_LAYERS && (
                <button
                  type="button"
                  onClick={addLayer}
                  className="px-2.5 py-1.5 text-xs"
                  style={{
                    background: "transparent",
                    color: "var(--kami-text-muted)",
                    border: "1px dashed var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    minHeight: 32,
                  }}
                >
                  + Add
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <ToolIconButton label="Move up" onClick={() => moveLayer(activeLayer, -1)}>↑</ToolIconButton>
              <ToolIconButton label="Move down" onClick={() => moveLayer(activeLayer, 1)}>↓</ToolIconButton>
              <ToolIconButton label="Duplicate" onClick={() => duplicateLayer(activeLayer)}>⧉</ToolIconButton>
              <ToolIconButton label="Remove" onClick={() => removeLayer(activeLayer)} disabled={layers.length <= 1}>×</ToolIconButton>
            </div>
          </ControlGroup>

          <ControlGroup label="Offset X" hint={`${layer.x}px`}>
            <Slider value={layer.x} onChange={(v) => updateLayer(activeLayer, { x: v })} min={-50} max={50} unit="px" />
          </ControlGroup>
          <ControlGroup label="Offset Y" hint={`${layer.y}px`}>
            <Slider value={layer.y} onChange={(v) => updateLayer(activeLayer, { y: v })} min={-50} max={50} unit="px" />
          </ControlGroup>
          <ControlGroup label="Blur" hint={`${layer.blur}px`}>
            <Slider value={layer.blur} onChange={(v) => updateLayer(activeLayer, { blur: v })} min={0} max={100} unit="px" />
          </ControlGroup>
          <ControlGroup label="Spread" hint={`${layer.spread}px`}>
            <Slider value={layer.spread} onChange={(v) => updateLayer(activeLayer, { spread: v })} min={-50} max={50} unit="px" />
          </ControlGroup>
          <ControlGroup label="Opacity" hint={`${layer.opacity}%`}>
            <Slider value={layer.opacity} onChange={(v) => updateLayer(activeLayer, { opacity: v })} min={0} max={100} unit="%" />
          </ControlGroup>

          <ControlGroup label="Shadow color">
            <SwatchGrid value={layer.color} onChange={(c) => updateLayer(activeLayer, { color: c })} colors={COLOR_SWATCHES} />
          </ControlGroup>

          <ControlGroup>
            <Toggle
              checked={layer.inset}
              onChange={(v) => updateLayer(activeLayer, { inset: v })}
              label="Inset"
              hint="Render shadow inside the box"
            />
          </ControlGroup>

          <ControlGroup label="Preview card">
            <Slider label="Size" value={cardSize} onChange={setCardSize} min={80} max={320} unit="px" />
            <Slider label="Radius" value={cardRadius} onChange={setCardRadius} min={0} max={100} unit="px" />
            <SwatchGrid value={cardColor} onChange={setCardColor} colors={["#ffffff", "#f1f5f9", "#1f2937", "#0f172a", "#fef3c7", "#dbeafe", "#fce7f3"]} label="Card" />
            <SwatchGrid value={bgColor} onChange={setBgColor} colors={["#ffffff", "#f1f5f9", "#e2e8f0", "#1f2937", "#0f172a", "#fef3c7", "#dbeafe"]} label="Backdrop" />
          </ControlGroup>

          <ControlGroup label="Output">
            <pre
              className="overflow-x-auto p-3 text-xs"
              style={{
                background: "var(--kami-overlay-bg, #0d1117)",
                color: "var(--kami-overlay-text, #f1f5f9)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                maxHeight: 220,
              }}
            >
              <code>{outputCode}</code>
            </pre>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Stack up to {MAX_LAYERS} shadow layers for realistic depth. Drag inside the
            preview to set the active layer&apos;s X/Y offset directly.
          </p>
          <p className="text-xs">
            Tip: a tight dark layer plus a soft loose one is what makes UI shadows look real.
            Use the SCSS export to drop the result into a design system as a mixin.
          </p>
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
        <div className={isGlass ? "glass-canvas-section" : ""}><div
          className="flex h-full min-h-[60vh] w-full items-center justify-center p-6 sm:p-10"
          style={{
            backgroundColor: bgColor,
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            border: "1px solid var(--kami-border-strong)",
          }}
        >
          <div
            onPointerDown={onPreviewDrag}
            style={{
              width: cardSize,
              height: cardSize,
              backgroundColor: cardColor,
              boxShadow: layers.map(layerToCSS).join(", "),
              borderRadius: cardRadius,
              cursor: "grab",
              touchAction: "none",
            }}
            title="Drag to set offset of active layer"
          />
        </div></div>
      )}
      {(!isMetro || metroCPivot === "code") && (
        <div className={isGlass ? "glass-canvas-section" : ""}><div className="p-4">
          <pre
            className="overflow-x-auto p-4 text-xs leading-relaxed"
            style={{
              background: "var(--kami-overlay-bg, #0d1117)",
              color: "var(--kami-overlay-text, #f1f5f9)",
              borderRadius: "var(--kami-input-radius, 0.5rem)",
              maxHeight: 400,
            }}
          >
            <code>{outputCode}</code>
          </pre>
        </div></div>
      )}
    </ToolShell>
  );
}
