"use client";

import { useState, useMemo, useCallback } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ReferencePanel, RuleRow } from "@/components/tools/reference-panel";

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

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg]);
  const levels = useMemo(() => getLevel(ratio, false), [ratio]);
  const aaFix = useMemo(
    () => (levels.normal === "Fail" ? suggestFix(fg, bg, 4.5) : null),
    [fg, bg, levels.normal],
  );
  const aaaFix = useMemo(
    () =>
      levels.normal !== "AAA" ? suggestFix(fg, bg, 7) : null,
    [fg, bg, levels.normal],
  );

  const copyRatio = useCallback(() => {
    navigator.clipboard.writeText(`${ratio.toFixed(2)}:1`);
  }, [ratio]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: copyRatio, label: "Copy" },
  ], [copyRatio]));

  const swap = () => {
    setFg(bg);
    setBg(fg);
  };

  const Badge = ({
    level,
    label,
  }: {
    level: WcagLevel;
    label: string;
  }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
        level === "AAA"
          ? "bg-green-100 text-green-800"
          : level === "AA"
            ? "bg-yellow-100 text-yellow-800"
            : "bg-red-100 text-red-800"
      }`}
    >
      {level === "Fail" ? "✗" : "✓"} {label} {level}
    </span>
  );

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
        <ToolIntro
          title="Contrast Checker"
          tagline="Check any color combo against WCAG AA and AAA, with live preview and suggestions when it fails."
          description="Pick a foreground and background color. We compute the WCAG contrast ratio and tell you whether it passes AA / AAA for body text, large text, and UI components. When it fails, we offer nudges (darker text, lighter background) that would bring it into compliance."
          audience={["Designers", "Accessibility engineers", "Front-end devs"]}
          whenToUse={[
            "Verifying a brand color against a background",
            "Checking a button or link meets WCAG",
            "Auditing a page for accessibility failures",
          ]}
          quickLinks={[
            { label: "WCAG thresholds explained", href: "#wcag-thresholds" },
          ]}
        />

        {/* Color Inputs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <ColorInput label="Foreground" value={fg} onChange={setFg} />
          <div className="flex items-end justify-center pb-2">
            <button
              onClick={swap}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-100 transition-colors"
              title="Swap colors"
            >
              ⇄
            </button>
          </div>
          <ColorInput label="Background" value={bg} onChange={setBg} />
        </div>

        {/* Ratio Display */}
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
          <div className="text-5xl font-bold tabular-nums">
            {ratio.toFixed(2)}
            <span className="text-lg font-normal text-gray-400">:1</span>
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge level={levels.normal} label="Normal Text" />
            <Badge level={levels.large} label="Large Text" />
          </div>
        </div>

        {/* Preview */}
        <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="p-6" style={{ backgroundColor: bg, color: fg }}>
            <h3 className="text-2xl font-bold mb-2">Heading (24px Bold)</h3>
            <p className="text-base mb-3">
              This is normal body text (16px). Check how readable it looks
              against the background.
            </p>
            <p className="text-sm">
              Small text (14px) - harder to read with low contrast.
            </p>
            <p className="mt-3 text-xs opacity-80">
              Tiny text (12px) - requires excellent contrast for readability.
            </p>
          </div>
        </div>

        {/* Suggestions */}
        {(aaFix || aaaFix) && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Suggested Fixes</h2>
            <div className="space-y-3">
              {aaFix && (
                <SuggestionRow
                  label="AA (4.5:1)"
                  color={aaFix}
                  bg={bg}
                  ratio={contrastRatio(aaFix, bg)}
                  onApply={() => setFg(aaFix)}
                />
              )}
              {aaaFix && (
                <SuggestionRow
                  label="AAA (7:1)"
                  color={aaaFix}
                  bg={bg}
                  ratio={contrastRatio(aaaFix, bg)}
                  onApply={() => setFg(aaaFix)}
                />
              )}
            </div>
          </div>
        )}

        {/* Cross-link */}
        <div className="mt-6 text-sm text-gray-400">
          Need a full palette?{" "}
          <a
            href="/palette"
            className="text-gray-600 underline hover:text-gray-800"
          >
            Color Palette Generator
          </a>
        </div>

        <ReferencePanel
          id="wcag-thresholds"
          title="WCAG contrast thresholds, explained"
          summary="The specific numbers you need to hit, and when to hit them."
          defaultOpen
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm font-semibold text-gray-900">Level AA (the common baseline)</div>
              <div className="mt-2 space-y-1">
                <RuleRow rule="4.5 : 1" explanation="Normal body text (<18pt or <14pt bold)" />
                <RuleRow rule="3.0 : 1" explanation="Large text (18pt+ or 14pt+ bold)" />
                <RuleRow rule="3.0 : 1" explanation="UI components, icons, focus indicators" />
              </div>
              <div className="mt-2 text-xs text-gray-500">Required by ADA, Section 508, European EN 301 549, and most design systems.</div>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-sm font-semibold text-gray-900">Level AAA (the stricter bar)</div>
              <div className="mt-2 space-y-1">
                <RuleRow rule="7.0 : 1" explanation="Normal body text" />
                <RuleRow rule="4.5 : 1" explanation="Large text" />
              </div>
              <div className="mt-2 text-xs text-gray-500">Required for some government / medical / financial contexts. Not always achievable with brand colors.</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              <strong>Gotcha:</strong> WCAG contrast is based on luminance only - it doesn&apos;t
              capture hue or saturation differences. Two very different-looking colors can fail.
              For body text, prefer AA (4.5:1) as a baseline; AAA is a nice-to-have.
            </div>
          </div>
        </ReferencePanel>
      </div>
    </div>
  );
}

// --- Sub-components ---

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white p-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-10 cursor-pointer rounded border-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v);
            else if (/^#[0-9a-fA-F]{0,6}$/.test(v))
              onChange(v); // allow partial typing
          }}
          className="w-full rounded border-0 px-2 py-1 font-mono text-sm focus:outline-none"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

function SuggestionRow({
  label,
  color,
  bg,
  ratio,
  onApply,
}: {
  label: string;
  color: string;
  bg: string;
  ratio: number;
  onApply: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="h-8 w-8 rounded border border-gray-200"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-2 text-xs text-gray-400">
          {color} - {ratio.toFixed(2)}:1
        </span>
      </div>
      <div
        className="rounded px-3 py-1 text-xs"
        style={{ backgroundColor: bg, color }}
      >
        Preview
      </div>
      <button
        onClick={onApply}
        className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-200"
      >
        Apply
      </button>
    </div>
  );
}
