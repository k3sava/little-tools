"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Select } from "@/components/tools/controls";

// --- Types ---

type HashAlgo = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
type OutputFormat = "hex-lower" | "hex-upper" | "base64";
type Tab = "hash" | "hmac" | "verify" | "compare";

const ALGO_LIST: HashAlgo[] = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"];

const ALGO_INFO: Record<HashAlgo, { bits: number; note: string }> = {
  MD5: { bits: 128, note: "Fast but cryptographically broken. Use for checksums only." },
  "SHA-1": { bits: 160, note: "Deprecated for security. Still used in Git." },
  "SHA-256": { bits: 256, note: "Industry standard. Use this for most purposes." },
  "SHA-384": { bits: 384, note: "Truncated SHA-512. Used in TLS." },
  "SHA-512": { bits: 512, note: "Strongest SHA-2 variant. Faster than SHA-256 on 64-bit." },
};

// --- MD5 (not in Web Crypto) ---

function md5(input: Uint8Array): Uint8Array {
  const K = new Uint32Array([
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a,
    0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be,
    0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821, 0xf61e2562, 0xc040b340,
    0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
    0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c,
    0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70, 0x289b7ec6, 0xeaa127fa,
    0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92,
    0xffeff47d, 0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
    0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391,
  ]);
  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const len = input.length;
  const bitLen = len * 8;
  const padLen = ((56 - (len + 1) % 64) + 64) % 64;
  const totalLen = len + 1 + padLen + 8;
  const buf = new Uint8Array(totalLen);
  buf.set(input);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(totalLen - 8, bitLen >>> 0, true);
  view.setUint32(totalLen - 4, Math.floor(bitLen / 0x100000000) >>> 0, true);

  let a0 = 0x67452301 >>> 0;
  let b0 = 0xefcdab89 >>> 0;
  let c0 = 0x98badcfe >>> 0;
  let d0 = 0x10325476 >>> 0;

  for (let offset = 0; offset < totalLen; offset += 64) {
    const M = new Uint32Array(16);
    for (let j = 0; j < 16; j++) M[j] = view.getUint32(offset + j * 4, true);
    let A = a0, B = b0, C = c0, D = d0;
    for (let i = 0; i < 64; i++) {
      let F: number, g: number;
      if (i < 16) { F = (B & C) | (~B & D); g = i; }
      else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
      else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
      else { F = C ^ (B | ~D); g = (7 * i) % 16; }
      F = ((F >>> 0) + A + K[i] + M[g]) >>> 0;
      A = D; D = C; C = B;
      const rotated = ((F << S[i]) | (F >>> (32 - S[i]))) >>> 0;
      B = (B + rotated) >>> 0;
    }
    a0 = (a0 + A) >>> 0;
    b0 = (b0 + B) >>> 0;
    c0 = (c0 + C) >>> 0;
    d0 = (d0 + D) >>> 0;
  }

  const result = new DataView(new ArrayBuffer(16));
  result.setUint32(0, a0, true);
  result.setUint32(4, b0, true);
  result.setUint32(8, c0, true);
  result.setUint32(12, d0, true);
  return new Uint8Array(result.buffer);
}

// --- Hash computation ---

async function computeHashRaw(algo: string, data: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest(algo, data.buffer as ArrayBuffer);
  return new Uint8Array(hashBuffer);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function formatHash(bytes: Uint8Array, format: OutputFormat): string {
  switch (format) {
    case "hex-lower": return bytesToHex(bytes);
    case "hex-upper": return bytesToHex(bytes).toUpperCase();
    case "base64": return bytesToBase64(bytes);
  }
}

async function computeAllHashes(data: Uint8Array): Promise<Record<HashAlgo, Uint8Array>> {
  const [sha1, sha256, sha384, sha512] = await Promise.all([
    computeHashRaw("SHA-1", data),
    computeHashRaw("SHA-256", data),
    computeHashRaw("SHA-384", data),
    computeHashRaw("SHA-512", data),
  ]);
  return {
    MD5: md5(data),
    "SHA-1": sha1,
    "SHA-256": sha256,
    "SHA-384": sha384,
    "SHA-512": sha512,
  };
}

// --- HMAC ---

async function computeHmac(algo: HashAlgo, data: Uint8Array, secret: string): Promise<Uint8Array> {
  if (algo === "MD5") {
    const blockSize = 64;
    let keyBytes: Uint8Array = new Uint8Array(new TextEncoder().encode(secret));
    if (keyBytes.length > blockSize) keyBytes = md5(keyBytes);
    const paddedKey = new Uint8Array(blockSize);
    paddedKey.set(keyBytes);

    const ipad = new Uint8Array(blockSize);
    const opad = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
      ipad[i] = paddedKey[i] ^ 0x36;
      opad[i] = paddedKey[i] ^ 0x5c;
    }

    const inner = new Uint8Array(blockSize + data.length);
    inner.set(ipad);
    inner.set(data, blockSize);
    const innerHash = md5(inner);

    const outer = new Uint8Array(blockSize + innerHash.length);
    outer.set(opad);
    outer.set(innerHash, blockSize);
    return md5(outer);
  }

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: algo }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data.buffer as ArrayBuffer);
  return new Uint8Array(sig);
}

// --- CRC32 ---

function crc32(data: Uint8Array): string {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, "0");
}

// --- Bcrypt cost estimate (educational; rough timing estimate) ---

function bcryptCostEstimate(rounds: number): string {
  // Roughly: 2^rounds operations at ~50k ops/sec on commodity hardware
  const ops = Math.pow(2, rounds);
  const seconds = ops / 50000;
  if (seconds < 1) return `${(seconds * 1000).toFixed(1)} ms / hash`;
  if (seconds < 60) return `${seconds.toFixed(2)} s / hash`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(2)} min / hash`;
  return `${(seconds / 3600).toFixed(2)} hr / hash`;
}

// --- Detect hash algo from length ---

function detectAlgoFromHash(hash: string): HashAlgo | "CRC32" | null {
  const clean = hash.trim().toLowerCase();
  if (/^[A-Za-z0-9+/]+=*$/.test(clean) && !(/^[0-9a-f]+$/.test(clean))) {
    try {
      const decoded = atob(clean);
      const len = decoded.length;
      if (len === 16) return "MD5";
      if (len === 20) return "SHA-1";
      if (len === 32) return "SHA-256";
      if (len === 48) return "SHA-384";
      if (len === 64) return "SHA-512";
    } catch { /* not base64 */ }
  }
  if (/^[0-9a-f]+$/.test(clean)) {
    if (clean.length === 8) return "CRC32";
    if (clean.length === 32) return "MD5";
    if (clean.length === 40) return "SHA-1";
    if (clean.length === 64) return "SHA-256";
    if (clean.length === 96) return "SHA-384";
    if (clean.length === 128) return "SHA-512";
  }
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// --- UI ---

export default function HashGeneratorContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [tab, setTab] = useState<Tab>("hash");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [hashBytes, setHashBytes] = useState<Record<HashAlgo, Uint8Array> | null>(null);
  const [crc, setCrc] = useState<string>("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("hex-lower");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // HMAC state
  const [hmacAlgo, setHmacAlgo] = useState<HashAlgo>("SHA-256");
  const [hmacSecret, setHmacSecret] = useState("");
  const [hmacResult, setHmacResult] = useState<Uint8Array | null>(null);

  // Verify state
  const [verifyHash, setVerifyHash] = useState("");

  // Compare state
  const [compareA, setCompareA] = useState("");
  const [compareB, setCompareB] = useState("");

  // Bcrypt cost rounds
  const [bcryptRounds, setBcryptRounds] = useState(10);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataRef = useRef<Uint8Array | null>(null);

  const updateHashes = useCallback(async (data: Uint8Array) => {
    dataRef.current = data;
    const result = await computeAllHashes(data);
    setHashBytes(result);
    setCrc(crc32(data));
  }, []);

  useEffect(() => {
    if (!input && !fileName) {
      setHashBytes(null);
      setCrc("");
      dataRef.current = null;
      return;
    }
    if (!fileName) {
      const encoder = new TextEncoder();
      updateHashes(encoder.encode(input));
    }
  }, [input, fileName, updateHashes]);

  useEffect(() => {
    if (!dataRef.current || !hmacSecret || tab !== "hmac") {
      setHmacResult(null);
      return;
    }
    let cancelled = false;
    computeHmac(hmacAlgo, dataRef.current, hmacSecret).then((r) => {
      if (!cancelled) setHmacResult(r);
    });
    return () => { cancelled = true; };
  }, [hmacAlgo, hmacSecret, tab, hashBytes]);

  const handleFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setFileSize(file.size);
    setInput("");
    const buffer = await file.arrayBuffer();
    updateHashes(new Uint8Array(buffer));
  }, [updateHashes, setInput]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleCopy = useCallback(async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }, []);

  const handleClear = useCallback(() => {
    setInput("");
    setFileName(null);
    setFileSize(0);
    setHashBytes(null);
    setCrc("");
    setHmacResult(null);
    setVerifyHash("");
    dataRef.current = null;
  }, [setInput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { if (hashBytes) { const h = formatHash(hashBytes["SHA-256"], outputFormat); navigator.clipboard.writeText(h); setCopiedKey("SHA-256"); setTimeout(() => setCopiedKey(null), 2000); } }, label: "Copy SHA-256" },
    { key: "k", meta: true, action: handleClear, label: "Clear" },
  ], [hashBytes, outputFormat, handleClear]));

  const verifyNormalized = verifyHash.trim().toLowerCase();
  const detectedAlgo = useMemo(() => detectAlgoFromHash(verifyHash), [verifyHash]);
  const verifyMatch = useMemo(() => {
    if (!hashBytes || !verifyNormalized) return null;
    for (const algo of ALGO_LIST) {
      const hex = bytesToHex(hashBytes[algo]);
      const upper = hex.toUpperCase();
      const b64 = bytesToBase64(hashBytes[algo]);
      if (verifyNormalized === hex || verifyNormalized === upper.toLowerCase() || verifyHash.trim() === b64) {
        return algo;
      }
    }
    if (verifyNormalized === crc) return "CRC32" as const;
    return false;
  }, [hashBytes, verifyNormalized, verifyHash, crc]);

  // Compare result
  const compareDiff = useMemo(() => {
    if (!compareA.trim() || !compareB.trim()) return null;
    const a = compareA.trim();
    const b = compareB.trim();
    const equal = a.toLowerCase() === b.toLowerCase();
    const maxLen = Math.max(a.length, b.length);
    const diffPositions: number[] = [];
    for (let i = 0; i < maxLen; i++) {
      if (a[i]?.toLowerCase() !== b[i]?.toLowerCase()) diffPositions.push(i);
    }
    return { equal, diffPositions, a, b };
  }, [compareA, compareB]);

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  } as const;

  return (
    <ToolShell
      title="Hash Generator"
      tagline="MD5 · SHA · HMAC · verify · compare · file hashing"
      accent="#10b981"
      materialFab={{ label: "Copy hash", onClick: () => { if (hashBytes) handleCopy("SHA-256", formatHash(hashBytes["SHA-256"], outputFormat)); } }}
      actions={
        <>
          {(input || fileName) && (
            <ToolActionButton onClick={handleClear} variant="ghost">Clear</ToolActionButton>
          )}
          {hashBytes && (
            <ToolActionButton
              onClick={() => handleCopy("SHA-256", formatHash(hashBytes["SHA-256"], outputFormat))}
              variant="solid"
            >
              {copiedKey === "SHA-256" ? "Copied" : "Copy SHA-256"}
            </ToolActionButton>
          )}
        </>
      }
      controls={
        <>
          <ControlGroup label="Mode">
            <Segment<Tab>
              value={tab}
              onChange={setTab}
              options={[
                { value: "hash", label: "Hash" },
                { value: "hmac", label: "HMAC" },
                { value: "verify", label: "Verify" },
                { value: "compare", label: "Compare" },
              ]}
              full
              size="sm"
            />
          </ControlGroup>
          <ControlGroup label="Output format">
            <Segment<OutputFormat>
              value={outputFormat}
              onChange={setOutputFormat}
              options={[
                { value: "hex-lower", label: "hex" },
                { value: "hex-upper", label: "HEX" },
                { value: "base64", label: "Base64" },
              ]}
              full
            />
          </ControlGroup>
          {tab === "hmac" && (
            <ControlGroup label="HMAC algorithm">
              <Select<HashAlgo>
                value={hmacAlgo}
                onChange={setHmacAlgo}
                options={ALGO_LIST.map((a) => ({ value: a, label: `HMAC-${a}` }))}
              />
            </ControlGroup>
          )}
          <ControlGroup label={`Bcrypt cost (rounds = ${bcryptRounds})`}>
            <input
              type="range"
              min={4}
              max={16}
              value={bcryptRounds}
              onChange={(e) => setBcryptRounds(parseInt(e.target.value, 10))}
              className="kc-range"
              style={{ ["--kc-fill" as string]: `${((bcryptRounds - 4) / 12) * 100}%` }}
            />
            <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
              ≈ {bcryptCostEstimate(bcryptRounds)} on commodity hardware
            </p>
          </ControlGroup>
        </>
      }
    >
      <div
        className="flex flex-col gap-4"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {/* Input area (drop zone) */}
        <div
          className="transition-colors"
          style={{
            background: dragOver
              ? "color-mix(in srgb, #10b981 8%, var(--kami-surface))"
              : "var(--kami-input-bg, var(--kami-surface-solid))",
            border: `2px dashed ${dragOver ? "#10b981" : "var(--kami-border-strong)"}`,
            borderRadius: "var(--kami-card-radius, 0.75rem)",
          }}
        >
          {fileName ? (
            <div className="flex items-center justify-between px-4 py-6">
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>{fileName}</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--kami-text-dim)" }}>{formatSize(fileSize)}</p>
              </div>
              <ToolActionButton onClick={handleClear} variant="ghost">Remove</ToolActionButton>
            </div>
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text, or drag & drop a file to hash..."
              className="w-full bg-transparent px-4 py-3 text-base focus:outline-none resize-none font-mono"
              style={{ color: "var(--kami-text)", minHeight: 120 }}
              rows={4}
              autoFocus
              spellCheck={false}
            />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          <label className="cursor-pointer" style={{ color: "var(--kami-text-dim)" }}>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
            Or choose a file…
          </label>
          {!fileName && input && (
            <span style={{ color: "var(--kami-text-dim)" }}>{new TextEncoder().encode(input).length} bytes</span>
          )}
          {fileName && (
            <span style={{ color: "var(--kami-text-dim)" }}>{formatSize(fileSize)}</span>
          )}
        </div>

        {/* Hash tab */}
        {tab === "hash" && hashBytes && (
          <div className="flex flex-col gap-2">
            <HashRow
              label="CRC32"
              value={outputFormat === "hex-upper" ? crc.toUpperCase() : crc}
              bits={32}
              copied={copiedKey === "CRC32"}
              onCopy={() => handleCopy("CRC32", outputFormat === "hex-upper" ? crc.toUpperCase() : crc)}
            />
            {ALGO_LIST.map((algo) => {
              const formatted = formatHash(hashBytes[algo], outputFormat);
              return (
                <HashRow
                  key={algo}
                  label={algo}
                  value={formatted}
                  bits={ALGO_INFO[algo].bits}
                  copied={copiedKey === algo}
                  onCopy={() => handleCopy(algo, formatted)}
                  highlight={algo === "SHA-256"}
                />
              );
            })}
          </div>
        )}

        {/* HMAC tab */}
        {tab === "hmac" && (
          <div className="flex flex-col gap-3">
            <div className="p-4" style={cardStyle}>
              <label className="text-xs mb-1 block" style={{ color: "var(--kami-text-muted)" }}>Secret key</label>
              <input
                type="text"
                value={hmacSecret}
                onChange={(e) => setHmacSecret(e.target.value)}
                placeholder="Enter secret key..."
                className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                style={{ ...inputStyle, minHeight: 40 }}
                spellCheck={false}
              />
            </div>

            {hmacResult && hmacSecret && hashBytes && (
              <div className="px-4 py-3" style={cardStyle}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>HMAC-{hmacAlgo}</span>
                  <ToolActionButton
                    onClick={() => handleCopy("hmac", formatHash(hmacResult, outputFormat))}
                    variant="ghost"
                  >
                    {copiedKey === "hmac" ? "Copied" : "Copy"}
                  </ToolActionButton>
                </div>
                <p className="font-mono text-sm break-all select-all" style={{ color: "var(--kami-text)" }}>
                  {formatHash(hmacResult, outputFormat)}
                </p>
              </div>
            )}

            {!hashBytes && (
              <p className="text-sm text-center py-8" style={{ color: "var(--kami-text-dim)" }}>Enter text or drop a file above to compute HMAC</p>
            )}
            {hashBytes && !hmacSecret && (
              <p className="text-sm text-center py-8" style={{ color: "var(--kami-text-dim)" }}>Enter a secret key to compute HMAC</p>
            )}
          </div>
        )}

        {/* Verify tab */}
        {tab === "verify" && (
          <div className="flex flex-col gap-3">
            <div className="p-4" style={cardStyle}>
              <label className="text-xs mb-1 block" style={{ color: "var(--kami-text-muted)" }}>Expected hash</label>
              <input
                value={verifyHash}
                onChange={(e) => setVerifyHash(e.target.value)}
                placeholder="Paste expected hash (hex or base64)..."
                className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                style={{ ...inputStyle, minHeight: 40 }}
                spellCheck={false}
              />
              {verifyNormalized && detectedAlgo && (
                <span
                  className="mt-2 inline-block px-2 py-0.5 text-xs"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                  }}
                >
                  Detected: {detectedAlgo}
                </span>
              )}
            </div>

            {hashBytes && verifyNormalized && verifyMatch !== null && (
              <div
                className="px-4 py-4"
                style={{
                  background: verifyMatch
                    ? "color-mix(in srgb, #16a34a 10%, var(--kami-surface))"
                    : "color-mix(in srgb, #dc2626 10%, var(--kami-surface))",
                  border: `1px solid ${verifyMatch ? "color-mix(in srgb, #16a34a 30%, transparent)" : "color-mix(in srgb, #dc2626 30%, transparent)"}`,
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                }}
              >
                <p className="font-medium" style={{ color: verifyMatch ? "#16a34a" : "#dc2626" }}>
                  {verifyMatch ? `✓ Match — ${verifyMatch}` : "✗ No match"}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--kami-text-muted)" }}>
                  {verifyMatch
                    ? "The hash matches the input data. Integrity verified."
                    : "The hash does not match any algorithm output."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Compare tab */}
        {tab === "compare" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--kami-text-muted)" }}>Hash A</label>
                <textarea
                  value={compareA}
                  onChange={(e) => setCompareA(e.target.value)}
                  placeholder="Paste first hash..."
                  className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                  style={{ ...inputStyle, minHeight: 80 }}
                  spellCheck={false}
                />
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <label className="text-xs" style={{ color: "var(--kami-text-muted)" }}>Hash B</label>
                <textarea
                  value={compareB}
                  onChange={(e) => setCompareB(e.target.value)}
                  placeholder="Paste second hash..."
                  className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                  style={{ ...inputStyle, minHeight: 80 }}
                  spellCheck={false}
                />
              </div>
            </div>

            {compareDiff && (
              <div
                className="p-4"
                style={{
                  background: compareDiff.equal
                    ? "color-mix(in srgb, #16a34a 10%, var(--kami-surface))"
                    : "color-mix(in srgb, #f59e0b 10%, var(--kami-surface))",
                  border: `1px solid ${compareDiff.equal ? "color-mix(in srgb, #16a34a 30%, transparent)" : "color-mix(in srgb, #f59e0b 30%, transparent)"}`,
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                }}
              >
                <p className="font-medium" style={{ color: compareDiff.equal ? "#16a34a" : "#b45309" }}>
                  {compareDiff.equal ? "✓ Hashes are identical" : `✗ ${compareDiff.diffPositions.length} differing character${compareDiff.diffPositions.length !== 1 ? "s" : ""}`}
                </p>
                {!compareDiff.equal && (
                  <div className="mt-3 font-mono text-xs break-all" style={{ color: "var(--kami-text)" }}>
                    <div className="mb-2">
                      <span className="block text-[10px] uppercase mb-0.5" style={{ color: "var(--kami-text-dim)" }}>A</span>
                      {Array.from({ length: Math.max(compareDiff.a.length, compareDiff.b.length) }).map((_, i) => (
                        <span
                          key={i}
                          style={compareDiff.diffPositions.includes(i) ? { background: "color-mix(in srgb, #dc2626 30%, transparent)" } : undefined}
                        >
                          {compareDiff.a[i] || " "}
                        </span>
                      ))}
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase mb-0.5" style={{ color: "var(--kami-text-dim)" }}>B</span>
                      {Array.from({ length: Math.max(compareDiff.a.length, compareDiff.b.length) }).map((_, i) => (
                        <span
                          key={i}
                          style={compareDiff.diffPositions.includes(i) ? { background: "color-mix(in srgb, #16a34a 30%, transparent)" } : undefined}
                        >
                          {compareDiff.b[i] || " "}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </ToolShell>
  );
}

// --- Hash row component ---

function HashRow({
  label,
  value,
  bits,
  copied,
  onCopy,
  highlight,
}: {
  label: string;
  value: string;
  bits: number;
  copied: boolean;
  onCopy: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--kami-surface-solid)",
        border: `1px solid ${highlight ? "var(--kami-text-dim)" : "var(--kami-border-strong)"}`,
        borderRadius: "var(--kami-card-radius, 0.75rem)",
        boxShadow: "var(--kami-card-shadow, none)",
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 gap-2"
        style={{ borderBottom: "1px solid var(--kami-border)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-semibold" style={{ color: "var(--kami-text)" }}>{label}</span>
          <span
            className="px-1.5 py-0.5 text-[10px] rounded"
            style={{ background: "var(--kami-surface)", color: "var(--kami-text-dim)" }}
          >
            {bits}-bit
          </span>
          {highlight && (
            <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">recommended</span>
          )}
        </div>
        <ToolActionButton onClick={onCopy} variant="ghost">{copied ? "Copied" : "Copy"}</ToolActionButton>
      </div>
      <div className="px-4 py-2.5">
        <p className="font-mono text-sm break-all select-all" style={{ color: "var(--kami-text)" }}>{value}</p>
      </div>
    </div>
  );
}
