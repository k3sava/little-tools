"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment } from "@/components/tools/controls";

/* ─── Types ─── */

type EditorMode = "cubic-bezier" | "linear";
type OutputFormat = "function" | "transition" | "animation" | "linear";

interface CubicBezier {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface LinearPoint {
  value: number;
  position: number;
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
  { name: "back-in-out", bezier: { x1: 0.68, y1: -0.55, x2: 0.265, y2: 1.55 } },
  { name: "back-out", bezier: { x1: 0.175, y1: 0.885, x2: 0.32, y2: 1.275 } },
  { name: "expo-in", bezier: { x1: 0.95, y1: 0.05, x2: 0.795, y2: 0.035 } },
  { name: "expo-out", bezier: { x1: 0.19, y1: 1, x2: 0.22, y2: 1 } },
  { name: "snappy", bezier: { x1: 0.5, y1: 0, x2: 0.2, y2: 1 } },
  { name: "anticipate", bezier: { x1: 0.6, y1: -0.28, x2: 0.735, y2: 0.045 } },
  { name: "spring", bezier: { x1: 0.5, y1: 1.5, x2: 0.7, y2: 1 } },
  { name: "bounce", bezier: { x1: 0.6, y1: -0.6, x2: 0.4, y2: 1.6 } },
];

const SPRING_LINEAR: LinearPoint[] = [
  { value: 0, position: 0 },
  { value: 0.7, position: 25 },
  { value: 1.1, position: 45 },
  { value: 0.95, position: 65 },
  { value: 1.02, position: 80 },
  { value: 1, position: 100 },
];

/* ─── Helpers ─── */

function toSVG(nx: number, ny: number): [number, number] {
  return [PAD + nx * INNER, PAD + (1 - ny) * INNER];
}

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
  const lines: React.ReactNode[] = [];
  for (let i = 0; i <= GRID_LINES; i++) {
    const pos = PAD + (i / GRID_LINES) * INNER;
    lines.push(
      <line key={`h${i}`} x1={PAD} y1={pos} x2={PAD + INNER} y2={pos} stroke="var(--kami-border)" strokeWidth={1} />,
      <line key={`v${i}`} x1={pos} y1={PAD} x2={pos} y2={PAD + INNER} stroke="var(--kami-border)" strokeWidth={1} />,
    );
  }
  return <>{lines}</>;
}

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
    const cx = Math.max(0, Math.min(1, nx));
    const cy = Math.max(-0.5, Math.min(1.5, ny));
    if (dragging.current === "p1") onChange({ ...bezier, x1: cx, y1: cy });
    else onChange({ ...bezier, x2: cx, y2: cy });
  }, [bezier, onChange, getSVGPoint]);

  const onPointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CANVAS} ${CANVAS}`}
      className="block h-full w-full max-w-[420px] select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      style={{ touchAction: "none" }}
    >
      <rect x={0} y={0} width={CANVAS} height={CANVAS} fill="var(--kami-surface-solid)" rx={12} />
      <GridSVG />
      <line x1={p0x} y1={p0y} x2={p3x} y2={p3y} stroke="var(--kami-border-strong)" strokeWidth={1} strokeDasharray="4 4" />
      <line x1={p0x} y1={p0y} x2={p1x} y2={p1y} stroke="var(--kami-text-dim)" strokeWidth={1} strokeDasharray="3 3" />
      <line x1={p3x} y1={p3y} x2={p2x} y2={p2y} stroke="var(--kami-text-dim)" strokeWidth={1} strokeDasharray="3 3" />
      <path d={curvePath} fill="none" stroke="var(--kami-text)" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={p0x} cy={p0y} r={4} fill="var(--kami-text-dim)" />
      <circle cx={p3x} cy={p3y} r={4} fill="var(--kami-text-dim)" />
      <circle
        cx={p1x}
        cy={p1y}
        r={11}
        fill="#3b82f6"
        stroke="white"
        strokeWidth={2}
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown("p1")}
      />
      <circle
        cx={p2x}
        cy={p2y}
        r={11}
        fill="#ef4444"
        stroke="white"
        strokeWidth={2}
        className="cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown("p2")}
      />
    </svg>
  );
}

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
      className="block h-full w-full max-w-[420px] cursor-crosshair select-none"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onClick={onCanvasClick}
      style={{ touchAction: "none" }}
    >
      <rect x={0} y={0} width={CANVAS} height={CANVAS} fill="var(--kami-surface-solid)" rx={12} />
      <GridSVG />
      <line x1={PAD} y1={PAD + INNER} x2={PAD + INNER} y2={PAD} stroke="var(--kami-border-strong)" strokeWidth={1} strokeDasharray="4 4" />
      {pathD && <path d={pathD} fill="none" stroke="var(--kami-text)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {sorted.map((p, i) => {
        const [cx, cy] = toSVG(p.position / 100, p.value);
        const origIdx = points.indexOf(p);
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={9}
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

function AnimationPreview({
  easingCSS,
  duration,
  playKey,
}: {
  easingCSS: string;
  duration: number;
  playKey: number;
}) {
  return (
    <div className="space-y-2">
      <div
        className="relative h-10 overflow-hidden"
        style={{
          background: "var(--kami-surface)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-card-radius, 0.5rem)",
          containerType: "inline-size",
        }}
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium" style={{ color: "var(--kami-text-dim)" }}>custom</div>
        <div
          key={`custom-${playKey}`}
          className="absolute top-1 left-1 h-8 w-8 rounded-lg"
          style={{
            background: "var(--kami-cta-bg, #111827)",
            transform: playKey > 0 ? "translateX(calc(100cqw - 40px))" : "translateX(0)",
            transition: playKey > 0 ? `transform ${duration}s ${easingCSS}` : "none",
          }}
        />
      </div>
      <div
        className="relative h-10 overflow-hidden"
        style={{
          background: "var(--kami-surface)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-card-radius, 0.5rem)",
          containerType: "inline-size",
        }}
      >
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-medium" style={{ color: "var(--kami-text-dim)" }}>linear</div>
        <div
          key={`linear-${playKey}`}
          className="absolute top-1 left-1 h-8 w-8 rounded-lg"
          style={{
            background: "var(--kami-text-dim, #9ca3af)",
            transform: playKey > 0 ? "translateX(calc(100cqw - 40px))" : "translateX(0)",
            transition: playKey > 0 ? `transform ${duration}s linear` : "none",
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
  const [outputFmt, setOutputFmt] = useState<OutputFormat>("function");
  const [copied, setCopied] = useState(false);
  const [playKey, setPlayKey] = useState(0);

  const easingCSS = mode === "cubic-bezier" ? bezierStr(bezier) : linearStr(linearPoints);

  const outputCode = useMemo(() => {
    switch (outputFmt) {
      case "function": return easingCSS;
      case "transition": return `transition-timing-function: ${easingCSS};`;
      case "animation": return `animation-timing-function: ${easingCSS};`;
      case "linear": return linearStr(linearPoints);
    }
  }, [outputFmt, easingCSS, linearPoints]);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(outputCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [outputCode]);

  const play = useCallback(() => {
    setPlayKey(0);
    requestAnimationFrame(() => setPlayKey((k) => k + 1));
  }, []);

  // Auto-play once on changes
  useEffect(() => {
    play();
  }, [easingCSS, duration, play]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "Enter", meta: true, action: copy, label: "Copy CSS" },
        { key: " ", action: play, label: "Play preview" },
      ],
      [copy, play],
    ),
  );

  const applyPreset = (preset: Preset) => {
    setBezier({ ...preset.bezier });
    if (mode !== "cubic-bezier") setMode("cubic-bezier");
  };

  const applySpringLinear = () => {
    setLinearPoints(SPRING_LINEAR.map((p) => ({ ...p })));
    if (mode !== "linear") setMode("linear");
  };

  return (
    <ToolShell
      title="Easing Editor"
      tagline="cubic-bezier and linear() curves with draggable handles and a live ball preview"
      accent="#8b5cf6"
      actions={
        <>
          <Segment
            value={mode}
            onChange={setMode}
            options={[
              { value: "cubic-bezier", label: "cubic-bezier()" },
              { value: "linear", label: "linear()" },
            ]}
            size="sm"
          />
          <ToolActionButton onClick={play} variant="outline">Play</ToolActionButton>
          <ToolActionButton onClick={copy} variant="solid">{copied ? "Copied!" : "Copy"}</ToolActionButton>
        </>
      }
      controls={
        <>
          {mode === "cubic-bezier" ? (
            <>
              <ControlGroup label="Presets">
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.map((p) => {
                    const active =
                      p.bezier.x1 === bezier.x1 &&
                      p.bezier.y1 === bezier.y1 &&
                      p.bezier.x2 === bezier.x2 &&
                      p.bezier.y2 === bezier.y2;
                    return (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="px-2.5 py-2 text-xs font-mono"
                        style={{
                          background: active ? "var(--kami-cta-bg)" : "var(--kami-surface)",
                          color: active ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                          border: "1px solid var(--kami-border-strong)",
                          borderRadius: "var(--kami-cta-radius, 0.5rem)",
                          minHeight: 40,
                        }}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </ControlGroup>

              <ControlGroup label="Control point P1 X" hint={fmt(bezier.x1)}>
                <Slider value={bezier.x1} onChange={(v) => setBezier((b) => ({ ...b, x1: v }))} min={0} max={1} step={0.01} />
              </ControlGroup>
              <ControlGroup label="Control point P1 Y" hint={fmt(bezier.y1)}>
                <Slider value={bezier.y1} onChange={(v) => setBezier((b) => ({ ...b, y1: v }))} min={-0.5} max={1.5} step={0.01} />
              </ControlGroup>
              <ControlGroup label="Control point P2 X" hint={fmt(bezier.x2)}>
                <Slider value={bezier.x2} onChange={(v) => setBezier((b) => ({ ...b, x2: v }))} min={0} max={1} step={0.01} />
              </ControlGroup>
              <ControlGroup label="Control point P2 Y" hint={fmt(bezier.y2)}>
                <Slider value={bezier.y2} onChange={(v) => setBezier((b) => ({ ...b, y2: v }))} min={-0.5} max={1.5} step={0.01} />
              </ControlGroup>
            </>
          ) : (
            <>
              <ControlGroup label="Spring preset">
                <button
                  type="button"
                  onClick={applySpringLinear}
                  className="px-3 py-2 text-sm w-full"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    minHeight: 40,
                  }}
                >
                  Spring overshoot
                </button>
              </ControlGroup>
              <ControlGroup>
                <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  Tap the canvas to add a stop. Double-click a stop to remove it.
                  Drag to position.
                </p>
              </ControlGroup>
            </>
          )}

          <ControlGroup label="Duration" hint={`${duration.toFixed(1)}s`}>
            <Slider value={duration} onChange={setDuration} min={0.2} max={3} step={0.1} unit="s" />
          </ControlGroup>

          <ControlGroup label="Output format">
            <Segment
              value={outputFmt}
              onChange={setOutputFmt}
              options={[
                { value: "function", label: "value" },
                { value: "transition", label: "trans" },
                { value: "animation", label: "anim" },
                { value: "linear", label: "linear()" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>

          <ControlGroup label="CSS">
            <pre
              className="overflow-x-auto p-3 text-xs"
              style={{
                background: "var(--kami-overlay-bg, #0d1117)",
                color: "var(--kami-overlay-text, #f1f5f9)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                maxHeight: 200,
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
            Drag the blue and red dots on the cubic-bezier canvas to shape the curve.
            Y values can overshoot 0..1 for back / bounce effects.
          </p>
          <p className="text-xs">
            linear() mode unlocks multi-stop easing — great for spring motion in modern
            browsers without JS.
          </p>
        </div>
      }
    >
      <div className="flex h-full min-h-[60vh] w-full flex-col gap-4 p-4">
        <div
          className="flex flex-1 flex-col items-center justify-center gap-3 p-4"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
          }}
        >
          {mode === "cubic-bezier" ? (
            <BezierCanvas bezier={bezier} onChange={setBezier} />
          ) : (
            <LinearCanvas points={linearPoints} onChange={setLinearPoints} />
          )}
          <code className="text-xs font-mono" style={{ color: "var(--kami-text-muted)" }}>
            {easingCSS}
          </code>
        </div>

        <div
          className="p-4"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
          }}
        >
          <div className="mb-2 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-muted)" }}>
            <span className="font-semibold">Preview</span>
            <span className="font-mono">{duration.toFixed(1)}s</span>
          </div>
          <AnimationPreview easingCSS={easingCSS} duration={duration} playKey={playKey} />
        </div>
      </div>
    </ToolShell>
  );
}
