"use client";

import { useState, useMemo, useCallback } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

/* ─── Types ─── */
interface FlexChild {
  id: number;
  order: number;
  flexGrow: number;
  flexShrink: number;
  flexBasis: string;
  alignSelf: string;
  color: string;
  label: string;
}

interface Preset {
  name: string;
  desc: string;
  container: Partial<ContainerState>;
  children: Partial<FlexChild>[];
}

interface ContainerState {
  direction: string;
  wrap: string;
  justify: string;
  alignItems: string;
  alignContent: string;
  rowGap: number;
  colGap: number;
}

/* ─── Constants ─── */
const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#06b6d4"];
const JUSTIFY = ["flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"];
const ALIGN_ITEMS = ["stretch", "flex-start", "flex-end", "center", "baseline"];
const ALIGN_CONTENT = ["stretch", "flex-start", "flex-end", "center", "space-between", "space-around", "space-evenly"];
const DIRECTION = ["row", "row-reverse", "column", "column-reverse"];
const WRAP = ["nowrap", "wrap", "wrap-reverse"];
const ALIGN_SELF = ["auto", "flex-start", "flex-end", "center", "stretch", "baseline"];
const BASIS_OPTIONS = ["auto", "0", "50px", "100px", "150px", "200px", "25%", "33.33%", "50%", "100%"];
const VIEWPORTS = [
  { label: "Mobile", width: 320 },
  { label: "Tablet", width: 768 },
  { label: "Desktop", width: 0 },
] as const;

type OutputTab = "css" | "tailwind" | "react";

let nextId = 1;
function makeChild(overrides?: Partial<FlexChild>): FlexChild {
  const id = nextId++;
  return {
    id,
    order: 0,
    flexGrow: 0,
    flexShrink: 1,
    flexBasis: "auto",
    alignSelf: "auto",
    color: COLORS[(id - 1) % COLORS.length],
    label: `${id}`,
    ...overrides,
  };
}

/* ─── Presets ─── */
const PRESETS: Preset[] = [
  {
    name: "Holy Grail",
    desc: "Header / sidebar / main / sidebar / footer",
    container: { direction: "row", wrap: "wrap", justify: "flex-start", alignItems: "stretch", rowGap: 8, colGap: 8 },
    children: [
      { flexGrow: 0, flexBasis: "100%", label: "Header" },
      { flexGrow: 0, flexBasis: "160px", label: "Nav" },
      { flexGrow: 1, flexBasis: "0", label: "Main" },
      { flexGrow: 0, flexBasis: "160px", label: "Aside" },
      { flexGrow: 0, flexBasis: "100%", label: "Footer" },
    ],
  },
  {
    name: "Navbar",
    desc: "Logo left, links center, CTA right",
    container: { direction: "row", wrap: "nowrap", justify: "space-between", alignItems: "center", rowGap: 0, colGap: 16 },
    children: [
      { flexGrow: 0, label: "Logo" },
      { flexGrow: 1, label: "Links" },
      { flexGrow: 0, label: "CTA" },
    ],
  },
  {
    name: "Card Grid",
    desc: "Wrapping equal-width cards",
    container: { direction: "row", wrap: "wrap", justify: "flex-start", alignItems: "stretch", rowGap: 16, colGap: 16 },
    children: [
      { flexGrow: 0, flexBasis: "200px", label: "Card 1" },
      { flexGrow: 0, flexBasis: "200px", label: "Card 2" },
      { flexGrow: 0, flexBasis: "200px", label: "Card 3" },
      { flexGrow: 0, flexBasis: "200px", label: "Card 4" },
      { flexGrow: 0, flexBasis: "200px", label: "Card 5" },
      { flexGrow: 0, flexBasis: "200px", label: "Card 6" },
    ],
  },
  {
    name: "Sidebar Layout",
    desc: "Fixed sidebar + fluid main",
    container: { direction: "row", wrap: "nowrap", justify: "flex-start", alignItems: "stretch", rowGap: 0, colGap: 0 },
    children: [
      { flexGrow: 0, flexBasis: "240px", label: "Sidebar" },
      { flexGrow: 1, flexBasis: "0", label: "Main" },
    ],
  },
  {
    name: "Centered",
    desc: "Both axes centered",
    container: { direction: "row", wrap: "nowrap", justify: "center", alignItems: "center", rowGap: 0, colGap: 16 },
    children: [
      { flexGrow: 0, label: "Centered" },
    ],
  },
  {
    name: "Media Object",
    desc: "Image + text side by side",
    container: { direction: "row", wrap: "nowrap", justify: "flex-start", alignItems: "flex-start", rowGap: 0, colGap: 12 },
    children: [
      { flexGrow: 0, flexBasis: "80px", label: "Img" },
      { flexGrow: 1, flexBasis: "0", label: "Text content" },
    ],
  },
  {
    name: "Sticky Footer",
    desc: "Content grows, footer sticks to bottom",
    container: { direction: "column", wrap: "nowrap", justify: "flex-start", alignItems: "stretch", rowGap: 0, colGap: 0 },
    children: [
      { flexGrow: 0, label: "Header" },
      { flexGrow: 1, label: "Content" },
      { flexGrow: 0, label: "Footer" },
    ],
  },
  {
    name: "Equal Columns",
    desc: "Equal-height, equal-width columns",
    container: { direction: "row", wrap: "nowrap", justify: "flex-start", alignItems: "stretch", rowGap: 0, colGap: 12 },
    children: [
      { flexGrow: 1, flexBasis: "0", label: "Col 1" },
      { flexGrow: 1, flexBasis: "0", label: "Col 2" },
      { flexGrow: 1, flexBasis: "0", label: "Col 3" },
    ],
  },
];

/* ─── Tailwind map helpers ─── */
const twDirection: Record<string, string> = { row: "flex-row", "row-reverse": "flex-row-reverse", column: "flex-col", "column-reverse": "flex-col-reverse" };
const twWrap: Record<string, string> = { nowrap: "flex-nowrap", wrap: "flex-wrap", "wrap-reverse": "flex-wrap-reverse" };
const twJustify: Record<string, string> = { "flex-start": "justify-start", "flex-end": "justify-end", center: "justify-center", "space-between": "justify-between", "space-around": "justify-around", "space-evenly": "justify-evenly" };
const twAlignItems: Record<string, string> = { stretch: "items-stretch", "flex-start": "items-start", "flex-end": "items-end", center: "items-center", baseline: "items-baseline" };
const twAlignContent: Record<string, string> = { stretch: "content-stretch", "flex-start": "content-start", "flex-end": "content-end", center: "content-center", "space-between": "content-between", "space-around": "content-around", "space-evenly": "content-evenly" };
const twAlignSelf: Record<string, string> = { auto: "self-auto", "flex-start": "self-start", "flex-end": "self-end", center: "self-center", stretch: "self-stretch", baseline: "self-baseline" };

function gapToTw(px: number): string {
  const map: Record<number, string> = { 0: "0", 1: "px", 2: "0.5", 4: "1", 6: "1.5", 8: "2", 10: "2.5", 12: "3", 16: "4", 20: "5", 24: "6", 28: "7", 32: "8", 36: "9", 40: "10" };
  return map[px] ?? `[${px}px]`;
}

/* ─── Copy icon SVGs ─── */
function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
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

/* ─── Main Component ─── */
export default function FlexboxContent() {
  const [container, setContainer] = useState<ContainerState>({
    direction: "row", wrap: "nowrap", justify: "flex-start",
    alignItems: "stretch", alignContent: "stretch", rowGap: 8, colGap: 8,
  });
  const [children, setChildren] = useState<FlexChild[]>(() => [makeChild(), makeChild(), makeChild()]);
  const [selected, setSelected] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [outputTab, setOutputTab] = useState<OutputTab>("css");
  const [viewport, setViewport] = useState(0); // 0 = desktop (full)

  const setC = (updates: Partial<ContainerState>) => setContainer((prev) => ({ ...prev, ...updates }));
  const addChild = () => setChildren((prev) => [...prev, makeChild()]);
  const removeChild = (id: number) => {
    setChildren((prev) => prev.filter((c) => c.id !== id));
    if (selected === id) setSelected(null);
  };
  const updateChild = (id: number, updates: Partial<FlexChild>) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };
  const moveChild = (id: number, dir: -1 | 1) => {
    setChildren((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx < 0) return prev;
      const target = idx + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const applyPreset = (preset: Preset) => {
    nextId = 1;
    const newChildren = preset.children.map((c) => makeChild(c));
    setChildren(newChildren);
    setContainer({
      direction: preset.container.direction ?? "row",
      wrap: preset.container.wrap ?? "nowrap",
      justify: preset.container.justify ?? "flex-start",
      alignItems: preset.container.alignItems ?? "stretch",
      alignContent: preset.container.alignContent ?? "stretch",
      rowGap: preset.container.rowGap ?? 8,
      colGap: preset.container.colGap ?? 8,
    });
    setSelected(null);
  };

  /* ─── Output generation ─── */
  const gapCSS = container.rowGap === container.colGap
    ? `gap: ${container.rowGap}px;`
    : `row-gap: ${container.rowGap}px;\n  column-gap: ${container.colGap}px;`;

  const cssOutput = useMemo(() => {
    const lines = [
      "/* Container */",
      ".flex-container {",
      "  display: flex;",
      `  flex-direction: ${container.direction};`,
      `  flex-wrap: ${container.wrap};`,
      `  justify-content: ${container.justify};`,
      `  align-items: ${container.alignItems};`,
      ...(container.wrap !== "nowrap" ? [`  align-content: ${container.alignContent};`] : []),
      `  ${gapCSS}`,
      "}",
      "",
      "/* Children */",
    ];
    children.forEach((c, i) => {
      const shorthand = `${c.flexGrow} ${c.flexShrink} ${c.flexBasis}`;
      lines.push(`.flex-item-${i + 1} {`);
      lines.push(`  flex: ${shorthand};`);
      if (c.order !== 0) lines.push(`  order: ${c.order};`);
      if (c.alignSelf !== "auto") lines.push(`  align-self: ${c.alignSelf};`);
      lines.push("}");
      if (i < children.length - 1) lines.push("");
    });
    return lines.join("\n");
  }, [container, children, gapCSS]);

  const tailwindOutput = useMemo(() => {
    const containerClasses = [
      "flex",
      twDirection[container.direction],
      twWrap[container.wrap],
      twJustify[container.justify],
      twAlignItems[container.alignItems],
    ];
    if (container.wrap !== "nowrap") containerClasses.push(twAlignContent[container.alignContent]);
    if (container.rowGap === container.colGap) {
      containerClasses.push(`gap-${gapToTw(container.rowGap)}`);
    } else {
      containerClasses.push(`gap-x-${gapToTw(container.colGap)}`);
      containerClasses.push(`gap-y-${gapToTw(container.rowGap)}`);
    }
    const lines = [
      "<!-- Container -->",
      `<div class="${containerClasses.filter(Boolean).join(" ")}">`,
    ];
    children.forEach((c, i) => {
      const cls: string[] = [];
      if (c.flexGrow === 1 && c.flexShrink === 1 && c.flexBasis === "0") cls.push("flex-1");
      else if (c.flexGrow === 0 && c.flexShrink === 1 && c.flexBasis === "auto") cls.push("flex-initial");
      else if (c.flexGrow === 0 && c.flexShrink === 0) cls.push("flex-none");
      else {
        if (c.flexGrow > 0) cls.push(`grow-${c.flexGrow === 1 ? "" : `[${c.flexGrow}]`}`.replace(/-$/, "").replace("grow-", c.flexGrow === 1 ? "grow" : `grow-[${c.flexGrow}]`));
        else cls.push("grow-0");
        if (c.flexShrink === 0) cls.push("shrink-0");
        else if (c.flexShrink > 1) cls.push(`shrink-[${c.flexShrink}]`);
        if (c.flexBasis !== "auto") cls.push(`basis-[${c.flexBasis}]`);
      }
      if (c.order !== 0) cls.push(`order-${c.order}`);
      if (c.alignSelf !== "auto") cls.push(twAlignSelf[c.alignSelf]);
      lines.push(`  <div class="${cls.join(" ")}"><!-- Item ${i + 1} --></div>`);
    });
    lines.push("</div>");
    return lines.join("\n");
  }, [container, children]);

  const reactOutput = useMemo(() => {
    const styleObj: Record<string, string | number> = {
      display: "flex",
      flexDirection: container.direction,
      flexWrap: container.wrap,
      justifyContent: container.justify,
      alignItems: container.alignItems,
    };
    if (container.wrap !== "nowrap") styleObj.alignContent = container.alignContent;
    if (container.rowGap === container.colGap) {
      styleObj.gap = container.rowGap;
    } else {
      styleObj.rowGap = container.rowGap;
      styleObj.columnGap = container.colGap;
    }
    const lines = [
      "// Container style",
      `const containerStyle: React.CSSProperties = ${JSON.stringify(styleObj, null, 2)};`,
      "",
      "// Children styles",
    ];
    children.forEach((c, i) => {
      const s: Record<string, string | number> = {
        flex: `${c.flexGrow} ${c.flexShrink} ${c.flexBasis}`,
      };
      if (c.order !== 0) s.order = c.order;
      if (c.alignSelf !== "auto") s.alignSelf = c.alignSelf;
      lines.push(`const item${i + 1}Style: React.CSSProperties = ${JSON.stringify(s, null, 2)};`);
    });
    return lines.join("\n");
  }, [container, children]);

  const currentOutput = outputTab === "css" ? cssOutput : outputTab === "tailwind" ? tailwindOutput : reactOutput;

  const copy = useCallback(() => {
    navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }, [currentOutput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => copy(), label: "Copy output" },
  ], [copy]));

  const selectedChild = children.find((c) => c.id === selected);
  const selectedIdx = selectedChild ? children.indexOf(selectedChild) : -1;

  const isVertical = container.direction.startsWith("column");
  const axisLabel = isVertical ? "Main: vertical" : "Main: horizontal";
  const crossLabel = isVertical ? "Cross: horizontal" : "Cross: vertical";

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Flexbox Playground"
          tagline="Learn and generate flexbox layouts interactively - every property labeled with what it actually does."
          description="Toggle direction, justify-content, align-items, wrap, and gap on a live preview. Hover any option to see a plain-English description (justify-content: space-between = pushes first and last items to the edges, equal gaps between). Add/remove child items to test how flex-grow and flex-shrink behave. Export as CSS, Tailwind, or an inline style object."
          audience={["Front-end developers", "Designers learning CSS"]}
          whenToUse={[
            "Building a nav bar, card row, or centered dialog",
            "Learning the difference between justify / align",
            "Copy-pasting a working flex recipe into a project",
          ]}
        />

        {/* ─── Presets ─── */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Layout Presets</h3>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                onClick={() => applyPreset(p)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 hover:bg-gray-50 transition-colors"
                title={p.desc}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* ─── Viewport toggle ─── */}
        <div className="mt-4 flex items-center gap-1">
          <span className="mr-2 text-xs text-gray-500">Preview width:</span>
          {VIEWPORTS.map((v) => (
            <button
              key={v.label}
              onClick={() => setViewport(v.width)}
              className={`rounded-md px-2.5 py-1 text-xs transition-colors ${viewport === v.width ? "bg-gray-900 text-white" : "border border-gray-200 text-gray-500 hover:bg-gray-100"}`}
            >
              {v.label}{v.width > 0 ? ` (${v.width}px)` : ""}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* ─── Preview ─── */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            {/* Axis indicators */}
            <div className="mb-3 flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  {isVertical ? <path d="M7 2v10M4 9l3 3 3-3" /> : <path d="M2 7h10M9 4l3 3-3 3" />}
                </svg>
                {axisLabel}
              </span>
              <span className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2">
                  {isVertical ? <path d="M2 7h10M9 4l3 3-3 3" /> : <path d="M7 2v10M4 9l3 3 3-3" />}
                </svg>
                {crossLabel}
              </span>
            </div>

            <div
              className="mx-auto overflow-auto rounded-lg border-2 border-dashed border-gray-300 p-4 transition-all"
              style={{
                maxWidth: viewport > 0 ? viewport : "none",
                minHeight: 300,
                display: "flex",
                flexDirection: container.direction as React.CSSProperties["flexDirection"],
                flexWrap: container.wrap as React.CSSProperties["flexWrap"],
                justifyContent: container.justify,
                alignItems: container.alignItems,
                alignContent: container.wrap !== "nowrap" ? container.alignContent : undefined,
                rowGap: container.rowGap,
                columnGap: container.colGap,
              }}
            >
              {children.map((child) => (
                <div
                  key={child.id}
                  onClick={() => setSelected(child.id === selected ? null : child.id)}
                  className={`flex min-h-[60px] min-w-[48px] cursor-pointer items-center justify-center rounded-lg text-white text-xs font-medium transition-all select-none ${child.id === selected ? "ring-2 ring-gray-900 ring-offset-2" : "hover:opacity-90"}`}
                  style={{
                    backgroundColor: child.color,
                    order: child.order,
                    flexGrow: child.flexGrow,
                    flexShrink: child.flexShrink,
                    flexBasis: child.flexBasis,
                    alignSelf: child.alignSelf as React.CSSProperties["alignSelf"],
                    padding: "12px 14px",
                  }}
                >
                  {child.label}
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={addChild} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100">+ Add Item</button>
              {children.length > 0 && (
                <button onClick={() => { nextId = 1; setChildren([makeChild(), makeChild(), makeChild()]); setSelected(null); }} className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100">Reset</button>
              )}
            </div>
          </div>

          {/* ─── Controls Panel ─── */}
          <div className="space-y-4">
            {/* Container props */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-medium text-gray-700">Container</h3>
              <SelectControl label="Direction" value={container.direction} options={DIRECTION} onChange={(v) => setC({ direction: v })} />
              <SelectControl label="Wrap" value={container.wrap} options={WRAP} onChange={(v) => setC({ wrap: v })} />
              <SelectControl label="Justify" value={container.justify} options={JUSTIFY} onChange={(v) => setC({ justify: v })} />
              <SelectControl label="Align Items" value={container.alignItems} options={ALIGN_ITEMS} onChange={(v) => setC({ alignItems: v })} />
              {container.wrap !== "nowrap" && (
                <SelectControl label="Align Content" value={container.alignContent} options={ALIGN_CONTENT} onChange={(v) => setC({ alignContent: v })} />
              )}
              <GapControl label="Row Gap" value={container.rowGap} onChange={(v) => setC({ rowGap: v })} />
              <GapControl label="Col Gap" value={container.colGap} onChange={(v) => setC({ colGap: v })} />
            </div>

            {/* Child props */}
            {selectedChild && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-700">Item {selectedIdx + 1}</h3>
                  <div className="flex items-center gap-1">
                    <button onClick={() => moveChild(selectedChild.id, -1)} disabled={selectedIdx === 0} className="rounded p-0.5 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l4-4 4 4" /></svg>
                    </button>
                    <button onClick={() => moveChild(selectedChild.id, 1)} disabled={selectedIdx === children.length - 1} className="rounded p-0.5 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6l4 4 4-4" /></svg>
                    </button>
                    {children.length > 1 && (
                      <button onClick={() => removeChild(selectedChild.id)} className="ml-1 text-xs text-gray-400 hover:text-red-500">Remove</button>
                    )}
                  </div>
                </div>
                <NumControl label="Order" value={selectedChild.order} min={-10} max={10} onChange={(v) => updateChild(selectedChild.id, { order: v })} />
                <NumControl label="Flex Grow" value={selectedChild.flexGrow} min={0} max={10} onChange={(v) => updateChild(selectedChild.id, { flexGrow: v })} />
                <NumControl label="Flex Shrink" value={selectedChild.flexShrink} min={0} max={10} onChange={(v) => updateChild(selectedChild.id, { flexShrink: v })} />
                <SelectControl label="Flex Basis" value={selectedChild.flexBasis} options={BASIS_OPTIONS} onChange={(v) => updateChild(selectedChild.id, { flexBasis: v })} />
                <SelectControl label="Align Self" value={selectedChild.alignSelf} options={ALIGN_SELF} onChange={(v) => updateChild(selectedChild.id, { alignSelf: v })} />
                <div className="mt-2 rounded-md bg-gray-50 px-2.5 py-1.5 font-mono text-xs text-gray-500">
                  flex: {selectedChild.flexGrow} {selectedChild.flexShrink} {selectedChild.flexBasis}
                </div>
              </div>
            )}
            {!selectedChild && (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-center text-sm text-gray-400">
                Click an item to edit its properties
              </div>
            )}
          </div>
        </div>

        {/* ─── Output ─── */}
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(["css", "tailwind", "react"] as OutputTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setOutputTab(tab)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${outputTab === tab ? "bg-gray-900 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                >
                  {tab === "css" ? "CSS" : tab === "tailwind" ? "Tailwind" : "React"}
                </button>
              ))}
            </div>
            <button onClick={copy} className="flex items-center gap-1.5 rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm leading-relaxed text-gray-100"><code>{currentOutput}</code></pre>
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable Controls ─── */
function SelectControl({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-gray-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 rounded border border-gray-200 px-2 py-1 text-xs focus:border-gray-400 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function NumControl({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-gray-500">{label}</span>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
      />
      <span className="w-8 text-right text-xs font-mono text-gray-400">{value}</span>
    </div>
  );
}

function GapControl({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-24 shrink-0 text-xs text-gray-500">{label}</span>
      <input
        type="range" min={0} max={40} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
      />
      <span className="w-10 text-right text-xs font-mono text-gray-400">{value}px</span>
    </div>
  );
}
