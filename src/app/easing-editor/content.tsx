"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

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
          id="easing-play-btn"
          onClick={play}
          className="px-3 py-1.5 text-xs font-medium"
          style={{
            background: "var(--kami-cta-bg, #111827)",
            color: "var(--kami-cta-text, #ffffff)",
            borderRadius: "var(--kami-cta-radius, 0.5rem)",
          }}
        >
          {playing ? "Playing..." : "Play"}
        </button>
        <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>{duration}s</span>
      </div>
      {/* Custom easing */}
      <div
        className="relative h-8 overflow-hidden"
        style={{
          background: "var(--kami-surface)",
          borderRadius: "var(--kami-card-radius, 0.5rem)",
        }}
      >
        <div className="absolute left-0 top-0 h-full flex items-center px-1">
          <span className="text-[9px] font-medium" style={{ color: "var(--kami-text-dim)" }}>custom</span>
        </div>
        <div
          key={`custom-${key}`}
          className="absolute top-1 left-1 h-6 w-6"
          style={{
            background: "var(--kami-cta-bg, #111827)",
            borderRadius: "var(--kami-cta-radius, 0.375rem)",
            transform: playing ? "translateX(calc(100cqw - 32px))" : "translateX(0)",
            transition: playing ? `transform ${duration}s ${easingCSS}` : "none",
            containIntrinsicSize: "auto",
          }}
        />
        <style>{`.relative { container-type: inline-size; }`}</style>
      </div>
      {/* Linear reference */}
      <div
        className="relative h-8 overflow-hidden"
        style={{
          background: "var(--kami-surface)",
          borderRadius: "var(--kami-card-radius, 0.5rem)",
        }}
      >
        <div className="absolute left-0 top-0 h-full flex items-center px-1">
          <span className="text-[9px] font-medium" style={{ color: "var(--kami-text-dim)" }}>linear</span>
        </div>
        <div
          key={`linear-${key}`}
          className="absolute top-1 left-1 h-6 w-6"
          style={{
            background: "var(--kami-text-dim, #9ca3af)",
            borderRadius: "var(--kami-cta-radius, 0.375rem)",
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
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Easing Curve Editor"
          tagline="Design cubic-bezier() and linear() easing curves visually - drag handles, watch the animation preview, copy the CSS."
          description="Edit the bezier curve by dragging its control points. A sample ball animates in real time so you feel the motion, not just see the curve. linear() mode unlocks multi-stop easing for spring-like motion (supported in modern browsers). Presets mirror Apple, Material, and popular animation libraries."
          audience={["Designers", "Motion designers", "Front-end devs"]}
          whenToUse={[
            "Tuning the feel of a hover or modal transition",
            "Matching an easing curve from a design system",
            "Building a springy / bouncy effect with linear()",
          ]}
        />

        {/* Mode toggle */}
        <div className="mt-6 flex gap-2">
          {(["cubic-bezier", "linear"] as EditorMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-3 py-1.5 text-sm font-mono"
              style={
                mode === m
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
              {m === "cubic-bezier" ? "cubic-bezier()" : "linear()"}
            </button>
          ))}
        </div>

        {/* Presets (cubic-bezier only) */}
        {mode === "cubic-bezier" && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Presets</h2>
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
                    className="px-2.5 py-1 text-xs font-mono transition"
                    style={
                      active
                        ? {
                            background: "var(--kami-cta-bg, #111827)",
                            color: "var(--kami-cta-text, #ffffff)",
                            border: "1px solid var(--kami-cta-bg, #111827)",
                            borderRadius: "var(--kami-cta-radius, 0.5rem)",
                          }
                        : {
                            background: "var(--kami-surface-solid)",
                            color: "var(--kami-text-muted)",
                            border: "1px solid var(--kami-border-strong)",
                            borderRadius: "var(--kami-cta-radius, 0.5rem)",
                          }
                    }
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
          <div
            className="p-4"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            {mode === "cubic-bezier" ? (
              <BezierCanvas bezier={bezier} onChange={setBezier} />
            ) : (
              <>
                <LinearCanvas points={linearPoints} onChange={setLinearPoints} />
                <p className="mt-2 text-center text-[10px]" style={{ color: "var(--kami-text-dim)" }}>
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
                      className="w-full px-2 py-1 text-xs font-mono focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.25rem)",
                      }}
                    />
                    <input
                      type="number"
                      step={0.01}
                      min={-0.5}
                      max={1.5}
                      value={bezier.y1}
                      onChange={(e) => setBezier((b) => ({ ...b, y1: Math.max(-0.5, Math.min(1.5, +e.target.value)) }))}
                      className="w-full px-2 py-1 text-xs font-mono focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.25rem)",
                      }}
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
                      className="w-full px-2 py-1 text-xs font-mono focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.25rem)",
                      }}
                    />
                    <input
                      type="number"
                      step={0.01}
                      min={-0.5}
                      max={1.5}
                      value={bezier.y2}
                      onChange={(e) => setBezier((b) => ({ ...b, y2: Math.max(-0.5, Math.min(1.5, +e.target.value)) }))}
                      className="w-full px-2 py-1 text-xs font-mono focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.25rem)",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Preview */}
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
                <h2 className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Preview</h2>
                <div className="flex items-center gap-2">
                  <span className="text-[10px]" style={{ color: "var(--kami-text-dim)" }}>Duration</span>
                  <input
                    type="range"
                    min={0.2}
                    max={3}
                    step={0.1}
                    value={duration}
                    onChange={(e) => setDuration(+e.target.value)}
                    className="h-1 w-24 cursor-pointer appearance-none rounded-full"
                    style={{
                      background: "var(--kami-border)",
                      accentColor: "var(--kami-text)",
                    }}
                  />
                  <span className="w-8 text-right text-[10px] font-mono" style={{ color: "var(--kami-text-dim)" }}>{duration}s</span>
                </div>
              </div>
              <div id="easing-play-btn-wrapper">
                <AnimationPreview easingCSS={easingCSS} duration={duration} />
              </div>
            </div>

            {/* CSS Output */}
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
                <h2 className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>CSS Output</h2>
                <button
                  onClick={() => copy(transitionCSS)}
                  className="px-2 py-1 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                  }}
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="space-y-2">
                <pre
                  className="overflow-x-auto p-3 text-xs"
                  style={{
                    background: "var(--kami-overlay-bg, #111827)",
                    color: "var(--kami-overlay-text, #f3f4f6)",
                    borderRadius: "var(--kami-card-radius, 0.5rem)",
                  }}
                >
                  <code>{transitionCSS}</code>
                </pre>
                <pre
                  className="overflow-x-auto p-3 text-xs"
                  style={{
                    background: "var(--kami-overlay-bg, #111827)",
                    color: "var(--kami-overlay-text, #f3f4f6)",
                    borderRadius: "var(--kami-card-radius, 0.5rem)",
                  }}
                >
                  <code>{animationCSS}</code>
                </pre>
              </div>
            </div>

            {/* Value only */}
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
                <h2 className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Value</h2>
                <button
                  onClick={() => copy(easingCSS)}
                  className="px-2 py-1 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                  }}
                >
                  Copy
                </button>
              </div>
              <pre
                className="overflow-x-auto p-3 text-xs font-mono"
                style={{
                  background: "var(--kami-surface)",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.5rem)",
                }}
              >
                <code>{easingCSS}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
