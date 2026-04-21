"use client";

import { useCallback, useMemo, useState } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// ---------------------------------------------------------------------------
// Word lists
// ---------------------------------------------------------------------------

const POWER_WORDS = new Set([
  "free", "new", "you", "instantly", "proven", "secret", "guaranteed", "easy",
  "discover", "save", "exclusive", "limited", "now", "best", "ultimate",
  "essential", "complete", "simple", "fast", "hack", "trick", "mistake",
  "warning", "never", "always", "surprising", "shocking", "boost", "unlock",
  "master", "insider", "urgent", "revealed", "breakthrough", "powerful",
  "remarkable", "extraordinary", "critical", "vital", "crucial", "epic",
  "massive", "explosive", "phenomenal", "sensational", "revolutionary",
  "game-changing", "life-changing", "mind-blowing", "eye-opening",
]);

const EMOTIONAL_WORDS = new Set([
  "amazing", "beautiful", "brilliant", "incredible", "powerful", "dangerous",
  "terrifying", "heartbreaking", "stunning", "jaw-dropping", "mind-blowing",
  "unbelievable", "extraordinary", "devastating", "inspiring", "breathtaking",
  "courageous", "wonderful", "fantastic", "magnificent", "glorious", "tragic",
  "horrifying", "alarming", "thrilling", "captivating", "mesmerizing",
  "enchanting", "dreadful", "awful", "terrible", "horrible", "delightful",
  "joyful", "blissful", "ecstatic", "euphoric", "heartwarming", "touching",
  "moving", "poignant", "gripping", "riveting", "electrifying", "exhilarating",
  "awe-inspiring", "soul-crushing", "gut-wrenching", "nerve-wracking",
  "spine-tingling", "blood-curdling", "hair-raising", "earth-shattering",
  "record-breaking", "award-winning", "critically-acclaimed", "beloved",
  "controversial", "outrageous", "scandalous", "infamous", "legendary",
  "iconic", "unforgettable", "remarkable", "astonishing", "staggering",
  "overwhelming", "shocking", "disturbing", "haunting", "chilling",
  "hilarious", "ridiculous", "absurd", "insane", "crazy", "wild",
  "fierce", "bold", "fearless", "ruthless", "relentless", "unstoppable",
]);

const COMMON_WORDS = new Set([
  "the", "is", "a", "an", "in", "on", "at", "to", "for", "of", "and", "but",
  "or", "it", "this", "that", "with", "from", "by", "as", "are", "was", "be",
  "have", "has", "do", "does", "will", "would", "can", "could", "should",
  "about", "into", "over", "after", "before", "between", "through", "up",
  "out", "not", "no", "so", "if", "than", "its", "your", "my", "our",
  "their", "we", "they", "you", "i", "he", "she",
]);

// ---------------------------------------------------------------------------
// Analysis types
// ---------------------------------------------------------------------------

interface WordBalance {
  common: number;
  uncommon: number;
  emotional: number;
  power: number;
  total: number;
}

interface PlatformLimit {
  name: string;
  max: number;
  label: string;
}

const PLATFORMS: PlatformLimit[] = [
  { name: "Google title", max: 60, label: "Google" },
  { name: "Email subject", max: 50, label: "Email" },
  { name: "Facebook", max: 40, label: "Facebook" },
  { name: "Twitter", max: 70, label: "Twitter" },
];

interface AnalysisResult {
  overall: number;
  wordBalance: WordBalance;
  wordBalanceScore: number;
  emv: number;
  emvScore: number;
  charCount: number;
  wordCount: number;
  lengthScore: number;
  gradeLevel: number;
  readabilityScore: number;
  sentiment: "positive" | "negative" | "neutral";
  sentimentScore: number;
  suggestions: string[];
}

// ---------------------------------------------------------------------------
// Scoring functions
// ---------------------------------------------------------------------------

function categorizeWord(word: string): "common" | "emotional" | "power" | "uncommon" {
  const lower = word.toLowerCase();
  if (COMMON_WORDS.has(lower)) return "common";
  if (EMOTIONAL_WORDS.has(lower)) return "emotional";
  if (POWER_WORDS.has(lower)) return "power";
  return "uncommon";
}

function scoreWordBalance(balance: WordBalance): number {
  if (balance.total === 0) return 0;
  const commonPct = balance.common / balance.total;
  const uncommonPct = balance.uncommon / balance.total;
  const emotionalPct = balance.emotional / balance.total;
  const powerPct = balance.power / balance.total;

  // Ideal: common 20-30%, uncommon 10-20%, emotional 10-15%, power 10-15%
  let score = 0;
  score += commonPct >= 0.15 && commonPct <= 0.35 ? 7 : commonPct < 0.5 ? 4 : 2;
  score += uncommonPct >= 0.1 && uncommonPct <= 0.3 ? 6 : uncommonPct > 0 ? 3 : 0;
  score += emotionalPct >= 0.1 && emotionalPct <= 0.2 ? 6 : emotionalPct > 0 ? 4 : 0;
  score += powerPct >= 0.1 && powerPct <= 0.2 ? 6 : powerPct > 0 ? 4 : 0;
  return Math.min(25, score);
}

function scoreEmv(emv: number): number {
  // Ideal: 30-40%
  if (emv >= 30 && emv <= 40) return 25;
  if (emv >= 20 && emv < 30) return 20;
  if (emv >= 40 && emv <= 50) return 20;
  if (emv >= 10 && emv < 20) return 14;
  if (emv > 50) return 14;
  if (emv > 0) return 8;
  return 0;
}

function scoreLength(charCount: number, wordCount: number): number {
  let score = 0;
  // Character count: ideal 50-60
  if (charCount >= 40 && charCount <= 70) score += 13;
  else if (charCount >= 30 && charCount <= 80) score += 9;
  else if (charCount > 0) score += 4;

  // Word count: ideal 6-12
  if (wordCount >= 6 && wordCount <= 12) score += 12;
  else if (wordCount >= 4 && wordCount <= 15) score += 8;
  else if (wordCount > 0) score += 3;

  return Math.min(25, score);
}

function estimateGradeLevel(words: string[]): number {
  if (words.length === 0) return 0;
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  // Simple approximation: longer words = higher grade
  const grade = Math.max(1, Math.min(16, (avgWordLen - 2) * 2.5));
  return Math.round(grade * 10) / 10;
}

function scoreReadability(grade: number): number {
  // Ideal: grade 6-8
  if (grade >= 5 && grade <= 9) return 15;
  if (grade >= 4 && grade <= 11) return 10;
  if (grade > 0) return 5;
  return 0;
}

function analyzeSentiment(words: string[]): "positive" | "negative" | "neutral" {
  const POSITIVE = new Set([
    "amazing", "beautiful", "best", "brilliant", "easy", "free", "great",
    "incredible", "inspiring", "love", "perfect", "powerful", "proven",
    "simple", "stunning", "ultimate", "wonderful", "fantastic", "delightful",
    "joyful", "blissful", "ecstatic", "breathtaking", "magnificent",
    "extraordinary", "remarkable", "legendary", "iconic", "beloved",
    "captivating", "thrilling", "exhilarating", "glorious", "new",
    "discover", "save", "boost", "master", "essential", "complete",
  ]);
  const NEGATIVE = new Set([
    "dangerous", "devastating", "horrible", "mistake", "never", "risk",
    "terrible", "terrifying", "warning", "worst", "avoid", "awful",
    "dreadful", "horrifying", "alarming", "tragic", "gut-wrenching",
    "soul-crushing", "blood-curdling", "disturbing", "haunting", "chilling",
    "scandalous", "outrageous", "infamous", "ridiculous", "absurd",
    "shocking", "controversial", "ruthless", "relentless", "nerve-wracking",
  ]);

  let pos = 0;
  let neg = 0;
  for (const w of words) {
    const lower = w.toLowerCase();
    if (POSITIVE.has(lower)) pos++;
    if (NEGATIVE.has(lower)) neg++;
  }
  if (pos > neg) return "positive";
  if (neg > pos) return "negative";
  if (pos === 0 && neg === 0) return "neutral";
  return "neutral";
}

function scoreSentiment(sentiment: "positive" | "negative" | "neutral"): number {
  // Positive and negative both drive clicks
  if (sentiment === "positive" || sentiment === "negative") return 10;
  return 3;
}

function analyze(headline: string): AnalysisResult | null {
  const trimmed = headline.trim();
  if (!trimmed) return null;

  const words = trimmed.match(/[\w'-]+/g) || [];
  if (words.length === 0) return null;

  // Word balance
  const balance: WordBalance = { common: 0, uncommon: 0, emotional: 0, power: 0, total: words.length };
  for (const w of words) {
    const cat = categorizeWord(w);
    balance[cat]++;
  }

  // EMV: emotional + power words / total
  const emotionalAndPower = balance.emotional + balance.power;
  const emv = (emotionalAndPower / balance.total) * 100;

  // Length
  const charCount = trimmed.length;
  const wordCount = words.length;

  // Readability
  const gradeLevel = estimateGradeLevel(words);

  // Sentiment
  const sentiment = analyzeSentiment(words);

  // Scores
  const wordBalanceScore = scoreWordBalance(balance);
  const emvScore = scoreEmv(emv);
  const lengthScore = scoreLength(charCount, wordCount);
  const readabilityScore = scoreReadability(gradeLevel);
  const sentimentScore = scoreSentiment(sentiment);

  const overall = wordBalanceScore + emvScore + lengthScore + readabilityScore + sentimentScore;

  // Suggestions
  const suggestions: string[] = [];
  if (balance.emotional === 0 && balance.power === 0) {
    suggestions.push("Add emotional or power words to increase engagement (e.g., \"proven\", \"stunning\", \"secret\").");
  } else if (balance.emotional === 0) {
    suggestions.push("Add emotional words to create a stronger reaction (e.g., \"incredible\", \"terrifying\").");
  } else if (balance.power === 0) {
    suggestions.push("Add a power word to boost click-through (e.g., \"free\", \"guaranteed\", \"essential\").");
  }
  if (wordCount < 6) {
    suggestions.push("Your headline is short. Aim for 6-12 words for better engagement.");
  }
  if (wordCount > 12) {
    suggestions.push("Your headline is long. Trim to 6-12 words for punchier impact.");
  }
  if (charCount > 60) {
    suggestions.push("Your headline will be truncated in Google search results (60 char limit).");
  }
  if (charCount > 50 && charCount <= 60) {
    suggestions.push("Your headline fits Google but will be cut off in email subject lines (50 char limit).");
  }
  if (sentiment === "neutral") {
    suggestions.push("Your headline reads as neutral. Add positive or negative sentiment to drive clicks.");
  }
  if (gradeLevel > 10) {
    suggestions.push("Use simpler, shorter words. Grade 6-8 readability works best for headlines.");
  }
  if (!/^\d/.test(trimmed) && suggestions.length < 5) {
    suggestions.push("Try starting with a number (e.g., \"7 Ways to...\") or \"How to\" to boost CTR.");
  }

  return {
    overall,
    wordBalance: balance,
    wordBalanceScore,
    emv,
    emvScore,
    charCount,
    wordCount,
    lengthScore,
    gradeLevel,
    readabilityScore,
    sentiment,
    sentimentScore,
    suggestions: suggestions.slice(0, 5),
  };
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 75) return "#22c55e";
  if (pct >= 60) return "#f97316";
  if (pct >= 40) return "#eab308";
  return "#ef4444";
}

function overallColor(score: number): string {
  if (score > 75) return "#22c55e";
  if (score > 60) return "#f97316";
  if (score > 40) return "#eab308";
  return "#ef4444";
}

function overallLabel(score: number): string {
  if (score > 75) return "Strong";
  if (score > 60) return "Good";
  if (score > 40) return "Average";
  return "Weak";
}

// ---------------------------------------------------------------------------
// Score circle SVG
// ---------------------------------------------------------------------------

function ScoreCircle({ score }: { score: number }) {
  const color = overallColor(score);
  const label = overallLabel(score);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke="#e5e7eb" strokeWidth="8"
        />
        <circle
          cx="60" cy="60" r={radius}
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
          style={{ transition: "stroke-dashoffset 0.4s ease, stroke 0.4s ease" }}
        />
        <text
          x="60" y="55" textAnchor="middle"
          fill={color} fontSize="28" fontWeight="700"
          style={{ transition: "fill 0.4s ease" }}
        >
          {score}
        </text>
        <text
          x="60" y="72" textAnchor="middle"
          fill="#9ca3af" fontSize="11" fontWeight="500"
        >
          / 100
        </text>
      </svg>
      <span className="mt-1 text-sm font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score card
// ---------------------------------------------------------------------------

function ScoreCard({
  title,
  score,
  max,
  detail,
}: {
  title: string;
  score: number;
  max: number;
  detail: string;
}) {
  const color = scoreColor(score, max);
  const pct = (score / max) * 100;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">{title}</span>
        <span className="text-sm font-semibold" style={{ color }}>
          {score}/{max}
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: "width 0.3s ease, background-color 0.3s ease",
          }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">{detail}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Word balance bar
// ---------------------------------------------------------------------------

function WordBalanceBar({ balance }: { balance: WordBalance }) {
  if (balance.total === 0) return null;

  const segments = [
    { label: "Common", count: balance.common, color: "#94a3b8" },
    { label: "Uncommon", count: balance.uncommon, color: "#60a5fa" },
    { label: "Emotional", count: balance.emotional, color: "#f472b6" },
    { label: "Power", count: balance.power, color: "#facc15" },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-gray-700">Word Balance</h3>
      <div className="flex h-6 w-full overflow-hidden rounded-full bg-gray-100">
        {segments.map((seg) => {
          const pct = (seg.count / balance.total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={seg.label}
              className="h-full"
              style={{
                width: `${pct}%`,
                backgroundColor: seg.color,
                transition: "width 0.3s ease",
              }}
              title={`${seg.label}: ${Math.round(pct)}%`}
            />
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((seg) => {
          const pct = Math.round((seg.count / balance.total) * 100);
          return (
            <div key={seg.label} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: seg.color }}
              />
              {seg.label}: {pct}% ({seg.count})
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Platform previews
// ---------------------------------------------------------------------------

function PlatformPreviews({ headline }: { headline: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-medium text-gray-700">Platform Character Limits</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PLATFORMS.map((p) => {
          const fits = headline.length <= p.max;
          const truncated = headline.length > p.max
            ? headline.slice(0, p.max - 1) + "\u2026"
            : headline;

          return (
            <div key={p.name} className="rounded-lg border border-gray-100 p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600">{p.label}</span>
                <span className={`text-xs font-mono ${fits ? "text-green-600" : "text-red-500"}`}>
                  {headline.length}/{p.max}
                </span>
              </div>
              <p className="text-sm text-gray-800 break-all leading-snug">
                {truncated}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

interface DimensionComparison {
  title: string;
  scoreA: number;
  scoreB: number;
  max: number;
  winner: "A" | "B" | "tie";
}

function compareDimensions(a: AnalysisResult, b: AnalysisResult): DimensionComparison[] {
  const dims: { title: string; keyA: number; keyB: number; max: number }[] = [
    { title: "Word Balance", keyA: a.wordBalanceScore, keyB: b.wordBalanceScore, max: 25 },
    { title: "Emotional Value", keyA: a.emvScore, keyB: b.emvScore, max: 25 },
    { title: "Length Analysis", keyA: a.lengthScore, keyB: b.lengthScore, max: 25 },
    { title: "Readability", keyA: a.readabilityScore, keyB: b.readabilityScore, max: 15 },
    { title: "Sentiment", keyA: a.sentimentScore, keyB: b.sentimentScore, max: 10 },
  ];

  return dims.map((d) => ({
    title: d.title,
    scoreA: d.keyA,
    scoreB: d.keyB,
    max: d.max,
    winner: d.keyA > d.keyB ? "A" : d.keyB > d.keyA ? "B" : "tie",
  }));
}

// ---------------------------------------------------------------------------
// Single-headline result panel (reused in both modes)
// ---------------------------------------------------------------------------

function SingleResultPanel({
  headline,
  result,
  label,
}: {
  headline: string;
  result: AnalysisResult;
  label?: string;
}) {
  return (
    <div className="space-y-6">
      {label && (
        <div className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</div>
      )}

      {/* Overall score */}
      <div className="flex justify-center">
        <ScoreCircle score={result.overall} />
      </div>

      {/* Score cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ScoreCard
          title="Word Balance"
          score={result.wordBalanceScore}
          max={25}
          detail={`${result.wordBalance.emotional + result.wordBalance.power} emotional/power words out of ${result.wordBalance.total} total.`}
        />
        <ScoreCard
          title="Emotional Value"
          score={result.emvScore}
          max={25}
          detail={`EMV score: ${Math.round(result.emv)}%. Ideal range is 30-40%.`}
        />
        <ScoreCard
          title="Length Analysis"
          score={result.lengthScore}
          max={25}
          detail={`${result.charCount} characters, ${result.wordCount} words. Ideal: 6-12 words, 50-60 chars.`}
        />
        <ScoreCard
          title="Readability"
          score={result.readabilityScore}
          max={15}
          detail={`Grade level: ${result.gradeLevel}. Best headlines target grade 6-8.`}
        />
        <ScoreCard
          title="Sentiment"
          score={result.sentimentScore}
          max={10}
          detail={`Detected: ${result.sentiment}. Strong sentiment (positive or negative) drives more clicks.`}
        />
      </div>

      {/* Word balance bar */}
      <WordBalanceBar balance={result.wordBalance} />

      {/* Platform previews */}
      <PlatformPreviews headline={headline} />

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-700">Suggestions</h3>
          <ul className="space-y-2">
            {result.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className="mt-0.5 flex-shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comparison dimension row
// ---------------------------------------------------------------------------

function ComparisonRow({ dim }: { dim: DimensionComparison }) {
  const colorA = dim.winner === "A" ? "#22c55e" : dim.winner === "tie" ? "#eab308" : "#9ca3af";
  const colorB = dim.winner === "B" ? "#22c55e" : dim.winner === "tie" ? "#eab308" : "#9ca3af";

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-16 text-right">
        <span className="text-sm font-semibold tabular-nums" style={{ color: colorA }}>
          {dim.scoreA}/{dim.max}
        </span>
      </div>
      <div className="flex-1 text-center">
        <span className="text-xs font-medium text-gray-500">{dim.title}</span>
      </div>
      <div className="w-16 text-left">
        <span className="text-sm font-semibold tabular-nums" style={{ color: colorB }}>
          {dim.scoreB}/{dim.max}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HeadlineAnalyzerContent() {
  const [{ q: headline }, setToolState] = useToolState({ q: "" });
  const setHeadline = useCallback(
    (v: string) => setToolState({ q: v }),
    [setToolState],
  );

  const [mode, setMode] = useState<"single" | "compare">("single");
  const [headlineB, setHeadlineB] = useState("");

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "k",
          meta: true,
          action: () => {
            setHeadline("");
            setHeadlineB("");
          },
          label: "Clear",
        },
      ],
      [setHeadline],
    ),
  );

  const resultA = useMemo(() => analyze(headline), [headline]);
  const resultB = useMemo(() => analyze(headlineB), [headlineB]);

  const dimensions = useMemo(() => {
    if (resultA && resultB) return compareDimensions(resultA, resultB);
    return null;
  }, [resultA, resultB]);

  return (
    <div className="min-h-screen text-gray-900">
      <div className={`mx-auto px-4 py-12 sm:py-16 ${mode === "compare" ? "w-[92%] max-w-[1400px]" : "max-w-7xl"}`}>
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Headline Analyzer
          </h1>
          <p className="mt-2 text-gray-500">
            Score your headlines for emotional value, power words, readability, and click potential.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setMode("single")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "single"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Single
            </button>
            <button
              onClick={() => setMode("compare")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === "compare"
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Compare
            </button>
          </div>
        </div>

        {/* ---- SINGLE MODE ---- */}
        {mode === "single" && (
          <>
            {/* Input */}
            <div className="relative">
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Type your headline here..."
                className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                autoFocus
              />
              {headline && (
                <button
                  onClick={() => setHeadline("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Results */}
            {resultA && (
              <div className="mt-10">
                <SingleResultPanel headline={headline} result={resultA} />
              </div>
            )}

            {/* Empty state */}
            {!resultA && (
              <div className="mt-16 text-center text-gray-400 text-sm">
                Start typing a headline to see your score.
              </div>
            )}
          </>
        )}

        {/* ---- COMPARE MODE ---- */}
        {mode === "compare" && (
          <>
            {/* Two inputs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="relative">
                <div className="mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Headline A
                </div>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="First headline..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  autoFocus
                />
                {headline && (
                  <button
                    onClick={() => setHeadline("")}
                    className="absolute right-4 bottom-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear A"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="mb-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                  Headline B
                </div>
                <input
                  type="text"
                  value={headlineB}
                  onChange={(e) => setHeadlineB(e.target.value)}
                  placeholder="Second headline..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-5 py-4 text-lg shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
                {headlineB && (
                  <button
                    onClick={() => setHeadlineB("")}
                    className="absolute right-4 bottom-4 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Clear B"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Comparison scoreboard */}
            {resultA && resultB && dimensions && (
              <div className="mt-8">
                {/* Side-by-side overall scores */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_auto_1fr] items-center">
                  <div className="flex flex-col items-center">
                    <div className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Headline A
                    </div>
                    <ScoreCircle score={resultA.overall} />
                  </div>
                  <div className="hidden sm:flex flex-col items-center justify-center text-gray-300">
                    <span className="text-2xl font-bold">vs</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="mb-2 text-xs font-medium text-gray-400 uppercase tracking-wide">
                      Headline B
                    </div>
                    <ScoreCircle score={resultB.overall} />
                  </div>
                </div>

                {/* Dimension-by-dimension comparison */}
                <div className="mt-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                  <h3 className="mb-4 text-sm font-semibold text-gray-900 text-center">
                    Dimension Breakdown
                  </h3>
                  {/* Column headers */}
                  <div className="flex items-center gap-3 pb-2 border-b border-gray-100">
                    <div className="w-16 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">A</div>
                    <div className="flex-1 text-center text-xs font-medium text-gray-400 uppercase tracking-wide">Dimension</div>
                    <div className="w-16 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">B</div>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {dimensions.map((dim) => (
                      <ComparisonRow key={dim.title} dim={dim} />
                    ))}
                  </div>
                  {/* Winner summary */}
                  <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                    {resultA.overall > resultB.overall ? (
                      <span className="text-sm font-medium text-green-600">
                        Headline A wins overall ({resultA.overall} vs {resultB.overall})
                      </span>
                    ) : resultB.overall > resultA.overall ? (
                      <span className="text-sm font-medium text-green-600">
                        Headline B wins overall ({resultB.overall} vs {resultA.overall})
                      </span>
                    ) : (
                      <span className="text-sm font-medium text-yellow-600">
                        It&apos;s a tie ({resultA.overall} each)
                      </span>
                    )}
                  </div>
                </div>

                {/* Full detail panels side by side */}
                <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <SingleResultPanel headline={headline} result={resultA} label="Headline A" />
                  <SingleResultPanel headline={headlineB} result={resultB} label="Headline B" />
                </div>
              </div>
            )}

            {/* Partial state: only one headline entered */}
            {(!resultA || !resultB) && (resultA || resultB) && (
              <div className="mt-10">
                {resultA && !resultB && (
                  <div className="text-center text-gray-400 text-sm mb-8">
                    Enter a second headline to compare.
                  </div>
                )}
                {!resultA && resultB && (
                  <div className="text-center text-gray-400 text-sm mb-8">
                    Enter the first headline to compare.
                  </div>
                )}
                {resultA && <SingleResultPanel headline={headline} result={resultA} label="Headline A" />}
                {resultB && <SingleResultPanel headline={headlineB} result={resultB} label="Headline B" />}
              </div>
            )}

            {/* Empty state */}
            {!resultA && !resultB && (
              <div className="mt-16 text-center text-gray-400 text-sm">
                Enter two headlines to compare them side by side.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
