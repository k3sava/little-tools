import * as cheerio from "cheerio";
import * as fs from "fs";
import * as path from "path";

type CheerioAPI = ReturnType<typeof cheerio.load>;

// Resolve demos directory — works locally and on Vercel
function getLocalDemosDir(): string | null {
  // Local dev: demos/ in repo root
  const local = path.resolve(process.cwd(), "../demos");
  if (fs.existsSync(local)) return local;
  // Fallback: check if we're in the web/ directory
  const alt = path.resolve(process.cwd(), "../../demos");
  if (fs.existsSync(alt)) return alt;
  return null;
}

function getTmpDemosDir(): string {
  const dir = "/tmp/demokit-captures";
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function getDemosDirs(): string[] {
  const dirs: string[] = [];
  const local = getLocalDemosDir();
  if (local) dirs.push(local);
  const tmp = getTmpDemosDir();
  if (tmp !== local) dirs.push(tmp);
  return dirs;
}

export function getWritableDemosDir(): string {
  // Prefer local demos/ if it exists (local dev)
  const local = getLocalDemosDir();
  if (local) {
    try {
      fs.accessSync(local, fs.constants.W_OK);
      return local;
    } catch {
      // Not writable, fall through
    }
  }
  return getTmpDemosDir();
}

export function findCaptureDir(name: string): string | null {
  for (const dir of getDemosDirs()) {
    const captureDir = path.join(dir, name);
    if (
      fs.existsSync(captureDir) &&
      fs.existsSync(path.join(captureDir, "template.html"))
    ) {
      return captureDir;
    }
  }
  return null;
}

// --- Inlining ---

async function fetchAsDataUri(
  url: string
): Promise<{ dataUri: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { "User-Agent": "DemoKit/1.0" },
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mimeType =
      res.headers.get("content-type") || "application/octet-stream";
    const base64 = buffer.toString("base64");
    return { dataUri: `data:${mimeType};base64,${base64}`, mimeType };
  } catch {
    return null;
  }
}

function resolveUrl(href: string, baseUrl: string): string {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

async function resolveAndInlineCssUrls(
  css: string,
  baseUrl: string
): Promise<string> {
  const urlPattern = /url\(\s*['"]?([^'")]+)['"]?\s*\)/g;
  const matches: { full: string; url: string }[] = [];
  let match;
  while ((match = urlPattern.exec(css)) !== null) {
    const url = match[1];
    if (!url.startsWith("data:")) {
      matches.push({ full: match[0], url });
    }
  }
  let result = css;
  for (const m of matches) {
    const fullUrl = resolveUrl(m.url, baseUrl);
    const fetched = await fetchAsDataUri(fullUrl);
    if (fetched) {
      result = result.replace(m.full, `url(${fetched.dataUri})`);
    }
  }
  return result;
}

async function inlineStylesheets(
  $: CheerioAPI,
  baseUrl: string
): Promise<void> {
  const links = $('link[rel="stylesheet"]').toArray();
  for (const link of links) {
    const href = $(link).attr("href");
    if (!href) continue;
    const fullUrl = resolveUrl(href, baseUrl);
    try {
      const res = await fetch(fullUrl, {
        signal: AbortSignal.timeout(10000),
        headers: { "User-Agent": "DemoKit/1.0" },
      });
      if (!res.ok) continue;
      let css = await res.text();
      css = await resolveAndInlineCssUrls(css, fullUrl);
      $(link).before(`<style>${css}</style>`);
    } catch {
      // keep link if fetch fails
    }
  }
}

async function inlineImages($: CheerioAPI, baseUrl: string): Promise<void> {
  const imgs = $("img[src]").toArray();
  for (const img of imgs) {
    const src = $(img).attr("src");
    if (!src || src.startsWith("data:")) continue;
    const fullUrl = resolveUrl(src, baseUrl);
    const result = await fetchAsDataUri(fullUrl);
    if (result) {
      $(img).attr("src", result.dataUri);
    }
  }
}

async function inlineCssBackgroundImages(
  $: CheerioAPI,
  baseUrl: string
): Promise<void> {
  const elements = $("[style]").toArray();
  for (const el of elements) {
    const style = $(el).attr("style");
    if (!style || !style.includes("url(")) continue;
    const newStyle = await resolveAndInlineCssUrls(style, baseUrl);
    $(el).attr("style", newStyle);
  }
}

async function inlineFontsInStyles(
  $: CheerioAPI,
  baseUrl: string
): Promise<void> {
  const styles = $("style").toArray();
  for (const style of styles) {
    const css = $(style).html();
    if (!css || !css.includes("url(")) continue;
    const newCss = await resolveAndInlineCssUrls(css, baseUrl);
    $(style).html(newCss);
  }
}

export async function inlineResources(
  html: string,
  baseUrl: string,
  options: { stripScripts?: boolean } = {}
): Promise<string> {
  const { stripScripts = true } = options;
  const $ = cheerio.load(html);

  await inlineStylesheets($, baseUrl);
  await inlineImages($, baseUrl);
  await inlineCssBackgroundImages($, baseUrl);
  await inlineFontsInStyles($, baseUrl);

  if (stripScripts) {
    $("script").remove();
  }

  $('link[rel="stylesheet"]').remove();

  return $.html();
}

// --- Manifest ---

export interface Variable {
  key: string;
  type: "text" | "image" | "link" | "number" | "date";
  selector: string;
  default: string;
}

export interface VariableManifest {
  variables: Variable[];
}

export function generateManifest(html: string): VariableManifest {
  const $ = cheerio.load(html);
  const variables: Variable[] = [];

  $("[data-dk-var]").each((_, el) => {
    const $el = $(el);
    const key = $el.attr("data-dk-var")!;
    const type = ($el.attr("data-dk-type") as Variable["type"]) || "text";
    const tag = (el as unknown as { tagName?: string }).tagName?.toLowerCase();

    let defaultValue: string;
    switch (type) {
      case "image":
        defaultValue = $el.attr("src") || "";
        break;
      case "link":
        defaultValue = $el.attr("href") || "";
        break;
      default:
        defaultValue = $el.text();
    }

    const selector = `${tag}[data-dk-var='${key}']`;
    variables.push({ key, type, selector, default: defaultValue });
  });

  return { variables };
}

// --- Annotate ---

export function annotateHtml(
  html: string,
  annotations: { selector: string; key: string; type: string }[]
): string {
  const $ = cheerio.load(html);

  for (const ann of annotations) {
    const $el = $(ann.selector);
    if ($el.length > 0) {
      $el.attr("data-dk-var", ann.key);
      $el.attr("data-dk-type", ann.type);
    }
  }

  return $.html();
}

// --- Save capture ---

export async function saveCapture(
  name: string,
  html: string
): Promise<string> {
  const demosDir = getWritableDemosDir();
  const captureDir = path.join(demosDir, name);

  fs.mkdirSync(captureDir, { recursive: true });
  fs.mkdirSync(path.join(captureDir, "personas"), { recursive: true });
  fs.mkdirSync(path.join(captureDir, "rendered"), { recursive: true });

  fs.writeFileSync(path.join(captureDir, "template.html"), html);

  const manifest = generateManifest(html);
  fs.writeFileSync(
    path.join(captureDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  return captureDir;
}
