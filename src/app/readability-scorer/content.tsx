"use client";

import React, { useMemo, useCallback } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

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
  if (w.endsWith("e") && count > 1 && !vowels.includes(w[w.length - 2])) count--;
  if (w.endsWith("le") && w.length > 2 && !vowels.includes(w[w.length - 3])) count++;
  return Math.max(count, 1);
}

function getWords(text: string): string[] {
  return text.trim() ? text.trim().split(/\s+/).filter(Boolean) : [];
}

function getSentences(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
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
  if (w.endsWith("es") || w.endsWith("ed") || w.endsWith("ing")) {
    const base = w.replace(/(es|ed|ing)$/, "");
    if (countSyllables(base) < 3) return false;
  }
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) return false;
  return true;
}

interface ReadabilityScores {
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  gunningFog: number;
  smog: number;
  colemanLiau: number;
  ari: number;
  linsearWrite: number;
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

  const fleschReadingEase = 206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords);
  const fleschKincaidGrade = 0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59;
  const gunningFog = 0.4 * ((totalWords / totalSentences) + 100 * (complexWords / totalWords));
  const polysyllables = words.filter((w) => countSyllables(w) >= 3).length;
  const smog = 3 + Math.sqrt(polysyllables * (30 / totalSentences));
  const L = (totalChars / totalWords) * 100;
  const S = (totalSentences / totalWords) * 100;
  const colemanLiau = 0.0588 * L - 0.296 * S - 15.8;
  const ari = 4.71 * (totalChars / totalWords) + 0.5 * (totalWords / totalSentences) - 21.43;

  // Linsear Write: count "easy" (1-2 syllables) and "hard" (3+) words across first 100 words
  const sample = words.slice(0, 100);
  let easy = 0;
  let hard = 0;
  for (const w of sample) {
    if (countSyllables(w) >= 3) hard++;
    else easy++;
  }
  const sampleSentences = Math.max(
    1,
    Math.round((sentenceCount / Math.max(1, totalWords)) * sample.length)
  );
  const raw = (easy + hard * 3) / sampleSentences;
  const linsearWrite = raw < 20 ? (raw - 2) / 2 : raw / 2;

  return { fleschReadingEase, fleschKincaidGrade, gunningFog, smog, colemanLiau, ari, linsearWrite };
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
  if (score >= 90) return "Very Easy";
  if (score >= 80) return "Easy";
  if (score >= 70) return "Fairly Easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly Difficult";
  if (score >= 30) return "Difficult";
  return "Very Confusing";
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

function getOverallGrade(scores: ReadabilityScores): number {
  return Math.round(
    ((scores.fleschKincaidGrade + scores.gunningFog + scores.smog + scores.colemanLiau + scores.ari + scores.linsearWrite) / 6) * 10
  ) / 10;
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

interface SentenceSuggestion {
  sentence: string;
  suggestion: string;
  severity: "warning" | "info";
}

function generateSuggestions(text: string): SentenceSuggestion[] {
  const sentences = getSentences(text);
  if (sentences.length === 0) return [];
  const suggestions: SentenceSuggestion[] = [];
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const truncated = sentence.length > 80 ? sentence.slice(0, 77) + "..." : sentence;
    if (wordCount > 40) {
      suggestions.push({
        sentence: truncated,
        suggestion: `Very long (${wordCount} words). Split into 2-3.`,
        severity: "warning",
      });
      continue;
    }
    if (wordCount > 25) {
      suggestions.push({
        sentence: truncated,
        suggestion: `Long (${wordCount} words). Consider splitting.`,
        severity: "info",
      });
    }
    const passivePattern = /\b(was|were|been|being)\s+(\w+ed|taken|given|made|done|seen|known|found|told|shown|written|broken|chosen|driven|eaten|fallen|forgotten|frozen|gotten|hidden|proven|risen|spoken|stolen|sworn|torn|woken|worn)\b/gi;
    const passiveMatches = sentence.match(passivePattern);
    if (passiveMatches && passiveMatches.length >= 3) {
      suggestions.push({
        sentence: truncated,
        suggestion: "Heavy passive voice — try active.",
        severity: "info",
      });
    }
    const wordsForComplexity = words.map((w, i) => (i === 0 && w.length > 0 ? w[0].toLowerCase() + w.slice(1) : w));
    const complexCount = wordsForComplexity.filter(isComplexWord).length;
    if (wordCount >= 5 && complexCount / wordCount > 0.3) {
      suggestions.push({
        sentence: truncated,
        suggestion: "Dense vocabulary — simpler words help.",
        severity: "info",
      });
    }
  }
  for (const para of paragraphs) {
    const paraSentences = getSentences(para);
    if (paraSentences.length >= 3) {
      const allLong = paraSentences.every((s) => s.split(/\s+/).filter(Boolean).length > 20);
      if (allLong) {
        suggestions.push({
          sentence: paraSentences[0].length > 80 ? paraSentences[0].slice(0, 77) + "..." : paraSentences[0],
          suggestion: "All sentences long — vary the rhythm.",
          severity: "info",
        });
      }
    }
  }
  suggestions.sort((a, b) => {
    if (a.severity === "warning" && b.severity !== "warning") return -1;
    if (a.severity !== "warning" && b.severity === "warning") return 1;
    return 0;
  });
  return suggestions.slice(0, 10);
}

// --- Score row ---

function ScoreRow({
  name,
  score,
  interpretation,
  grade,
}: {
  name: string;
  score: number;
  interpretation: string;
  grade: number;
}) {
  const hex = getScoreSemanticHex(grade);
  return (
    <div
      className="flex items-center justify-between px-3 py-2.5"
      style={{
        background: `color-mix(in srgb, ${hex} 10%, var(--kami-surface))`,
        border: `1px solid color-mix(in srgb, ${hex} 30%, transparent)`,
        borderRadius: "var(--kami-cta-radius, 0.5rem)",
      }}
    >
      <div className="min-w-0">
        <div className="text-xs uppercase tracking-wide truncate" style={{ color: "var(--kami-text-muted)" }}>
          {name}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--kami-text-dim)" }}>
          {interpretation}
        </div>
      </div>
      <div className="ml-3 text-xl font-bold tabular-nums" style={{ color: `color-mix(in srgb, ${hex} 80%, var(--kami-text))` }}>
        {Math.round(score * 10) / 10}
      </div>
    </div>
  );
}

const SENTENCE_BG: Record<SentenceInfo["category"], string> = {
  easy: "color-mix(in srgb, #22c55e 18%, transparent)",
  medium: "transparent",
  long: "color-mix(in srgb, #eab308 22%, transparent)",
  "very-long": "color-mix(in srgb, #ef4444 25%, transparent)",
};

export default function ReadabilityScorerContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [setInput]));

  const words = useMemo(() => getWords(input), [input]);
  const sentences = useMemo(() => categorizeSentences(input), [input]);
  const stats = useMemo(() => computeStats(input), [input]);
  const scores = useMemo(() => computeScores(words, stats.totalSentences, input), [words, stats.totalSentences, input]);
  const suggestions = useMemo(() => generateSuggestions(input), [input]);

  const overallGrade = scores ? getOverallGrade(scores) : null;
  const hasContent = words.length > 0 && stats.totalSentences > 0;

  const copyStats = useCallback(async () => {
    if (!scores) return;
    const lines = [
      `Words: ${stats.totalWords}`,
      `Sentences: ${stats.totalSentences}`,
      `Flesch Reading Ease: ${Math.round(scores.fleschReadingEase * 10) / 10}`,
      `Flesch-Kincaid Grade: ${Math.round(scores.fleschKincaidGrade * 10) / 10}`,
      `Gunning Fog: ${Math.round(scores.gunningFog * 10) / 10}`,
      `SMOG: ${Math.round(scores.smog * 10) / 10}`,
      `Coleman-Liau: ${Math.round(scores.colemanLiau * 10) / 10}`,
      `ARI: ${Math.round(scores.ari * 10) / 10}`,
      `Linsear Write: ${Math.round(scores.linsearWrite * 10) / 10}`,
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
  }, [scores, stats]);

  const controls = (
    <>
      <ControlGroup label="Algorithms">
        {scores ? (
          <div className="flex flex-col gap-2">
            <ScoreRow
              name="Flesch Reading Ease"
              score={scores.fleschReadingEase}
              interpretation={getFleschLabel(scores.fleschReadingEase)}
              grade={scores.fleschKincaidGrade}
            />
            <ScoreRow
              name="Flesch-Kincaid"
              score={scores.fleschKincaidGrade}
              interpretation={getGradeLevelLabel(scores.fleschKincaidGrade)}
              grade={scores.fleschKincaidGrade}
            />
            <ScoreRow
              name="Gunning Fog"
              score={scores.gunningFog}
              interpretation={getGradeLevelLabel(scores.gunningFog)}
              grade={scores.gunningFog}
            />
            <ScoreRow
              name="SMOG"
              score={scores.smog}
              interpretation={
                stats.totalSentences < 30
                  ? `${getGradeLevelLabel(scores.smog)} · 30+ sents ideal`
                  : getGradeLevelLabel(scores.smog)
              }
              grade={scores.smog}
            />
            <ScoreRow
              name="Coleman-Liau"
              score={scores.colemanLiau}
              interpretation={getGradeLevelLabel(scores.colemanLiau)}
              grade={scores.colemanLiau}
            />
            <ScoreRow
              name="ARI"
              score={scores.ari}
              interpretation={getGradeLevelLabel(scores.ari)}
              grade={scores.ari}
            />
            <ScoreRow
              name="Linsear Write"
              score={scores.linsearWrite}
              interpretation={getGradeLevelLabel(scores.linsearWrite)}
              grade={scores.linsearWrite}
            />
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
            Type 1+ sentence to see scores.
          </p>
        )}
      </ControlGroup>

      <ControlGroup label="Stats">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div style={{ color: "var(--kami-text-dim)" }}>Words</div>
            <div className="font-bold text-sm" style={{ color: "var(--kami-text)" }}>{stats.totalWords}</div>
          </div>
          <div>
            <div style={{ color: "var(--kami-text-dim)" }}>Sentences</div>
            <div className="font-bold text-sm" style={{ color: "var(--kami-text)" }}>{stats.totalSentences}</div>
          </div>
          <div>
            <div style={{ color: "var(--kami-text-dim)" }}>Paragraphs</div>
            <div className="font-bold text-sm" style={{ color: "var(--kami-text)" }}>{stats.totalParagraphs}</div>
          </div>
          <div>
            <div style={{ color: "var(--kami-text-dim)" }}>Avg w/s</div>
            <div className="font-bold text-sm" style={{ color: "var(--kami-text)" }}>{stats.avgWordsPerSentence}</div>
          </div>
          <div>
            <div style={{ color: "var(--kami-text-dim)" }}>Complex</div>
            <div className="font-bold text-sm" style={{ color: "var(--kami-text)" }}>{stats.complexWordPercent}%</div>
          </div>
          <div>
            <div style={{ color: "var(--kami-text-dim)" }}>Reading</div>
            <div className="font-bold text-sm" style={{ color: "var(--kami-text)" }}>{formatTime(stats.readingTimeMin)}</div>
          </div>
        </div>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={() => setInput("")}>
        Clear
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={copyStats} disabled={!scores}>
        Copy scores
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Readability Scorer"
      tagline="Flesch · Kincaid · Gunning Fog · SMOG · ARI · Coleman-Liau · Linsear"
      accent="#6366f1"
      actions={actions}
      controls={controls}
    >
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste or type your text to analyze readability..."
          className="w-full px-4 py-3 text-base focus:outline-none"
          style={{
            background: "var(--kami-input-bg, var(--kami-surface-solid))",
            color: "var(--kami-text)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-input-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
            minHeight: 180,
          }}
          rows={8}
          autoFocus
        />

        {/* Overall summary */}
        {hasContent && scores && overallGrade !== null && (
          <div
            className="px-5 py-4 flex flex-wrap items-center justify-between gap-4"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--kami-text-dim)" }}>
                Overall grade
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{ color: `color-mix(in srgb, ${getScoreSemanticHex(overallGrade)} 80%, var(--kami-text))` }}
                >
                  {overallGrade}
                </span>
                <span className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
                  {getGradeLevelLabel(overallGrade)}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--kami-text-dim)" }}>
                Reading ease
              </div>
              <div className="text-lg font-semibold" style={{ color: "var(--kami-text-muted)" }}>
                {getFleschLabel(scores.fleschReadingEase)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: "var(--kami-text-dim)" }}>
                Reading time
              </div>
              <div className="text-lg font-semibold" style={{ color: "var(--kami-text-muted)" }}>
                {formatTime(stats.readingTimeMin)}
              </div>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {hasContent && suggestions.length > 0 && (
          <div
            className="px-5 py-4"
            style={{
              background: "color-mix(in srgb, #f59e0b 8%, var(--kami-surface-solid))",
              border: "1px solid color-mix(in srgb, #f59e0b 30%, var(--kami-border-strong))",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--kami-text)" }}>
              Rewrite suggestions ({suggestions.length})
            </div>
            <ul className="flex flex-col gap-2.5">
              {suggestions.map((s, i) => (
                <li key={i}>
                  <div
                    className="text-sm"
                    style={{
                      color:
                        s.severity === "warning"
                          ? "color-mix(in srgb, #ef4444 80%, var(--kami-text))"
                          : "var(--kami-text-muted)",
                    }}
                  >
                    {s.suggestion}
                  </div>
                  <div className="text-xs truncate mt-0.5" style={{ color: "var(--kami-text-dim)" }}>
                    “{s.sentence}”
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sentence highlighting */}
        {hasContent && sentences.length > 0 && (
          <div
            className="px-5 py-4"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
                Sentence difficulty
              </span>
              <div className="flex flex-wrap gap-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                <Legend color="#22c55e" label="< 14" />
                <Legend color="transparent" label="14-20" border />
                <Legend color="#eab308" label="21-30" />
                <Legend color="#ef4444" label="30+" />
              </div>
            </div>
            <div
              className="max-h-72 overflow-auto p-4 text-sm leading-relaxed"
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
                  title={`${s.wordCount} words`}
                  style={{
                    background: SENTENCE_BG[s.category],
                    padding: s.category !== "medium" ? "0 2px" : 0,
                    borderRadius: 3,
                  }}
                >
                  {s.text}
                  {i < sentences.length - 1 ? " " : ""}
                </span>
              ))}
            </div>
          </div>
        )}

        {!hasContent && (
          <div
            className="text-center py-8 text-sm"
            style={{ color: "var(--kami-text-dim)" }}
          >
            Paste text above to see readability scores.
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function Legend({ color, label, border }: { color: string; label: string; border?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block w-3 h-3"
        style={{
          background: color === "transparent" ? "var(--kami-surface)" : `color-mix(in srgb, ${color} 35%, transparent)`,
          border: border ? "1px solid var(--kami-border-strong)" : undefined,
          borderRadius: 3,
        }}
      />
      {label}
    </span>
  );
}
