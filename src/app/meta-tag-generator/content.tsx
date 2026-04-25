"use client";

import { useState, useMemo, useCallback } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ReferencePanel, RuleRow } from "@/components/tools/reference-panel";

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
}): string {
  const lines: string[] = [];

  if (fields.title) {
    lines.push(`<title>${esc(fields.title)}</title>`);
  }
  if (fields.description) {
    lines.push(`<meta name="description" content="${esc(fields.description)}" />`);
  }
  if (fields.robots) {
    lines.push(`<meta name="robots" content="${esc(fields.robots)}" />`);
  }
  if (fields.includeViewport) {
    lines.push(`<meta name="viewport" content="width=device-width, initial-scale=1" />`);
  }

  lines.push("");
  lines.push("<!-- Open Graph -->");
  if (fields.title) lines.push(`<meta property="og:title" content="${esc(fields.title)}" />`);
  if (fields.description) lines.push(`<meta property="og:description" content="${esc(fields.description)}" />`);
  if (fields.url) lines.push(`<meta property="og:url" content="${esc(fields.url)}" />`);
  if (fields.image) lines.push(`<meta property="og:image" content="${esc(fields.image)}" />`);
  lines.push(`<meta property="og:type" content="${esc(fields.ogType)}" />`);
  if (fields.siteName) lines.push(`<meta property="og:site_name" content="${esc(fields.siteName)}" />`);

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

// --- Inline SVG Icons ---

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// --- Character count badge ---

function CharBadge({ current, max }: { current: number; max: number }) {
  const status = charStatus(current, max);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium tabular-nums"
      style={{
        color: statusColor(status),
        backgroundColor: statusBg(status),
      }}
    >
      {current}/{max}
    </span>
  );
}

// --- SERP Previews ---

function GoogleDesktopPreview({ title, description, url }: { title: string; description: string; url: string }) {
  const displayTitle = title || "Page Title";
  const displayDesc = description || "Add a meta description to see how it appears in search results.";
  const breadcrumb = getBreadcrumbUrl(url);

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--kami-card-border, #e5e7eb)", background: "white" }}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kami-text-muted, #6b7280)" }}>
        Google Desktop
      </div>
      <div style={{ maxWidth: 600, fontFamily: "Arial, sans-serif" }}>
        {/* Breadcrumb URL */}
        <div className="flex items-center gap-1.5 mb-1">
          <div className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full" style={{ background: "#f1f3f4" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#70757a" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="#70757a" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="text-sm leading-tight" style={{ color: "#202124" }}>{getDomain(url) || "example.com"}</div>
            <div className="text-xs" style={{ color: "#4d5156" }}>{breadcrumb || "example.com"}</div>
          </div>
        </div>
        {/* Title */}
        <div
          className="text-xl leading-snug cursor-pointer hover:underline"
          style={{
            color: "#1a0dab",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 580,
          }}
        >
          {truncate(displayTitle, 60)}
        </div>
        {/* Description */}
        <div
          className="mt-1 text-sm leading-relaxed"
          style={{
            color: "#4d5156",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {truncate(displayDesc, 160)}
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <CharBadge current={title.length} max={60} />
        <CharBadge current={description.length} max={160} />
      </div>
    </div>
  );
}

function GoogleMobilePreview({ title, description, url }: { title: string; description: string; url: string }) {
  const displayTitle = title || "Page Title";
  const displayDesc = description || "Add a meta description to see how it appears in search results.";

  return (
    <div className="rounded-lg border p-4" style={{ borderColor: "var(--kami-card-border, #e5e7eb)", background: "white" }}>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kami-text-muted, #6b7280)" }}>
        Google Mobile
      </div>
      <div style={{ maxWidth: 360, fontFamily: "Arial, sans-serif" }}>
        <div className="flex items-center gap-1.5 mb-1">
          <div className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full" style={{ background: "#f1f3f4" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="#70757a" strokeWidth="1.5" />
              <path d="M12 6v6l4 2" stroke="#70757a" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-xs" style={{ color: "#202124" }}>{getDomain(url) || "example.com"}</div>
        </div>
        <div
          className="text-base leading-snug"
          style={{
            color: "#1a0dab",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 340,
          }}
        >
          {truncate(displayTitle, 60)}
        </div>
        <div
          className="mt-1 text-xs leading-relaxed"
          style={{
            color: "#4d5156",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {truncate(displayDesc, 160)}
        </div>
      </div>
    </div>
  );
}

function FacebookPreview({
  title,
  description,
  image,
  siteName,
}: {
  title: string;
  description: string;
  image: string;
  siteName: string;
}) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--kami-card-border, #e5e7eb)", background: "white" }}>
      <div className="px-4 pt-3 pb-1">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kami-text-muted, #6b7280)" }}>
          Facebook / Open Graph
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-lg overflow-hidden" style={{ maxWidth: 500, fontFamily: "Helvetica, Arial, sans-serif", border: "1px solid #dadde1" }}>
        {/* Image placeholder */}
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
        {/* Text content */}
        <div className="px-3 py-2.5" style={{ background: "#f0f2f5" }}>
          <div className="text-xs uppercase tracking-wide" style={{ color: "#65676b" }}>
            {siteName || "example.com"}
          </div>
          <div className="mt-0.5 text-base font-bold leading-tight" style={{ color: "#1c1e21" }}>
            {truncate(title || "Page Title", 65)}
          </div>
          <div className="mt-0.5 text-sm leading-snug" style={{ color: "#65676b" }}>
            {truncate(description || "Page description will appear here.", 100)}
          </div>
        </div>
      </div>
    </div>
  );
}

function TwitterPreview({
  title,
  description,
  image,
  url,
}: {
  title: string;
  description: string;
  image: string;
  url: string;
}) {
  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--kami-card-border, #e5e7eb)", background: "white" }}>
      <div className="px-4 pt-3 pb-1">
        <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kami-text-muted, #6b7280)" }}>
          Twitter / X Card
        </div>
      </div>
      <div className="mx-4 mb-4 rounded-xl overflow-hidden" style={{ maxWidth: 500, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", border: "1px solid #cfd9de" }}>
        {/* Image (2:1 ratio) */}
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
        {/* Text */}
        <div className="px-3 py-2.5" style={{ borderTop: "1px solid #cfd9de" }}>
          <div className="text-sm font-bold leading-tight" style={{ color: "#0f1419" }}>
            {truncate(title || "Page Title", 70)}
          </div>
          <div className="mt-0.5 text-sm leading-snug" style={{ color: "#536471" }}>
            {truncate(description || "Page description will appear here.", 125)}
          </div>
          <div className="mt-1 text-xs" style={{ color: "#536471" }}>
            {getDomain(url) || "example.com"}
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main component ---

export default function MetaTagGeneratorContent() {
  const [state, setToolState] = useToolState({
    title: "",
    description: "",
    url: "",
  });

  const [image, setImage] = useState("");
  const [siteName, setSiteName] = useState("");
  const [twitterHandle, setTwitterHandle] = useState("");
  const [ogType, setOgType] = useState("website");
  const [robots, setRobots] = useState("index, follow");
  const [includeViewport, setIncludeViewport] = useState(true);
  const [copied, setCopied] = useState(false);

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
      }),
    [title, description, url, image, siteName, twitterHandle, ogType, robots, includeViewport],
  );

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
      description: "Learn the proven strategies for creating high-converting landing pages. Step-by-step guide with real examples, templates, and optimization tips.",
      url: "https://example.com/blog/landing-page-guide",
    });
    setImage("https://example.com/images/landing-page-og.jpg");
    setSiteName("Example Blog");
    setTwitterHandle("@exampleblog");
    setOgType("article");
    setRobots("index, follow");
    setIncludeViewport(true);
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

  return (
    <div style={{ color: "var(--kami-text, #111)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Meta Tag Generator"
          tagline="Build SEO-ready title, description, Open Graph, and Twitter card tags with live Google, Facebook, and Twitter previews."
          description="Fill in title, description, and URL (plus an optional image) and we generate every meta tag you need, plus live SERP previews for Google (desktop + mobile), Facebook, and Twitter. Character counters flash yellow when you're approaching the truncation limit and red when you're over."
          audience={["SEOs", "Content marketers", "Developers", "PMMs"]}
          whenToUse={[
            "Shipping a new page or blog post",
            "Auditing meta tags for an existing page",
            "Getting an OG image to preview correctly on Slack or Twitter",
          ]}
          quickLinks={[
            { label: "SEO character limits", href: "#seo-limits" },
            { label: "OG vs Twitter cards", href: "#og-twitter-diff" },
          ]}
        /><div className="text-center">
          <button
            onClick={handleFillExample}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
            style={{
              border: "1px dashed var(--kami-border-strong, #333)",
              color: "var(--kami-text-muted, #6b7280)",
            }}
          >
            Try example
          </button>
        </div>

        {/* Two-column layout */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left: Inputs */}
          <div className="flex flex-col gap-4">
            {/* Title */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                  Title
                </label>
                <CharBadge current={title.length} max={60} />
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Your page title"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                style={{
                  background: "var(--kami-input-bg, white)",
                  borderColor: "var(--kami-input-border, #d1d5db)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  caretColor: "var(--kami-caret, #111)",
                }}
              />
            </div>

            {/* Description */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                  Description
                </label>
                <CharBadge current={description.length} max={160} />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of the page content"
                rows={3}
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 resize-none"
                style={{
                  background: "var(--kami-input-bg, white)",
                  borderColor: "var(--kami-input-border, #d1d5db)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  caretColor: "var(--kami-caret, #111)",
                }}
              />
            </div>

            {/* URL */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/page"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                style={{
                  background: "var(--kami-input-bg, white)",
                  borderColor: "var(--kami-input-border, #d1d5db)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  caretColor: "var(--kami-caret, #111)",
                }}
              />
            </div>

            {/* Image URL */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                Image URL
              </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/og-image.jpg"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                style={{
                  background: "var(--kami-input-bg, white)",
                  borderColor: "var(--kami-input-border, #d1d5db)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  caretColor: "var(--kami-caret, #111)",
                }}
              />
            </div>

            {/* Site Name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                Site Name
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="My Website"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                style={{
                  background: "var(--kami-input-bg, white)",
                  borderColor: "var(--kami-input-border, #d1d5db)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  caretColor: "var(--kami-caret, #111)",
                }}
              />
            </div>

            {/* Twitter Handle */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                Twitter Handle <span style={{ color: "var(--kami-text-muted, #9ca3af)" }}>(optional)</span>
              </label>
              <input
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value)}
                placeholder="@yourhandle"
                className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
                style={{
                  background: "var(--kami-input-bg, white)",
                  borderColor: "var(--kami-input-border, #d1d5db)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  caretColor: "var(--kami-caret, #111)",
                }}
              />
            </div>

            {/* OG Type */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                Type
              </label>
              <div className="flex items-center gap-1.5 rounded-lg border p-0.5" style={{ borderColor: "var(--kami-input-border, #d1d5db)" }}>
                {(["website", "article", "product"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setOgType(type)}
                    className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      ogType === type
                        ? "shadow-sm"
                        : ""
                    }`}
                    style={{
                      background: ogType === type ? "var(--kami-surface-solid, white)" : "transparent",
                      color: ogType === type ? "var(--kami-text, #111)" : "var(--kami-text-muted, #6b7280)",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Robots */}
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                Robots
              </label>
              <div className="flex items-center gap-1.5 rounded-lg border p-0.5" style={{ borderColor: "var(--kami-input-border, #d1d5db)" }}>
                {(["index, follow", "noindex, follow", "index, nofollow", "noindex, nofollow"] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setRobots(opt)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                      robots === opt ? "shadow-sm" : ""
                    }`}
                    style={{
                      background: robots === opt ? "var(--kami-surface-solid, white)" : "transparent",
                      color: robots === opt ? "var(--kami-text, #111)" : "var(--kami-text-muted, #6b7280)",
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Viewport */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIncludeViewport(!includeViewport)}
                className="relative flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
                style={{
                  background: includeViewport ? "var(--kami-surface-solid, #111)" : "var(--kami-input-border, #d1d5db)",
                }}
              >
                <span
                  className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
                  style={{
                    transform: includeViewport ? "translateX(17px)" : "translateX(3px)",
                  }}
                />
              </button>
              <label className="text-sm font-medium" style={{ color: "var(--kami-text, #111)" }}>
                Include viewport meta tag
              </label>
            </div>

            {/* Clear button */}
            <div className="flex justify-end">
              <button
                onClick={handleClear}
                className="text-sm transition-colors"
                style={{ color: "var(--kami-text-muted, #6b7280)" }}
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Right: Previews */}
          <div className="flex flex-col gap-4">
            <GoogleDesktopPreview title={title} description={description} url={url} />
            <GoogleMobilePreview title={title} description={description} url={url} />
            <FacebookPreview title={title} description={description} image={image} siteName={siteName} />
            <TwitterPreview title={title} description={description} image={image} url={url} />
          </div>
        </div>

        {/* Output: Generated HTML */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold" style={{ color: "var(--kami-text, #111)" }}>
              Generated Meta Tags
            </h2>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              style={{
                background: "var(--kami-surface-solid, #111)",
                color: "white",
                border: "1px solid var(--kami-border-strong, #333)",
              }}
            >
              {copied ? (
                <>
                  <CheckIcon />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon />
                  Copy HTML
                </>
              )}
            </button>
          </div>
          <pre
            className="overflow-x-auto rounded-lg border p-4 text-sm leading-relaxed"
            style={{
              background: "var(--kami-input-bg, #fafafa)",
              borderColor: "var(--kami-card-border, #e5e7eb)",
              color: "var(--kami-text, #111)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <code>{metaTags}</code>
          </pre>
        </div>

        <ReferencePanel
          id="seo-limits"
          title="SEO character limits you'll actually see enforced"
          summary="Google and social networks truncate. Here's where."
          defaultOpen
        >
          <div className="space-y-1">
            <RuleRow rule="Meta title" explanation="Google cuts off around 600 pixels (~55–60 chars)." example="50–60 chars is safe" />
            <RuleRow rule="Meta description" explanation="Google shows ~155–160 chars on desktop, ~120 on mobile." example="Aim for <155" />
            <RuleRow rule="OG title" explanation="Facebook/LinkedIn show ~60 chars." example="<60 chars" />
            <RuleRow rule="OG description" explanation="Usually truncated around 200 chars on FB/LinkedIn cards." example="<200 chars" />
            <RuleRow rule="Twitter title" explanation="Twitter shows ~70 chars on large summary cards." example="<70 chars" />
            <RuleRow rule="Twitter description" explanation="Truncated around 200 chars." example="<200 chars" />
            <RuleRow rule="OG image" explanation="Ideal 1200×630. Under 5MB. PNG or JPG." example="1200×630 PNG" />
          </div>
          <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            <strong>Tip:</strong> Google rewrites titles ~60% of the time based on relevance
            to the query — so treat your meta title as a hint, not a guarantee. The description
            is more reliably shown as-written.
          </div>
        </ReferencePanel>

        <ReferencePanel
          id="og-twitter-diff"
          title="Open Graph vs Twitter Cards — do I need both?"
          summary="Twitter falls back to OG tags for most fields. You can often just set OG."
          defaultOpen={false}
        >
          <div className="space-y-2 text-xs">
            <p><strong>Open Graph (og:*)</strong> is the Facebook-invented standard adopted by almost everyone: LinkedIn, Slack, Discord, iMessage, WhatsApp, and Twitter.</p>
            <p><strong>Twitter Cards (twitter:*)</strong> exist because Twitter wants a few extras — specifically card <code>type</code> (summary vs summary_large_image) and <code>site</code>/<code>creator</code> handles.</p>
            <p>If you only set OG tags, Twitter will still render a card. Set <code>twitter:card</code> and <code>twitter:site</code> if you want control over which card layout shows up.</p>
            <p className="text-gray-500"><strong>Verdict:</strong> OG is the baseline. Add Twitter tags when you specifically care about card type or attribution.</p>
          </div>
        </ReferencePanel>
      </div>
    </div>
  );
}
