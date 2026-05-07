#!/usr/bin/env node
// prebuild-aeo.mjs — generate AEO surface files from src/data/tools.ts
// Runs before `next build` so the static export carries:
//   public/llms.txt                          machine-readable index for AI agents
//   public/.well-known/agent-permissions.json   Osmani-style license declaration
//   public/og/<slug>.svg                     per-page Open Graph card

import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const PUB = join(ROOT, "public");
const TOOLS_FILE = join(ROOT, "src", "data", "tools.ts");
const SITE = "https://tools.iamkesava.com";

// ── parse tools.ts (TS, but the structure is plain enough to regex) ─────────
async function parseTools() {
  const src = await readFile(TOOLS_FILE, "utf8");
  // Pull the allTools array literal block. Each entry is { name: "...", description: "...", href: "/...", icon: "...", collections: [...], keywords?: [...] }.
  const allMatch = src.match(/export const allTools[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!allMatch) throw new Error("could not locate allTools array in tools.ts");
  const body = allMatch[1];
  const tools = [];
  // crude object splitter on top-level "{" with depth tracking
  let depth = 0, current = "", inStr = false, strCh = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (inStr) {
      current += c;
      if (c === strCh && body[i - 1] !== "\\") inStr = false;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { inStr = true; strCh = c; current += c; continue; }
    if (c === "{") { depth++; if (depth === 1) { current = "{"; continue; } }
    if (c === "}") { depth--; if (depth === 0) { current += "}"; tools.push(parseEntry(current)); current = ""; continue; } }
    if (depth >= 1) current += c;
  }
  return tools.filter(Boolean);
}
function parseEntry(s) {
  // Extract a few keys we care about
  const get = (k) => {
    const m = s.match(new RegExp(`${k}\\s*:\\s*"([^"]*)"`));
    return m ? m[1] : "";
  };
  const getArr = (k) => {
    const m = s.match(new RegExp(`${k}\\s*:\\s*\\[([^\\]]*)\\]`));
    if (!m) return [];
    return m[1].split(",").map(x => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  };
  return {
    name: get("name"),
    description: get("description"),
    href: get("href"),
    collections: getArr("collections"),
    keywords: getArr("keywords"),
  };
}
async function parseCollections() {
  const src = await readFile(TOOLS_FILE, "utf8");
  const m = src.match(/export const collections[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!m) return [];
  const body = m[1];
  const out = [];
  for (const block of body.split(/\n\s*\{/).slice(1)) {
    const entry = "{" + block;
    const get = (k) => {
      const mm = entry.match(new RegExp(`${k}\\s*:\\s*"([^"]*)"`));
      return mm ? mm[1] : "";
    };
    const id = get("id"), title = get("title"), description = get("description"), href = get("href");
    if (id) out.push({ id, title, description, href });
  }
  return out;
}

// ── llms.txt ────────────────────────────────────────────────────────────────
async function writeLlms(tools, collections) {
  const lines = [
    "# little tools",
    "",
    "> Free, ad-free, privacy-first browser tools by Kesava. All processing happens client-side. No accounts, no data collection.",
    "",
    `Counts: ${tools.length} tools across ${collections.length} collections.`,
    "",
    "## Index",
    "",
    `- [Sitemap](${SITE}/sitemap.xml): every canonical URL.`,
    `- [Home](${SITE}/): all tools by collection.`,
    "",
    "## Sister sites",
    "",
    `- [apps.iamkesava.com](https://apps.iamkesava.com/): Kami Studios apps and AI playgrounds.`,
    `- [toys.iamkesava.com](https://toys.iamkesava.com/): creative experiments (audio, visual, generative).`,
    `- [iamkesava.com](https://iamkesava.com/): Kesava's blog and writing.`,
    "",
    "## Collections",
    "",
    ...collections.map((c) => `- [${c.title}](${SITE}${c.href}/): ${c.description}`),
    "",
    "## Tools",
    "",
  ];
  // Tools grouped by collection
  for (const c of collections) {
    const inCol = tools.filter((t) => (t.collections || []).includes(c.id));
    if (!inCol.length) continue;
    lines.push(`### ${c.title}`);
    lines.push("");
    for (const t of inCol) {
      lines.push(`- [${t.name}](${SITE}${t.href}/): ${t.description}`);
    }
    lines.push("");
  }
  lines.push("## URL templates");
  lines.push("");
  lines.push(`- Tool: \`${SITE}/<slug>/\``);
  lines.push(`- Collection: \`${SITE}/for/<slug>/\``);
  lines.push("");
  lines.push("## License");
  lines.push("");
  lines.push("MIT. Cite freely with attribution to Kesava and a link to the canonical URL.");
  lines.push("");
  await writeFile(join(PUB, "llms.txt"), lines.join("\n"));
}

// ── agent-permissions.json (Osmani Layer 1) ────────────────────────────────
async function writeAgentPermissions(tools) {
  await mkdir(join(PUB, ".well-known"), { recursive: true });
  const today = new Date().toISOString().slice(0, 10);
  const obj = {
    $schema: "https://addyosmani.com/agent-permissions/schema.json",
    policy_version: "1.0",
    site: SITE,
    license: "MIT",
    attribution_required: true,
    allowed_uses: [
      "read",
      "summarize",
      "cite",
      "answer-engine-indexing",
      "training-with-attribution",
      "embed-with-attribution",
    ],
    disallowed_uses: ["republish-without-attribution"],
    preferred_format: "html",
    canonical_index: `${SITE}/sitemap.xml`,
    discovery: [
      `${SITE}/llms.txt`,
      `${SITE}/sitemap.xml`,
      `${SITE}/robots.txt`,
    ],
    schema: {
      tool_url_template: `${SITE}/{slug}/`,
      collection_url_template: `${SITE}/for/{slug}/`,
    },
    related_sites: {
      apps: "https://apps.iamkesava.com",
      toys: "https://toys.iamkesava.com",
      apex: "https://iamkesava.com",
    },
    contact: "https://github.com/k3sava/little-tools/issues",
    counts: { tools: tools.length },
    last_updated: today,
  };
  await writeFile(
    join(PUB, ".well-known", "agent-permissions.json"),
    JSON.stringify(obj, null, 2)
  );
}

// ── per-page OG image (SVG) ────────────────────────────────────────────────
const W = 1200, H = 630;
function escapeXml(s) {
  return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}
function wrap(text, maxChars, maxLines = 3) {
  const words = (text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    if (!line.length) { line = w; continue; }
    if ((line + " " + w).length <= maxChars) { line += " " + w; continue; }
    lines.push(line);
    line = w;
    if (lines.length >= maxLines) {
      lines[lines.length - 1] = lines[lines.length - 1].replace(/[.,;:!?]?$/, "") + "…";
      return lines;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}
function ogSvg({ eyebrow, title, byline, accent = "#10b981" }) {
  const titleLines = wrap(title, 30, 4);
  const lineH = 78;
  const startY = 240;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fafaf9"/>
      <stop offset="1" stop-color="#f4f4f4"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${W}" height="6" fill="${accent}"/>
  <g transform="translate(80, 60)">
    <circle cx="0" cy="14" r="6" fill="${accent}"/>
    <text x="16" y="20" font-family="DM Sans, system-ui, sans-serif" font-size="22" fill="#0a0a0a">little tools</text>
  </g>
  ${eyebrow ? `<text x="80" y="170" font-family="JetBrains Mono, monospace" font-size="16" fill="#525252" letter-spacing="2">${escapeXml(eyebrow.toUpperCase())}</text>` : ""}
  ${titleLines.map((line, i) => `<text x="80" y="${startY + i * lineH}" font-family="Cormorant Garamond, serif" font-size="68" font-weight="500" fill="#0a0a0a">${escapeXml(line)}</text>`).join("\n  ")}
  ${byline ? `<text x="80" y="${startY + titleLines.length * lineH + 40}" font-family="JetBrains Mono, monospace" font-size="22" fill="#525252">${escapeXml(byline)}</text>` : ""}
  <text x="${W - 80}" y="${H - 60}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="14" fill="#737373">tools.iamkesava.com</text>
</svg>`;
}
async function writeOg(tools, collections) {
  const ogDir = join(PUB, "og");
  await rm(ogDir, { recursive: true, force: true });
  await mkdir(ogDir, { recursive: true });
  // Default
  await writeFile(join(ogDir, "default.svg"), ogSvg({
    eyebrow: "free, ad-free, privacy-first",
    title: "60+ browser tools that respect your time",
    byline: "by Kesava",
  }));
  // Per-collection
  for (const c of collections) {
    const accent = ({
      developers: "#10b981", designers: "#8b5cf6", writers: "#6366f1",
      pmm: "#14b8a6", ads: "#f59e0b", pm: "#3b82f6", seo: "#ef4444", everyone: "#0a0a0a",
    })[c.id] || "#10b981";
    const slug = c.id;
    await writeFile(join(ogDir, `for-${slug}.svg`), ogSvg({
      eyebrow: `for ${c.title.toLowerCase()}`,
      title: c.description,
      byline: "tools.iamkesava.com",
      accent,
    }));
  }
  // Per-tool
  for (const t of tools) {
    const slug = (t.href || "").replace(/^\//, "").replace(/\/$/, "");
    if (!slug) continue;
    const accent = ({
      developers: "#10b981", designers: "#8b5cf6", writers: "#6366f1",
      pmm: "#14b8a6", ads: "#f59e0b", pm: "#3b82f6", seo: "#ef4444", everyone: "#0a0a0a",
    })[(t.collections || [])[0]] || "#10b981";
    await writeFile(join(ogDir, `${slug}.svg`), ogSvg({
      eyebrow: (t.collections || [])[0] || "tool",
      title: t.name,
      byline: t.description,
      accent,
    }));
  }
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const tools = await parseTools();
  const collections = await parseCollections();
  console.log(`prebuild-aeo: ${tools.length} tools, ${collections.length} collections`);
  await writeLlms(tools, collections);
  await writeAgentPermissions(tools);
  await writeOg(tools, collections);
  console.log(`prebuild-aeo: wrote llms.txt, agent-permissions.json, ${tools.length + collections.length + 1} OG cards`);
}
main().catch((e) => { console.error(e); process.exit(1); });
