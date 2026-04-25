"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Corner {
  h: number; // horizontal radius
  v: number; // vertical radius
}

interface RadiusState {
  tl: Corner;
  tr: Corner;
  br: Corner;
  bl: Corner;
}

interface SavedPreset {
  name: string;
  radius: RadiusState;
  advanced: boolean;
}

type OutputFormat = "css" | "tailwind" | "reactnative";
type BgPattern = "solid" | "gradient" | "checkerboard" | "image";
type SizePreset = "sm" | "md" | "lg" | "full";
type CornerKey = "tl" | "tr" | "br" | "bl";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const SIZE_MAP: Record<SizePreset, number | "full"> = {
  sm: 120,
  md: 200,
  lg: 300,
  full: "full",
};

const SIZE_LABELS: Record<SizePreset, string> = {
  sm: "Small",
  md: "Medium",
  lg: "Large",
  full: "Full",
};

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
  { name: "Squircle", radius: mkUniform(22), advanced: false },
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
    name: "Blob 1",
    radius: {
      tl: mkCorner(70, 30),
      tr: mkCorner(30, 70),
      br: mkCorner(70, 30),
      bl: mkCorner(30, 70),
    },
    advanced: true,
  },
  {
    name: "Blob 2",
    radius: {
      tl: mkCorner(40, 60),
      tr: mkCorner(60, 40),
      br: mkCorner(30, 70),
      bl: mkCorner(70, 30),
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
  if (!advanced) {
    return corners.map((c) => c.h + "%").join(" ");
  }
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

function getOutput(r: RadiusState, advanced: boolean, fmt: OutputFormat): string {
  switch (fmt) {
    case "css":
      return radiusToCSS(r, advanced);
    case "tailwind":
      return radiusToTailwind(r);
    case "reactnative":
      return radiusToReactNative(r);
  }
}

const STORAGE_KEY = "kami-border-radius-presets";

function loadSavedPresets(): SavedPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSavedPresets(presets: SavedPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function BorderRadiusContent() {
  const [radius, setRadius] = useState<RadiusState>(mkUniform(16));
  const [advanced, setAdvanced] = useState(false);
  const [linked, setLinked] = useState(true);
  const [sizePreset, setSizePreset] = useState<SizePreset>("md");
  const [bgPattern, setBgPattern] = useState<BgPattern>("solid");
  const [bgColor, setBgColor] = useState("#6366f1");
  const [gradientEnd, setGradientEnd] = useState("#ec4899");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [outputFmt, setOutputFmt] = useState<OutputFormat>("css");
  const [copied, setCopied] = useState<string | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedPreset[]>([]);
  const [presetName, setPresetName] = useState("");
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [compareItems, setCompareItems] = useState<{ radius: RadiusState; advanced: boolean }[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [dragging, setDragging] = useState<CornerKey | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved presets from localStorage on mount
  useEffect(() => {
    setSavedPresets(loadSavedPresets());
  }, []);

  const output = getOutput(radius, advanced, outputFmt);
  const styleRadius = radiusToStyle(radius, advanced);

  const previewSize = SIZE_MAP[sizePreset];
  const previewW = previewSize === "full" ? "100%" : previewSize;
  const previewH = previewSize === "full" ? 200 : previewSize;

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
      setCopied(t);
      setTimeout(() => setCopied(null), 1500);
    },
    [output],
  );

  const savePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const p: SavedPreset = { name: presetName.trim(), radius: JSON.parse(JSON.stringify(radius)), advanced };
    const next = [...savedPresets, p];
    setSavedPresets(next);
    saveSavedPresets(next);
    setPresetName("");
    setShowSaveInput(false);
  }, [presetName, radius, advanced, savedPresets]);

  const deletePreset = useCallback(
    (idx: number) => {
      const next = savedPresets.filter((_, i) => i !== idx);
      setSavedPresets(next);
      saveSavedPresets(next);
    },
    [savedPresets],
  );

  const addToCompare = useCallback(() => {
    setCompareItems((prev) => [...prev, { radius: JSON.parse(JSON.stringify(radius)), advanced }]);
    setShowCompare(true);
  }, [radius, advanced]);

  const removeCompare = useCallback((idx: number) => {
    setCompareItems((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  /* ------ Drag-to-resize corners ------ */
  const handlePreviewMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = rect.width;
      const h = rect.height;
      const threshold = 40;

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

  /* ------ Image upload ------ */
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgImage(reader.result as string);
      setBgPattern("image");
    };
    reader.readAsDataURL(file);
  }, []);

  /* ------ Background style ------ */
  const getBgStyle = useCallback((): React.CSSProperties => {
    switch (bgPattern) {
      case "solid":
        return { backgroundColor: bgColor };
      case "gradient":
        return { background: `linear-gradient(135deg, ${bgColor}, ${gradientEnd})` };
      case "checkerboard":
        return {
          backgroundColor: "#e5e7eb",
          backgroundImage: `
            linear-gradient(45deg, #9ca3af 25%, transparent 25%),
            linear-gradient(-45deg, #9ca3af 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #9ca3af 75%),
            linear-gradient(-45deg, transparent 75%, #9ca3af 75%)
          `,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
        };
      case "image":
        return bgImage
          ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
          : { backgroundColor: bgColor };
    }
  }, [bgPattern, bgColor, gradientEnd, bgImage]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => copy(), label: "Copy output" }],
      [copy],
    ),
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  const corners: CornerKey[] = ["tl", "tr", "br", "bl"];

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Border Radius Generator"
          tagline="Shape corners visually - drag handles on the preview or fine-tune with the 8-value elliptical syntax."
          description="Start from a preset (pill, squircle, leaf, etc.) or drag the four corner handles on the preview box. Advanced mode exposes the full 8-value border-radius (horizontal + vertical radii per corner) for real elliptical shapes. Copy as CSS, Tailwind classes, or React Native style."
          audience={["Designers", "Front-end developers"]}
          whenToUse={[
            "Turning a design mockup into real CSS",
            "Matching a specific logo-shape container",
            "Exploring squircle / superellipse variants",
          ]}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* ============ LEFT: Preview + Output ============ */}
          <div className="space-y-6">
            {/* Preview */}
            <div
              className="p-8"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>Preview</span>
                <div className="flex gap-1">
                  {(Object.keys(SIZE_MAP) as SizePreset[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setSizePreset(s)}
                      className="px-2.5 py-1 text-xs font-medium transition"
                      style={{
                        background: sizePreset === s ? "var(--kami-cta-bg, #111827)" : "var(--kami-surface)",
                        color: sizePreset === s ? "var(--kami-cta-text, #ffffff)" : "var(--kami-text-muted)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                    >
                      {SIZE_LABELS[s]}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={addToCompare}
                    className="px-2.5 py-1 text-xs font-medium transition"
                    style={{
                      background: "var(--kami-surface)",
                      color: "var(--kami-text-muted)",
                      borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    }}
                  >
                    + Compare
                  </button>
                </div>
              </div>

              <div
                className="flex items-center justify-center p-6"
                style={{
                  background: "var(--kami-surface)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  minHeight: 260,
                }}
              >
                <div
                  ref={previewRef}
                  onMouseDown={handlePreviewMouseDown}
                  className="relative transition-all duration-150"
                  style={{
                    width: previewW,
                    height: previewH,
                    borderRadius: styleRadius,
                    ...getBgStyle(),
                    cursor: dragging ? "grabbing" : "default",
                  }}
                >
                  {/* Corner drag handles */}
                  {corners.map((key) => {
                    const pos = CORNER_POSITIONS[key];
                    return (
                      <div
                        key={key}
                        className="absolute h-5 w-5 rounded-full border-2 opacity-0 hover:opacity-80 transition-opacity shadow-md"
                        style={{
                          background: "var(--kami-text)",
                          borderColor: "var(--kami-surface-solid)",
                          ...pos,
                          transform: "translate(-50%, -50%)",
                          ...(pos.top !== undefined && pos.left !== undefined && { transform: "translate(50%, 50%)" }),
                          ...(pos.top !== undefined && pos.right !== undefined && { transform: "translate(-50%, 50%)" }),
                          ...(pos.bottom !== undefined && pos.right !== undefined && { transform: "translate(-50%, -50%)" }),
                          ...(pos.bottom !== undefined && pos.left !== undefined && { transform: "translate(50%, -50%)" }),
                          cursor: "grab",
                          zIndex: 10,
                        }}
                        title={`Drag to adjust ${CORNER_LABELS[key]}`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Background options */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>Background</h3>
              <div className="flex flex-wrap items-center gap-3">
                {(["solid", "gradient", "checkerboard", "image"] as BgPattern[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setBgPattern(p);
                      if (p === "image" && !bgImage) fileInputRef.current?.click();
                    }}
                    className="px-2.5 py-1 text-xs font-medium capitalize transition"
                    style={{
                      background: bgPattern === p ? "var(--kami-cta-bg, #111827)" : "var(--kami-surface)",
                      color: bgPattern === p ? "var(--kami-cta-text, #ffffff)" : "var(--kami-text-muted)",
                      borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    }}
                  >
                    {p}
                  </button>
                ))}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />

                <div className="ml-auto flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-6 w-6 cursor-pointer rounded"
                      style={{ border: "1px solid var(--kami-border-strong)" }}
                    />
                  </label>
                  {bgPattern === "gradient" && (
                    <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                      <input
                        type="color"
                        value={gradientEnd}
                        onChange={(e) => setGradientEnd(e.target.value)}
                        className="h-6 w-6 cursor-pointer rounded"
                      style={{ border: "1px solid var(--kami-border-strong)" }}
                      />
                    </label>
                  )}
                  {bgPattern === "image" && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2 py-1 text-xs"
                      style={{
                        background: "var(--kami-surface)",
                        color: "var(--kami-text-muted)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                    >
                      Upload
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Output */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {(["css", "tailwind", "reactnative"] as OutputFormat[]).map((f) => (
                    <button
                      key={f}
                      onClick={() => setOutputFmt(f)}
                      className="px-2.5 py-1 text-xs font-medium transition"
                      style={{
                        background: outputFmt === f ? "var(--kami-cta-bg, #111827)" : "var(--kami-surface)",
                        color: outputFmt === f ? "var(--kami-cta-text, #ffffff)" : "var(--kami-text-muted)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                    >
                      {f === "reactnative" ? "React Native" : f === "css" ? "CSS" : "Tailwind"}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => copy()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition"
                  style={{
                    background: "var(--kami-cta-bg, #111827)",
                    color: "var(--kami-cta-text, #ffffff)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                  }}
                >
                  {copied === output ? <CheckIcon /> : <CopyIcon />}
                  {copied === output ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto p-4 text-sm leading-relaxed" style={{ background: "#0a0a0a", color: "#f3f4f6", borderRadius: "var(--kami-input-radius, 0.5rem)" }}>
                <code>{output}</code>
              </pre>
            </div>

            {/* Comparison view */}
            {showCompare && compareItems.length > 0 && (
              <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>Comparison</h3>
                  <button
                    onClick={() => {
                      setCompareItems([]);
                      setShowCompare(false);
                    }}
                    className="text-xs"
                    style={{ color: "var(--kami-text-dim)" }}
                  >
                    Clear all
                  </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  {compareItems.map((item, idx) => (
                    <div key={idx} className="group relative flex flex-col items-center gap-2">
                      <div
                        className="h-24 w-24 transition-all"
                        style={{
                          borderRadius: radiusToStyle(item.radius, item.advanced),
                          ...getBgStyle(),
                        }}
                      />
                      <code className="text-[10px] max-w-[120px] truncate" style={{ color: "var(--kami-text-dim)" }}>
                        {radiusToCSS(item.radius, item.advanced).replace("border-radius: ", "").replace(";", "")}
                      </code>
                      <button
                        onClick={() => removeCompare(idx)}
                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full text-xs group-hover:flex"
                        style={{ background: "var(--kami-border-strong)", color: "var(--kami-text-muted)" }}
                      >
                        x
                      </button>
                      <button
                        onClick={() => applyPreset(item)}
                        className="text-[10px]"
                        style={{ color: "var(--kami-text-dim)" }}
                      >
                        Apply
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============ RIGHT: Controls ============ */}
          <div className="space-y-5">
            {/* Mode + Link */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                  <input
                    type="checkbox"
                    checked={linked}
                    onChange={(e) => setLinked(e.target.checked)}
                    className="rounded"
                  />
                  Link corners
                </label>
                <button
                  onClick={() => setAdvanced(!advanced)}
                  className="px-2.5 py-1 text-xs font-medium transition"
                  style={{
                    background: advanced ? "var(--kami-cta-bg, #111827)" : "var(--kami-surface)",
                    color: advanced ? "var(--kami-cta-text, #ffffff)" : "var(--kami-text-muted)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                  }}
                >
                  {advanced ? "Advanced (8-value)" : "Simple (4-value)"}
                </button>
              </div>
            </div>

            {/* Corner sliders */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h3 className="mb-4 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>Corners</h3>
              <div className="space-y-4">
                {corners.map((key) => (
                  <div key={key}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>{CORNER_LABELS[key]}</span>
                      <span className="font-mono text-xs" style={{ color: "var(--kami-text-dim)" }}>
                        {radius[key].h}%{advanced ? ` / ${radius[key].v}%` : ""}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        {advanced && (
                          <span className="w-4 text-[10px]" style={{ color: "var(--kami-text-dim)" }}>H</span>
                        )}
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={radius[key].h}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setCorner(key, "h", v);
                            if (!advanced) setCorner(key, "v", v);
                          }}
                          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                          style={{ background: "var(--kami-border-strong)" }}
                        />
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={radius[key].h}
                          onChange={(e) => {
                            const v = Math.min(100, Math.max(0, Number(e.target.value)));
                            setCorner(key, "h", v);
                            if (!advanced) setCorner(key, "v", v);
                          }}
                          className="w-14 px-2 py-0.5 text-right font-mono text-xs focus:outline-none"
                          style={{
                            background: "var(--kami-input-bg, var(--kami-surface-solid))",
                            color: "var(--kami-text-muted)",
                            border: "1px solid var(--kami-border-strong)",
                            borderRadius: "var(--kami-cta-radius, 0.375rem)",
                          }}
                        />
                      </div>
                      {advanced && (
                        <div className="flex items-center gap-2">
                          <span className="w-4 text-[10px]" style={{ color: "var(--kami-text-dim)" }}>V</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={radius[key].v}
                            onChange={(e) => setCorner(key, "v", Number(e.target.value))}
                            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full"
                          style={{ background: "var(--kami-border-strong)" }}
                          />
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={radius[key].v}
                            onChange={(e) => {
                              const v = Math.min(100, Math.max(0, Number(e.target.value)));
                              setCorner(key, "v", v);
                            }}
                            className="w-14 px-2 py-0.5 text-right font-mono text-xs focus:outline-none"
                          style={{
                            background: "var(--kami-input-bg, var(--kami-surface-solid))",
                            color: "var(--kami-text-muted)",
                            border: "1px solid var(--kami-border-strong)",
                            borderRadius: "var(--kami-cta-radius, 0.375rem)",
                          }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>Presets</h3>
              <div className="flex flex-wrap gap-1.5">
                {BUILT_IN_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1.5 text-xs font-medium transition"
                    style={{
                      background: "var(--kami-surface)",
                      color: "var(--kami-text-muted)",
                      border: "1px solid var(--kami-border)",
                      borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    }}
                  >
                    <span className="mr-1.5 inline-block h-3 w-3 rounded-sm" style={{
                      borderRadius: radiusToStyle(p.radius, p.advanced),
                      backgroundColor: "#d1d5db",
                      border: "1px solid var(--kami-border-strong)",
                      verticalAlign: "middle",
                    }} />
                    {p.name}
                  </button>
                ))}
              </div>

              {/* Saved presets */}
              {savedPresets.length > 0 && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--kami-border)" }}>
                  <div className="mb-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>Saved</div>
                  <div className="flex flex-wrap gap-1.5">
                    {savedPresets.map((p, idx) => (
                      <div key={idx} className="group relative">
                        <button
                          onClick={() => applyPreset(p)}
                          className="rounded-md bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition border border-indigo-100"
                        >
                          {p.name}
                        </button>
                        <button
                          onClick={() => deletePreset(idx)}
                          className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full text-[9px] group-hover:flex hover:bg-red-400 hover:text-white"
                          style={{ background: "var(--kami-border-strong)", color: "var(--kami-text-muted)" }}
                        >
                          x
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Save new */}
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--kami-border)" }}>
                {showSaveInput ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={presetName}
                      onChange={(e) => setPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && savePreset()}
                      placeholder="Preset name"
                      className="flex-1 px-2.5 py-1.5 text-xs focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                      autoFocus
                    />
                    <button
                      onClick={savePreset}
                      className="px-3 py-1.5 text-xs font-medium transition"
                      style={{
                        background: "var(--kami-cta-bg, #111827)",
                        color: "var(--kami-cta-text, #ffffff)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setShowSaveInput(false);
                        setPresetName("");
                      }}
                      className="px-2.5 py-1.5 text-xs transition"
                      style={{
                        background: "var(--kami-surface)",
                        color: "var(--kami-text-muted)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    className="text-xs transition"
                    style={{ color: "var(--kami-text-dim)" }}
                  >
                    + Save current as preset
                  </button>
                )}
              </div>
            </div>

            {/* Quick copy all formats */}
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h3 className="mb-3 text-xs font-medium uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>Quick Copy</h3>
              <div className="space-y-2">
                {(["css", "tailwind", "reactnative"] as OutputFormat[]).map((f) => {
                  const val = getOutput(radius, advanced, f);
                  const label = f === "reactnative" ? "React Native" : f === "css" ? "CSS" : "Tailwind";
                  return (
                    <div
                      key={f}
                      className="flex items-center justify-between gap-2 px-3 py-2"
                      style={{
                        background: "var(--kami-surface)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                      }}
                    >
                      <code className="flex-1 truncate text-xs" style={{ color: "var(--kami-text-muted)" }}>{val}</code>
                      <button
                        onClick={() => copy(val)}
                        className="flex-shrink-0 px-2 py-1 text-xs transition"
                        style={{
                          color: "var(--kami-text-dim)",
                          borderRadius: "var(--kami-cta-radius, 0.375rem)",
                        }}
                      >
                        {copied === val ? <CheckIcon /> : <CopyIcon />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline icons                                                       */
/* ------------------------------------------------------------------ */

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
