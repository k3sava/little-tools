export type Collection =
  | "developers"
  | "designers"
  | "writers"
  | "pmm"
  | "ads"
  | "pm"
  | "seo"
  | "everyone";

export interface Tool {
  name: string;
  description: string;
  href: string;
  icon: string;
  collections: Collection[];
  keywords?: string[];
}

export interface CollectionMeta {
  id: Collection;
  title: string;
  description: string;
  href: string;
  accent: string;
  accentHex: string;
}

export const collections: CollectionMeta[] = [
  {
    id: "developers",
    title: "Developers",
    description: "Encoding, hashing, formatting, and debugging utilities.",
    href: "/for/developers",
    accent: "emerald",
    accentHex: "#10b981",
  },
  {
    id: "designers",
    title: "Designers",
    description: "Color, layout, animation, and visual design tools.",
    href: "/for/designers",
    accent: "violet",
    accentHex: "#8b5cf6",
  },
  {
    id: "writers",
    title: "Writers",
    description: "Headline testing, readability scoring, and text editing.",
    href: "/for/writers",
    accent: "indigo",
    accentHex: "#6366f1",
  },
  {
    id: "pmm",
    title: "PMM",
    description: "Positioning, competitive analysis, and go-to-market tools.",
    href: "/for/pmm",
    accent: "teal",
    accentHex: "#14b8a6",
  },
  {
    id: "ads",
    title: "Ads",
    description: "Campaign tracking, copy testing, and creative utilities.",
    href: "/for/ads",
    accent: "orange",
    accentHex: "#f97316",
  },
  {
    id: "pm",
    title: "PM",
    description: "Specs, competitive research, and stakeholder communication.",
    href: "/for/pm",
    accent: "sky",
    accentHex: "#0ea5e9",
  },
  {
    id: "seo",
    title: "SEO",
    description: "Meta tags, structured data, and content optimization.",
    href: "/for/seo",
    accent: "blue",
    accentHex: "#3b82f6",
  },
  {
    id: "everyone",
    title: "Everyone",
    description: "PDF tools, file conversion, and everyday utilities.",
    href: "/for/everyone",
    accent: "rose",
    accentHex: "#f43f5e",
  },
];

export const allTools: Tool[] = [
  // --- Existing tools ---

  // Text / writing tools
  { name: "Case Converter", description: "Convert text between Title Case, camelCase, snake_case, kebab-case, PascalCase, and more.", href: "/case-converter", icon: "Aa", collections: ["writers", "pmm", "ads"], keywords: ["title", "camel", "snake", "kebab", "pascal", "uppercase", "lowercase"] },
  { name: "Character Counter", description: "Count characters, words, sentences, paragraphs, and estimate reading time.", href: "/character-counter", icon: "#", collections: ["writers", "seo", "ads", "everyone"], keywords: ["word count", "character count", "reading time"] },
  { name: "Lorem Ipsum Generator", description: "Generate placeholder text by paragraphs, sentences, or words.", href: "/lorem-ipsum", icon: "¶", collections: ["designers"], keywords: ["placeholder", "dummy text", "filler"] },
  { name: "Text Cleaner", description: "Remove extra whitespace, line breaks, special characters, duplicate lines.", href: "/text-cleaner", icon: "✂", collections: ["writers", "everyone"], keywords: ["whitespace", "clean", "strip", "remove"] },
  { name: "Find & Replace", description: "Search and replace text with regex support and case sensitivity toggle.", href: "/find-replace", icon: "⇄", collections: ["developers", "writers"], keywords: ["search", "replace", "regex", "find"] },
  { name: "Word Frequency", description: "Analyze word frequency with bar charts, filtering, and CSV export.", href: "/word-frequency", icon: "W#", collections: ["writers", "seo"], keywords: ["frequency", "count", "analyze", "keyword density"] },
  { name: "Headline Analyzer", description: "Score headlines for emotional value, power words, readability, and click potential.", href: "/headline-analyzer", icon: "H✓", collections: ["writers", "seo", "pmm", "ads"], keywords: ["headline", "title", "score", "emotional", "power words", "ctr", "click"] },
  { name: "Text Diff", description: "Compare two texts side-by-side or inline with line-by-line diff.", href: "/text-diff", icon: "±", collections: ["developers", "pm"], keywords: ["compare", "diff", "difference"] },
  { name: "Clipboard Manager", description: "Save, search, and organize text clips in your browser.", href: "/clipboard-manager", icon: "📋", collections: ["everyone"], keywords: ["clipboard", "copy", "paste", "save"] },
  { name: "Markdown Editor", description: "Write and preview Markdown with live rendering and export.", href: "/markdown-editor", icon: "M↓", collections: ["developers", "writers", "pm"], keywords: ["markdown", "editor", "preview", "md"] },
  { name: "Invoice Generator", description: "Create professional invoices with PDF export and local storage.", href: "/invoice-generator", icon: "$", collections: ["everyone"], keywords: ["invoice", "pdf", "billing"] },
  { name: "Link-in-Bio Builder", description: "Create a link-in-bio page with custom links and themes.", href: "/link-in-bio", icon: "🔗", collections: ["ads", "everyone"], keywords: ["bio", "links", "profile"] },

  // Design tools
  { name: "Color Palette", description: "Generate harmonious color palettes with multiple harmony rules.", href: "/palette", icon: "🎨", collections: ["designers"], keywords: ["palette", "color", "harmony", "scheme"] },
  { name: "Color Converter", description: "Convert between HEX, RGB, HSL, and other color formats.", href: "/color-converter", icon: "⬡", collections: ["designers"], keywords: ["hex", "rgb", "hsl", "color", "convert"] },
  { name: "Contrast Checker", description: "Check WCAG contrast ratios for accessibility compliance.", href: "/contrast", icon: "◐", collections: ["designers", "developers"], keywords: ["wcag", "contrast", "accessibility", "a11y"] },
  { name: "Gradient Generator", description: "Create CSS gradients with visual editor and code export.", href: "/gradient", icon: "▰", collections: ["designers"], keywords: ["gradient", "css", "linear", "radial"] },
  { name: "Box Shadow", description: "Design CSS box shadows with visual controls.", href: "/box-shadow", icon: "▣", collections: ["designers"], keywords: ["shadow", "css", "box-shadow"] },
  { name: "Border Radius", description: "Visualize and generate CSS border-radius values.", href: "/border-radius", icon: "◱", collections: ["designers"], keywords: ["border", "radius", "rounded", "css"] },
  { name: "Glassmorphism", description: "Generate glass and soft-UI effects with CSS output.", href: "/glassmorphism", icon: "◻", collections: ["designers"], keywords: ["glass", "neumorphism", "blur", "frosted"] },
  { name: "Flexbox Playground", description: "Learn and experiment with CSS Flexbox interactively.", href: "/flexbox", icon: "⬚", collections: ["designers"], keywords: ["flexbox", "css", "layout", "flex"] },
  { name: "CSS Grid", description: "Build CSS Grid layouts visually with template controls.", href: "/grid", icon: "⊞", collections: ["designers"], keywords: ["grid", "css", "layout", "template"] },
  { name: "OG Image Generator", description: "Create Open Graph images for social sharing.", href: "/og-image", icon: "🖼", collections: ["designers", "ads"], keywords: ["og", "opengraph", "social", "meta"] },
  { name: "Favicon Generator", description: "Generate favicons from text, emoji, or images.", href: "/favicon", icon: "⬥", collections: ["designers"], keywords: ["favicon", "icon", "ico"] },
  { name: "Screenshot Beautifier", description: "Add backgrounds, shadows, and frames to screenshots.", href: "/screenshot-beautifier", icon: "📸", collections: ["designers", "pm"], keywords: ["screenshot", "mockup", "frame"] },
  { name: "QR Code Generator", description: "Generate QR codes with custom colors and sizes.", href: "/qr-code", icon: "▦", collections: ["ads", "everyone"], keywords: ["qr", "barcode", "scan"] },

  // CSS animation tools (formerly CSSKit)
  { name: "Keyframe Animator", description: "Build CSS @keyframes animations visually with timeline editor.", href: "/keyframe-animator", icon: "▶", collections: ["designers"], keywords: ["keyframes", "animation", "css", "timeline", "motion"] },
  { name: "Easing Editor", description: "Design cubic-bezier, spring, and linear() easing curves.", href: "/easing-editor", icon: "⌒", collections: ["designers"], keywords: ["easing", "cubic-bezier", "spring", "timing", "curve"] },
  { name: "Scroll Animation", description: "Generate scroll-driven CSS animations with live preview.", href: "/scroll-animation", icon: "↕", collections: ["designers"], keywords: ["scroll", "animation", "scroll-driven", "timeline", "css"] },

  // Developer tools
  { name: "JSON Formatter", description: "Format, beautify, minify, and validate JSON.", href: "/json-formatter", icon: "{}", collections: ["developers", "pm"], keywords: ["json", "format", "beautify", "validate"] },
  { name: "Regex Tester", description: "Test regex patterns with real-time match highlighting.", href: "/regex-tester", icon: ".*", collections: ["developers"], keywords: ["regex", "regexp", "pattern", "match"] },
  { name: "Base64 Encode/Decode", description: "Encode and decode Base64 text and files.", href: "/base64", icon: "b64", collections: ["developers"], keywords: ["base64", "encode", "decode"] },
  { name: "URL Encode/Decode", description: "Encode and decode URLs, parse query parameters.", href: "/url-encoder", icon: "%", collections: ["developers"], keywords: ["url", "encode", "decode", "query"] },
  { name: "Hash Generator", description: "Generate MD5, SHA-1, SHA-256, SHA-512 hashes.", href: "/hash-generator", icon: "#!", collections: ["developers"], keywords: ["hash", "md5", "sha", "checksum"] },
  { name: "JWT Decoder", description: "Decode JSON Web Tokens with color-coded output.", href: "/jwt-decoder", icon: "jwt", collections: ["developers"], keywords: ["jwt", "token", "decode", "auth"] },
  { name: "UUID / ULID Generator", description: "Generate UUID v4 and ULID identifiers in bulk.", href: "/uuid-generator", icon: "id", collections: ["developers"], keywords: ["uuid", "ulid", "guid", "identifier"] },
  { name: "Timestamp Converter", description: "Convert between Unix timestamps and dates.", href: "/timestamp", icon: "⏱", collections: ["developers"], keywords: ["timestamp", "unix", "epoch", "date"] },
  { name: "Cron Builder", description: "Build and validate cron expressions visually.", href: "/cron-builder", icon: "⏰", collections: ["developers"], keywords: ["cron", "schedule", "expression"] },
  { name: "Image Converter", description: "Convert images between formats in your browser.", href: "/image-converter", icon: "↻", collections: ["everyone"], keywords: ["convert", "image", "format", "png", "jpg", "webp"] },

  // PDF tools
  { name: "PDF Merge", description: "Combine multiple PDF files into one. Files never leave your browser.", href: "/pdf-merge", icon: "⊕", collections: ["everyone"], keywords: ["merge", "combine", "join", "pdf"] },
  { name: "PDF Compress", description: "Reduce PDF file size without uploading. 100% client-side.", href: "/pdf-compress", icon: "⊖", collections: ["everyone"], keywords: ["compress", "reduce", "shrink", "size", "pdf"] },
  { name: "PDF Split", description: "Extract specific pages from a PDF. 100% client-side.", href: "/pdf-split", icon: "✂", collections: ["everyone"], keywords: ["split", "extract", "pages", "separate", "pdf"] },

  // --- New tools ---

  // SEO tools
  { name: "Meta Tag Generator", description: "Generate meta titles, descriptions, OG tags, and Twitter cards with live SERP previews.", href: "/meta-tag-generator", icon: "⟨⟩", collections: ["seo"], keywords: ["meta", "og", "opengraph", "twitter card", "serp", "preview"] },
  { name: "Schema Generator", description: "Build JSON-LD structured data for Articles, FAQs, Products, and more.", href: "/schema-generator", icon: "{}+", collections: ["seo"], keywords: ["schema", "json-ld", "structured data", "rich results", "faq"] },
  { name: "SEO Content Analyzer", description: "Analyze content for keyword density, heading structure, readability, and SEO score.", href: "/seo-content-analyzer", icon: "📊", collections: ["seo"], keywords: ["keyword density", "heading", "seo score", "content optimization"] },

  // Marketing tools
  { name: "Readability Scorer", description: "Grade content with Flesch-Kincaid, Gunning Fog, SMOG, and more.", href: "/readability-scorer", icon: "Rz", collections: ["writers", "pmm", "pm", "seo"], keywords: ["readability", "flesch", "gunning fog", "grade level", "reading level"] },
  { name: "UTM Builder", description: "Build campaign URLs with UTM parameters, presets, and bulk generation.", href: "/utm-builder", icon: "🔗+", collections: ["seo", "pmm", "ads"], keywords: ["utm", "campaign", "tracking", "url builder"] },
  { name: "Comparison Table Builder", description: "Create feature comparison tables with export to HTML, PNG, and Markdown.", href: "/comparison-table", icon: "⊞+", collections: ["pmm", "pm"], keywords: ["comparison", "feature", "competitor", "table", "versus"] },
  { name: "Positioning Statement Builder", description: "Build positioning statements with guided frameworks from Dunford, Moore, and more.", href: "/positioning-builder", icon: "◎", collections: ["pmm", "pm"], keywords: ["positioning", "statement", "framework", "dunford", "moore"] },
  { name: "RICE Scoring Calculator", description: "Prioritize features with the RICE framework. Score initiatives by Reach, Impact, Confidence, and Effort.", href: "/rice-calculator", icon: "▤", collections: ["pm", "pmm"], keywords: ["rice", "prioritization", "scoring", "reach", "impact", "confidence", "effort", "backlog", "feature"] },
  { name: "A/B Test Calculator", description: "Statistical significance calculator for A/B tests. Sample size planner and results analyzer.", href: "/ab-test-calculator", icon: "⚖", collections: ["pmm", "pm", "seo"], keywords: ["ab test", "split test", "significance", "sample size", "p-value", "conversion", "experiment", "hypothesis"] },

  // Release & content tools
  { name: "Release Notes Formatter", description: "Turn raw changelog bullets into polished, categorized release notes. Export as Markdown, HTML, or plain text.", href: "/release-notes-formatter", icon: "📝", collections: ["pm", "pmm"], keywords: ["release notes", "changelog", "update", "version", "ship", "announcement"] },
  { name: "Feature-Benefit Mapper", description: "Map product features to customer benefits. Catch feature-speak before it reaches your landing page.", href: "/feature-benefit-mapper", icon: "⇌", collections: ["pmm", "pm"], keywords: ["feature", "benefit", "value proposition", "messaging", "copy", "positioning"] },
  { name: "Content Brief Builder", description: "Build structured content briefs for writers and SEO teams. Define keywords, audience, intent, and outline.", href: "/content-brief-builder", icon: "📋+", collections: ["seo", "pmm", "writers"], keywords: ["content brief", "seo brief", "outline", "keyword", "writer", "assignment"] },

  // Video tools
  { name: "Video Converter", description: "Convert videos between MP4 and WebM. 100% client-side, no uploads, no limits.", href: "/video-converter", icon: "▶", collections: ["everyone"], keywords: ["video", "convert", "mp4", "webm", "mov", "transcode"] },
];

// --- Helper functions ---

export function getCollection(id: Collection): CollectionMeta {
  return collections.find((c) => c.id === id)!;
}

export function getToolsByCollection(id: Collection): Tool[] {
  return allTools.filter((t) => t.collections.includes(id));
}

export function getToolByHref(href: string): Tool | undefined {
  return allTools.find((t) => t.href === href);
}

export function getPrimaryCollection(tool: Tool): CollectionMeta {
  return collections.find((c) => c.id === tool.collections[0])!;
}

export function getRelatedTools(href: string, count = 4): Tool[] {
  const tool = getToolByHref(href);
  if (!tool) return allTools.slice(0, count);
  // Find tools sharing the most collections with this tool
  const others = allTools
    .filter((t) => t.href !== href)
    .map((t) => ({
      tool: t,
      overlap: t.collections.filter((c) => tool.collections.includes(c)).length,
    }))
    .sort((a, b) => b.overlap - a.overlap || a.tool.name.localeCompare(b.tool.name));
  return others.slice(0, count).map((o) => o.tool);
}
