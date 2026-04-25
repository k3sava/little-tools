"use client";

import { useState, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

type StyleMode = "glass" | "neumorph";

export default function GlassmorphismContent() {
  const [mode, setMode] = useState<StyleMode>("glass");

  // Glass state
  const [glassBlur, setGlassBlur] = useState(12);
  const [glassOpacity, setGlassOpacity] = useState(20);
  const [glassBorder, setGlassBorder] = useState(1);
  const [glassBg, setGlassBg] = useState("#ffffff");
  const [sceneBg, setSceneBg] = useState("#6366f1");

  // Neumorphism state
  const [neuBg, setNeuBg] = useState("#e0e5ec");
  const [neuDistance, setNeuDistance] = useState(10);
  const [neuIntensity, setNeuIntensity] = useState(15);
  const [neuBlur, setNeuBlur] = useState(20);
  const [neuDark, setNeuDark] = useState(false);

  const [copied, setCopied] = useState(false);

  // Glass CSS
  const glassR = parseInt(glassBg.slice(1, 3), 16);
  const glassG = parseInt(glassBg.slice(3, 5), 16);
  const glassB = parseInt(glassBg.slice(5, 7), 16);
  const glassCSS = `background: rgba(${glassR}, ${glassG}, ${glassB}, ${(glassOpacity / 100).toFixed(2)});
backdrop-filter: blur(${glassBlur}px);
-webkit-backdrop-filter: blur(${glassBlur}px);
border: ${glassBorder}px solid rgba(${glassR}, ${glassG}, ${glassB}, ${Math.min(1, glassOpacity / 100 + 0.18).toFixed(2)});
border-radius: 16px;`;

  // Neumorphism CSS
  const neuBgR = parseInt(neuBg.slice(1, 3), 16);
  const neuBgG = parseInt(neuBg.slice(3, 5), 16);
  const neuBgB = parseInt(neuBg.slice(5, 7), 16);
  const lightShadow = neuDark
    ? `rgba(255,255,255,${(neuIntensity / 200).toFixed(2)})`
    : `rgba(255,255,255,${(neuIntensity / 100 * 0.7).toFixed(2)})`;
  const darkShadow = neuDark
    ? `rgba(0,0,0,${(neuIntensity / 100 * 0.5).toFixed(2)})`
    : `rgba(${Math.max(0, neuBgR - 40)},${Math.max(0, neuBgG - 40)},${Math.max(0, neuBgB - 40)},${(neuIntensity / 100 * 0.5).toFixed(2)})`;
  const neuCSS = `background: ${neuBg};
border-radius: 16px;
box-shadow: ${neuDistance}px ${neuDistance}px ${neuBlur}px ${darkShadow},
            ${-neuDistance}px ${-neuDistance}px ${neuBlur}px ${lightShadow};`;

  const currentCSS = mode === "glass" ? glassCSS : neuCSS;

  const copy = () => {
    navigator.clipboard.writeText(currentCSS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => copy(), label: "Copy CSS" },
  ], [currentCSS]));

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  };

  const tabStyle = (active: boolean) => ({
    background: active ? "var(--kami-cta-bg)" : "var(--kami-surface-solid)",
    color: active ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
    border: active ? "1px solid var(--kami-cta-bg)" : "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  });

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Glassmorphism / Neumorphism"
          tagline="Generate the two trendiest surface styles - frosted glass (backdrop blur) and soft UI (neumorphic shadows) - with live CSS output."
          description="Switch between modes and drag the sliders for blur, transparency, border, and shadow. Glass mode produces backdrop-filter-based frosted panels (perfect for overlays on photos). Neumorph mode generates the inner/outer shadow pair that creates the soft extruded look."
          audience={["Designers", "Front-end developers"]}
          whenToUse={[
            "Building a card or modal with a frosted-glass look",
            "Prototyping a soft-UI toggle or dial",
            "Exploring which look fits your brand",
          ]}
        />

        {/* Mode tabs */}
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setMode("glass")}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={tabStyle(mode === "glass")}
          >
            Glassmorphism
          </button>
          <button
            onClick={() => setMode("neumorph")}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={tabStyle(mode === "neumorph")}
          >
            Neumorphism
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Preview */}
          {mode === "glass" ? (
            <div
              className="relative flex min-h-[360px] items-center justify-center overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${sceneBg}, ${adjustColor(sceneBg, 40)})`,
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              {/* Decorative blobs */}
              <div className="absolute top-8 left-8 h-32 w-32 rounded-full opacity-60" style={{ backgroundColor: adjustColor(sceneBg, -30) }} />
              <div className="absolute bottom-12 right-12 h-24 w-24 rounded-full opacity-40" style={{ backgroundColor: adjustColor(sceneBg, 60) }} />
              {/* Glass card */}
              <div
                className="relative z-10 h-48 w-64 flex items-center justify-center"
                style={{
                  background: `rgba(${glassR},${glassG},${glassB},${glassOpacity / 100})`,
                  backdropFilter: `blur(${glassBlur}px)`,
                  WebkitBackdropFilter: `blur(${glassBlur}px)`,
                  border: `${glassBorder}px solid rgba(${glassR},${glassG},${glassB},${Math.min(1, glassOpacity / 100 + 0.18)})`,
                  borderRadius: 16,
                }}
              >
                <span className="text-white text-sm font-medium drop-shadow">Glass Card</span>
              </div>
            </div>
          ) : (
            <div
              className="flex min-h-[360px] items-center justify-center"
              style={{
                backgroundColor: neuDark ? "#2d2d2d" : neuBg,
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div
                className="flex h-48 w-64 items-center justify-center"
                style={{
                  background: neuDark ? "#2d2d2d" : neuBg,
                  borderRadius: 16,
                  boxShadow: `${neuDistance}px ${neuDistance}px ${neuBlur}px ${darkShadow}, ${-neuDistance}px ${-neuDistance}px ${neuBlur}px ${lightShadow}`,
                }}
              >
                <span className={`text-sm font-medium ${neuDark ? "text-gray-300" : "text-gray-500"}`}>Soft Card</span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-4" style={cardStyle}>
            {mode === "glass" ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Glass Settings</h3>
                <SliderRow label="Blur" value={glassBlur} min={0} max={40} suffix="px" onChange={setGlassBlur} />
                <SliderRow label="Opacity" value={glassOpacity} min={0} max={100} suffix="%" onChange={setGlassOpacity} />
                <SliderRow label="Border" value={glassBorder} min={0} max={5} suffix="px" onChange={setGlassBorder} />
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs" style={{ color: "var(--kami-text-muted)" }}>Card</span>
                  <input type="color" value={glassBg} onChange={(e) => setGlassBg(e.target.value)} className="h-7 w-7 cursor-pointer" style={{ border: "1px solid var(--kami-border-strong)", borderRadius: "var(--kami-cta-radius, 0.25rem)" }} />
                  <span className="text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>{glassBg}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs" style={{ color: "var(--kami-text-muted)" }}>Scene</span>
                  <input type="color" value={sceneBg} onChange={(e) => setSceneBg(e.target.value)} className="h-7 w-7 cursor-pointer" style={{ border: "1px solid var(--kami-border-strong)", borderRadius: "var(--kami-cta-radius, 0.25rem)" }} />
                  <span className="text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>{sceneBg}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Neumorphism Settings</h3>
                <SliderRow label="Distance" value={neuDistance} min={1} max={30} suffix="px" onChange={setNeuDistance} />
                <SliderRow label="Intensity" value={neuIntensity} min={1} max={50} suffix="%" onChange={setNeuIntensity} />
                <SliderRow label="Blur" value={neuBlur} min={0} max={60} suffix="px" onChange={setNeuBlur} />
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs" style={{ color: "var(--kami-text-muted)" }}>Color</span>
                  <input type="color" value={neuBg} onChange={(e) => setNeuBg(e.target.value)} className="h-7 w-7 cursor-pointer" style={{ border: "1px solid var(--kami-border-strong)", borderRadius: "var(--kami-cta-radius, 0.25rem)" }} />
                  <span className="text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>{neuBg}</span>
                </div>
                <label className="flex items-center gap-2 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  <input type="checkbox" checked={neuDark} onChange={(e) => setNeuDark(e.target.checked)} />
                  Dark Mode
                </label>
              </div>
            )}
          </div>
        </div>

        {/* CSS */}
        <div className="mt-6 p-4" style={cardStyle}>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>CSS</h2>
            <button
              onClick={copy}
              className="px-2 py-1 text-xs"
              style={{
                color: "var(--kami-text-muted)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.25rem)",
              }}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre
            className="overflow-x-auto p-4 text-sm"
            style={{
              background: "var(--kami-overlay-bg, #0d1117)",
              color: "var(--kami-overlay-text, #f1f5f9)",
              borderRadius: "var(--kami-card-radius, 0.5rem)",
            }}
          ><code>{currentCSS}</code></pre>
        </div>
      </div>
    </div>
  );
}

function SliderRow({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 text-xs" style={{ color: "var(--kami-text-muted)" }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
        style={{
          background: "var(--kami-border-strong)",
          accentColor: "var(--kami-text)",
        }}
      />
      <span className="w-12 text-right text-xs font-mono" style={{ color: "var(--kami-text-dim)" }}>{value}{suffix}</span>
    </div>
  );
}

function adjustColor(hex: string, amount: number): string {
  const r = Math.max(0, Math.min(255, parseInt(hex.slice(1, 3), 16) + amount));
  const g = Math.max(0, Math.min(255, parseInt(hex.slice(3, 5), 16) + amount));
  const b = Math.max(0, Math.min(255, parseInt(hex.slice(5, 7), 16) + amount));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}
