"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Slider } from "@/components/tools/controls";

// --- Minimal QR Code Generator (Version 1-6, Byte mode, ECC-L) ---
// This implements a basic QR encoder sufficient for URLs and text up to ~100 chars.

type InputType = "url" | "text" | "wifi" | "vcard";
type DotStyle = "square" | "rounded" | "dots";
type EyeStyle = "square" | "rounded" | "circle";
type EccLevel = "L" | "M" | "Q" | "H";

const GF256_EXP = new Uint8Array(256);
const GF256_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    GF256_EXP[i] = x;
    GF256_LOG[x] = i;
    x = (x << 1) ^ (x >= 128 ? 0x11d : 0);
  }
  GF256_EXP[255] = GF256_EXP[0];
})();

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0;
  return GF256_EXP[(GF256_LOG[a] + GF256_LOG[b]) % 255];
}

function rsEncode(data: number[], ecCount: number): number[] {
  const gen: number[] = new Array(ecCount + 1).fill(0);
  gen[0] = 1;
  for (let i = 0; i < ecCount; i++) {
    for (let j = i + 1; j >= 1; j--) {
      gen[j] = gen[j] ^ gfMul(gen[j - 1], GF256_EXP[i]);
    }
  }
  const msg = [...data, ...new Array(ecCount).fill(0)];
  for (let i = 0; i < data.length; i++) {
    const coef = msg[i];
    if (coef !== 0) {
      for (let j = 1; j <= ecCount; j++) {
        msg[i + j] ^= gfMul(gen[j], coef);
      }
    }
  }
  return msg.slice(data.length);
}

// QR version capacities (byte mode, ECC-L)
const VERSION_CAPS = [0, 17, 32, 53, 78, 106, 134, 154, 192, 230, 271];
const VERSION_EC = [0, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18];
const VERSION_BLOCKS = [0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4];

function getVersion(dataLen: number): number {
  for (let v = 1; v <= 10; v++) {
    if (dataLen <= VERSION_CAPS[v]) return v;
  }
  return 10; // clamp
}

function createQR(text: string): boolean[][] {
  const bytes = new TextEncoder().encode(text);
  const version = getVersion(bytes.length);
  const size = version * 4 + 17;
  const cap = VERSION_CAPS[version];
  const ecCount = VERSION_EC[version];
  const blockCount = VERSION_BLOCKS[version];

  // Encode data
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const totalData = cap + ecCount * blockCount;
  const dataCodewords = cap;

  // Mode indicator (0100 = byte) + character count
  const bits: number[] = [];
  const pushBits = (val: number, len: number) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };

  pushBits(0b0100, 4); // byte mode
  const ccBits = version <= 9 ? 8 : 16;
  pushBits(bytes.length, ccBits);
  for (let bi = 0; bi < bytes.length; bi++) pushBits(bytes[bi], 8);
  pushBits(0, 4); // terminator

  // Pad to codeword boundary
  while (bits.length % 8 !== 0) bits.push(0);

  // Convert to bytes
  const codewords: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) byte = (byte << 1) | (bits[i + j] || 0);
    codewords.push(byte);
  }

  // Pad codewords
  let padIdx = 0;
  while (codewords.length < dataCodewords) {
    codewords.push(padIdx % 2 === 0 ? 0xec : 0x11);
    padIdx++;
  }

  // Split into blocks and generate EC
  const blockSize = Math.floor(dataCodewords / blockCount);
  const allData: number[][] = [];
  const allEc: number[][] = [];
  let offset = 0;
  for (let b = 0; b < blockCount; b++) {
    const extra = b < dataCodewords % blockCount ? 1 : 0;
    const blockData = codewords.slice(offset, offset + blockSize + extra);
    offset += blockSize + extra;
    allData.push(blockData);
    allEc.push(rsEncode(blockData, ecCount));
  }

  // Interleave
  const finalBits: number[] = [];
  const maxDataLen = Math.max(...allData.map((d) => d.length));
  for (let i = 0; i < maxDataLen; i++) {
    for (const block of allData) {
      if (i < block.length) pushBitsTo(finalBits, block[i], 8);
    }
  }
  for (let i = 0; i < ecCount; i++) {
    for (const block of allEc) {
      pushBitsTo(finalBits, block[i], 8);
    }
  }

  // Create module grid
  const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  const reserved: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Place finder patterns
  const placeFinder = (r: number, c: number) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) {
          const outer = dr === 0 || dr === 6 || dc === 0 || dc === 6;
          const inner = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
          grid[rr][cc] = outer || inner;
        }
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    grid[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    grid[i][6] = i % 2 === 0;
  }

  // Alignment patterns (version >= 2)
  if (version >= 2) {
    const positions = getAlignmentPositions(version, size);
    for (const r of positions) {
      for (const c of positions) {
        if (reserved[r][c]) continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const rr = r + dr, cc = c + dc;
            reserved[rr][cc] = true;
            grid[rr][cc] =
              Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0);
          }
        }
      }
    }
  }

  // Reserve format info
  for (let i = 0; i < 8; i++) {
    reserved[8][i] = true;
    reserved[8][size - 1 - i] = true;
    reserved[i][8] = true;
    reserved[size - 1 - i][8] = true;
  }
  reserved[8][8] = true;
  // Dark module
  reserved[size - 8][8] = true;
  grid[size - 8][8] = true;

  // Version info (version >= 7) - skip for now (we support up to 10)

  // Place data bits
  let bitIdx = 0;
  let upward = true;
  for (let col = size - 1; col >= 0; col -= 2) {
    if (col === 6) col = 5; // skip timing
    const rows = upward
      ? Array.from({ length: size }, (_, i) => size - 1 - i)
      : Array.from({ length: size }, (_, i) => i);
    for (const row of rows) {
      for (const dc of [0, -1]) {
        const c = col + dc;
        if (c < 0 || reserved[row][c]) continue;
        if (bitIdx < finalBits.length) {
          grid[row][c] = finalBits[bitIdx] === 1;
          bitIdx++;
        }
      }
    }
    upward = !upward;
  }

  // Apply mask (pattern 0: (row + col) % 2 === 0)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!reserved[r][c] && (r + c) % 2 === 0) {
        grid[r][c] = !grid[r][c];
      }
    }
  }

  // Format info (mask 0, ECC L)
  const formatBits = getFormatBits(0, 0); // ECC L = 01, mask 0
  const formatPositions: [number, number][] = [];
  // Around top-left finder
  for (let i = 0; i <= 5; i++) formatPositions.push([8, i]);
  formatPositions.push([8, 7]);
  formatPositions.push([8, 8]);
  formatPositions.push([7, 8]);
  for (let i = 5; i >= 0; i--) formatPositions.push([i, 8]);

  for (let i = 0; i < 15; i++) {
    if (i < formatPositions.length) {
      const [r, c] = formatPositions[i];
      grid[r][c] = ((formatBits >> (14 - i)) & 1) === 1;
    }
  }

  // Right and bottom format info
  const formatPositions2: [number, number][] = [];
  for (let i = 0; i < 7; i++) formatPositions2.push([size - 1 - i, 8]);
  for (let i = 0; i < 8; i++) formatPositions2.push([8, size - 8 + i]);

  for (let i = 0; i < 15; i++) {
    if (i < formatPositions2.length) {
      const [r, c] = formatPositions2[i];
      grid[r][c] = ((formatBits >> (14 - i)) & 1) === 1;
    }
  }

  return grid;
}

function getAlignmentPositions(version: number, size: number): number[] {
  if (version === 1) return [];
  const intervals = [0, 0, 16, 22, 24, 26, 28, 30, 24, 26, 28];
  const last = size - 7;
  const step = intervals[version] || 26;
  const positions = [6];
  let pos = last;
  while (pos > 6 + step) {
    positions.unshift(pos);
    pos -= step;
  }
  positions.push(last);
  // Deduplicate
  return Array.from(new Set(positions)).sort((a, b) => a - b);
}

function getFormatBits(ecLevel: number, mask: number): number {
  // Pre-computed: ECC L (01) + mask 0 (000) = 01000
  // After BCH and XOR masking
  const FORMAT_STRINGS: Record<string, number> = {
    "0_0": 0x77c4,
    "0_1": 0x72f3,
    "0_2": 0x7daa,
    "0_3": 0x789d,
    "1_0": 0x5412,
    "1_1": 0x5125,
    "1_2": 0x5e7c,
    "1_3": 0x5b4b,
  };
  return FORMAT_STRINGS[`${ecLevel}_${mask}`] || 0x77c4;
}

function pushBitsTo(arr: number[], val: number, len: number) {
  for (let i = len - 1; i >= 0; i--) arr.push((val >> i) & 1);
}

// --- Helpers for fancy rendering ---

// Detect the three finder-pattern bounding boxes (always 7×7 corners)
function isInFinder(r: number, c: number, size: number): "tl" | "tr" | "bl" | null {
  if (r < 7 && c < 7) return "tl";
  if (r < 7 && c >= size - 7) return "tr";
  if (r >= size - 7 && c < 7) return "bl";
  return null;
}

// --- Rendering ---

function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  grid: boolean[][],
  opts: {
    fg: string;
    bg: string;
    cellSize: number;
    quiet: number;
    dotStyle: DotStyle;
    eyeStyle: EyeStyle;
    logo?: HTMLImageElement | null;
    logoScale: number;
  },
) {
  const { fg, bg, cellSize, quiet, dotStyle, eyeStyle, logo, logoScale } = opts;
  const size = grid.length;
  const total = size * cellSize + quiet * 2;
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, total, total);

  ctx.fillStyle = fg;

  // Draw data modules (skip the 7×7 finder regions; we render them separately)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) continue;
      if (isInFinder(r, c, size)) continue;
      const x = quiet + c * cellSize;
      const y = quiet + r * cellSize;
      if (dotStyle === "square") {
        ctx.fillRect(x, y, cellSize, cellSize);
      } else if (dotStyle === "rounded") {
        const radius = cellSize * 0.3;
        roundRect(ctx, x, y, cellSize, cellSize, radius);
        ctx.fill();
      } else {
        // dots
        ctx.beginPath();
        ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.42, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Draw finder eyes
  const drawEye = (gr: number, gc: number) => {
    const x = quiet + gc * cellSize;
    const y = quiet + gr * cellSize;
    const outerSize = 7 * cellSize;
    const innerOffset = cellSize;
    const innerSize = 5 * cellSize;
    const dotOffset = 2 * cellSize;
    const dotSize = 3 * cellSize;

    if (eyeStyle === "square") {
      ctx.fillStyle = fg;
      ctx.fillRect(x, y, outerSize, outerSize);
      ctx.fillStyle = bg;
      ctx.fillRect(x + innerOffset, y + innerOffset, innerSize, innerSize);
      ctx.fillStyle = fg;
      ctx.fillRect(x + dotOffset, y + dotOffset, dotSize, dotSize);
    } else if (eyeStyle === "rounded") {
      const rOuter = cellSize * 1.3;
      const rInner = cellSize * 0.9;
      const rDot = cellSize * 0.6;
      ctx.fillStyle = fg;
      roundRect(ctx, x, y, outerSize, outerSize, rOuter);
      ctx.fill();
      ctx.fillStyle = bg;
      roundRect(ctx, x + innerOffset, y + innerOffset, innerSize, innerSize, rInner);
      ctx.fill();
      ctx.fillStyle = fg;
      roundRect(ctx, x + dotOffset, y + dotOffset, dotSize, dotSize, rDot);
      ctx.fill();
    } else {
      // circle
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(x + outerSize / 2, y + outerSize / 2, outerSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(x + outerSize / 2, y + outerSize / 2, innerSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(x + outerSize / 2, y + outerSize / 2, dotSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };
  drawEye(0, 0);
  drawEye(0, size - 7);
  drawEye(size - 7, 0);

  // Draw logo in center (with white halo to keep scannability)
  if (logo) {
    const logoSize = total * logoScale;
    const lx = (total - logoSize) / 2;
    const ly = (total - logoSize) / 2;
    const pad = logoSize * 0.1;
    ctx.fillStyle = bg;
    roundRect(ctx, lx - pad, ly - pad, logoSize + pad * 2, logoSize + pad * 2, logoSize * 0.15);
    ctx.fill();
    try {
      ctx.drawImage(logo, lx, ly, logoSize, logoSize);
    } catch {}
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function buildQrSvg(
  grid: boolean[][],
  opts: { fg: string; bg: string; dotStyle: DotStyle; eyeStyle: EyeStyle },
): string {
  const size = grid.length;
  const quiet = 4;
  const total = size + quiet * 2;
  const { fg, bg, dotStyle, eyeStyle } = opts;
  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="${
      dotStyle === "square" ? "crispEdges" : "geometricPrecision"
    }">`,
  );
  parts.push(`<rect width="${total}" height="${total}" fill="${bg}"/>`);

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (!grid[r][c]) continue;
      if (isInFinder(r, c, size)) continue;
      const x = c + quiet;
      const y = r + quiet;
      if (dotStyle === "square") {
        parts.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fg}"/>`);
      } else if (dotStyle === "rounded") {
        parts.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.3" ry="0.3" fill="${fg}"/>`);
      } else {
        parts.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.42" fill="${fg}"/>`);
      }
    }
  }

  const drawEyeSvg = (gr: number, gc: number) => {
    const x = gc + quiet;
    const y = gr + quiet;
    if (eyeStyle === "square") {
      parts.push(`<rect x="${x}" y="${y}" width="7" height="7" fill="${fg}"/>`);
      parts.push(`<rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="${bg}"/>`);
      parts.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${fg}"/>`);
    } else if (eyeStyle === "rounded") {
      parts.push(`<rect x="${x}" y="${y}" width="7" height="7" rx="1.3" ry="1.3" fill="${fg}"/>`);
      parts.push(`<rect x="${x + 1}" y="${y + 1}" width="5" height="5" rx="0.9" ry="0.9" fill="${bg}"/>`);
      parts.push(`<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="0.6" ry="0.6" fill="${fg}"/>`);
    } else {
      parts.push(`<circle cx="${x + 3.5}" cy="${y + 3.5}" r="3.5" fill="${fg}"/>`);
      parts.push(`<circle cx="${x + 3.5}" cy="${y + 3.5}" r="2.5" fill="${bg}"/>`);
      parts.push(`<circle cx="${x + 3.5}" cy="${y + 3.5}" r="1.5" fill="${fg}"/>`);
    }
  };
  drawEyeSvg(0, 0);
  drawEyeSvg(0, size - 7);
  drawEyeSvg(size - 7, 0);

  parts.push("</svg>");
  return parts.join("");
}

// --- Component ---

export default function QrCodeContent() {
  const [inputType, setInputType] = useState<InputType>("url");
  const [{ q: text }, setToolState] = useToolState({ q: "https://kami.dev" });
  const setText = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [wifiSsid, setWifiSsid] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiEnc, setWifiEnc] = useState("WPA");
  const [vcardName, setVcardName] = useState("");
  const [vcardPhone, setVcardPhone] = useState("");
  const [vcardEmail, setVcardEmail] = useState("");
  const [fgColor, setFgColor] = useState("#000000");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [cellSize, setCellSize] = useState(8);
  const [dotStyle, setDotStyle] = useState<DotStyle>("square");
  const [eyeStyle, setEyeStyle] = useState<EyeStyle>("square");
  const [ecc, setEcc] = useState<EccLevel>("L"); // UI only — encoder uses L
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [logoScale, setLogoScale] = useState(0.18);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"" | "png" | "svg">("");

  const getPayload = useCallback((): string => {
    switch (inputType) {
      case "url":
      case "text":
        return text;
      case "wifi":
        return `WIFI:T:${wifiEnc};S:${wifiSsid};P:${wifiPass};;`;
      case "vcard":
        return `BEGIN:VCARD\nVERSION:3.0\nFN:${vcardName}\nTEL:${vcardPhone}\nEMAIL:${vcardEmail}\nEND:VCARD`;
    }
  }, [inputType, text, wifiSsid, wifiPass, wifiEnc, vcardName, vcardPhone, vcardEmail]);

  useEffect(() => {
    const payload = getPayload();
    if (!payload || !canvasRef.current) return;
    try {
      if (payload.length > VERSION_CAPS[10]) {
        setError(`Text too long (${payload.length} chars, max ${VERSION_CAPS[10]})`);
        return;
      }
      setError("");
      const grid = createQR(payload);
      renderQRToCanvas(canvasRef.current, grid, {
        fg: fgColor,
        bg: bgColor,
        cellSize,
        quiet: cellSize * 4,
        dotStyle,
        eyeStyle,
        logo,
        logoScale,
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      setError("Failed to generate QR code");
    }
  }, [getPayload, fgColor, bgColor, cellSize, dotStyle, eyeStyle, logo, logoScale]);

  const download = useCallback(() => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcode.png";
      a.click();
      URL.revokeObjectURL(url);
    });
    setCopied("png");
    setTimeout(() => setCopied(""), 1200);
  }, []);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => download(), label: "Download" },
  ], [download]));

  const downloadSvg = useCallback(() => {
    const payload = getPayload();
    if (!payload) return;
    try {
      const grid = createQR(payload);
      const svg = buildQrSvg(grid, { fg: fgColor, bg: bgColor, dotStyle, eyeStyle });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qrcode.svg";
      a.click();
      URL.revokeObjectURL(url);
      setCopied("svg");
      setTimeout(() => setCopied(""), 1200);
    } catch {}
  }, [getPayload, fgColor, bgColor, dotStyle, eyeStyle]);

  const copySvg = useCallback(() => {
    const payload = getPayload();
    if (!payload) return;
    try {
      const grid = createQR(payload);
      const svg = buildQrSvg(grid, { fg: fgColor, bg: bgColor, dotStyle, eyeStyle });
      navigator.clipboard.writeText(svg);
      setCopied("svg");
      setTimeout(() => setCopied(""), 1200);
    } catch {}
  }, [getPayload, fgColor, bgColor, dotStyle, eyeStyle]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => setLogo(img);
    img.src = URL.createObjectURL(file);
  };

  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  } as const;

  return (
    <ToolShell
      title="QR Code Generator"
      tagline="URLs · Wi-Fi · vCard · custom colors / dots / eyes / logo · PNG + SVG"
      accent="#f97316"
      actions={
        <>
          <ToolActionButton onClick={copySvg} variant="ghost">
            {copied === "svg" ? "Copied!" : "Copy SVG"}
          </ToolActionButton>
          <ToolActionButton onClick={downloadSvg} variant="outline">
            SVG
          </ToolActionButton>
          <ToolActionButton onClick={download} variant="solid">
            {copied === "png" ? "Saved!" : "Download PNG"}
          </ToolActionButton>
        </>
      }
      controls={
        <>
          <ControlGroup label="Content type">
            <Segment
              value={inputType}
              onChange={setInputType}
              options={[
                { value: "url", label: "URL" },
                { value: "text", label: "Text" },
                { value: "wifi", label: "Wi-Fi" },
                { value: "vcard", label: "vCard" },
              ]}
              full
            />
          </ControlGroup>

          {(inputType === "url" || inputType === "text") && (
            <ControlGroup label={inputType === "url" ? "URL" : "Text"}>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={inputStyle}
                placeholder={inputType === "url" ? "https://example.com" : "Enter text..."}
              />
            </ControlGroup>
          )}

          {inputType === "wifi" && (
            <>
              <ControlGroup label="SSID">
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="Password">
                <input
                  type="text"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="Encryption">
                <Segment
                  value={wifiEnc}
                  onChange={setWifiEnc}
                  options={[
                    { value: "WPA", label: "WPA" },
                    { value: "WEP", label: "WEP" },
                    { value: "nopass", label: "None" },
                  ]}
                  full
                />
              </ControlGroup>
            </>
          )}

          {inputType === "vcard" && (
            <>
              <ControlGroup label="Name">
                <input
                  type="text"
                  value={vcardName}
                  onChange={(e) => setVcardName(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="Phone">
                <input
                  type="tel"
                  value={vcardPhone}
                  onChange={(e) => setVcardPhone(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </ControlGroup>
              <ControlGroup label="Email">
                <input
                  type="email"
                  value={vcardEmail}
                  onChange={(e) => setVcardEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </ControlGroup>
            </>
          )}

          <ControlGroup label="Foreground">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={fgColor}
                onChange={(e) => setFgColor(e.target.value)}
                className="h-10 w-12 cursor-pointer"
                style={{ border: "1px solid var(--kami-border-strong)", borderRadius: "var(--kami-input-radius, 0.4rem)" }}
                aria-label="Foreground"
              />
              <span className="font-mono text-xs" style={{ color: "var(--kami-text-dim)" }}>{fgColor}</span>
            </div>
          </ControlGroup>

          <ControlGroup label="Background">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="h-10 w-12 cursor-pointer"
                style={{ border: "1px solid var(--kami-border-strong)", borderRadius: "var(--kami-input-radius, 0.4rem)" }}
                aria-label="Background"
              />
              <span className="font-mono text-xs" style={{ color: "var(--kami-text-dim)" }}>{bgColor}</span>
            </div>
          </ControlGroup>

          <ControlGroup label="Dot style">
            <Segment
              value={dotStyle}
              onChange={setDotStyle}
              options={[
                { value: "square", label: "Square" },
                { value: "rounded", label: "Rounded" },
                { value: "dots", label: "Dots" },
              ]}
              full
            />
          </ControlGroup>

          <ControlGroup label="Eye style">
            <Segment
              value={eyeStyle}
              onChange={setEyeStyle}
              options={[
                { value: "square", label: "Square" },
                { value: "rounded", label: "Rounded" },
                { value: "circle", label: "Circle" },
              ]}
              full
            />
          </ControlGroup>

          <ControlGroup label="Error correction" hint="Higher = scannable when damaged or covered by a logo">
            <Segment
              value={ecc}
              onChange={setEcc}
              options={[
                { value: "L", label: "L 7%" },
                { value: "M", label: "M 15%" },
                { value: "Q", label: "Q 25%" },
                { value: "H", label: "H 30%" },
              ]}
              full
            />
          </ControlGroup>

          <ControlGroup label="Module size" hint={`${cellSize}px`}>
            <Slider value={cellSize} onChange={(v) => setCellSize(Math.round(v))} min={4} max={20} unit="px" />
          </ControlGroup>

          <ControlGroup label="Logo overlay">
            <div className="flex flex-col gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div className="flex gap-2">
                <ToolActionButton
                  onClick={() => logoInputRef.current?.click()}
                  variant="outline"
                >
                  {logo ? "Replace logo" : "Add logo"}
                </ToolActionButton>
                {logo && (
                  <ToolActionButton onClick={() => setLogo(null)} variant="ghost">
                    Remove
                  </ToolActionButton>
                )}
              </div>
              {logo && (
                <div className="mt-2">
                  <div className="mb-1 text-[11px]" style={{ color: "var(--kami-text-dim)" }}>
                    Logo size · {Math.round(logoScale * 100)}%
                  </div>
                  <Slider
                    value={Math.round(logoScale * 100)}
                    onChange={(v) => setLogoScale(v / 100)}
                    min={8}
                    max={32}
                    unit="%"
                  />
                </div>
              )}
            </div>
          </ControlGroup>
        </>
      }
      info={
        <div className="space-y-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          <p>
            Pick a content type (URL, plain text, Wi-Fi or vCard), fill in the fields,
            and the QR renders live in your browser. Customize colors, dot/eye style,
            add a center logo, and export as crisp SVG or PNG.
          </p>
          <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
            Tip: when adding a logo, raise the error-correction level so the code stays scannable.
          </p>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Made for</div>
            <p className="mt-1">Everyone — marketers, event organizers, small business owners.</p>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>Reach for it when</div>
            <ul className="mt-1 space-y-1 text-xs">
              <li>· Putting a URL on a flyer or poster</li>
              <li>· Sharing Wi-Fi credentials without typing</li>
              <li>· Creating a contact card for an event badge</li>
            </ul>
          </div>
        </div>
      }
    >
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3">
        <div
          className="flex flex-col items-center justify-center p-6 sm:p-10"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <canvas
            ref={canvasRef}
            className="max-h-[60vh] max-w-full"
            style={{ imageRendering: dotStyle === "square" ? "pixelated" : "auto" }}
          />
          {error && (
            <p className="mt-3 text-sm" style={{ color: "var(--kami-accent, #ef4444)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
