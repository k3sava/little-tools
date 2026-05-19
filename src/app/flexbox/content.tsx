"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
  ToolIconButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment, Select } from "@/components/tools/controls";

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
const ALIGN_SELF = ["auto", "flex-start", "flex-end", "center", "stretch", "baseline"];
const BASIS_OPTIONS = ["auto", "0", "50px", "100px", "150px", "200px", "25%", "33.33%", "50%", "100%"];

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
    ],
  },
  {
    name: "Sidebar",
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
    name: "Equal Cols",
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

  const reset = () => {
    nextId = 1;
    setChildren([makeChild(), makeChild(), makeChild()]);
    setSelected(null);
  };

  /* ─── Output generation ─── */
  const gapCSS = container.rowGap === container.colGap
    ? `gap: ${container.rowGap}px;`
    : `row-gap: ${container.rowGap}px;\n  column-gap: ${container.colGap}px;`;

  const cssOutput = useMemo(() => {
    const lines = [
      ".flex-container {",
      "  display: flex;",
      `  flex-direction: ${container.direction};`,
      `  flex-wrap: ${container.wrap};`,
      `  justify-content: ${container.justify};`,
      `  align-items: ${container.alignItems};`,
      ...(container.wrap !== "nowrap" ? [`  align-content: ${container.alignContent};`] : []),
      `  ${gapCSS}`,
      "}",
    ];
    children.forEach((c, i) => {
      lines.push("");
      lines.push(`.flex-item-${i + 1} {`);
      lines.push(`  flex: ${c.flexGrow} ${c.flexShrink} ${c.flexBasis};`);
      if (c.order !== 0) lines.push(`  order: ${c.order};`);
      if (c.alignSelf !== "auto") lines.push(`  align-self: ${c.alignSelf};`);
      lines.push("}");
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
      `<div class="${containerClasses.filter(Boolean).join(" ")}">`,
    ];
    children.forEach((c, i) => {
      const cls: string[] = [];
      if (c.flexGrow === 1 && c.flexShrink === 1 && c.flexBasis === "0") cls.push("flex-1");
      else if (c.flexGrow === 0 && c.flexShrink === 1 && c.flexBasis === "auto") cls.push("flex-initial");
      else if (c.flexGrow === 0 && c.flexShrink === 0) cls.push("flex-none");
      else {
        if (c.flexGrow > 0) cls.push(c.flexGrow === 1 ? "grow" : `grow-[${c.flexGrow}]`);
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
      `const containerStyle: React.CSSProperties = ${JSON.stringify(styleObj, null, 2)};`,
      "",
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

  return (
    <ToolShell
      title="Flexbox"
      tagline="Live playground for direction, wrap, justify, align and per-item flex"
      accent="#8b5cf6"
      actions={
        <>
          <Segment
            value={outputTab}
            onChange={setOutputTab}
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
                  key={p.name}
                  type="button"
                  onClick={() => applyPreset(p)}
                  title={p.desc}
                  className="px-2 py-2 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    minHeight: 40,
                  }}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </ControlGroup>

          <ControlGroup label="Items" hint={`${children.length}`}>
            <div className="flex flex-wrap gap-1.5">
              {children.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected(c.id === selected ? null : c.id)}
                  className="px-2.5 py-1.5 text-xs font-mono"
                  style={{
                    background: c.id === selected ? "var(--kami-cta-bg)" : c.color,
                    color: c.id === selected ? "var(--kami-cta-text)" : "#ffffff",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    minHeight: 44,
                    minWidth: 44,
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <ToolActionButton onClick={addChild} variant="outline">+ Item</ToolActionButton>
              <ToolActionButton onClick={reset} variant="ghost">Reset</ToolActionButton>
            </div>
          </ControlGroup>

          <ControlGroup label="Direction">
            <Segment
              value={container.direction}
              onChange={(v) => setC({ direction: v })}
              options={[
                { value: "row", label: "row" },
                { value: "row-reverse", label: "row-rev" },
                { value: "column", label: "col" },
                { value: "column-reverse", label: "col-rev" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>
          <ControlGroup label="Wrap">
            <Segment
              value={container.wrap}
              onChange={(v) => setC({ wrap: v })}
              options={[
                { value: "nowrap", label: "nowrap" },
                { value: "wrap", label: "wrap" },
                { value: "wrap-reverse", label: "wrap-rev" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>
          <ControlGroup label="Justify">
            <Select
              value={container.justify}
              onChange={(v) => setC({ justify: v })}
              options={JUSTIFY.map((j) => ({ value: j, label: j }))}
            />
          </ControlGroup>
          <ControlGroup label="Align items">
            <Select
              value={container.alignItems}
              onChange={(v) => setC({ alignItems: v })}
              options={ALIGN_ITEMS.map((j) => ({ value: j, label: j }))}
            />
          </ControlGroup>
          {container.wrap !== "nowrap" && (
            <ControlGroup label="Align content">
              <Select
                value={container.alignContent}
                onChange={(v) => setC({ alignContent: v })}
                options={ALIGN_CONTENT.map((j) => ({ value: j, label: j }))}
              />
            </ControlGroup>
          )}
          <ControlGroup label="Row gap" hint={`${container.rowGap}px`}>
            <Slider value={container.rowGap} onChange={(v) => setC({ rowGap: v })} min={0} max={40} unit="px" />
          </ControlGroup>
          <ControlGroup label="Column gap" hint={`${container.colGap}px`}>
            <Slider value={container.colGap} onChange={(v) => setC({ colGap: v })} min={0} max={40} unit="px" />
          </ControlGroup>

          {selectedChild && (
            <ControlGroup label={`Item ${selectedIdx + 1}`} hint={`flex: ${selectedChild.flexGrow} ${selectedChild.flexShrink} ${selectedChild.flexBasis}`}>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <ToolIconButton label="Move up" onClick={() => moveChild(selectedChild.id, -1)} disabled={selectedIdx === 0}>↑</ToolIconButton>
                <ToolIconButton label="Move down" onClick={() => moveChild(selectedChild.id, 1)} disabled={selectedIdx === children.length - 1}>↓</ToolIconButton>
                <ToolIconButton label="Remove" onClick={() => removeChild(selectedChild.id)} disabled={children.length <= 1}>×</ToolIconButton>
              </div>
              <Slider label="Order" value={selectedChild.order} onChange={(v) => updateChild(selectedChild.id, { order: v })} min={-10} max={10} />
              <Slider label="Grow" value={selectedChild.flexGrow} onChange={(v) => updateChild(selectedChild.id, { flexGrow: v })} min={0} max={10} />
              <Slider label="Shrink" value={selectedChild.flexShrink} onChange={(v) => updateChild(selectedChild.id, { flexShrink: v })} min={0} max={10} />
              <Select
                label="Basis"
                value={selectedChild.flexBasis}
                onChange={(v) => updateChild(selectedChild.id, { flexBasis: v })}
                options={BASIS_OPTIONS.map((b) => ({ value: b, label: b }))}
              />
              <Select
                label="Align self"
                value={selectedChild.alignSelf}
                onChange={(v) => updateChild(selectedChild.id, { alignSelf: v })}
                options={ALIGN_SELF.map((a) => ({ value: a, label: a }))}
              />
            </ControlGroup>
          )}

          <ControlGroup label="Output">
            <pre
              className="overflow-x-auto p-3 text-xs"
              style={{
                background: "var(--kami-overlay-bg, #0d1117)",
                color: "var(--kami-overlay-text, #f1f5f9)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                maxHeight: 240,
              }}
            >
              <code>{currentOutput}</code>
            </pre>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm kami-text-muted">
          <p>
            Tap an item in the preview (or pill in the panel) to edit per-item flex
            properties. Use the reorder arrows in the item panel to change DOM order.
          </p>
          <p className="text-xs">
            Main axis is {isVertical ? "vertical" : "horizontal"}; the cross axis runs
            perpendicular.
          </p>
        </div>
      }
    >
      <div className="glass-canvas-section">
        <div
          className="flex h-full min-h-[60vh] w-full flex-col gap-2 p-4"
          style={{
            background: "var(--kami-surface)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            border: "1px solid var(--kami-border-strong)",
          }}
        >
          <div
            className="flex-1 overflow-auto p-3"
            style={{
              border: "2px dashed var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.5rem)",
              display: "flex",
              flexDirection: container.direction as React.CSSProperties["flexDirection"],
              flexWrap: container.wrap as React.CSSProperties["flexWrap"],
              justifyContent: container.justify,
              alignItems: container.alignItems,
              alignContent: container.wrap !== "nowrap" ? container.alignContent : undefined,
              rowGap: container.rowGap,
              columnGap: container.colGap,
              minHeight: 280,
            }}
          >
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setSelected(child.id === selected ? null : child.id)}
                className="flex min-h-[60px] min-w-[60px] cursor-pointer items-center justify-center rounded-lg text-xs font-medium text-white transition-all"
                style={{
                  backgroundColor: child.color,
                  order: child.order,
                  flexGrow: child.flexGrow,
                  flexShrink: child.flexShrink,
                  flexBasis: child.flexBasis,
                  alignSelf: child.alignSelf as React.CSSProperties["alignSelf"],
                  padding: "12px 14px",
                  outline: child.id === selected ? "3px solid var(--kami-text)" : "none",
                  outlineOffset: 2,
                }}
              >
                {child.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
