"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// Common English stop words
const DEFAULT_STOP_WORDS = [
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "is", "it", "as", "was", "are", "be",
  "been", "being", "have", "has", "had", "do", "does", "did", "will",
  "would", "could", "should", "may", "might", "shall", "can", "need",
  "not", "no", "nor", "so", "if", "then", "than", "that", "this",
  "these", "those", "i", "you", "he", "she", "we", "they", "me",
  "him", "her", "us", "them", "my", "your", "his", "its", "our",
  "their", "what", "which", "who", "whom", "where", "when", "how",
  "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "just", "also", "very",
  "about", "up", "out", "into", "over", "after", "before", "between",
];

type WordEntry = { word: string; count: number; pct: number };
type NgramTab = "words" | "bigrams" | "trigrams";

function analyzeWords(
  text: string,
  caseSensitive: boolean,
  excludeStopWords: boolean,
  minCount: number,
  stopWords: Set<string>
): WordEntry[] {
  if (!text.trim()) return [];

  const words = text.match(/[\w']+/g);
  if (!words) return [];

  const freq = new Map<string, number>();
  for (const raw of words) {
    const w = caseSensitive ? raw : raw.toLowerCase();
    if (excludeStopWords && stopWords.has(w.toLowerCase())) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }

  const total = Array.from(freq.values()).reduce((s, c) => s + c, 0);
  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count, pct: (count / total) * 100 }))
    .filter((e) => e.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

function analyzeNgrams(
  text: string,
  n: number,
  caseSensitive: boolean,
  excludeStopWords: boolean,
  minCount: number,
  stopWords: Set<string>
): WordEntry[] {
  if (!text.trim()) return [];

  const rawWords = text.match(/[\w']+/g);
  if (!rawWords || rawWords.length < n) return [];

  const words = rawWords.map((w) => (caseSensitive ? w : w.toLowerCase()));

  // For n-grams, filter out any n-gram that contains a stop word (if enabled)
  const freq = new Map<string, number>();
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n);
    if (excludeStopWords && gram.some((w) => stopWords.has(w.toLowerCase()))) {
      continue;
    }
    const key = gram.join(" ");
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  const total = Array.from(freq.values()).reduce((s, c) => s + c, 0);
  if (total === 0) return [];

  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count, pct: (count / total) * 100 }))
    .filter((e) => e.count >= minCount)
    .sort((a, b) => b.count - a.count);
}

function exportCSV(entries: WordEntry[]): string {
  const header = "Word,Count,Percentage";
  const rows = entries.map(
    (e) => `"${e.word.replace(/"/g, '""')}",${e.count},${e.pct.toFixed(2)}%`
  );
  return [header, ...rows].join("\n");
}

function exportJSON(entries: WordEntry[]): string {
  return JSON.stringify(
    entries.map((e) => ({
      word: e.word,
      count: e.count,
      percentage: Math.round(e.pct * 100) / 100,
    })),
    null,
    2
  );
}

export default function WordFrequencyContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [excludeStopWords, setExcludeStopWords] = useState(true);
  const [minCount, setMinCount] = useState(1);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<NgramTab>("words");
  const [stopWordsText, setStopWordsText] = useState(
    DEFAULT_STOP_WORDS.join(", ")
  );
  const [showStopWords, setShowStopWords] = useState(false);

  const stopWordsSet = useMemo(() => {
    return new Set(
      stopWordsText
        .split(/[,\n]+/)
        .map((w) => w.trim().toLowerCase())
        .filter(Boolean)
    );
  }, [stopWordsText]);

  const entries = useMemo(() => {
    if (activeTab === "words") {
      return analyzeWords(
        input,
        caseSensitive,
        excludeStopWords,
        minCount,
        stopWordsSet
      );
    }
    const n = activeTab === "bigrams" ? 2 : 3;
    return analyzeNgrams(
      input,
      n,
      caseSensitive,
      excludeStopWords,
      minCount,
      stopWordsSet
    );
  }, [input, caseSensitive, excludeStopWords, minCount, activeTab, stopWordsSet]);

  const top20 = entries.slice(0, 20);
  const maxCount = top20.length > 0 ? top20[0].count : 1;

  const handleExportCSV = useCallback(() => {
    const csv = exportCSV(entries);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-frequency.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const handleExportJSON = useCallback(() => {
    const json = exportJSON(entries);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-frequency.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(exportCSV(entries));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [entries]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy CSV" },
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [handleCopy]));

  const tabLabel = activeTab === "words" ? "words" : "phrases";

  const inputBg = "var(--kami-input-bg, var(--kami-surface-solid))";
  const inputBorder = "1px solid var(--kami-border-strong)";
  const inputRadius = "var(--kami-input-radius, 0.75rem)";
  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const ctaStyle = {
    background: "var(--kami-cta-bg)",
    color: "var(--kami-cta-text)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  } as const;
  const ghostBtnStyle = {
    background: "var(--kami-surface-solid)",
    color: "var(--kami-text-muted)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  } as const;

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Word Frequency Counter"
          tagline="See which words, bigrams, and trigrams dominate your copy - with stop-word filtering and CSV export."
          description="Paste any text and we count how often each word (or 2-word / 3-word phrase) appears. Toggle stop-words (the, and, a…) to see what actually matters. Useful for SEO keyword density, content audits, or figuring out what a transcript is really about."
          audience={["SEOs", "Writers", "Content strategists", "Researchers"]}
          whenToUse={[
            "Auditing keyword density on a blog post",
            "Finding filler words you over-use",
            "Summarizing the themes in a transcript or review dump",
          ]}
        />

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={excludeStopWords}
              onChange={(e) => setExcludeStopWords(e.target.checked)}
              className="h-4 w-4"
              style={{ accentColor: "var(--kami-text)" }}
            />
            Exclude common words
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="h-4 w-4"
              style={{ accentColor: "var(--kami-text)" }}
            />
            Case sensitive
          </label>
          <label className="flex items-center gap-2 text-sm">
            Min count:
            <input
              type="number"
              min={1}
              value={minCount}
              onChange={(e) =>
                setMinCount(Math.max(1, parseInt(e.target.value) || 1))
              }
              className="w-16 px-2 py-1 text-sm focus:outline-none"
              style={{
                background: inputBg,
                color: "var(--kami-text)",
                border: inputBorder,
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
              }}
            />
          </label>
        </div>

        {/* Customizable stop words */}
        {excludeStopWords && (
          <div className="mb-4">
            <button
              onClick={() => setShowStopWords(!showStopWords)}
              className="flex items-center gap-1.5 text-sm transition-colors"
              style={{ color: "var(--kami-text-muted)" }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${showStopWords ? "rotate-90" : ""}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              Edit stop words ({stopWordsSet.size} words)
            </button>
            {showStopWords && (
              <div className="mt-2">
                <textarea
                  value={stopWordsText}
                  onChange={(e) => setStopWordsText(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{
                    background: inputBg,
                    color: "var(--kami-text-muted)",
                    border: inputBorder,
                    borderRadius: "var(--kami-input-radius, 0.5rem)",
                    boxShadow: "var(--kami-card-shadow, none)",
                  }}
                  rows={4}
                  placeholder="Enter comma-separated stop words..."
                />
                <button
                  onClick={() =>
                    setStopWordsText(DEFAULT_STOP_WORDS.join(", "))
                  }
                  className="mt-1 text-xs transition-colors"
                  style={{ color: "var(--kami-text-dim)" }}
                >
                  Reset to default
                </button>
              </div>
            )}
          </div>
        )}

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your text here..."
          className="w-full px-4 py-3 text-base focus:outline-none"
          style={{
            background: inputBg,
            color: "var(--kami-text)",
            border: inputBorder,
            borderRadius: inputRadius,
            boxShadow: "var(--kami-card-shadow, none)",
          }}
          rows={6}
          autoFocus
        />

        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
          <span>
            {entries.length} unique {entries.length === 1 ? tabLabel.replace(/s$/, "") : tabLabel}
            {" "}found
          </span>
          {input && (
            <button onClick={() => setInput("")}>
              Clear
            </button>
          )}
        </div>

        {/* N-gram tabs */}
        <div
          className="mt-6 flex gap-1 p-1"
          style={{
            background: "var(--kami-surface)",
            borderRadius: "var(--kami-cta-radius, 0.5rem)",
            border: "1px solid var(--kami-border)",
          }}
        >
          {([
            { key: "words" as NgramTab, label: "Words" },
            { key: "bigrams" as NgramTab, label: "2-word phrases" },
            { key: "trigrams" as NgramTab, label: "3-word phrases" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 px-3 py-1.5 text-sm font-medium transition-colors"
              style={
                activeTab === tab.key
                  ? {
                      background: "var(--kami-surface-solid)",
                      color: "var(--kami-text)",
                      borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      boxShadow: "var(--kami-card-shadow, none)",
                    }
                  : {
                      color: "var(--kami-text-muted)",
                      borderRadius: "var(--kami-cta-radius, 0.375rem)",
                    }
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results */}
        {entries.length > 0 && (
          <div className="mt-6">
            {/* Bar chart of top 20 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                  Top {Math.min(20, entries.length)} {tabLabel}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
                    style={ghostBtnStyle}
                  >
                    {copied ? "Copied!" : "Copy CSV"}
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
                    style={ghostBtnStyle}
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
                    style={ctaStyle}
                  >
                    Export JSON
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {top20.map((e) => (
                  <div key={e.word} className="flex items-center gap-3 text-sm">
                    <span className="w-28 truncate text-right font-mono" style={{ color: "var(--kami-text-muted)" }}>
                      {e.word}
                    </span>
                    <div
                      className="flex-1 h-5 overflow-hidden"
                      style={{
                        background: "var(--kami-surface)",
                        borderRadius: "var(--kami-cta-radius, 0.25rem)",
                      }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${(e.count / maxCount) * 100}%`,
                          background: "var(--kami-text-muted)",
                          borderRadius: "var(--kami-cta-radius, 0.25rem)",
                        }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono" style={{ color: "var(--kami-text-muted)" }}>
                      {e.count}
                    </span>
                    <span className="w-14 text-right text-xs" style={{ color: "var(--kami-text-dim)" }}>
                      {e.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full table */}
            <div className="overflow-hidden" style={cardStyle}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--kami-border)" }}>
                    <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>
                      {activeTab === "words" ? "Word" : "Phrase"}
                    </th>
                    <th className="px-4 py-2 text-right font-medium" style={{ color: "var(--kami-text-muted)" }}>
                      Count
                    </th>
                    <th className="px-4 py-2 text-right font-medium" style={{ color: "var(--kami-text-muted)" }}>
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.word}
                      style={{ borderBottom: "1px solid var(--kami-border)" }}
                    >
                      <td className="px-4 py-2 font-mono">{e.word}</td>
                      <td className="px-4 py-2 text-right font-mono" style={{ color: "var(--kami-text-muted)" }}>
                        {e.count}
                      </td>
                      <td className="px-4 py-2 text-right" style={{ color: "var(--kami-text-muted)" }}>
                        {e.pct.toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
      </div>
    </div>
  );
}
