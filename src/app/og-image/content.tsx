"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Select, SwatchGrid } from "@/components/tools/controls";

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
type LayoutType = "centered" | "split" | "footer-bar" | "hero";
type Tab = "editor" | "preview" | "validator";
type ExportFormat = "png" | "jpeg";
type FontFamily = "Inter" | "JetBrains Mono" | "DM Sans" | "Cormorant Garamond";

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

const SOLID_SWATCHES = ["#1a1a2e", "#0f172a", "#ffffff", "#000000", "#6366f1", "#ec4899", "#f59e0b", "#10b981"];

const FONT_STACKS: Record<FontFamily, string> = {
  Inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "JetBrains Mono": "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
  "DM Sans": "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  "Cormorant Garamond": "'Cormorant Garamond', 'Georgia', serif",
};

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
  maxLines: number,
  align: CanvasTextAlign = "left"
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
      drawLineAligned(ctx, line, x, y, maxWidth, align);
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
    drawLineAligned(ctx, line, x, y, maxWidth, align);
    y += lineHeight;
  }
  return y;
}

function drawLineAligned(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: CanvasTextAlign
) {
  if (align === "center") {
    ctx.fillText(text, x + maxWidth / 2, y);
  } else if (align === "right") {
    ctx.fillText(text, x + maxWidth, y);
  } else {
    ctx.fillText(text, x, y);
  }
}

interface DrawOpts {
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
  layout: LayoutType;
  fontFamily: FontFamily;
}

function drawOgImage(canvas: HTMLCanvasElement, opts: DrawOpts) {
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
  opts: DrawOpts,
  w: number,
  h: number
) {
  const t = opts.template;
  const titleColor = opts.bgType === "image" ? "#ffffff" : t.titleColor;
  const subtitleColor = opts.bgType === "image" ? "#e0e0e0" : t.subtitleColor;
  const authorColor = opts.bgType === "image" ? "#cccccc" : t.authorColor;
  const domainColor = opts.bgType === "image" ? "#aaaaaa" : t.domainColor;
  const accentColor = opts.bgType === "image" ? "#ffffff" : t.accentColor;

  const fontStack = FONT_STACKS[opts.fontFamily];
  const pad = 80;
  const contentW = w - pad * 2;

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

  if (opts.layout === "centered") {
    // Title + subtitle centered both axes
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // Calculate vertical centering
    const titleSize = 64;
    const titleLineH = 76;
    const subtitleSize = 28;
    const subtitleLineH = 36;
    const approxBlockH = titleLineH * 2 + (opts.subtitle ? subtitleLineH * 2 + 16 : 0);
    let y = (h - approxBlockH) / 2;

    ctx.font = `bold ${titleSize}px ${fontStack}`;
    ctx.fillStyle = titleColor;
    y = wrapText(ctx, opts.title || "Your Title Here", pad, y, contentW, titleLineH, 2, "center");

    if (opts.subtitle) {
      y += 16;
      ctx.font = `400 ${subtitleSize}px ${fontStack}`;
      ctx.fillStyle = subtitleColor;
      wrapText(ctx, opts.subtitle, pad, y, contentW, subtitleLineH, 2, "center");
    }

    // Footer
    ctx.textAlign = "left";
    const bottomY = h - pad;
    if (opts.author) {
      ctx.font = `500 22px ${fontStack}`;
      ctx.fillStyle = authorColor;
      ctx.textBaseline = "bottom";
      ctx.fillText(opts.author, pad, bottomY);
    }
    if (opts.domain) {
      ctx.font = `400 20px ${fontStack}`;
      ctx.fillStyle = domainColor;
      ctx.textBaseline = "bottom";
      const domW = ctx.measureText(opts.domain).width;
      ctx.fillText(opts.domain, w - pad - domW, bottomY);
    }
  } else if (opts.layout === "split") {
    // Accent bar on left, title vertically centered
    ctx.fillStyle = accentColor;
    ctx.fillRect(pad, pad, 6, h - pad * 2);

    const innerPad = pad + 30;
    const innerW = w - innerPad - pad - logoSize - 20;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    const titleSize = 56;
    const titleLineH = 68;
    const approxH = titleLineH * 2 + (opts.subtitle ? 36 * 2 + 16 : 0);
    let y = (h - approxH) / 2;

    ctx.font = `bold ${titleSize}px ${fontStack}`;
    ctx.fillStyle = titleColor;
    y = wrapText(ctx, opts.title || "Your Title Here", innerPad, y, innerW, titleLineH, 3, "left");

    if (opts.subtitle) {
      y += 12;
      ctx.font = `400 26px ${fontStack}`;
      ctx.fillStyle = subtitleColor;
      wrapText(ctx, opts.subtitle, innerPad, y, innerW, 34, 2, "left");
    }

    // Bottom author/domain
    const bottomY = h - pad;
    ctx.textBaseline = "bottom";
    if (opts.author) {
      ctx.font = `500 22px ${fontStack}`;
      ctx.fillStyle = authorColor;
      ctx.fillText(opts.author, innerPad, bottomY);
    }
    if (opts.domain) {
      ctx.font = `400 20px ${fontStack}`;
      ctx.fillStyle = domainColor;
      const domW = ctx.measureText(opts.domain).width;
      ctx.fillText(opts.domain, w - pad - domW, bottomY);
    }
  } else if (opts.layout === "footer-bar") {
    // Title at top, big footer bar with author/domain
    const barH = 90;
    const titleAreaH = h - barH;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(pad, pad, 60, 5);

    let y = pad + 40;
    ctx.font = `bold 56px ${fontStack}`;
    ctx.fillStyle = titleColor;
    y = wrapText(ctx, opts.title || "Your Title Here", pad, y, contentW - logoSize - 20, 68, 3);

    if (opts.subtitle) {
      y += 12;
      ctx.font = `400 26px ${fontStack}`;
      ctx.fillStyle = subtitleColor;
      wrapText(ctx, opts.subtitle, pad, y, contentW, 34, 2);
    }

    // Footer bar
    ctx.fillStyle = accentColor + "20";
    ctx.fillRect(0, titleAreaH, w, barH);

    const barCenter = titleAreaH + barH / 2;
    ctx.textBaseline = "middle";
    if (opts.author) {
      ctx.font = `600 22px ${fontStack}`;
      ctx.fillStyle = authorColor;
      ctx.fillText(opts.author, pad, barCenter);
    }
    if (opts.domain) {
      ctx.font = `400 20px ${fontStack}`;
      ctx.fillStyle = domainColor;
      const domW = ctx.measureText(opts.domain).width;
      ctx.fillText(opts.domain, w - pad - domW, barCenter);
    }
  } else {
    // hero
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Accent bar
    ctx.fillStyle = accentColor;
    ctx.fillRect(pad, pad, 60, 5);

    // Title
    let y = pad + 40;
    ctx.font = `bold 72px ${fontStack}`;
    ctx.fillStyle = titleColor;
    y = wrapText(ctx, opts.title || "Your Title Here", pad, y, contentW - logoSize - 20, 86, 2);

    // Subtitle
    if (opts.subtitle) {
      y += 12;
      ctx.font = `400 30px ${fontStack}`;
      ctx.fillStyle = subtitleColor;
      wrapText(ctx, opts.subtitle, pad, y, contentW, 40, 2);
    }

    // Bottom
    const bottomY = h - pad - 30;
    ctx.textBaseline = "bottom";
    if (opts.author) {
      ctx.font = `500 24px ${fontStack}`;
      ctx.fillStyle = authorColor;
      ctx.fillText(opts.author, pad, bottomY);
    }
    if (opts.domain) {
      ctx.font = `400 20px ${fontStack}`;
      ctx.fillStyle = domainColor;
      const domW = ctx.measureText(opts.domain).width;
      ctx.fillText(opts.domain, w - pad - domW, bottomY);
    }
    ctx.fillStyle = accentColor + "40";
    ctx.fillRect(pad, h - pad - 2, contentW, 2);
  }
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

const REQUIRED_OG_TAGS = ["og:title", "og:description", "og:image", "og:url", "og:type"];
const RECOMMENDED_OG_TAGS = ["og:site_name", "og:locale", "twitter:card", "twitter:title", "twitter:description", "twitter:image"];

function parseOgTags(html: string): OgTagResult[] {
  const results: OgTagResult[] = [];
  const found = new Map<string, string>();

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

  for (const tag of REQUIRED_OG_TAGS) {
    const content = found.get(tag);
    if (content) {
      const warnings: string[] = [];
      if (tag === "og:title" && content.length > 70) warnings.push("Title exceeds 70 characters");
      if (tag === "og:description" && content.length > 200) warnings.push("Description exceeds 200 characters");
      if (tag === "og:image" && !content.startsWith("http")) warnings.push("Image URL should be absolute");

      results.push({
        tag,
        content,
        status: warnings.length > 0 ? "warning" : "present",
        message: warnings.join("; "),
      });
    } else {
      results.push({ tag, content: "", status: "missing", message: `Required tag "${tag}" is missing` });
    }
  }

  for (const tag of RECOMMENDED_OG_TAGS) {
    const content = found.get(tag);
    if (content) {
      results.push({ tag, content, status: "present" });
    } else {
      results.push({ tag, content: "", status: "warning", message: `Recommended tag "${tag}" is not set` });
    }
  }

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

// --- Styles ---

const cardStyle: React.CSSProperties = {
  background: "var(--kami-surface-solid)",
  border: "1px solid var(--kami-border-strong)",
  borderRadius: "var(--kami-card-radius, 0.75rem)",
  boxShadow: "var(--kami-card-shadow, none)",
};

const inputStyle: React.CSSProperties = {
  background: "var(--kami-input-bg, var(--kami-surface-solid))",
  color: "var(--kami-text)",
  border: "1px solid var(--kami-border-strong)",
  borderRadius: "var(--kami-input-radius, 0.5rem)",
};

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
  const [layout, setLayout] = useState<LayoutType>("hero");
  const [fontFamily, setFontFamily] = useState<FontFamily>("Inter");

  const [activeTab, setActiveTab] = useState<Tab>("editor");
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("png");

  const [validatorInput, setValidatorInput] = useState("");
  const [validatorResults, setValidatorResults] = useState<OgTagResult[]>([]);
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

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  const applyTemplate = useCallback((t: Template) => {
    setTemplateId(t.id);
    setBgType(t.bgType);
    if (t.bgType === "gradient") setBgGradient(t.bgValue);
    else if (t.bgType === "solid") setBgColor(t.bgValue);
  }, []);

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
      layout,
      fontFamily,
    });
  }, [title, subtitle, author, domain, bgType, bgColor, bgGradient, bgPattern, bgImageData, logoData, template, layout, fontFamily, activeTab]);

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

  const runValidator = useCallback(() => {
    if (!validatorInput.trim()) return;
    setValidatorResults(parseOgTags(validatorInput));
  }, [validatorInput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => handleExport(), label: "Download" },
  ], [handleExport]));

  return (
    <ToolShell
      title="OG Image Generator"
      tagline="1200x630 social cards · live preview · platform validator"
      accent="#8b5cf6"
      materialFab={{ label: "Download", onClick: handleExport }}
      actions={
        <>
          <ToolActionButton variant="outline" onClick={handleCopyMetaTags}>
            {copied ? "Copied" : "Copy meta tags"}
          </ToolActionButton>
          <ToolActionButton variant="solid" onClick={handleExport}>
            Download {exportFormat.toUpperCase()}
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Mode">
            <Segment<Tab>
              value={activeTab}
              onChange={setActiveTab}
              options={[
                { value: "editor", label: "Editor" },
                { value: "preview", label: "Preview" },
                { value: "validator", label: "Validator" },
              ]}
              full
            />
          </ControlGroup>

          {activeTab === "editor" && (
            <>
              <ControlGroup label="Template">
                <div className="grid grid-cols-2 gap-2">
                  {TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => applyTemplate(t)}
                      className="p-2 text-left transition-all"
                      style={{
                        background: "var(--kami-surface)",
                        boxShadow:
                          templateId === t.id
                            ? "0 0 0 2px var(--kami-text)"
                            : "0 0 0 1px var(--kami-border)",
                        borderRadius: "var(--kami-card-radius, 0.5rem)",
                        minHeight: 56,
                      }}
                    >
                      <div className="mb-1 h-5 w-full rounded" style={{ background: t.bgValue }} />
                      <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{t.name}</span>
                    </button>
                  ))}
                </div>
              </ControlGroup>

              <ControlGroup label="Layout">
                <Segment<LayoutType>
                  value={layout}
                  onChange={setLayout}
                  options={[
                    { value: "centered", label: "Center" },
                    { value: "split", label: "Split" },
                    { value: "footer-bar", label: "Footer" },
                    { value: "hero", label: "Hero" },
                  ]}
                  full
                />
              </ControlGroup>

              <ControlGroup label="Font">
                <Select<FontFamily>
                  value={fontFamily}
                  onChange={setFontFamily}
                  options={[
                    { value: "Inter", label: "Inter" },
                    { value: "JetBrains Mono", label: "JetBrains Mono" },
                    { value: "DM Sans", label: "DM Sans" },
                    { value: "Cormorant Garamond", label: "Cormorant Garamond" },
                  ]}
                />
              </ControlGroup>

              <ControlGroup label="Title">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm focus:outline-none"
                  style={{ ...inputStyle, minHeight: 40 }}
                  placeholder="Your title here"
                />
              </ControlGroup>

              <ControlGroup label="Subtitle">
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm focus:outline-none"
                  style={{ ...inputStyle, minHeight: 40 }}
                  placeholder="A brief description"
                />
              </ControlGroup>

              <ControlGroup label="Author / Domain">
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Author name"
                    className="w-full px-3 py-2.5 text-sm focus:outline-none"
                    style={{ ...inputStyle, minHeight: 40 }}
                  />
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="example.com"
                    className="w-full px-3 py-2.5 text-sm focus:outline-none"
                    style={{ ...inputStyle, minHeight: 40 }}
                  />
                </div>
              </ControlGroup>

              <ControlGroup label="Background">
                <Segment<BgType>
                  value={bgType}
                  onChange={setBgType}
                  options={[
                    { value: "gradient", label: "Gradient" },
                    { value: "solid", label: "Solid" },
                    { value: "pattern", label: "Pattern" },
                    { value: "image", label: "Image" },
                  ]}
                  full
                />
                {bgType === "solid" && (
                  <div className="mt-2">
                    <SwatchGrid value={bgColor} onChange={setBgColor} colors={SOLID_SWATCHES} />
                  </div>
                )}
                {bgType === "gradient" && (
                  <div className="mt-2 grid grid-cols-4 gap-1.5">
                    {TEMPLATES.filter((t) => t.bgType === "gradient").map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setBgGradient(t.bgValue)}
                        aria-label={`Use ${t.name} gradient`}
                        className="h-10 transition-all"
                        style={{
                          background: t.bgValue,
                          boxShadow:
                            bgGradient === t.bgValue
                              ? "0 0 0 2px var(--kami-text), 0 0 0 3px var(--kami-surface-solid)"
                              : "0 0 0 1px var(--kami-border-strong)",
                          borderRadius: "var(--kami-card-radius, 0.375rem)",
                          minHeight: 40,
                        }}
                      />
                    ))}
                  </div>
                )}
                {bgType === "pattern" && (
                  <div className="mt-2 space-y-2">
                    <SwatchGrid value={bgColor} onChange={setBgColor} colors={SOLID_SWATCHES} />
                    <Segment
                      value={bgPattern}
                      onChange={setBgPattern}
                      options={PATTERNS.map((p) => ({ value: p.id, label: p.name }))}
                      full
                      size="sm"
                    />
                  </div>
                )}
                {bgType === "image" && (
                  <label
                    className="mt-2 flex cursor-pointer items-center justify-center px-4 py-3 text-sm transition-colors"
                    style={{
                      border: "2px dashed var(--kami-border-strong)",
                      color: "var(--kami-text-muted)",
                      borderRadius: "var(--kami-card-radius, 0.5rem)",
                      minHeight: 56,
                    }}
                  >
                    {bgImageData ? "Image loaded — change" : "Upload background"}
                    <input type="file" accept="image/*" onChange={handleBgImage} className="hidden" />
                  </label>
                )}
              </ControlGroup>

              <ControlGroup label="Logo">
                <div className="flex items-center gap-3">
                  <label
                    className="flex cursor-pointer items-center justify-center px-4 py-2 text-xs transition-colors"
                    style={{
                      border: "1px solid var(--kami-border-strong)",
                      color: "var(--kami-text-muted)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      minHeight: 40,
                    }}
                  >
                    {logoData ? "Change logo" : "Upload logo"}
                    <input type="file" accept="image/*" onChange={handleLogo} className="hidden" />
                  </label>
                  {logoData && (
                    <button
                      type="button"
                      onClick={() => setLogoData(null)}
                      className="text-xs"
                      style={{ color: "var(--kami-text-dim)", minHeight: 32 }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </ControlGroup>

              <ControlGroup label="Export format">
                <Segment<ExportFormat>
                  value={exportFormat}
                  onChange={setExportFormat}
                  options={[
                    { value: "png", label: "PNG" },
                    { value: "jpeg", label: "JPEG" },
                  ]}
                  full
                />
              </ControlGroup>
            </>
          )}
        </>
      }
      info={
        <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            <strong>OG Image Generator</strong> renders a 1200×630 social-share image entirely in your browser
            using HTML canvas — nothing is uploaded.
          </p>
          <p>
            <strong>Layouts:</strong> Hero (big title), Centered, Split (accent bar), Footer-bar (info pinned to bottom).
          </p>
          <p>
            <strong>Backgrounds:</strong> solid colors, eight curated gradients, four geometric patterns,
            or a custom photo with a dark overlay for legibility.
          </p>
          <p>
            <strong>Validator</strong> parses HTML source and lists which OG/Twitter meta tags are present,
            missing, or worth adding.
          </p>
          <p>Shortcut: ⌘Enter to download.</p>
        </div>
      }
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Design</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Preview</button>
        </nav>
      )}
      {/* Hidden canvas kept alive in Metro Preview mode so platform thumbnails can read it */}
      {isMetro && metroCPivot === "output" && (
        <canvas
          ref={canvasRef}
          width={OG_WIDTH}
          height={OG_HEIGHT}
          className="hidden"
          aria-hidden="true"
        />
      )}
      {/* Live canvas — visible across all tabs so platform previews can read it */}
      <div className="flex flex-col gap-4">
        {(!isMetro || metroCPivot === "input") && activeTab === "editor" && (
          <div className="p-3 sm:p-4" style={cardStyle}>
            <canvas
              ref={canvasRef}
              width={OG_WIDTH}
              height={OG_HEIGHT}
              className="w-full rounded-lg"
              style={{ aspectRatio: "1200/630", display: "block" }}
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
                1200 × 630 px · {fontFamily}
              </span>
              <div className="flex items-center gap-2">
                <ToolActionButton variant="outline" onClick={handleCopyMetaTags}>
                  {copied ? "Copied" : "Copy meta tags"}
                </ToolActionButton>
                <ToolActionButton variant="solid" onClick={handleExport}>
                  Download {exportFormat.toUpperCase()}
                </ToolActionButton>
              </div>
            </div>
          </div>
        )}

        {(!isMetro ? activeTab === "preview" : metroCPivot === "output") && (
          <div className="p-3 sm:p-4 space-y-4" style={cardStyle}>
            <canvas
              ref={canvasRef}
              width={OG_WIDTH}
              height={OG_HEIGHT}
              className="w-full rounded-lg mb-4"
              style={{ aspectRatio: "1200/630", display: "block" }}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {PLATFORMS.map((platform) => (
                <div key={platform.name}>
                  <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
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
                        el.style.width = "100%";
                        el.style.height = "auto";
                        const ctx = el.getContext("2d");
                        if (ctx) {
                          ctx.drawImage(srcCanvas, 0, 0, el.width, el.height);
                        }
                      }}
                      className="w-full block"
                    />
                    <div className="bg-white px-3 py-2">
                      <div className="text-xs text-gray-400">{domain}</div>
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {title || "Your Title Here"}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{subtitle}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(!isMetro ? activeTab === "validator" : false) && (
          <>
            <canvas ref={canvasRef} className="hidden" />
            <div className="p-4 space-y-3" style={cardStyle}>
              <h3 className="text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
                OG Tag Validator
              </h3>
              <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                Paste HTML source code to check which Open Graph tags are present.
              </p>
              <textarea
                value={validatorInput}
                onChange={(e) => setValidatorInput(e.target.value)}
                placeholder='Paste HTML here... e.g. <meta property="og:title" content="My Page" />'
                className="w-full px-3 py-2.5 text-sm font-mono focus:outline-none"
                style={{ ...inputStyle, minHeight: 140 }}
                rows={6}
                spellCheck={false}
              />
              <ToolActionButton variant="solid" onClick={runValidator} disabled={!validatorInput.trim()}>
                Validate
              </ToolActionButton>
            </div>

            {validatorResults.length > 0 && (
              <div className="overflow-hidden" style={cardStyle}>
                <div
                  className="px-4 py-3 flex flex-wrap items-center gap-3"
                  style={{ borderBottom: "1px solid var(--kami-border)" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>Results</span>
                  <span className="text-xs text-green-600">
                    {validatorResults.filter((r) => r.status === "present").length} present
                  </span>
                  <span className="text-xs text-amber-600">
                    {validatorResults.filter((r) => r.status === "warning").length} warnings
                  </span>
                  <span className="text-xs text-red-600">
                    {validatorResults.filter((r) => r.status === "missing").length} missing
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--kami-border)" }}>
                        <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Status</th>
                        <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Tag</th>
                        <th className="px-4 py-2 text-left text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>Content</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validatorResults.map((r, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--kami-border)" }}>
                          <td className="px-4 py-2">
                            {r.status === "present" && <span className="text-green-600 text-xs font-medium">OK</span>}
                            {r.status === "warning" && <span className="text-amber-600 text-xs font-medium">WARN</span>}
                            {r.status === "missing" && <span className="text-red-600 text-xs font-medium">MISS</span>}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs" style={{ color: "var(--kami-text)" }}>{r.tag}</td>
                          <td className="px-4 py-2 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                            {r.content ? (
                              <span className="break-all">{r.content}</span>
                            ) : (
                              <span className="italic" style={{ color: "var(--kami-text-dim)" }}>{r.message}</span>
                            )}
                            {r.content && r.message && <div className="text-amber-500 mt-0.5">{r.message}</div>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolShell>
  );
}
