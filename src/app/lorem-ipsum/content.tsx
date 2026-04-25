"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Flavor word pools ---

type Flavor =
  | "classic"
  | "hipster"
  | "office"
  | "pirate"
  | "movie"
  | "literary";

const CLASSIC_OPENER =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";

const WORD_POOLS: Record<Flavor, string[]> = {
  classic: [
    "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
    "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
    "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
    "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
    "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure",
    "in", "reprehenderit", "voluptate", "velit", "esse", "cillum", "fugiat",
    "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat",
    "non", "proident", "sunt", "culpa", "qui", "officia", "deserunt",
    "mollit", "anim", "id", "est", "laborum", "ac", "ante", "bibendum",
    "blandit", "congue", "cras", "cursus", "diam", "dictum", "dignissim",
    "donec", "dui", "efficitur", "egestas", "elementum", "etiam", "eu",
    "euismod", "facilisis", "fames", "faucibus", "felis", "fermentum",
    "feugiat", "finibus", "gravida", "habitant", "hendrerit", "iaculis",
    "imperdiet", "integer", "interdum", "justo", "lacinia", "lacus",
    "laoreet", "lectus", "leo", "libero", "ligula", "lobortis", "luctus",
    "maecenas", "massa", "mattis", "mauris", "metus", "mi", "morbi",
    "nam", "nec", "neque", "nibh", "nullam", "nunc", "odio", "orci",
    "ornare", "pellentesque", "pharetra", "placerat", "porta", "porttitor",
    "posuere", "praesent", "pretium", "proin", "pulvinar", "purus",
    "quam", "rhoncus", "risus", "rutrum", "sagittis", "sapien",
    "scelerisque", "semper", "senectus", "sodales", "sollicitudin",
    "suscipit", "suspendisse", "tellus", "tincidunt", "tortor",
    "tristique", "turpis", "ultrices", "ultricies", "urna", "varius",
    "vel", "vestibulum", "vitae", "vivamus", "viverra", "volutpat",
    "vulputate",
  ],
  hipster: [
    "artisan", "vinyl", "craft", "beard", "avocado", "toast", "brunch",
    "aesthetic", "sustainable", "kombucha", "microdose", "vegan", "organic",
    "ethical", "gastropub", "fixie", "typewriter", "skateboard", "portland",
    "brooklyn", "latte", "cold-brew", "matcha", "sourdough", "fermented",
    "kale", "quinoa", "activated", "charcoal", "turmeric", "mindful",
    "curated", "bespoke", "handcrafted", "locally-sourced", "farm-to-table",
    "slow", "minimalist", "thrifted", "upcycled", "reclaimed", "raw",
    "gluten-free", "plant-based", "foraged", "wildcrafted", "meditation",
    "crystal", "sage", "intention", "manifesting", "gratitude", "journal",
    "sunrise", "ritual", "breathwork", "cacao", "ceremony", "vinyl",
    "record", "turntable", "analog", "film", "polaroid", "darkroom",
    "gallery", "mural", "pottery", "ceramics", "woven", "macrame",
    "terrarium", "monstera", "succulent", "propagation", "cottagecore",
    "candlelight", "hygge", "cozy", "nook", "linen", "oat", "milk",
    "pour-over", "single-origin", "roastery", "barista", "loft", "studio",
  ],
  office: [
    "synergy", "leverage", "bandwidth", "pipeline", "stakeholder",
    "deliverable", "actionable", "scalable", "paradigm", "ecosystem",
    "touchpoint", "alignment", "roadmap", "milestone", "KPI", "ROI",
    "optimize", "streamline", "innovate", "disrupt", "pivot", "iterate",
    "onboard", "offboard", "circle-back", "deep-dive", "drill-down",
    "holistic", "proactive", "granular", "robust", "agile", "lean",
    "sprint", "standup", "retro", "backlog", "blocker", "velocity",
    "capacity", "utilization", "forecast", "benchmark", "baseline",
    "takeaway", "north-star", "low-hanging-fruit", "quick-win", "boil-the-ocean",
    "move-the-needle", "value-add", "net-net", "core-competency",
    "best-practice", "thought-leader", "pain-point", "workflow",
    "cross-functional", "silo", "empower", "incentivize", "monetize",
    "operationalize", "productize", "sunset", "greenfield", "brownfield",
    "whitespace", "blue-sky", "ideation", "brainstorm", "workshop",
    "offsite", "cadence", "sync", "async", "visibility", "transparency",
    "accountability", "ownership", "champion", "initiative", "transformation",
    "digital", "strategy", "execution", "traction", "momentum",
    "engagement", "retention", "acquisition", "conversion", "funnel",
  ],
  pirate: [
    "ahoy", "matey", "plunder", "treasure", "doubloon", "cannon",
    "buccaneer", "corsair", "privateer", "scallywag", "scurvy",
    "landlubber", "seadog", "barnacle", "anchor", "helm", "mast",
    "rigging", "plank", "gangway", "portside", "starboard", "bow",
    "stern", "galley", "brig", "crow's-nest", "jolly-roger", "cutlass",
    "saber", "musket", "broadside", "grog", "rum", "tankard", "barrel",
    "bounty", "loot", "booty", "pillage", "raid", "maroon", "shipwreck",
    "kraken", "leviathan", "siren", "mermaid", "whirlpool", "typhoon",
    "squall", "horizon", "compass", "spyglass", "chart", "voyage",
    "expedition", "mutiny", "parley", "surrender", "swashbuckle",
    "seafaring", "tide", "current", "windward", "leeward", "deckhand",
    "quartermaster", "captain", "first-mate", "bosun", "navigator",
    "lookout", "stowaway", "castaway", "marooned", "isle", "cove",
    "lagoon", "reef", "shoal", "harbor", "dock", "wharf", "tavern",
    "galleon", "frigate", "sloop", "brigantine", "schooner", "flagship",
  ],
  movie: [
    "frankly", "tomorrow", "force", "destiny", "adventure", "galaxy",
    "rebellion", "empire", "heist", "undercover", "detective", "villain",
    "hero", "quest", "prophecy", "chosen", "matrix", "simulation",
    "dream", "inception", "reality", "illusion", "redemption", "sacrifice",
    "betrayal", "alliance", "kingdom", "throne", "dragon", "fellowship",
    "journey", "artifact", "relic", "ancient", "forbidden", "haunted",
    "supernatural", "mutation", "superhero", "vigilante", "nemesis",
    "showdown", "standoff", "explosion", "chase", "escape", "helipad",
    "montage", "flashback", "plot-twist", "cliffhanger", "sequel",
    "prequel", "franchise", "blockbuster", "premiere", "credits",
    "director", "screenplay", "dialogue", "monologue", "soliloquy",
    "dramatic", "suspense", "thriller", "noir", "western", "dystopia",
    "utopia", "apocalypse", "survival", "resistance", "revolution",
    "conspiracy", "espionage", "sabotage", "deception", "revelation",
    "confrontation", "transformation", "ascension", "legacy", "legend",
    "mythology", "chronicle", "saga", "epic", "cinematic", "panoramic",
  ],
  literary: [
    "melancholy", "solitude", "ephemeral", "transcendent", "luminous",
    "verdant", "labyrinthine", "ethereal", "gossamer", "twilight",
    "reverie", "murmur", "whisper", "cascade", "silhouette", "mosaic",
    "tapestry", "cathedral", "manuscript", "parchment", "quill", "inkwell",
    "chandelier", "portico", "balustrade", "cobblestone", "lantern",
    "harbor", "constellation", "wanderer", "pilgrim", "sentinel",
    "threshold", "passage", "corridor", "chamber", "sanctuary", "refuge",
    "wilderness", "meadow", "brook", "canopy", "blossom", "petal",
    "thorn", "ember", "ashes", "phoenix", "raven", "sparrow", "falcon",
    "ivory", "crimson", "indigo", "cerulean", "amber", "obsidian",
    "velvet", "satin", "marble", "granite", "oak", "cypress", "wisteria",
    "jasmine", "lavender", "rosemary", "thyme", "saffron", "cinnamon",
    "manuscript", "prologue", "epilogue", "stanza", "sonnet", "allegory",
    "parable", "fable", "chronicle", "reminiscence", "contemplation",
    "introspection", "epiphany", "serendipity", "nostalgia", "yearning",
    "longing", "devotion", "eloquence", "resonance", "cadence",
  ],
};

const FLAVOR_OPTIONS: { value: Flavor; label: string }[] = [
  { value: "classic", label: "Classic Latin" },
  { value: "hipster", label: "Hipster" },
  { value: "office", label: "Office Jargon" },
  { value: "pirate", label: "Pirate" },
  { value: "movie", label: "Movie Quotes" },
  { value: "literary", label: "Literary" },
];

// --- Generation logic ---

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateWord(pool: string[]): string {
  return pickRandom(pool);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function generateSentence(pool: string[]): string {
  const len = 6 + Math.floor(Math.random() * 10); // 6-15 words
  const words: string[] = [];
  for (let i = 0; i < len; i++) {
    words.push(generateWord(pool));
  }
  // Add a comma after 3rd-5th word in longer sentences
  if (len > 8) {
    const commaPos = 2 + Math.floor(Math.random() * 3);
    words[commaPos] = words[commaPos] + ",";
  }
  return capitalize(words.join(" ")) + ".";
}

function generateParagraph(pool: string[]): string {
  const sentenceCount = 3 + Math.floor(Math.random() * 5); // 3-7 sentences
  const sentences: string[] = [];
  for (let i = 0; i < sentenceCount; i++) {
    sentences.push(generateSentence(pool));
  }
  return sentences.join(" ");
}

type OutputMode = "paragraphs" | "sentences" | "words";

function generate(
  mode: OutputMode,
  count: number,
  startClassic: boolean,
  flavor: Flavor
): string {
  if (count <= 0) return "";

  const pool = WORD_POOLS[flavor];

  if (mode === "words") {
    const words: string[] = [];
    for (let i = 0; i < count; i++) {
      words.push(generateWord(pool));
    }
    if (startClassic && flavor === "classic" && count >= 5) {
      const classicWords = CLASSIC_OPENER.replace(".", "")
        .toLowerCase()
        .split(/\s+/);
      const used = Math.min(classicWords.length, count);
      for (let i = 0; i < used; i++) {
        words[i] = classicWords[i];
      }
    }
    return capitalize(words.join(" ")) + ".";
  }

  if (mode === "sentences") {
    const sentences: string[] = [];
    for (let i = 0; i < count; i++) {
      sentences.push(generateSentence(pool));
    }
    if (startClassic && flavor === "classic") {
      sentences[0] = CLASSIC_OPENER;
    }
    return sentences.join(" ");
  }

  // paragraphs
  const paragraphs: string[] = [];
  for (let i = 0; i < count; i++) {
    paragraphs.push(generateParagraph(pool));
  }
  if (startClassic && flavor === "classic") {
    paragraphs[0] = CLASSIC_OPENER + " " + paragraphs[0];
  }
  return paragraphs.join("\n\n");
}

// --- HTML output ---

type HtmlTag = "none" | "p" | "li" | "h2";

function wrapHtml(text: string, tag: HtmlTag): string {
  if (tag === "none") return text;
  const paragraphs = text.split("\n\n");
  if (tag === "li") {
    const items = paragraphs.map((p) => `  <li>${p}</li>`).join("\n");
    return `<ul>\n${items}\n</ul>`;
  }
  return paragraphs.map((p) => `<${tag}>${p}</${tag}>`).join("\n");
}

// --- Content templates ---

type TemplateName = "blog" | "product" | "email";

function generateTemplate(
  template: TemplateName,
  flavor: Flavor
): string {
  const pool = WORD_POOLS[flavor];
  switch (template) {
    case "blog": {
      const title = capitalize(
        Array.from({ length: 5 }, () => generateWord(pool)).join(" ")
      );
      const paragraphs = Array.from({ length: 3 }, () =>
        generateParagraph(pool)
      );
      return `${title}\n\n${paragraphs.join("\n\n")}`;
    }
    case "product": {
      const short = generateSentence(pool) + " " + generateSentence(pool);
      const features = Array.from({ length: 4 }, () =>
        capitalize(
          Array.from({ length: 3 + Math.floor(Math.random() * 4) }, () =>
            generateWord(pool)
          ).join(" ")
        )
      );
      return `${short}\n\n${features.map((f) => `- ${f}`).join("\n")}`;
    }
    case "email": {
      const greeting = "Hello,";
      const body =
        generateParagraph(pool) + "\n\n" + generateParagraph(pool);
      const signoff = "Best regards,\n[Your Name]";
      return `${greeting}\n\n${body}\n\n${signoff}`;
    }
  }
}

// --- Limits ---

const LIMITS: Record<OutputMode, { min: number; max: number }> = {
  paragraphs: { min: 1, max: 50 },
  sentences: { min: 1, max: 500 },
  words: { min: 1, max: 5000 },
};

const DEFAULTS: Record<OutputMode, number> = {
  paragraphs: 5,
  sentences: 10,
  words: 100,
};

// --- UI ---

const MODES: { value: OutputMode; label: string }[] = [
  { value: "paragraphs", label: "Paragraphs" },
  { value: "sentences", label: "Sentences" },
  { value: "words", label: "Words" },
];

const HTML_TAGS: { value: HtmlTag; label: string }[] = [
  { value: "none", label: "Plain Text" },
  { value: "p", label: "<p>" },
  { value: "li", label: "<li>" },
  { value: "h2", label: "<h2>" },
];

const TEMPLATES: { value: TemplateName; label: string; desc: string }[] = [
  { value: "blog", label: "Blog Post", desc: "Title + 3 paragraphs" },
  {
    value: "product",
    label: "Product Description",
    desc: "Summary + features list",
  },
  { value: "email", label: "Email", desc: "Greeting + body + sign-off" },
];

export default function LoremIpsumContent() {
  const [mode, setMode] = useState<OutputMode>("paragraphs");
  const [count, setCount] = useState(5);
  const [startClassic, setStartClassic] = useState(true);
  const [seed, setSeed] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [flavor, setFlavor] = useState<Flavor>("classic");
  const [htmlTag, setHtmlTag] = useState<HtmlTag>("none");
  const [activeTemplate, setActiveTemplate] = useState<TemplateName | null>(
    null
  );
  const [mounted, setMounted] = useState(false);

  // Generate on client only to avoid hydration mismatch from Math.random()
  useEffect(() => { setMounted(true); }, []);

  const output = useMemo(() => {
    if (!mounted) return "";
    void seed; // trigger re-generation
    if (activeTemplate) {
      return generateTemplate(activeTemplate, flavor);
    }
    return generate(mode, count, startClassic, flavor);
  }, [mode, count, startClassic, seed, flavor, activeTemplate, mounted]);

  const htmlOutput = useMemo(() => {
    if (htmlTag === "none") return null;
    return wrapHtml(output, htmlTag);
  }, [output, htmlTag]);

  const wordCount = useMemo(
    () => (output ? output.trim().split(/\s+/).length : 0),
    [output]
  );
  const charCount = output.length;

  const handleModeChange = useCallback((newMode: OutputMode) => {
    setMode(newMode);
    setCount(DEFAULTS[newMode]);
    setActiveTemplate(null);
    setSeed((s) => s + 1);
  }, []);

  const handleCountChange = useCallback(
    (val: string) => {
      const num = parseInt(val, 10);
      if (!isNaN(num)) {
        const clamped = Math.max(
          LIMITS[mode].min,
          Math.min(LIMITS[mode].max, num)
        );
        setCount(clamped);
      }
    },
    [mode]
  );

  const handleGenerate = useCallback(() => {
    setActiveTemplate(null);
    setSeed((s) => s + 1);
  }, []);

  const handleTemplateClick = useCallback(
    (template: TemplateName) => {
      setActiveTemplate(template);
      setSeed((s) => s + 1);
    },
    []
  );

  const handleCopy = useCallback(async () => {
    const text = htmlTag !== "none" && htmlOutput ? htmlOutput : output;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [output, htmlOutput, htmlTag]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { handleCopy(); }, label: "Copy" },
  ], [handleCopy]));

  const handleCopyMarkdown = useCallback(async () => {
    // Ensure double newlines between paragraphs for markdown
    const mdText = output.replace(/\n{1,}/g, "\n\n");
    await navigator.clipboard.writeText(mdText);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }, [output]);

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Lorem Ipsum Generator"
          tagline="Placeholder text in multiple flavors - classic Latin, Bacon, Hipster, Corporate, Pirate - sized to words, sentences, or paragraphs."
          description="Pick how many paragraphs / sentences / words you need, pick a flavor (boring Latin, Bacon Ipsum, tech jargon, etc.), and click to copy. Great for mocking up designs without leaving tabs; useful for stress-testing layouts with different word-length distributions."
          audience={["Designers", "Developers", "Writers"]}
          whenToUse={[
            "Filling a mockup with realistic-length copy",
            "Stress-testing a component with long-word languages",
            "Giving stakeholders placeholder text that looks final",
          ]}
        />

        {/* Controls */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          {/* Flavor selector */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
              Flavor
            </label>
            <div className="flex flex-wrap gap-2">
              {FLAVOR_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => {
                    setFlavor(f.value);
                    setSeed((s) => s + 1);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    flavor === f.value
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mode selector */}
          <div className="mb-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
              Mode
            </label>
            <div className="flex gap-2">
              {MODES.map((m) => (
                <button
                  key={m.value}
                  onClick={() => handleModeChange(m.value)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    mode === m.value && !activeTemplate
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Count + options row */}
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label htmlFor="count" className="text-sm text-gray-500">
                Count:
              </label>
              <input
                id="count"
                type="number"
                value={count}
                onChange={(e) => handleCountChange(e.target.value)}
                min={LIMITS[mode].min}
                max={LIMITS[mode].max}
                className="w-24 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <span className="text-xs text-gray-400">
                ({LIMITS[mode].min}-{LIMITS[mode].max})
              </span>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={startClassic}
                onChange={(e) => setStartClassic(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 accent-gray-900"
              />
              Start with &ldquo;Lorem ipsum...&rdquo;
            </label>
          </div>

          {/* HTML output mode */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
              HTML Output
            </label>
            <div className="flex gap-2">
              {HTML_TAGS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setHtmlTag(t.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    htmlTag === t.value
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content templates */}
          <div className="mt-4">
            <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-gray-400">
              Templates
            </label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTemplateClick(t.value)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeTemplate === t.value
                      ? "bg-gray-900 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:text-gray-900 hover:border-gray-300"
                  }`}
                  title={t.desc}
                >
                  {t.label}
                  <span className="ml-1 text-xs opacity-60">
                    ({t.desc})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <div className="mt-4">
            <button
              onClick={handleGenerate}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Generate
            </button>
          </div>
        </div>

        {/* Output */}
        {output && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-400">
                {wordCount.toLocaleString()} words &middot;{" "}
                {charCount.toLocaleString()} characters
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyMarkdown}
                  className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  {copiedMd ? (
                    <>
                      <CheckIcon />
                      Copied MD
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      Copy as Markdown
                    </>
                  )}
                </button>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  {copied ? (
                    <>
                      <CheckIcon />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon />
                      {htmlTag !== "none" ? "Copy HTML" : "Copy"}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Show HTML code if HTML mode is active */}
            {htmlTag !== "none" && htmlOutput ? (
              <div className="rounded-xl border border-gray-200 bg-gray-900 px-4 py-3 shadow-sm text-sm leading-relaxed text-green-400 font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                {htmlOutput}
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm text-sm leading-relaxed text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto">
                {output}
              </div>
            )}
          </div>
        )}

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
