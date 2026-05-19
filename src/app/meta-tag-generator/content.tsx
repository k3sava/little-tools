"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle, Select } from "@/components/tools/controls";

// --- Character limit helpers ---

type CharStatus = "green" | "yellow" | "red";

function charStatus(current: number, max: number): CharStatus {
  const ratio = current / max;
  if (ratio > 1) return "red";
  if (ratio >= 0.8) return "yellow";
  return "green";
}

function statusColor(status: CharStatus): string {
  if (status === "red") return "#ef4444";
  if (status === "yellow") return "#eab308";
  return "#22c55e";
}

function statusBg(status: CharStatus): string {
  if (status === "red") return "rgba(239,68,68,0.12)";
  if (status === "yellow") return "rgba(234,179,8,0.12)";
  return "rgba(34,197,94,0.12)";
}

const ACCENT = "#3b82f6";

// --- Meta tag generation ---

function generateMetaTags(fields: {
  title: string;
  description: string;
  url: string;
  image: string;
  siteName: string;
  twitterHandle: string;
  ogType: string;
  robots: string;
  includeViewport: boolean;
  locale: string;
}): string {
  const lines: string[] = [];

  if (fields.title) lines.push(`<title>${esc(fields.title)}</title>`);
  if (fields.description) lines.push(`<meta name="description" content="${esc(fields.description)}" />`);
  if (fields.robots) lines.push(`<meta name="robots" content="${esc(fields.robots)}" />`);
  if (fields.includeViewport)
    lines.push(`<meta name="viewport" content="width=device-width, initial-scale=1" />`);

  lines.push("");
  lines.push("<!-- Open Graph -->");
  if (fields.title) lines.push(`<meta property="og:title" content="${esc(fields.title)}" />`);
  if (fields.description) lines.push(`<meta property="og:description" content="${esc(fields.description)}" />`);
  if (fields.url) lines.push(`<meta property="og:url" content="${esc(fields.url)}" />`);
  if (fields.image) lines.push(`<meta property="og:image" content="${esc(fields.image)}" />`);
  lines.push(`<meta property="og:type" content="${esc(fields.ogType)}" />`);
  if (fields.siteName) lines.push(`<meta property="og:site_name" content="${esc(fields.siteName)}" />`);
  if (fields.locale) lines.push(`<meta property="og:locale" content="${esc(fields.locale)}" />`);

  lines.push("");
  lines.push("<!-- Twitter Card -->");
  lines.push(`<meta name="twitter:card" content="summary_large_image" />`);
  if (fields.title) lines.push(`<meta name="twitter:title" content="${esc(fields.title)}" />`);
  if (fields.description) lines.push(`<meta name="twitter:description" content="${esc(fields.description)}" />`);
  if (fields.image) lines.push(`<meta name="twitter:image" content="${esc(fields.image)}" />`);
  if (fields.twitterHandle) {
    const handle = fields.twitterHandle.startsWith("@") ? fields.twitterHandle : `@${fields.twitterHandle}`;
    lines.push(`<meta name="twitter:site" content="${esc(handle)}" />`);
  }

  return lines.filter((l) => l !== undefined).join("\n");
}

function esc(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str;
  return str.slice(0, max - 3) + "...";
}

function getDomain(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname;
  } catch {
    return url || "example.com";
  }
}

function getBreadcrumbUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    const parts = [u.hostname, ...u.pathname.split("/").filter(Boolean)];
    return parts.join(" > ");
  } catch {
    return url || "example.com";
  }
}

// --- Character count progress bar ---

function CharProgress({ current, max, label }: { current: number; max: number; label: string }) {
  const status = charStatus(current, max);
  const pct = Math.min(100, (current / max) * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: "var(--kami-text-muted)" }}>{label}</span>
        <span
          className="tabular-nums px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ color: statusColor(status), background: statusBg(status) }}
        >
          {current}/{max}
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--kami-border)" }}>
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: statusColor(status),
            transition: "width 0.2s ease",
          }}
        />
      </div>
    </div>
  );
}

// --- SERP Previews ---

function GoogleDesktopPreview({ title, description, url }: { title: string; description: string; url: string }) {
  const displayTitle = title || "Page Title";
  const displayDesc = description || "Add a meta description to see how it appears in search results.";
  const breadcrumb = getBreadcrumbUrl(url);

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--kami-border)", background: "#fff" }}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
        Google Desktop
      </div>
      <div style={{ maxWidth: 600, fontFamily: "Arial, sans-serif" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: "#f1f3f4" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#70757a" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <div className="text-sm leading-tight" style={{ color: "#202124" }}>{getDomain(url) || "example.com"}</div>
            <div className="text-xs" style={{ color: "#4d5156" }}>{breadcrumb || "example.com"}</div>
          </div>
        </div>
        <div
          className="text-lg leading-snug"
          style={{ color: "#1a0dab", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 580 }}
        >
          {truncate(displayTitle, 60)}
        </div>
        <div
          className="mt-1 text-sm leading-relaxed"
          style={{ color: "#4d5156", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {truncate(displayDesc, 160)}
        </div>
      </div>
    </div>
  );
}

function GoogleMobilePreview({ title, description, url }: { title: string; description: string; url: string }) {
  const displayTitle = title || "Page Title";
  const displayDesc = description || "Add a meta description to see how it appears in search results.";

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--kami-border)", background: "#fff" }}>
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
        Google Mobile
      </div>
      <div style={{ maxWidth: 360, fontFamily: "Arial, sans-serif" }}>
        <div className="text-xs" style={{ color: "#202124" }}>{getDomain(url) || "example.com"}</div>
        <div
          className="text-base leading-snug mt-0.5"
          style={{ color: "#1a0dab", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}
        >
          {truncate(displayTitle, 60)}
        </div>
        <div
          className="mt-1 text-xs leading-relaxed"
          style={{ color: "#4d5156", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {truncate(displayDesc, 160)}
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({ title, description, image, siteName }: { title: string; description: string; image: string; siteName: string }) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--kami-border)", background: "#fff" }}>
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
        Facebook / OG
      </div>
      <div className="mx-4 mb-4 rounded-lg overflow-hidden" style={{ maxWidth: 500, border: "1px solid #dadde1" }}>
        <div
          className="flex items-center justify-center"
          style={{
            aspectRatio: "1200/630",
            background: image ? undefined : "#f0f2f5",
            backgroundImage: image ? `url(${image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!image && (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>
        <div className="px-3 py-2.5" style={{ background: "#f0f2f5" }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: "#65676b" }}>{siteName || "example.com"}</div>
          <div className="mt-0.5 text-base font-bold leading-tight" style={{ color: "#1c1e21" }}>{truncate(title || "Page Title", 65)}</div>
          <div className="mt-0.5 text-sm leading-snug" style={{ color: "#65676b" }}>{truncate(description || "Page description will appear here.", 100)}</div>
        </div>
      </div>
    </div>
  );
}

function TwitterPreview({ title, description, image, url }: { title: string; description: string; image: string; url: string }) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--kami-border)", background: "#fff" }}>
      <div className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "#6b7280" }}>
        Twitter / X Card
      </div>
      <div className="mx-4 mb-4 rounded-xl overflow-hidden" style={{ maxWidth: 500, border: "1px solid #cfd9de" }}>
        <div
          className="flex items-center justify-center"
          style={{
            aspectRatio: "2/1",
            background: image ? undefined : "#f0f2f5",
            backgroundImage: image ? `url(${image})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {!image && (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>
        <div className="px-3 py-2.5" style={{ borderTop: "1px solid #cfd9de" }}>
          <div className="text-sm font-bold leading-tight" style={{ color: "#0f1419" }}>{truncate(title || "Page Title", 70)}</div>
          <div className="mt-0.5 text-sm leading-snug" style={{ color: "#536471" }}>{truncate(description || "Page description will appear here.", 125)}</div>
          <div className="mt-1 text-xs" style={{ color: "#536471" }}>{getDomain(url) || "example.com"}</div>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---

const LOCALES = [
  { value: "en_US", label: "English (US)" },
  { value: "en_GB", label: "English (UK)" },
  { value: "es_ES", label: "Spanish" },
  { value: "fr_FR", label: "French" },
  { value: "de_DE", label: "German" },
  { value: "ja_JP", label: "Japanese" },
  { value: "zh_CN", label: "Chinese (Simplified)" },
  { value: "pt_BR", label: "Portuguese (Brazil)" },
];

export default function MetaTagGeneratorContent() {
  const [state, setToolState] = useToolState({
    title: "",
    description: "",
    url: "",
  });

  const [image, setImage] = useState("");
  const [siteName, setSiteName] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [ogType, setOgType] = useState<"website" | "article" | "product">("website");
  const [robots, setRobots] = useState("index, follow");
  const [includeViewport, setIncludeViewport] = useState(true);
  const [locale, setLocale] = useState("en_US");
  const [copied, setCopied] = useState(false);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
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

  const title = state.title;
  const description = state.description;
  const url = state.url;

  const setTitle = useCallback((v: string) => setToolState({ title: v }), [setToolState]);
  const setDescription = useCallback((v: string) => setToolState({ description: v }), [setToolState]);
  const setUrl = useCallback((v: string) => setToolState({ url: v }), [setToolState]);

  const metaTags = useMemo(
    () =>
      generateMetaTags({
        title,
        description,
        url,
        image,
        siteName,
        twitterHandle,
        ogType,
        robots,
        includeViewport,
        locale,
      }),
    [title, description, url, image, siteName, twitterHandle, ogType, robots, includeViewport, locale],
  );

  // OG image dimension probe
  const handleImageChange = useCallback((v: string) => {
    setImage(v);
    setImageWarning(null);
    if (!v) return;
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      const ideal = 1200 / 630;
      if (img.width < 1200) setImageWarning(`Image is ${img.width}×${img.height} — under 1200×630.`);
      else if (Math.abs(ratio - ideal) > 0.1) setImageWarning(`Aspect ratio ${ratio.toFixed(2)} — ideal is 1.91 (1200×630).`);
    };
    img.onerror = () => setImageWarning("Could not load image.");
    img.src = v;
  }, []);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(metaTags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [metaTags]);

  const handleClear = useCallback(() => {
    setToolState({ title: "", description: "", url: "" });
    setImage("");
    setSiteName("");
    setTwitterHandle("");
    setOgType("website");
    setRobots("index, follow");
    setIncludeViewport(true);
  }, [setToolState]);

  const handleFillExample = useCallback(() => {
    setToolState({
      title: "How to Build a Landing Page That Converts in 2024",
      description: "Learn proven strategies for creating high-converting landing pages. Step-by-step guide with real examples, templates, and optimization tips.",
      url: "https://example.com/blog/landing-page-guide",
    });
    setImage("https://example.com/images/landing-page-og.jpg");
    setSiteName("Example Blog");
    setTwitterHandle("@exampleblog");
    setOgType("article");
  }, [setToolState]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "Enter", meta: true, action: handleCopy, label: "Copy Tags" },
        { key: "k", meta: true, action: handleClear, label: "Clear All" },
      ],
      [handleCopy, handleClear],
    ),
  );

  const inputStyle: React.CSSProperties = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  };

  const controls = (
    <>
      <ControlGroup label="Page type">
        <Segment
          value={ogType}
          onChange={setOgType}
          options={[
            { value: "website", label: "Website" },
            { value: "article", label: "Article" },
            { value: "product", label: "Product" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Robots">
        <Select
          value={robots}
          onChange={setRobots}
          options={[
            { value: "index, follow", label: "index, follow" },
            { value: "noindex, follow", label: "noindex, follow" },
            { value: "index, nofollow", label: "index, nofollow" },
            { value: "noindex, nofollow", label: "noindex, nofollow" },
          ]}
        />
      </ControlGroup>
      <ControlGroup label="Locale">
        <Select value={locale} onChange={setLocale} options={LOCALES} />
      </ControlGroup>
      <ControlGroup label="Site name">
        <input
          type="text"
          value={siteName}
          onChange={(e) => setSiteName(e.target.value)}
          placeholder="My Website"
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </ControlGroup>
      <ControlGroup label="Twitter handle">
        <input
          type="text"
          value={twitterHandle}
          onChange={(e) => setTwitterHandle(e.target.value)}
          placeholder="@yourhandle"
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
      </ControlGroup>
      <ControlGroup label="OG image URL">
        <input
          type="text"
          value={image}
          onChange={(e) => handleImageChange(e.target.value)}
          placeholder="https://example.com/og.jpg"
          className="w-full px-3 py-2 text-sm focus:outline-none"
          style={inputStyle}
        />
        {imageWarning && (
          <p className="text-xs mt-1" style={{ color: "#eab308" }}>
            {imageWarning}
          </p>
        )}
      </ControlGroup>
      <ControlGroup label="Extras">
        <Toggle checked={includeViewport} onChange={setIncludeViewport} label="Viewport meta tag" />
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={handleFillExample}>
        Example
      </ToolActionButton>
      <ToolActionButton variant="outline" onClick={handleClear}>
        Reset
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={handleCopy}>
        {copied ? "Copied" : "Copy HTML"}
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
      <p>Build SEO-ready meta tags with live SERP, Twitter, and Facebook previews. Character bars turn yellow near truncation and red when over.</p>
      <p><strong>OG image:</strong> ideal 1200×630, under 5MB, PNG or JPG. Twitter falls back to OG tags for most fields.</p>
      <p><strong>Note:</strong> Google rewrites titles ~60% of the time based on query relevance — treat the title as a hint.</p>
    </div>
  );

  return (
    <ToolShell
      title="Meta Tag Generator"
      tagline="Live SERP + social previews · char limits · OG image checks"
      accent={ACCENT}
      materialFab={{ label: "Copy tags", onClick: handleCopy }}
      actions={actions}
      controls={controls}
      info={info}
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Settings</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Tags</button>
        </nav>
      )}
      <div className="flex flex-col gap-5 p-4 md:p-6">
        {/* Inputs */}
        {(!isMetro || metroCPivot === "input") && (
        <>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <div>
              <CharProgress current={title.length} max={60} label="Title" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your page title"
                className="mt-1.5 w-full px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <CharProgress current={description.length} max={160} label="Description" />
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of the page content"
                rows={3}
                className="mt-1.5 w-full px-3 py-2 text-sm focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: "var(--kami-text-muted)" }}>URL</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <GoogleDesktopPreview title={title} description={description} url={url} />
            <GoogleMobilePreview title={title} description={description} url={url} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FacebookPreview title={title} description={description} image={image} siteName={siteName} />
          <TwitterPreview title={title} description={description} image={image} url={url} />
        </div>
        </>
        )}

        {/* Generated HTML */}
        {(!isMetro || metroCPivot === "output") && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wide" style={{ color: ACCENT }}>
              Generated meta tags
            </span>
          </div>
          <pre
            className="overflow-x-auto rounded-xl p-4 text-xs leading-relaxed"
            style={{
              background: "var(--kami-overlay-bg)",
              color: "var(--kami-overlay-text)",
              border: "1px solid var(--kami-border-strong)",
            }}
          >
            <code>{metaTags}</code>
          </pre>
        </div>
        )}
      </div>
    </ToolShell>
  );
}
