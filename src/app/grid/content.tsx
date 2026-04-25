"use client";

import { useState, useMemo, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GridItem {
  id: number;
  rowStart: number;
  colStart: number;
  rowSpan: number;
  colSpan: number;
  color: string;
  area?: string;
}

type OutputFormat = "css" | "tailwind" | "react";
type PreviewWidth = "mobile" | "tablet" | "desktop";
type AlignValue = "stretch" | "start" | "end" | "center";
type ContentValue = "stretch" | "start" | "end" | "center" | "space-between" | "space-around" | "space-evenly";

interface Preset {
  label: string;
  rows: number;
  cols: number;
  rowSizes: string[];
  colSizes: string[];
  gap: number;
  items: Omit<GridItem, "id" | "color">[];
  areas?: string[][];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4"];
const TRACK_OPTIONS = ["1fr", "2fr", "auto", "100px", "150px", "200px", "min-content", "max-content", "minmax(100px, 1fr)", "minmax(200px, 1fr)"];
const PREVIEW_WIDTHS: Record<PreviewWidth, string> = { mobile: "320px", tablet: "768px", desktop: "100%" };
const ALIGN_OPTIONS: AlignValue[] = ["stretch", "start", "end", "center"];
const CONTENT_OPTIONS: ContentValue[] = ["stretch", "start", "end", "center", "space-between", "space-around", "space-evenly"];

let nextId = 1;

const PRESETS: Preset[] = [
  {
    label: "Holy Grail",
    rows: 3, cols: 3,
    rowSizes: ["auto", "1fr", "auto"],
    colSizes: ["200px", "1fr", "200px"],
    gap: 0,
    items: [
      { rowStart: 0, colStart: 0, rowSpan: 1, colSpan: 3, area: "header" },
      { rowStart: 1, colStart: 0, rowSpan: 1, colSpan: 1, area: "nav" },
      { rowStart: 1, colStart: 1, rowSpan: 1, colSpan: 1, area: "main" },
      { rowStart: 1, colStart: 2, rowSpan: 1, colSpan: 1, area: "aside" },
      { rowStart: 2, colStart: 0, rowSpan: 1, colSpan: 3, area: "footer" },
    ],
    areas: [["header", "header", "header"], ["nav", "main", "aside"], ["footer", "footer", "footer"]],
  },
  {
    label: "Dashboard",
    rows: 3, cols: 4,
    rowSizes: ["auto", "1fr", "1fr"],
    colSizes: ["220px", "1fr", "1fr", "1fr"],
    gap: 12,
    items: [
      { rowStart: 0, colStart: 0, rowSpan: 1, colSpan: 4, area: "header" },
      { rowStart: 1, colStart: 0, rowSpan: 2, colSpan: 1, area: "sidebar" },
      { rowStart: 1, colStart: 1, rowSpan: 1, colSpan: 1, area: "card1" },
      { rowStart: 1, colStart: 2, rowSpan: 1, colSpan: 1, area: "card2" },
      { rowStart: 1, colStart: 3, rowSpan: 1, colSpan: 1, area: "card3" },
      { rowStart: 2, colStart: 1, rowSpan: 1, colSpan: 3, area: "main" },
    ],
    areas: [["header", "header", "header", "header"], ["sidebar", "card1", "card2", "card3"], ["sidebar", "main", "main", "main"]],
  },
  {
    label: "Blog Layout",
    rows: 3, cols: 3,
    rowSizes: ["auto", "1fr", "auto"],
    colSizes: ["1fr", "1fr", "300px"],
    gap: 16,
    items: [
      { rowStart: 0, colStart: 0, rowSpan: 1, colSpan: 3, area: "header" },
      { rowStart: 1, colStart: 0, rowSpan: 1, colSpan: 2, area: "article" },
      { rowStart: 1, colStart: 2, rowSpan: 1, colSpan: 1, area: "sidebar" },
      { rowStart: 2, colStart: 0, rowSpan: 1, colSpan: 3, area: "footer" },
    ],
    areas: [["header", "header", "header"], ["article", "article", "sidebar"], ["footer", "footer", "footer"]],
  },
  {
    label: "Gallery Grid",
    rows: 3, cols: 4,
    rowSizes: ["1fr", "1fr", "1fr"],
    colSizes: ["1fr", "1fr", "1fr", "1fr"],
    gap: 8,
    items: Array.from({ length: 12 }, (_, i) => ({ rowStart: Math.floor(i / 4), colStart: i % 4, rowSpan: 1, colSpan: 1 })),
  },
  {
    label: "Magazine",
    rows: 3, cols: 4,
    rowSizes: ["2fr", "1fr", "1fr"],
    colSizes: ["1fr", "1fr", "1fr", "1fr"],
    gap: 10,
    items: [
      { rowStart: 0, colStart: 0, rowSpan: 1, colSpan: 2, area: "hero" },
      { rowStart: 0, colStart: 2, rowSpan: 1, colSpan: 2, area: "featured" },
      { rowStart: 1, colStart: 0, rowSpan: 1, colSpan: 1, area: "card1" },
      { rowStart: 1, colStart: 1, rowSpan: 1, colSpan: 1, area: "card2" },
      { rowStart: 1, colStart: 2, rowSpan: 1, colSpan: 1, area: "card3" },
      { rowStart: 1, colStart: 3, rowSpan: 1, colSpan: 1, area: "card4" },
      { rowStart: 2, colStart: 0, rowSpan: 1, colSpan: 4, area: "banner" },
    ],
    areas: [["hero", "hero", "featured", "featured"], ["card1", "card2", "card3", "card4"], ["banner", "banner", "banner", "banner"]],
  },
  {
    label: "App Shell",
    rows: 3, cols: 2,
    rowSizes: ["48px", "1fr", "48px"],
    colSizes: ["240px", "1fr"],
    gap: 0,
    items: [
      { rowStart: 0, colStart: 0, rowSpan: 1, colSpan: 2, area: "topbar" },
      { rowStart: 1, colStart: 0, rowSpan: 1, colSpan: 1, area: "sidebar" },
      { rowStart: 1, colStart: 1, rowSpan: 1, colSpan: 1, area: "content" },
      { rowStart: 2, colStart: 0, rowSpan: 1, colSpan: 2, area: "bottombar" },
    ],
    areas: [["topbar", "topbar"], ["sidebar", "content"], ["bottombar", "bottombar"]],
  },
  {
    label: "Masonry-like",
    rows: 4, cols: 3,
    rowSizes: ["1fr", "1fr", "1fr", "1fr"],
    colSizes: ["1fr", "1fr", "1fr"],
    gap: 8,
    items: [
      { rowStart: 0, colStart: 0, rowSpan: 2, colSpan: 1 },
      { rowStart: 0, colStart: 1, rowSpan: 1, colSpan: 1 },
      { rowStart: 0, colStart: 2, rowSpan: 3, colSpan: 1 },
      { rowStart: 1, colStart: 1, rowSpan: 2, colSpan: 1 },
      { rowStart: 2, colStart: 0, rowSpan: 2, colSpan: 1 },
      { rowStart: 3, colStart: 1, rowSpan: 1, colSpan: 2 },
    ],
  },
  {
    label: "Responsive Cards",
    rows: 2, cols: 3,
    rowSizes: ["1fr", "1fr"],
    colSizes: ["minmax(200px, 1fr)", "minmax(200px, 1fr)", "minmax(200px, 1fr)"],
    gap: 16,
    items: Array.from({ length: 6 }, (_, i) => ({ rowStart: Math.floor(i / 3), colStart: i % 3, rowSpan: 1, colSpan: 1 })),
  },
];

/* ------------------------------------------------------------------ */
/*  Copy icons (inline SVG)                                            */
/* ------------------------------------------------------------------ */

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
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

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function GridContent() {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const [rowSizes, setRowSizes] = useState<string[]>(Array(3).fill("1fr"));
  const [colSizes, setColSizes] = useState<string[]>(Array(3).fill("1fr"));
  const [gap, setGap] = useState(8);
  const [items, setItems] = useState<GridItem[]>([]);
  const [placing, setPlacing] = useState(false);
  const [placeStart, setPlaceStart] = useState<{ r: number; c: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("css");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [areaMode, setAreaMode] = useState(false);
  const [areaName, setAreaName] = useState("header");
  const [areas, setAreas] = useState<string[][]>([]);
  const [justifyItems, setJustifyItems] = useState<AlignValue>("stretch");
  const [alignItems, setAlignItems] = useState<AlignValue>("stretch");
  const [justifyContent, setJustifyContent] = useState<ContentValue>("stretch");
  const [alignContent, setAlignContent] = useState<ContentValue>("stretch");
  const [autoRows, setAutoRows] = useState("");
  const [autoCols, setAutoCols] = useState("");
  const [useAutoFill, setUseAutoFill] = useState(false);
  const [autoFillMin, setAutoFillMin] = useState("200px");
  const [autoFillMode, setAutoFillMode] = useState<"auto-fill" | "auto-fit">("auto-fill");

  /* --- Sync track arrays when rows/cols change --- */
  const updateRows = (n: number) => {
    setRows(n);
    setRowSizes((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("1fr");
      return next.slice(0, n);
    });
    setAreas((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, n);
      while (next.length < n) next.push(Array(cols).fill("."));
      return next;
    });
  };
  const updateCols = (n: number) => {
    setCols(n);
    setColSizes((prev) => {
      const next = [...prev];
      while (next.length < n) next.push("1fr");
      return next.slice(0, n);
    });
    setAreas((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((row) => {
        const next = [...row];
        while (next.length < n) next.push(".");
        return next.slice(0, n);
      });
    });
  };

  /* --- Item management --- */
  const addItem = (rowStart: number, colStart: number, rowSpan = 1, colSpan = 1) => {
    const id = nextId++;
    setItems((prev) => [...prev, { id, rowStart, colStart, rowSpan, colSpan, color: COLORS[(id - 1) % COLORS.length] }]);
  };

  const removeItem = (id: number) => setItems((prev) => prev.filter((i) => i.id !== id));

  const handleCellClick = (r: number, c: number) => {
    if (areaMode) {
      setAreas((prev) => {
        const next = prev.length ? prev.map((row) => [...row]) : Array.from({ length: rows }, () => Array(cols).fill("."));
        next[r][c] = next[r][c] === areaName ? "." : areaName;
        return next;
      });
      return;
    }
    const occupied = items.some((item) => r >= item.rowStart && r < item.rowStart + item.rowSpan && c >= item.colStart && c < item.colStart + item.colSpan);
    if (occupied) return;
    if (!placing) { setPlacing(true); setPlaceStart({ r, c }); }
    else if (placeStart) {
      const rStart = Math.min(placeStart.r, r);
      const cStart = Math.min(placeStart.c, c);
      addItem(rStart, cStart, Math.abs(r - placeStart.r) + 1, Math.abs(c - placeStart.c) + 1);
      setPlacing(false);
      setPlaceStart(null);
    }
  };

  /* --- Apply preset --- */
  const applyPreset = (p: Preset) => {
    nextId = 1;
    setRows(p.rows);
    setCols(p.cols);
    setRowSizes([...p.rowSizes]);
    setColSizes([...p.colSizes]);
    setGap(p.gap);
    setAreas(p.areas ? p.areas.map((r) => [...r]) : []);
    setItems(p.items.map((it) => ({ ...it, id: nextId, color: COLORS[(nextId++ - 1) % COLORS.length] })));
    setPlacing(false);
    setPlaceStart(null);
    setAreaMode(false);
  };

  /* --- Computed grid strings --- */
  const gridTemplateRows = rowSizes.slice(0, rows).join(" ");
  const gridTemplateCols = useAutoFill ? `repeat(${autoFillMode}, minmax(${autoFillMin}, 1fr))` : colSizes.slice(0, cols).join(" ");
  const hasAreas = areas.length > 0 && areas.some((row) => row.some((c) => c !== "."));
  const areasString = hasAreas ? areas.map((row) => `"${row.join(" ")}"`).join("\n  ") : "";

  const areaNameForCell = (r: number, c: number) => (areas[r] && areas[r][c] && areas[r][c] !== "." ? areas[r][c] : null);

  /* --- Output generators --- */
  const cssOutput = useMemo(() => {
    const props: string[] = ["display: grid"];
    props.push(`grid-template-rows: ${gridTemplateRows}`);
    props.push(`grid-template-columns: ${gridTemplateCols}`);
    if (hasAreas) props.push(`grid-template-areas:\n    ${areasString}`);
    if (gap) props.push(`gap: ${gap}px`);
    if (justifyItems !== "stretch") props.push(`justify-items: ${justifyItems}`);
    if (alignItems !== "stretch") props.push(`align-items: ${alignItems}`);
    if (justifyContent !== "stretch") props.push(`justify-content: ${justifyContent}`);
    if (alignContent !== "stretch") props.push(`align-content: ${alignContent}`);
    if (autoRows) props.push(`grid-auto-rows: ${autoRows}`);
    if (autoCols) props.push(`grid-auto-columns: ${autoCols}`);
    let s = `.grid-container {\n  ${props.join(";\n  ")};\n}`;
    items.forEach((item, i) => {
      const area = item.area || (hasAreas ? areaNameForCell(item.rowStart, item.colStart) : null);
      if (area) {
        s += `\n\n.grid-item-${i + 1} {\n  grid-area: ${area};\n}`;
      } else {
        s += `\n\n.grid-item-${i + 1} {\n  grid-row: ${item.rowStart + 1} / span ${item.rowSpan};\n  grid-column: ${item.colStart + 1} / span ${item.colSpan};\n}`;
      }
    });
    return s;
  }, [gridTemplateRows, gridTemplateCols, gap, items, hasAreas, areasString, justifyItems, alignItems, justifyContent, alignContent, autoRows, autoCols]);

  const tailwindOutput = useMemo(() => {
    const cls: string[] = ["grid"];
    if (!useAutoFill) {
      const frCols = colSizes.every((s) => s === "1fr");
      if (frCols && cols <= 12) cls.push(`grid-cols-${cols}`);
      else cls.push(`grid-cols-[${colSizes.join("_")}]`);
      const frRows = rowSizes.every((s) => s === "1fr");
      if (frRows && rows <= 6) cls.push(`grid-rows-${rows}`);
      else cls.push(`grid-rows-[${rowSizes.join("_")}]`);
    } else {
      cls.push(`grid-cols-[repeat(${autoFillMode},minmax(${autoFillMin},1fr))]`);
    }
    if (gap) cls.push(`gap-[${gap}px]`);
    if (justifyItems !== "stretch") cls.push(`justify-items-${justifyItems}`);
    if (alignItems !== "stretch") cls.push(`items-${alignItems}`);
    if (justifyContent !== "stretch") cls.push(`justify-${justifyContent === "space-between" ? "between" : justifyContent === "space-around" ? "around" : justifyContent === "space-evenly" ? "evenly" : justifyContent}`);
    if (alignContent !== "stretch") cls.push(`content-${alignContent === "space-between" ? "between" : alignContent === "space-around" ? "around" : alignContent === "space-evenly" ? "evenly" : alignContent}`);

    let s = `{/* Container */}\n<div className="${cls.join(" ")}">`;
    items.forEach((item, i) => {
      const icls: string[] = [];
      if (item.rowSpan > 1) icls.push(`row-span-${item.rowSpan}`);
      if (item.colSpan > 1) icls.push(`col-span-${item.colSpan}`);
      if (item.rowStart > 0) icls.push(`row-start-${item.rowStart + 1}`);
      if (item.colStart > 0) icls.push(`col-start-${item.colStart + 1}`);
      const area = item.area || (hasAreas ? areaNameForCell(item.rowStart, item.colStart) : null);
      if (area) icls.push(`[grid-area:${area}]`);
      s += `\n  <div className="${icls.join(" ")}">{/* Item ${i + 1} */}</div>`;
    });
    s += "\n</div>";
    return s;
  }, [rows, cols, rowSizes, colSizes, gap, items, useAutoFill, autoFillMode, autoFillMin, justifyItems, alignItems, justifyContent, alignContent, hasAreas]);

  const reactOutput = useMemo(() => {
    const style: Record<string, string | number> = { display: "grid", gridTemplateRows, gridTemplateColumns: gridTemplateCols };
    if (gap) style.gap = gap;
    if (hasAreas) style.gridTemplateAreas = areas.map((row) => `"${row.join(" ")}"`).join(" ");
    if (justifyItems !== "stretch") style.justifyItems = justifyItems;
    if (alignItems !== "stretch") style.alignItems = alignItems;
    if (justifyContent !== "stretch") style.justifyContent = justifyContent;
    if (alignContent !== "stretch") style.alignContent = alignContent;
    if (autoRows) style.gridAutoRows = autoRows;
    if (autoCols) style.gridAutoColumns = autoCols;
    const styleStr = JSON.stringify(style, null, 2).replace(/"([^"]+)":/g, "$1:");

    let s = `const containerStyle = ${styleStr};\n\n{/* Items */}`;
    items.forEach((item, i) => {
      const ist: Record<string, string> = {};
      const area = item.area || (hasAreas ? areaNameForCell(item.rowStart, item.colStart) : null);
      if (area) { ist.gridArea = area; }
      else {
        ist.gridRow = `${item.rowStart + 1} / span ${item.rowSpan}`;
        ist.gridColumn = `${item.colStart + 1} / span ${item.colSpan}`;
      }
      s += `\nconst item${i + 1}Style = ${JSON.stringify(ist)};`;
    });
    return s;
  }, [gridTemplateRows, gridTemplateCols, gap, items, hasAreas, areas, justifyItems, alignItems, justifyContent, alignContent, autoRows, autoCols]);

  const currentOutput = outputFormat === "css" ? cssOutput : outputFormat === "tailwind" ? tailwindOutput : reactOutput;

  /* --- Copy --- */
  const copy = useCallback(() => {
    navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [currentOutput]);

  useKeyboardShortcuts(useMemo(() => [{ key: "Enter", meta: true, action: copy, label: "Copy output" }], [copy]));

  /* --- Build preview cells --- */
  const cells: { r: number; c: number; occupied: boolean }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const occupied = items.some((item) => r >= item.rowStart && r < item.rowStart + item.rowSpan && c >= item.colStart && c < item.colStart + item.colSpan);
      cells.push({ r, c, occupied });
    }
  }

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="CSS Grid Generator"
          tagline="Design a CSS grid visually - set columns and rows, define named areas, span cells by dragging."
          description="Drag to create cell spans, click a track handle to resize columns and rows (fr, px, %, minmax), and switch to area mode to assign named grid-areas for readable layouts. Presets cover 12-column holy-grail, image galleries, and magazine layouts. Output is clean grid-template-columns/rows/areas CSS."
          audience={["Front-end developers", "Designers"]}
          whenToUse={[
            "Translating a dashboard wireframe into grid CSS",
            "Building a magazine-style multi-column layout",
            "Learning grid-area and named lines",
          ]}
        />
        {placing && <p className="mt-2 text-sm font-medium text-indigo-600">Click second cell to set span...</p>}
        {areaMode && <p className="mt-2 text-sm font-medium text-amber-600">Area mode: click cells to assign &quot;{areaName}&quot;</p>}

        {/* Presets */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Layout Presets</h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => applyPreset(p)} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-900 hover:bg-gray-900 hover:text-white">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Responsive preview toggle */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Preview:</span>
          {(["mobile", "tablet", "desktop"] as PreviewWidth[]).map((w) => (
            <button key={w} onClick={() => setPreviewWidth(w)} className={`rounded border px-2.5 py-1 text-xs font-medium transition-colors ${previewWidth === w ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-500 hover:text-gray-700"}`}>
              {w === "mobile" ? "320px" : w === "tablet" ? "768px" : "Full"}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Grid Preview */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mx-auto overflow-auto" style={{ maxWidth: PREVIEW_WIDTHS[previewWidth] }}>
              <div
                className="min-h-[300px]"
                style={{
                  display: "grid",
                  gridTemplateRows,
                  gridTemplateColumns: gridTemplateCols,
                  gap,
                  ...(hasAreas ? { gridTemplateAreas: areas.map((row) => `"${row.join(" ")}"`).join(" ") } : {}),
                  ...(justifyItems !== "stretch" ? { justifyItems } : {}),
                  ...(alignItems !== "stretch" ? { alignItems } : {}),
                  ...(justifyContent !== "stretch" ? { justifyContent } : {}),
                  ...(alignContent !== "stretch" ? { alignContent } : {}),
                  ...(autoRows ? { gridAutoRows: autoRows } : {}),
                  ...(autoCols ? { gridAutoColumns: autoCols } : {}),
                }}
              >
                {cells.map(({ r, c, occupied }) => {
                  const an = areaNameForCell(r, c);
                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={() => !occupied && handleCellClick(r, c)}
                      className={`relative rounded border-2 border-dashed transition-colors ${
                        occupied
                          ? "pointer-events-none border-transparent"
                          : areaMode
                            ? an ? "border-amber-300 bg-amber-50 cursor-pointer" : "border-gray-200 hover:border-amber-300 cursor-pointer"
                            : placeStart && r === placeStart.r && c === placeStart.c
                              ? "border-indigo-400 bg-indigo-50 cursor-pointer"
                              : "border-gray-200 hover:border-gray-400 hover:bg-gray-50 cursor-pointer"
                      }`}
                      style={{ gridRow: r + 1, gridColumn: c + 1, minHeight: 60 }}
                    >
                      {an && <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-amber-600/70">{an}</span>}
                    </div>
                  );
                })}
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className="group relative flex items-center justify-center rounded-lg text-sm font-medium text-white"
                    style={{
                      backgroundColor: item.color,
                      ...(item.area ? { gridArea: item.area } : { gridRow: `${item.rowStart + 1} / span ${item.rowSpan}`, gridColumn: `${item.colStart + 1} / span ${item.colSpan}` }),
                    }}
                  >
                    <span className="text-xs opacity-90">{item.area || i + 1}</span>
                    <button onClick={() => removeItem(item.id)} className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/30 text-xs leading-none text-white opacity-0 transition-opacity group-hover:opacity-100">
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Controls sidebar */}
          <div className="space-y-4 overflow-y-auto" style={{ maxHeight: "80vh" }}>
            {/* Grid dimensions */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Grid</h3>
              <SliderControl label="Rows" value={rows} min={1} max={12} onChange={updateRows} />
              <SliderControl label="Columns" value={cols} min={1} max={12} onChange={updateCols} />
              <SliderControl label="Gap" value={gap} min={0} max={40} suffix="px" onChange={setGap} />
            </div>

            {/* Per-track sizing */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Row Sizes</h3>
              {rowSizes.slice(0, rows).map((size, i) => (
                <div key={`r${i}`} className="mb-1.5 flex items-center gap-2">
                  <span className="w-8 text-right text-[10px] font-mono text-gray-400">R{i + 1}</span>
                  <select value={size} onChange={(e) => { const next = [...rowSizes]; next[i] = e.target.value; setRowSizes(next); }} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs">
                    {TRACK_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              ))}
              <h3 className="mb-3 mt-4 text-sm font-medium text-gray-700">Column Sizes</h3>
              <div className="mb-2 flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-gray-500">
                  <input type="checkbox" checked={useAutoFill} onChange={(e) => setUseAutoFill(e.target.checked)} className="rounded accent-gray-700" />
                  Use repeat()
                </label>
              </div>
              {useAutoFill ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-right text-[10px] font-mono text-gray-400">Mode</span>
                    <select value={autoFillMode} onChange={(e) => setAutoFillMode(e.target.value as "auto-fill" | "auto-fit")} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs">
                      <option value="auto-fill">auto-fill</option>
                      <option value="auto-fit">auto-fit</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-8 text-right text-[10px] font-mono text-gray-400">Min</span>
                    <select value={autoFillMin} onChange={(e) => setAutoFillMin(e.target.value)} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs">
                      {["100px", "150px", "200px", "250px", "300px"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                colSizes.slice(0, cols).map((size, i) => (
                  <div key={`c${i}`} className="mb-1.5 flex items-center gap-2">
                    <span className="w-8 text-right text-[10px] font-mono text-gray-400">C{i + 1}</span>
                    <select value={size} onChange={(e) => { const next = [...colSizes]; next[i] = e.target.value; setColSizes(next); }} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs">
                      {TRACK_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))
              )}
            </div>

            {/* Named Areas */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Named Areas</h3>
              <div className="flex items-center gap-2">
                <input value={areaName} onChange={(e) => setAreaName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))} placeholder="area name" className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs" />
                <button onClick={() => setAreaMode(!areaMode)} className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${areaMode ? "bg-amber-500 text-white" : "border border-gray-200 text-gray-600 hover:text-gray-900"}`}>
                  {areaMode ? "Done" : "Paint"}
                </button>
              </div>
              {hasAreas && (
                <button onClick={() => setAreas([])} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Clear all areas</button>
              )}
            </div>

            {/* Advanced properties */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Alignment</h3>
              <SelectRow label="justify-items" value={justifyItems} options={ALIGN_OPTIONS} onChange={(v) => setJustifyItems(v as AlignValue)} />
              <SelectRow label="align-items" value={alignItems} options={ALIGN_OPTIONS} onChange={(v) => setAlignItems(v as AlignValue)} />
              <SelectRow label="justify-content" value={justifyContent} options={CONTENT_OPTIONS} onChange={(v) => setJustifyContent(v as ContentValue)} />
              <SelectRow label="align-content" value={alignContent} options={CONTENT_OPTIONS} onChange={(v) => setAlignContent(v as ContentValue)} />
            </div>

            {/* Implicit grid */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Implicit Grid</h3>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="w-20 text-[10px] text-gray-500">auto-rows</span>
                <select value={autoRows} onChange={(e) => setAutoRows(e.target.value)} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs">
                  <option value="">none</option>
                  {["auto", "1fr", "min-content", "max-content", "100px", "200px", "minmax(100px, auto)"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-20 text-[10px] text-gray-500">auto-cols</span>
                <select value={autoCols} onChange={(e) => setAutoCols(e.target.value)} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs">
                  <option value="">none</option>
                  {["auto", "1fr", "min-content", "max-content", "100px", "200px", "minmax(100px, auto)"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            {/* Items list */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Items ({items.length})</h3>
              {items.length === 0 ? (
                <p className="text-xs text-gray-400">Click cells to place items</p>
              ) : (
                <div className="space-y-1">
                  {items.map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-gray-500">
                      <div className="h-3 w-3 rounded" style={{ backgroundColor: item.color }} />
                      <span className="truncate">{item.area || `Item ${i + 1}`}: r{item.rowStart + 1}-{item.rowStart + item.rowSpan} c{item.colStart + 1}-{item.colStart + item.colSpan}</span>
                      <button onClick={() => removeItem(item.id)} className="ml-auto text-gray-400 hover:text-red-500">&times;</button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => { setItems([]); nextId = 1; }} className="mt-2 text-xs text-gray-400 hover:text-gray-600">Clear all</button>
            </div>
          </div>
        </div>

        {/* Output */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex gap-1">
              {(["css", "tailwind", "react"] as OutputFormat[]).map((f) => (
                <button key={f} onClick={() => setOutputFormat(f)} className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${outputFormat === f ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-700"}`}>
                  {f === "css" ? "CSS" : f === "tailwind" ? "Tailwind" : "React"}
                </button>
              ))}
            </div>
            <button onClick={copy} className="flex items-center gap-1.5 rounded border border-gray-200 px-2.5 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700">
              {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm leading-relaxed text-gray-100"><code>{currentOutput}</code></pre>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SliderControl({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix?: string; onChange: (v: number) => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-16 text-xs text-gray-500">{label}</span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700" />
      <span className="w-10 text-right font-mono text-xs text-gray-400">{value}{suffix || ""}</span>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="mb-1.5 flex items-center gap-2">
      <span className="w-28 text-[10px] font-mono text-gray-500">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
