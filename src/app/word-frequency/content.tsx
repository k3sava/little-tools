"use client";

import { useState, useCallback, useMemo } from "react";
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
  Select,
} from "@/components/tools/controls";

// Common English stop words
const STOPWORDS_EN = [
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

const STOPWORDS_ES = [
  "el", "la", "los", "las", "un", "una", "unos", "unas", "y", "o",
  "pero", "en", "a", "de", "del", "por", "para", "con", "sin", "es",
  "son", "fue", "fueron", "ser", "estar", "está", "están", "tener",
  "haber", "no", "si", "que", "como", "más", "muy", "ya", "yo", "tú",
  "él", "ella", "nosotros", "vosotros", "ellos", "ellas", "mi", "tu", "su",
];

const STOPWORDS_FR = [
  "le", "la", "les", "un", "une", "des", "et", "ou", "mais", "donc",
  "or", "ni", "car", "à", "de", "du", "en", "dans", "par", "pour",
  "sans", "sur", "sous", "est", "sont", "était", "être", "avoir", "ne",
  "pas", "que", "qui", "quoi", "comme", "plus", "moins", "très", "je",
  "tu", "il", "elle", "nous", "vous", "ils", "elles", "mon", "ton", "son",
];

const STOPWORD_LISTS: Record<string, string[]> = {
  en: STOPWORDS_EN,
  es: STOPWORDS_ES,
  fr: STOPWORDS_FR,
};

type WordEntry = { word: string; count: number; pct: number };
type NgramTab = "words" | "bigrams" | "trigrams";

function analyzeWords(
  text: string,
  caseSensitive: boolean,
  excludeStopWords: boolean,
  minCount: number,
  minLength: number,
  stopWords: Set<string>
): WordEntry[] {
  if (!text.trim()) return [];
  const words = text.match(/[\w']+/g);
  if (!words) return [];
  const freq = new Map<string, number>();
  for (const raw of words) {
    const w = caseSensitive ? raw : raw.toLowerCase();
    if (w.length < minLength) continue;
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
  const freq = new Map<string, number>();
  for (let i = 0; i <= words.length - n; i++) {
    const gram = words.slice(i, i + n);
    if (excludeStopWords && gram.some((w) => stopWords.has(w.toLowerCase()))) continue;
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
  const [minLength, setMinLength] = useState(1);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<NgramTab>("words");
  const [stopWordLang, setStopWordLang] = useState<string>("en");
  const [search, setSearch] = useState("");

  const stopWordsSet = useMemo(() => {
    return new Set((STOPWORD_LISTS[stopWordLang] ?? STOPWORDS_EN).map((w) => w.toLowerCase()));
  }, [stopWordLang]);

  const entries = useMemo(() => {
    if (activeTab === "words") {
      return analyzeWords(input, caseSensitive, excludeStopWords, minCount, minLength, stopWordsSet);
    }
    const n = activeTab === "bigrams" ? 2 : 3;
    return analyzeNgrams(input, n, caseSensitive, excludeStopWords, minCount, stopWordsSet);
  }, [input, caseSensitive, excludeStopWords, minCount, minLength, activeTab, stopWordsSet]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.word.toLowerCase().includes(q));
  }, [entries, search]);

  const top20 = filteredEntries.slice(0, 20);
  const maxCount = top20.length > 0 ? top20[0].count : 1;

  const handleExportCSV = useCallback(() => {
    const csv = exportCSV(filteredEntries);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-frequency.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEntries]);

  const handleExportJSON = useCallback(() => {
    const json = exportJSON(filteredEntries);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "word-frequency.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredEntries]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(exportCSV(filteredEntries));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [filteredEntries]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy CSV" },
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [handleCopy, setInput]));

  const tabLabel = activeTab === "words" ? "words" : "phrases";

  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;

  const controls = (
    <>
      <ControlGroup label="Counting">
        <Segment
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "words", label: "Words" },
            { value: "bigrams", label: "2-grams" },
            { value: "trigrams", label: "3-grams" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Filters">
        <Toggle checked={excludeStopWords} onChange={setExcludeStopWords} label="Exclude stopwords" />
        <Toggle checked={caseSensitive} onChange={setCaseSensitive} label="Case sensitive" />
        <NumberStepper
          value={minCount}
          onChange={(n) => setMinCount(Math.max(1, n))}
          min={1}
          label="Min count"
        />
        {activeTab === "words" && (
          <NumberStepper
            value={minLength}
            onChange={(n) => setMinLength(Math.max(1, n))}
            min={1}
            label="Min length"
            unit="chars"
          />
        )}
      </ControlGroup>
      {excludeStopWords && (
        <ControlGroup label="Stopword list">
          <Select
            value={stopWordLang}
            onChange={setStopWordLang}
            options={[
              { value: "en", label: `English (${STOPWORDS_EN.length})` },
              { value: "es", label: `Español (${STOPWORDS_ES.length})` },
              { value: "fr", label: `Français (${STOPWORDS_FR.length})` },
            ]}
          />
        </ControlGroup>
      )}
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleExportCSV} disabled={!filteredEntries.length}>
        CSV
      </ToolActionButton>
      <ToolActionButton variant="outline" onClick={handleExportJSON} disabled={!filteredEntries.length}>
        JSON
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy} disabled={!filteredEntries.length}>
        {copied ? "Copied" : "Copy CSV"}
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Word Frequency"
      tagline="Words · bigrams · trigrams · stopword filter · CSV/JSON export"
      accent="#6366f1"
      actions={actions}
      controls={controls}
    >
      <div className="flex flex-col gap-3 p-4 md:p-6">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your text here..."
          className="w-full px-4 py-3 text-base focus:outline-none"
          style={{ ...inputStyle, minHeight: 140 }}
          rows={6}
          autoFocus
        />

        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--kami-text-dim)" }}
        >
          <span>
            {entries.length} unique {tabLabel}
          </span>
          {input && (
            <button onClick={() => setInput("")} style={{ color: "var(--kami-text-dim)" }}>
              Clear
            </button>
          )}
        </div>

        {/* Search within results */}
        {entries.length > 0 && (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Filter ${tabLabel} (e.g. "ing")`}
            className="w-full px-3 py-2 text-sm focus:outline-none"
            style={inputStyle}
          />
        )}

        {/* Bar chart of top 20 */}
        {filteredEntries.length > 0 && (
          <div
            className="px-4 py-4"
            style={cardStyle}
          >
            <div className="text-xs font-medium mb-3" style={{ color: "var(--kami-text-muted)" }}>
              Top {Math.min(20, filteredEntries.length)} {tabLabel}
            </div>
            <div className="space-y-1.5">
              {top20.map((e) => (
                <div key={e.word} className="grid grid-cols-[minmax(80px,auto)_1fr_auto_auto] items-center gap-2 text-sm">
                  <span className="truncate text-right font-mono" style={{ color: "var(--kami-text-muted)" }}>
                    {e.word}
                  </span>
                  <div
                    className="h-4 overflow-hidden"
                    style={{ background: "var(--kami-surface)", borderRadius: 4 }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${(e.count / maxCount) * 100}%`,
                        background: "#6366f1",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono tabular-nums" style={{ color: "var(--kami-text-muted)" }}>
                    {e.count}
                  </span>
                  <span className="w-12 text-right text-xs tabular-nums" style={{ color: "var(--kami-text-dim)" }}>
                    {e.pct.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Full table */}
        {filteredEntries.length > 0 && (
          <div className="overflow-auto max-h-96" style={cardStyle}>
            <table className="w-full text-sm">
              <thead className="sticky top-0" style={{ background: "var(--kami-surface-solid)" }}>
                <tr style={{ borderBottom: "1px solid var(--kami-border)" }}>
                  <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>
                    {activeTab === "words" ? "Word" : "Phrase"}
                  </th>
                  <th className="px-4 py-2 text-right font-medium" style={{ color: "var(--kami-text-muted)" }}>
                    Count
                  </th>
                  <th className="px-4 py-2 text-right font-medium" style={{ color: "var(--kami-text-muted)" }}>
                    %
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((e) => (
                  <tr key={e.word} style={{ borderBottom: "1px solid var(--kami-border)" }}>
                    <td className="px-4 py-1.5 font-mono">{e.word}</td>
                    <td className="px-4 py-1.5 text-right font-mono tabular-nums" style={{ color: "var(--kami-text-muted)" }}>
                      {e.count}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums" style={{ color: "var(--kami-text-muted)" }}>
                      {e.pct.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
