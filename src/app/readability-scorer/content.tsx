"use client";

import React, { useMemo, useCallback } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ReferencePanel, RuleRow } from "@/components/tools/reference-panel";

// --- Syllable counting ---

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

  // Silent e at end
  if (w.endsWith("e") && count > 1 && !vowels.includes(w[w.length - 2])) {
    count--;
  }

  // -le preceded by consonant
  if (w.endsWith("le") && w.length > 2 && !vowels.includes(w[w.length - 3])) {
    count++;
  }

  return Math.max(count, 1);
}

// --- Text parsing helpers ---

function getWords(text: string): string[] {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
}

function getSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  // Split on sentence-ending punctuation followed by space or end
  const parts = trimmed.split(/(?<=[.!?])\s+/);
  return parts.map((s) => s.trim()).filter(Boolean);
}

function countParagraphs(text: string): number {
  if (!text.trim()) return 0;
  return text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length || (text.trim().length > 0 ? 1 : 0);
}

function isComplexWord(word: string): boolean {
  const syllables = countSyllables(word);
  if (syllables < 3) return false;

  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  // Exclude common suffixes
  if (w.endsWith("es") || w.endsWith("ed") || w.endsWith("ing")) {
    const base = w.replace(/(es|ed|ing)$/, "");
    if (countSyllables(base) < 3) return false;
  }
  // Exclude proper nouns (starts with uppercase)
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
    return false;
  }

  return true;
}

// --- Readability formulas ---

interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  smog: number;
  colemanLiau: number;
  ari: number;
}

interface TextStatistics {
  totalWords: number;
  totalSentences: number;
  totalParagraphs: number;
  totalSyllables: number;
  totalCharacters: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  complexWordCount: number;
  complexWordPercent: number;
  readingTimeMin: number;
}

function lowercaseSentenceStarts(text: string): string[] {
  const sentences = getSentences(text);
  const result: string[] = [];
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i++) {
      if (i === 0 && words[i].length > 0) {
        result.push(words[i][0].toLowerCase() + words[i].slice(1));
      } else {
        result.push(words[i]);
      }
    }
  }
  return result;
}

function computeScores(words: string[], sentenceCount: number, text: string): ReadabilityScores | null {
  if (words.length === 0 || sentenceCount === 0) return null;

  const totalWords = words.length;
  const totalSentences = sentenceCount;
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const preprocessed = lowercaseSentenceStarts(text);
  const complexWords = preprocessed.filter(isComplexWord).length;
  const totalChars = words.reduce((sum, w) => sum + w.replace(/[^a-z0-9]/gi, "").length, 0);

  // Flesch Reading Ease
  const fleschReadingEase = 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);

  // Flesch-Kincaid Grade Level
  const fleschKincaidGrade = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;

  // Gunning Fog Index
  const gunningFog = 0.4 * ((totalWords / totalSentences) + 100 * (complexWords / totalWords));

  // SMOG Index
  const polysyllables = words.filter((w) => countSyllables(w) >= 3).length;
  const smog = 3 + Math.sqrt(polysyllables * (30 / totalSentences));

  // Coleman-Liau Index
  const L = (totalChars / totalWords) * 100;
  const S = (totalSentences / totalWords) * 100;
  const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;

  // Automated Readability Index
  const ari = 4.71 * (totalChars / totalWords) + 0.5 * (totalWords / totalSentences) - 21.43;

  return { fleschReadingEase, fleschKincaidGrade, gunningFog, smog, colemanLiau, ari };
}

function computeStats(text: string): TextStatistics {
  const words = getWords(text);
  const sentences = getSentences(text);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  const totalChars = words.reduce((sum, w) => sum + w.replace(/[^a-z0-9]/gi, "").length, 0);
  const preprocessed = lowercaseSentenceStarts(text);
  const complexWords = preprocessed.filter(isComplexWord);

  return {
    totalWords: words.length,
    totalSentences: sentences.length,
    totalParagraphs: countParagraphs(text),
    totalSyllables,
    totalCharacters: totalChars,
    avgWordsPerSentence: sentences.length > 0 ? Math.round((words.length / sentences.length) * 10) / 10 : 0,
    avgSyllablesPerWord: words.length > 0 ? Math.round((totalSyllables / words.length) * 100) / 100 : 0,
    complexWordCount: complexWords.length,
    complexWordPercent: words.length > 0 ? Math.round((complexWords.length / words.length) * 1000) / 10 : 0,
    readingTimeMin: words.length / 238,
  };
}

function getFleschLabel(score: number): string {
  if (score >= 90) return "Very Easy (5th grade)";
  if (score >= 80) return "Easy (6th grade)";
  if (score >= 70) return "Fairly Easy (7th grade)";
  if (score >= 60) return "Standard (8th-9th grade)";
  if (score >= 50) return "Fairly Difficult (10th-12th grade)";
  if (score >= 30) return "Difficult (College)";
  return "Very Confusing (Graduate)";
}

function getGradeLevelLabel(grade: number): string {
  if (grade < 1) return "Kindergarten";
  if (grade <= 12) return `Grade ${Math.round(grade)}`;
  if (grade <= 16) return "College";
  return "Graduate";
}

function getScoreSemanticHex(grade: number): string {
  if (grade <= 6) return "#16a34a";
  if (grade <= 10) return "#ca8a04";
  return "#dc2626";
}

function getScoreColorStyle(grade: number): React.CSSProperties {
  return { color: `color-mix(in srgb, ${getScoreSemanticHex(grade)} 80%, var(--kami-text))` };
}

function getScoreBgStyle(grade: number): React.CSSProperties {
  const hex = getScoreSemanticHex(grade);
  return {
    background: `color-mix(in srgb, ${hex} 10%, var(--kami-surface))`,
    border: `1px solid color-mix(in srgb, ${hex} 30%, transparent)`,
  };
}

function getScoreDotStyle(grade: number): React.CSSProperties {
  return { background: getScoreSemanticHex(grade) };
}

function getOverallGrade(scores: ReadabilityScores): number {
  return Math.round(
    ((scores.fleschKincaidGrade + scores.gunningFog + scores.smog + scores.colemanLiau + scores.ari) / 5) * 10
  ) / 10;
}

function getOverallCategory(scores: ReadabilityScores): string {
  const ease = scores.fleschReadingEase;
  if (ease >= 90) return "Very Easy";
  if (ease >= 80) return "Easy";
  if (ease >= 70) return "Fairly Easy";
  if (ease >= 60) return "Standard";
  if (ease >= 50) return "Fairly Difficult";
  if (ease >= 30) return "Difficult";
  return "Very Confusing";
}

function formatTime(minutes: number): string {
  if (minutes < 1) {
    const secs = Math.round(minutes * 60);
    return secs <= 0 ? "< 1 sec" : `${secs} sec`;
  }
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  if (secs === 0) return `${mins} min`;
  return `${mins} min ${secs} sec`;
}

// --- Sentence difficulty ---

interface SentenceInfo {
  text: string;
  wordCount: number;
  category: "easy" | "medium" | "long" | "very-long";
}

function categorizeSentences(text: string): SentenceInfo[] {
  const sentences = getSentences(text);
  return sentences.map((s) => {
    const wordCount = s.split(/\s+/).filter(Boolean).length;
    let category: SentenceInfo["category"];
    if (wordCount < 14) category = "easy";
    else if (wordCount <= 20) category = "medium";
    else if (wordCount <= 30) category = "long";
    else category = "very-long";
    return { text: s, wordCount, category };
  });
}

function getSentenceDistribution(sentences: SentenceInfo[]) {
  const total = sentences.length;
  const short = sentences.filter((s) => s.category === "easy").length;
  const medium = sentences.filter((s) => s.category === "medium").length;
  const long = sentences.filter((s) => s.category === "long").length;
  const veryLong = sentences.filter((s) => s.category === "very-long").length;

  return { total, short, medium, long, veryLong };
}

// --- Per-sentence suggestions ---

interface SentenceSuggestion {
  sentence: string;
  suggestion: string;
  severity: "warning" | "info";
}

function generateSuggestions(text: string): SentenceSuggestion[] {
  const sentences = getSentences(text);
  if (sentences.length === 0) return [];

  const suggestions: SentenceSuggestion[] = [];

  // Track paragraph-level data for rhythm suggestion
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const truncated = sentence.length > 80 ? sentence.slice(0, 77) + "..." : sentence;

    // Very long sentences (40+ words) -- highest priority
    if (wordCount > 40) {
      suggestions.push({
        sentence: truncated,
        suggestion: `This sentence is very long (${wordCount} words). Break it into 2-3 shorter sentences.`,
        severity: "warning",
      });
      continue; // Skip the milder length warning
    }

    // Long sentences (25+ words)
    if (wordCount > 25) {
      suggestions.push({
        sentence: truncated,
        suggestion: `Consider splitting this sentence (${wordCount} words).`,
        severity: "info",
      });
    }

    // Passive voice detection: was/were/been/being followed by a word ending in -ed or irregular past participle patterns
    const passivePattern = /\b(was|were|been|being)\s+(\w+ed|taken|given|made|done|seen|known|found|told|shown|written|broken|chosen|driven|eaten|fallen|forgotten|frozen|gotten|hidden|proven|risen|spoken|stolen|sworn|torn|woken|worn)\b/gi;
    const passiveMatches = sentence.match(passivePattern);
    if (passiveMatches && passiveMatches.length >= 3) {
      suggestions.push({
        sentence: truncated,
        suggestion: "Consider using active voice.",
        severity: "info",
      });
    }

    // Complex vocabulary check: 3+ syllable words making up >30% of sentence
    // Use lowercased first word to avoid proper-noun false positive on sentence starts
    const wordsForComplexity = words.map((w, i) =>
      i === 0 && w.length > 0 ? w[0].toLowerCase() + w.slice(1) : w
    );
    const complexCount = wordsForComplexity.filter(isComplexWord).length;
    if (wordCount >= 5 && complexCount / wordCount > 0.3) {
      suggestions.push({
        sentence: truncated,
        suggestion: "Simplify vocabulary in this sentence.",
        severity: "info",
      });
    }
  }

  // Paragraph-level: all long sentences in a paragraph
  for (const para of paragraphs) {
    const paraSentences = getSentences(para);
    if (paraSentences.length >= 3) {
      const allLong = paraSentences.every((s) => s.split(/\s+/).filter(Boolean).length > 20);
      if (allLong) {
        suggestions.push({
          sentence: paraSentences[0].length > 80 ? paraSentences[0].slice(0, 77) + "..." : paraSentences[0],
          suggestion: "Vary your sentence length for better rhythm.",
          severity: "info",
        });
      }
    }
  }

  // Sort: warnings first, then by original order (already in order), limit to 10
  suggestions.sort((a, b) => {
    if (a.severity === "warning" && b.severity !== "warning") return -1;
    if (a.severity !== "warning" && b.severity === "warning") return 1;
    return 0;
  });

  return suggestions.slice(0, 10);
}

// --- Score card ---

interface ScoreCardProps {
  name: string;
  score: number;
  interpretation: string;
  grade: number;
}

function ScoreCard({ name, score, interpretation, grade }: ScoreCardProps) {
  return (
    <div
      className="px-4 py-3.5"
      style={{ ...getScoreBgStyle(grade), borderRadius: "var(--kami-card-radius, 0.75rem)" }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <div className="h-2.5 w-2.5 rounded-full" style={getScoreDotStyle(grade)} />
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>{name}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums" style={getScoreColorStyle(grade)}>
        {Math.round(score * 10) / 10}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--kami-text-muted)" }}>{interpretation}</div>
    </div>
  );
}

// --- Distribution bar ---

function DistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 text-sm" style={{ color: "var(--kami-text-muted)" }}>{label}</div>
      <div className="flex-1">
        <div
          className="h-5 w-full overflow-hidden"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border)",
            borderRadius: "4px",
          }}
        >
          <div
            className={`h-full rounded transition-all duration-200 ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="w-20 shrink-0 text-right text-sm tabular-nums" style={{ color: "var(--kami-text-muted)" }}>
        {count} ({pct}%)
      </div>
    </div>
  );
}

// --- Sentence highlight colors ---

const SENTENCE_COLORS: Record<SentenceInfo["category"], string> = {
  easy: "bg-green-100",
  medium: "",
  long: "bg-yellow-100",
  "very-long": "bg-red-100",
};

const LEGEND_ITEMS = [
  { label: "Easy (< 14 words)", color: "bg-green-100", border: "border-green-300" },
  { label: "Medium (14-20)", color: "", border: "border-gray-300" },
  { label: "Long (21-30)", color: "bg-yellow-100", border: "border-yellow-300" },
  { label: "Very long (> 30)", color: "bg-red-100", border: "border-red-300" },
];

// --- Main component ---

export default function ReadabilityScorerContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "k", meta: true, action: () => setInput(""), label: "Clear" }],
      [setInput]
    )
  );

  const words = useMemo(() => getWords(input), [input]);
  const sentences = useMemo(() => categorizeSentences(input), [input]);
  const stats = useMemo(() => computeStats(input), [input]);
  const scores = useMemo(() => computeScores(words, stats.totalSentences, input), [words, stats.totalSentences, input]);
  const distribution = useMemo(() => getSentenceDistribution(sentences), [sentences]);

  const suggestions = useMemo(() => generateSuggestions(input), [input]);

  const overallGrade = scores ? getOverallGrade(scores) : null;
  const overallCategory = scores ? getOverallCategory(scores) : null;
  const hasContent = words.length > 0 && stats.totalSentences > 0;

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Readability Scorer"
          tagline="Grade any text for reading difficulty using five established formulas - and see which sentences drag the score down."
          description="Paste your copy and we run Flesch-Kincaid, Gunning Fog, SMOG, ARI, and Coleman-Liau in parallel, each with a grade-level translation. Sentences that hurt the score most are highlighted so you know exactly what to shorten. Aim for grade 7-8 for general web content."
          audience={["Writers", "Editors", "Content marketers", "Educators"]}
          whenToUse={[
            "Proofreading a blog post before publishing",
            "Simplifying product copy or help docs",
            "Checking a script meets a reading level target",
          ]}
          quickLinks={[
            { label: "What each formula measures", href: "#readability-formulas" },
          ]}
        />

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste or type your text here to analyze readability..."
          className="w-full px-4 py-3 text-base focus:outline-none"
          style={{
            background: "var(--kami-input-bg, var(--kami-surface-solid))",
            color: "var(--kami-text)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-input-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
          rows={8}
          autoFocus
        />

        {/* Clear */}
        <div className="mt-1.5 flex items-center justify-end text-xs" style={{ color: "var(--kami-text-dim)" }}>
          {input && (
            <button onClick={() => setInput("")} style={{ color: "var(--kami-text-dim)" }}>
              Clear
            </button>
          )}
        </div>

        {/* Summary bar */}
        {hasContent && scores && overallGrade !== null && (
          <div
            className="mt-6 px-5 py-4"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--kami-text-dim)" }}>
                  Overall Grade Level
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold tabular-nums" style={getScoreColorStyle(overallGrade)}>
                    {overallGrade}
                  </span>
                  <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>{getGradeLevelLabel(overallGrade)}</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--kami-text-dim)" }}>
                  Reading Ease
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold tabular-nums" style={getScoreColorStyle(overallGrade)}>
                    {overallCategory}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium uppercase tracking-wide mb-1" style={{ color: "var(--kami-text-dim)" }}>
                  Reading Time
                </div>
                <div className="text-xl font-bold" style={{ color: "var(--kami-text-muted)" }}>{formatTime(stats.readingTimeMin)}</div>
              </div>
            </div>
          </div>
        )}

        {/* Score cards - 2x3 grid */}
        {hasContent && scores && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <ScoreCard
              name="Flesch Reading Ease"
              score={scores.fleschReadingEase}
              interpretation={getFleschLabel(scores.fleschReadingEase)}
              grade={scores.fleschKincaidGrade}
            />
            <ScoreCard
              name="Flesch-Kincaid Grade"
              score={scores.fleschKincaidGrade}
              interpretation={getGradeLevelLabel(scores.fleschKincaidGrade)}
              grade={scores.fleschKincaidGrade}
            />
            <ScoreCard
              name="Gunning Fog"
              score={scores.gunningFog}
              interpretation={getGradeLevelLabel(scores.gunningFog)}
              grade={scores.gunningFog}
            />
            <div>
              <ScoreCard
                name="SMOG Index"
                score={scores.smog}
                interpretation={getGradeLevelLabel(scores.smog)}
                grade={scores.smog}
              />
              {stats.totalSentences < 30 && (
                <div className="mt-1 px-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                  (requires 30+ sentences for accuracy)
                </div>
              )}
            </div>
            <ScoreCard
              name="Coleman-Liau"
              score={scores.colemanLiau}
              interpretation={getGradeLevelLabel(scores.colemanLiau)}
              grade={scores.colemanLiau}
            />
            <ScoreCard
              name="Automated Readability"
              score={scores.ari}
              interpretation={getGradeLevelLabel(scores.ari)}
              grade={scores.ari}
            />
          </div>
        )}

        {/* Text Statistics */}
        {hasContent && (
          <div
            className="mt-6 overflow-hidden"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-4">
                <StatsIcon />
                <span className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>Text Statistics</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <StatItem label="Total Words" value={stats.totalWords} />
                <StatItem label="Sentences" value={stats.totalSentences} />
                <StatItem label="Paragraphs" value={stats.totalParagraphs} />
                <StatItem label="Avg Words/Sentence" value={stats.avgWordsPerSentence} />
                <StatItem label="Avg Syllables/Word" value={stats.avgSyllablesPerWord} />
                <StatItem label="Complex Words" value={`${stats.complexWordCount} (${stats.complexWordPercent}%)`} />
              </div>
            </div>
          </div>
        )}

        {/* Sentence Difficulty Highlighting */}
        {hasContent && sentences.length > 0 && (
          <div
            className="mt-6 overflow-hidden"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-3">
                <HighlightIcon />
                <span className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>Sentence Difficulty</span>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-3 mb-4">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={`h-3 w-5 rounded border ${item.color || ""} ${item.border}`} />
                    <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* Highlighted text */}
              <div
                className="max-h-64 overflow-y-auto p-4 text-sm leading-relaxed"
                style={{
                  background: "var(--kami-surface)",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                }}
              >
                {sentences.map((s, i) => (
                  <span
                    key={i}
                    className={`${SENTENCE_COLORS[s.category]} ${s.category !== "medium" ? "rounded px-0.5" : ""}`}
                    title={`${s.wordCount} words`}
                  >
                    {s.text}
                    {i < sentences.length - 1 ? " " : ""}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Per-sentence suggestions */}
        {hasContent && suggestions.length > 0 && (
          <div
            className="mt-6 overflow-hidden"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-3">
                <SuggestionsIcon />
                <span className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>Suggestions</span>
                <span
                  className="ml-auto inline-flex items-center px-2 py-0.5 text-xs font-medium"
                  style={{
                    background: "color-mix(in srgb, #f59e0b 18%, var(--kami-surface))",
                    color: "color-mix(in srgb, #b45309 80%, var(--kami-text))",
                    borderRadius: "999px",
                  }}
                >
                  {suggestions.length}
                </span>
              </div>
              <ul className="space-y-3">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-0.5 flex-shrink-0">
                      {s.severity === "warning" ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="12" />
                          <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: "var(--kami-text-muted)" }}>{s.suggestion}</p>
                      <p className="mt-0.5 text-xs truncate" style={{ color: "var(--kami-text-dim)" }}>{s.sentence}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Distribution chart */}
        {hasContent && (
          <div
            className="mt-6 overflow-hidden"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <div className="px-5 py-4">
              <div className="flex items-center gap-2.5 mb-4">
                <ChartIcon />
                <span className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>Sentence Length Distribution</span>
              </div>
              <div className="flex flex-col gap-2.5">
                <DistributionBar
                  label="Short (< 14)"
                  count={distribution.short}
                  total={distribution.total}
                  color="bg-green-400"
                />
                <DistributionBar
                  label="Medium (14-20)"
                  count={distribution.medium}
                  total={distribution.total}
                  color="bg-gray-400"
                />
                <DistributionBar
                  label="Long (21-30)"
                  count={distribution.long}
                  total={distribution.total}
                  color="bg-yellow-400"
                />
                <DistributionBar
                  label="Very long (> 30)"
                  count={distribution.veryLong}
                  total={distribution.total}
                  color="bg-red-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!hasContent && (
          <div className="mt-12 text-center" style={{ color: "var(--kami-text-dim)" }}>
            <EmptyIcon />
            <p className="mt-3 text-sm">Paste or type text above to see readability scores.</p>
            <p className="mt-1 text-xs">Works best with 2+ sentences.</p>
          </div>
        )}

        <ReferencePanel
          id="readability-formulas"
          title="The five formulas, decoded"
          summary="Each formula was built for a different purpose. Here's when to trust which."
          defaultOpen
        >
          <div className="space-y-1">
            <RuleRow rule="Flesch Reading Ease" explanation="0-100 score. Higher = easier. 60-70 is ideal for general audiences." example="60-70 = plain English" />
            <RuleRow rule="Flesch-Kincaid Grade" explanation="US grade level. Same inputs as Reading Ease, re-scaled. Most trusted for general web." example="7-8 = ideal" />
            <RuleRow rule="Gunning Fog" explanation="Counts complex (3+ syllable) words. Especially harsh on jargon-heavy writing." example="8 = magazine article" />
            <RuleRow rule="SMOG" explanation="Predicts reading age needed for full comprehension. Used in healthcare and legal." example="SMOG 10 = 10th grader" />
            <RuleRow rule="ARI" explanation="Uses character count instead of syllables - faster and language-agnostic." example="Grade-level output" />
            <RuleRow rule="Coleman-Liau" explanation="Also character-based; designed for computer-generated scoring." example="Grade-level output" />
          </div>
          <div
            className="mt-3 p-3 text-xs"
            style={{
              background: "color-mix(in srgb, #f59e0b 10%, var(--kami-surface))",
              color: "var(--kami-text)",
              border: "1px solid color-mix(in srgb, #f59e0b 30%, transparent)",
              borderRadius: "var(--kami-card-radius, 0.5rem)",
            }}
          >
            <strong>Tip:</strong> readability formulas reward short sentences and common
            words. They don&apos;t judge whether ideas are <em>clear</em> - a string of
            short nonsense will score high. Use the score as a smell test, not a verdict.
          </div>
        </ReferencePanel>
      </div>
    </div>
  );
}

// --- Small UI pieces ---

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div
      className="px-3 py-2.5"
      style={{
        border: "1px solid var(--kami-border)",
        borderRadius: "var(--kami-input-radius, 0.5rem)",
      }}
    >
      <div className="text-lg font-bold" style={{ color: "var(--kami-text)" }}>{value}</div>
      <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{label}</div>
    </div>
  );
}

// --- Inline SVG icons ---

function StatsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--kami-text-dim)" }}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function HighlightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--kami-text-dim)" }}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function SuggestionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--kami-text-dim)" }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--kami-text-dim)" }}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto" style={{ color: "var(--kami-text-dim)" }}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
