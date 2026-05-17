"use client";

import { useState, useCallback, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Slider } from "@/components/tools/controls";

const ACCENT_PMM = "#14b8a6";

// ---------------------------------------------------------------------------
// Statistical helpers
// ---------------------------------------------------------------------------

/** Standard normal CDF using Abramowitz & Stegun approximation */
function normalCDF(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327;
  const p =
    d *
    t *
    (0.3193815 +
      t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.3302744))));
  return x > 0 ? 1 - p : p;
}

/** Inverse normal CDF using Beasley-Springer-Moro rational approximation */
function normalInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;

  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838,
    -2.549732539343734, 4.374664141464968, 2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996,
    3.754408661907416,
  ];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;

  let q: number, r: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
          c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      )
    );
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "results" | "planner";

interface ResultsInput {
  visitorsControl: string;
  conversionsControl: string;
  visitorsVariant: string;
  conversionsVariant: string;
}

interface PlannerInput {
  baselineRate: string;
  mde: string;
  significance: number;
  power: number;
  dailyTraffic: string;
}

interface ResultsOutput {
  rateControl: number;
  rateVariant: number;
  absoluteLift: number;
  relativeLift: number;
  pValue: number;
  zScore: number;
  isSignificant: boolean;
  confidenceLevel: number;
  ciLower: number;
  ciUpper: number;
  seDiff: number;
  pooledRate: number;
  pooledSE: number;
  achievedPower: number;
}

interface PlannerOutput {
  samplePerVariant: number;
  totalSample: number;
  daysNeeded: number | null;
}

// ---------------------------------------------------------------------------
// Calculation functions
// ---------------------------------------------------------------------------

function calculateResults(
  input: ResultsInput,
  significance: number,
): ResultsOutput | null {
  const n1 = parseInt(input.visitorsControl, 10);
  const x1 = parseInt(input.conversionsControl, 10);
  const n2 = parseInt(input.visitorsVariant, 10);
  const x2 = parseInt(input.conversionsVariant, 10);

  if ([n1, x1, n2, x2].some((v) => isNaN(v) || v < 0)) return null;
  if (n1 === 0 || n2 === 0) return null;
  if (x1 > n1 || x2 > n2) return null;

  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const pPooled = (x1 + x2) / (n1 + n2);

  const pooledSE = Math.sqrt(pPooled * (1 - pPooled) * (1 / n1 + 1 / n2));
  if (pooledSE === 0) return null;

  const z = (p2 - p1) / pooledSE;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));

  const alpha = 1 - significance;
  const zAlpha = normalInv(1 - alpha / 2);

  // Confidence interval for the difference (unpooled SE)
  const seDiff = Math.sqrt((p1 * (1 - p1)) / n1 + (p2 * (1 - p2)) / n2);
  const diff = p2 - p1;
  const ciLower = diff - zAlpha * seDiff;
  const ciUpper = diff + zAlpha * seDiff;

  // Achieved power
  const effectSize = Math.abs(p2 - p1);
  const achievedPower =
    effectSize > 0
      ? 1 - normalCDF(zAlpha - effectSize / seDiff)
      : 0;

  return {
    rateControl: p1,
    rateVariant: p2,
    absoluteLift: diff,
    relativeLift: p1 > 0 ? diff / p1 : 0,
    pValue,
    zScore: z,
    isSignificant: pValue < alpha,
    confidenceLevel: significance,
    ciLower,
    ciUpper,
    seDiff,
    pooledRate: pPooled,
    pooledSE,
    achievedPower,
  };
}

function calculateSampleSize(input: PlannerInput): PlannerOutput | null {
  const baseline = parseFloat(input.baselineRate) / 100;
  const mde = parseFloat(input.mde) / 100;
  const dailyTraffic = input.dailyTraffic ? parseInt(input.dailyTraffic, 10) : null;

  if (isNaN(baseline) || baseline <= 0 || baseline >= 1) return null;
  if (isNaN(mde) || mde <= 0) return null;

  const p1 = baseline;
  const p2 = baseline * (1 + mde);
  if (p2 >= 1) return null;

  const alpha = 1 - input.significance;
  const zAlpha = normalInv(1 - alpha / 2);
  const zBeta = normalInv(input.power);

  const numerator =
    Math.pow(zAlpha + zBeta, 2) * (p1 * (1 - p1) + p2 * (1 - p2));
  const denominator = Math.pow(p2 - p1, 2);

  const n = Math.ceil(numerator / denominator);

  let daysNeeded: number | null = null;
  if (dailyTraffic && dailyTraffic > 0) {
    // Traffic split evenly between 2 variants
    daysNeeded = Math.ceil((n * 2) / dailyTraffic);
  }

  return {
    samplePerVariant: n,
    totalSample: n * 2,
    daysNeeded,
  };
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function pct(n: number, decimals = 2): string {
  return (n * 100).toFixed(decimals) + "%";
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ABTestCalculatorContent() {
  const [tab, setTab] = useState<Tab>("results");

  // Results Analyzer state - pre-filled with example data
  const [resultsInput, setResultsInput] = useState<ResultsInput>({
    visitorsControl: "5000",
    conversionsControl: "150",
    visitorsVariant: "5000",
    conversionsVariant: "185",
  });
  const [resultsSignificance, setResultsSignificance] = useState(0.95);

  // Sample Size Planner state
  const [plannerInput, setPlannerInput] = useState<PlannerInput>({
    baselineRate: "3",
    mde: "20",
    significance: 0.95,
    power: 0.8,
    dailyTraffic: "1000",
  });

  // Compute results
  const resultsOutput = useMemo(
    () => calculateResults(resultsInput, resultsSignificance),
    [resultsInput, resultsSignificance],
  );

  const plannerOutput = useMemo(
    () => calculateSampleSize(plannerInput),
    [plannerInput],
  );

  const updateResults = useCallback(
    (key: keyof ResultsInput, value: string) => {
      setResultsInput((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const updatePlanner = useCallback(
    (key: keyof PlannerInput, value: string | number) => {
      setPlannerInput((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Keyboard shortcut - Cmd+Enter to focus on calculate (results auto-calculate)
  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "Enter",
          meta: true,
          action: () => {
            // Results auto-calculate; this is a no-op but registered for UX consistency
          },
          label: "Calculate",
        },
      ],
      [],
    ),
  );

  const controls = (
    <>
      <ControlGroup label="Mode">
        <Segment
          value={tab}
          onChange={setTab}
          options={[
            { value: "results", label: "Significance" },
            { value: "planner", label: "Sample size" },
          ]}
          full
        />
      </ControlGroup>
      {tab === "results" ? (
        <ControlGroup label="Confidence level">
          <Segment
            value={resultsSignificance}
            onChange={setResultsSignificance}
            options={[
              { value: 0.9, label: "90%" },
              { value: 0.95, label: "95%" },
              { value: 0.99, label: "99%" },
            ]}
            full
          />
        </ControlGroup>
      ) : (
        <>
          <ControlGroup label="Significance">
            <Segment
              value={plannerInput.significance}
              onChange={(v) => updatePlanner("significance", v)}
              options={[
                { value: 0.9, label: "90%" },
                { value: 0.95, label: "95%" },
                { value: 0.99, label: "99%" },
              ]}
              full
            />
          </ControlGroup>
          <ControlGroup label="Power">
            <Segment
              value={plannerInput.power}
              onChange={(v) => updatePlanner("power", v)}
              options={[
                { value: 0.8, label: "80%" },
                { value: 0.9, label: "90%" },
              ]}
              full
            />
          </ControlGroup>
          <ControlGroup label="MDE (relative lift)">
            <Slider
              value={parseFloat(plannerInput.mde) || 0}
              onChange={(v) => updatePlanner("mde", String(v))}
              min={1}
              max={100}
              step={1}
              unit="%"
            />
          </ControlGroup>
        </>
      )}
    </>
  );

  const actions = null;

  const info = (
    <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
      <p>Two modes: Significance (paste visitor + conversion counts to see if the lift is real) and Sample size (plan how many visitors you need).</p>
      <ul className="space-y-1">
        <li><strong>p-value:</strong> probability the difference is random.</li>
        <li><strong>Power:</strong> ability to detect a real effect. 80% is standard.</li>
        <li><strong>MDE:</strong> smallest lift you can reliably catch.</li>
      </ul>
      <p><strong>Tip:</strong> never peek; never test 20 metrics; run for a full week minimum.</p>
    </div>
  );

  return (
    <ToolShell
      title="A/B Test Calculator"
      tagline="Significance · sample size · confidence interval · power"
      accent={ACCENT_PMM}
      actions={actions}
      controls={controls}
      info={info}
    >
      <div className="flex flex-col gap-5 p-4 md:p-6">
        {tab === "results" ? (
          <ResultsAnalyzer
            input={resultsInput}
            significance={resultsSignificance}
            output={resultsOutput}
            onUpdateInput={updateResults}
          />
        ) : (
          <SampleSizePlanner input={plannerInput} output={plannerOutput} onUpdate={updatePlanner} />
        )}
      </div>
    </ToolShell>
  );
}

// ---------------------------------------------------------------------------
// Results Analyzer
// ---------------------------------------------------------------------------

function ResultsAnalyzer({
  input,
  output,
  onUpdateInput,
}: {
  input: ResultsInput;
  significance: number;
  output: ResultsOutput | null;
  onUpdateInput: (key: keyof ResultsInput, value: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Input cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Control */}
        <div
          className="p-5"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
            Control (A)
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Visitors
              </label>
              <input
                type="number"
                value={input.visitorsControl}
                onChange={(e) =>
                  onUpdateInput("visitorsControl", e.target.value)
                }
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Conversions
              </label>
              <input
                type="number"
                value={input.conversionsControl}
                onChange={(e) =>
                  onUpdateInput("conversionsControl", e.target.value)
                }
                placeholder="e.g. 150"
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Variant */}
        <div
          className="p-5"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
            Variant (B)
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Visitors
              </label>
              <input
                type="number"
                value={input.visitorsVariant}
                onChange={(e) =>
                  onUpdateInput("visitorsVariant", e.target.value)
                }
                placeholder="e.g. 5000"
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Conversions
              </label>
              <input
                type="number"
                value={input.conversionsVariant}
                onChange={(e) =>
                  onUpdateInput("conversionsVariant", e.target.value)
                }
                placeholder="e.g. 185"
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
                min="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      {output && <ResultsDisplay output={output} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results display
// ---------------------------------------------------------------------------

function ResultsDisplay({ output }: { output: ResultsOutput }) {
  const verdictAccent = output.isSignificant ? "#16a34a" : "#f59e0b";
  const verdictDot = output.isSignificant ? "bg-green-500" : "bg-amber-400";

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <div
        className="p-6 text-center"
        style={{
          background: `color-mix(in srgb, ${verdictAccent} 10%, var(--kami-surface))`,
          border: `1px solid color-mix(in srgb, ${verdictAccent} 30%, transparent)`,
          borderRadius: "var(--kami-card-radius, 0.75rem)",
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${verdictDot}`}
          />
          <span className="text-xl font-bold" style={{ color: "var(--kami-text)" }}>
            {output.isSignificant
              ? "Statistically Significant"
              : "Not Significant"}
          </span>
        </div>
        <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          {output.isSignificant
            ? `You can be ${(output.confidenceLevel * 100).toFixed(0)}% confident this result is real.`
            : `Not enough evidence at the ${(output.confidenceLevel * 100).toFixed(0)}% confidence level. Consider running longer.`}
        </p>
      </div>

      {/* Key metrics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard
          label="Control Rate"
          value={pct(output.rateControl)}
          sublabel={`${formatNumber(Math.round(output.rateControl * parseInt("1")))} conv.`}
          hideSubLabel
        />
        <MetricCard
          label="Variant Rate"
          value={pct(output.rateVariant)}
          sublabel=""
          hideSubLabel
        />
        <MetricCard
          label="Relative Lift"
          value={
            (output.relativeLift >= 0 ? "+" : "") +
            pct(output.relativeLift, 1)
          }
          sublabel={`Absolute: ${output.absoluteLift >= 0 ? "+" : ""}${pct(output.absoluteLift)}`}
        />
        <MetricCard
          label="p-value"
          value={output.pValue < 0.0001 ? "< 0.0001" : output.pValue.toFixed(4)}
          sublabel={`Z = ${output.zScore.toFixed(3)}`}
        />
      </div>

      {/* Confidence interval visualization */}
      <div
        className="p-5"
        style={{
          background: "var(--kami-surface-solid)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-card-radius, 0.75rem)",
          boxShadow: "var(--kami-card-shadow, none)",
        }}
      >
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
          {(output.confidenceLevel * 100).toFixed(0)}% Confidence Interval for
          the Difference
        </h3>
        <ConfidenceIntervalBar
          lower={output.ciLower}
          upper={output.ciUpper}
          point={output.absoluteLift}
        />
        <div className="mt-3 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-muted)" }}>
          <span>{pct(output.ciLower)}</span>
          <span className="font-medium" style={{ color: "var(--kami-text)" }}>
            {output.absoluteLift >= 0 ? "+" : ""}
            {pct(output.absoluteLift)}
          </span>
          <span>{pct(output.ciUpper)}</span>
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
          {output.ciLower > 0
            ? "The entire interval is above zero, indicating a positive effect."
            : output.ciUpper < 0
              ? "The entire interval is below zero, indicating a negative effect."
              : "The interval crosses zero. The true effect could be positive, negative, or zero."}
        </p>
      </div>

      {/* Power */}
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
          <h3 className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
            Statistical Power Achieved
          </h3>
          <span
            className={`text-lg font-bold ${
              output.achievedPower >= 0.8
                ? "text-green-700"
                : "text-amber-600"
            }`}
          >
            {pct(output.achievedPower, 1)}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--kami-surface)" }}>
          <div
            className={`h-full rounded-full transition-all ${
              output.achievedPower >= 0.8 ? "bg-green-500" : "bg-amber-400"
            }`}
            style={{ width: `${Math.min(output.achievedPower * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
          {output.achievedPower >= 0.8
            ? "Adequate power (>= 80%). The test is well-powered to detect this effect size."
            : "Low power (< 80%). The test may not have had enough visitors to reliably detect this effect. Consider a larger sample."}
        </p>
      </div>

      {/* Show the math */}
      <details
        style={{
          background: "var(--kami-surface-solid)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-card-radius, 0.75rem)",
          boxShadow: "var(--kami-card-shadow, none)",
        }}
      >
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
          Show the math
        </summary>
        <div className="px-5 py-4" style={{ borderTop: "1px solid var(--kami-border)" }}>
          <div className="space-y-3 font-mono text-xs" style={{ color: "var(--kami-text-muted)" }}>
            <div>
              <span style={{ color: "var(--kami-text-dim)" }}>// Conversion rates</span>
              <br />
              p_control = {pct(output.rateControl, 4)}
              <br />
              p_variant = {pct(output.rateVariant, 4)}
            </div>
            <div>
              <span style={{ color: "var(--kami-text-dim)" }}>// Pooled proportion</span>
              <br />
              p_pooled = {output.pooledRate.toFixed(6)}
            </div>
            <div>
              <span style={{ color: "var(--kami-text-dim)" }}>// Pooled standard error</span>
              <br />
              SE_pooled = sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
              <br />
              SE_pooled = {output.pooledSE.toFixed(6)}
            </div>
            <div>
              <span style={{ color: "var(--kami-text-dim)" }}>// Z-score</span>
              <br />
              Z = (p_variant - p_control) / SE_pooled
              <br />Z = {output.zScore.toFixed(6)}
            </div>
            <div>
              <span style={{ color: "var(--kami-text-dim)" }}>// Two-tailed p-value</span>
              <br />
              p_value = 2 * (1 - Phi(|Z|))
              <br />
              p_value = {output.pValue.toFixed(6)}
            </div>
            <div>
              <span style={{ color: "var(--kami-text-dim)" }}>// Confidence interval</span>
              <br />
              SE_diff = sqrt(p1*(1-p1)/n1 + p2*(1-p2)/n2)
              <br />
              SE_diff = {output.seDiff.toFixed(6)}
              <br />
              CI = ({pct(output.absoluteLift, 4)}) +/-{" "}
              {normalInv(1 - (1 - output.confidenceLevel) / 2).toFixed(4)} *{" "}
              {output.seDiff.toFixed(6)}
              <br />
              CI = [{pct(output.ciLower, 4)}, {pct(output.ciUpper, 4)}]
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confidence Interval Bar
// ---------------------------------------------------------------------------

function ConfidenceIntervalBar({
  lower,
  upper,
  point,
}: {
  lower: number;
  upper: number;
  point: number;
}) {
  // Scale so the bar fits the range with some padding
  const range = upper - lower;
  if (range === 0) return null;

  const padding = range * 0.3;
  const min = lower - padding;
  const max = upper + padding;
  const total = max - min;

  const toPercent = (v: number) => ((v - min) / total) * 100;

  const barLeft = toPercent(lower);
  const barRight = 100 - toPercent(upper);
  const pointPos = toPercent(point);
  const zeroPos = toPercent(0);
  const zeroInRange = zeroPos >= 0 && zeroPos <= 100;

  return (
    <div className="relative h-8">
      {/* Background track */}
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" style={{ background: "var(--kami-surface)" }} />

      {/* Zero line */}
      {zeroInRange && (
        <div
          className="absolute top-0 h-full w-px"
          style={{ left: `${zeroPos}%`, background: "var(--kami-border-strong)" }}
        >
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px]" style={{ color: "var(--kami-text-dim)" }}>
            0
          </span>
        </div>
      )}

      {/* CI bar */}
      <div
        className={`absolute top-1/2 h-3 -translate-y-1/2 rounded-full ${
          lower > 0
            ? "bg-green-200"
            : upper < 0
              ? "bg-red-200"
              : "bg-amber-200"
        }`}
        style={{
          left: `${barLeft}%`,
          right: `${barRight}%`,
        }}
      />

      {/* Point estimate dot */}
      <div
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow"
        style={{ left: `${pointPos}%`, background: "var(--kami-text)", borderColor: "var(--kami-surface-solid)" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metric card
// ---------------------------------------------------------------------------

function MetricCard({
  label,
  value,
  sublabel,
  hideSubLabel,
}: {
  label: string;
  value: string;
  sublabel: string;
  hideSubLabel?: boolean;
}) {
  return (
    <div
      className="p-4"
      style={{
        background: "var(--kami-surface-solid)",
        border: "1px solid var(--kami-border-strong)",
        borderRadius: "var(--kami-card-radius, 0.75rem)",
        boxShadow: "var(--kami-card-shadow, none)",
      }}
    >
      <p className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>{label}</p>
      <p className="mt-1 text-xl font-bold" style={{ color: "var(--kami-text)" }}>{value}</p>
      {!hideSubLabel && sublabel && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--kami-text-dim)" }}>{sublabel}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sample Size Planner
// ---------------------------------------------------------------------------

function SampleSizePlanner({
  input,
  output,
  onUpdate,
}: {
  input: PlannerInput;
  output: PlannerOutput | null;
  onUpdate: (key: keyof PlannerInput, value: string | number) => void;
}) {
  return (
    <div className="space-y-6">
      <div
        className="p-5"
        style={{
          background: "var(--kami-surface-solid)",
          border: "1px solid var(--kami-border-strong)",
          borderRadius: "var(--kami-card-radius, 0.75rem)",
          boxShadow: "var(--kami-card-shadow, none)",
        }}
      >
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
          Test Parameters
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--kami-text-muted)" }}>
              Baseline Conversion Rate (%)
            </label>
            <input
              type="number"
              value={input.baselineRate}
              onChange={(e) => onUpdate("baselineRate", e.target.value)}
              placeholder="e.g. 3"
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface-solid))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
              min="0.01"
              max="99.99"
              step="0.1"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm" style={{ color: "var(--kami-text-muted)" }}>
              Minimum Detectable Effect (%)
            </label>
            <input
              type="number"
              value={input.mde}
              onChange={(e) => onUpdate("mde", e.target.value)}
              placeholder="e.g. 20"
              className="w-full px-3 py-2 text-sm focus:outline-none"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface-solid))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
              min="1"
              step="1"
            />
            <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
              Relative change you want to detect (e.g. 20% means 3% to 3.6%)
            </p>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm" style={{ color: "var(--kami-text-muted)" }}>
            Daily Traffic (optional)
          </label>
          <input
            type="number"
            value={input.dailyTraffic}
            onChange={(e) => onUpdate("dailyTraffic", e.target.value)}
            placeholder="e.g. 1000"
            className="w-full px-3 py-2 text-sm focus:outline-none sm:max-w-xs"
            style={{
              background: "var(--kami-input-bg, var(--kami-surface-solid))",
              color: "var(--kami-text)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-input-radius, 0.5rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
            min="1"
          />
          <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
            Total visitors per day across all variants. Used to estimate test
            duration.
          </p>
        </div>
      </div>

      {/* Results */}
      {output && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div
              className="p-5 text-center"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Sample Per Variant
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(output.samplePerVariant)}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>visitors each</p>
            </div>
            <div
              className="p-5 text-center"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Total Sample</p>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(output.totalSample)}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                across both variants
              </p>
            </div>
            <div
              className="p-5 text-center"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <p className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Estimated Duration
              </p>
              <p className="mt-2 text-3xl font-bold">
                {output.daysNeeded !== null
                  ? `${formatNumber(output.daysNeeded)}`
                  : "--"}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                {output.daysNeeded !== null
                  ? output.daysNeeded === 1
                    ? "day"
                    : "days"
                  : "enter daily traffic"}
              </p>
            </div>
          </div>

          {/* Show the math */}
          <details
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
              Show the math
            </summary>
            <div className="px-5 py-4" style={{ borderTop: "1px solid var(--kami-border)" }}>
              <div className="space-y-3 font-mono text-xs" style={{ color: "var(--kami-text-muted)" }}>
                <div>
                  <span style={{ color: "var(--kami-text-dim)" }}>// Parameters</span>
                  <br />
                  p1 (baseline) ={" "}
                  {(parseFloat(input.baselineRate) / 100).toFixed(4)}
                  <br />
                  p2 (target) ={" "}
                  {(
                    (parseFloat(input.baselineRate) / 100) *
                    (1 + parseFloat(input.mde) / 100)
                  ).toFixed(4)}
                  <br />
                  alpha ={" "}
                  {(1 - input.significance).toFixed(2)}, Z_alpha/2 ={" "}
                  {normalInv(1 - (1 - input.significance) / 2).toFixed(4)}
                  <br />
                  beta = {(1 - input.power).toFixed(2)}, Z_beta ={" "}
                  {normalInv(input.power).toFixed(4)}
                </div>
                <div>
                  <span style={{ color: "var(--kami-text-dim)" }}>// Sample size formula</span>
                  <br />
                  n = (Z_alpha/2 + Z_beta)^2 * (p1*(1-p1) + p2*(1-p2)) /
                  (p2-p1)^2
                  <br />n = {formatNumber(output.samplePerVariant)} per variant
                </div>
                {output.daysNeeded !== null && (
                  <div>
                    <span style={{ color: "var(--kami-text-dim)" }}>// Duration</span>
                    <br />
                    days = total_sample / daily_traffic ={" "}
                    {formatNumber(output.totalSample)} /{" "}
                    {input.dailyTraffic} ={" "}
                    {formatNumber(output.daysNeeded)} days
                  </div>
                )}
              </div>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
