"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
  ToolIconButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment, Select, SwatchGrid } from "@/components/tools/controls";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KeyframeStop {
  percent: number;
  opacity: number;
  translateX: number;
  translateY: number;
  scale: number;
  rotate: number;
  backgroundColor: string;
}

type TimingFunction = "ease" | "linear" | "ease-in" | "ease-out" | "ease-in-out";
type IterationCount = "1" | "2" | "3" | "infinite";
type Direction = "normal" | "reverse" | "alternate" | "alternate-reverse";
type FillMode = "none" | "forwards" | "backwards" | "both";

interface AnimationConfig {
  name: string;
  duration: number;
  timing: TimingFunction;
  iterations: IterationCount;
  direction: Direction;
  fillMode: FillMode;
}

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */

const PRESETS: { label: string; stops: KeyframeStop[] }[] = [
  {
    label: "Fade In",
    stops: [
      { percent: 0, opacity: 0, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 100, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
    ],
  },
  {
    label: "Slide Up",
    stops: [
      { percent: 0, opacity: 0, translateX: 0, translateY: 40, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 100, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
    ],
  },
  {
    label: "Bounce",
    stops: [
      { percent: 0, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 25, opacity: 1, translateX: 0, translateY: -30, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 50, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 75, opacity: 1, translateX: 0, translateY: -15, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 100, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
    ],
  },
  {
    label: "Spin",
    stops: [
      { percent: 0, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 100, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 360, backgroundColor: "#6366f1" },
    ],
  },
  {
    label: "Pulse",
    stops: [
      { percent: 0, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 50, opacity: 1, translateX: 0, translateY: 0, scale: 1.15, rotate: 0, backgroundColor: "#6366f1" },
      { percent: 100, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function defaultStop(percent: number): KeyframeStop {
  return { percent, opacity: 1, translateX: 0, translateY: 0, scale: 1, rotate: 0, backgroundColor: "#6366f1" };
}

function buildTransform(s: KeyframeStop): string {
  const parts: string[] = [];
  if (s.translateX !== 0 || s.translateY !== 0) parts.push(`translate(${s.translateX}px, ${s.translateY}px)`);
  if (s.scale !== 1) parts.push(`scale(${s.scale})`);
  if (s.rotate !== 0) parts.push(`rotate(${s.rotate}deg)`);
  return parts.length ? parts.join(" ") : "none";
}

function buildKeyframeCSS(stops: KeyframeStop[]): string {
  const sorted = [...stops].sort((a, b) => a.percent - b.percent);
  return sorted
    .map((s) => {
      const props: string[] = [];
      props.push(`opacity: ${s.opacity}`);
      const tf = buildTransform(s);
      if (tf !== "none") props.push(`transform: ${tf}`);
      props.push(`background-color: ${s.backgroundColor}`);
      return `  ${s.percent}% { ${props.join("; ")}; }`;
    })
    .join("\n");
}

function generateCSS(config: AnimationConfig, stops: KeyframeStop[]): string {
  const keyframes = `@keyframes ${config.name} {\n${buildKeyframeCSS(stops)}\n}`;
  const animParts = [
    config.name,
    `${config.duration}s`,
    config.timing,
    config.iterations === "infinite" ? "infinite" : config.iterations,
    config.direction,
    config.fillMode,
  ];
  const rule = `.animated {\n  animation: ${animParts.join(" ")};\n}`;
  return `${keyframes}\n\n${rule}`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function KeyframeAnimatorContent() {
  const [stops, setStops] = useState<KeyframeStop[]>([
    defaultStop(0),
    defaultStop(100),
  ]);
  const [selected, setSelected] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [config, setConfig] = useState<AnimationConfig>({
    name: "my-animation",
    duration: 1,
    timing: "ease",
    iterations: "infinite",
    direction: "normal",
    fillMode: "forwards",
  });
  const [copied, setCopied] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);
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

  const css = useMemo(() => generateCSS(config, stops), [config, stops]);

  // Replay animation when anything changes
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [css]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [css]);

  useKeyboardShortcuts(
    useMemo(() => [{ key: "Enter", meta: true, action: copyCSS, label: "Copy CSS" }], [copyCSS]),
  );

  const addStop = () => {
    const sorted = [...stops].sort((a, b) => a.percent - b.percent);
    let newPercent = 50;
    if (sorted.length >= 2) {
      let maxGap = 0;
      let gapMid = 50;
      for (let i = 0; i < sorted.length - 1; i++) {
        const gap = sorted[i + 1].percent - sorted[i].percent;
        if (gap > maxGap) {
          maxGap = gap;
          gapMid = Math.round((sorted[i].percent + sorted[i + 1].percent) / 2);
        }
      }
      newPercent = gapMid;
    }
    const newStop = defaultStop(newPercent);
    setStops((prev) => [...prev, newStop]);
    setSelected(stops.length);
  };

  const removeStop = (index: number) => {
    if (stops.length <= 2) return;
    setStops((prev) => prev.filter((_, i) => i !== index));
    setSelected((s) => (s >= stops.length - 1 ? Math.max(0, stops.length - 2) : s >= index ? Math.max(0, s - 1) : s));
  };

  const updateStop = (index: number, updates: Partial<KeyframeStop>) => {
    setStops((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setStops(preset.stops.map((s) => ({ ...s })));
    setSelected(0);
  };

  const replay = () => {
    setPlaying(true);
    setAnimKey((k) => k + 1);
  };

  const togglePlay = () => {
    setPlaying((p) => !p);
    setAnimKey((k) => k + 1);
  };

  const stop = () => {
    setPlaying(false);
    setAnimKey((k) => k + 1);
  };

  const sorted = useMemo(() => [...stops].map((s, i) => ({ ...s, _i: i })).sort((a, b) => a.percent - b.percent), [stops]);
  const current = stops[selected] ?? stops[0];

  /* -- Inject @keyframes into <head> for live preview -- */
  useEffect(() => {
    const style = document.createElement("style");
    style.setAttribute("data-kf-preview", "true");
    style.textContent = `@keyframes __kf_preview__ {\n${buildKeyframeCSS(stops)}\n}`;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [stops]);

  return (
    <ToolShell
      title="Keyframe Animator"
      tagline="Build @keyframes visually — timeline editor with live looping preview"
      accent="#8b5cf6"
      materialFab={{ label: "Copy CSS", onClick: copyCSS }}
      actions={
        <>
          <ToolActionButton onClick={togglePlay} variant="outline">
            {playing ? "Pause" : "Play"}
          </ToolActionButton>
          <ToolActionButton onClick={stop} variant="ghost">
            Stop
          </ToolActionButton>
          <ToolActionButton onClick={copyCSS} variant="solid">
            {copied ? "Copied!" : "Copy CSS"}
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Presets">
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-3 py-2 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    minHeight: 40,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup label="Animation name">
            <input
              type="text"
              value={config.name}
              onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") }))}
              className="w-full px-3 py-2 font-mono text-sm"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
              }}
            />
          </ControlGroup>

          <ControlGroup label="Duration" hint={`${config.duration}s`}>
            <Slider value={config.duration} onChange={(v) => setConfig((c) => ({ ...c, duration: v }))} min={0.1} max={5} step={0.1} unit="s" />
          </ControlGroup>

          <ControlGroup label="Timing">
            <Select
              value={config.timing}
              onChange={(v) => setConfig((c) => ({ ...c, timing: v }))}
              options={(["ease", "linear", "ease-in", "ease-out", "ease-in-out"] as TimingFunction[]).map((t) => ({ value: t, label: t }))}
            />
          </ControlGroup>

          <ControlGroup label="Iterations">
            <Segment
              value={config.iterations}
              onChange={(v) => setConfig((c) => ({ ...c, iterations: v }))}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
                { value: "infinite", label: "∞" },
              ]}
              full
            />
          </ControlGroup>

          <ControlGroup label="Direction">
            <Select
              value={config.direction}
              onChange={(v) => setConfig((c) => ({ ...c, direction: v }))}
              options={(["normal", "reverse", "alternate", "alternate-reverse"] as Direction[]).map((d) => ({ value: d, label: d }))}
            />
          </ControlGroup>

          <ControlGroup label="Fill mode">
            <Segment
              value={config.fillMode}
              onChange={(v) => setConfig((c) => ({ ...c, fillMode: v }))}
              options={[
                { value: "none", label: "none" },
                { value: "forwards", label: "fwd" },
                { value: "backwards", label: "back" },
                { value: "both", label: "both" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>

          <ControlGroup label={`Keyframe @ ${current.percent}%`} hint={`${stops.length} stops`}>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {sorted.map((s) => (
                <button
                  key={s._i}
                  type="button"
                  onClick={() => setSelected(s._i)}
                  className="px-2.5 py-1.5 text-xs font-mono"
                  style={{
                    background: selected === s._i ? "var(--kami-cta-bg)" : "var(--kami-surface)",
                    color: selected === s._i ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    minHeight: 32,
                  }}
                >
                  {s.percent}%
                </button>
              ))}
              <button
                type="button"
                onClick={addStop}
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
            </div>
            <div className="mb-3 flex gap-1.5">
              <ToolIconButton label="Remove keyframe" onClick={() => removeStop(selected)} disabled={stops.length <= 2}>×</ToolIconButton>
              <ToolIconButton label="Replay" onClick={replay}>↻</ToolIconButton>
            </div>
            <Slider label="Position" value={current.percent} onChange={(v) => updateStop(selected, { percent: v })} min={0} max={100} unit="%" />
            <Slider label="Opacity" value={current.opacity} onChange={(v) => updateStop(selected, { opacity: v })} min={0} max={1} step={0.05} />
            <Slider label="Translate X" value={current.translateX} onChange={(v) => updateStop(selected, { translateX: v })} min={-200} max={200} unit="px" />
            <Slider label="Translate Y" value={current.translateY} onChange={(v) => updateStop(selected, { translateY: v })} min={-200} max={200} unit="px" />
            <Slider label="Scale" value={current.scale} onChange={(v) => updateStop(selected, { scale: v })} min={0} max={3} step={0.05} />
            <Slider label="Rotate" value={current.rotate} onChange={(v) => updateStop(selected, { rotate: v })} min={-360} max={360} unit="°" />
            <div className="mt-2">
              <SwatchGrid
                value={current.backgroundColor}
                onChange={(c) => updateStop(selected, { backgroundColor: c })}
                colors={["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#ffffff", "#000000"]}
                label="Color"
              />
            </div>
          </ControlGroup>

          <ControlGroup label="Generated CSS">
            <pre
              className="overflow-x-auto p-3 text-xs"
              style={{
                background: "var(--kami-overlay-bg, #0d1117)",
                color: "var(--kami-overlay-text, #f1f5f9)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                maxHeight: 260,
              }}
            >
              <code>{css}</code>
            </pre>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Pick a preset or click <strong>+ Add</strong> in the Keyframe panel to insert a
            stop in the widest gap. Each stop has its own translate, scale, rotate,
            opacity and background color.
          </p>
          <p className="text-xs">Press the timeline dots to jump between keyframes. Play / Pause / Stop in the header controls playback.</p>
        </div>
      }
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "visual"}
            className={`metro-pivot-item${metroCPivot === "visual" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("visual")}>Editor</button>
          <button role="tab" aria-selected={metroCPivot === "code"}
            className={`metro-pivot-item${metroCPivot === "code" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("code")}>CSS</button>
        </nav>
      )}
      {(!isMetro || metroCPivot === "visual") && (
        <div className="flex h-full min-h-[60vh] w-full flex-col gap-4 p-4">
          {/* Live Preview */}
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#fff_0%_50%)] bg-[length:20px_20px]"
            style={{
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              minHeight: 260,
            }}
          >
            <div
              ref={previewRef}
              key={animKey}
              className="h-24 w-24 rounded-2xl"
              style={{
                backgroundColor: current.backgroundColor,
                animation: playing
                  ? `__kf_preview__ ${config.duration}s ${config.timing} ${config.iterations === "infinite" ? "infinite" : config.iterations} ${config.direction} ${config.fillMode}`
                  : "none",
              }}
            />
          </div>

          {/* Timeline */}
          <div
            className="p-4"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <div className="mb-3 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-muted)" }}>
              <span className="font-semibold">Timeline</span>
              <span className="font-mono">{config.duration}s · {stops.length} stops</span>
            </div>
            <div
              className="relative h-12"
              style={{
                background: "var(--kami-surface)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.5rem)",
              }}
            >
              {[0, 25, 50, 75, 100].map((t) => (
                <div
                  key={t}
                  className="absolute top-0 h-full"
                  style={{ left: `${t}%`, borderLeft: "1px solid var(--kami-border)" }}
                >
                  <span className="absolute -top-5 -translate-x-1/2 text-[10px]" style={{ color: "var(--kami-text-dim)" }}>{t}%</span>
                </div>
              ))}
              {sorted.map((s) => (
                <button
                  key={s._i}
                  type="button"
                  onClick={() => setSelected(s._i)}
                  className="absolute top-1/2 h-6 w-6 rounded-full transition-all"
                  style={{
                    left: `${s.percent}%`,
                    transform: `translate(-50%, -50%) ${selected === s._i ? "scale(1.2)" : "scale(1)"}`,
                    background: selected === s._i ? "var(--kami-text)" : s.backgroundColor,
                    border: "2px solid var(--kami-surface-solid)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                  title={`${s.percent}%`}
                  aria-label={`Keyframe at ${s.percent}%`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
      {(!isMetro || metroCPivot === "code") && (
        <div className="p-4">
          <pre
            className="overflow-x-auto p-4 text-xs leading-relaxed"
            style={{
              background: "var(--kami-overlay-bg, #0d1117)",
              color: "var(--kami-overlay-text, #f1f5f9)",
              borderRadius: "var(--kami-input-radius, 0.5rem)",
              maxHeight: 500,
            }}
          >
            <code>{css}</code>
          </pre>
        </div>
      )}
    </ToolShell>
  );
}
