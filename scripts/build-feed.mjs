#!/usr/bin/env node
// build-feed.mjs — generate public/feed.xml (RSS) listing every tool by
// the date its layout.tsx was first committed. Repeat visitors subscribe
// to the feed and learn when new tools land.
//
// Date source: git log of src/app/<slug>/layout.tsx — the first commit
// that introduced the layout file. No invented dates.

import { readFile, writeFile } from "node:fs/promises";
import { execSync } from "node:child_process";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const PUB = join(ROOT, "public");
const SITE = "https://tools.iamkesava.com";

function escapeXml(s) {
  return (s || "").toString().replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);
}

async function parseTools() {
  const src = await readFile(join(ROOT, "src", "data", "tools.ts"), "utf8");
  const allM = src.match(/export const allTools[^=]*=\s*\[([\s\S]*?)\n\];/);
  if (!allM) return [];
  const tools = [];
  let depth = 0, current = "", inStr = false, strCh = "";
  for (let i = 0; i < allM[1].length; i++) {
    const c = allM[1][i];
    if (inStr) { current += c; if (c === strCh && allM[1][i - 1] !== "\\") inStr = false; continue; }
    if (c === '"' || c === "'" || c === "`") { inStr = true; strCh = c; current += c; continue; }
    if (c === "{") { depth++; if (depth === 1) { current = "{"; continue; } }
    if (c === "}") { depth--; if (depth === 0) {
      current += "}";
      const get = (k) => (current.match(new RegExp(`${k}\\s*:\\s*"([^"]*)"`)) || [])[1] || "";
      tools.push({
        name: get("name"),
        description: get("description"),
        href: get("href"),
      });
      current = "";
      continue;
    } }
    if (depth >= 1) current += c;
  }
  return tools.filter((t) => t.href);
}

function firstCommitDateFor(slug) {
  // Find the very first commit that touched src/app/<slug>/layout.tsx OR
  // src/app/<slug>/page.tsx if no layout.tsx exists yet.
  const candidates = [
    `src/app/${slug}/layout.tsx`,
    `src/app/${slug}/page.tsx`,
  ];
  for (const path of candidates) {
    try {
      const out = execSync(
        `git log --diff-filter=A --follow --format=%aI -1 -- "${path}"`,
        { cwd: ROOT, encoding: "utf8" }
      ).trim();
      if (out) return out;
    } catch { /* not found, try next */ }
  }
  return null;
}

async function main() {
  const tools = await parseTools();
  const items = tools.map((t) => {
    const slug = t.href.replace(/^\//, "").replace(/\/$/, "");
    const date = firstCommitDateFor(slug);
    return { slug, ...t, pubDate: date ? new Date(date) : null };
  })
    .filter((t) => t.pubDate)
    .sort((a, b) => +b.pubDate - +a.pubDate);
  const buildDate = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>little tools, what's new</title>
    <description>New free, ad-free, privacy-first browser tools by Kesava. Every entry is a tool that landed at tools.iamkesava.com. Subscribe to know when new ones ship.</description>
    <link>${SITE}/</link>
    <language>en</language>
    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${buildDate}</lastBuildDate>
${items
  .slice(0, 50)
  .map(
    (t) => `    <item>
      <title>${escapeXml(t.name)}</title>
      <description>${escapeXml(t.description)}</description>
      <link>${SITE}${t.href}/</link>
      <guid isPermaLink="true">${SITE}${t.href}/</guid>
      <pubDate>${t.pubDate.toUTCString()}</pubDate>
    </item>`
  )
  .join("\n")}
  </channel>
</rss>
`;
  await writeFile(join(PUB, "feed.xml"), xml);
  console.log(`build-feed: wrote feed.xml with ${items.length} items (newest: ${items[0]?.name || "n/a"})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
