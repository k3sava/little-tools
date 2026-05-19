"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Slider, SwatchGrid } from "@/components/tools/controls";

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

const GRADIENT_PRESETS: [string, string][] = [
  ["#667eea", "#764ba2"],
  ["#f093fb", "#f5576c"],
  ["#4facfe", "#00f2fe"],
  ["#43e97b", "#38f9d7"],
  ["#fa709a", "#fee140"],
  ["#a18cd1", "#fbc2eb"],
  ["#fccb90", "#d57eeb"],
  ["#0c3483", "#a2b6df"],
];

const SOLID_SWATCHES = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9", "#1f2937", "#ffffff", "#000000"];

const cardStyle: React.CSSProperties = {
  background: "var(--kami-surface-solid)",
  border: "1px solid var(--kami-border-strong)",
  borderRadius: "var(--kami-card-radius, 0.75rem)",
  boxShadow: "var(--kami-card-shadow, none)",
};

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

// --- Component ---

export default function ScreenshotBeautifierContent() {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [frame, setFrame] = useState<DeviceFrame>("browser");
  const [bgMode, setBgMode] = useState<BgMode>("gradient");
  const [bgColor, setBgColor] = useState("#6366f1");
  const [gradColors, setGradColors] = useState<[string, string]>(["#667eea", "#764ba2"]);
  const [gradAngle, setGradAngle] = useState(135);
  const [shadow, setShadow] = useState(20);
  const [radius, setRadius] = useState(12);
  const [padding, setPadding] = useState(60);
  const [scale, setScale] = useState(100);
  const [tilt, setTilt] = useState(0);
  const [preset, setPreset] = useState<PresetSize>(PRESETS[4]);
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

    const frameTop = frame === "browser" || frame === "safari" ? 36 : frame === "macbook" ? 24 : 0;
    const frameBot = frame === "iphone" ? 20 : frame === "ipad" ? 16 : frame === "macbook" ? 16 : 0;
    const frameSide = frame === "iphone" ? 12 : frame === "ipad" ? 10 : 0;

    const contentW = imgW + frameSide * 2;
    const contentH = imgH + frameTop + frameBot;

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

    // Position
    const cx = (canvasW - contentW) / 2 + offsetX;
    const cy = (canvasH - contentH) / 2 + offsetY;

    // Apply 3D tilt via 2D skew that approximates perspective
    const tiltRad = (tilt * Math.PI) / 180;
    const useTilt = tilt !== 0;

    if (useTilt) {
      ctx.save();
      // Pivot around content center
      const pivotX = cx + contentW / 2;
      const pivotY = cy + contentH / 2;
      ctx.translate(pivotX, pivotY);
      // Use a Y-skew + slight X scale to fake perspective rotation around Y axis
      const sx = Math.cos(tiltRad);
      ctx.transform(sx, 0, Math.sin(tiltRad) * 0.25, 1, 0, 0);
      ctx.translate(-pivotX, -pivotY);
    }

    // Shadow underlay
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
      ctx.fillStyle = frame === "safari" ? "#e8e8e8" : "#dee1e6";
      ctx.fillRect(cx, cy, contentW, frameTop);
      const dotY = cy + frameTop / 2;
      const dotStart = cx + 14;
      ([["#ff5f57", 0], ["#febc2e", 16], ["#28c840", 32]] as [string, number][]).forEach(
        ([color, offset]) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(dotStart + offset, dotY, 5, 0, Math.PI * 2);
          ctx.fill();
        },
      );
      if (frame === "browser") {
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
      ([["#ff5f57", 0], ["#febc2e", 14], ["#28c840", 28]] as [string, number][]).forEach(
        ([color, offset]) => {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(dotStart + offset, dotY, 4, 0, Math.PI * 2);
          ctx.fill();
        },
      );
      ctx.fillStyle = "#c0c0c0";
      ctx.fillRect(cx, cy + contentH - frameBot, contentW, frameBot);
    } else if (frame === "iphone") {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(cx, cy, contentW, contentH);
      ctx.fillStyle = "#000";
      roundRect(ctx, cx + contentW / 2 - 50, cy, 100, 14, 6);
      ctx.fill();
    } else if (frame === "ipad") {
      ctx.fillStyle = "#2d2d2d";
      ctx.fillRect(cx, cy, contentW, contentH);
    }

    ctx.drawImage(image, cx + frameSide, cy + frameTop, imgW, imgH);
    ctx.restore();

    if (useTilt) ctx.restore();

    setPreviewUrl(canvas.toDataURL("image/png"));
  }, [
    image,
    frame,
    bgMode,
    bgColor,
    gradColors,
    gradAngle,
    shadow,
    radius,
    padding,
    scale,
    preset,
    offsetX,
    offsetY,
    tilt,
  ]);

  // Drag to reposition
  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      dragRef.current = {
        startX: clientX,
        startY: clientY,
        origOX: offsetX,
        origOY: offsetY,
      };
    },
    [offsetX, offsetY],
  );

  const handleDragMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!dragRef.current || !previewImgRef.current) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

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

  const download = useCallback((format: "png" | "jpeg") => {
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
  }, []);

  useKeyboardShortcuts(
    useMemo(
      () => [
        { key: "Enter", meta: true, action: () => download("png"), label: "Download PNG" },
      ],
      [download],
    ),
  );

  const copyToClipboard = useCallback(async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    });
  }, []);

  // Match gradient preset detection
  const isActiveGradient = (g: [string, string]) =>
    gradColors[0] === g[0] && gradColors[1] === g[1];

  return (
    <ToolShell
      title="Screenshot Beautifier"
      tagline="Drop a screenshot · gradient · device frame · shadow · tilt"
      accent="#8b5cf6"
      materialFab={{ label: "Download PNG", onClick: () => download("png") }}
      actions={
        image ? (
          <>
            <ToolActionButton variant="ghost" onClick={() => setImage(null)}>
              Replace
            </ToolActionButton>
            <ToolActionButton variant="outline" onClick={copyToClipboard}>
              Copy
            </ToolActionButton>
            <ToolActionButton variant="solid" onClick={() => download("png")}>
              Download PNG
            </ToolActionButton>
          </>
        ) : null
      }
      controls={
        image ? (
          <>
            <ControlGroup label="Device frame">
              <Segment<DeviceFrame>
                value={frame}
                onChange={setFrame}
                options={[
                  { value: "none", label: "None" },
                  { value: "browser", label: "Browser" },
                  { value: "safari", label: "Safari" },
                  { value: "macbook", label: "Mac" },
                  { value: "iphone", label: "iPhone" },
                  { value: "ipad", label: "iPad" },
                ]}
                full
                size="sm"
              />
            </ControlGroup>

            <ControlGroup label="Background">
              <Segment<BgMode>
                value={bgMode}
                onChange={setBgMode}
                options={[
                  { value: "gradient", label: "Gradient" },
                  { value: "solid", label: "Solid" },
                  { value: "transparent", label: "None" },
                ]}
                full
              />
              {bgMode === "solid" && (
                <div className="mt-2">
                  <SwatchGrid value={bgColor} onChange={setBgColor} colors={SOLID_SWATCHES} />
                </div>
              )}
              {bgMode === "gradient" && (
                <div className="mt-2 space-y-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {GRADIENT_PRESETS.map((g, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setGradColors([g[0], g[1]])}
                        aria-label={`Gradient ${g[0]} to ${g[1]}`}
                        className="h-10 transition-all"
                        style={{
                          background: `linear-gradient(135deg, ${g[0]}, ${g[1]})`,
                          boxShadow: isActiveGradient(g)
                            ? "0 0 0 2px var(--kami-text), 0 0 0 3px var(--kami-surface-solid)"
                            : "0 0 0 1px var(--kami-border-strong)",
                          borderRadius: "var(--kami-card-radius, 0.375rem)",
                          minHeight: 40,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={gradColors[0]}
                      onChange={(e) => setGradColors([e.target.value, gradColors[1]])}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded"
                      style={{ border: "1px solid var(--kami-border-strong)" }}
                      title="Start color"
                    />
                    <input
                      type="color"
                      value={gradColors[1]}
                      onChange={(e) => setGradColors([gradColors[0], e.target.value])}
                      className="h-10 w-10 shrink-0 cursor-pointer rounded"
                      style={{ border: "1px solid var(--kami-border-strong)" }}
                      title="End color"
                    />
                    <div className="min-w-0 flex-1">
                      <Slider
                        value={gradAngle}
                        onChange={setGradAngle}
                        min={0}
                        max={360}
                        unit="°"
                        ariaLabel="Gradient angle"
                      />
                    </div>
                  </div>
                </div>
              )}
            </ControlGroup>

            <ControlGroup label="Padding">
              <Slider value={padding} onChange={setPadding} min={0} max={160} unit="px" />
            </ControlGroup>
            <ControlGroup label="Radius">
              <Slider value={radius} onChange={setRadius} min={0} max={48} unit="px" />
            </ControlGroup>
            <ControlGroup label="Shadow">
              <Slider value={shadow} onChange={setShadow} min={0} max={80} unit="px" />
            </ControlGroup>
            <ControlGroup label="Scale">
              <Slider value={scale} onChange={setScale} min={25} max={100} unit="%" />
            </ControlGroup>
            <ControlGroup label="3D tilt">
              <Slider value={tilt} onChange={setTilt} min={-45} max={45} unit="°" />
            </ControlGroup>

            <ControlGroup label="Output size">
              <Segment<string>
                value={preset.name}
                onChange={(n) => setPreset(PRESETS.find((p) => p.name === n) || PRESETS[4])}
                options={PRESETS.map((p) => ({
                  value: p.name,
                  label: p.name,
                  hint: p.w > 0 ? `${p.w}x${p.h || "auto"}` : "Auto",
                }))}
                full
                size="sm"
              />
            </ControlGroup>

            {(offsetX !== 0 || offsetY !== 0) && (
              <ControlGroup>
                <ToolActionButton variant="ghost" onClick={resetPosition}>
                  Reset position ({Math.round(offsetX)}, {Math.round(offsetY)})
                </ToolActionButton>
              </ControlGroup>
            )}
          </>
        ) : null
      }
      info={
        <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            <strong>Screenshot Beautifier</strong> turns a flat screenshot into a polished product shot — drop a file,
            paste with ⌘V, or click the canvas to upload.
          </p>
          <p>
            <strong>Frame</strong> wraps your image in a browser, Safari, MacBook, iPhone, or iPad chrome.
          </p>
          <p>
            <strong>Background</strong> can be a curated gradient (with custom angle), solid color, or transparent for
            layered exports.
          </p>
          <p>
            <strong>Tilt</strong> applies a 3D rotation effect for hero shots. Drag the preview to reposition.
          </p>
          <p>Shortcut: ⌘Enter to download PNG.</p>
        </div>
      }
    >
      {!image ? (
        <FileDropZone
          accept={[".png", ".jpg", ".jpeg", ".webp"]}
          onFiles={handleFiles}
          label="Drop a screenshot here, click to upload, or paste with ⌘V"
          hint="PNG, JPG, WebP — nothing is uploaded"
          multiple={false}
        />
      ) : (
        <div
          className="overflow-hidden p-3 sm:p-4 select-none"
          style={cardStyle}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          {/* Hidden canvas for rendering/export */}
          <canvas ref={canvasRef} className="hidden" />
          {/* Visible preview */}
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={previewImgRef}
              src={previewUrl}
              alt="Preview"
              className="mx-auto max-w-full rounded"
              style={{
                maxHeight: "70vh",
                objectFit: "contain",
                cursor: "grab",
                background:
                  bgMode === "transparent"
                    ? "url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f0f0f0%22%2F%3E%3C%2Fsvg%3E')"
                    : undefined,
              }}
              draggable={false}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            />
          )}
          <p className="mt-3 text-center text-xs" style={{ color: "var(--kami-text-dim)" }}>
            Drag the image to reposition · ⌘V to paste a new screenshot
          </p>
        </div>
      )}
    </ToolShell>
  );
}
