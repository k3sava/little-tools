"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment } from "@/components/tools/controls";

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

interface WordBalance {
  common: number;
  uncommon: number;
  emotional: number;
  power: number;
  total: number;
}

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
  ctrEstimate: number;
  suggestions: string[];
}

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
  let score = 0;
  score += commonPct >= 0.15 && commonPct <= 0.35 ? 7 : commonPct < 0.5 ? 4 : 2;
  score += uncommonPct >= 0.1 && uncommonPct <= 0.3 ? 6 : uncommonPct > 0 ? 3 : 0;
  score += emotionalPct >= 0.1 && emotionalPct <= 0.2 ? 6 : emotionalPct > 0 ? 4 : 0;
  score += powerPct >= 0.1 && powerPct <= 0.2 ? 6 : powerPct > 0 ? 4 : 0;
  return Math.min(25, score);
}

function scoreEmv(emv: number): number {
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
  if (charCount >= 40 && charCount <= 70) score += 13;
  else if (charCount >= 30 && charCount <= 80) score += 9;
  else if (charCount > 0) score += 4;
  if (wordCount >= 6 && wordCount <= 12) score += 12;
  else if (wordCount >= 4 && wordCount <= 15) score += 8;
  else if (wordCount > 0) score += 3;
  return Math.min(25, score);
}

function estimateGradeLevel(words: string[]): number {
  if (words.length === 0) return 0;
  const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
  const grade = Math.max(1, Math.min(16, (avgWordLen - 2) * 2.5));
  return Math.round(grade * 10) / 10;
}

function scoreReadability(grade: number): number {
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
  return "neutral";
}

function scoreSentiment(sentiment: "positive" | "negative" | "neutral"): number {
  if (sentiment === "positive" || sentiment === "negative") return 10;
  return 3;
}

function analyze(headline: string): AnalysisResult | null {
  const trimmed = headline.trim();
  if (!trimmed) return null;
  const words = trimmed.match(/[\w'-]+/g) || [];
  if (words.length === 0) return null;
  const balance: WordBalance = { common: 0, uncommon: 0, emotional: 0, power: 0, total: words.length };
  for (const w of words) {
    const cat = categorizeWord(w);
    balance[cat]++;
  }
  const emotionalAndPower = balance.emotional + balance.power;
  const emv = (emotionalAndPower / balance.total) * 100;
  const charCount = trimmed.length;
  const wordCount = words.length;
  const gradeLevel = estimateGradeLevel(words);
  const sentiment = analyzeSentiment(words);
  const wordBalanceScore = scoreWordBalance(balance);
  const emvScore = scoreEmv(emv);
  const lengthScore = scoreLength(charCount, wordCount);
  const readabilityScore = scoreReadability(gradeLevel);
  const sentimentScore = scoreSentiment(sentiment);
  const overall = wordBalanceScore + emvScore + lengthScore + readabilityScore + sentimentScore;

  // Rough CTR estimate: scale 0-100 score into 0.5%-8% range, weighted by sentiment
  const ctrBase = (overall / 100) * 7 + 0.5;
  const ctrEstimate = Math.round((sentiment === "neutral" ? ctrBase * 0.85 : ctrBase) * 10) / 10;

  const suggestions: string[] = [];
  if (balance.emotional === 0 && balance.power === 0) {
    suggestions.push('Add emotional or power words (e.g., "proven", "stunning", "secret").');
  } else if (balance.emotional === 0) {
    suggestions.push("Add emotional words for stronger reaction.");
  } else if (balance.power === 0) {
    suggestions.push('Add a power word (e.g., "free", "guaranteed").');
  }
  if (wordCount < 6) suggestions.push("Short headline — aim for 6-12 words.");
  if (wordCount > 12) suggestions.push("Long headline — trim to 6-12 words.");
  if (charCount > 60) suggestions.push("Will truncate in Google (60 char limit).");
  if (sentiment === "neutral") suggestions.push("Add positive or negative sentiment.");
  if (gradeLevel > 10) suggestions.push("Simpler words score higher.");
  if (!/^\d/.test(trimmed) && suggestions.length < 5) {
    suggestions.push('Try starting with a number or "How to".');
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
    ctrEstimate,
    suggestions: suggestions.slice(0, 5),
  };
}

function overallColor(score: number): string {
  if (score > 75) return "color-mix(in srgb, #22c55e 70%, var(--kami-text))";
  if (score > 60) return "color-mix(in srgb, #f97316 70%, var(--kami-text))";
  if (score > 40) return "color-mix(in srgb, #eab308 70%, var(--kami-text))";
  return "color-mix(in srgb, #ef4444 70%, var(--kami-text))";
}

function overallLabel(score: number): string {
  if (score > 75) return "Strong";
  if (score > 60) return "Good";
  if (score > 40) return "Average";
  return "Weak";
}

function ScoreBar({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100;
  const hex =
    pct >= 75 ? "#22c55e" : pct >= 60 ? "#f97316" : pct >= 40 ? "#eab308" : "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span style={{ color: "var(--kami-text-muted)" }}>{label}</span>
        <span className="tabular-nums" style={{ color: "var(--kami-text)" }}>{score}/{max}</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden"
        style={{ background: "var(--kami-surface)", borderRadius: 999 }}
      >
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: `color-mix(in srgb, ${hex} 80%, transparent)`,
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const color = overallColor(score);
  const label = overallLabel(score);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <svg width="104" height="104" viewBox="0 0 104 104">
        <circle cx="52" cy="52" r={radius} fill="none" stroke="var(--kami-border-strong)" strokeWidth="8" />
        <circle
          cx="52"
          cy="52"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 52 52)"
        />
        <text x="52" y="50" textAnchor="middle" fill={color} fontSize="24" fontWeight="700">{score}</text>
        <text x="52" y="66" textAnchor="middle" fill="var(--kami-text-dim)" fontSize="10">/ 100</text>
      </svg>
      <span className="mt-1 text-xs font-medium" style={{ color }}>{label}</span>
    </div>
  );
}

function ResultPanel({
  label,
  headline,
  result,
  onCopy,
  copiedFlag,
}: {
  label: string;
  headline: string;
  result: AnalysisResult;
  onCopy: () => void;
  copiedFlag: boolean;
}) {
  return (
    <div
      className="px-4 py-4 flex flex-col gap-3"
      style={{
        background: "var(--kami-surface-solid)",
        border: "1px solid var(--kami-border-strong)",
        borderRadius: "var(--kami-card-radius, 0.75rem)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
            {label}
          </div>
          <div className="text-sm font-medium mt-0.5 break-words" style={{ color: "var(--kami-text)" }}>
            {headline || "—"}
          </div>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="kc-segment-btn"
          style={{ minHeight: 32 }}
        >
          {copiedFlag ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="flex items-center gap-4">
        <ScoreCircle score={result.overall} />
        <div className="flex-1 flex flex-col gap-1.5">
          <ScoreBar label="Word balance" score={result.wordBalanceScore} max={25} />
          <ScoreBar label="Emotion" score={result.emvScore} max={25} />
          <ScoreBar label="Length" score={result.lengthScore} max={25} />
          <ScoreBar label="Read" score={result.readabilityScore} max={15} />
          <ScoreBar label="Sentiment" score={result.sentimentScore} max={10} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div
          className="px-2 py-1.5 text-center"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border)",
            borderRadius: 8,
          }}
        >
          <div style={{ color: "var(--kami-text-dim)" }}>Chars</div>
          <div className="font-bold" style={{ color: "var(--kami-text)" }}>{result.charCount}</div>
        </div>
        <div
          className="px-2 py-1.5 text-center"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border)",
            borderRadius: 8,
          }}
        >
          <div style={{ color: "var(--kami-text-dim)" }}>Words</div>
          <div className="font-bold" style={{ color: "var(--kami-text)" }}>{result.wordCount}</div>
        </div>
        <div
          className="px-2 py-1.5 text-center"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border)",
            borderRadius: 8,
          }}
        >
          <div style={{ color: "var(--kami-text-dim)" }}>CTR est.</div>
          <div className="font-bold" style={{ color: "var(--kami-text)" }}>{result.ctrEstimate}%</div>
        </div>
      </div>

      {result.suggestions.length > 0 && (
        <ul className="text-xs flex flex-col gap-1" style={{ color: "var(--kami-text-muted)" }}>
          {result.suggestions.map((s, i) => (
            <li key={i} className="flex gap-1.5">
              <span style={{ color: "#f59e0b" }}>•</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function HeadlineAnalyzerContent() {
  const [{ q: headline }, setToolState] = useToolState({ q: "" });
  const setHeadline = useCallback((v: string) => setToolState({ q: v }), [setToolState]);

  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMetro = currentTheme === "metro";

  const [mode, setMode] = useState<"single" | "compare">("single");
  const [headlineB, setHeadlineB] = useState("");
  const [copiedA, setCopiedA] = useState(false);
  const [copiedB, setCopiedB] = useState(false);

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
      [setHeadline]
    )
  );

  const resultA = useMemo(() => analyze(headline), [headline]);
  const resultB = useMemo(() => analyze(headlineB), [headlineB]);

  const copyHeadline = useCallback(
    async (h: string, which: "A" | "B") => {
      await navigator.clipboard.writeText(h);
      if (which === "A") {
        setCopiedA(true);
        setTimeout(() => setCopiedA(false), 1500);
      } else {
        setCopiedB(true);
        setTimeout(() => setCopiedB(false), 1500);
      }
    },
    []
  );

  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;

  const controls = (
    <>
      <ControlGroup label="Mode">
        <Segment
          value={mode}
          onChange={setMode}
          options={[
            { value: "single", label: "Single" },
            { value: "compare", label: "A/B" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Scoring weights" hint="100 total">
        <ul className="text-xs flex flex-col gap-1" style={{ color: "var(--kami-text-muted)" }}>
          <li>Word balance · 25</li>
          <li>Emotional value · 25</li>
          <li>Length · 25</li>
          <li>Readability · 15</li>
          <li>Sentiment · 10</li>
        </ul>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton
        variant="outline"
        onClick={() => {
          setHeadline("");
          setHeadlineB("");
        }}
      >
        Clear
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Headline Analyzer"
      tagline="Score on emotion · power · length · readability · CTR"
      accent="#6366f1"
      actions={actions}
      controls={controls}
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Headline</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Analysis</button>
        </nav>
      )}
      <div className="flex flex-col gap-4 p-4 md:p-6">
        {mode === "single" ? (
          <>
            {(!isMetro || metroCPivot === "input") && (
              <>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="Type your headline here..."
                  className="w-full px-4 py-3 text-lg focus:outline-none"
                  style={inputStyle}
                  autoFocus
                />
              </>
            )}
            {(!isMetro || metroCPivot === "output") && (
              <>
                {resultA ? (
                  <ResultPanel
                    label="Your headline"
                    headline={headline}
                    result={resultA}
                    onCopy={() => copyHeadline(headline, "A")}
                    copiedFlag={copiedA}
                  />
                ) : (
                  <div
                    className="py-12 text-center text-sm"
                    style={{ color: "var(--kami-text-dim)" }}
                  >
                    Start typing a headline to see your score.
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <>
            {(!isMetro || metroCPivot === "input") && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
                      Headline A
                    </div>
                    <input
                      type="text"
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="First headline..."
                      className="w-full px-3 py-2.5 text-base focus:outline-none"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <div className="mb-1 text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
                      Headline B
                    </div>
                    <input
                      type="text"
                      value={headlineB}
                      onChange={(e) => setHeadlineB(e.target.value)}
                      placeholder="Second headline..."
                      className="w-full px-3 py-2.5 text-base focus:outline-none"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </>
            )}
            {(!isMetro || metroCPivot === "output") && (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {resultA && (
                    <ResultPanel
                      label="Headline A"
                      headline={headline}
                      result={resultA}
                      onCopy={() => copyHeadline(headline, "A")}
                      copiedFlag={copiedA}
                    />
                  )}
                  {resultB && (
                    <ResultPanel
                      label="Headline B"
                      headline={headlineB}
                      result={resultB}
                      onCopy={() => copyHeadline(headlineB, "B")}
                      copiedFlag={copiedB}
                    />
                  )}
                </div>
                {resultA && resultB && (
                  <div
                    className="px-4 py-3 text-center text-sm font-medium"
                    style={{
                      background: "var(--kami-surface-solid)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-card-radius, 0.75rem)",
                      color:
                        resultA.overall === resultB.overall
                          ? "color-mix(in srgb, #eab308 70%, var(--kami-text))"
                          : "color-mix(in srgb, #16a34a 70%, var(--kami-text))",
                    }}
                  >
                    {resultA.overall > resultB.overall
                      ? `Headline A wins (${resultA.overall} vs ${resultB.overall})`
                      : resultB.overall > resultA.overall
                      ? `Headline B wins (${resultB.overall} vs ${resultA.overall})`
                      : `Tie (${resultA.overall} each)`}
                  </div>
                )}
                {!resultA && !resultB && (
                  <div
                    className="py-12 text-center text-sm"
                    style={{ color: "var(--kami-text-dim)" }}
                  >
                    Enter two headlines to compare them side by side.
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </ToolShell>
  );
}
