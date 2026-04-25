"use client";

import { useState, useMemo, useCallback } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Stop words ---

const STOP_WORDS = new Set([
  "the", "a", "is", "in", "to", "and", "of", "for", "it", "on", "at", "by",
  "with", "from", "or", "an", "be", "as", "this", "that", "are", "was", "were",
  "been", "has", "have", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "can", "shall", "but", "not", "so", "if", "no",
  "nor", "too", "very", "just",
]);

// --- Stats computation ---

interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  readingTimeMin: number;
  speakingTimeMin: number;
  readabilityScore: number | null;
  readabilityLabel: string;
  gradeLevel: number | null;
  gradeLevelLabel: string;
}

interface KeywordEntry {
  word: string;
  count: number;
  percentage: number;
}

interface SentenceStats {
  longest: number;
  shortest: number;
  average: number;
  varietyLabel: string;
}

const ABBREVIATIONS = new Set([
  "mr", "mrs", "ms", "dr", "prof", "sr", "jr", "st", "ave", "blvd",
  "dept", "est", "govt", "inc", "ltd", "corp", "co", "vs", "etc",
  "approx", "assn", "dept", "div", "gen", "gov", "hon", "sgt",
  "fig", "vol", "no", "jan", "feb", "mar", "apr", "jun", "jul",
  "aug", "sep", "oct", "nov", "dec", "mon", "tue", "wed", "thu",
  "fri", "sat", "sun", "ft", "lb", "oz", "pt", "qt", "yr",
]);

function countSentences(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // Remove abbreviations followed by periods to avoid false positives
  // Also handle initials like U.S., U.K., etc.
  const cleaned = trimmed
    .replace(/\b([A-Z]\.){2,}/g, "ABBR") // U.S.A., U.K., etc.
    .replace(new RegExp(
      "\\b(" + Array.from(ABBREVIATIONS).join("|") + ")\\.",
      "gi"
    ), "$1");

  const matches = cleaned.match(/[.!?]+(?:\s|$)/g);
  return matches ? matches.length : (trimmed.length > 0 ? 1 : 0);
}

function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length ||
    (text.trim().length > 0 ? 1 : 0);
}

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 2) return w.length > 0 ? 1 : 0;

  let count = 0;
  const vowels = "aeiouy";
  let prevVowel = false;

  for (let i = 0; i < w.length; i++) {
    const isVowel = vowels.includes(w[i]);
    if (isVowel && !prevVowel) count++;
    prevVowel = isVowel;
  }

  if (w.endsWith("e") && count > 1) count--;
  if (w.endsWith("le") && w.length > 2 && !vowels.includes(w[w.length - 3])) count++;

  return Math.max(count, 1);
}

function fleschKincaid(words: string[], sentenceCount: number): { score: number; label: string } | null {
  if (words.length === 0 || sentenceCount === 0) return null;

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const score =
    206.835 -
    1.015 * (words.length / sentenceCount) -
    84.6 * (totalSyllables / words.length);

  const clamped = Math.max(0, Math.min(100, Math.round(score * 10) / 10));

  let label: string;
  if (clamped >= 90) label = "Very Easy";
  else if (clamped >= 80) label = "Easy";
  else if (clamped >= 70) label = "Fairly Easy";
  else if (clamped >= 60) label = "Standard";
  else if (clamped >= 50) label = "Fairly Difficult";
  else if (clamped >= 30) label = "Difficult";
  else label = "Very Difficult";

  return { score: clamped, label };
}

function computeGradeLevel(words: string[], sentenceCount: number): { grade: number; label: string } | null {
  if (words.length === 0 || sentenceCount === 0) return null;

  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const grade = 0.39 * (words.length / sentenceCount) + 11.8 * (totalSyllables / words.length) - 15.59;
  const rounded = Math.round(grade * 10) / 10;

  let label: string;
  if (rounded < 1) label = "Kindergarten";
  else if (rounded <= 5) label = `Grade ${Math.round(rounded)}`;
  else if (rounded <= 8) label = `Grade ${Math.round(rounded)}`;
  else if (rounded <= 12) label = `Grade ${Math.round(rounded)}`;
  else if (rounded <= 16) label = "College";
  else label = "Graduate";

  return { grade: rounded, label };
}

function computeStats(text: string): TextStats {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const words = text.trim() ? text.trim().split(/\s+/) : [];
  const wordCount = words.length;
  const sentenceCount = countSentences(text);
  const paragraphCount = countParagraphs(text);

  const readingTimeMin = wordCount / 238;
  const speakingTimeMin = wordCount / 150;

  const fk = fleschKincaid(words, sentenceCount);
  const gl = computeGradeLevel(words, sentenceCount);

  return {
    characters,
    charactersNoSpaces,
    words: wordCount,
    sentences: sentenceCount,
    paragraphs: paragraphCount,
    readingTimeMin,
    speakingTimeMin,
    readabilityScore: fk?.score ?? null,
    readabilityLabel: fk?.label ?? "\u2014",
    gradeLevel: gl?.grade ?? null,
    gradeLevelLabel: gl?.label ?? "\u2014",
  };
}

function computeKeywordDensity(text: string): KeywordEntry[] {
  if (!text.trim()) return [];
  const words = text.trim().toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z0-9'-]/g, "")).filter(Boolean);
  const totalWords = words.length;
  if (totalWords === 0) return [];

  const freq: Record<string, number> = {};
  for (const w of words) {
    if (STOP_WORDS.has(w) || w.length < 2) continue;
    freq[w] = (freq[w] || 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({
      word,
      count,
      percentage: Math.round((count / totalWords) * 1000) / 10,
    }));
}

function getSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
}

function computeSentenceStats(text: string): SentenceStats | null {
  const sentences = getSentences(text);
  if (sentences.length === 0) return null;

  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const longest = Math.max(...lengths);
  const shortest = Math.min(...lengths);
  const average = Math.round((lengths.reduce((a, b) => a + b, 0) / lengths.length) * 10) / 10;

  // Standard deviation / average for variety
  let varietyLabel = "Low";
  if (lengths.length > 1 && average > 0) {
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - average, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    const ratio = stdDev / average;
    if (ratio > 0.5) varietyLabel = "High";
    else if (ratio > 0.25) varietyLabel = "Medium";
    else varietyLabel = "Low";
  }

  return { longest, shortest, average, varietyLabel };
}

function formatTime(minutes: number): string {
  if (minutes < 1) {
    const secs = Math.round(minutes * 60);
    return secs <= 0 ? "0 sec" : `${secs} sec`;
  }
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
}

// --- Social media limits ---

const SOCIAL_LIMITS = [
  { name: "Twitter / X", limit: 280, unit: "chars" as const },
  { name: "Instagram", limit: 2200, unit: "chars" as const },
  { name: "LinkedIn", limit: 3000, unit: "chars" as const },
  { name: "SMS", limit: 160, unit: "chars" as const },
  { name: "Meta Title", limit: 60, unit: "chars" as const },
  { name: "Meta Description", limit: 160, unit: "chars" as const },
];

// --- UI components ---

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function getProgressColor(ratio: number): string {
  if (ratio <= 0.7) return "bg-green-500";
  if (ratio <= 0.9) return "bg-yellow-500";
  return "bg-red-500";
}

function getProgressTextColor(ratio: number): string {
  if (ratio <= 0.7) return "text-green-600";
  if (ratio <= 0.9) return "text-yellow-600";
  return "text-red-600";
}

function SocialLimitBar({ name, limit, current }: { name: string; limit: number; current: number }) {
  const ratio = current / limit;
  const percent = Math.min(ratio * 100, 100);
  const over = current > limit;

  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-sm text-gray-600">{name}</div>
      <div className="flex-1">
        <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-200 ${getProgressColor(ratio)}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
      <div className={`w-24 shrink-0 text-right text-sm font-medium tabular-nums ${getProgressTextColor(ratio)}`}>
        {current} / {limit}
        {over && <span className="ml-1 text-xs text-red-500">({current - limit} over)</span>}
      </div>
    </div>
  );
}

function CollapsibleSection({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {icon}
          <span className="text-sm font-semibold text-gray-900">{title}</span>
        </div>
        <ChevronIcon open={open} />
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-4">{children}</div>}
    </div>
  );
}

function GoalTracker({
  goalType,
  setGoalType,
  goalValue,
  setGoalValue,
  current,
}: {
  goalType: "words" | "characters";
  setGoalType: (v: "words" | "characters") => void;
  goalValue: string;
  setGoalValue: (v: string) => void;
  current: number;
}) {
  const target = parseInt(goalValue, 10) || 0;
  const ratio = target > 0 ? current / target : 0;
  const percent = Math.min(ratio * 100, 100);
  const reached = current >= target && target > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5 mb-4">
          <TargetIcon />
          <span className="text-sm font-semibold text-gray-900">Goal Setting</span>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Target:</label>
            <input
              type="number"
              min="0"
              value={goalValue}
              onChange={(e) => setGoalValue(e.target.value)}
              placeholder="500"
              className="w-24 rounded-lg border border-gray-200  px-3 py-1.5 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-200  p-0.5">
            <button
              onClick={() => setGoalType("words")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                goalType === "words"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Words
            </button>
            <button
              onClick={() => setGoalType("characters")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                goalType === "characters"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Characters
            </button>
          </div>
        </div>
        {target > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-gray-500">
                {current} / {target} {goalType}
              </span>
              <span className={`text-sm font-medium ${reached ? "text-green-600" : "text-gray-600"}`}>
                {Math.round(percent)}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  reached ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
            {reached && (
              <div className="mt-2 flex items-center gap-1.5 text-sm text-green-600">
                <CheckCircleIcon />
                Goal reached!
              </div>
            )}
            {!reached && target > 0 && (
              <div className="mt-2 text-xs text-gray-400">
                {target - current} {goalType} remaining
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main component ---

export default function CharacterCounterContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [copiedStats, setCopiedStats] = useState(false);
  const [goalType, setGoalType] = useState<"words" | "characters">("words");
  const [goalValue, setGoalValue] = useState("");

  useKeyboardShortcuts(useMemo(() => [
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], []));

  const stats = useMemo(() => computeStats(input), [input]);
  const keywords = useMemo(() => computeKeywordDensity(input), [input]);
  const sentenceStats = useMemo(() => computeSentenceStats(input), [input]);

  const handleCopyStats = useCallback(async () => {
    const lines = [
      `Characters: ${stats.characters}`,
      `Characters (no spaces): ${stats.charactersNoSpaces}`,
      `Words: ${stats.words}`,
      `Sentences: ${stats.sentences}`,
      `Paragraphs: ${stats.paragraphs}`,
      `Reading time: ${formatTime(stats.readingTimeMin)}`,
      `Speaking time: ${formatTime(stats.speakingTimeMin)}`,
    ];
    if (stats.readabilityScore !== null) {
      lines.push(`Readability: ${stats.readabilityScore} (${stats.readabilityLabel})`);
    }
    if (stats.gradeLevel !== null) {
      lines.push(`Reading Level: ${stats.gradeLevelLabel} (${stats.gradeLevel})`);
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedStats(true);
    setTimeout(() => setCopiedStats(false), 2000);
  }, [stats]);

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Character Counter"
          tagline="Live character, word, sentence, and paragraph counts - with progress bars for Twitter, SMS, meta descriptions, and custom goals."
          description="Type or paste into the box; we count everything in real time: characters (with and without spaces), words, sentences, paragraphs, reading time. Set a goal (280 chars for a tweet, 160 for SMS, 155 for a meta description) and watch the progress bar fill."
          audience={["Writers", "Marketers", "Students", "Developers"]}
          whenToUse={[
            "Staying under Twitter / SMS / meta description limits",
            "Writing to a word-count target",
            "Estimating reading time for a post or email",
          ]}
        />

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste your text here..."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
          rows={8}
          autoFocus
        />

        {/* Clear */}
        <div className="mt-1.5 flex items-center justify-end text-xs text-gray-400">
          {input && (
            <button
              onClick={() => setInput("")}
              className="text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Characters" value={stats.characters} />
          <StatCard label="No Spaces" value={stats.charactersNoSpaces} />
          <StatCard label="Words" value={stats.words} />
          <StatCard label="Sentences" value={stats.sentences} />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Paragraphs" value={stats.paragraphs} />
          <StatCard
            label="Reading Time"
            value={formatTime(stats.readingTimeMin)}
          />
          <StatCard
            label="Speaking Time"
            value={formatTime(stats.speakingTimeMin)}
          />
          <StatCard
            label="Readability"
            value={stats.readabilityScore !== null ? stats.readabilityScore : "\u2014"}
            sub={stats.readabilityLabel !== "\u2014" ? stats.readabilityLabel : undefined}
          />
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Reading Level"
            value={stats.gradeLevelLabel}
            sub={stats.gradeLevel !== null ? `Grade ${stats.gradeLevel}` : undefined}
          />
        </div>

        {/* Copy stats button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={handleCopyStats}
            disabled={!input}
            className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copiedStats ? (
              <>
                <CheckIcon />
                Copied Stats
              </>
            ) : (
              <>
                <CopyIcon />
                Copy Stats
              </>
            )}
          </button>
        </div>

        {/* Goal Setting */}
        <div className="mt-8">
          <GoalTracker
            goalType={goalType}
            setGoalType={setGoalType}
            goalValue={goalValue}
            setGoalValue={setGoalValue}
            current={goalType === "words" ? stats.words : stats.characters}
          />
        </div>

        {/* Collapsible sections */}
        <div className="mt-6 flex flex-col gap-4">
          {/* Social Media Limits */}
          <CollapsibleSection title="Social Media Limits" icon={<ShareIcon />} defaultOpen={true}>
            <div className="flex flex-col gap-3">
              {SOCIAL_LIMITS.map((item) => (
                <SocialLimitBar
                  key={item.name}
                  name={item.name}
                  limit={item.limit}
                  current={stats.characters}
                />
              ))}
            </div>
          </CollapsibleSection>

          {/* Keyword Density */}
          <CollapsibleSection title="Keyword Density" icon={<KeyIcon />} defaultOpen={true}>
            {keywords.length === 0 ? (
              <p className="text-sm text-gray-400">Start typing to see keyword density analysis.</p>
            ) : (
              <div className="overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-left font-medium text-gray-500">Keyword</th>
                      <th className="pb-2 text-right font-medium text-gray-500">Count</th>
                      <th className="pb-2 text-right font-medium text-gray-500">Density</th>
                      <th className="pb-2 w-32 pl-4 font-medium text-gray-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {keywords.map((kw) => (
                      <tr key={kw.word} className="border-b border-gray-50 last:border-0">
                        <td className="py-1.5 text-gray-900 font-medium">{kw.word}</td>
                        <td className="py-1.5 text-right text-gray-600 tabular-nums">{kw.count}</td>
                        <td className="py-1.5 text-right text-gray-600 tabular-nums">{kw.percentage}%</td>
                        <td className="py-1.5 pl-4">
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-blue-400 transition-all duration-200"
                              style={{ width: `${Math.min(kw.percentage * 10, 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CollapsibleSection>

          {/* Sentence Analysis */}
          <CollapsibleSection title="Sentence Analysis" icon={<BarChartIcon />} defaultOpen={true}>
            {!sentenceStats ? (
              <p className="text-sm text-gray-400">Start typing to see sentence-level analysis.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-gray-100  px-3 py-2.5">
                  <div className="text-lg font-bold text-gray-900">{sentenceStats.longest}</div>
                  <div className="text-xs text-gray-500">Longest (words)</div>
                </div>
                <div className="rounded-lg border border-gray-100  px-3 py-2.5">
                  <div className="text-lg font-bold text-gray-900">{sentenceStats.shortest}</div>
                  <div className="text-xs text-gray-500">Shortest (words)</div>
                </div>
                <div className="rounded-lg border border-gray-100  px-3 py-2.5">
                  <div className="text-lg font-bold text-gray-900">{sentenceStats.average}</div>
                  <div className="text-xs text-gray-500">Avg Length</div>
                </div>
                <div className="rounded-lg border border-gray-100  px-3 py-2.5">
                  <div className={`text-lg font-bold ${
                    sentenceStats.varietyLabel === "High"
                      ? "text-green-600"
                      : sentenceStats.varietyLabel === "Medium"
                      ? "text-yellow-600"
                      : "text-gray-600"
                  }`}>
                    {sentenceStats.varietyLabel}
                  </div>
                  <div className="text-xs text-gray-500">Variety</div>
                </div>
              </div>
            )}
          </CollapsibleSection>
        </div>

        {/* Footer */}
      </div>
    </div>
  );
}

// Inline SVG icons

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform duration-200 text-gray-400 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14L21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function BarChartIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gray-400"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
