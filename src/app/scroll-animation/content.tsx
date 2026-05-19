"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment, Select, Toggle } from "@/components/tools/controls";

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
  { id: "fade-in", label: "Fade In", icon: "○", from: { opacity: "0" }, to: { opacity: "1" } },
  { id: "slide-up", label: "Slide Up", icon: "↑", from: { opacity: "0", transform: "translateY(40px)" }, to: { opacity: "1", transform: "translateY(0)" } },
  { id: "slide-left", label: "Slide Left", icon: "←", from: { opacity: "0", transform: "translateX(40px)" }, to: { opacity: "1", transform: "translateX(0)" } },
  { id: "scale-up", label: "Scale Up", icon: "⤢", from: { opacity: "0", transform: "scale(0.8)" }, to: { opacity: "1", transform: "scale(1)" } },
  { id: "rotate-in", label: "Rotate In", icon: "↻", from: { opacity: "0", transform: "rotate(-10deg)" }, to: { opacity: "1", transform: "rotate(0)" } },
  { id: "blur-in", label: "Blur In", icon: "◌", from: { opacity: "0", filter: "blur(10px)" }, to: { opacity: "1", filter: "blur(0)" } },
  { id: "clip-reveal", label: "Clip Reveal", icon: "▨", from: { "clip-path": "inset(0 100% 0 0)" }, to: { "clip-path": "inset(0 0 0 0)" } },
  { id: "parallax", label: "Parallax", icon: "↕", from: { transform: "translateY(60px)" }, to: { transform: "translateY(-60px)" } },
];

const RANGE_NAMES: RangeName[] = ["entry", "exit", "contain", "cover"];

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
  css += `.animated-element {\n`;
  css += `  animation: ${name} linear ${direction} ${fillMode};\n`;
  if (!durationAuto) css += `  animation-duration: ${durationMs}ms;\n`;
  if (timelineType === "view") {
    css += `  animation-timeline: view(${timelineAxis});\n`;
    css += `  animation-range: ${rangeStart} ${rangeStartPct}% ${rangeEnd} ${rangeEndPct}%;\n`;
  } else {
    css += `  animation-timeline: scroll(${timelineAxis});\n`;
  }
  css += `}`;
  return css;
}

function buildPreviewStyle(preset: Preset, progress: number): React.CSSProperties {
  const style: React.CSSProperties = {};
  const from = preset.from;
  const to = preset.to;
  const lerp = (a: number, b: number) => a + (b - a) * progress;

  if (from.opacity !== undefined && to.opacity !== undefined) {
    style.opacity = lerp(parseFloat(from.opacity), parseFloat(to.opacity));
  }
  if (from.transform !== undefined && to.transform !== undefined) {
    style.transform = interpolateTransform(from.transform, to.transform, progress);
  } else if (from.transform !== undefined) {
    style.transform = interpolateTransform(from.transform, "none", progress);
  }
  if (from.filter !== undefined && to.filter !== undefined) {
    const fromBlur = parseFloat(from.filter.replace(/[^0-9.]/g, "") || "0");
    const toBlur = parseFloat(to.filter.replace(/[^0-9.]/g, "") || "0");
    style.filter = `blur(${lerp(fromBlur, toBlur).toFixed(1)}px)`;
  }
  if (from["clip-path"] !== undefined && to["clip-path"] !== undefined) {
    const fromRight = parseFloat(from["clip-path"].match(/inset\(0\s+([\d.]+)%/)?.[1] || "0");
    const toRight = parseFloat(to["clip-path"].match(/inset\(0\s+([\d.]+)%/)?.[1] || "0");
    const r = lerp(fromRight, toRight);
    style.clipPath = `inset(0 ${r.toFixed(1)}% 0 0)`;
  }
  return style;
}

function interpolateTransform(from: string, to: string, t: number): string {
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
  const [currentTheme, setCurrentTheme] = useState<string>("default");

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

  useEffect(() => {
    const container = scrollRef.current;
    const target = targetRef.current;
    if (!container || !target) return;

    const onScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const containerTop = containerRect.top;
      const containerBottom = containerRect.bottom;
      const targetTop = targetRect.top;
      const targetBottom = targetRect.bottom;
      const totalTravel = containerBottom - containerTop + (targetBottom - targetTop);
      const traveled = containerBottom - targetTop;
      const raw = traveled / totalTravel;
      setProgress(Math.max(0, Math.min(1, raw)));
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => container.removeEventListener("scroll", onScroll);
  }, [selectedPreset]);

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isGlass = currentTheme === "glass";

  const copyCSS = useCallback(() => {
    navigator.clipboard.writeText(css);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [css]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: copyCSS, label: "Copy CSS" }],
      [copyCSS],
    ),
  );

  return (
    <ToolShell
      title="Scroll Animation"
      tagline="scroll-driven animations with animation-range, view() and scroll() timelines"
      accent="#8b5cf6"
      materialFab={{ label: "Copy CSS", onClick: copyCSS }}
      actions={
        <ToolActionButton onClick={copyCSS} variant="solid">
          {copied ? "Copied!" : "Copy CSS"}
        </ToolActionButton>
      }
      controls={
        <>
          <ControlGroup label="Effect">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => {
                const active = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset(p.id)}
                    className="flex flex-col items-center gap-1 px-2 py-2 text-xs"
                    style={{
                      background: active ? "var(--kami-cta-bg)" : "var(--kami-surface)",
                      color: active ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      minHeight: 56,
                    }}
                  >
                    <span className="text-base">{p.icon}</span>
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </ControlGroup>

          <ControlGroup label="Timeline type">
            <Segment
              value={timelineType}
              onChange={setTimelineType}
              options={[
                { value: "scroll", label: "scroll()" },
                { value: "view", label: "view()" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>

          <ControlGroup label="Axis">
            <Segment
              value={timelineAxis}
              onChange={setTimelineAxis}
              options={[
                { value: "block", label: "block" },
                { value: "inline", label: "inline" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>

          {timelineType === "view" && (
            <ControlGroup label="Animation range" hint={`${rangeStart} ${rangeStartPct}% → ${rangeEnd} ${rangeEndPct}%`}>
              <Select
                label="Start"
                value={rangeStart}
                onChange={(v) => setRangeStart(v as RangeName)}
                options={RANGE_NAMES.map((n) => ({ value: n, label: n }))}
              />
              <Slider label="Start %" value={rangeStartPct} onChange={setRangeStartPct} min={0} max={100} unit="%" />
              <Select
                label="End"
                value={rangeEnd}
                onChange={(v) => setRangeEnd(v as RangeName)}
                options={RANGE_NAMES.map((n) => ({ value: n, label: n }))}
              />
              <Slider label="End %" value={rangeEndPct} onChange={setRangeEndPct} min={0} max={100} unit="%" />
            </ControlGroup>
          )}

          <ControlGroup label="Duration">
            <Toggle checked={durationAuto} onChange={setDurationAuto} label="Auto duration" hint="Match scroll progress" />
            {!durationAuto && (
              <div className="mt-2">
                <Slider label="ms" value={durationMs} onChange={setDurationMs} min={100} max={5000} step={100} unit="ms" />
              </div>
            )}
          </ControlGroup>

          <ControlGroup label="Direction">
            <Select
              value={direction}
              onChange={(v) => setDirection(v as AnimationDirection)}
              options={(["normal", "reverse", "alternate"] as AnimationDirection[]).map((d) => ({ value: d, label: d }))}
            />
          </ControlGroup>

          <ControlGroup label="Fill mode">
            <Segment
              value={fillMode}
              onChange={setFillMode}
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
            Scroll inside the preview frame to drive the animation. Output uses the
            modern CSS Scroll-Driven Animations spec (Chromium 115+, behind flag in
            Firefox).
          </p>
          <p className="text-xs">
            <code>view()</code> ties progress to the element entering/leaving the
            viewport; <code>scroll()</code> ties it to the scroll container itself.
          </p>
        </div>
      }
    >
      <div className={isGlass ? "glass-canvas-section" : ""}><div className="flex h-full min-h-[60vh] w-full flex-col gap-3 p-4">
        <div
          ref={scrollRef}
          className="relative flex-1 overflow-y-auto"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            minHeight: 360,
          }}
        >
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
            <p className="mt-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>↓ scroll down</p>
          </div>

          <div className="flex justify-center px-6 py-8">
            <div
              ref={targetRef}
              className="w-full max-w-sm p-8 text-center"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                color: "var(--kami-text)",
                ...buildPreviewStyle(preset, progress),
              }}
            >
              <div className="text-3xl mb-2">{preset.icon}</div>
              <h3 className="font-semibold">{preset.label}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Animated with scroll-driven CSS
              </p>
            </div>
          </div>

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

        <div className="flex items-center gap-2">
          <div
            className="h-2 flex-1 overflow-hidden"
            style={{
              background: "color-mix(in srgb, var(--kami-text-dim) 30%, transparent)",
              borderRadius: 999,
            }}
          >
            <div
              className="h-full transition-all duration-75"
              style={{
                width: `${(progress * 100).toFixed(0)}%`,
                background: "var(--kami-text)",
                borderRadius: 999,
              }}
            />
          </div>
          <span className="w-12 text-right text-xs tabular-nums font-mono" style={{ color: "var(--kami-text-dim)" }}>
            {(progress * 100).toFixed(0)}%
          </span>
        </div>
      </div></div>
    </ToolShell>
  );
}
