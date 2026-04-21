"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";

// --- Types ---

type InputMode = "upload" | "emoji";
type ThemeMode = "light" | "dark";

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
  // ICO header
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // type: icon
  view.setUint16(4, images.length, true); // count
  // Directory entries
  for (let i = 0; i < entries.length; i++) {
    const off = headerSize + i * dirEntrySize;
    const s = entries[i].size;
    view.setUint8(off, s >= 256 ? 0 : s); // width
    view.setUint8(off + 1, s >= 256 ? 0 : s); // height
    view.setUint8(off + 2, 0); // color palette
    view.setUint8(off + 3, 0); // reserved
    view.setUint16(off + 4, 1, true); // color planes
    view.setUint16(off + 6, 32, true); // bits per pixel
    view.setUint32(off + 8, entries[i].data.length, true); // size
    view.setUint32(off + 12, entries[i].offset, true); // offset
  }
  // Image data (PNG)
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
    // Local file header
    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true); // signature
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0, true); // flags
    lv.setUint16(8, 0, true); // compression: store
    lv.setUint16(10, 0, true); // mod time
    lv.setUint16(12, 0, true); // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, file.data.length, true); // compressed size
    lv.setUint32(22, file.data.length, true); // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // extra length
    new Uint8Array(local).set(nameBytes, 30);
    localHeaders.push(new Uint8Array(local));

    // Central directory header
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

  // End of central directory
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

// --- Sizes ---

const ICON_SIZES = [
  { size: 16, label: "16×16 — Browser tab" },
  { size: 32, label: "32×32 — Taskbar / shortcut" },
  { size: 48, label: "48×48 — Desktop icon" },
  { size: 64, label: "64×64 — Windows site" },
  { size: 128, label: "128×128 — Chrome Web Store" },
  { size: 180, label: "180×180 — Apple Touch Icon" },
  { size: 192, label: "192×192 — Android Chrome" },
  { size: 512, label: "512×512 — PWA / Splash" },
];

// --- Canvas helpers ---

function drawImageToCanvas(
  img: HTMLImageElement,
  size: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, size, size);
  return canvas;
}

function drawEmojiToCanvas(emoji: string, size: number, bg: string): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  if (bg !== "transparent") {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.floor(size * 0.75)}px serif`;
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.05);
  return canvas;
}

async function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || new Blob()),
      "image/png",
    );
  });
}

async function canvasToUint8(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  const blob = await canvasToBlob(canvas);
  return new Uint8Array(await blob.arrayBuffer());
}

// --- Component ---

export default function FaviconContent() {
  const [mode, setMode] = useState<InputMode>("upload");
  const [emoji, setEmoji] = useState("⚡");
  const [emojiBg, setEmojiBg] = useState("#6366f1");
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const [darkImage, setDarkImage] = useState<HTMLImageElement | null>(null);
  const [darkName, setDarkName] = useState("");
  const [activeTheme, setActiveTheme] = useState<ThemeMode>("light");
  const [icons, setIcons] = useState<GeneratedIcon[]>([]);
  const [generating, setGenerating] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("My Website");
  const [showCode, setShowCode] = useState(false);
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
        canvas = drawEmojiToCanvas(emoji, size, emojiBg);
      } else {
        const img =
          activeTheme === "dark" && darkImage ? darkImage : uploadedImage;
        if (!img) continue;
        canvas = drawImageToCanvas(img, size);
      }
      const blob = await canvasToBlob(canvas);
      results.push({ size, label, canvas, blob });
    }
    setIcons(results);
    setGenerating(false);
  }, [mode, emoji, emojiBg, uploadedImage, darkImage, activeTheme]);

  // Auto-generate on input change
  useEffect(() => {
    if (mode === "emoji" && emoji) {
      generateIcons();
    } else if (mode === "upload" && uploadedImage) {
      generateIcons();
    }
  }, [mode, emoji, emojiBg, uploadedImage, darkImage, activeTheme, generateIcons]);

  const downloadICO = useCallback(async () => {
    const small = icons.filter((i) => i.size <= 64);
    if (!small.length) return;
    const images = await Promise.all(
      small.map(async (i) => ({
        size: i.size,
        data: await canvasToUint8(i.canvas),
      })),
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
        icon.size === 180
          ? "apple-touch-icon.png"
          : `icon-${icon.size}x${icon.size}.png`;
      files.push({ name, data });
    }
    // Add ICO
    const small = icons.filter((i) => i.size <= 64);
    const icoImages = await Promise.all(
      small.map(async (i) => ({
        size: i.size,
        data: await canvasToUint8(i.canvas),
      })),
    );
    const icoBlob = createICO(icoImages);
    files.push({
      name: "favicon.ico",
      data: new Uint8Array(await icoBlob.arrayBuffer()),
    });
    // manifest.json
    files.push({
      name: "site.webmanifest",
      data: new TextEncoder().encode(generateManifest()),
    });
    // meta tags
    files.push({
      name: "favicon-tags.html",
      data: new TextEncoder().encode(generateMetaTags()),
    });
    const zip = createZip(files);
    downloadBlob(zip, "favicons.zip");
  }, [icons]);

  const generateManifest = useCallback(() => {
    return JSON.stringify(
      {
        name: previewTitle,
        short_name: previewTitle,
        icons: [
          { src: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
        ],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        display: "standalone",
      },
      null,
      2,
    );
  }, [previewTitle]);

  const generateMetaTags = useCallback(() => {
    return `<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/icon-32x32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">`;
  }, []);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => downloadZip(), label: "Download" },
  ], [downloadZip]));

  const hasInput = mode === "emoji" || uploadedImage;

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        {/* Header */}        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Favicon Generator
        </h1>
        <p className="mt-2 text-gray-500">
          Generate favicons in all sizes and formats. Upload an image or design
          from an emoji. All processing happens in your browser.
        </p>

        {/* Input Mode Tabs */}
        <div className="mt-8 flex gap-2">
          <button
            onClick={() => setMode("upload")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === "upload"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            Upload Image
          </button>
          <button
            onClick={() => setMode("emoji")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              mode === "emoji"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"
            }`}
          >
            Emoji / Text
          </button>
        </div>

        {/* Input Area */}
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {mode === "upload" ? (
            <div className="space-y-4">
              {/* Drop zone */}
              {uploadedImage ? (
                <div
                  onClick={() => {
                    setUploadedImage(null);
                    setUploadedName("");
                  }}
                  className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 transition-colors hover:border-gray-400 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={uploadedImage.src}
                      alt="Uploaded"
                      className="h-16 w-16 rounded object-contain"
                    />
                    <span className="text-sm text-gray-500">{uploadedName}</span>
                    <span className="text-xs text-gray-400">
                      Click to replace
                    </span>
                  </div>
                </div>
              ) : (
                <FileDropZone
                  accept={[".png", ".jpg", ".jpeg", ".svg", ".webp"]}
                  onFiles={handleFileDrop}
                  label="Drop an image here or click to upload"
                  hint="SVG, PNG, JPG — square images work best"
                  multiple={false}
                />
              )}

              {/* Dark mode variant */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Dark Mode Variant{" "}
                  <span className="text-gray-400">(optional)</span>
                </label>
                {darkImage ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">{darkName}</span>
                    <button
                      onClick={() => {
                        setDarkImage(null);
                        setDarkName("");
                      }}
                      className="text-sm text-gray-400 hover:text-gray-600"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <FileDropZone
                    accept={[".png", ".jpg", ".jpeg", ".svg", ".webp"]}
                    onFiles={handleDarkFileDrop}
                    label="Drop dark variant here or click to upload"
                    hint="Optional — used for dark mode favicon"
                    multiple={false}
                  />
                )}
              </div>

              {/* Theme toggle (when dark variant exists) */}
              {darkImage && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Preview:</span>
                  <button
                    onClick={() => setActiveTheme("light")}
                    className={`rounded px-3 py-1 text-sm ${
                      activeTheme === "light"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setActiveTheme("dark")}
                    className={`rounded px-3 py-1 text-sm ${
                      activeTheme === "dark"
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    Dark
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Emoji or Character
                </label>
                <input
                  type="text"
                  value={emoji}
                  onChange={(e) => setEmoji(e.target.value)}
                  maxLength={4}
                  className="w-24 rounded-lg border border-gray-200 px-3 py-2 text-center text-2xl focus:border-gray-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={emojiBg}
                    onChange={(e) => setEmojiBg(e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded border border-gray-200"
                  />
                  <input
                    type="text"
                    value={emojiBg}
                    onChange={(e) => setEmojiBg(e.target.value)}
                    className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono focus:border-gray-400 focus:outline-none"
                  />
                  <button
                    onClick={() => setEmojiBg("transparent")}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      emojiBg === "transparent"
                        ? "border-gray-400 bg-gray-100"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Transparent
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Browser Tab Preview */}
        {icons.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Browser Preview</h2>
            <div className="flex items-center gap-3 mb-3">
              <label className="text-sm text-gray-500">Page title:</label>
              <input
                type="text"
                value={previewTitle}
                onChange={(e) => setPreviewTitle(e.target.value)}
                className="rounded border border-gray-200 px-2 py-1 text-sm focus:border-gray-400 focus:outline-none"
              />
            </div>
            {/* Mock browser tab */}
            <div className="inline-flex flex-col rounded-lg border border-gray-300 overflow-hidden">
              <div className="flex items-center gap-2 bg-gray-100 px-3 py-2 border-b border-gray-200">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
              </div>
              <div className="flex items-center  border-b border-gray-200">
                <div className="flex items-center gap-2 bg-white border-r border-gray-200 px-3 py-1.5 max-w-[200px]">
                  <FaviconPreview canvas={icons.find((i) => i.size === 16)?.canvas} />
                  <span className="truncate text-xs text-gray-700">
                    {previewTitle}
                  </span>
                </div>
                <div className="px-3 py-1.5 text-xs text-gray-400">+</div>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-1.5">
                <span className="text-xs text-gray-400">
                  🔒 example.com
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Generated Icons */}
        {icons.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Generated Icons</h2>
              <div className="flex gap-2">
                <button
                  onClick={downloadICO}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Download .ico
                </button>
                <button
                  onClick={downloadZip}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  Download All (.zip)
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {icons.map((icon) => (
                <div
                  key={icon.size}
                  className="flex flex-col items-center rounded-lg border border-gray-100  p-3"
                >
                  <div className="flex h-20 w-20 items-center justify-center">
                    <CanvasPreview
                      canvas={icon.canvas}
                      displaySize={Math.min(icon.size, 64)}
                    />
                  </div>
                  <span className="mt-2 text-xs font-medium text-gray-700">
                    {icon.size}×{icon.size}
                  </span>
                  <span className="text-[10px] text-gray-400 text-center">
                    {icon.label.split("—")[1]?.trim()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Code Snippets */}
        {icons.length > 0 && (
          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <button
              onClick={() => setShowCode(!showCode)}
              className="flex w-full items-center justify-between"
            >
              <h2 className="text-lg font-semibold">Code Snippets</h2>
              <span className="text-sm text-gray-400">
                {showCode ? "▲ Hide" : "▼ Show"}
              </span>
            </button>
            {showCode && (
              <div className="mt-4 space-y-4">
                {/* HTML Meta Tags */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">
                      HTML Meta Tags
                    </h3>
                    <CopyButton text={generateMetaTags()} />
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                    <code>{generateMetaTags()}</code>
                  </pre>
                </div>
                {/* manifest.json */}
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-700">
                      site.webmanifest
                    </h3>
                    <CopyButton text={generateManifest()} />
                  </div>
                  <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
                    <code>{generateManifest()}</code>
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!hasInput && icons.length === 0 && (
          <div className="mt-8 text-center text-sm text-gray-400">
            Upload an image or pick an emoji to get started.
          </div>
        )}

        {generating && (
          <div className="mt-4 text-center text-sm text-gray-400">
            Generating...
          </div>
        )}

        {/* Footer */}
      </div>
    </div>
  );
}

// --- Sub-components ---

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
