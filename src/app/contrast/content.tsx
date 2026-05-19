"use client";

import { useState, useMemo, useCallback } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Slider, Segment } from "@/components/tools/controls";

// --- WCAG contrast utilities ---

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

// Try to suggest a better color by adjusting lightness
function suggestFix(
  fg: string,
  bg: string,
  targetRatio: number,
): string | null {
  const [r, g, b] = hexToRgb(fg);
  // Try darkening
  for (let factor = 0.9; factor >= 0; factor -= 0.05) {
    const candidate = rgbToHex(
      Math.round(r * factor),
      Math.round(g * factor),
      Math.round(b * factor),
    );
    if (contrastRatio(candidate, bg) >= targetRatio) return candidate;
  }
  // Try lightening
  for (let factor = 1.1; factor <= 3; factor += 0.1) {
    const candidate = rgbToHex(
      Math.min(255, Math.round(r * factor)),
      Math.min(255, Math.round(g * factor)),
      Math.min(255, Math.round(b * factor)),
    );
    if (contrastRatio(candidate, bg) >= targetRatio) return candidate;
  }
  return null;
}

type WcagLevel = "AAA" | "AA" | "Fail";

function getLevel(
  ratio: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isLarge: boolean,
): { normal: WcagLevel; large: WcagLevel } {
  return {
    normal: ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : "Fail",
    large: ratio >= 4.5 ? "AAA" : ratio >= 3 ? "AA" : "Fail",
  };
}

// --- Component ---

export default function ContrastContent() {
  const [toolState, setToolState] = useToolState({ fg: "#1e293b", bg: "#ffffff" });
  const [fg, _setFg] = useState(toolState.fg);
  const [bg, _setBg] = useState(toolState.bg);
  const setFg = useCallback((v: string) => { _setFg(v); setToolState({ fg: v }); }, [setToolState]);
  const setBg = useCallback((v: string) => { _setBg(v); setToolState({ bg: v }); }, [setToolState]);

  const [textSize, setTextSize] = useState(18);
  const [textWeight, setTextWeight] = useState<"400" | "700">("400");
  const [sampleText, setSampleText] = useState("The quick brown fox jumps over the lazy dog.");

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg]);
  const levels = useMemo(() => getLevel(ratio, false), [ratio]);

  // Two nearest accessible foreground colors when failing (AA threshold)
  const fixes = useMemo(() => {
    if (levels.normal !== "Fail") return [];
    const out: { hex: string; ratio: number; label: string }[] = [];
    const aa = suggestFix(fg, bg, 4.5);
    if (aa) out.push({ hex: aa, ratio: contrastRatio(aa, bg), label: "Nearest AA" });
    const aaa = suggestFix(fg, bg, 7);
    if (aaa && aaa !== aa) out.push({ hex: aaa, ratio: contrastRatio(aaa, bg), label: "Nearest AAA" });
    return out.slice(0, 2);
  }, [fg, bg, levels.normal]);

  const copyRatio = useCallback(() => {
    navigator.clipboard.writeText(`${ratio.toFixed(2)}:1`);
  }, [ratio]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: copyRatio, label: "Copy ratio" },
  ], [copyRatio]));

  const swap = () => {
    const a = fg;
    setFg(bg);
    setBg(a);
  };

  const Badge = ({
    level,
    label,
    req,
  }: {
    level: WcagLevel;
    label: string;
    req: string;
  }) => {
    const tone =
      level === "AAA"
        ? { bg: "rgba(34,197,94,0.14)", fg: "#16a34a", border: "rgba(34,197,94,0.30)" }
        : level === "AA"
          ? { bg: "rgba(234,179,8,0.14)", fg: "#a16207", border: "rgba(234,179,8,0.30)" }
          : { bg: "rgba(239,68,68,0.14)", fg: "#b91c1c", border: "rgba(239,68,68,0.30)" };
    return (
      <span
        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium"
        style={{
          background: tone.bg,
          color: tone.fg,
          border: `1px solid ${tone.border}`,
          borderRadius: "999px",
        }}
        title={`Requires ${req}`}
      >
        {level === "Fail" ? "✗" : "✓"} {label} {level}
      </span>
    );
  };

  const ColorField = ({ label, value, onChange }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
        {label}
      </label>
      <div
        className="flex items-center gap-2 p-1.5"
        style={{
          background: "var(--kami-surface-solid)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-input-radius, 0.5rem)",
        }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 cursor-pointer rounded border-0"
          aria-label={`${label} picker`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
          }}
          className="w-full border-0 bg-transparent px-1 py-1 font-mono text-sm focus:outline-none"
          style={{ color: "var(--kami-text)" }}
          placeholder="#000000"
          aria-label={`${label} hex`}
        />
      </div>
    </div>
  );

  return (
    <ToolShell
      title="Contrast Checker"
      tagline="WCAG AA / AAA · live preview · suggested fixes"
      accent="#8b5cf6"
      materialFab={{ label: "Copy hex", onClick: copyRatio }}
      actions={
        <>
          <ToolActionButton onClick={swap} variant="outline">Swap</ToolActionButton>
          <ToolActionButton onClick={copyRatio} variant="solid">Copy ratio</ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Foreground">
            <ColorField label="Text color" value={fg} onChange={setFg} />
          </ControlGroup>

          <ControlGroup label="Background">
            <ColorField label="Background color" value={bg} onChange={setBg} />
          </ControlGroup>

          <ControlGroup label="Preview text size" hint={`${textSize}px`}>
            <Slider value={textSize} onChange={(v) => setTextSize(Math.round(v))} min={10} max={64} unit="px" />
          </ControlGroup>

          <ControlGroup label="Weight">
            <Segment
              value={textWeight}
              onChange={setTextWeight}
              options={[
                { value: "400", label: "Regular" },
                { value: "700", label: "Bold" },
              ]}
              full
            />
          </ControlGroup>

          <ControlGroup label="Sample text">
            <textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface-solid))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
              }}
            />
          </ControlGroup>

          {fixes.length > 0 && (
            <ControlGroup label="Suggested fixes">
              <div className="flex flex-col gap-2">
                {fixes.map((fx) => (
                  <button
                    key={fx.hex}
                    onClick={() => setFg(fx.hex)}
                    className="flex items-center gap-2 p-2 text-left text-sm"
                    style={{
                      background: "var(--kami-surface)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    }}
                  >
                    <span
                      className="inline-block h-6 w-6 shrink-0"
                      style={{
                        background: fx.hex,
                        border: "1px solid var(--kami-border)",
                        borderRadius: "var(--kami-cta-radius, 0.25rem)",
                      }}
                    />
                    <span className="flex-1">
                      <span className="block text-xs font-medium" style={{ color: "var(--kami-text)" }}>{fx.label}</span>
                      <span className="block text-[10px] font-mono" style={{ color: "var(--kami-text-dim)" }}>{fx.hex} · {fx.ratio.toFixed(2)}:1</span>
                    </span>
                  </button>
                ))}
              </div>
            </ControlGroup>
          )}
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Pick a foreground and background color. We compute the WCAG contrast ratio
            and tell you whether it passes AA / AAA for body text, large text, and UI
            components. When it fails, we suggest the nearest accessible color.
          </p>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Made for</div>
            <p className="mt-1">Designers, accessibility engineers, front-end devs.</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Reach for it when</div>
            <ul className="mt-1 space-y-1 text-xs">
              <li>· Verifying a brand color against a background</li>
              <li>· Checking a button or link meets WCAG</li>
              <li>· Auditing a page for accessibility failures</li>
            </ul>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>WCAG thresholds</div>
            <ul className="mt-1 space-y-1 text-xs font-mono">
              <li>AA normal: 4.5 : 1</li>
              <li>AA large / UI: 3 : 1</li>
              <li>AAA normal: 7 : 1</li>
              <li>AAA large: 4.5 : 1</li>
            </ul>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-[60vh] flex-col gap-3">
        {/* Large preview pane */}
        <div
          className="flex flex-1 min-h-[260px] flex-col justify-center overflow-hidden p-6 sm:p-10"
          style={{
            backgroundColor: bg,
            color: fg,
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <p
            style={{
              fontSize: `${textSize}px`,
              fontWeight: textWeight,
              lineHeight: 1.35,
            }}
          >
            {sampleText}
          </p>
          <p
            className="mt-3"
            style={{
              fontSize: `${Math.max(10, textSize - 6)}px`,
              opacity: 0.85,
            }}
          >
            Sample at {textSize}px {textWeight === "700" ? "bold" : "regular"} · {fg} on {bg}
          </p>
        </div>

        {/* Ratio + badges */}
        <div
          className="flex flex-wrap items-center justify-between gap-4 p-4"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <div>
            <div className="text-4xl font-bold tabular-nums leading-none">
              {ratio.toFixed(2)}
              <span className="text-base font-normal" style={{ color: "var(--kami-text-dim)" }}>:1</span>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
              Contrast ratio
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge level={levels.normal} label="Normal" req={levels.normal === "AAA" ? "7:1" : "4.5:1"} />
            <Badge level={levels.large} label="Large" req={levels.large === "AAA" ? "4.5:1" : "3:1"} />
            <Badge
              level={ratio >= 3 ? "AA" : "Fail"}
              label="UI"
              req="3:1"
            />
          </div>
        </div>
      </div>
    </ToolShell>
  );
}
