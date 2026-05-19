"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import {
  NumberStepper,
  Segment,
  Toggle,
} from "@/components/tools/controls";

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
  byteSize: number;
  longestLine: number;
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
  const cleaned = trimmed
    .replace(/\b([A-Z]\.){2,}/g, "ABBR")
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

function computeStats(text: string, includeSpaces: boolean): TextStats {
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

  // UTF-8 byte size: use TextEncoder
  let byteSize = 0;
  if (typeof TextEncoder !== "undefined") {
    byteSize = new TextEncoder().encode(includeSpaces ? text : text.replace(/\s/g, "")).length;
  }

  const longestLine = text.split("\n").reduce((m, l) => Math.max(m, l.length), 0);

  return {
    characters: includeSpaces ? characters : charactersNoSpaces,
    charactersNoSpaces,
    words: wordCount,
    sentences: sentenceCount,
    paragraphs: paragraphCount,
    readingTimeMin,
    speakingTimeMin,
    readabilityScore: fk?.score ?? null,
    readabilityLabel: fk?.label ?? "—",
    gradeLevel: gl?.grade ?? null,
    gradeLevelLabel: gl?.label ?? "—",
    byteSize,
    longestLine,
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

const SOCIAL_LIMITS = [
  { name: "Tweet", limit: 280 },
  { name: "Title tag", limit: 60 },
  { name: "Meta desc", limit: 160 },
  { name: "SMS", limit: 160 },
  { name: "LinkedIn post", limit: 3000 },
];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="px-3 py-3"
      style={{
        background: "var(--kami-surface-solid)",
        border: "1px solid var(--kami-border-strong)",
        borderRadius: "var(--kami-card-radius, 0.75rem)",
        boxShadow: "var(--kami-card-shadow, none)",
      }}
    >
      <div className="text-2xl font-bold tabular-nums kami-text">{value}</div>
      <div className="text-xs kami-text-muted">{label}</div>
      {sub && <div className="mt-0.5 text-xs kami-text-dim">{sub}</div>}
    </div>
  );
}

function ProgressBar({ name, limit, current }: { name: string; limit: number; current: number }) {
  const ratio = current / limit;
  const percent = Math.min(ratio * 100, 100);
  const over = current > limit;
  const color = ratio <= 0.7 ? "#22c55e" : ratio <= 0.95 ? "#eab308" : "#ef4444";
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="kami-text-muted">{name}</span>
        <span className="tabular-nums" style={{ color: over ? "#ef4444" : "var(--kami-text-muted)" }}>
          {current} / {limit}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden"
        style={{ background: "var(--kami-surface)", borderRadius: 999 }}
      >
        <div
          className="h-full"
          style={{ width: `${percent}%`, background: color, borderRadius: 999 }}
        />
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
  const [goalValue, setGoalValue] = useState(500);
  const [includeSpaces, setIncludeSpaces] = useState(true);
  const [view, setView] = useState<"stats" | "limits" | "keywords" | "lines">("stats");

  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  useKeyboardShortcuts(useMemo(() => [
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [setInput]));

  const stats = useMemo(() => computeStats(input, includeSpaces), [input, includeSpaces]);
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
      `UTF-8 bytes: ${stats.byteSize}`,
    ];
    if (stats.readabilityScore !== null) {
      lines.push(`Readability: ${stats.readabilityScore} (${stats.readabilityLabel})`);
    }
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedStats(true);
    setTimeout(() => setCopiedStats(false), 2000);
  }, [stats]);

  const target = goalValue;
  const currentGoal = goalType === "words" ? stats.words : stats.characters;
  const goalRatio = target > 0 ? currentGoal / target : 0;
  const goalPct = Math.min(goalRatio * 100, 100);

  const lines = useMemo(() => input.split("\n"), [input]);

  const controls = (
    <>
      <ControlGroup label="Counting">
        <Toggle
          checked={includeSpaces}
          onChange={setIncludeSpaces}
          label="Include spaces"
          hint="Affects char count + byte size"
        />
      </ControlGroup>
      <ControlGroup label="Goal">
        <Segment
          value={goalType}
          onChange={setGoalType}
          options={[
            { value: "words", label: "Words" },
            { value: "characters", label: "Chars" },
          ]}
          full
        />
        <NumberStepper
          value={goalValue}
          onChange={(n) => setGoalValue(Math.max(0, n))}
          min={0}
          step={goalType === "words" ? 50 : 100}
          label="Target"
        />
      </ControlGroup>
      <ControlGroup label="Panel">
        <Segment
          value={view}
          onChange={setView}
          options={[
            { value: "stats", label: "Stats" },
            { value: "limits", label: "Limits" },
            { value: "keywords", label: "Keywords" },
            { value: "lines", label: "Lines" },
          ]}
          full
        />
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={() => setInput("")}>
        Clear
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopyStats} disabled={!input}>
        {copiedStats ? "Copied" : "Copy stats"}
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Character Counter"
      tagline="Chars · words · sentences · UTF-8 bytes · platform limits"
      accent="#6366f1"
      materialFab={{ label: "Copy stats", onClick: handleCopyStats }}
      actions={actions}
      controls={controls}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Input</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>

        <div className="canvas-section glass-canvas-section" data-panel="input">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste your text here..."
              className="w-full px-4 py-3 text-base focus:outline-none"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface-solid))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
                minHeight: 200,
              }}
              rows={8}
              autoFocus
            />
          </div>

        <div className="canvas-section glass-canvas-section" data-panel="output">

        {/* Goal bar */}
        {target > 0 && (
          <div
            className="px-4 py-3"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="kami-text-muted">
                Goal: {currentGoal} / {target} {goalType}
              </span>
              <span
                style={{
                  color:
                    currentGoal >= target
                      ? "color-mix(in srgb, #16a34a 70%, var(--kami-text))"
                      : "var(--kami-text-muted)",
                }}
              >
                {Math.round(goalPct)}%
              </span>
            </div>
            <div
              className="h-2 w-full overflow-hidden"
              style={{ background: "var(--kami-surface)", borderRadius: 999 }}
            >
              <div
                className="h-full"
                style={{
                  width: `${goalPct}%`,
                  background: currentGoal >= target ? "#22c55e" : "#6366f1",
                  borderRadius: 999,
                }}
              />
            </div>
          </div>
        )}

        {/* Stats grid */}
        {view === "stats" && (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatCard label="Characters" value={stats.characters} />
            <StatCard label="Words" value={stats.words} />
            <StatCard label="Sentences" value={stats.sentences} />
            <StatCard label="Paragraphs" value={stats.paragraphs} />
            <StatCard label="Reading" value={formatTime(stats.readingTimeMin)} />
            <StatCard label="Speaking" value={formatTime(stats.speakingTimeMin)} />
            <StatCard label="UTF-8 bytes" value={stats.byteSize} />
            <StatCard
              label="Readability"
              value={stats.readabilityScore !== null ? stats.readabilityScore : "—"}
              sub={stats.readabilityLabel !== "—" ? stats.readabilityLabel : undefined}
            />
          </div>
        )}

        {view === "limits" && (
          <div
            className="px-4 py-4 flex flex-col gap-3"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            {SOCIAL_LIMITS.map((s) => (
              <ProgressBar key={s.name} name={s.name} limit={s.limit} current={stats.characters} />
            ))}
          </div>
        )}

        {view === "keywords" && (
          <div
            className="overflow-hidden"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            {keywords.length === 0 ? (
              <p className="px-4 py-4 text-sm kami-text-dim">
                Type something to see keyword density.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="kami-border-bottom">
                    <th className="px-4 py-2 text-left font-medium kami-text-muted">Word</th>
                    <th className="px-4 py-2 text-right font-medium kami-text-muted">Count</th>
                    <th className="px-4 py-2 text-right font-medium kami-text-muted">Density</th>
                  </tr>
                </thead>
                <tbody>
                  {keywords.map((kw) => (
                    <tr key={kw.word} className="kami-border-bottom">
                      <td className="px-4 py-1.5 font-medium kami-text">{kw.word}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums kami-text-muted">{kw.count}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums kami-text-muted">{kw.percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {sentenceStats && (
              <div
                className="grid grid-cols-2 md:grid-cols-4 gap-2 px-4 py-3 kami-border-top"
              >
                <StatCard label="Longest" value={sentenceStats.longest} sub="words" />
                <StatCard label="Shortest" value={sentenceStats.shortest} sub="words" />
                <StatCard label="Avg" value={sentenceStats.average} sub="words/sent" />
                <StatCard label="Variety" value={sentenceStats.varietyLabel} />
              </div>
            )}
          </div>
        )}

        {view === "lines" && (
          <div
            className="overflow-hidden"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <div
              className="px-4 py-2 text-xs flex items-center justify-between"
              style={{
                borderBottom: "1px solid var(--kami-border)",
                color: "var(--kami-text-muted)",
              }}
            >
              <span>{lines.length} lines · longest {stats.longestLine} chars</span>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-xs font-mono">
                <tbody>
                  {lines.slice(0, 200).map((line, i) => (
                    <tr key={i} className="kami-border-bottom">
                      <td
                        className="px-3 py-1 tabular-nums w-12 text-right kami-text-dim"
                      >
                        {i + 1}
                      </td>
                      <td className="px-3 py-1 truncate kami-text">
                        {line || " "}
                      </td>
                      <td
                        className="px-3 py-1 tabular-nums w-16 text-right kami-text-dim"
                      >
                        {line.length}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
          </div>
      </div>
    </ToolShell>
  );
}
