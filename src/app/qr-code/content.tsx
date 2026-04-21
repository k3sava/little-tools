"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";

// --- Minimal QR Code Generator (Version 1-6, Byte mode, ECC-L) ---
// This implements a basic QR encoder sufficient for URLs and text up to ~100 chars.

type InputType = "url" | "text" | "wifi" | "vcard";

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

// --- Rendering ---

function renderQRToCanvas(
  canvas: HTMLCanvasElement,
  grid: boolean[][],
  fg: string,
  bg: string,
  cellSize: number,
  quiet: number,
) {
  const size = grid.length;
  const total = size * cellSize + quiet * 2;
  canvas.width = total;
  canvas.height = total;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, total, total);
  ctx.fillStyle = fg;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c]) {
        ctx.fillRect(quiet + c * cellSize, quiet + r * cellSize, cellSize, cellSize);
      }
    }
  }
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState("");

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
      renderQRToCanvas(canvasRef.current, grid, fgColor, bgColor, cellSize, cellSize * 4);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      setError("Failed to generate QR code");
    }
  }, [getPayload, fgColor, bgColor, cellSize]);

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
  }, []);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => download(), label: "Download" },
  ], [download]));

  const copySvg = useCallback(() => {
    const payload = getPayload();
    if (!payload) return;
    try {
      const grid = createQR(payload);
      const size = grid.length;
      const quiet = 4;
      const total = size + quiet * 2;
      let paths = "";
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (grid[r][c]) {
            paths += `<rect x="${c + quiet}" y="${r + quiet}" width="1" height="1" fill="${fgColor}"/>`;
          }
        }
      }
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}"><rect width="${total}" height="${total}" fill="${bgColor}"/>${paths}</svg>`;
      navigator.clipboard.writeText(svg);
    } catch {}
  }, [getPayload, fgColor, bgColor]);

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:py-14">        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">QR Code Generator</h1>
        <p className="mt-2 text-gray-500">Generate QR codes for URLs, text, WiFi, and vCards. All client-side.</p>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Preview */}
          <div className="flex flex-col items-center rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
            <canvas ref={canvasRef} className="max-w-full" style={{ imageRendering: "pixelated" }} />
            {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button onClick={download} className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
                Download PNG
              </button>
              <button onClick={copySvg} className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Copy SVG
              </button>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Input type */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Type</h3>
              <div className="flex flex-wrap gap-1.5">
                {(["url", "text", "wifi", "vcard"] as InputType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setInputType(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs capitalize ${
                      inputType === t ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t === "vcard" ? "vCard" : t === "wifi" ? "WiFi" : t}
                  </button>
                ))}
              </div>
            </div>

            {/* Input fields */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              {(inputType === "url" || inputType === "text") && (
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    {inputType === "url" ? "URL" : "Text"}
                  </label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none"
                    placeholder={inputType === "url" ? "https://example.com" : "Enter text..."}
                  />
                </div>
              )}
              {inputType === "wifi" && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">SSID</label>
                    <input type="text" value={wifiSsid} onChange={(e) => setWifiSsid(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Password</label>
                    <input type="text" value={wifiPass} onChange={(e) => setWifiPass(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Encryption</label>
                    <select value={wifiEnc} onChange={(e) => setWifiEnc(e.target.value)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None</option>
                    </select>
                  </div>
                </div>
              )}
              {inputType === "vcard" && (
                <div className="space-y-2">
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Name</label>
                    <input type="text" value={vcardName} onChange={(e) => setVcardName(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Phone</label>
                    <input type="tel" value={vcardPhone} onChange={(e) => setVcardPhone(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-500">Email</label>
                    <input type="email" value={vcardEmail} onChange={(e) => setVcardEmail(e.target.value)} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-gray-400 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>

            {/* Style */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Style</h3>
              <div className="mb-2 flex items-center gap-2">
                <span className="w-12 text-xs text-gray-500">FG</span>
                <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)} className="h-7 w-7 cursor-pointer rounded border border-gray-200" />
                <span className="text-xs font-mono text-gray-400">{fgColor}</span>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="w-12 text-xs text-gray-500">BG</span>
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="h-7 w-7 cursor-pointer rounded border border-gray-200" />
                <span className="text-xs font-mono text-gray-400">{bgColor}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs text-gray-500">Size</span>
                <input type="range" min={4} max={16} value={cellSize} onChange={(e) => setCellSize(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-700" />
                <span className="w-10 text-right text-xs font-mono text-gray-400">{cellSize}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
