"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { RotateCcw, FileText, Copy, Check } from "lucide-react";
import {
  ToolShell,
  ControlGroup,
  ToolIconButton,
} from "@/components/tools/tool-shell";
import {
  NumberStepper,
  Segment,
  Toggle,
} from "@/components/tools/controls";

// --- Flavor word pools ---

type Flavor =
  | "classic"
  | "hipster"
  | "office"
  | "pirate"
  | "movie"
  | "literary"
  | "cupcake"
  | "bacon";

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
  cupcake: [
    "sprinkles", "frosting", "buttercream", "vanilla", "chocolate",
    "strawberry", "caramel", "fondant", "ganache", "macaron", "meringue",
    "marshmallow", "cinnamon", "sugar", "honey", "cream", "whipped",
    "fluffy", "sweet", "delightful", "tasty", "yummy", "scrumptious",
    "delicious", "decadent", "indulgent", "heavenly", "blissful",
    "dreamy", "rainbow", "pastel", "glitter", "sparkle", "shimmer",
    "cupcake", "muffin", "donut", "cookie", "brownie", "cake", "pie",
    "tart", "pastry", "danish", "eclair", "souffle", "trifle", "parfait",
    "sundae", "sorbet", "gelato", "candy", "chocolate", "truffle",
    "praline", "marzipan", "nougat", "toffee", "fudge", "lollipop",
    "gumdrop", "jellybean", "licorice", "peppermint", "cotton-candy",
    "bubblegum", "smoothie", "milkshake", "frappe", "latte", "mocha",
  ],
  bacon: [
    "bacon", "ipsum", "pork", "belly", "ribeye", "brisket", "tenderloin",
    "sirloin", "shank", "shoulder", "loin", "rump", "chuck", "flank",
    "short-ribs", "spare-ribs", "meatball", "meatloaf", "sausage",
    "pepperoni", "salami", "prosciutto", "pancetta", "ham", "jerky",
    "biltong", "pastrami", "corned-beef", "kielbasa", "chorizo",
    "andouille", "bratwurst", "frankfurter", "kabob", "burger", "patty",
    "filet", "cutlet", "chop", "steak", "roast", "stew", "barbecue",
    "smoked", "grilled", "cured", "salted", "marinated", "braised",
    "roasted", "charred", "seared", "rendered", "drippings", "fat",
    "crackling", "glazed", "stuffed", "wrapped", "rolled", "carved",
    "sliced", "diced", "chopped", "minced", "ground", "shredded",
    "savory", "smoky", "salty", "fatty", "juicy", "tender", "crispy",
    "succulent", "umami", "rich", "hearty", "rustic", "artisanal",
  ],
};

const FLAVOR_OPTIONS: { value: Flavor; label: string }[] = [
  { value: "classic", label: "Classic" },
  { value: "hipster", label: "Hipster" },
  { value: "office", label: "Corporate" },
  { value: "pirate", label: "Pirate" },
  { value: "movie", label: "Movie" },
  { value: "literary", label: "Literary" },
  { value: "cupcake", label: "Cupcake" },
  { value: "bacon", label: "Bacon" },
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

const HTML_TAGS: { value: HtmlTag; label: React.ReactNode }[] = [
  { value: "none", label: "Plain" },
  { value: "p", label: "<p>" },
  { value: "li", label: "<li>" },
  { value: "h2", label: "<h2>" },
];

const TEMPLATES: { value: TemplateName; label: string; desc: string }[] = [
  { value: "blog", label: "Blog Post", desc: "Title + 3 paragraphs" },
  {
    value: "product",
    label: "Product",
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

  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");


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
    const mdText = output.replace(/\n{1,}/g, "\n\n");
    await navigator.clipboard.writeText(mdText);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }, [output]);

  const limits = LIMITS[mode];

  const controls = (
    <>
      <ControlGroup label="Flavor">
        <div className="grid grid-cols-2 gap-2">
          {FLAVOR_OPTIONS.map((f) => (
            <button
              key={f.value}
              onClick={() => {
                setFlavor(f.value);
                setSeed((s) => s + 1);
                setActiveTemplate(null);
              }}
              data-active={flavor === f.value}
              className="kc-segment-btn"
              style={{ minHeight: 40 }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </ControlGroup>

      <ControlGroup label="Output">
        <Segment
          value={mode}
          onChange={handleModeChange}
          options={[
            { value: "paragraphs", label: "Paragraphs" },
            { value: "sentences", label: "Sentences" },
            { value: "words", label: "Words" },
          ]}
          full
        />
        <NumberStepper
          value={count}
          onChange={(n) => {
            const clamped = Math.max(limits.min, Math.min(limits.max, n));
            setCount(clamped);
            setActiveTemplate(null);
            setSeed((s) => s + 1);
          }}
          min={limits.min}
          max={limits.max}
          label={`Count (${limits.min}-${limits.max})`}
        />
      </ControlGroup>

      <ControlGroup label="Options">
        <Toggle
          checked={startClassic}
          onChange={setStartClassic}
          label='Start with "Lorem ipsum"'
          hint="Classic flavor only"
        />
      </ControlGroup>

      <ControlGroup label="HTML wrap">
        <Segment
          value={htmlTag}
          onChange={(v) => setHtmlTag(v)}
          options={HTML_TAGS.map((t) => ({ value: t.value, label: t.label }))}
          full
        />
      </ControlGroup>

      <ControlGroup label="Templates" hint="Preset shapes">
        <div className="grid grid-cols-1 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.value}
              onClick={() => handleTemplateClick(t.value)}
              data-active={activeTemplate === t.value}
              className="kc-segment-btn"
              style={{ minHeight: 44, textAlign: "left", padding: "8px 12px" }}
              title={t.desc}
            >
              <div>
                <div className="text-sm font-medium">{t.label}</div>
                <div className="text-xs opacity-60">{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolIconButton label="Regenerate" onClick={handleGenerate} variant="outline">
        <RotateCcw size={14} />
      </ToolIconButton>
      <ToolIconButton label="Copy as Markdown" onClick={handleCopyMarkdown} variant="outline" active={copiedMd}>
        {copiedMd ? <Check size={14} /> : <FileText size={14} />}
      </ToolIconButton>
      <ToolIconButton label={htmlTag !== "none" ? "Copy HTML" : "Copy"} onClick={handleCopy} variant="solid" active={copied}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </ToolIconButton>
    </>
  );

  return (
    <ToolShell
      title="Lorem Ipsum Generator"
      tagline="Placeholder text · 8 flavors · words, sentences, paragraphs"
      accent="#6366f1"
      materialFab={{ label: "Copy Text", onClick: handleCopy }}
      actions={actions}
      controls={controls}
    >
      <div className="flex flex-col gap-3 p-4 md:p-6">
        <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Settings</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>

        <div className="canvas-section glass-canvas-section" data-panel="input">
          <div
            className="px-4 py-3 text-sm"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <p className="kami-text-dim">
              Flavor: <strong className="kami-text-muted">{flavor}</strong>
              {" · "}Mode: <strong className="kami-text-muted">{activeTemplate ? `template: ${activeTemplate}` : `${count} ${mode}`}</strong>
              {" · "}HTML: <strong className="kami-text-muted">{htmlTag === "none" ? "plain" : htmlTag}</strong>
              {" · "}Start classic: <strong className="kami-text-muted">{startClassic ? "yes" : "no"}</strong>
            </p>
          </div>
        </div>

        <div className="canvas-section glass-canvas-section" data-panel="output">
        <div
          className="flex items-center justify-between text-xs kami-text-dim"
        >
          <span>
            {wordCount.toLocaleString()} words · {charCount.toLocaleString()} chars
          </span>
          {activeTemplate && (
            <span
              className="px-2 py-0.5 text-xs font-medium"
              style={{
                background: "var(--kami-surface)",
                color: "var(--kami-text-muted)",
                borderRadius: "999px",
              }}
            >
              Template: {activeTemplate}
            </span>
          )}
        </div>
        {htmlTag !== "none" && htmlOutput ? (
          <div
            className="px-4 py-3 text-sm leading-relaxed font-mono whitespace-pre-wrap overflow-auto"
            style={{
              background: "var(--kami-overlay-bg)",
              color: "color-mix(in srgb, #4ade80 75%, var(--kami-overlay-text))",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
              minHeight: 240,
            }}
          >
            {htmlOutput}
          </div>
        ) : (
          <div
            className="px-4 py-3 text-base leading-relaxed whitespace-pre-wrap overflow-auto"
            style={{
              background: "var(--kami-surface-solid)",
              color: "var(--kami-text-muted)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "var(--kami-card-shadow, none)",
              minHeight: 240,
            }}
          >
            {output || "Configure options to generate text."}
          </div>
        )}
        </div>
      </div>
    </ToolShell>
  );
}
