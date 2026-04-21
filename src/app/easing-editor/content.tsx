"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

/* ─── Types ─── */

type EditorMode = "cubic-bezier" | "linear";

interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface LinearPoint {
  value: number;
  position: number; // percentage 0-100
}

interface Preset {
  name: string;
  bezier: CubicBezier;
}

/* ─── Constants ─── */

const CANVAS = 300;
const PAD = 24;
const INNER = CANVAS - PAD * 2;
const GRID_LINES = 4;

const PRESETS: Preset[] = [
  { name: "linear", bezier: { x1: 0, y1: 0, x2: 1, y2: 1 } },
  { name: "ease", bezier: { x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 } },
  { name: "ease-in", bezier: { x1: 0.42, y1: 0, x2: 1, y2: 1 } },
  { name: "ease-out", bezier: { x1: 0, y1: 0, x2: 0.58, y2: 1 } },
  { name: "ease-in-out", bezier: { x1: 0.42, y1: 0, x2: 0.58, y2: 1 } },
  { name: "ease-in-quad", bezier: { x1: 0.55, y1: 0.085, x2: 0.68, y2: 0.53 } },
  { name: "ease-out-cubic", bezier: { x1: 0.215, y1: 0.61, x2: 0.355, y2: 1 } },
  { name: "ease-in-out-back", bezier: { x1: 0.68, y1: -0.55, x2: 0.265, y2: 1.55 } },
  { name: "ease-out-back", bezier: { x1: 0.175, y1: 0.885, x2: 0.32, y2: 1.275 } },
  { name: "ease-in-expo", bezier: { x1: 0.95, y1: 0.05, x2: 0.795, y2: 0.035 } },
  { name: "ease-out-expo", bezier: { x1: 0.19, y1: 1, x2: 0.22, y2: 1 } },
  { name: "snappy", bezier: { x1: 0.5, y1: 0, x2: 0.2, y2: 1 } },
];

/* ─── Helpers ─── */

/** Convert normalized (0..1 with possible overshoot) to SVG pixel coords */
function toSVG(nx: number, ny: number): [number, number] {
  return [PAD + nx * INNER, PAD + (1 - ny) * INNER];
}

/** Convert SVG pixel coords to normalized */
function fromSVG(sx: number, sy: number): [number, number] {
  return [
    Math.round(((sx - PAD) / INNER) * 1000) / 1000,
    Math.round(((1 - (sy - PAD) / INNER)) * 1000) / 1000,
  ];
}

function fmt(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, (m) => (m === "." ? "" : m)).replace(/^(-?)\./, "$10.");
}

function bezierStr(b: CubicBezier): string {
  return `cubic-bezier(${fmt(b.x1)}, ${fmt(b.y1)}, ${fmt(b.x2)}, ${fmt(b.y2)})`;
}

function linearStr(points: LinearPoint[]): string {
  const sorted = [...points].sort((a, b) => a.position - b.position);
  const parts = sorted.map((p) => {
    const val = fmt(p.value);
    const pos = Math.round(p.position);
    if (pos === 0 && p === sorted[0]) return val;
    if (pos === 100 && p === sorted[sorted.length - 1]) return val;
    return `${val} ${pos}%`;
  });
  return `linear(${parts.join(", ")})`;
}

/* ─── Components ─── */

function GridSVG() {
  const lines = [];
  for (let i = 0; i <= GRID_LINES; i++) {
    const pos = PAD + (i / GRID_LINES) * INNER;
    lines.push(
      <line key={`h${i}`} x1={PAD} y1={pos} x2={PAD + INNER} y2={pos} stroke="#e5e7eb" strokeWidth={1} />,
      <line key={`v${i}`} x1={pos} y1={PAD} x2={pos} y2={PAD + INNER} stroke="#e5e7eb" strokeWidth={1} />,
    );
  }
  return <>{lines}</>;
}

/* ─── Bezier Canvas ─── */

function BezierCanvas({
  bezier,
  onChange,
}: {
  bezier: CubicBezier;
  onChange: (b: CubicBezier) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<"p1" | "p2" | null>(null);

  const [p0x, p0y] = toSVG(0, 0);
  const [p3x, p3y] = toSVG(1, 1);
  const [p1x, p1y] = toSVG(bezier.x1, bezier.y1);
  const [p2x, p2y] = toSVG(bezier.x2, bezier.y2);

  const curvePath = `M ${p0x} ${p0y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3x} ${p3y}`;

  const getSVGPoint = useCallback((e: PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0] as [number, number];
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * CANVAS;
    const sy = ((e.clientY - rect.top) / rect.height) * CANVAS;
    return [sx, sy] as [number, number];
  }, []);

  const onPointerDown = useCallback((point: "p1" | "p2") => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = point;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const [sx, sy] = getSVGPoint(e.nativeEvent);
    const [nx, ny] = fromSVG(sx, sy);
    // Clamp x to 0..1, allow y overshoot -0.5..1.5 for bounce/back effects
    const cx = Math.max(0, Math.min(1, nx));
    const cy = Math.max(-0.5, Math.min(1.5, ny));
    if (dragging.current === "p1") {
      onChange({ ...bezier, x1: cx, y1: cy });
    } else {
      onChange({ ...bezier, x2: cx, y2: cy });
    }
  }, [bezier, onChange, getSVGPoint]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      className="w-full max-w-[300px] select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <rect x={0} y={0} width={CANVAS} height={CANVAS} fill="white" rx={12} />
      <GridSVG />
      {/* diagonal reference */}
      <line x1={p0x} y1={p0y} x2={p3x} y2={p3y} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 4" />
      {/* control lines */}
      <line x1={p0x} y1={p0y} x2={p1x} y2={p1y} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 3" />
      <line x1={p3x} y1={p3y} x2={p2x} y2={p2y} stroke="#9ca3af" strokeWidth={1} strokeDasharray="3 3" />
      {/* curve */}
      <path d={curvePath} fill="none" stroke="#111827" strokeWidth={2.5} strokeLinecap="round" />
      {/* endpoints */}
      <circle cx={p0x} cy={p0y} r={4} fill="#6b7280" />
      <circle cx={p3x} cy={p3y} r={4} fill="#6b7280" />
      {/* control points */}
      <circle
        cx={p1x}
        cy={p1y}
        r={7}
        fill="#3b82f6"
        stroke="white"
        strokeWidth={2}
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown("p1")}
      />
      <circle
        cx={p2x}
        cy={p2y}
        r={7}
        fill="#ef4444"
        stroke="white"
        strokeWidth={2}
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown("p2")}
      />
    </svg>
  );
}

/* ─── Linear Canvas ─── */

function LinearCanvas({
  points,
  onChange,
}: {
  points: LinearPoint[];
  onChange: (pts: LinearPoint[]) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef<number | null>(null);

  const sorted = useMemo(() => [...points].sort((a, b) => a.position - b.position), [points]);

  const getSVGPoint = useCallback((e: PointerEvent | React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return [0, 0] as [number, number];
    const rect = svg.getBoundingClientRect();
    const nativeE = "nativeEvent" in e ? e.nativeEvent : e;
    const sx = ((nativeE.clientX - rect.left) / rect.width) * CANVAS;
    const sy = ((nativeE.clientY - rect.top) / rect.height) * CANVAS;
    return [sx, sy] as [number, number];
  }, []);

  const pathD = useMemo(() => {
    if (sorted.length === 0) return "";
    return sorted
      .map((p, i) => {
        const [x, y] = toSVG(p.position / 100, p.value);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [sorted]);

  const onPointerDown = useCallback((idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    dragging.current = idx;
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current === null) return;
    const [sx, sy] = getSVGPoint(e);
    const [nx, ny] = fromSVG(sx, sy);
    const pos = Math.max(0, Math.min(100, Math.round(nx * 100)));
    const val = Math.max(0, Math.min(1, Math.round(ny * 100) / 100));
    const next = [...points];
    next[dragging.current] = { value: val, position: pos };
    onChange(next);
  }, [points, onChange, getSVGPoint]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  const onCanvasClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if ((e.target as Element).tagName === "circle") return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const sx = ((e.clientX - rect.left) / rect.width) * CANVAS;
    const sy = ((e.clientY - rect.top) / rect.height) * CANVAS;
    const [nx, ny] = fromSVG(sx, sy);
    const pos = Math.max(0, Math.min(100, Math.round(nx * 100)));
    const val = Math.max(0, Math.min(1, Math.round(ny * 100) / 100));
    onChange([...points, { value: val, position: pos }]);
  }, [points, onChange]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      className="w-full max-w-[300px] cursor-crosshair select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={onCanvasClick}
    >
      <rect x={0} y={0} width={CANVAS} height={CANVAS} fill="white" rx={12} />
      <GridSVG />
      {/* diagonal reference */}
      <line x1={PAD} y1={PAD + INNER} x2={PAD + INNER} y2={PAD} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 4" />
      {/* line */}
      {pathD && <path d={pathD} fill="none" stroke="#111827" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {/* points */}
      {sorted.map((p, i) => {
        const [cx, cy] = toSVG(p.position / 100, p.value);
        const origIdx = points.indexOf(p);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={6}
            fill="#8b5cf6"
            stroke="white"
            strokeWidth={2}
            className="cursor-grab active:cursor-grabbing"
            onPointerDown={onPointerDown(origIdx)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (points.length > 2) onChange(points.filter((_, j) => j !== origIdx));
            }}
          />
        );
      })}
    </svg>
  );
}

/* ─── Preview ─── */

function AnimationPreview({
  easingCSS,
  duration,
}: {
  easingCSS: string;
  duration: number;
}) {
  const [playing, setPlaying] = useState(false);
  const [key, setKey] = useState(0);

  const play = useCallback(() => {
    setKey((k) => k + 1);
    setPlaying(true);
  }, []);

  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => setPlaying(false), duration * 1000 + 100);
    return () => clearTimeout(timer);
  }, [playing, duration, key]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button
          onClick={play}
          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800"
        >
          {playing ? "Playing..." : "Play"}
        </button>
        <span className="text-xs text-gray-400">{duration}s</span>
      </div>
      {/* Custom easing */}
      <div className="relative h-8 rounded-lg bg-gray-100 overflow-hidden">
        <div className="absolute left-0 top-0 h-full flex items-center px-1">
          <span className="text-[9px] text-gray-400 font-medium">custom</span>
        </div>
        <div
          key={`custom-${key}`}
          className="absolute top-1 left-1 h-6 w-6 rounded-md bg-gray-900"
          style={{
            transform: playing ? "translateX(calc(100cqw - 32px))" : "translateX(0)",
            transition: playing ? `transform ${duration}s ${easingCSS}` : "none",
            containIntrinsicSize: "auto",
          }}
        />
        <style>{`.relative { container-type: inline-size; }`}</style>
      </div>
      {/* Linear reference */}
      <div className="relative h-8 rounded-lg bg-gray-50 overflow-hidden">
        <div className="absolute left-0 top-0 h-full flex items-center px-1">
          <span className="text-[9px] text-gray-400 font-medium">linear</span>
        </div>
        <div
          key={`linear-${key}`}
          className="absolute top-1 left-1 h-6 w-6 rounded-md bg-gray-400"
          style={{
            transform: playing ? "translateX(calc(100cqw - 32px))" : "translateX(0)",
            transition: playing ? `transform ${duration}s linear` : "none",
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main ─── */

export default function EasingEditorContent() {
  const [mode, setMode] = useState<EditorMode>("cubic-bezier");
  const [bezier, setBezier] = useState<CubicBezier>({ x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 });
  const [linearPoints, setLinearPoints] = useState<LinearPoint[]>([
    { value: 0, position: 0 },
    { value: 0.25, position: 30 },
    { value: 0.75, position: 70 },
    { value: 1, position: 100 },
  ]);
  const [duration, setDuration] = useState(0.6);
  const [copied, setCopied] = useState(false);

  const easingCSS = mode === "cubic-bezier" ? bezierStr(bezier) : linearStr(linearPoints);
  const transitionCSS = `transition-timing-function: ${easingCSS};`;
  const animationCSS = `animation-timing-function: ${easingCSS};`;

  const copy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, []);

  const copyCSS = useCallback(() => {
    copy(transitionCSS);
  }, [copy, transitionCSS]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "Enter", meta: true, action: copyCSS, label: "Copy CSS" },
        { key: " ", action: () => document.getElementById("easing-play-btn")?.click(), label: "Play preview" },
      ],
      [copyCSS],
    ),
  );

  const applyPreset = (preset: Preset) => {
    setBezier({ ...preset.bezier });
    if (mode !== "cubic-bezier") setMode("cubic-bezier");
  };

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Easing Curve Editor</h1>
        <p className="mt-2 text-gray-500">
          Design cubic-bezier and linear() easing curves visually. Drag the control points, pick a preset, or switch to linear() mode.
        </p>

        {/* Mode toggle */}
        <div className="mt-6 flex gap-2">
          {(["cubic-bezier", "linear"] as EditorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-lg px-3 py-1.5 text-sm font-mono ${
                mode === m ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m === "cubic-bezier" ? "cubic-bezier()" : "linear()"}
            </button>
          ))}
        </div>

        {/* Presets (cubic-bezier only) */}
        {mode === "cubic-bezier" && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-medium text-gray-700">Presets</h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const active =
                  p.bezier.x1 === bezier.x1 &&
                  p.bezier.y1 === bezier.y1 &&
                  p.bezier.x2 === bezier.x2 &&
                  p.bezier.y2 === bezier.y2;
                return (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-mono transition ${
                      active
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-[auto_1fr]">
          {/* Canvas */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            {mode === "cubic-bezier" ? (
              <BezierCanvas bezier={bezier} onChange={setBezier} />
            ) : (
              <>
                <LinearCanvas points={linearPoints} onChange={setLinearPoints} />
                <p className="mt-2 text-center text-[10px] text-gray-400">
                  Click canvas to add points. Double-click a point to remove.
                </p>
              </>
            )}

            {/* Coordinate inputs (cubic-bezier mode) */}
            {mode === "cubic-bezier" && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-blue-500">P1</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      max={1}
                      value={bezier.x1}
                      onChange={(e) => setBezier((b) => ({ ...b, x1: Math.max(0, Math.min(1, +e.target.value)) }))}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs font-mono text-gray-700 focus:border-blue-400 focus:outline-none"
                    />
                    <input
                      type="number"
                      step={0.01}
                      min={-0.5}
                      max={1.5}
                      value={bezier.y1}
                      onChange={(e) => setBezier((b) => ({ ...b, y1: Math.max(-0.5, Math.min(1.5, +e.target.value)) }))}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs font-mono text-gray-700 focus:border-blue-400 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-red-500">P2</label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      max={1}
                      value={bezier.x2}
                      onChange={(e) => setBezier((b) => ({ ...b, x2: Math.max(0, Math.min(1, +e.target.value)) }))}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs font-mono text-gray-700 focus:border-red-400 focus:outline-none"
                    />
                    <input
                      type="number"
                      step={0.01}
                      min={-0.5}
                      max={1.5}
                      value={bezier.y2}
                      onChange={(e) => setBezier((b) => ({ ...b, y2: Math.max(-0.5, Math.min(1.5, +e.target.value)) }))}
                      className="w-full rounded border border-gray-200 px-2 py-1 text-xs font-mono text-gray-700 focus:border-red-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Preview */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">Preview</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400">Duration</span>
                  <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={duration}
                    onChange={(e) => setDuration(+e.target.value)}
                    className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
                  />
                  <span className="w-8 text-right text-[10px] font-mono text-gray-400">{duration}s</span>
                </div>
              </div>
              <div id="easing-play-btn-wrapper">
                <AnimationPreview easingCSS={easingCSS} duration={duration} />
              </div>
            </div>

            {/* CSS Output */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">CSS Output</h2>
                <button
                  onClick={() => copy(transitionCSS)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="space-y-2">
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                  <code>{transitionCSS}</code>
                </pre>
                <pre className="overflow-x-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                  <code>{animationCSS}</code>
                </pre>
              </div>
            </div>

            {/* Value only */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-medium text-gray-700">Value</h2>
                <button
                  onClick={() => copy(easingCSS)}
                  className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50"
                >
                  Copy
                </button>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-800 font-mono">
                <code>{easingCSS}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
