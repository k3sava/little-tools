"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

const ACCENT_SEO = "#3b82f6";

// --- Stop words ---

const STOP_WORDS = new Set([
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
]);

// --- Helper functions ---

function stripHtml(html: string): string {
  // Decode common HTML entities
  const text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
  return text;
}

function containsHtml(text: string): boolean {
  return /<[a-z][\s\S]*>/i.test(text);
}

interface HeadingEntry {
  level: number;
  text: string;
}

function extractHeadings(input: string): HeadingEntry[] {
  if (containsHtml(input)) {
    const headings: HeadingEntry[] = [];
    const regex = /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match;
    while ((match = regex.exec(input)) !== null) {
      headings.push({
        level: parseInt(match[1]),
        text: match[2].replace(/<[^>]*>/g, "").trim(),
      });
    }
    return headings;
  }

  // Plain text heuristic: short lines without ending period, possibly uppercase
  const lines = input.split("\n");
  const headings: HeadingEntry[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.length > 80) continue;
    if (trimmed.endsWith(".") || trimmed.endsWith(",")) continue;
    const words = trimmed.split(/\s+/);
    if (words.length > 12) continue;

    // All caps = H1-like, Title Case = H2-like, otherwise H3-like
    if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      headings.push({ level: 1, text: trimmed });
    } else if (
      words.length >= 2 &&
      words.every((w) => /^[A-Z0-9]/.test(w) || STOP_WORDS.has(w.toLowerCase()))
    ) {
      headings.push({ level: 2, text: trimmed });
    }
  }
  return headings;
}

function syllableCount(word: string): number {
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

function calculateFleschScore(
  wordCount: number,
  sentenceCount: number,
  totalSyllables: number
): number {
  if (wordCount === 0 || sentenceCount === 0) return 0;
  const score =
    206.835 -
    1.015 * (wordCount / sentenceCount) -
    84.6 * (totalSyllables / wordCount);
  return Math.max(0, Math.min(100, Math.round(score * 10) / 10));
}

// --- Analysis types ---

interface ContentStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgSentenceLength: number;
  avgWordLength: number;
  readingTimeMin: number;
}

interface KeywordAnalysis {
  keywordCount: number;
  keywordDensity: number;
  inFirst100Words: boolean;
  topPhrases: { phrase: string; count: number }[];
}

interface HeadingAnalysis {
  headings: HeadingEntry[];
  hasH1: boolean;
  singleH1: boolean;
  logicalOrder: boolean;
}

interface ReadabilityAnalysis {
  fleschScore: number;
  gradeLevel: string;
  sentenceDistribution: {
    short: number;
    medium: number;
    long: number;
    veryLong: number;
  };
}

interface Recommendation {
  text: string;
  passing: boolean;
}

interface FullAnalysis {
  score: number;
  stats: ContentStats;
  keyword: KeywordAnalysis | null;
  headings: HeadingAnalysis;
  readability: ReadabilityAnalysis;
  recommendations: Recommendation[];
}

// --- Analysis engine ---

function analyze(rawInput: string, targetKeyword: string): FullAnalysis | null {
  const isHtml = containsHtml(rawInput);
  const plainText = isHtml ? stripHtml(rawInput) : rawInput;
  const trimmed = plainText.trim();

  if (!trimmed) return null;

  // Words
  const words = trimmed.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // Sentences
  const sentences = trimmed
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sentenceCount = Math.max(sentences.length, 1);

  // Paragraphs
  const paragraphs = trimmed
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);
  const paragraphCount = Math.max(paragraphs.length, 1);

  // Averages
  const avgSentenceLength =
    Math.round((wordCount / sentenceCount) * 10) / 10;
  const totalCharLen = words.reduce((sum, w) => sum + w.replace(/[^a-zA-Z0-9]/g, "").length, 0);
  const avgWordLength =
    wordCount > 0
      ? Math.round((totalCharLen / wordCount) * 10) / 10
      : 0;

  const readingTimeMin = wordCount / 238;

  const stats: ContentStats = {
    wordCount,
    sentenceCount,
    paragraphCount,
    avgSentenceLength,
    avgWordLength,
    readingTimeMin,
  };

  // Keyword analysis
  let keyword: KeywordAnalysis | null = null;
  const kw = targetKeyword.trim().toLowerCase();
  if (kw) {
    const lowerText = plainText.toLowerCase();
    const lowerWords = words.map((w) => w.toLowerCase());

    // Count occurrences
    let keywordCount = 0;
    const kwWords = kw.split(/\s+/);
    if (kwWords.length === 1) {
      keywordCount = lowerWords.filter(
        (w) => w.replace(/[^a-z0-9]/g, "") === kw.replace(/[^a-z0-9]/g, "")
      ).length;
    } else {
      // Multi-word keyword: count substring occurrences
      let idx = 0;
      while (true) {
        const found = lowerText.indexOf(kw, idx);
        if (found === -1) break;
        keywordCount++;
        idx = found + 1;
      }
    }

    const kwWordCount = kw.split(/\s+/).length;
    const keywordDensity =
      wordCount > 0
        ? Math.round(((keywordCount * kwWordCount) / wordCount) * 1000) / 10
        : 0;

    // In first 100 words?
    const first100 = lowerWords.slice(0, 100).join(" ");
    const inFirst100Words = first100.includes(kw);

    // Top two-word phrases (excluding stop words)
    const topPhrases: { phrase: string; count: number }[] = [];
    if (lowerWords.length >= 2) {
      const phraseFreq = new Map<string, number>();
      for (let i = 0; i < lowerWords.length - 1; i++) {
        const w1 = lowerWords[i].replace(/[^a-z0-9'-]/g, "");
        const w2 = lowerWords[i + 1].replace(/[^a-z0-9'-]/g, "");
        if (!w1 || !w2) continue;
        if (STOP_WORDS.has(w1) || STOP_WORDS.has(w2)) continue;
        const phrase = `${w1} ${w2}`;
        phraseFreq.set(phrase, (phraseFreq.get(phrase) || 0) + 1);
      }
      const sorted = Array.from(phraseFreq.entries())
        .filter(([, c]) => c > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      for (const [phrase, count] of sorted) {
        topPhrases.push({ phrase, count });
      }
    }

    keyword = { keywordCount, keywordDensity, inFirst100Words, topPhrases };
  }

  // Headings
  const headingEntries = extractHeadings(rawInput);
  const hasH1 = headingEntries.some((h) => h.level === 1);
  const singleH1 =
    headingEntries.filter((h) => h.level === 1).length === 1;

  let logicalOrder = true;
  for (let i = 1; i < headingEntries.length; i++) {
    if (headingEntries[i].level > headingEntries[i - 1].level + 1) {
      logicalOrder = false;
      break;
    }
  }

  const headings: HeadingAnalysis = {
    headings: headingEntries,
    hasH1,
    singleH1,
    logicalOrder,
  };

  // Readability
  const totalSyllables = words.reduce(
    (sum, w) => sum + syllableCount(w),
    0
  );
  const fleschScore = calculateFleschScore(
    wordCount,
    sentenceCount,
    totalSyllables
  );

  let gradeLevel: string;
  if (fleschScore >= 90) gradeLevel = "Grade 5 -- Very easy to read";
  else if (fleschScore >= 80) gradeLevel = "Grade 6 -- Easy to read";
  else if (fleschScore >= 70) gradeLevel = "Grade 7 -- Fairly easy";
  else if (fleschScore >= 60) gradeLevel = "Grade 8-9 -- Standard";
  else if (fleschScore >= 50) gradeLevel = "Grade 10-12 -- Fairly difficult";
  else if (fleschScore >= 30) gradeLevel = "College -- Difficult";
  else gradeLevel = "Graduate -- Very difficult";

  const sentenceLengths = sentences.map(
    (s) => s.split(/\s+/).filter(Boolean).length
  );
  const sentenceDistribution = {
    short: sentenceLengths.filter((l) => l < 10).length,
    medium: sentenceLengths.filter((l) => l >= 10 && l <= 20).length,
    long: sentenceLengths.filter((l) => l > 20 && l <= 30).length,
    veryLong: sentenceLengths.filter((l) => l > 30).length,
  };

  const readability: ReadabilityAnalysis = {
    fleschScore,
    gradeLevel,
    sentenceDistribution,
  };

  // Recommendations
  const recommendations: Recommendation[] = [];

  // Content length
  if (wordCount < 300) {
    recommendations.push({
      text: `Add more content -- your article is only ${wordCount} words. Aim for at least 600 words.`,
      passing: false,
    });
  } else if (wordCount < 600) {
    recommendations.push({
      text: `Content length is thin at ${wordCount} words. Consider expanding to 1000+ for better SEO.`,
      passing: false,
    });
  } else if (wordCount >= 1000) {
    recommendations.push({
      text: `Good content length at ${wordCount} words.`,
      passing: true,
    });
  } else {
    recommendations.push({
      text: `Acceptable content length at ${wordCount} words. 1000+ is ideal.`,
      passing: true,
    });
  }

  // Keyword checks
  if (keyword) {
    if (keyword.keywordDensity < 1) {
      recommendations.push({
        text: `Keyword density is too low (${keyword.keywordDensity}%). Use your target keyword more (aim for 1-3%).`,
        passing: false,
      });
    } else if (keyword.keywordDensity > 3) {
      recommendations.push({
        text: `Keyword density is too high (${keyword.keywordDensity}%). This may appear as keyword stuffing. Aim for 1-3%.`,
        passing: false,
      });
    } else {
      recommendations.push({
        text: `Keyword density is good at ${keyword.keywordDensity}%.`,
        passing: true,
      });
    }

    if (!keyword.inFirst100Words) {
      recommendations.push({
        text: "Include your target keyword in the first 100 words of your content.",
        passing: false,
      });
    } else {
      recommendations.push({
        text: "Target keyword appears in the first 100 words.",
        passing: true,
      });
    }
  }

  // Headings
  if (headingEntries.length === 0) {
    recommendations.push({
      text: "Add headings to structure your content. Use H1 for the main title and H2/H3 for sections.",
      passing: false,
    });
  } else {
    if (!hasH1) {
      recommendations.push({
        text: "Add an H1 heading. Every page should have exactly one H1.",
        passing: false,
      });
    } else if (!singleH1) {
      recommendations.push({
        text: "Multiple H1 headings detected. Use only one H1 per page.",
        passing: false,
      });
    } else {
      recommendations.push({ text: "Heading structure has a single H1.", passing: true });
    }

    if (!logicalOrder) {
      recommendations.push({
        text: "Headings skip levels (e.g., H1 to H3). Use a logical hierarchy.",
        passing: false,
      });
    } else if (headingEntries.length > 1) {
      recommendations.push({ text: "Heading hierarchy is logical.", passing: true });
    }
  }

  // Sentence length
  if (sentenceDistribution.veryLong > 0) {
    recommendations.push({
      text: `Break up long sentences -- ${sentenceDistribution.veryLong} sentence${sentenceDistribution.veryLong > 1 ? "s are" : " is"} over 30 words.`,
      passing: false,
    });
  } else {
    recommendations.push({
      text: "No overly long sentences detected.",
      passing: true,
    });
  }

  if (avgSentenceLength > 20) {
    recommendations.push({
      text: `Average sentence length is ${avgSentenceLength} words. Aim for 15-20 for better readability.`,
      passing: false,
    });
  } else if (avgSentenceLength >= 15) {
    recommendations.push({
      text: `Average sentence length is ${avgSentenceLength} words -- good range.`,
      passing: true,
    });
  }

  // Readability
  if (fleschScore < 40) {
    recommendations.push({
      text: `Readability score is low (${fleschScore}). Simplify language and shorten sentences.`,
      passing: false,
    });
  } else if (fleschScore >= 60) {
    recommendations.push({
      text: `Readability score is good (${fleschScore}).`,
      passing: true,
    });
  }

  // Paragraphs
  if (paragraphCount === 1 && wordCount > 200) {
    recommendations.push({
      text: "Break your content into multiple paragraphs for better readability.",
      passing: false,
    });
  }

  // Overall SEO score (weighted)
  let scoreTotal = 0;
  let scoreWeight = 0;

  // Content length: 20%
  const lengthScore =
    wordCount >= 2000
      ? 100
      : wordCount >= 1000
      ? 80
      : wordCount >= 600
      ? 60
      : wordCount >= 300
      ? 40
      : 20;
  scoreTotal += lengthScore * 20;
  scoreWeight += 20;

  // Readability: 20%
  scoreTotal += fleschScore * 20;
  scoreWeight += 20;

  // Headings: 20%
  let headingScore = 0;
  if (headingEntries.length > 0) headingScore += 40;
  if (hasH1) headingScore += 30;
  if (singleH1) headingScore += 15;
  if (logicalOrder) headingScore += 15;
  scoreTotal += headingScore * 20;
  scoreWeight += 20;

  // Sentence structure: 15%
  const sentStructScore =
    avgSentenceLength >= 15 && avgSentenceLength <= 20
      ? 100
      : avgSentenceLength < 15
      ? 70
      : avgSentenceLength <= 25
      ? 60
      : 30;
  scoreTotal += sentStructScore * 15;
  scoreWeight += 15;

  // Keyword (if provided): 25%, else redistribute
  if (keyword) {
    let kwScore = 0;
    if (keyword.keywordDensity >= 1 && keyword.keywordDensity <= 3) kwScore += 50;
    else if (keyword.keywordDensity > 0) kwScore += 20;
    if (keyword.inFirst100Words) kwScore += 30;
    if (keyword.keywordCount > 0) kwScore += 20;
    scoreTotal += kwScore * 25;
    scoreWeight += 25;
  }

  const score = Math.round(scoreTotal / scoreWeight);

  return { score, stats, keyword, headings, readability, recommendations };
}

// --- Report generation ---

function generateReport(analysis: FullAnalysis, targetKeyword: string): string {
  const lines: string[] = [];

  lines.push("# SEO Content Analysis Report");
  lines.push("");
  lines.push(`## Overall Score: ${analysis.score}/100`);
  lines.push("");

  // Content Stats
  lines.push("## Content Stats");
  lines.push(`- Words: ${analysis.stats.wordCount.toLocaleString()}`);
  lines.push(`- Sentences: ${analysis.stats.sentenceCount}`);
  lines.push(`- Paragraphs: ${analysis.stats.paragraphCount}`);
  lines.push(`- Reading time: ~${formatTime(analysis.stats.readingTimeMin)}`);
  lines.push(`- Avg sentence length: ${analysis.stats.avgSentenceLength} words`);
  lines.push(`- Avg word length: ${analysis.stats.avgWordLength} chars`);
  lines.push("");

  // Keyword Analysis
  if (analysis.keyword) {
    const kw = analysis.keyword;
    const densityNote =
      kw.keywordDensity >= 1 && kw.keywordDensity <= 3
        ? "optimal: 1-3%"
        : kw.keywordDensity > 3
        ? "too high, aim for 1-3%"
        : "too low, aim for 1-3%";
    lines.push("## Keyword Analysis");
    lines.push(`- Target keyword: "${targetKeyword}"`);
    lines.push(`- Density: ${kw.keywordDensity}% (${densityNote})`);
    lines.push(`- Occurrences: ${kw.keywordCount}`);
    lines.push(`- In first 100 words: ${kw.inFirst100Words ? "Yes" : "No"}`);
    if (kw.topPhrases.length > 0) {
      lines.push(`- Related phrases: ${kw.topPhrases.map((p) => `${p.phrase} (${p.count})`).join(", ")}`);
    }
    lines.push("");
  }

  // Heading Structure
  lines.push("## Heading Structure");
  if (analysis.headings.headings.length === 0) {
    lines.push("- No headings detected");
  } else {
    const hCounts: Record<string, number> = {};
    for (const h of analysis.headings.headings) {
      const key = `H${h.level}`;
      hCounts[key] = (hCounts[key] || 0) + 1;
    }
    for (const [tag, count] of Object.entries(hCounts)) {
      lines.push(`- ${tag}: ${count}`);
    }
    lines.push(`- Single H1: ${analysis.headings.singleH1 ? "Yes" : "No"}`);
    lines.push(`- Logical order: ${analysis.headings.logicalOrder ? "Yes" : "No"}`);
  }
  lines.push("");

  // Readability
  lines.push("## Readability");
  lines.push(`- Flesch score: ${analysis.readability.fleschScore}`);
  lines.push(`- Grade level: ${analysis.readability.gradeLevel}`);
  const dist = analysis.readability.sentenceDistribution;
  lines.push(`- Sentence distribution: ${dist.short} short, ${dist.medium} medium, ${dist.long} long, ${dist.veryLong} very long`);
  lines.push("");

  // Recommendations
  lines.push("## Recommendations");
  for (const rec of analysis.recommendations) {
    const icon = rec.passing ? "[PASS]" : "[FIX]";
    lines.push(`- ${icon} ${rec.text}`);
  }
  lines.push("");

  return lines.join("\n");
}

// --- Component ---

export default function SeoContentAnalyzerContent() {
  const [{ kw: targetKeyword }, setToolState] = useToolState({ kw: "" });
  const setKeyword = useCallback(
    (v: string) => setToolState({ kw: v }),
    [setToolState]
  );

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

  const [content, setContent] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  const analysis = useMemo(
    () => analyze(content, targetKeyword),
    [content, targetKeyword]
  );

  const handleClear = useCallback(() => {
    setContent("");
    setKeyword("");
  }, [setKeyword]);

  const handleCopyReport = useCallback(() => {
    if (!analysis) return;
    const report = generateReport(analysis, targetKeyword);
    navigator.clipboard.writeText(report).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }, [analysis, targetKeyword]);

  const handleDownloadReport = useCallback(() => {
    if (!analysis) return;
    const report = generateReport(analysis, targetKeyword);
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seo-content-analysis.md";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [analysis, targetKeyword]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "k", meta: true, action: handleClear, label: "Clear" },
        { key: "Enter", meta: true, action: handleCopyReport, label: "Copy report" },
      ],
      [handleClear, handleCopyReport]
    )
  );

  const controls = (
    <>
      <ControlGroup label="Target keyword" hint="Optional — drives density check">
        <input
          type="text"
          value={targetKeyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="e.g. SEO content strategy"
          className="w-full px-3 py-2.5 text-sm focus:outline-none"
          style={{
            background: "var(--kami-input-bg, var(--kami-surface-solid))",
            color: "var(--kami-text)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-input-radius, 0.5rem)",
          }}
        />
      </ControlGroup>
      <ControlGroup label="Quick stats">
        {analysis ? (
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--kami-text-muted)" }}>
            <div><span className="block font-semibold text-base" style={{ color: "var(--kami-text)" }}>{analysis.stats.wordCount.toLocaleString()}</span>words</div>
            <div><span className="block font-semibold text-base" style={{ color: "var(--kami-text)" }}>{analysis.stats.sentenceCount}</span>sentences</div>
            <div><span className="block font-semibold text-base" style={{ color: "var(--kami-text)" }}>{analysis.readability.fleschScore}</span>Flesch</div>
            <div><span className="block font-semibold text-base" style={{ color: "var(--kami-text)" }}>{analysis.headings.headings.length}</span>headings</div>
          </div>
        ) : (
          <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>Paste content to see stats.</p>
        )}
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleClear}>Clear</ToolActionButton>
      <ToolActionButton variant="outline" onClick={handleDownloadReport} disabled={!analysis}>
        Download .md
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopyReport} disabled={!analysis}>
        {copyFeedback ? "Copied" : "Copy report"}
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
      <p>Paste article text or HTML to score keyword density, heading structure, readability and length. Score is weighted across content length, readability, heading hierarchy, sentence structure and keyword presence.</p>
      <p><strong>Density:</strong> aim for 1–3%. <strong>H1:</strong> exactly one per page. <strong>Sentences:</strong> avg 15–20 words.</p>
    </div>
  );

  return (
    <ToolShell
      title="SEO Content Analyzer"
      tagline="Score · keyword density · heading outline · readability · recommendations"
      accent={ACCENT_SEO}
      actions={actions}
      controls={controls}
      info={info}
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Input</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Analysis</button>
        </nav>
      )}
      <div className="flex flex-col gap-5 p-4 md:p-6">
        {(!isMetro || metroCPivot === "input") && (
          <>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your article content here (plain text or HTML)..."
              className="w-full px-4 py-3 text-base focus:outline-none"
              style={{
                background: "var(--kami-input-bg, var(--kami-surface-solid))",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.75rem)",
                minHeight: 220,
              }}
            />
          </>
        )}

        {(!isMetro || metroCPivot === "output") && analysis && (
          <>
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <ScoreBadge score={analysis.score} />
                <ScoreBreakdown analysis={analysis} />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Content Stats */}
                <Card title="Content Stats" icon={<StatsIcon />}>
                  <div className="grid grid-cols-2 gap-3">
                    <StatItem
                      label="Word Count"
                      value={analysis.stats.wordCount.toLocaleString()}
                      note={
                        analysis.stats.wordCount >= 2000
                          ? "Excellent"
                          : analysis.stats.wordCount >= 1000
                          ? "Good"
                          : analysis.stats.wordCount >= 600
                          ? "OK"
                          : "Thin"
                      }
                      noteColor={
                        analysis.stats.wordCount >= 1000
                          ? "text-green-600"
                          : analysis.stats.wordCount >= 600
                          ? "text-yellow-600"
                          : "text-red-600"
                      }
                    />
                    <StatItem
                      label="Sentences"
                      value={analysis.stats.sentenceCount.toString()}
                    />
                    <StatItem
                      label="Paragraphs"
                      value={analysis.stats.paragraphCount.toString()}
                    />
                    <StatItem
                      label="Avg Sentence Length"
                      value={`${analysis.stats.avgSentenceLength} words`}
                      note={
                        analysis.stats.avgSentenceLength >= 15 &&
                        analysis.stats.avgSentenceLength <= 20
                          ? "Ideal"
                          : analysis.stats.avgSentenceLength > 20
                          ? "Long"
                          : "Short"
                      }
                      noteColor={
                        analysis.stats.avgSentenceLength >= 15 &&
                        analysis.stats.avgSentenceLength <= 20
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    />
                    <StatItem
                      label="Avg Word Length"
                      value={`${analysis.stats.avgWordLength} chars`}
                    />
                    <StatItem
                      label="Reading Time"
                      value={formatTime(analysis.stats.readingTimeMin)}
                    />
                  </div>
                </Card>

                {/* Keyword Analysis */}
                {analysis.keyword && (
                  <Card title="Keyword Analysis" icon={<KeywordIcon />}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <StatItem
                          label="Keyword Count"
                          value={analysis.keyword.keywordCount.toString()}
                        />
                        <StatItem
                          label="Keyword Density"
                          value={`${analysis.keyword.keywordDensity}%`}
                          note={
                            analysis.keyword.keywordDensity >= 1 &&
                            analysis.keyword.keywordDensity <= 3
                              ? "Ideal"
                              : analysis.keyword.keywordDensity > 3
                              ? "Too high"
                              : "Too low"
                          }
                          noteColor={
                            analysis.keyword.keywordDensity >= 1 &&
                            analysis.keyword.keywordDensity <= 3
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        />
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        {analysis.keyword.inFirst100Words ? (
                          <CheckCircle className="text-green-500" />
                        ) : (
                          <WarningTriangle className="text-yellow-500" />
                        )}
                        <span style={{ color: "var(--kami-text-muted)" }}>
                          Keyword in first 100 words
                        </span>
                      </div>

                      {analysis.keyword.topPhrases.length > 0 && (
                        <div>
                          <div className="text-xs font-medium mb-2" style={{ color: "var(--kami-text-muted)" }}>
                            Related 2-word phrases
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {analysis.keyword.topPhrases.map((p) => (
                              <span
                                key={p.phrase}
                                className="px-2.5 py-0.5 text-xs"
                                style={{
                                  background: "var(--kami-surface)",
                                  color: "var(--kami-text-muted)",
                                  border: "1px solid var(--kami-border)",
                                  borderRadius: "999px",
                                }}
                              >
                                {p.phrase}{" "}
                                <span style={{ color: "var(--kami-text-dim)" }}>({p.count})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Heading Structure */}
                <Card title="Heading Structure" icon={<HeadingIcon />}>
                  {analysis.headings.headings.length === 0 ? (
                    <p className="text-sm" style={{ color: "var(--kami-text-dim)" }}>
                      No headings detected. Add headings to improve content
                      structure.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Heading tree */}
                      <div className="space-y-1">
                        {analysis.headings.headings.map((h, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm"
                            style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                          >
                            <span
                              className="shrink-0 px-1.5 py-0.5 text-xs font-mono font-medium"
                              style={{
                                background: "var(--kami-surface)",
                                color: "var(--kami-text-muted)",
                                border: "1px solid var(--kami-border)",
                                borderRadius: "4px",
                              }}
                            >
                              H{h.level}
                            </span>
                            <span className="truncate" style={{ color: "var(--kami-text-muted)" }}>
                              {h.text}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Checks */}
                      <div className="space-y-1.5 pt-3" style={{ borderTop: "1px solid var(--kami-border)" }}>
                        <HeadingCheck
                          passing={analysis.headings.hasH1}
                          label="Has H1 heading"
                        />
                        <HeadingCheck
                          passing={analysis.headings.singleH1}
                          label="Only one H1"
                        />
                        <HeadingCheck
                          passing={analysis.headings.logicalOrder}
                          label="Logical heading order"
                        />
                      </div>
                    </div>
                  )}
                </Card>

                {/* Readability */}
                <Card title="Readability" icon={<ReadabilityIcon />}>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div
                          className={`text-3xl font-bold ${
                            analysis.readability.fleschScore >= 60
                              ? "text-green-600"
                              : analysis.readability.fleschScore >= 40
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        >
                          {analysis.readability.fleschScore}
                        </div>
                        <div className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                          Flesch Score
                        </div>
                      </div>
                      <div className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
                        {analysis.readability.gradeLevel}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-medium mb-2" style={{ color: "var(--kami-text-muted)" }}>
                        Sentence Length Distribution
                      </div>
                      <div className="space-y-1.5">
                        <DistBar
                          label="Short (<10)"
                          count={
                            analysis.readability.sentenceDistribution.short
                          }
                          total={analysis.stats.sentenceCount}
                          color="bg-green-400"
                        />
                        <DistBar
                          label="Medium (10-20)"
                          count={
                            analysis.readability.sentenceDistribution.medium
                          }
                          total={analysis.stats.sentenceCount}
                          color="bg-blue-400"
                        />
                        <DistBar
                          label="Long (20-30)"
                          count={
                            analysis.readability.sentenceDistribution.long
                          }
                          total={analysis.stats.sentenceCount}
                          color="bg-yellow-400"
                        />
                        <DistBar
                          label="Very long (>30)"
                          count={
                            analysis.readability.sentenceDistribution.veryLong
                          }
                          total={analysis.stats.sentenceCount}
                          color="bg-red-400"
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Keyword density treemap */}
              {analysis.keyword && analysis.keyword.topPhrases.length > 0 && (
                <Card title="Keyword Density Treemap" icon={<KeywordIcon />}>
                  <Treemap phrases={analysis.keyword.topPhrases} />
                </Card>
              )}

              {/* Recommendations - full width */}
              <Card title="Recommendations" icon={<RecommendationIcon />}>
                <div className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-sm">
                      {rec.passing ? (
                        <CheckCircle className="text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <WarningTriangle className="text-yellow-500 mt-0.5 shrink-0" />
                      )}
                      <span style={{ color: "var(--kami-text-muted)" }}>{rec.text}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </ToolShell>
  );
}

// --- Treemap visualization ---
function Treemap({ phrases }: { phrases: { phrase: string; count: number }[] }) {
  const max = Math.max(...phrases.map((p) => p.count));
  return (
    <div className="flex flex-wrap gap-2">
      {phrases.map((p) => {
        const scale = 0.6 + (p.count / max) * 0.6;
        return (
          <span
            key={p.phrase}
            className="px-3 py-1.5 rounded-lg font-medium tabular-nums"
            style={{
              background: `color-mix(in srgb, ${ACCENT_SEO} ${20 + scale * 30}%, var(--kami-surface))`,
              color: "var(--kami-text)",
              fontSize: `${0.75 + scale * 0.4}rem`,
              border: "1px solid var(--kami-border)",
            }}
          >
            {p.phrase} <span style={{ opacity: 0.6 }}>×{p.count}</span>
          </span>
        );
      })}
    </div>
  );
}

// --- Score breakdown bars ---
function ScoreBreakdown({ analysis }: { analysis: FullAnalysis }) {
  const items = [
    { label: "Length", value: Math.min(100, (analysis.stats.wordCount / 1000) * 100) },
    { label: "Readability", value: analysis.readability.fleschScore },
    { label: "Headings", value: (analysis.headings.hasH1 ? 50 : 0) + (analysis.headings.singleH1 ? 25 : 0) + (analysis.headings.logicalOrder ? 25 : 0) },
    { label: "Sentence", value: analysis.stats.avgSentenceLength >= 15 && analysis.stats.avgSentenceLength <= 20 ? 100 : 60 },
  ];
  return (
    <div className="w-full max-w-md grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--kami-text-muted)" }}>
            <span>{it.label}</span>
            <span className="tabular-nums">{Math.round(it.value)}</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--kami-border)" }}>
            <div style={{ width: `${Math.min(100, it.value)}%`, height: "100%", background: ACCENT_SEO }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- UI helpers ---

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

function ScoreBadge({ score }: { score: number }) {
  const color =
    score > 70
      ? "text-green-600 border-green-200 bg-green-50"
      : score >= 40
      ? "text-yellow-600 border-yellow-200 bg-yellow-50"
      : "text-red-600 border-red-200 bg-red-50";

  const ringColor =
    score > 70
      ? "stroke-green-500"
      : score >= 40
      ? "stroke-yellow-500"
      : "stroke-red-500";

  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className={`relative flex h-36 w-36 items-center justify-center rounded-full border-2 ${color}`}
    >
      <svg
        className="absolute inset-0"
        width="144"
        height="144"
        viewBox="0 0 120 120"
      >
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          className="text-gray-100"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          className={ringColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="relative text-center">
        <div className="text-4xl font-bold">{score}</div>
        <div className="text-xs font-medium opacity-70">SEO Score</div>
      </div>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--kami-surface-solid)",
        border: "1px solid var(--kami-border-strong)",
        borderRadius: "var(--kami-card-radius, 0.75rem)",
        boxShadow: "var(--kami-card-shadow, none)",
      }}
    >
      <div
        className="flex items-center gap-2.5 px-5 py-3.5"
        style={{ borderBottom: "1px solid var(--kami-border)" }}
      >
        {icon}
        <span className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>{title}</span>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function StatItem({
  label,
  value,
  note,
  noteColor,
}: {
  label: string;
  value: string;
  note?: string;
  noteColor?: string;
}) {
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
      {note && (
        <div
          className={`text-xs mt-0.5 ${noteColor || ""}`}
          style={!noteColor ? { color: "var(--kami-text-dim)" } : undefined}
        >
          {note}
        </div>
      )}
    </div>
  );
}

function HeadingCheck({
  passing,
  label,
}: {
  passing: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {passing ? (
        <CheckCircle className="text-green-500" />
      ) : (
        <WarningTriangle className="text-yellow-500" />
      )}
      <span style={{ color: "var(--kami-text-muted)" }}>{label}</span>
    </div>
  );
}

function DistBar({
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
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-28 shrink-0 text-xs" style={{ color: "var(--kami-text-muted)" }}>{label}</span>
      <div
        className="flex-1 h-2 overflow-hidden"
        style={{
          background: "var(--kami-surface)",
          border: "1px solid var(--kami-border)",
          borderRadius: "999px",
        }}
      >
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs tabular-nums" style={{ color: "var(--kami-text-muted)" }}>
        {count}
      </span>
    </div>
  );
}

// --- Inline SVG icons ---

function StatsIcon() {
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
      style={{ color: "var(--kami-text-dim)" }}
    >
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function KeywordIcon() {
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
      style={{ color: "var(--kami-text-dim)" }}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function HeadingIcon() {
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
      style={{ color: "var(--kami-text-dim)" }}
    >
      <path d="M4 12h8" />
      <path d="M4 18V6" />
      <path d="M12 18V6" />
      <path d="M17 10l3 3-3 3" />
    </svg>
  );
}

function ReadabilityIcon() {
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
      style={{ color: "var(--kami-text-dim)" }}
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function RecommendationIcon() {
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
      style={{ color: "var(--kami-text-dim)" }}
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function CheckCircle({ className }: { className?: string }) {
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
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function WarningTriangle({ className }: { className?: string }) {
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
      className={className}
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

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
      style={{ color: "var(--kami-text-dim)" }}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function DownloadIcon() {
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
      style={{ color: "var(--kami-text-dim)" }}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
