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

  const selectCls = "rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300";
  const labelCls = "block text-xs font-medium text-gray-500 mb-1";

  return (
    <div className="min-h-screen text-gray-900">
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
        <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-700">
          <span className="font-medium">Browser support:</span>
          Chrome 115+, Edge 115+. Firefox behind flag.{" "}
          <a
            href="https://caniuse.com/css-animation-timeline"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-blue-900"
          >
            Can I Use
          </a>
        </div>

        {/* ---- Presets ---- */}
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Presets</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPreset(p.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl border px-4 py-4 text-sm font-medium transition-all ${
                  selectedPreset === p.id
                    ? "border-gray-900 bg-gray-900 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 shadow-sm"
                }`}
              >
                <span className="text-lg">{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* ---- Main layout: controls + preview ---- */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Controls sidebar */}
          <div className="space-y-5">
            <h2 className="text-sm font-semibold text-gray-700">Customize</h2>

            {/* Timeline type */}
            <div>
              <span className={labelCls}>Timeline type</span>
              <div className="flex gap-2">
                {(["scroll", "view"] as TimelineType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTimelineType(t)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      timelineType === t
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {t}()
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline axis */}
            <div>
              <span className={labelCls}>Axis</span>
              <div className="flex gap-2">
                {(["block", "inline"] as TimelineAxis[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => setTimelineAxis(a)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      timelineAxis === a
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Animation range (view timeline only) */}
            {timelineType === "view" && (
              <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-gray-600">Animation range</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className={labelCls}>Start</span>
                    <select
                      value={rangeStart}
                      onChange={(e) => setRangeStart(e.target.value as RangeName)}
                      className={selectCls + " w-full"}
                    >
                      {RANGE_NAMES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelCls}>Start %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rangeStartPct}
                      onChange={(e) => setRangeStartPct(Number(e.target.value))}
                      className={selectCls + " w-full"}
                    />
                  </div>
                  <div>
                    <span className={labelCls}>End</span>
                    <select
                      value={rangeEnd}
                      onChange={(e) => setRangeEnd(e.target.value as RangeName)}
                      className={selectCls + " w-full"}
                    >
                      {RANGE_NAMES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className={labelCls}>End %</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={rangeEndPct}
                      onChange={(e) => setRangeEndPct(Number(e.target.value))}
                      className={selectCls + " w-full"}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Duration */}
            <div>
              <span className={labelCls}>Duration</span>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={durationAuto}
                    onChange={(e) => setDurationAuto(e.target.checked)}
                    className="rounded border-gray-300"
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
                  />
                )}
                {!durationAuto && (
                  <span className="text-xs text-gray-400">ms</span>
                )}
              </div>
            </div>

            {/* Direction */}
            <div>
              <span className={labelCls}>Direction</span>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as AnimationDirection)}
                className={selectCls + " w-full"}
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
              <span className={labelCls}>Fill mode</span>
              <select
                value={fillMode}
                onChange={(e) => setFillMode(e.target.value as FillMode)}
                className={selectCls + " w-full"}
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
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Live Preview{" "}
              <span className="text-xs font-normal text-gray-400">
                scroll to see the animation
              </span>
            </h2>
            <div
              ref={scrollRef}
              className="relative h-[400px] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 shadow-sm"
            >
              {/* Spacer top */}
              <div className="flex flex-col items-center gap-3 px-6 py-10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`top-${i}`}
                    className="h-14 w-full rounded-lg bg-gray-200/70"
                  />
                ))}
                <p className="text-xs text-gray-400 mt-2">\u2193 scroll down</p>
              </div>

              {/* Animated element */}
              <div className="flex justify-center px-6 py-8">
                <div
                  ref={targetRef}
                  className="w-full max-w-sm rounded-xl border border-gray-300 bg-white p-8 shadow-md text-center"
                  style={buildPreviewStyle(preset, progress)}
                >
                  <div className="text-3xl mb-2">{preset.icon}</div>
                  <h3 className="font-semibold text-gray-800">{preset.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Animated with scroll-driven CSS
                  </p>
                </div>
              </div>

              {/* Spacer bottom */}
              <div className="flex flex-col items-center gap-3 px-6 py-10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={`bot-${i}`}
                    className="h-14 w-full rounded-lg bg-gray-200/70"
                  />
                ))}
              </div>
            </div>

            {/* Progress indicator */}
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-gray-200 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gray-900 transition-all duration-75"
                  style={{ width: `${(progress * 100).toFixed(0)}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 tabular-nums w-10 text-right">
                {(progress * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* ---- Generated CSS ---- */}
        <section className="mt-10 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Generated CSS</h2>
          <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed font-mono text-gray-800 whitespace-pre">
              {css}
            </pre>
            <button
              onClick={copyCSS}
              className="absolute right-3 top-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {copied ? "Copied!" : "Copy CSS"}
            </button>
          </div>

          <h2 className="text-sm font-semibold text-gray-700">HTML</h2>
          <div className="relative rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <pre className="overflow-x-auto p-5 text-sm leading-relaxed font-mono text-gray-800 whitespace-pre">
              {html}
            </pre>
            <button
              onClick={copyHTML}
              className="absolute right-3 top-3 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
            >
              {copiedHTML ? "Copied!" : "Copy HTML"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
