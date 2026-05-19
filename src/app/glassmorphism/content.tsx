"use client";

import { useState, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment, Toggle, SwatchGrid } from "@/components/tools/controls";

type StyleMode = "glass" | "neumorph";
type GlassPreset = "apple" | "material" | "custom";

const SCENE_GRADIENTS: { name: string; from: string; to: string }[] = [
  { name: "Indigo", from: "#6366f1", to: "#ec4899" },
  { name: "Sunset", from: "#f59e0b", to: "#ef4444" },
  { name: "Ocean", from: "#0ea5e9", to: "#22d3ee" },
  { name: "Forest", from: "#10b981", to: "#84cc16" },
  { name: "Night", from: "#1e1b4b", to: "#0f172a" },
  { name: "Rose", from: "#fb7185", to: "#a855f7" },
];

export default function GlassmorphismContent() {
  const [mode, setMode] = useState<StyleMode>("glass");

  // Glass state
  const [glassBlur, setGlassBlur] = useState(12);
  const [glassSaturation, setGlassSaturation] = useState(150);
  const [glassBrightness, setGlassBrightness] = useState(110);
  const [glassOpacity, setGlassOpacity] = useState(20);
  const [glassBorder, setGlassBorder] = useState(1);
  const [glassBg, setGlassBg] = useState("#ffffff");
  const [sceneIdx, setSceneIdx] = useState(0);

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
  const filterCSS = `blur(${glassBlur}px) saturate(${glassSaturation}%) brightness(${glassBrightness}%)`;
  const glassCSS = `background: rgba(${glassR}, ${glassG}, ${glassB}, ${(glassOpacity / 100).toFixed(2)});
backdrop-filter: ${filterCSS};
-webkit-backdrop-filter: ${filterCSS};
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [currentCSS]));

  const applyGlassPreset = (preset: GlassPreset) => {
    if (preset === "apple") {
      setGlassBlur(20);
      setGlassSaturation(180);
      setGlassBrightness(110);
      setGlassOpacity(40);
      setGlassBorder(1);
      setGlassBg("#ffffff");
    } else if (preset === "material") {
      setGlassBlur(10);
      setGlassSaturation(100);
      setGlassBrightness(100);
      setGlassOpacity(15);
      setGlassBorder(1);
      setGlassBg("#ffffff");
    }
  };

  const scene = SCENE_GRADIENTS[sceneIdx];

  return (
    <ToolShell
      title="Glassmorphism"
      tagline="Frosted glass and soft UI with backdrop-filter and layered shadows"
      accent="#8b5cf6"
      materialFab={{ label: "Copy CSS", onClick: copy }}
      actions={
        <>
          <Segment
            value={mode}
            onChange={setMode}
            options={[
              { value: "glass", label: "Glass" },
              { value: "neumorph", label: "Neumorph" },
            ]}
            size="sm"
          />
          <ToolActionButton onClick={copy} variant="solid">
            {copied ? "Copied!" : "Copy CSS"}
          </ToolActionButton>
        </>
      }
      controls={
        mode === "glass" ? (
          <>
            <ControlGroup label="Presets">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyGlassPreset("apple")}
                  className="px-3 py-2 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    color: "var(--kami-text-muted)",
                    minHeight: 40,
                  }}
                >
                  Apple
                </button>
                <button
                  type="button"
                  onClick={() => applyGlassPreset("material")}
                  className="px-3 py-2 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    color: "var(--kami-text-muted)",
                    minHeight: 40,
                  }}
                >
                  Material
                </button>
              </div>
            </ControlGroup>

            <ControlGroup label="Blur" hint={`${glassBlur}px`}>
              <Slider value={glassBlur} onChange={setGlassBlur} min={0} max={40} unit="px" />
            </ControlGroup>
            <ControlGroup label="Saturation" hint={`${glassSaturation}%`}>
              <Slider value={glassSaturation} onChange={setGlassSaturation} min={0} max={300} unit="%" />
            </ControlGroup>
            <ControlGroup label="Brightness" hint={`${glassBrightness}%`}>
              <Slider value={glassBrightness} onChange={setGlassBrightness} min={50} max={200} unit="%" />
            </ControlGroup>
            <ControlGroup label="Tint opacity" hint={`${glassOpacity}%`}>
              <Slider value={glassOpacity} onChange={setGlassOpacity} min={0} max={100} unit="%" />
            </ControlGroup>
            <ControlGroup label="Border" hint={`${glassBorder}px`}>
              <Slider value={glassBorder} onChange={setGlassBorder} min={0} max={5} unit="px" />
            </ControlGroup>

            <ControlGroup label="Tint color">
              <SwatchGrid
                value={glassBg}
                onChange={setGlassBg}
                colors={["#ffffff", "#000000", "#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6"]}
              />
            </ControlGroup>

            <ControlGroup label="Backdrop scene">
              <div className="flex flex-wrap gap-2">
                {SCENE_GRADIENTS.map((g, i) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => setSceneIdx(i)}
                    className="flex items-center gap-2 px-2.5 py-1.5 text-xs transition"
                    style={{
                      background: i === sceneIdx ? "var(--kami-cta-bg)" : "var(--kami-surface)",
                      color: i === sceneIdx ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      minHeight: 40,
                    }}
                  >
                    <span
                      aria-hidden
                      className="h-5 w-5 rounded-full"
                      style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                    />
                    {g.name}
                  </button>
                ))}
              </div>
            </ControlGroup>

            <ControlGroup label="CSS">
              <pre
                className="overflow-x-auto p-3 text-xs"
                style={{
                  background: "var(--kami-overlay-bg, #0d1117)",
                  color: "var(--kami-overlay-text, #f1f5f9)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  maxHeight: 220,
                }}
              >
                <code>{glassCSS}</code>
              </pre>
            </ControlGroup>
          </>
        ) : (
          <>
            <ControlGroup label="Distance" hint={`${neuDistance}px`}>
              <Slider value={neuDistance} onChange={setNeuDistance} min={1} max={30} unit="px" />
            </ControlGroup>
            <ControlGroup label="Intensity" hint={`${neuIntensity}%`}>
              <Slider value={neuIntensity} onChange={setNeuIntensity} min={1} max={50} unit="%" />
            </ControlGroup>
            <ControlGroup label="Blur" hint={`${neuBlur}px`}>
              <Slider value={neuBlur} onChange={setNeuBlur} min={0} max={60} unit="px" />
            </ControlGroup>
            <ControlGroup label="Surface color">
              <SwatchGrid
                value={neuBg}
                onChange={setNeuBg}
                colors={["#e0e5ec", "#f0f0f3", "#d1d9e6", "#fafafa", "#1e293b", "#334155", "#262626"]}
              />
            </ControlGroup>
            <ControlGroup>
              <Toggle
                checked={neuDark}
                onChange={setNeuDark}
                label="Dark mode"
                hint="Use higher-contrast shadow pair"
              />
            </ControlGroup>

            <ControlGroup label="CSS">
              <pre
                className="overflow-x-auto p-3 text-xs"
                style={{
                  background: "var(--kami-overlay-bg, #0d1117)",
                  color: "var(--kami-overlay-text, #f1f5f9)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  maxHeight: 220,
                }}
              >
                <code>{neuCSS}</code>
              </pre>
            </ControlGroup>
          </>
        )
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Glass mode renders backdrop-filter with blur + saturation + brightness
            against a chosen gradient scene. Neumorph mode generates the soft
            inner/outer shadow pair.
          </p>
          <p className="text-xs">
            backdrop-filter requires the parent to have content behind it — that&apos;s
            why we render against a colorful scene.
          </p>
        </div>
      }
    >
      {mode === "glass" ? (
        <div
          className="relative flex h-full min-h-[60vh] w-full items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${scene.from}, ${scene.to})`,
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            border: "1px solid var(--kami-border-strong)",
          }}
        >
          <div
            aria-hidden
            className="absolute -top-6 -left-6 h-40 w-40 rounded-full opacity-60"
            style={{ background: scene.from, filter: "brightness(1.4)" }}
          />
          <div
            aria-hidden
            className="absolute -bottom-10 -right-10 h-52 w-52 rounded-full opacity-50"
            style={{ background: scene.to, filter: "brightness(0.7)" }}
          />
          <div
            className="relative z-10 flex h-56 w-72 max-w-[80%] flex-col items-center justify-center px-6 text-center"
            style={{
              background: `rgba(${glassR},${glassG},${glassB},${glassOpacity / 100})`,
              backdropFilter: filterCSS,
              WebkitBackdropFilter: filterCSS,
              border: `${glassBorder}px solid rgba(${glassR},${glassG},${glassB},${Math.min(1, glassOpacity / 100 + 0.18)})`,
              borderRadius: 20,
            }}
          >
            <span className="text-base font-semibold text-white drop-shadow">Glass Card</span>
            <span className="mt-1 text-xs text-white/80 drop-shadow">backdrop-filter preview</span>
          </div>
        </div>
      ) : (
        <div
          className="flex h-full min-h-[60vh] w-full items-center justify-center"
          style={{
            backgroundColor: neuDark ? "#2d2d2d" : neuBg,
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            border: "1px solid var(--kami-border-strong)",
          }}
        >
          <div
            className="flex h-56 w-56 max-w-[70%] items-center justify-center"
            style={{
              background: neuDark ? "#2d2d2d" : neuBg,
              borderRadius: 24,
              boxShadow: `${neuDistance}px ${neuDistance}px ${neuBlur}px ${darkShadow}, ${-neuDistance}px ${-neuDistance}px ${neuBlur}px ${lightShadow}`,
            }}
          >
            <span className={`text-sm font-medium ${neuDark ? "text-gray-300" : "text-gray-500"}`}>Soft Card</span>
          </div>
        </div>
      )}
    </ToolShell>
  );
}
