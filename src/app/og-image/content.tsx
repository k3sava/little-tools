"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- Types ---

interface Template {
  id: string;
  name: string;
  bgType: "gradient" | "solid" | "pattern";
  bgValue: string;
  titleColor: string;
  subtitleColor: string;
  authorColor: string;
  domainColor: string;
  accentColor: string;
}

type BgType = "solid" | "gradient" | "pattern" | "image";
type Tab = "editor" | "preview" | "validator";
type ExportFormat = "png" | "jpeg";

// --- Templates ---

const TEMPLATES: Template[] = [
  {
    id: "blog",
    name: "Blog Post",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    titleColor: "#ffffff",
    subtitleColor: "#e0d4f5",
    authorColor: "#d4c5f0",
    domainColor: "#c8b8eb",
    accentColor: "#ffffff",
  },
  {
    id: "product",
    name: "Product",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    titleColor: "#f8fafc",
    subtitleColor: "#94a3b8",
    authorColor: "#64748b",
    domainColor: "#475569",
    accentColor: "#3b82f6",
  },
  {
    id: "docs",
    name: "Documentation",
    bgType: "solid",
    bgValue: "#1a1a2e",
    titleColor: "#e0e0e0",
    subtitleColor: "#a0a0b0",
    authorColor: "#808090",
    domainColor: "#606070",
    accentColor: "#00d2ff",
  },
  {
    id: "changelog",
    name: "Changelog",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    titleColor: "#ffffff",
    subtitleColor: "#fde8ef",
    authorColor: "#fcd5e0",
    domainColor: "#fbc2d1",
    accentColor: "#ffffff",
  },
  {
    id: "event",
    name: "Event",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    titleColor: "#1a1a1a",
    subtitleColor: "#333333",
    authorColor: "#4a4a4a",
    domainColor: "#666666",
    accentColor: "#1a1a1a",
  },
  {
    id: "profile",
    name: "Profile",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)",
    titleColor: "#1a1a1a",
    subtitleColor: "#333333",
    authorColor: "#4a4a4a",
    domainColor: "#666666",
    accentColor: "#6b21a8",
  },
  {
    id: "tutorial",
    name: "Tutorial",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)",
    titleColor: "#ffffff",
    subtitleColor: "#d4f5e0",
    authorColor: "#b0edc5",
    domainColor: "#8ce5ab",
    accentColor: "#ffffff",
  },
  {
    id: "announcement",
    name: "Announcement",
    bgType: "gradient",
    bgValue: "linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)",
    titleColor: "#ffffff",
    subtitleColor: "#ffe0d0",
    authorColor: "#ffc4a0",
    domainColor: "#ffa870",
    accentColor: "#ffffff",
  },
];

const PATTERNS = [
  { name: "Dots", id: "dots" },
  { name: "Grid", id: "grid" },
  { name: "Diagonal", id: "diagonal" },
  { name: "Waves", id: "waves" },
];

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

// --- Canvas drawing ---

function parseGradient(
  ctx: CanvasRenderingContext2D,
  value: string,
  w: number,
  h: number
): CanvasGradient | string {
  const match = value.match(
    /linear-gradient\((\d+)deg,\s*(#[0-9a-fA-F]+)\s+\d+%,\s*(#[0-9a-fA-F]+)\s+\d+%\)/
  );
  if (!match) return value;
  const angle = (parseInt(match[1]) * Math.PI) / 180;
  const c1 = match[2];
  const c2 = match[3];
  const cx = w / 2;
  const cy = h / 2;
  const len = Math.sqrt(w * w + h * h) / 2;
  const x1 = cx - Math.cos(angle) * len;
  const y1 = cy - Math.sin(angle) * len;
  const x2 = cx + Math.cos(angle) * len;
  const y2 = cy + Math.sin(angle) * len;
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, c1);
  grad.addColorStop(1, c2);
  return grad;
}

function drawPattern(
  ctx: CanvasRenderingContext2D,
  patternId: string,
  bgColor: string,
  accentColor: string,
  w: number,
  h: number
) {
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = accentColor + "30";
  ctx.fillStyle = accentColor + "20";

  if (patternId === "dots") {
    for (let x = 20; x < w; x += 40) {
      for (let y = 20; y < h; y += 40) {
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (patternId === "grid") {
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  } else if (patternId === "diagonal") {
    ctx.lineWidth = 1;
    for (let i = -h; i < w + h; i += 30) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + h, h);
      ctx.stroke();
    }
  } else if (patternId === "waves") {
    ctx.lineWidth = 2;
    for (let row = 0; row < h + 60; row += 60) {
      ctx.beginPath();
      for (let x = 0; x <= w; x += 5) {
        const y = row + Math.sin(x / 40) * 15;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(" ");
  let line = "";
  let linesDrawn = 0;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + (line ? " " : "") + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      linesDrawn++;
      if (linesDrawn > maxLines) break;
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = words[i];
    } else {
      line = testLine;
    }
  }
  if (line && linesDrawn < maxLines) {
    linesDrawn++;
    if (linesDrawn === maxLines && line.length > 60) {
      line = line.slice(0, 57) + "...";
    }
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
  return y;
}

function drawOgImage(
  canvas: HTMLCanvasElement,
  opts: {
    title: string;
    subtitle: string;
    author: string;
    domain: string;
    bgType: BgType;
    bgColor: string;
    bgGradient: string;
    bgPattern: string;
    bgImageData: string | null;
    logoData: string | null;
    template: Template;
  }
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = OG_WIDTH;
  const h = OG_HEIGHT;
  canvas.width = w;
  canvas.height = h;

  // Background
  if (opts.bgType === "image" && opts.bgImageData) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, w, h);
      // Dark overlay for text readability
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, w, h);
      drawContent(ctx, opts, w, h);
    };
    img.src = opts.bgImageData;
    return;
  } else if (opts.bgType === "pattern") {
    drawPattern(ctx, opts.bgPattern, opts.bgColor, opts.template.accentColor, w, h);
  } else if (opts.bgType === "gradient") {
    const grad = parseGradient(ctx, opts.bgGradient, w, h);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, 0, w, h);
  }

  drawContent(ctx, opts, w, h);
}

function drawContent(
  ctx: CanvasRenderingContext2D,
  opts: {
    title: string;
    subtitle: string;
    author: string;
    domain: string;
    bgType: BgType;
    template: Template;
    logoData: string | null;
  },
  w: number,
  h: number
) {
  const t = opts.template;
  const titleColor = opts.bgType === "image" ? "#ffffff" : t.titleColor;
  const subtitleColor = opts.bgType === "image" ? "#e0e0e0" : t.subtitleColor;
  const authorColor = opts.bgType === "image" ? "#cccccc" : t.authorColor;
  const domainColor = opts.bgType === "image" ? "#aaaaaa" : t.domainColor;
  const accentColor = opts.bgType === "image" ? "#ffffff" : t.accentColor;

  const pad = 80;
  const contentW = w - pad * 2;

  // Accent bar
  ctx.fillStyle = accentColor;
  ctx.fillRect(pad, pad, 60, 5);

  // Logo
  let logoSize = 0;
  if (opts.logoData) {
    logoSize = 48;
    const logoImg = new Image();
    logoImg.src = opts.logoData;
    try {
      ctx.drawImage(logoImg, w - pad - logoSize, pad - 10, logoSize, logoSize);
    } catch {
      // logo not loaded yet, ignore
    }
  }

  // Title
  let y = pad + 40;
  ctx.font = "bold 52px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
  ctx.fillStyle = titleColor;
  ctx.textBaseline = "top";
  y = wrapText(ctx, opts.title || "Your Title Here", pad, y, contentW - logoSize - 20, 64, 3);

  // Subtitle
  if (opts.subtitle) {
    y += 12;
    ctx.font = "400 28px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = subtitleColor;
    wrapText(ctx, opts.subtitle, pad, y, contentW, 36, 2);
  }

  // Bottom section: author + domain
  const bottomY = h - pad - 30;

  if (opts.author) {
    ctx.font = "500 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = authorColor;
    ctx.textBaseline = "bottom";
    ctx.fillText(opts.author, pad, bottomY);
  }

  if (opts.domain) {
    ctx.font = "400 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    ctx.fillStyle = domainColor;
    ctx.textBaseline = "bottom";
    const domW = ctx.measureText(opts.domain).width;
    ctx.fillText(opts.domain, w - pad - domW, bottomY);
  }

  // Bottom accent line
  ctx.fillStyle = accentColor + "40";
  ctx.fillRect(pad, h - pad - 2, contentW, 2);
}

// --- Platform preview dimensions ---

const PLATFORMS = [
  { name: "Twitter / X", width: 506, height: 265, radius: 16 },
  { name: "LinkedIn", width: 484, height: 254, radius: 2 },
  { name: "Slack", width: 360, height: 189, radius: 8 },
  { name: "Discord", width: 400, height: 210, radius: 4 },
];

// --- OG Tag parsing ---

interface OgTagResult {
  tag: string;
  content: string;
  status: "present" | "missing" | "warning";
  message?: string;
}

const REQUIRED_OG_TAGS = [
  "og:title",
  "og:description",
  "og:image",
  "og:url",
  "og:type",
];

const RECOMMENDED_OG_TAGS = [
  "og:site_name",
  "og:locale",
  "twitter:card",
  "twitter:title",
  "twitter:description",
  "twitter:image",
];

function parseOgTags(html: string): OgTagResult[] {
  const results: OgTagResult[] = [];
  const found = new Map<string, string>();

  // Match meta tags with property or name attributes
  const metaRegex =
    /<meta\s+(?:[^>]*?)(?:property|name)=["']([^"']+)["']\s+content=["']([^"']*)["'][^>]*>/gi;
  const metaRegex2 =
    /<meta\s+content=["']([^"']*)["']\s+(?:property|name)=["']([^"']+)["'][^>]*>/gi;

  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    found.set(match[1].toLowerCase(), match[2]);
  }
  while ((match = metaRegex2.exec(html)) !== null) {
    found.set(match[2].toLowerCase(), match[1]);
  }

  // Check required tags
  for (const tag of REQUIRED_OG_TAGS) {
    const content = found.get(tag);
    if (content) {
      const warnings: string[] = [];
      if (tag === "og:title" && content.length > 70)
        warnings.push("Title exceeds 70 characters");
      if (tag === "og:description" && content.length > 200)
        warnings.push("Description exceeds 200 characters");
      if (tag === "og:image" && !content.startsWith("http"))
        warnings.push("Image URL should be absolute");

      results.push({
        tag,
        content,
        status: warnings.length > 0 ? "warning" : "present",
        message: warnings.join("; "),
      });
    } else {
      results.push({
        tag,
        content: "",
        status: "missing",
        message: `Required tag "${tag}" is missing`,
      });
    }
  }

  // Check recommended tags
  for (const tag of RECOMMENDED_OG_TAGS) {
    const content = found.get(tag);
    if (content) {
      results.push({ tag, content, status: "present" });
    } else {
      results.push({
        tag,
        content: "",
        status: "warning",
        message: `Recommended tag "${tag}" is not set`,
      });
    }
  }

  // Additional found tags
  found.forEach((content, tag) => {
    if (
      (tag.startsWith("og:") || tag.startsWith("twitter:")) &&
      !REQUIRED_OG_TAGS.includes(tag) &&
      !RECOMMENDED_OG_TAGS.includes(tag)
    ) {
      results.push({ tag, content, status: "present" });
    }
  });

  return results;
}

// --- Main Component ---

export default function OgImageContent() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Editor state
  const [title, setTitle] = useState("How to Build Better OG Images");
  const [subtitle, setSubtitle] = useState(
    "A complete guide to creating social cards that drive clicks"
  );
  const [author, setAuthor] = useState("Kami");
  const [domain, setDomain] = useState("kami.dev");
  const [templateId, setTemplateId] = useState("blog");
  const [bgType, setBgType] = useState<BgType>("gradient");
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [bgGradient, setBgGradient] = useState(TEMPLATES[0].bgValue);
  const [bgPattern, setBgPattern] = useState("dots");
  const [bgImageData, setBgImageData] = useState<string | null>(null);
  const [logoData, setLogoData] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("editor");

  // Export
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");

  // Validator
  const [validatorInput, setValidatorInput] = useState("");
  const [validatorResults, setValidatorResults] = useState<OgTagResult[]>([]);

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  // Apply template
  const applyTemplate = useCallback((t: Template) => {
    setTemplateId(t.id);
    setBgType(t.bgType);
    if (t.bgType === "gradient") setBgGradient(t.bgValue);
    else if (t.bgType === "solid") setBgColor(t.bgValue);
  }, []);

  // Redraw canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawOgImage(canvas, {
      title,
      subtitle,
      author,
      domain,
      bgType,
      bgColor,
      bgGradient,
      bgPattern,
      bgImageData,
      logoData,
      template,
    });
  }, [
    title,
    subtitle,
    author,
    domain,
    bgType,
    bgColor,
    bgGradient,
    bgPattern,
    bgImageData,
    logoData,
    template,
  ]);

  // File handlers
  const handleBgImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBgImageData(reader.result as string);
      setBgType("image");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleLogo = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoData(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Export
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mime = exportFormat === "png" ? "image/png" : "image/jpeg";
    const ext = exportFormat;
    const link = document.createElement("a");
    link.download = `og-image.${ext}`;
    link.href = canvas.toDataURL(mime, 0.95);
    link.click();
  }, [exportFormat]);

  const handleCopyMetaTags = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageUrl = "YOUR_IMAGE_URL_HERE";
    const tags = `<meta property="og:title" content="${title.replace(/"/g, "&quot;")}" />
<meta property="og:description" content="${subtitle.replace(/"/g, "&quot;")}" />
<meta property="og:image" content="${imageUrl}" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title.replace(/"/g, "&quot;")}" />
<meta name="twitter:description" content="${subtitle.replace(/"/g, "&quot;")}" />
<meta name="twitter:image" content="${imageUrl}" />`;
    await navigator.clipboard.writeText(tags);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [title, subtitle]);

  // Validator
  const runValidator = useCallback(() => {
    if (!validatorInput.trim()) return;
    setValidatorResults(parseOgTags(validatorInput));
  }, [validatorInput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => handleExport(), label: "Download" },
  ], [handleExport]));

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            OG Image Generator
          </h1>
          <p className="mt-2 text-gray-500">
            Create Open Graph social cards with a visual editor. No ads, no
            tracking.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex items-center justify-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit mx-auto">
          {(["editor", "preview", "validator"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-gray-900 text-white"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "editor"
                ? "Editor"
                : tab === "preview"
                  ? "Platform Preview"
                  : "OG Tag Validator"}
            </button>
          ))}
        </div>

        {/* Editor Tab */}
        {activeTab === "editor" && (
          <div className="grid gap-6 lg:grid-cols-[1fr,380px]">
            {/* Canvas Preview */}
            <div>
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <canvas
                  ref={canvasRef}
                  width={OG_WIDTH}
                  height={OG_HEIGHT}
                  className="w-full rounded-lg"
                  style={{ aspectRatio: "1200/630" }}
                />
              </div>

              {/* Export controls */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-1">
                  <span className="text-xs text-gray-500">Format:</span>
                  {(["png", "jpeg"] as ExportFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setExportFormat(fmt)}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        exportFormat === fmt
                          ? "bg-gray-900 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleExport}
                  className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Download {exportFormat.toUpperCase()}
                </button>
                <button
                  onClick={handleCopyMetaTags}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 hover:border-gray-300"
                >
                  {copied ? "Copied!" : "Copy Meta Tags"}
                </button>
                <span className="ml-auto text-xs text-gray-400">
                  1200 x 630px
                </span>
              </div>
            </div>

            {/* Controls Panel */}
            <div className="space-y-5">
              {/* Templates */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Templates
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => applyTemplate(t)}
                      className={`rounded-lg p-2 text-center text-xs font-medium transition-all ${
                        templateId === t.id
                          ? "ring-2 ring-gray-900 "
                          : "border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className="mx-auto mb-1.5 h-6 w-full rounded"
                        style={{
                          background:
                            t.bgType === "gradient"
                              ? t.bgValue
                              : t.bgValue,
                        }}
                      />
                      <span className="text-gray-600">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Fields */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Content
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="Your title here"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                      placeholder="A brief description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">
                        Author
                      </label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        placeholder="Author name"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">
                        Domain
                      </label>
                      <input
                        type="text"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                        placeholder="example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Background */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Background
                </h3>
                <div className="mb-3 flex gap-1 rounded-lg border border-gray-200 p-0.5">
                  {(["gradient", "solid", "pattern", "image"] as BgType[]).map(
                    (bt) => (
                      <button
                        key={bt}
                        onClick={() => setBgType(bt)}
                        className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                          bgType === bt
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {bt.charAt(0).toUpperCase() + bt.slice(1)}
                      </button>
                    )
                  )}
                </div>

                {bgType === "solid" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded border border-gray-200"
                    />
                    <input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-mono focus:border-gray-300 focus:outline-none"
                    />
                  </div>
                )}

                {bgType === "gradient" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {TEMPLATES.filter((t) => t.bgType === "gradient").map(
                        (t) => (
                          <button
                            key={t.id}
                            onClick={() => setBgGradient(t.bgValue)}
                            className={`h-8 rounded-md transition-all ${
                              bgGradient === t.bgValue
                                ? "ring-2 ring-gray-900 ring-offset-1"
                                : "ring-1 ring-gray-200"
                            }`}
                            style={{ background: t.bgValue }}
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                {bgType === "pattern" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={bgColor}
                        onChange={(e) => setBgColor(e.target.value)}
                        className="h-8 w-8 cursor-pointer rounded border border-gray-200"
                      />
                      <span className="text-xs text-gray-500">Base color</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PATTERNS.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => setBgPattern(p.id)}
                          className={`rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                            bgPattern === p.id
                              ? "bg-gray-900 text-white"
                              : "border border-gray-200 text-gray-600 hover:border-gray-300"
                          }`}
                        >
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {bgType === "image" && (
                  <div>
                    <label className="flex cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors">
                      {bgImageData
                        ? "Image loaded — click to change"
                        : "Click to upload background image"}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBgImage}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Logo upload */}
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Logo
                </h3>
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-500 hover:border-gray-300 transition-colors">
                    {logoData ? "Change logo" : "Upload logo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogo}
                      className="hidden"
                    />
                  </label>
                  {logoData && (
                    <button
                      onClick={() => setLogoData(null)}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Preview Tab */}
        {activeTab === "preview" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <canvas
                ref={activeTab === "preview" ? undefined : canvasRef}
                className="hidden"
              />
              <div className="grid gap-6 md:grid-cols-2">
                {PLATFORMS.map((platform) => (
                  <div key={platform.name}>
                    <h3 className="mb-2 text-sm font-semibold text-gray-700">
                      {platform.name}
                    </h3>
                    <div
                      className="overflow-hidden border border-gray-200 bg-gray-100"
                      style={{ borderRadius: platform.radius }}
                    >
                      <canvas
                        ref={(el) => {
                          if (!el) return;
                          const srcCanvas = canvasRef.current;
                          if (!srcCanvas) return;
                          el.width = platform.width * 2;
                          el.height = platform.height * 2;
                          el.style.width = `${platform.width}px`;
                          el.style.height = `${platform.height}px`;
                          const ctx = el.getContext("2d");
                          if (ctx) {
                            ctx.drawImage(
                              srcCanvas,
                              0,
                              0,
                              el.width,
                              el.height
                            );
                          }
                        }}
                        style={{
                          width: platform.width,
                          height: platform.height,
                        }}
                        className="w-full"
                      />
                      <div className="bg-white px-3 py-2">
                        <div className="text-xs text-gray-400">{domain}</div>
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {title || "Your Title Here"}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {subtitle}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Validator Tab */}
        {activeTab === "validator" && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-gray-700">
                OG Tag Validator
              </h3>
              <p className="mb-3 text-xs text-gray-500">
                Paste HTML source code to check which Open Graph tags are
                present.
              </p>
              <textarea
                value={validatorInput}
                onChange={(e) => setValidatorInput(e.target.value)}
                placeholder='Paste HTML here... e.g. <meta property="og:title" content="My Page" />'
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                rows={6}
                spellCheck={false}
              />
              <button
                onClick={runValidator}
                disabled={!validatorInput.trim()}
                className="mt-2 rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Validate
              </button>
            </div>

            {validatorResults.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-700">
                    Results
                  </span>
                  <span className="text-xs text-green-600">
                    {
                      validatorResults.filter((r) => r.status === "present")
                        .length
                    }{" "}
                    present
                  </span>
                  <span className="text-xs text-amber-600">
                    {
                      validatorResults.filter((r) => r.status === "warning")
                        .length
                    }{" "}
                    warnings
                  </span>
                  <span className="text-xs text-red-600">
                    {
                      validatorResults.filter((r) => r.status === "missing")
                        .length
                    }{" "}
                    missing
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 /50">
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Tag
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                        Content
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {validatorResults.map((r, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 last:border-0"
                      >
                        <td className="px-4 py-2">
                          {r.status === "present" && (
                            <span className="text-green-600 text-xs font-medium">
                              OK
                            </span>
                          )}
                          {r.status === "warning" && (
                            <span className="text-amber-600 text-xs font-medium">
                              WARN
                            </span>
                          )}
                          {r.status === "missing" && (
                            <span className="text-red-600 text-xs font-medium">
                              MISS
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-gray-700">
                          {r.tag}
                        </td>
                        <td className="px-4 py-2 text-xs text-gray-500">
                          {r.content ? (
                            <span className="break-all">{r.content}</span>
                          ) : (
                            <span className="italic text-gray-400">
                              {r.message}
                            </span>
                          )}
                          {r.content && r.message && (
                            <div className="text-amber-500 mt-0.5">
                              {r.message}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
      </div>
    </div>
  );
}
