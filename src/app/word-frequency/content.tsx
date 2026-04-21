"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Word Frequency Counter
          </h1>
          <p className="mt-2 text-gray-500">
            Paste text to see word frequency analysis. No ads, no tracking.
          </p>
        </div>

        {/* Controls */}
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={excludeStopWords}
              onChange={(e) => setExcludeStopWords(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-200"
            />
            Exclude common words
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-200"
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
              className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </label>
        </div>

        {/* Customizable stop words */}
        {excludeStopWords && (
          <div className="mb-4">
            <button
              onClick={() => setShowStopWords(!showStopWords)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-600 shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  rows={4}
                  placeholder="Enter comma-separated stop words..."
                />
                <button
                  onClick={() =>
                    setStopWordsText(DEFAULT_STOP_WORDS.join(", "))
                  }
                  className="mt-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
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
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
          rows={6}
          autoFocus
        />

        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
          <span>
            {entries.length} unique {entries.length === 1 ? tabLabel.replace(/s$/, "") : tabLabel}
            {" "}found
          </span>
          {input && (
            <button
              onClick={() => setInput("")}
              className="text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* N-gram tabs */}
        <div className="mt-6 flex gap-1 rounded-lg bg-gray-100 p-1">
          {([
            { key: "words" as NgramTab, label: "Words" },
            { key: "bigrams" as NgramTab, label: "2-word phrases" },
            { key: "trigrams" as NgramTab, label: "3-word phrases" },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
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
                <span className="text-sm font-medium text-gray-500">
                  Top {Math.min(20, entries.length)} {tabLabel}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    {copied ? "Copied!" : "Copy CSV"}
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Export CSV
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                  >
                    Export JSON
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {top20.map((e) => (
                  <div key={e.word} className="flex items-center gap-3 text-sm">
                    <span className="w-28 truncate text-right font-mono text-gray-600">
                      {e.word}
                    </span>
                    <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-gray-700 rounded transition-all"
                        style={{
                          width: `${(e.count / maxCount) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-gray-500">
                      {e.count}
                    </span>
                    <span className="w-14 text-right text-xs text-gray-400">
                      {e.pct.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Full table */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 ">
                    <th className="px-4 py-2 text-left font-medium text-gray-500">
                      {activeTab === "words" ? "Word" : "Phrase"}
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Count
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-gray-500">
                      Percentage
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr
                      key={e.word}
                      className="border-b border-gray-50 last:border-0"
                    >
                      <td className="px-4 py-2 font-mono">{e.word}</td>
                      <td className="px-4 py-2 text-right font-mono text-gray-600">
                        {e.count}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500">
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
