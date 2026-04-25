"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PresetId =
  | "fade-in"
  | "slide-up"
  | "slide-left"
  | "scale-up"
  | "rotate-in"
  | "blur-in"
  | "clip-reveal"
  | "parallax";

interface Preset {
  id: PresetId;
  label: string;
  icon: string;
  from: Record<string, string>;
  to: Record<string, string>;
}

type TimelineType = "scroll" | "view";
type TimelineAxis = "block" | "inline";
type AnimationDirection = "normal" | "reverse" | "alternate";
type FillMode = "none" | "forwards" | "backwards" | "both";
type RangeName = "entry" | "exit" | "contain" | "cover";

/* ------------------------------------------------------------------ */
/*  Presets                                                            */
/* ------------------------------------------------------------------ */

const PRESETS: Preset[] = [
  {
    id: "fade-in",
    label: "Fade In",
    icon: "O",
    from: { opacity: "0" },
    to: { opacity: "1" },
  },
  {
    id: "slide-up",
    label: "Slide Up",
    icon: "\u2191",
    from: { opacity: "0", transform: "translateY(40px)" },
    to: { opacity: "1", transform: "translateY(0)" },
  },
  {
    id: "slide-left",
    label: "Slide Left",
    icon: "\u2190",
    from: { opacity: "0", transform: "translateX(40px)" },
    to: { opacity: "1", transform: "translateX(0)" },
  },
  {
    id: "scale-up",
    label: "Scale Up",
    icon: "\u2922",
    from: { opacity: "0", transform: "scale(0.8)" },
    to: { opacity: "1", transform: "scale(1)" },
  },
  {
    id: "rotate-in",
    label: "Rotate In",
    icon: "\u21BB",
    from: { opacity: "0", transform: "rotate(-10deg)" },
    to: { opacity: "1", transform: "rotate(0)" },
  },
  {
    id: "blur-in",
    label: "Blur In",
    icon: "\u25CC",
    from: { opacity: "0", filter: "blur(10px)" },
    to: { opacity: "1", filter: "blur(0)" },
  },
  {
    id: "clip-reveal",
    label: "Clip Reveal",
    icon: "\u25A8",
    from: { "clip-path": "inset(0 100% 0 0)" },
    to: { "clip-path": "inset(0 0 0 0)" },
  },
  {
    id: "parallax",
    label: "Parallax",
    icon: "\u2195",
    from: { transform: "translateY(60px)" },
    to: { transform: "translateY(-60px)" },
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function propsToCSS(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
}

function buildCSS(
  preset: Preset,
  timelineType: TimelineType,
  timelineAxis: TimelineAxis,
  rangeStart: RangeName,
  rangeStartPct: number,
  rangeEnd: RangeName,
  rangeEndPct: number,
  direction: AnimationDirection,
  fillMode: FillMode,
  durationAuto: boolean,
  durationMs: number,
): string {
  const name = preset.id;
  let css = `@keyframes ${name} {\n  from {\n${propsToCSS(preset.from)}\n  }\n  to {\n${propsToCSS(preset.to)}\n  }\n}\n\n`;

  const dur = durationAuto ? "auto" : `${durationMs}ms`;
  css += `.animated-element {\n`;
  css += `  animation: ${name} linear ${direction} ${fillMode};\n`;
  if (!durationAuto) css += `  animation-duration: ${dur};\n`;

  if (timelineType === "view") {
    css += `  animation-timeline: view(${timelineAxis});\n`;
    css += `  animation-range: ${rangeStart} ${rangeStartPct}% ${rangeEnd} ${rangeEndPct}%;\n`;
  } else {
    css += `  animation-timeline: scroll(${timelineAxis});\n`;
  }

  css += `}`;
  return css;
}

function buildHTML(): string {
  return `<div class="animated-element">\n  <!-- your content -->\n</div>`;
}

/* Build inline style for the animated element inside the preview */
function buildPreviewStyle(
  preset: Preset,
  progress: number,
): React.CSSProperties {
  const style: React.CSSProperties = {};
  const from = preset.from;
  const to = preset.to;

  // Interpolate numeric values
  const lerp = (a: number, b: number) => a + (b - a) * progress;

  if (from.opacity !== undefined && to.opacity !== undefined) {
    style.opacity = lerp(parseFloat(from.opacity), parseFloat(to.opacity));
  }

  // Transform
  if (from.transform !== undefined && to.transform !== undefined) {
    style.transform = interpolateTransform(from.transform, to.transform, progress);
  } else if (from.transform !== undefined) {
    style.transform = interpolateTransform(from.transform, "none", progress);
  }

  // Filter (blur)
  if (from.filter !== undefined && to.filter !== undefined) {
    const fromBlur = parseFloat(from.filter.replace(/[^0-9.]/g, "") || "0");
    const toBlur = parseFloat(to.filter.replace(/[^0-9.]/g, "") || "0");
    style.filter = `blur(${lerp(fromBlur, toBlur).toFixed(1)}px)`;
  }

  // Clip-path
  if (from["clip-path"] !== undefined && to["clip-path"] !== undefined) {
    // inset(0 100% 0 0) -> inset(0 0% 0 0)
    const fromRight = parseFloat(from["clip-path"].match(/inset\(0\s+([\d.]+)%/)?.[1] || "0");
    const toRight = parseFloat(to["clip-path"].match(/inset\(0\s+([\d.]+)%/)?.[1] || "0");
    const r = lerp(fromRight, toRight);
    style.clipPath = `inset(0 ${r.toFixed(1)}% 0 0)`;
  }

  return style;
}

function interpolateTransform(from: string, to: string, t: number): string {
  // Extract numeric values from transforms
  const extractVal = (s: string, fn: string): number => {
    const re = new RegExp(`${fn}\\(([^)]+)\\)`);
    const m = s.match(re);
    if (!m) return fn === "scale" ? 1 : 0;
    return parseFloat(m[1]);
  };

  const fns = ["translateY", "translateX", "scale", "rotate"];
  const parts: string[] = [];

  for (const fn of fns) {
    if (from.includes(fn) || to.includes(fn)) {
      const a = extractVal(from, fn);
      const b = extractVal(to === "none" ? "" : to, fn);
      const v = a + (b - a) * t;
      const unit = fn === "scale" ? "" : fn === "rotate" ? "deg" : "px";
      parts.push(`${fn}(${v.toFixed(2)}${unit})`);
    }
  }

  return parts.length > 0 ? parts.join(" ") : "none";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ScrollAnimationContent() {
  const [selectedPreset, setSelectedPreset] = useState<PresetId>("slide-up");
  const [timelineType, setTimelineType] = useState<TimelineType>("view");
  const [timelineAxis, setTimelineAxis] = useState<TimelineAxis>("block");
  const [rangeStart, setRangeStart] = useState<RangeName>("entry");
  const [rangeStartPct, setRangeStartPct] = useState(0);
  const [rangeEnd, setRangeEnd] = useState<RangeName>("entry");
  const [rangeEndPct, setRangeEndPct] = useState(100);
  const [direction, setDirection] = useState<AnimationDirection>("normal");
  const [fillMode, setFillMode] = useState<FillMode>("both");
  const [durationAuto, setDurationAuto] = useState(true);
  const [durationMs, setDurationMs] = useState(600);
  const [copied, setCopied] = useState(false);
  const [copiedHTML, setCopiedHTML] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const preset = PRESETS.find((p) => p.id === selectedPreset)!;

  const css = useMemo(
    () =>
      buildCSS(
        preset,
        timelineType,
        timelineAxis,
        rangeStart,
        rangeStartPct,
        rangeEnd,
        rangeEndPct,
        direction,
        fillMode,
        durationAuto,
        durationMs,
      ),
    [preset, timelineType, timelineAxis, rangeStart, rangeStartPct, rangeEnd, rangeEndPct, direction, fillMode, durationAuto, durationMs],
  );

  const html = useMemo(() => buildHTML(), []);

  /* Track scroll progress */
  useEffect(() => {
    const container = scrollRef.current;
    const target = targetRef.current;
    if (!container || !target) return;

    const onScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      // How far the target has entered the container viewport
      const containerTop = containerRect.top;
      const containerBottom = containerRect.bottom;
      const targetTop = targetRect.top;
      const targetBottom = targetRect.bottom;

      // entry: target bottom enters container bottom -> target top reaches container top
      const totalTravel = containerBottom - containerTop + (targetBottom - targetTop);
      const traveled = containerBottom - targetTop;
      const raw = traveled / totalTravel;
      setProgress(Math.max(0, Math.min(1, raw)));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [selectedPreset]);

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [css]);

  const copyHTML = useCallback(() => {
    navigator.clipboard.writeText(html);
    setCopiedHTML(true);
    setTimeout(() => setCopiedHTML(false), 1200);
  }, [html]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: copyCSS, label: "Copy CSS" }],
      [copyCSS],
    ),
  );

  const RANGE_NAMES: RangeName[] = ["entry", "exit", "contain", "cover"];

  /* ---- Render ---- */

  const selectCls = "px-3 py-2 text-sm focus:outline-none";
  const selectStyle: React.CSSProperties = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  };
  const labelCls = "block text-xs font-medium mb-1";
  const labelStyle: React.CSSProperties = { color: "var(--kami-text-muted)" };

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Scroll Animation Generator"
          tagline="Build modern scroll-driven animations (animation-timeline: scroll/view) with a live preview - no JavaScript required."
          description="Pick a preset (parallax, reveal, progress bar, horizontal-on-scroll) or build your own. Choose between scroll() and view() timelines, set the range, tweak easing, and watch the effect trigger as you scroll the preview frame. Output is vanilla CSS using the new CSS Scroll-Driven Animations spec."
          audience={["Front-end developers", "Designers"]}
          whenToUse={[
            "Adding a subtle parallax or reveal to a marketing page",
            "Building a scroll progress indicator",
            "Exploring what CSS scroll-timeline can do before reaching for JS",
          ]}
        />

        {/* Browser support badge */}
        <div
          className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs"
          style={{
            background: "color-mix(in srgb, #2563eb 10%, var(--kami-surface))",
            color: "color-mix(in srgb, #2563eb 70%, var(--kami-text))",
            border: "1px solid color-mix(in srgb, #2563eb 30%, transparent)",
            borderRadius: "var(--kami-cta-radius, 0.5rem)",
          }}
        >
          <span className="font-medium">Browser support:</span>
          Chrome 115+, Edge 115+. Firefox behind flag.{" "}
          <a
            href="https://caniuse.com/css-animation-timeline"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Can I Use
          </a>
        </div>

        {/* ---- Presets ---- */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--kami-text-muted)" }}>Presets</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESETS.map((p) => {
              const active = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id)}
                  className="flex flex-col items-center justify-center gap-1 px-4 py-4 text-sm font-medium transition-all"
                  style={{
                    background: active
                      ? "var(--kami-cta-bg)"
                      : "var(--kami-surface-solid)",
                    color: active
                      ? "var(--kami-cta-text)"
                      : "var(--kami-text-muted)",
                    border: `1px solid ${active ? "var(--kami-cta-bg)" : "var(--kami-border-strong)"}`,
                    borderRadius: "var(--kami-card-radius, 0.75rem)",
                    boxShadow: "var(--kami-card-shadow, none)",
                  }}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* ---- Main layout: controls + preview ---- */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Controls sidebar */}
          <div className="space-y-5">
            <h2 className="text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>Customize</h2>

            {/* Timeline type */}
            <div>
              <span className={labelCls} style={labelStyle}>Timeline type</span>
              <div className="flex gap-2">
                {(["scroll", "view"] as TimelineType[]).map((t) => {
                  const active = timelineType === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTimelineType(t)}
                      className="px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        background: active ? "var(--kami-cta-bg)" : "var(--kami-surface-solid)",
                        color: active ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                        border: `1px solid ${active ? "var(--kami-cta-bg)" : "var(--kami-border-strong)"}`,
                        borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      }}
                    >
                      {t}()
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timeline axis */}
            <div>
              <span className={labelCls} style={labelStyle}>Axis</span>
              <div className="flex gap-2">
                {(["block", "inline"] as TimelineAxis[]).map((a) => {
                  const active = timelineAxis === a;
                  return (
                    <button
                      key={a}
                      onClick={() => setTimelineAxis(a)}
                      className="px-3 py-1.5 text-sm font-medium transition-colors"
                      style={{
                        background: active ? "var(--kami-cta-bg)" : "var(--kami-surface-solid)",
                        color: active ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                        border: `1px solid ${active ? "var(--kami-cta-bg)" : "var(--kami-border-strong)"}`,
                        borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      }}
                    >
                      {a}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Animation range (view timeline only) */}
            {timelineType === "view" && (
              <div
                className="space-y-3 p-4"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--kami-text-muted)" }}>Animation range</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={labelCls} style={labelStyle}>Start</span>
                    <select
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value as RangeName)}
                      className={selectCls + " w-full"}
                      style={selectStyle}
                    >
                      {RANGE_NAMES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelCls} style={labelStyle}>Start %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rangeStartPct}
                      onChange={(e) => setRangeStartPct(Number(e.target.value))}
                      className={selectCls + " w-full"}
                      style={selectStyle}
                    />
                  </div>
                  <div>
                    <span className={labelCls} style={labelStyle}>End</span>
                    <select
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value as RangeName)}
                      className={selectCls + " w-full"}
                      style={selectStyle}
                    >
                      {RANGE_NAMES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelCls} style={labelStyle}>End %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rangeEndPct}
                      onChange={(e) => setRangeEndPct(Number(e.target.value))}
                      className={selectCls + " w-full"}
                      style={selectStyle}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <span className={labelCls} style={labelStyle}>Duration</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: "var(--kami-text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={durationAuto}
                    onChange={(e) => setDurationAuto(e.target.checked)}
                    style={{ accentColor: "var(--kami-text)" }}
                  />
                  auto
                </label>
                {!durationAuto && (
                  <input
                    type="number"
                    min={100}
                    max={5000}
                    step={100}
                    value={durationMs}
                    onChange={(e) => setDurationMs(Number(e.target.value))}
                    className={selectCls + " w-24"}
                    style={selectStyle}
                  />
                )}
                {!durationAuto && (
                  <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>ms</span>
                )}
              </div>
            </div>

            {/* Direction */}
            <div>
              <span className={labelCls} style={labelStyle}>Direction</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as AnimationDirection)}
                className={selectCls + " w-full"}
                style={selectStyle}
              >
                {(["normal", "reverse", "alternate"] as AnimationDirection[]).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Fill mode */}
            <div>
              <span className={labelCls} style={labelStyle}>Fill mode</span>
              <select
                value={fillMode}
                onChange={(e) => setFillMode(e.target.value as FillMode)}
                className={selectCls + " w-full"}
                style={selectStyle}
              >
                {(["none", "forwards", "backwards", "both"] as FillMode[]).map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ---- Live preview ---- */}
          <div>
            <h2 className="text-sm font-semibold mb-3" style={{ color: "var(--kami-text-muted)" }}>
              Live Preview{" "}
              <span className="text-xs font-normal" style={{ color: "var(--kami-text-dim)" }}>
                scroll to see the animation
              </span>
            </h2>
            <div
              ref={scrollRef}
              className="relative h-[400px] overflow-y-auto"
              style={{
                background: "var(--kami-surface)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              {/* Spacer top */}
              <div className="flex flex-col items-center gap-3 px-6 py-10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`top-${i}`}
                    className="h-14 w-full"
                    style={{
                      background: "color-mix(in srgb, var(--kami-text-dim) 30%, transparent)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  />
                ))}
                <p className="text-xs mt-2" style={{ color: "var(--kami-text-dim)" }}>\u2193 scroll down</p>
              </div>

              {/* Animated element */}
              <div className="flex justify-center px-6 py-8">
                <div
                  ref={targetRef}
                  className="w-full max-w-sm p-8 text-center"
                  style={{
                    background: "var(--kami-surface-solid)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-card-radius, 0.75rem)",
                    boxShadow: "var(--kami-card-shadow, none)",
                    color: "var(--kami-text)",
                    ...buildPreviewStyle(preset, progress),
                  }}
                >
                  <div className="text-3xl mb-2">{preset.icon}</div>
                  <h3 className="font-semibold" style={{ color: "var(--kami-text)" }}>{preset.label}</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                    Animated with scroll-driven CSS
                  </p>
                </div>
              </div>

              {/* Spacer bottom */}
              <div className="flex flex-col items-center gap-3 px-6 py-10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`bot-${i}`}
                    className="h-14 w-full"
                    style={{
                      background: "color-mix(in srgb, var(--kami-text-dim) 30%, transparent)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-2 flex items-center gap-2">
              <div
                className="h-1.5 flex-1 overflow-hidden"
                style={{
                  background: "color-mix(in srgb, var(--kami-text-dim) 30%, transparent)",
                  borderRadius: "999px",
                }}
              >
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${(progress * 100).toFixed(0)}%`,
                    background: "var(--kami-text)",
                    borderRadius: "999px",
                  }}
                />
              </div>
              <span className="text-xs tabular-nums w-10 text-right" style={{ color: "var(--kami-text-dim)" }}>
                {(progress * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* ---- Generated CSS ---- */}
        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>Generated CSS</h2>
          <div
            className="relative overflow-hidden"
            style={{
              background: "var(--kami-overlay-bg, #111827)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <pre
              className="overflow-x-auto p-5 text-sm leading-relaxed font-mono whitespace-pre"
              style={{ color: "var(--kami-overlay-text, #f3f4f6)" }}
            >
              {css}
            </pre>
            <button
              onClick={copyCSS}
              className="absolute right-3 top-3 px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "var(--kami-cta2-bg, var(--kami-surface-solid))",
                color: "var(--kami-cta2-text, var(--kami-text-muted))",
                border: "1px solid var(--kami-cta2-border, var(--kami-border-strong))",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              {copied ? "Copied!" : "Copy CSS"}
            </button>
          </div>

          <h2 className="text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>HTML</h2>
          <div
            className="relative overflow-hidden"
            style={{
              background: "var(--kami-overlay-bg, #111827)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <pre
              className="overflow-x-auto p-5 text-sm leading-relaxed font-mono whitespace-pre"
              style={{ color: "var(--kami-overlay-text, #f3f4f6)" }}
            >
              {html}
            </pre>
            <button
              onClick={copyHTML}
              className="absolute right-3 top-3 px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: "var(--kami-cta2-bg, var(--kami-surface-solid))",
                color: "var(--kami-cta2-text, var(--kami-text-muted))",
                border: "1px solid var(--kami-cta2-border, var(--kami-border-strong))",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            >
              {copiedHTML ? "Copied!" : "Copy HTML"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
