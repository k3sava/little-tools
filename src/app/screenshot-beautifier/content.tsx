"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Types ---

type DeviceFrame = "none" | "browser" | "safari" | "iphone" | "macbook" | "ipad";
type BgMode = "solid" | "gradient" | "transparent";
type PresetSize = { name: string; w: number; h: number | null };

const PRESETS: PresetSize[] = [
  { name: "Twitter", w: 1200, h: 675 },
  { name: "Product Hunt", w: 1270, h: 760 },
  { name: "LinkedIn", w: 1200, h: 627 },
  { name: "README", w: 800, h: null },
  { name: "Custom", w: 0, h: 0 },
];

const GRADIENT_PRESETS = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#fccb90", "#d57eeb"],
  ["#0c3483", "#a2b6df"],
];

// --- Component ---

export default function ScreenshotBeautifierContent() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<DeviceFrame>("browser");
  const [bgMode, setBgMode] = useState<BgMode>("gradient");
  const [bgColor, setBgColor] = useState("#6366f1");
  const [gradColors, setGradColors] = useState(["#667eea", "#764ba2"]);
  const [gradAngle, setGradAngle] = useState(135);
  const [shadow, setShadow] = useState(20);
  const [radius, setRadius] = useState(12);
  const [padding, setPadding] = useState(60);
  const [scale, setScale] = useState(100);
  const [preset, setPreset] = useState<PresetSize>(PRESETS[4]); // Custom
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewImgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origOX: number; origOY: number } | null>(null);
  const canvasSizeRef = useRef<{ w: number; h: number }>({ w: 1, h: 1 });

  const loadImage = useCallback((file: File) => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = URL.createObjectURL(file);
  }, []);

  const handleFiles = useCallback(
    (files: File[]) => {
      const file = files[0];
      if (file?.type.startsWith("image/")) loadImage(file);
    },
    [loadImage],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) loadImage(file);
          break;
        }
      }
    },
    [loadImage],
  );

  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  // Render to canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const scaleFactor = scale / 100;
    const imgW = image.width * scaleFactor;
    const imgH = image.height * scaleFactor;

    // Frame chrome dimensions
    const frameTop = frame === "browser" || frame === "safari" ? 36 : frame === "macbook" ? 24 : 0;
    const frameBot = frame === "iphone" ? 20 : frame === "ipad" ? 16 : frame === "macbook" ? 16 : 0;
    const frameSide = frame === "iphone" ? 12 : frame === "ipad" ? 10 : 0;

    const contentW = imgW + frameSide * 2;
    const contentH = imgH + frameTop + frameBot;

    // Canvas sizing
    let canvasW: number, canvasH: number;
    if (preset.name !== "Custom" && preset.w > 0) {
      canvasW = preset.w;
      canvasH = preset.h || Math.round(contentH + padding * 2);
    } else {
      canvasW = Math.round(contentW + padding * 2);
      canvasH = Math.round(contentH + padding * 2);
    }

    canvas.width = canvasW;
    canvas.height = canvasH;

    // Background
    if (bgMode === "transparent") {
      ctx.clearRect(0, 0, canvasW, canvasH);
    } else if (bgMode === "gradient") {
      const rad = (gradAngle * Math.PI) / 180;
      const x1 = canvasW / 2 - (Math.cos(rad) * canvasW) / 2;
      const y1 = canvasH / 2 - (Math.sin(rad) * canvasH) / 2;
      const x2 = canvasW / 2 + (Math.cos(rad) * canvasW) / 2;
      const y2 = canvasH / 2 + (Math.sin(rad) * canvasH) / 2;
      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, gradColors[0]);
      grad.addColorStop(1, gradColors[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvasW, canvasH);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    canvasSizeRef.current = { w: canvasW, h: canvasH };

    // Position content centered + user offset
    const cx = (canvasW - contentW) / 2 + offsetX;
    const cy = (canvasH - contentH) / 2 + offsetY;

    // Shadow
    if (shadow > 0) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.3)";
      ctx.shadowBlur = shadow;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = shadow / 3;
      ctx.fillStyle = "#fff";
      roundRect(ctx, cx, cy, contentW, contentH, radius);
      ctx.fill();
      ctx.restore();
    }

    // Draw frame
    ctx.save();
    roundRect(ctx, cx, cy, contentW, contentH, radius);
    ctx.clip();

    if (frame === "browser" || frame === "safari") {
      // Title bar
      ctx.fillStyle = frame === "safari" ? "#e8e8e8" : "#dee1e6";
      ctx.fillRect(cx, cy, contentW, frameTop);
      // Traffic lights
      const dotY = cy + frameTop / 2;
      const dotStart = cx + 14;
      [["#ff5f57", 0], ["#febc2e", 16], ["#28c840", 32]].forEach(
        ([color, offset]) => {
          ctx.fillStyle = color as string;
          ctx.beginPath();
          ctx.arc(dotStart + (offset as number), dotY, 5, 0, Math.PI * 2);
          ctx.fill();
        },
      );
      if (frame === "browser") {
        // URL bar
        ctx.fillStyle = "#f4f4f4";
        const barX = cx + 80;
        const barW = contentW - 160;
        const barH = 20;
        const barY = cy + (frameTop - barH) / 2;
        roundRect(ctx, barX, barY, barW, barH, 4);
        ctx.fill();
      }
    } else if (frame === "macbook") {
      ctx.fillStyle = "#2d2d2d";
      ctx.fillRect(cx, cy, contentW, frameTop);
      const dotY = cy + frameTop / 2;
      const dotStart = cx + 14;
      [["#ff5f57", 0], ["#febc2e", 14], ["#28c840", 28]].forEach(
        ([color, offset]) => {
          ctx.fillStyle = color as string;
          ctx.beginPath();
          ctx.arc(dotStart + (offset as number), dotY, 4, 0, Math.PI * 2);
          ctx.fill();
        },
      );
      // Bottom bezel
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(cx, cy + contentH - frameBot, contentW, frameBot);
    } else if (frame === "iphone") {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(cx, cy, contentW, contentH);
      // Notch
      ctx.fillStyle = "#000";
      roundRect(ctx, cx + contentW / 2 - 50, cy, 100, 14, 6);
      ctx.fill();
    } else if (frame === "ipad") {
      ctx.fillStyle = "#2d2d2d";
      ctx.fillRect(cx, cy, contentW, contentH);
    }

    // Draw image
    ctx.drawImage(
      image,
      cx + frameSide,
      cy + frameTop,
      imgW,
      imgH,
    );

    ctx.restore();

    // Generate preview image from canvas
    setPreviewUrl(canvas.toDataURL("image/png"));
  }, [image, frame, bgMode, bgColor, gradColors, gradAngle, shadow, radius, padding, scale, preset, offsetX, offsetY]);

  // Drag to reposition image
  const handleDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragRef.current = { startX: clientX, startY: clientY, origOX: offsetX, origOY: offsetY };
  }, [offsetX, offsetY]);

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current || !previewImgRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    // Scale mouse delta to canvas coordinates
    const imgEl = previewImgRef.current;
    const displayW = imgEl.clientWidth;
    const scaleRatio = canvasSizeRef.current.w / (displayW || 1);

    const dx = (clientX - dragRef.current.startX) * scaleRatio;
    const dy = (clientY - dragRef.current.startY) * scaleRatio;
    setOffsetX(dragRef.current.origOX + dx);
    setOffsetY(dragRef.current.origOY + dy);
  }, []);

  const handleDragEnd = useCallback(() => {
    dragRef.current = null;
  }, []);

  const resetPosition = useCallback(() => {
    setOffsetX(0);
    setOffsetY(0);
  }, []);

  const download = useCallback(
    (format: "png" | "jpeg") => {
      if (!canvasRef.current) return;
      const mime = format === "png" ? "image/png" : "image/jpeg";
      canvasRef.current.toBlob(
        (blob) => {
          if (!blob) return;
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `screenshot.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        },
        mime,
        0.95,
      );
    },
    [],
  );

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => download("png"), label: "Download" },
  ], [download]));

  const copyToClipboard = useCallback(async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
    });
  }, []);

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto w-[92%] max-w-[1400px] py-10 sm:py-14">
        <ToolIntro
          title="Screenshot Beautifier"
          tagline="Turn a flat screenshot into a styled product shot — gradient background, device frame, padding, shadow, rounded corners."
          description="Drop a screenshot or paste one with ⌘V. Pick a background (solid, gradient, mesh, image), optional device frame (browser, iPhone, Mac), padding, and corner radius. Export a high-resolution PNG ready for social posts, landing pages, or product launches. Nothing is uploaded."
          audience={["Content creators", "PMMs", "Support", "Designers"]}
          whenToUse={[
            "Making a tweet-ready screenshot of a new feature",
            "Hero images for a product landing page",
            "Polished screenshots for documentation or help articles",
          ]}
        />

        {!image ? (
          <div className="mt-8">
            <FileDropZone
              accept={[".png", ".jpg", ".jpeg", ".webp"]}
              onFiles={handleFiles}
              label="Drop a screenshot here, click to upload, or paste"
              hint="PNG, JPG, WebP"
              multiple={false}
            />
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
              {/* Canvas Preview */}
              <div
                className="overflow-hidden rounded-xl border border-gray-200 p-4 shadow-sm select-none"
                style={{ backgroundColor: "#f3f4f6" }}
                onMouseMove={handleDragMove}
                onMouseUp={handleDragEnd}
                onMouseLeave={handleDragEnd}
                onTouchMove={handleDragMove}
                onTouchEnd={handleDragEnd}
              >
                {/* Hidden canvas for rendering/export */}
                <canvas ref={canvasRef} className="hidden" />
                {/* Visible preview — drag to reposition */}
                {previewUrl && (
                  <img
                    ref={previewImgRef}
                    src={previewUrl}
                    alt="Preview"
                    className="mx-auto max-w-full rounded"
                    style={{ maxHeight: 600, objectFit: "contain", cursor: "grab" }}
                    draggable={false}
                    onMouseDown={handleDragStart}
                    onTouchStart={handleDragStart}
                  />
                )}
                {(offsetX !== 0 || offsetY !== 0) && (
                  <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="text-xs text-gray-400">
                      Offset: {Math.round(offsetX)}, {Math.round(offsetY)}
                    </span>
                    <button
                      onClick={resetPosition}
                      className="text-xs text-gray-500 underline hover:text-gray-700"
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-4">
                {/* Frame */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Device Frame</h3>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        ["none", "None"],
                        ["browser", "Browser"],
                        ["safari", "Safari"],
                        ["macbook", "MacBook"],
                        ["iphone", "iPhone"],
                        ["ipad", "iPad"],
                      ] as [DeviceFrame, string][]
                    ).map(([f, label]) => (
                      <button
                        key={f}
                        onClick={() => setFrame(f)}
                        className={`rounded-lg py-1.5 text-xs font-medium ${
                          frame === f
                            ? "bg-gray-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Background */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Background</h3>
                  <div className="mb-3 grid grid-cols-3 gap-1.5">
                    {(["solid", "gradient", "transparent"] as BgMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => setBgMode(m)}
                        className={`rounded-lg py-1.5 text-xs font-medium capitalize ${
                          bgMode === m ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                  {bgMode === "solid" && (
                    <div className="flex items-center gap-2">
                      <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-gray-200" />
                      <span className="text-xs font-mono text-gray-400">{bgColor}</span>
                    </div>
                  )}
                  {bgMode === "gradient" && (
                    <>
                      <div className="mb-3 grid grid-cols-4 gap-1.5">
                        {GRADIENT_PRESETS.map((g, i) => (
                          <div
                            key={i}
                            role="button"
                            tabIndex={0}
                            onClick={() => setGradColors([...g])}
                            onKeyDown={(e) => { if (e.key === "Enter") setGradColors([...g]); }}
                            className={`h-7 cursor-pointer rounded border-2 ${
                              gradColors[0] === g[0] && gradColors[1] === g[1]
                                ? "border-gray-900"
                                : "border-transparent hover:border-gray-300"
                            }`}
                            style={{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }}
                            title={`${g[0]} → ${g[1]}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="color" value={gradColors[0]} onChange={(e) => setGradColors([e.target.value, gradColors[1]])} className="h-7 w-7 shrink-0 cursor-pointer rounded border border-gray-200" title="Start color" />
                        <input type="color" value={gradColors[1]} onChange={(e) => setGradColors([gradColors[0], e.target.value])} className="h-7 w-7 shrink-0 cursor-pointer rounded border border-gray-200" title="End color" />
                        <input type="range" min={0} max={360} value={gradAngle} onChange={(e) => setGradAngle(Number(e.target.value))} className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700" />
                        <span className="w-8 shrink-0 text-right text-xs font-mono text-gray-400">{gradAngle}°</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Style */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Style</h3>
                  <SliderRow label="Shadow" value={shadow} min={0} max={60} suffix="px" onChange={setShadow} />
                  <SliderRow label="Radius" value={radius} min={0} max={40} suffix="px" onChange={setRadius} />
                  <SliderRow label="Padding" value={padding} min={0} max={120} suffix="px" onChange={setPadding} />
                  <SliderRow label="Scale" value={scale} min={25} max={100} suffix="%" onChange={setScale} />
                </div>

                {/* Preset Sizes */}
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Size Preset</h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        onClick={() => setPreset(p)}
                        className={`rounded-lg py-1.5 text-xs font-medium ${
                          preset.name === p.name ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                        title={p.w > 0 ? `${p.w}×${p.h || "auto"}` : "Custom size"}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Export */}
                <div className="flex flex-col gap-2">
                  <button onClick={() => download("png")} className="w-full rounded-lg bg-gray-900 py-2 text-sm font-medium text-white hover:bg-gray-800">
                    Download PNG
                  </button>
                  <button onClick={() => download("jpeg")} className="w-full rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Download JPEG
                  </button>
                  <button onClick={copyToClipboard} className="w-full rounded-lg border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                    Copy to Clipboard
                  </button>
                </div>

                {/* Replace image */}
                <button
                  onClick={() => setImage(null)}
                  className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
                >
                  Replace image
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// --- Helpers ---

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function SliderRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="w-14 shrink-0 text-xs text-gray-500">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700"
      />
      <span className="w-10 shrink-0 text-right text-xs font-mono text-gray-400">
        {value}{suffix}
      </span>
    </div>
  );
}
