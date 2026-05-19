"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, SwatchGrid } from "@/components/tools/controls";

type InputMode = "upload" | "emoji" | "text";
type ThemeMode = "light" | "dark";
type ShapeMode = "square" | "rounded" | "circle";

const ACCENT = "#8b5cf6";

interface GeneratedIcon {
  size: number;
  label: string;
  canvas: HTMLCanvasElement;
  blob: Blob | null;
}

// --- ICO encoder ---

function createICO(images: { size: number; data: Uint8Array }[]): Blob {
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * images.length;
  let dataOffset = headerSize + dirSize;
  const entries: { offset: number; data: Uint8Array; size: number }[] = [];
  for (const img of images) {
    entries.push({ offset: dataOffset, data: img.data, size: img.size });
    dataOffset += img.data.length;
  }
  const totalSize = dataOffset;
  const buf = new ArrayBuffer(totalSize);
  const view = new DataView(buf);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, images.length, true);
  for (let i = 0; i < entries.length; i++) {
    const off = headerSize + i * dirEntrySize;
    const s = entries[i].size;
    view.setUint8(off, s >= 256 ? 0 : s);
    view.setUint8(off + 1, s >= 256 ? 0 : s);
    view.setUint8(off + 2, 0);
    view.setUint8(off + 3, 0);
    view.setUint16(off + 4, 1, true);
    view.setUint16(off + 6, 32, true);
    view.setUint32(off + 8, entries[i].data.length, true);
    view.setUint32(off + 12, entries[i].offset, true);
  }
  const uint8 = new Uint8Array(buf);
  for (const entry of entries) {
    uint8.set(entry.data, entry.offset);
  }
  return new Blob([buf], { type: "image/x-icon" });
}

// --- Minimal ZIP ---

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files: { name: string; data: Uint8Array }[]): Blob {
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = new TextEncoder().encode(file.name);
    const crc = crc32(file.data);
    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true);
    lv.setUint32(22, file.data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(local).set(nameBytes, 30);
    localHeaders.push(new Uint8Array(local));

    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, file.data.length, true);
    cv.setUint32(24, file.data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(central).set(nameBytes, 46);
    centralHeaders.push(new Uint8Array(central));

    offset += 30 + nameBytes.length + file.data.length;
  }

  const centralStart = offset;
  let centralSize = 0;
  for (const c of centralHeaders) centralSize += c.length;

  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, centralStart, true);
  ev.setUint16(20, 0, true);

  const parts: ArrayBuffer[] = [];
  for (let i = 0; i < files.length; i++) {
    parts.push(localHeaders[i].buffer as ArrayBuffer);
    parts.push(files[i].data.buffer as ArrayBuffer);
  }
  for (const c of centralHeaders) parts.push(c.buffer as ArrayBuffer);
  parts.push(eocd);
  return new Blob(parts, { type: "application/zip" });
}

const ICON_SIZES = [
  { size: 16, label: "Browser tab" },
  { size: 32, label: "Taskbar / shortcut" },
  { size: 48, label: "Desktop icon" },
  { size: 64, label: "Windows site" },
  { size: 128, label: "Chrome Web Store" },
  { size: 180, label: "Apple Touch" },
  { size: 192, label: "Android Chrome" },
  { size: 512, label: "PWA / Splash" },
];

const PREVIEW_SIZES = [16, 32, 48, 180, 512];

function clipShape(ctx: CanvasRenderingContext2D, size: number, shape: ShapeMode) {
  if (shape === "square") return;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  } else {
    const r = size * 0.22;
    ctx.moveTo(r, 0);
    ctx.lineTo(size - r, 0);
    ctx.quadraticCurveTo(size, 0, size, r);
    ctx.lineTo(size, size - r);
    ctx.quadraticCurveTo(size, size, size - r, size);
    ctx.lineTo(r, size);
    ctx.quadraticCurveTo(0, size, 0, size - r);
    ctx.lineTo(0, r);
    ctx.quadraticCurveTo(0, 0, r, 0);
    ctx.closePath();
  }
  ctx.clip();
}

function drawImageToCanvas(
  img: HTMLImageElement,
  size: number,
  shape: ShapeMode
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  clipShape(ctx, size, shape);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, size, size);
  ctx.restore();
  return canvas;
}

function drawTextToCanvas(
  text: string,
  size: number,
  bg: string,
  fg: string,
  shape: ShapeMode
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.save();
  clipShape(ctx, size, shape);
  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontSize = text.length <= 2 ? Math.floor(size * 0.6) : Math.floor(size * 0.4);
  ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`;
  ctx.fillText(text, size / 2, size / 2 + size * 0.04);
  ctx.restore();
  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b || new Blob()), "image/png");
  });
}

async function canvasToUint8(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas);
  return new Uint8Array(await blob.arrayBuffer());
}

export default function FaviconContent() {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  useEffect(() => {
    const readTheme = () => document.documentElement.getAttribute("data-theme") ?? "default";
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isMaterial = currentTheme === "material";
  const isMetro    = currentTheme === "metro";
  const isGlass    = currentTheme === "glass";

  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  const [mode, setMode] = useState<InputMode>("upload");
  const [emoji, setEmoji] = useState("⚡");
  const [text, setText] = useState("K");
  const [bgColor, setBgColor] = useState("#6366f1");
  const [fgColor, setFgColor] = useState("#ffffff");
  const [shape, setShape] = useState<ShapeMode>("rounded");
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const [darkImage, setDarkImage] = useState<HTMLImageElement | null>(null);
  const [darkName, setDarkName] = useState("");
  const [activeTheme, setActiveTheme] = useState<ThemeMode>("light");
  const [icons, setIcons] = useState<GeneratedIcon[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("My Website");

  const loadImage = useCallback(
    (file: File): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = URL.createObjectURL(file);
      }),
    [],
  );

  const handleFileDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !file.type.startsWith("image/")) return;
      const img = await loadImage(file);
      setUploadedImage(img);
      setUploadedName(file.name);
    },
    [loadImage],
  );

  const handleDarkFileDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file || !file.type.startsWith("image/")) return;
      const img = await loadImage(file);
      setDarkImage(img);
      setDarkName(file.name);
    },
    [loadImage],
  );

  const generateIcons = useCallback(async () => {
    setGenerating(true);
    const results: GeneratedIcon[] = [];
    for (const { size, label } of ICON_SIZES) {
      let canvas: HTMLCanvasElement;
      if (mode === "emoji") {
        canvas = drawTextToCanvas(emoji, size, bgColor, fgColor, shape);
      } else if (mode === "text") {
        canvas = drawTextToCanvas(text, size, bgColor, fgColor, shape);
      } else {
        const img = activeTheme === "dark" && darkImage ? darkImage : uploadedImage;
        if (!img) continue;
        canvas = drawImageToCanvas(img, size, shape);
      }
      const blob = await canvasToBlob(canvas);
      results.push({ size, label, canvas, blob });
    }
    setIcons(results);
    setGenerating(false);
  }, [mode, emoji, text, bgColor, fgColor, shape, uploadedImage, darkImage, activeTheme]);

  useEffect(() => {
    if (mode === "emoji" && emoji) generateIcons();
    else if (mode === "text" && text) generateIcons();
    else if (mode === "upload" && uploadedImage) generateIcons();
  }, [mode, emoji, text, bgColor, fgColor, shape, uploadedImage, darkImage, activeTheme, generateIcons]);

  const generateManifest = useCallback(() => {
    return JSON.stringify(
      {
        name: previewTitle,
        short_name: previewTitle,
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        theme_color: bgColor,
        background_color: "#ffffff",
        display: "standalone",
      },
      null,
      2,
    );
  }, [previewTitle, bgColor]);

  const generateMetaTags = useCallback(() => {
    return `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-32x32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;
  }, []);

  const downloadBlob = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadICO = useCallback(async () => {
    const small = icons.filter((i) => i.size <= 64);
    if (!small.length) return;
    const images = await Promise.all(
      small.map(async (i) => ({ size: i.size, data: await canvasToUint8(i.canvas) })),
    );
    const blob = createICO(images);
    downloadBlob(blob, "favicon.ico");
  }, [icons]);

  const downloadZip = useCallback(async () => {
    if (!icons.length) return;
    const files: { name: string; data: Uint8Array }[] = [];
    for (const icon of icons) {
      const data = await canvasToUint8(icon.canvas);
      const name =
        icon.size === 180 ? "apple-touch-icon.png" : `icon-${icon.size}x${icon.size}.png`;
      files.push({ name, data });
    }
    const small = icons.filter((i) => i.size <= 64);
    const icoImages = await Promise.all(
      small.map(async (i) => ({ size: i.size, data: await canvasToUint8(i.canvas) })),
    );
    const icoBlob = createICO(icoImages);
    files.push({
      name: "favicon.ico",
      data: new Uint8Array(await icoBlob.arrayBuffer()),
    });
    files.push({
      name: "site.webmanifest",
      data: new TextEncoder().encode(generateManifest()),
    });
    files.push({
      name: "favicon-tags.html",
      data: new TextEncoder().encode(generateMetaTags()),
    });
    const zip = createZip(files);
    downloadBlob(zip, "favicons.zip");
  }, [icons, generateManifest, generateMetaTags]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => downloadZip(), label: "Download" }],
      [downloadZip]
    )
  );

  const actions = (
    <>
      <ToolActionButton variant="ghost" onClick={downloadICO} disabled={icons.length === 0}>
        .ico
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={downloadZip} disabled={icons.length === 0}>
        Download zip
      </ToolActionButton>
    </>
  );

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 40,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--kami-border-strong)",
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    outline: "none",
    fontSize: 14,
  };

  const controls = (
    <>
      <ControlGroup label="Source">
        <Segment<InputMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "upload", label: "Image" },
            { value: "emoji", label: "Emoji" },
            { value: "text", label: "Text" },
          ]}
          full
        />
      </ControlGroup>

      {mode === "upload" && (
        <ControlGroup label="Image">
          {uploadedImage ? (
            <div
              className="flex items-center gap-3 rounded-lg border p-2"
              style={{ borderColor: "var(--kami-border)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={uploadedImage.src} alt={uploadedName} className="h-12 w-12 rounded" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs">{uploadedName}</p>
              </div>
              <button
                onClick={() => {
                  setUploadedImage(null);
                  setUploadedName("");
                }}
                className="tool-shell-icon-btn"
                aria-label="Remove image"
              >
                ✕
              </button>
            </div>
          ) : (
            <FileDropZone
              accept={[".png", ".jpg", ".jpeg", ".svg", ".webp"]}
              onFiles={handleFileDrop}
              label="Drop image"
              hint="Square works best"
              multiple={false}
            />
          )}
        </ControlGroup>
      )}

      {mode === "emoji" && (
        <ControlGroup label="Emoji">
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
            style={{ ...inputStyle, fontSize: 24, textAlign: "center" }}
          />
        </ControlGroup>
      )}

      {mode === "text" && (
        <ControlGroup label="Text">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4}
            style={{ ...inputStyle, fontSize: 18, fontWeight: 600, textAlign: "center" }}
          />
        </ControlGroup>
      )}

      {(mode === "emoji" || mode === "text") && (
        <>
          <ControlGroup label="Background">
            <SwatchGrid
              value={bgColor}
              onChange={setBgColor}
              colors={["#6366f1", "#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#000000", "#ffffff"]}
            />
          </ControlGroup>
          <ControlGroup label="Foreground">
            <SwatchGrid
              value={fgColor}
              onChange={setFgColor}
              colors={["#ffffff", "#000000", "#fbbf24", "#34d399"]}
            />
          </ControlGroup>
        </>
      )}

      <ControlGroup label="Shape">
        <Segment<ShapeMode>
          value={shape}
          onChange={setShape}
          options={[
            { value: "square", label: "Square" },
            { value: "rounded", label: "Squircle" },
            { value: "circle", label: "Circle" },
          ]}
          full
        />
      </ControlGroup>

      <ControlGroup label="Site name">
        <input
          type="text"
          value={previewTitle}
          onChange={(e) => setPreviewTitle(e.target.value)}
          style={inputStyle}
          placeholder="My Website"
        />
      </ControlGroup>

      {mode === "upload" && (
        <ControlGroup label="Dark variant (optional)">
          {darkImage ? (
            <div className="flex items-center gap-2 text-xs">
              <span className="truncate">{darkName}</span>
              <button
                onClick={() => {
                  setDarkImage(null);
                  setDarkName("");
                }}
                className="tool-shell-icon-btn"
              >
                ✕
              </button>
            </div>
          ) : (
            <FileDropZone
              accept={[".png", ".jpg", ".jpeg", ".svg", ".webp"]}
              onFiles={handleDarkFileDrop}
              label="Drop dark variant"
              multiple={false}
            />
          )}
          {darkImage && (
            <Segment<ThemeMode>
              value={activeTheme}
              onChange={setActiveTheme}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
              ]}
              full
            />
          )}
        </ControlGroup>
      )}
    </>
  );

  return (
    <ToolShell
      title="Favicon Generator"
      tagline="Every favicon size + .ico + manifest, generated locally."
      accent={ACCENT}
      actions={actions}
      controls={controls}
      controlsLabel="Design"
    >
      <div className="flex flex-col gap-4">
        {isMetro && (
          <nav style={{ display: "flex", borderBottom: "1px solid #d1d1d1", marginBottom: 12 }}>
            {(["input", "output"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMetroCPivot(tab)}
                style={{
                  padding: "8px 16px", fontSize: 14,
                  fontWeight: metroCPivot === tab ? 600 : 400,
                  color: metroCPivot === tab ? "#0078d4" : "#605e5c",
                  background: "none", border: "none",
                  borderBottom: metroCPivot === tab ? "2px solid #0078d4" : "2px solid transparent",
                  cursor: "pointer",
                  fontFamily: "'Segoe UI', system-ui, sans-serif",
                  textTransform: "capitalize",
                }}
              >{tab === "input" ? "Upload" : "Preview"}</button>
            ))}
          </nav>
        )}

        {(!isMetro || metroCPivot === "input") && (
          <div className={isGlass ? "glass-canvas-section" : ""}>
            {generating && (
              <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                Generating...
              </p>
            )}
            {icons.length === 0 && (
              <div
                className="rounded-xl border p-6 text-center text-sm"
                style={{
                  background: "var(--kami-surface-solid)",
                  borderColor: "var(--kami-border-strong)",
                  color: "var(--kami-text-muted)",
                }}
              >
                Pick a source in the panel to start generating icons.
              </div>
            )}
          </div>
        )}

        {(!isMetro || metroCPivot === "output") && icons.length > 0 && (
          <div className={isGlass ? "glass-canvas-section" : ""}>
            {(!isMetro) && generating && (
              <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                Generating...
              </p>
            )}
            <section
              className="rounded-xl border p-4"
              style={{
                background: "var(--kami-surface-solid)",
                borderColor: "var(--kami-border-strong)",
              }}
            >
              <h2 className="mb-3 text-xs font-semibold uppercase" style={{ color: "var(--kami-text-muted)" }}>
                Live preview
              </h2>
              <div className="flex flex-wrap items-end gap-4">
                {PREVIEW_SIZES.map((s) => {
                  const icon = icons.find((i) => i.size === s);
                  if (!icon) return null;
                  return (
                    <div key={s} className="flex flex-col items-center gap-1">
                      <CanvasPreview canvas={icon.canvas} displaySize={Math.min(s, 96)} />
                      <span className="text-[10px]" style={{ color: "var(--kami-text-muted)" }}>
                        {s}px
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 inline-flex flex-col overflow-hidden rounded-lg" style={{ border: "1px solid #d1d5db" }}>
                <div className="flex items-center gap-2 px-3 py-2" style={{ background: "#f3f4f6" }}>
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                    <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="flex items-center gap-2 px-3 py-1.5 max-w-[220px]" style={{ background: "#ffffff" }}>
                    <FaviconPreview canvas={icons.find((i) => i.size === 16)?.canvas} />
                    <span className="truncate text-xs" style={{ color: "#374151" }}>
                      {previewTitle}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section
              className="rounded-xl border p-4"
              style={{
                background: "var(--kami-surface-solid)",
                borderColor: "var(--kami-border-strong)",
              }}
            >
              <h2 className="mb-3 text-xs font-semibold uppercase" style={{ color: "var(--kami-text-muted)" }}>
                Generated icons
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {icons.map((icon) => (
                  <div
                    key={icon.size}
                    className="flex flex-col items-center rounded-lg border p-3"
                    style={{ borderColor: "var(--kami-border)" }}
                  >
                    <div className="flex h-20 w-20 items-center justify-center">
                      <CanvasPreview
                        canvas={icon.canvas}
                        displaySize={Math.min(icon.size, 64)}
                      />
                    </div>
                    <span
                      className="mt-2 text-xs font-medium"
                      style={{ color: "var(--kami-text-muted)" }}
                    >
                      {icon.size}×{icon.size}
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--kami-text-muted)" }}>
                      {icon.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              className="rounded-xl border p-4 text-xs"
              style={{
                background: "var(--kami-surface-solid)",
                borderColor: "var(--kami-border-strong)",
              }}
            >
              <h2 className="mb-2 text-xs font-semibold uppercase" style={{ color: "var(--kami-text-muted)" }}>
                HTML meta tags
              </h2>
              <pre
                className="overflow-x-auto rounded-md p-3 text-[11px]"
                style={{ background: "var(--kami-overlay-bg)", color: "var(--kami-overlay-text)" }}
              >
                <code>{generateMetaTags()}</code>
              </pre>

              <h2 className="mb-2 mt-4 text-xs font-semibold uppercase" style={{ color: "var(--kami-text-muted)" }}>
                site.webmanifest
              </h2>
              <pre
                className="overflow-x-auto rounded-md p-3 text-[11px]"
                style={{ background: "var(--kami-overlay-bg)", color: "var(--kami-overlay-text)" }}
              >
                <code>{generateManifest()}</code>
              </pre>
            </section>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function FaviconPreview({ canvas }: { canvas?: HTMLCanvasElement }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current || !canvas) return;
    const ctx = ref.current.getContext("2d")!;
    ctx.clearRect(0, 0, 16, 16);
    ctx.drawImage(canvas, 0, 0, 16, 16);
  }, [canvas]);
  return <canvas ref={ref} width={16} height={16} className="h-4 w-4" />;
}

function CanvasPreview({
  canvas,
  displaySize,
}: {
  canvas: HTMLCanvasElement;
  displaySize: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const ctx = ref.current.getContext("2d")!;
    ctx.clearRect(0, 0, displaySize, displaySize);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(canvas, 0, 0, displaySize, displaySize);
  }, [canvas, displaySize]);
  return (
    <canvas
      ref={ref}
      width={displaySize}
      height={displaySize}
      style={{ width: displaySize, height: displaySize }}
    />
  );
}
