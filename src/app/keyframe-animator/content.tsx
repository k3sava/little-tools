"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

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
  const [config, setConfig] = useState<AnimationConfig>({
    name: "my-animation",
    duration: 1,
    timing: "ease",
    iterations: "1",
    direction: "normal",
    fillMode: "forwards",
  });
  const [copied, setCopied] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const previewRef = useRef<HTMLDivElement>(null);

  const css = useMemo(() => generateCSS(config, stops), [config, stops]);

  // Replay animation when anything changes
  useEffect(() => {
    setAnimKey((k) => k + 1);
  }, [css]);

  /* -- Actions -- */

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [css]);

  useKeyboardShortcuts(
    useMemo(() => [{ key: "Enter", meta: true, action: copyCSS, label: "Copy CSS" }], [copyCSS]),
  );

  const addStop = () => {
    // Pick a midpoint between existing stops
    const sorted = [...stops].sort((a, b) => a.percent - b.percent);
    let newPercent = 50;
    if (sorted.length >= 2) {
      // Find the widest gap
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

  const replay = () => setAnimKey((k) => k + 1);

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
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Keyframe Animator</h1>
        <p className="mt-2 text-gray-500">Build CSS @keyframes animations visually. Drag the timeline, tweak properties, copy the CSS.</p>

        {/* Presets */}
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-medium text-gray-700">Presets</h2>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 shadow-sm transition hover:bg-gray-50 hover:shadow"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
          {/* Left column: preview + timeline + CSS output */}
          <div className="space-y-4">
            {/* Live Preview */}
            <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="relative flex items-center justify-center bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#fff_0%_50%)] bg-[length:20px_20px] min-h-[280px]">
                <div
                  ref={previewRef}
                  key={animKey}
                  className="h-20 w-20 rounded-xl"
                  style={{
                    backgroundColor: current.backgroundColor,
                    animation: `__kf_preview__ ${config.duration}s ${config.timing} ${config.iterations === "infinite" ? "infinite" : config.iterations} ${config.direction} ${config.fillMode}`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-2">
                <span className="text-xs text-gray-400">Live preview</span>
                <button
                  onClick={replay}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  Replay
                </button>
              </div>
            </div>

            {/* Timeline */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">Timeline</h2>
                <button
                  onClick={addStop}
                  className="rounded border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  + Add Keyframe
                </button>
              </div>

              {/* Timeline bar */}
              <div className="relative h-10 rounded-lg bg-gray-100 border border-gray-200">
                {/* Tick marks */}
                {[0, 25, 50, 75, 100].map((t) => (
                  <div
                    key={t}
                    className="absolute top-0 h-full border-l border-gray-200"
                    style={{ left: `${t}%` }}
                  >
                    <span className="absolute -top-5 -translate-x-1/2 text-[10px] text-gray-400">{t}%</span>
                  </div>
                ))}
                {/* Keyframe dots */}
                {sorted.map((s) => (
                  <button
                    key={s._i}
                    onClick={() => setSelected(s._i)}
                    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 rounded-full border-2 transition-all ${
                      selected === s._i
                        ? "border-gray-900 bg-gray-900 scale-125 shadow-md"
                        : "border-gray-400 bg-white hover:border-gray-600 hover:scale-110"
                    }`}
                    style={{ left: `${s.percent}%` }}
                    title={`${s.percent}%`}
                  />
                ))}
              </div>

              {/* Keyframe list */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {sorted.map((s) => (
                  <div
                    key={s._i}
                    onClick={() => setSelected(s._i)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                      selected === s._i
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <span className="font-mono">{s.percent}%</span>
                    <div className="h-3 w-3 rounded-full border border-gray-300" style={{ backgroundColor: s.backgroundColor }} />
                    {stops.length > 2 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeStop(s._i); }}
                        className={`ml-0.5 ${selected === s._i ? "text-gray-300 hover:text-white" : "text-gray-400 hover:text-red-500"}`}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CSS Output */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">Generated CSS</h2>
                <button
                  onClick={copyCSS}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm leading-relaxed text-gray-100">
                <code>{css}</code>
              </pre>
            </div>
          </div>

          {/* Right column: controls */}
          <div className="space-y-4">
            {/* Animation Name */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <label className="mb-2 block text-sm font-medium text-gray-700">Animation Name</label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value.replace(/[^a-zA-Z0-9_-]/g, "") }))}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-mono text-sm outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-300"
              />
            </div>

            {/* Keyframe Properties */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-medium text-gray-700">
                Keyframe at <span className="font-mono">{current.percent}%</span>
              </h2>
              <div className="space-y-3">
                {/* Percent */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Position</label>
                    <span className="font-mono text-xs text-gray-400">{current.percent}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={current.percent}
                    onChange={(e) => updateStop(selected, { percent: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                </div>
                {/* Opacity */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Opacity</label>
                    <span className="font-mono text-xs text-gray-400">{current.opacity}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={current.opacity}
                    onChange={(e) => updateStop(selected, { opacity: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                </div>
                {/* Translate X */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Translate X</label>
                    <span className="font-mono text-xs text-gray-400">{current.translateX}px</span>
                  </div>
                  <input
                    type="range"
                    min={-200}
                    max={200}
                    value={current.translateX}
                    onChange={(e) => updateStop(selected, { translateX: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                </div>
                {/* Translate Y */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Translate Y</label>
                    <span className="font-mono text-xs text-gray-400">{current.translateY}px</span>
                  </div>
                  <input
                    type="range"
                    min={-200}
                    max={200}
                    value={current.translateY}
                    onChange={(e) => updateStop(selected, { translateY: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                </div>
                {/* Scale */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Scale</label>
                    <span className="font-mono text-xs text-gray-400">{current.scale}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={0.05}
                    value={current.scale}
                    onChange={(e) => updateStop(selected, { scale: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                </div>
                {/* Rotate */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Rotate</label>
                    <span className="font-mono text-xs text-gray-400">{current.rotate}deg</span>
                  </div>
                  <input
                    type="range"
                    min={-360}
                    max={360}
                    value={current.rotate}
                    onChange={(e) => updateStop(selected, { rotate: Number(e.target.value) })}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                </div>
                {/* Background Color */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Background Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={current.backgroundColor}
                      onChange={(e) => updateStop(selected, { backgroundColor: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded border border-gray-200"
                    />
                    <input
                      type="text"
                      value={current.backgroundColor}
                      onChange={(e) => updateStop(selected, { backgroundColor: e.target.value })}
                      className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 font-mono text-xs outline-none focus:border-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Animation Controls */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-medium text-gray-700">Animation Controls</h2>
              <div className="space-y-3">
                {/* Duration */}
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Duration</label>
                    <span className="font-mono text-xs text-gray-400">{config.duration}s</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={5}
                    step={0.1}
                    value={config.duration}
                    onChange={(e) => setConfig((c) => ({ ...c, duration: Number(e.target.value) }))}
                    className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                </div>
                {/* Timing Function */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Timing Function</label>
                  <select
                    value={config.timing}
                    onChange={(e) => setConfig((c) => ({ ...c, timing: e.target.value as TimingFunction }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
                  >
                    {(["ease", "linear", "ease-in", "ease-out", "ease-in-out"] as TimingFunction[]).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {/* Iteration Count */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Iterations</label>
                  <div className="flex gap-1.5">
                    {(["1", "2", "3", "infinite"] as IterationCount[]).map((v) => (
                      <button
                        key={v}
                        onClick={() => setConfig((c) => ({ ...c, iterations: v }))}
                        className={`flex-1 rounded-lg px-2 py-1 text-xs capitalize ${
                          config.iterations === v ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {v === "infinite" ? "\u221e" : v}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Direction */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Direction</label>
                  <select
                    value={config.direction}
                    onChange={(e) => setConfig((c) => ({ ...c, direction: e.target.value as Direction }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm outline-none focus:border-gray-400"
                  >
                    {(["normal", "reverse", "alternate", "alternate-reverse"] as Direction[]).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                {/* Fill Mode */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Fill Mode</label>
                  <div className="flex gap-1.5">
                    {(["none", "forwards", "backwards", "both"] as FillMode[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setConfig((c) => ({ ...c, fillMode: f }))}
                        className={`flex-1 rounded-lg px-1.5 py-1 text-[11px] capitalize ${
                          config.fillMode === f ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
