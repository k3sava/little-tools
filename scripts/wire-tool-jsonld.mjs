#!/usr/bin/env node
// wire-tool-jsonld.mjs — for every src/app/<slug>/layout.tsx that doesn't
// already render <JsonLd>, inject:
//   1. import { JsonLd, softwareLd } from "@/lib/json-ld";
//   2. metadata.openGraph.images and metadata.twitter.images pointing to
//      /og/<slug>.svg
//   3. JSX wrapper around children: <><JsonLd data={softwareLd(...)} />{children}</>
//
// Idempotent: safe to re-run. Skips files where JsonLd is already imported.

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const APP = join(ROOT, "src", "app");
const TOOLS_FILE = join(ROOT, "src", "data", "tools.ts");
const SITE = "https://tools.iamkesava.com";

const SKIP = new Set(["api", "fonts", "for", "favicon", "globals.css", "layout.tsx", "page.tsx", "not-found.tsx", "robots.ts", "sitemap.ts"]);

async function loadToolMap() {
  const src = await readFile(TOOLS_FILE, "utf8");
  // Extract collection lookup
  const colsMatch = src.match(/export const collections[^=]*=\s*\[([\s\S]*?)\n\];/);
  const cols = new Map();
  if (colsMatch) {
    for (const block of colsMatch[1].split(/\n\s*\{/).slice(1)) {
      const entry = "{" + block;
      const id = (entry.match(/id\s*:\s*"([^"]*)"/) || [])[1];
      const title = (entry.match(/title\s*:\s*"([^"]*)"/) || [])[1];
      const href = (entry.match(/href\s*:\s*"([^"]*)"/) || [])[1];
      if (id) cols.set(id, { title, href });
    }
  }
  // Extract tool list
  const allMatch = src.match(/export const allTools[^=]*=\s*\[([\s\S]*?)\n\];/);
  const tools = new Map();
  if (allMatch) {
    let depth = 0, current = "", inStr = false, strCh = "";
    for (let i = 0; i < allMatch[1].length; i++) {
      const c = allMatch[1][i];
      if (inStr) { current += c; if (c === strCh && allMatch[1][i - 1] !== "\\") inStr = false; continue; }
      if (c === '"' || c === "'" || c === "`") { inStr = true; strCh = c; current += c; continue; }
      if (c === "{") { depth++; if (depth === 1) { current = "{"; continue; } }
      if (c === "}") { depth--; if (depth === 0) {
        current += "}";
        const get = (k) => (current.match(new RegExp(`${k}\\s*:\\s*"([^"]*)"`)) || [])[1] || "";
        const getArr = (k) => {
          const m = current.match(new RegExp(`${k}\\s*:\\s*\\[([^\\]]*)\\]`));
          if (!m) return [];
          return m[1].split(",").map(x => x.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
        };
        const href = get("href");
        const slug = href.replace(/^\//, "").replace(/\/$/, "");
        if (slug) tools.set(slug, {
          name: get("name"),
          description: get("description"),
          collections: getArr("collections"),
        });
        current = "";
        continue;
      } }
      if (depth >= 1) current += c;
    }
  }
  return { cols, tools };
}

function transform(src, { slug, name, description, collection, collectionHref }) {
  if (src.includes("@/lib/json-ld") || src.includes('from "@/lib/json-ld"')) {
    return null; // already wired
  }
  let next = src;

  // 1. Add import after the first existing import line
  const firstImport = next.match(/^import [^\n]+\n/m);
  if (firstImport) {
    next = next.replace(firstImport[0], firstImport[0] + `import { JsonLd, softwareLd } from "@/lib/json-ld";\n`);
  } else {
    next = `import { JsonLd, softwareLd } from "@/lib/json-ld";\n` + next;
  }

  // 2. Add openGraph.images if missing
  const ogUrl = `${SITE}/og/${slug}.svg`;
  // Match an `openGraph: { ... }` object (top-level inside metadata).
  next = next.replace(/openGraph:\s*\{([^}]*)\}/m, (m, inner) => {
    if (/images\s*:/m.test(inner)) return m;
    const trimmed = inner.replace(/,\s*$/, "");
    return `openGraph: {${trimmed},\n    images: [{ url: "${ogUrl}", width: 1200, height: 630 }]\n  }`;
  });

  // 3. Add twitter.images + force summary_large_image card
  next = next.replace(/twitter:\s*\{([^}]*)\}/m, (m, inner) => {
    let updated = inner;
    if (!/images\s*:/m.test(updated)) {
      updated = updated.replace(/,?\s*$/, "");
      updated += `,\n    images: ["${ogUrl}"]`;
    }
    if (/card\s*:\s*"summary"/.test(updated)) {
      updated = updated.replace(/card\s*:\s*"summary"/, 'card: "summary_large_image"');
    } else if (!/card\s*:/.test(updated)) {
      updated += `,\n    card: "summary_large_image"`;
    }
    return `twitter: {${updated}\n  }`;
  });

  // 4. Wrap return (children) in fragment with JsonLd component
  // Match the typical Layout body: `return children;` (function body) and replace it.
  const ldArg = JSON.stringify({
    slug,
    name,
    description,
    ...(collection ? { collection } : {}),
    ...(collectionHref ? { collectionHref } : {}),
  });
  // Replace either `return children;` or `return <>{children}</>;`
  next = next.replace(/return children;/, `return (\n    <>\n      <JsonLd data={softwareLd(${ldArg})} />\n      {children}\n    </>\n  );`);
  next = next.replace(/return\s*\(\s*<>\s*\{children\}\s*<\/>\s*\);?/, `return (\n    <>\n      <JsonLd data={softwareLd(${ldArg})} />\n      {children}\n    </>\n  );`);

  return next;
}

async function main() {
  const { cols, tools } = await loadToolMap();
  const entries = await readdir(APP, { withFileTypes: true });
  let updated = 0, skipped = 0, missing = 0;
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (SKIP.has(e.name)) continue;
    const slug = e.name;
    const layoutPath = join(APP, slug, "layout.tsx");
    let src;
    try { src = await readFile(layoutPath, "utf8"); }
    catch { continue; } // no layout — skip
    const tool = tools.get(slug);
    if (!tool) {
      // Likely a kit page or non-tool route — skip with warning
      console.log(`  skip ${slug}: not in tools manifest`);
      missing++;
      continue;
    }
    const colId = (tool.collections || [])[0];
    const col = colId ? cols.get(colId) : null;
    const next = transform(src, {
      slug,
      name: tool.name,
      description: tool.description,
      collection: col?.title,
      collectionHref: col?.href,
    });
    if (next == null) { skipped++; continue; }
    await writeFile(layoutPath, next);
    console.log(`  wrote ${slug}/layout.tsx`);
    updated++;
  }
  console.log(`\nwire-tool-jsonld: ${updated} updated, ${skipped} already wired, ${missing} not in manifest`);
}
main().catch((e) => { console.error(e); process.exit(1); });
