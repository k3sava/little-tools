"use client";

import { useState, useCallback, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ReferencePanel, RuleRow } from "@/components/tools/reference-panel";

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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="A/B Test Calculator"
          tagline="Check if your experiment is statistically significant, or plan the sample size you'll need before you start."
          description="Two modes: (1) Significance - paste visitor and conversion counts for control + variant, see if the difference is real or noise (p-value, confidence interval, and a plain-English verdict). (2) Sample size - set your baseline rate, target lift, and power, we tell you how many visitors you need."
          audience={["Growth", "PMMs", "PMs", "Marketers"]}
          whenToUse={[
            "Calling an experiment winner (or not)",
            "Planning a test before launching it",
            "Defending a result to a skeptical stakeholder",
          ]}
          quickLinks={[
            { label: "Stats terms, decoded", href: "#stats-glossary" },
            { label: "Common pitfalls", href: "#ab-pitfalls" },
          ]}
        />

        {/* Tabs */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setTab("results")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "results"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Results Analyzer
            </button>
            <button
              onClick={() => setTab("planner")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                tab === "planner"
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Sample Size Planner
            </button>
          </div>
        </div>

        {tab === "results" ? (
          <ResultsAnalyzer
            input={resultsInput}
            significance={resultsSignificance}
            output={resultsOutput}
            onUpdateInput={updateResults}
            onUpdateSignificance={setResultsSignificance}
          />
        ) : (
          <SampleSizePlanner
            input={plannerInput}
            output={plannerOutput}
            onUpdate={updatePlanner}
          />
        )}

        <ReferencePanel
          id="stats-glossary"
          title="Stats terms, in plain English"
          summary="The five terms that appear in every A/B test readout."
          defaultOpen
        >
          <div className="space-y-1">
            <RuleRow rule="p-value" explanation="Probability your difference is random noise. <0.05 = &quot;unlikely to be luck.&quot;" example="p = 0.02 → significant" />
            <RuleRow rule="Confidence level" explanation="How sure you are of the result. 95% is standard." example="1 − α" />
            <RuleRow rule="Statistical power" explanation="Your ability to detect a real difference. 80% is standard." example="1 − β" />
            <RuleRow rule="Minimum detectable effect" explanation="The smallest lift your test can reliably catch given your sample." example="MDE = 5%" />
            <RuleRow rule="Confidence interval" explanation="The range where the true lift probably sits. Narrow = precise; wide = noisy." example="+3% [−1%, +7%]" />
          </div>
        </ReferencePanel>

        <ReferencePanel
          id="ab-pitfalls"
          title="Common A/B testing mistakes"
          summary="If you're about to call a winner, read this first."
          defaultOpen={false}
        >
          <ul className="space-y-3 text-xs">
            <li><strong>Peeking.</strong> Checking results early and stopping the moment you see significance inflates false positives. Decide sample size before you start, and wait.</li>
            <li><strong>Too-small samples.</strong> A 10% lift on 200 visitors is noise. Use the sample-size calculator to set a floor.</li>
            <li><strong>Not accounting for weekly cycles.</strong> Run tests for at least a full week - ideally two - to cover weekday/weekend differences.</li>
            <li><strong>Testing too many metrics.</strong> Pick ONE primary metric. If you test 20 secondary metrics, one will look significant by chance.</li>
            <li><strong>Ignoring practical significance.</strong> A 0.1% lift can be statistically significant with enough data, but irrelevant to the business.</li>
            <li><strong>SRM (Sample Ratio Mismatch).</strong> If your control and variant visitor counts differ much more than expected (say 48%/52% vs. 50%/50%), your test infrastructure is probably broken - results are untrustworthy.</li>
          </ul>
        </ReferencePanel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results Analyzer
// ---------------------------------------------------------------------------

function ResultsAnalyzer({
  input,
  significance,
  output,
  onUpdateInput,
  onUpdateSignificance,
}: {
  input: ResultsInput;
  significance: number;
  output: ResultsOutput | null;
  onUpdateInput: (key: keyof ResultsInput, value: string) => void;
  onUpdateSignificance: (v: number) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Input cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Control */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Control (A)
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                Visitors
              </label>
              <input
                type="number"
                value={input.visitorsControl}
                onChange={(e) =>
                  onUpdateInput("visitorsControl", e.target.value)
                }
                placeholder="e.g. 5000"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                Conversions
              </label>
              <input
                type="number"
                value={input.conversionsControl}
                onChange={(e) =>
                  onUpdateInput("conversionsControl", e.target.value)
                }
                placeholder="e.g. 150"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Variant */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Variant (B)
          </h3>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                Visitors
              </label>
              <input
                type="number"
                value={input.visitorsVariant}
                onChange={(e) =>
                  onUpdateInput("visitorsVariant", e.target.value)
                }
                placeholder="e.g. 5000"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                min="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                Conversions
              </label>
              <input
                type="number"
                value={input.conversionsVariant}
                onChange={(e) =>
                  onUpdateInput("conversionsVariant", e.target.value)
                }
                placeholder="e.g. 185"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                min="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Confidence level selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">Confidence level:</span>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          {[0.9, 0.95, 0.99].map((level) => (
            <button
              key={level}
              onClick={() => onUpdateSignificance(level)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                significance === level
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {(level * 100).toFixed(0)}%
            </button>
          ))}
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
  const verdictColor = output.isSignificant
    ? "border-green-200 bg-green-50"
    : "border-amber-200 bg-amber-50";
  const verdictText = output.isSignificant
    ? "text-green-800"
    : "text-amber-800";
  const verdictDot = output.isSignificant ? "bg-green-500" : "bg-amber-400";

  return (
    <div className="space-y-6">
      {/* Verdict */}
      <div
        className={`rounded-xl border p-6 text-center ${verdictColor}`}
      >
        <div className="flex items-center justify-center gap-2">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${verdictDot}`}
          />
          <span className={`text-xl font-bold ${verdictText}`}>
            {output.isSignificant
              ? "Statistically Significant"
              : "Not Significant"}
          </span>
        </div>
        <p className={`mt-1 text-sm ${verdictText} opacity-80`}>
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
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">
          {(output.confidenceLevel * 100).toFixed(0)}% Confidence Interval for
          the Difference
        </h3>
        <ConfidenceIntervalBar
          lower={output.ciLower}
          upper={output.ciUpper}
          point={output.absoluteLift}
        />
        <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
          <span>{pct(output.ciLower)}</span>
          <span className="font-medium text-gray-700">
            {output.absoluteLift >= 0 ? "+" : ""}
            {pct(output.absoluteLift)}
          </span>
          <span>{pct(output.ciUpper)}</span>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {output.ciLower > 0
            ? "The entire interval is above zero, indicating a positive effect."
            : output.ciUpper < 0
              ? "The entire interval is below zero, indicating a negative effect."
              : "The interval crosses zero. The true effect could be positive, negative, or zero."}
        </p>
      </div>

      {/* Power */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">
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
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${
              output.achievedPower >= 0.8 ? "bg-green-500" : "bg-amber-400"
            }`}
            style={{ width: `${Math.min(output.achievedPower * 100, 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {output.achievedPower >= 0.8
            ? "Adequate power (>= 80%). The test is well-powered to detect this effect size."
            : "Low power (< 80%). The test may not have had enough visitors to reliably detect this effect. Consider a larger sample."}
        </p>
      </div>

      {/* Show the math */}
      <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-gray-700 hover:text-gray-900">
          Show the math
        </summary>
        <div className="border-t border-gray-100 px-5 py-4">
          <div className="space-y-3 font-mono text-xs text-gray-600">
            <div>
              <span className="text-gray-400">// Conversion rates</span>
              <br />
              p_control = {pct(output.rateControl, 4)}
              <br />
              p_variant = {pct(output.rateVariant, 4)}
            </div>
            <div>
              <span className="text-gray-400">// Pooled proportion</span>
              <br />
              p_pooled = {output.pooledRate.toFixed(6)}
            </div>
            <div>
              <span className="text-gray-400">// Pooled standard error</span>
              <br />
              SE_pooled = sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
              <br />
              SE_pooled = {output.pooledSE.toFixed(6)}
            </div>
            <div>
              <span className="text-gray-400">// Z-score</span>
              <br />
              Z = (p_variant - p_control) / SE_pooled
              <br />Z = {output.zScore.toFixed(6)}
            </div>
            <div>
              <span className="text-gray-400">// Two-tailed p-value</span>
              <br />
              p_value = 2 * (1 - Phi(|Z|))
              <br />
              p_value = {output.pValue.toFixed(6)}
            </div>
            <div>
              <span className="text-gray-400">// Confidence interval</span>
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
      <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-gray-100" />

      {/* Zero line */}
      {zeroInRange && (
        <div
          className="absolute top-0 h-full w-px bg-gray-300"
          style={{ left: `${zeroPos}%` }}
        >
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-gray-400">
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
        className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-800 shadow"
        style={{ left: `${pointPos}%` }}
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
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {!hideSubLabel && sublabel && (
        <p className="mt-0.5 text-xs text-gray-400">{sublabel}</p>
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
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-700">
          Test Parameters
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-500">
              Baseline Conversion Rate (%)
            </label>
            <input
              type="number"
              value={input.baselineRate}
              onChange={(e) => onUpdate("baselineRate", e.target.value)}
              placeholder="e.g. 3"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              min="0.01"
              max="99.99"
              step="0.1"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-500">
              Minimum Detectable Effect (%)
            </label>
            <input
              type="number"
              value={input.mde}
              onChange={(e) => onUpdate("mde", e.target.value)}
              placeholder="e.g. 20"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              min="1"
              step="1"
            />
            <p className="mt-1 text-xs text-gray-400">
              Relative change you want to detect (e.g. 20% means 3% to 3.6%)
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-500">
              Statistical Significance
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
              {[0.9, 0.95, 0.99].map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdate("significance", level)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    input.significance === level
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {(level * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-500">
              Statistical Power
            </label>
            <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
              {[0.8, 0.9].map((level) => (
                <button
                  key={level}
                  onClick={() => onUpdate("power", level)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    input.power === level
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {(level * 100).toFixed(0)}%
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-sm text-gray-500">
            Daily Traffic (optional)
          </label>
          <input
            type="number"
            value={input.dailyTraffic}
            onChange={(e) => onUpdate("dailyTraffic", e.target.value)}
            placeholder="e.g. 1000"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200 sm:max-w-xs"
            min="1"
          />
          <p className="mt-1 text-xs text-gray-400">
            Total visitors per day across all variants. Used to estimate test
            duration.
          </p>
        </div>
      </div>

      {/* Results */}
      {output && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-medium text-gray-500">
                Sample Per Variant
              </p>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(output.samplePerVariant)}
              </p>
              <p className="mt-1 text-xs text-gray-400">visitors each</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-medium text-gray-500">Total Sample</p>
              <p className="mt-2 text-3xl font-bold">
                {formatNumber(output.totalSample)}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                across both variants
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm text-center">
              <p className="text-xs font-medium text-gray-500">
                Estimated Duration
              </p>
              <p className="mt-2 text-3xl font-bold">
                {output.daysNeeded !== null
                  ? `${formatNumber(output.daysNeeded)}`
                  : "--"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {output.daysNeeded !== null
                  ? output.daysNeeded === 1
                    ? "day"
                    : "days"
                  : "enter daily traffic"}
              </p>
            </div>
          </div>

          {/* Show the math */}
          <details className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-gray-700 hover:text-gray-900">
              Show the math
            </summary>
            <div className="border-t border-gray-100 px-5 py-4">
              <div className="space-y-3 font-mono text-xs text-gray-600">
                <div>
                  <span className="text-gray-400">// Parameters</span>
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
                  <span className="text-gray-400">// Sample size formula</span>
                  <br />
                  n = (Z_alpha/2 + Z_beta)^2 * (p1*(1-p1) + p2*(1-p2)) /
                  (p2-p1)^2
                  <br />n = {formatNumber(output.samplePerVariant)} per variant
                </div>
                {output.daysNeeded !== null && (
                  <div>
                    <span className="text-gray-400">// Duration</span>
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
