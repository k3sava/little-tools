"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
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
type AlignValue = "stretch" | "start" | "end" | "center";
type ContentValue = "stretch" | "start" | "end" | "center" | "space-between" | "space-around" | "space-evenly";
type AutoFlow = "row" | "column" | "row dense" | "column dense";

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
    label: "Gallery",
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
      { rowStart: 1, colStart: 0, rowSpan: 1, colSpan: 1 },
      { rowStart: 1, colStart: 1, rowSpan: 1, colSpan: 1 },
      { rowStart: 1, colStart: 2, rowSpan: 1, colSpan: 1 },
      { rowStart: 1, colStart: 3, rowSpan: 1, colSpan: 1 },
      { rowStart: 2, colStart: 0, rowSpan: 1, colSpan: 4, area: "banner" },
    ],
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
    label: "Masonry",
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
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function GridContent() {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  useEffect(() => {
    const readTheme = () => document.documentElement.getAttribute("data-theme") ?? "default";
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isGlass    = currentTheme === "glass";

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
  const [areaMode, setAreaMode] = useState(false);
  const [areaName, setAreaName] = useState("header");
  const [areas, setAreas] = useState<string[][]>([]);
  const [justifyItems, setJustifyItems] = useState<AlignValue>("stretch");
  const [alignItems, setAlignItems] = useState<AlignValue>("stretch");
  const [justifyContent, setJustifyContent] = useState<ContentValue>("stretch");
  const [alignContent, setAlignContent] = useState<ContentValue>("stretch");
  const [autoFlow, setAutoFlow] = useState<AutoFlow>("row");
  const [useAutoFill, setUseAutoFill] = useState(false);
  const [autoFillMin, setAutoFillMin] = useState("200px");
  const [autoFillMode, setAutoFillMode] = useState<"auto-fill" | "auto-fit">("auto-fill");

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

  const gridTemplateRows = rowSizes.slice(0, rows).join(" ");
  const gridTemplateCols = useAutoFill ? `repeat(${autoFillMode}, minmax(${autoFillMin}, 1fr))` : colSizes.slice(0, cols).join(" ");
  const hasAreas = areas.length > 0 && areas.some((row) => row.some((c) => c !== "."));
  const areasString = hasAreas ? areas.map((row) => `"${row.join(" ")}"`).join("\n  ") : "";

  const areaNameForCell = (r: number, c: number) => (areas[r] && areas[r][c] && areas[r][c] !== "." ? areas[r][c] : null);

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
    if (autoFlow !== "row") props.push(`grid-auto-flow: ${autoFlow}`);
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
  }, [gridTemplateRows, gridTemplateCols, gap, items, hasAreas, areasString, justifyItems, alignItems, justifyContent, alignContent, autoFlow]);

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
    let s = `<div class="${cls.join(" ")}">`;
    items.forEach((item, i) => {
      const icls: string[] = [];
      if (item.rowSpan > 1) icls.push(`row-span-${item.rowSpan}`);
      if (item.colSpan > 1) icls.push(`col-span-${item.colSpan}`);
      const area = item.area || (hasAreas ? areaNameForCell(item.rowStart, item.colStart) : null);
      if (area) icls.push(`[grid-area:${area}]`);
      s += `\n  <div class="${icls.join(" ")}"><!-- Item ${i + 1} --></div>`;
    });
    s += "\n</div>";
    return s;
  }, [rows, cols, rowSizes, colSizes, gap, items, useAutoFill, autoFillMode, autoFillMin, hasAreas]);

  const reactOutput = useMemo(() => {
    const style: Record<string, string | number> = { display: "grid", gridTemplateRows, gridTemplateColumns: gridTemplateCols };
    if (gap) style.gap = gap;
    if (hasAreas) style.gridTemplateAreas = areas.map((row) => `"${row.join(" ")}"`).join(" ");
    const styleStr = JSON.stringify(style, null, 2).replace(/"([^"]+)":/g, "$1:");
    return `const containerStyle = ${styleStr};`;
  }, [gridTemplateRows, gridTemplateCols, gap, hasAreas, areas]);

  const currentOutput = outputFormat === "css" ? cssOutput : outputFormat === "tailwind" ? tailwindOutput : reactOutput;

  const copy = useCallback(() => {
    navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [currentOutput]);

  useKeyboardShortcuts(useMemo(() => [{ key: "Enter", meta: true, action: copy, label: "Copy output" }], [copy]));

  const cells: { r: number; c: number; occupied: boolean }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const occupied = items.some((item) => r >= item.rowStart && r < item.rowStart + item.rowSpan && c >= item.colStart && c < item.colStart + item.colSpan);
      cells.push({ r, c, occupied });
    }
  }

  return (
    <ToolShell
      title="CSS Grid"
      tagline="Visual track editor — drag to span, paint named areas, copy grid-template CSS"
      accent="#8b5cf6"
      actions={
        <>
          <Segment
            value={outputFormat}
            onChange={setOutputFormat}
            options={[
              { value: "css", label: "CSS" },
              { value: "tailwind", label: "TW" },
              { value: "react", label: "React" },
            ]}
            size="sm"
          />
          <ToolActionButton onClick={copy} variant="solid">
            {copied ? "Copied!" : "Copy"}
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Presets">
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-2 py-2 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    minHeight: 40,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup label="Rows" hint={`${rows}`}>
            <Slider value={rows} onChange={updateRows} min={1} max={12} />
          </ControlGroup>
          <ControlGroup label="Columns" hint={`${cols}`}>
            <Slider value={cols} onChange={updateCols} min={1} max={12} />
          </ControlGroup>
          <ControlGroup label="Gap" hint={`${gap}px`}>
            <Slider value={gap} onChange={setGap} min={0} max={40} unit="px" />
          </ControlGroup>

          <ControlGroup>
            <Toggle
              checked={useAutoFill}
              onChange={setUseAutoFill}
              label="repeat() columns"
              hint="auto-fill / auto-fit with minmax"
            />
          </ControlGroup>

          {useAutoFill ? (
            <>
              <ControlGroup label="Mode">
                <Segment
                  value={autoFillMode}
                  onChange={setAutoFillMode}
                  options={[
                    { value: "auto-fill", label: "auto-fill" },
                    { value: "auto-fit", label: "auto-fit" },
                  ]}
                  full
                  size="sm"
                />
              </ControlGroup>
              <ControlGroup label="Min track">
                <Select
                  value={autoFillMin}
                  onChange={setAutoFillMin}
                  options={["100px", "150px", "200px", "250px", "300px"].map((o) => ({ value: o, label: o }))}
                />
              </ControlGroup>
            </>
          ) : (
            <ControlGroup label="Row tracks">
              {rowSizes.slice(0, rows).map((size, i) => (
                <Select
                  key={`r${i}`}
                  label={`R${i + 1}`}
                  value={size}
                  onChange={(v) => {
                    const next = [...rowSizes];
                    next[i] = v;
                    setRowSizes(next);
                  }}
                  options={TRACK_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              ))}
            </ControlGroup>
          )}

          {!useAutoFill && (
            <ControlGroup label="Column tracks">
              {colSizes.slice(0, cols).map((size, i) => (
                <Select
                  key={`c${i}`}
                  label={`C${i + 1}`}
                  value={size}
                  onChange={(v) => {
                    const next = [...colSizes];
                    next[i] = v;
                    setColSizes(next);
                  }}
                  options={TRACK_OPTIONS.map((o) => ({ value: o, label: o }))}
                />
              ))}
            </ControlGroup>
          )}

          <ControlGroup label="Auto flow">
            <Segment
              value={autoFlow}
              onChange={setAutoFlow}
              options={[
                { value: "row", label: "row" },
                { value: "column", label: "col" },
                { value: "row dense", label: "row dense" },
                { value: "column dense", label: "col dense" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>

          <ControlGroup label="Named areas">
            <input
              value={areaName}
              onChange={(e) => setAreaName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
              placeholder="area name"
              className="mb-2 w-full px-3 py-2 text-sm"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
              }}
            />
            <Toggle
              checked={areaMode}
              onChange={setAreaMode}
              label="Paint mode"
              hint="Tap cells to assign the area name"
            />
            {hasAreas && (
              <button
                type="button"
                onClick={() => setAreas([])}
                className="mt-2 text-xs"
                style={{ color: "var(--kami-text-dim)" }}
              >
                Clear all areas
              </button>
            )}
          </ControlGroup>

          <ControlGroup label="Justify items">
            <Segment
              value={justifyItems}
              onChange={setJustifyItems}
              options={[
                { value: "stretch", label: "stretch" },
                { value: "start", label: "start" },
                { value: "center", label: "center" },
                { value: "end", label: "end" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>
          <ControlGroup label="Align items">
            <Segment
              value={alignItems}
              onChange={setAlignItems}
              options={[
                { value: "stretch", label: "stretch" },
                { value: "start", label: "start" },
                { value: "center", label: "center" },
                { value: "end", label: "end" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>
          <ControlGroup label="Justify content">
            <Select
              value={justifyContent}
              onChange={setJustifyContent}
              options={(["stretch", "start", "end", "center", "space-between", "space-around", "space-evenly"] as ContentValue[]).map((o) => ({ value: o, label: o }))}
            />
          </ControlGroup>
          <ControlGroup label="Align content">
            <Select
              value={alignContent}
              onChange={setAlignContent}
              options={(["stretch", "start", "end", "center", "space-between", "space-around", "space-evenly"] as ContentValue[]).map((o) => ({ value: o, label: o }))}
            />
          </ControlGroup>

          {items.length > 0 && (
            <ControlGroup label={`Items (${items.length})`}>
              <div className="space-y-1">
                {items.map((item, i) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 px-2 py-1.5 text-xs"
                    style={{ color: "var(--kami-text-muted)", borderRadius: 6 }}
                  >
                    <div className="h-3 w-3 rounded" style={{ background: item.color }} />
                    <span className="truncate">{item.area || `#${i + 1}`}</span>
                    <button onClick={() => removeItem(item.id)} className="ml-auto" style={{ color: "var(--kami-text-dim)" }}>×</button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => { setItems([]); nextId = 1; }}
                  className="mt-1 text-xs"
                  style={{ color: "var(--kami-text-dim)" }}
                >
                  Clear all items
                </button>
              </div>
            </ControlGroup>
          )}

          <ControlGroup label="Output">
            <pre
              className="overflow-x-auto p-3 text-xs"
              style={{
                background: "var(--kami-overlay-bg, #0d1117)",
                color: "var(--kami-overlay-text, #f1f5f9)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                maxHeight: 260,
              }}
            >
              <code>{currentOutput}</code>
            </pre>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Tap two cells to place an item spanning the rectangle between them. Toggle
            paint mode to assign named areas instead.
          </p>
          <p className="text-xs">
            {placing && "Tap a second cell to set the item span."}
            {areaMode && `Paint mode: tap cells to assign "${areaName}".`}
          </p>
        </div>
      }
    >
      <div className={isGlass ? "glass-canvas-section" : ""}>
      <div
        className="h-full min-h-[60vh] w-full overflow-auto p-4"
        style={{
          background: "var(--kami-surface)",
          borderRadius: "var(--kami-card-radius, 0.75rem)",
          border: "1px solid var(--kami-border-strong)",
        }}
      >
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
            ...(autoFlow !== "row" ? { gridAutoFlow: autoFlow } : {}),
          }}
        >
          {cells.map(({ r, c, occupied }) => {
            const an = areaNameForCell(r, c);
            const isPlaceStart = !!(placeStart && r === placeStart.r && c === placeStart.c);
            let bg = "transparent";
            let border = "2px dashed var(--kami-border-strong)";
            if (areaMode && an) {
              bg = "color-mix(in srgb, #f59e0b 12%, var(--kami-surface-solid))";
              border = "2px dashed #f59e0b";
            } else if (isPlaceStart) {
              bg = "color-mix(in srgb, #6366f1 12%, var(--kami-surface-solid))";
              border = "2px dashed #6366f1";
            }
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => !occupied && handleCellClick(r, c)}
                disabled={occupied}
                style={{
                  gridRow: r + 1,
                  gridColumn: c + 1,
                  minHeight: 56,
                  borderRadius: "var(--kami-cta-radius, 0.25rem)",
                  background: bg,
                  border: occupied ? "none" : border,
                  cursor: occupied ? "default" : "pointer",
                }}
              >
                {an && (
                  <span className="text-[10px] font-mono" style={{ color: "color-mix(in srgb, #d97706 70%, var(--kami-text-muted))" }}>
                    {an}
                  </span>
                )}
              </button>
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
              <button
                onClick={() => removeItem(item.id)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/30 text-xs leading-none text-white"
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
      </div>
    </ToolShell>
  );
}
