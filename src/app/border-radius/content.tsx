"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment, Toggle, SwatchGrid } from "@/components/tools/controls";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Corner {
  h: number;
  v: number;
}

interface RadiusState {
  tl: Corner;
  tr: Corner;
  br: Corner;
  bl: Corner;
}

type OutputFormat = "css" | "tailwind" | "reactnative" | "vars";
type CornerKey = "tl" | "tr" | "br" | "bl";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CORNER_LABELS: Record<CornerKey, string> = {
  tl: "Top Left",
  tr: "Top Right",
  br: "Bottom Right",
  bl: "Bottom Left",
};

const CORNER_POSITIONS: Record<CornerKey, { top?: number; bottom?: number; left?: number; right?: number }> = {
  tl: { top: 0, left: 0 },
  tr: { top: 0, right: 0 },
  br: { bottom: 0, right: 0 },
  bl: { bottom: 0, left: 0 },
};

function mkCorner(h: number, v?: number): Corner {
  return { h, v: v ?? h };
}

function mkUniform(v: number): RadiusState {
  return { tl: mkCorner(v), tr: mkCorner(v), br: mkCorner(v), bl: mkCorner(v) };
}

const BUILT_IN_PRESETS: { name: string; radius: RadiusState; advanced: boolean }[] = [
  { name: "None", radius: mkUniform(0), advanced: false },
  { name: "Card", radius: mkUniform(8), advanced: false },
  { name: "Button", radius: mkUniform(6), advanced: false },
  { name: "Squircle", radius: { tl: mkCorner(50, 30), tr: mkCorner(50, 30), br: mkCorner(50, 30), bl: mkCorner(50, 30) }, advanced: true },
  { name: "Pill", radius: mkUniform(50), advanced: false },
  { name: "Circle", radius: mkUniform(50), advanced: false },
  { name: "Badge", radius: mkUniform(999), advanced: false },
  {
    name: "Leaf",
    radius: { tl: mkCorner(0), tr: mkCorner(50), br: mkCorner(0), bl: mkCorner(50) },
    advanced: false,
  },
  {
    name: "Drop",
    radius: { tl: mkCorner(50), tr: mkCorner(50), br: mkCorner(50), bl: mkCorner(0) },
    advanced: false,
  },
  {
    name: "Blob",
    radius: {
      tl: mkCorner(70, 30),
      tr: mkCorner(30, 70),
      br: mkCorner(70, 30),
      bl: mkCorner(30, 70),
    },
    advanced: true,
  },
  {
    name: "Organic",
    radius: {
      tl: mkCorner(25, 75),
      tr: mkCorner(75, 25),
      br: mkCorner(25, 75),
      bl: mkCorner(75, 25),
    },
    advanced: true,
  },
];

const BG_SWATCHES = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#1f2937"];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function radiusToCSS(r: RadiusState, advanced: boolean): string {
  const corners = [r.tl, r.tr, r.br, r.bl];
  if (!advanced) {
    const vals = corners.map((c) => c.h);
    if (vals.every((v) => v === vals[0])) return `border-radius: ${vals[0]}%;`;
    return `border-radius: ${vals.map((v) => v + "%").join(" ")};`;
  }
  const h = corners.map((c) => c.h + "%").join(" ");
  const v = corners.map((c) => c.v + "%").join(" ");
  if (h === v) return `border-radius: ${h};`;
  return `border-radius: ${h} / ${v};`;
}

function radiusToStyle(r: RadiusState, advanced: boolean): string {
  const corners = [r.tl, r.tr, r.br, r.bl];
  if (!advanced) return corners.map((c) => c.h + "%").join(" ");
  const h = corners.map((c) => c.h + "%").join(" ");
  const v = corners.map((c) => c.v + "%").join(" ");
  if (h === v) return h;
  return `${h} / ${v}`;
}

function pctToTailwind(pct: number): string {
  if (pct === 0) return "none";
  if (pct <= 2) return "sm";
  if (pct <= 4) return "DEFAULT";
  if (pct <= 6) return "md";
  if (pct <= 8) return "lg";
  if (pct <= 12) return "xl";
  if (pct <= 16) return "2xl";
  if (pct <= 24) return "3xl";
  return "full";
}

function twClass(size: string): string {
  if (size === "DEFAULT") return "rounded";
  if (size === "none") return "rounded-none";
  return `rounded-${size}`;
}

function twCornerClass(corner: CornerKey, size: string): string {
  if (size === "DEFAULT") return `rounded-${corner}`;
  if (size === "none") return `rounded-${corner}-none`;
  return `rounded-${corner}-${size}`;
}

function radiusToTailwind(r: RadiusState): string {
  const corners: CornerKey[] = ["tl", "tr", "br", "bl"];
  const sizes = corners.map((k) => pctToTailwind(r[k].h));
  if (sizes.every((s) => s === sizes[0])) return twClass(sizes[0]);
  return corners.map((k, i) => twCornerClass(k, sizes[i])).join(" ");
}

function radiusToReactNative(r: RadiusState): string {
  const map: Record<CornerKey, string> = {
    tl: "borderTopLeftRadius",
    tr: "borderTopRightRadius",
    br: "borderBottomRightRadius",
    bl: "borderBottomLeftRadius",
  };
  const corners: CornerKey[] = ["tl", "tr", "br", "bl"];
  const vals = corners.map((k) => r[k].h);
  if (vals.every((v) => v === vals[0])) {
    return `borderRadius: ${JSON.stringify(vals[0] + "%")}`;
  }
  return corners.map((k) => `${map[k]}: ${JSON.stringify(r[k].h + "%")}`).join(",\n");
}

function radiusToVars(r: RadiusState, advanced: boolean): string {
  const corners: CornerKey[] = ["tl", "tr", "br", "bl"];
  const labels: Record<CornerKey, string> = { tl: "top-left", tr: "top-right", br: "bottom-right", bl: "bottom-left" };
  const lines = [":root {"];
  corners.forEach((k) => {
    if (advanced) {
      lines.push(`  --radius-${labels[k]}: ${r[k].h}% ${r[k].v}%;`);
    } else {
      lines.push(`  --radius-${labels[k]}: ${r[k].h}%;`);
    }
  });
  lines.push("}");
  return lines.join("\n");
}

function getOutput(r: RadiusState, advanced: boolean, fmt: OutputFormat): string {
  switch (fmt) {
    case "css": return radiusToCSS(r, advanced);
    case "tailwind": return radiusToTailwind(r);
    case "reactnative": return radiusToReactNative(r);
    case "vars": return radiusToVars(r, advanced);
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BorderRadiusContent() {
  const [radius, setRadius] = useState<RadiusState>(mkUniform(16));
  const [advanced, setAdvanced] = useState(false);
  const [linked, setLinked] = useState(true);
  const [bgColor, setBgColor] = useState("#6366f1");
  const [outputFmt, setOutputFmt] = useState<OutputFormat>("css");
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState<CornerKey | null>(null);
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
  const isGlass    = currentTheme === "glass";

  const output = getOutput(radius, advanced, outputFmt);
  const styleRadius = radiusToStyle(radius, advanced);

  /* ------ Mutations ------ */

  const setCorner = useCallback(
    (key: CornerKey, axis: "h" | "v", value: number) => {
      setRadius((prev) => {
        if (linked) {
          const c = axis === "h" ? mkCorner(value, prev.tl.v) : mkCorner(prev.tl.h, value);
          return { tl: { ...c }, tr: { ...c }, br: { ...c }, bl: { ...c } };
        }
        return { ...prev, [key]: { ...prev[key], [axis]: value } };
      });
    },
    [linked],
  );

  const applyPreset = useCallback(
    (p: { radius: RadiusState; advanced: boolean }) => {
      setRadius(JSON.parse(JSON.stringify(p.radius)));
      if (p.advanced) setAdvanced(true);
      setLinked(false);
    },
    [],
  );

  const copy = useCallback(
    (text?: string) => {
      const t = text ?? output;
      navigator.clipboard.writeText(t);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    },
    [output],
  );

  /* ------ Drag-to-resize corners ------ */
  const handlePreviewMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const threshold = 48;

      let corner: CornerKey | null = null;
      if (x < threshold && y < threshold) corner = "tl";
      else if (x > w - threshold && y < threshold) corner = "tr";
      else if (x > w - threshold && y > h - threshold) corner = "br";
      else if (x < threshold && y > h - threshold) corner = "bl";

      if (corner) {
        e.preventDefault();
        setDragging(corner);
      }
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let pct: number;
      switch (dragging) {
        case "tl":
          pct = Math.round(((x + y) / (w + h)) * 100);
          break;
        case "tr":
          pct = Math.round((((w - x) + y) / (w + h)) * 100);
          break;
        case "br":
          pct = Math.round((((w - x) + (h - y)) / (w + h)) * 100);
          break;
        case "bl":
          pct = Math.round(((x + (h - y)) / (w + h)) * 100);
          break;
      }
      pct = Math.max(0, Math.min(100, pct));
      setCorner(dragging, "h", pct);
      if (!advanced) setCorner(dragging, "v", pct);
    };

    const handleUp = () => setDragging(null);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, advanced, setCorner]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => copy(), label: "Copy output" }],
      [copy],
    ),
  );

  const corners: CornerKey[] = ["tl", "tr", "br", "bl"];

  return (
    <ToolShell
      title="Border Radius"
      tagline="Per-corner control with elliptical mode, drag handles, and squircle preset"
      accent="#8b5cf6"
      materialFab={{ label: "Copy CSS", onClick: () => copy() }}
      actions={
        <>
          <Segment
            value={outputFmt}
            onChange={setOutputFmt}
            options={[
              { value: "css", label: "CSS" },
              { value: "tailwind", label: "TW" },
              { value: "vars", label: "Vars" },
              { value: "reactnative", label: "RN" },
            ]}
            size="sm"
          />
          <ToolActionButton onClick={() => copy()} variant="solid">
            {copied ? "Copied!" : "Copy"}
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup>
            <Toggle
              checked={linked}
              onChange={setLinked}
              label="Link all corners"
              hint="Drag one slider, update all four"
            />
          </ControlGroup>

          <ControlGroup>
            <Toggle
              checked={advanced}
              onChange={setAdvanced}
              label="Elliptical mode"
              hint="Separate H and V radius per corner"
            />
          </ControlGroup>

          <ControlGroup label="Presets">
            <div className="grid grid-cols-3 gap-2">
              {BUILT_IN_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="flex flex-col items-center gap-1.5 p-2 text-[11px] transition"
                  style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    color: "var(--kami-text-muted)",
                    minHeight: 64,
                  }}
                >
                  <div
                    className="h-7 w-7"
                    style={{
                      borderRadius: radiusToStyle(p.radius, p.advanced),
                      background: "var(--kami-text-muted)",
                    }}
                  />
                  <span>{p.name}</span>
                </button>
              ))}
            </div>
          </ControlGroup>

          {corners.map((key) => (
            <ControlGroup
              key={key}
              label={CORNER_LABELS[key]}
              hint={advanced ? `${radius[key].h}% / ${radius[key].v}%` : `${radius[key].h}%`}
            >
              <Slider
                value={radius[key].h}
                onChange={(v) => {
                  setCorner(key, "h", v);
                  if (!advanced) setCorner(key, "v", v);
                }}
                min={0}
                max={100}
                unit="%"
                label={advanced ? "H" : undefined}
              />
              {advanced && (
                <Slider
                  value={radius[key].v}
                  onChange={(v) => setCorner(key, "v", v)}
                  min={0}
                  max={100}
                  unit="%"
                  label="V"
                />
              )}
            </ControlGroup>
          ))}

          <ControlGroup label="Preview color">
            <SwatchGrid value={bgColor} onChange={setBgColor} colors={BG_SWATCHES} />
          </ControlGroup>

          <ControlGroup label="Output">
            <pre
              className="overflow-x-auto p-3 text-xs"
              style={{
                background: "var(--kami-overlay-bg, #0d1117)",
                color: "var(--kami-overlay-text, #f1f5f9)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                maxHeight: 220,
              }}
            >
              <code>{output}</code>
            </pre>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Drag the corners of the preview box (within ~48px of each corner) to round
            them. Toggle elliptical mode for independent horizontal and vertical radii.
          </p>
          <p className="text-xs">
            Squircle uses the elliptical syntax (e.g. <code>50% / 30%</code>) to mimic the
            superellipse curve made famous by iOS.
          </p>
        </div>
      }
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "visual"}
            className={`metro-pivot-item${metroCPivot === "visual" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("visual")}>Visual</button>
          <button role="tab" aria-selected={metroCPivot === "code"}
            className={`metro-pivot-item${metroCPivot === "code" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("code")}>CSS</button>
        </nav>
      )}
      {(!isMetro || metroCPivot === "visual") && (
        <div className={isGlass ? "glass-canvas-section" : ""}><div
          className="flex h-full min-h-[60vh] w-full items-center justify-center p-6"
          style={{
            background: "var(--kami-surface)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            border: "1px solid var(--kami-border-strong)",
          }}
        >
          <div
            ref={previewRef}
            onMouseDown={handlePreviewMouseDown}
            className="relative transition-all duration-150"
            style={{
              width: "min(70vw, 320px)",
              height: "min(70vw, 320px)",
              borderRadius: styleRadius,
              background: bgColor,
              cursor: dragging ? "grabbing" : "default",
              touchAction: "none",
            }}
          >
            {corners.map((key) => {
              const pos = CORNER_POSITIONS[key];
              return (
                <div
                  key={key}
                  className="absolute h-3 w-3 rounded-full"
                  style={{
                    background: "var(--kami-text)",
                    border: "2px solid var(--kami-surface-solid)",
                    ...pos,
                    ...(pos.top !== undefined && pos.left !== undefined && { transform: "translate(50%, 50%)" }),
                    ...(pos.top !== undefined && pos.right !== undefined && { transform: "translate(-50%, 50%)" }),
                    ...(pos.bottom !== undefined && pos.right !== undefined && { transform: "translate(-50%, -50%)" }),
                    ...(pos.bottom !== undefined && pos.left !== undefined && { transform: "translate(50%, -50%)" }),
                    cursor: "grab",
                    opacity: 0.6,
                    zIndex: 10,
                  }}
                  title={`Drag to adjust ${CORNER_LABELS[key]}`}
                />
              );
            })}
          </div>
        </div></div>
      )}
      {(!isMetro || metroCPivot === "code") && (
        <div className={isGlass ? "glass-canvas-section" : ""}><div className="p-4">
          <pre
            className="overflow-x-auto p-4 text-xs leading-relaxed"
            style={{
              background: "var(--kami-overlay-bg, #0d1117)",
              color: "var(--kami-overlay-text, #f1f5f9)",
              borderRadius: "var(--kami-input-radius, 0.5rem)",
              maxHeight: 400,
            }}
          >
            <code>{output}</code>
          </pre>
        </div></div>
      )}
    </ToolShell>
  );
}
