"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Types ---

type HashAlgo = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";
type OutputFormat = "hex-lower" | "hex-upper" | "base64";
type Tab = "hash" | "hmac" | "verify";

interface Hashes {
  MD5: string;
  "SHA-1": string;
  "SHA-256": string;
  "SHA-384": string;
  "SHA-512": string;
}

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
    for (let j = 0; j < 16; j++) {
      M[j] = view.getUint32(offset + j * 4, true);
    }
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
    // HMAC-MD5: manual implementation
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

// --- CRC32 (fast integrity check) ---

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

// --- Detect hash algorithm from length ---

function detectAlgoFromHash(hash: string): HashAlgo | "CRC32" | null {
  const clean = hash.trim().toLowerCase();
  // Check if base64
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
  // Hex
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
  const [expandedAlgo, setExpandedAlgo] = useState<HashAlgo | null>(null);

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

  // HMAC computation
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
  }, [hmacAlgo, hmacSecret, tab, hashBytes]); // hashBytes as proxy for data change

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

  // Verify logic
  const verifyNormalized = verifyHash.trim().toLowerCase();
  const detectedAlgo = useMemo(() => detectAlgoFromHash(verifyHash), [verifyHash]);
  const verifyMatch = useMemo(() => {
    if (!hashBytes || !verifyNormalized) return null;
    // Check against all formats
    for (const algo of ALGO_LIST) {
      const hex = bytesToHex(hashBytes[algo]);
      const upper = hex.toUpperCase();
      const b64 = bytesToBase64(hashBytes[algo]);
      if (verifyNormalized === hex || verifyNormalized === upper.toLowerCase() || verifyHash.trim() === b64) {
        return algo;
      }
    }
    // CRC32
    if (verifyNormalized === crc) return "CRC32" as const;
    return false;
  }, [hashBytes, verifyNormalized, verifyHash, crc]);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "hash", label: "Hash" },
    { id: "hmac", label: "HMAC" },
    { id: "verify", label: "Verify" },
  ];

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Hash Generator"
          tagline="Generate MD5, SHA-1, SHA-256/384/512, and CRC32 hashes of text or files - plus HMAC and checksum verification."
          description="Paste text or drop a file; we compute every major hash at once. Three modes: (1) Hash - all algorithms in one click; (2) HMAC - keyed hash with a secret; (3) Verify - paste an expected hash and we tell you if it matches (with char-by-char diff when it doesn't)."
          audience={["Developers", "Security engineers", "Ops"]}
          whenToUse={[
            "Verifying a download against a published checksum",
            "Computing an integrity hash for a CDN <script integrity=…>",
            "Signing a webhook payload with HMAC",
          ]}
        />

        {/* Tabs */}
        <div
          className="mb-6 flex items-center gap-1 px-1 py-0.5 w-fit"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-input-radius, 0.5rem)",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="px-4 py-1.5 text-sm font-medium transition-colors"
              style={{
                background: tab === t.id ? "var(--kami-cta-bg, #111827)" : "transparent",
                color: tab === t.id ? "var(--kami-cta-text, #ffffff)" : "var(--kami-text-muted)",
                borderRadius: "var(--kami-cta-radius, 0.25rem)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="transition-colors"
          style={{
            background: dragOver ? "var(--kami-surface)" : "var(--kami-input-bg, var(--kami-surface-solid))",
            border: `2px dashed ${dragOver ? "var(--kami-text-dim)" : "var(--kami-border-strong)"}`,
            borderRadius: "var(--kami-card-radius, 0.75rem)",
          }}
        >
          {fileName ? (
            <div className="flex items-center justify-between px-4 py-6">
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>{fileName}</span>
                <p className="text-xs mt-0.5" style={{ color: "var(--kami-text-dim)" }}>{formatSize(fileSize)}</p>
              </div>
              <button onClick={handleClear} className="text-sm" style={{ color: "var(--kami-text-dim)" }}>Remove</button>
            </div>
          ) : (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter text or drag & drop a file..."
              className="w-full bg-transparent px-4 py-3 text-base focus:outline-none resize-none font-mono"
              style={{ color: "var(--kami-text)", borderRadius: "var(--kami-card-radius, 0.75rem)" }}
              rows={4}
              autoFocus
              spellCheck={false}
            />
          )}
        </div>

        <div className="mt-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <label className="cursor-pointer" style={{ color: "var(--kami-text-dim)" }}>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
              />
              Or choose a file
            </label>
            {!fileName && input && (
              <span style={{ color: "var(--kami-text-dim)" }}>{new TextEncoder().encode(input).length} bytes</span>
            )}
          </div>
          {(input || fileName) && !fileName && (
            <button onClick={handleClear} style={{ color: "var(--kami-text-dim)" }}>Clear</button>
          )}
        </div>

        {/* Output format selector */}
        {hashBytes && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>Format:</span>
            {([
              { id: "hex-lower" as const, label: "hex" },
              { id: "hex-upper" as const, label: "HEX" },
              { id: "base64" as const, label: "Base64" },
            ]).map((f) => (
              <button
                key={f.id}
                onClick={() => setOutputFormat(f.id)}
                className="px-2.5 py-0.5 text-xs font-medium transition-colors"
                style={{
                  background: outputFormat === f.id ? "var(--kami-surface)" : "transparent",
                  color: outputFormat === f.id ? "var(--kami-text)" : "var(--kami-text-muted)",
                  borderRadius: "var(--kami-cta-radius, 0.375rem)",
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Hash tab */}
        {tab === "hash" && hashBytes && (
          <div className="mt-6 space-y-3">
            {/* CRC32 */}
            <HashRow
              label="CRC32"
              value={outputFormat === "hex-upper" ? crc.toUpperCase() : crc}
              bits={32}
              note="Fast error detection. Not cryptographic."
              copied={copiedKey === "CRC32"}
              onCopy={() => handleCopy("CRC32", outputFormat === "hex-upper" ? crc.toUpperCase() : crc)}
              expanded={expandedAlgo === ("CRC32" as HashAlgo)}
              onToggleInfo={() => setExpandedAlgo(expandedAlgo === ("CRC32" as HashAlgo) ? null : "CRC32" as HashAlgo)}
            />
            {/* Main algorithms */}
            {ALGO_LIST.map((algo) => {
              const formatted = formatHash(hashBytes[algo], outputFormat);
              return (
                <HashRow
                  key={algo}
                  label={algo}
                  value={formatted}
                  bits={ALGO_INFO[algo].bits}
                  note={ALGO_INFO[algo].note}
                  copied={copiedKey === algo}
                  onCopy={() => handleCopy(algo, formatted)}
                  expanded={expandedAlgo === algo}
                  onToggleInfo={() => setExpandedAlgo(expandedAlgo === algo ? null : algo)}
                  highlight={algo === "SHA-256"}
                />
              );
            })}
          </div>
        )}

        {/* HMAC tab */}
        {tab === "hmac" && (
          <div className="mt-6 space-y-4">
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--kami-text-muted)" }}>HMAC Configuration</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--kami-text-muted)" }}>Algorithm</label>
                  <select
                    value={hmacAlgo}
                    onChange={(e) => setHmacAlgo(e.target.value as HashAlgo)}
                    className="w-full px-3 py-2 text-sm focus:outline-none"
                    style={{
                      background: "var(--kami-input-bg, var(--kami-surface-solid))",
                      color: "var(--kami-text)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  >
                    {ALGO_LIST.map((a) => (
                      <option key={a} value={a}>{`HMAC-${a}`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--kami-text-muted)" }}>Secret Key</label>
                  <input
                    type="text"
                    value={hmacSecret}
                    onChange={(e) => setHmacSecret(e.target.value)}
                    placeholder="Enter secret key..."
                    className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                    style={{
                      background: "var(--kami-input-bg, var(--kami-surface-solid))",
                      color: "var(--kami-text)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>

            {hmacResult && hmacSecret && hashBytes && (
              <div
                className="px-4 py-3"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>HMAC-{hmacAlgo}</span>
                  <button
                    onClick={() => handleCopy("hmac", formatHash(hmacResult, outputFormat))}
                    className="flex items-center gap-1 text-xs transition-colors"
                    style={{ color: "var(--kami-text-dim)" }}
                  >
                    {copiedKey === "hmac" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                  </button>
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
          <div className="mt-6 space-y-4">
            <div
              className="p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h2 className="text-sm font-medium mb-3" style={{ color: "var(--kami-text-muted)" }}>Verify Checksum</h2>
              <p className="text-xs mb-3" style={{ color: "var(--kami-text-dim)" }}>
                Paste an expected hash below. The algorithm is auto-detected from the hash length.
              </p>
              <input
                value={verifyHash}
                onChange={(e) => setVerifyHash(e.target.value)}
                placeholder="Paste expected hash (hex or base64)..."
                className="w-full px-3 py-2 text-sm font-mono focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                }}
                spellCheck={false}
              />

              {verifyNormalized && (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  {detectedAlgo && (
                    <span
                      className="px-2 py-0.5 text-xs font-medium"
                      style={{
                        background: "var(--kami-surface)",
                        color: "var(--kami-text-muted)",
                        borderRadius: "var(--kami-cta-radius, 0.375rem)",
                      }}
                    >
                      {detectedAlgo}
                    </span>
                  )}
                  {!hashBytes && (
                    <span style={{ color: "var(--kami-text-dim)" }}>Enter text or drop a file to verify against</span>
                  )}
                </div>
              )}
            </div>

            {/* Match result */}
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
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    verifyMatch ? "bg-green-200" : "bg-red-200"
                  }`}>
                    {verifyMatch ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={verifyMatch ? "#16a34a" : "#dc2626"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${verifyMatch ? "text-green-800" : "text-red-800"}`}>
                      {verifyMatch ? `Match - ${verifyMatch}` : "No match"}
                    </p>
                    <p className={`text-xs mt-0.5 ${verifyMatch ? "text-green-600" : "text-red-600"}`}>
                      {verifyMatch
                        ? "The hash matches the input data. Integrity verified."
                        : "The hash does not match any algorithm output. Data may be corrupted or different."}
                    </p>
                  </div>
                </div>

                {/* Character-by-character diff for non-matches */}
                {!verifyMatch && detectedAlgo && detectedAlgo !== "CRC32" && hashBytes[detectedAlgo as HashAlgo] && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="text-xs text-red-600 mb-1">Expected vs Actual ({detectedAlgo}):</p>
                    <CharDiff
                      expected={verifyNormalized}
                      actual={bytesToHex(hashBytes[detectedAlgo as HashAlgo])}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Algorithm reference */}
        {hashBytes && tab === "hash" && (
          <details className="mt-6">
            <summary className="cursor-pointer text-sm" style={{ color: "var(--kami-text-dim)" }}>
              Hash algorithm reference
            </summary>
            <div
              className="mt-2 overflow-hidden"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--kami-surface)", borderBottom: "1px solid var(--kami-border)" }}>
                    <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>Algorithm</th>
                    <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>Bits</th>
                    <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>Hex Length</th>
                    <th className="px-4 py-2 text-left font-medium hidden sm:table-cell" style={{ color: "var(--kami-text-muted)" }}>Use Case</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--kami-border)" }}>
                    <td className="px-4 py-2 font-mono" style={{ color: "var(--kami-text)" }}>CRC32</td>
                    <td className="px-4 py-2" style={{ color: "var(--kami-text-muted)" }}>32</td>
                    <td className="px-4 py-2" style={{ color: "var(--kami-text-muted)" }}>8</td>
                    <td className="px-4 py-2 hidden sm:table-cell" style={{ color: "var(--kami-text-muted)" }}>Error detection, ZIP files</td>
                  </tr>
                  {ALGO_LIST.map((algo, i) => (
                    <tr key={algo} style={i < ALGO_LIST.length - 1 ? { borderBottom: "1px solid var(--kami-border)" } : undefined}>
                      <td className="px-4 py-2 font-mono" style={{ color: "var(--kami-text)" }}>{algo}</td>
                      <td className="px-4 py-2" style={{ color: "var(--kami-text-muted)" }}>{ALGO_INFO[algo].bits}</td>
                      <td className="px-4 py-2" style={{ color: "var(--kami-text-muted)" }}>{ALGO_INFO[algo].bits / 4}</td>
                      <td className="px-4 py-2 hidden sm:table-cell" style={{ color: "var(--kami-text-muted)" }}>{ALGO_INFO[algo].note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// --- Hash row component ---

function HashRow({
  label,
  value,
  bits,
  note,
  copied,
  onCopy,
  expanded,
  onToggleInfo,
  highlight,
}: {
  label: string;
  value: string;
  bits: number;
  note: string;
  copied: boolean;
  onCopy: () => void;
  expanded: boolean;
  onToggleInfo: () => void;
  highlight?: boolean;
}) {
  return (
    <div
      className="transition-colors"
      style={{
        background: "var(--kami-surface-solid)",
        border: `1px solid ${highlight ? "var(--kami-text-dim)" : "var(--kami-border-strong)"}`,
        borderRadius: "var(--kami-card-radius, 0.75rem)",
        boxShadow: "var(--kami-card-shadow, none)",
      }}
    >
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--kami-border)" }}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>{label}</span>
          <span
            className="px-1.5 py-0.5 text-[10px] rounded"
            style={{ background: "var(--kami-surface)", color: "var(--kami-text-dim)" }}
          >{bits}-bit</span>
          {highlight && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] text-green-700">recommended</span>}
          <button
            onClick={onToggleInfo}
            className="transition-colors"
            style={{ color: "var(--kami-text-dim)" }}
            title="About this algorithm"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
            </svg>
          </button>
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1 text-xs transition-colors"
          style={{ color: "var(--kami-text-dim)" }}
        >
          {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
        </button>
      </div>
      <div className="px-4 py-2.5">
        <p className="font-mono text-sm break-all select-all" style={{ color: "var(--kami-text)" }}>{value}</p>
      </div>
      {expanded && (
        <div
          className="px-4 py-2"
          style={{
            background: "var(--kami-surface)",
            borderTop: "1px solid var(--kami-border)",
            borderBottomLeftRadius: "var(--kami-card-radius, 0.75rem)",
            borderBottomRightRadius: "var(--kami-card-radius, 0.75rem)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{note}</p>
        </div>
      )}
    </div>
  );
}

// --- Character diff component ---

function CharDiff({ expected, actual }: { expected: string; actual: string }) {
  const maxLen = Math.max(expected.length, actual.length);
  return (
    <div className="space-y-1 font-mono text-xs">
      <div className="flex flex-wrap">
        <span className="text-red-400 w-14 shrink-0">Got: </span>
        {Array.from({ length: maxLen }).map((_, i) => (
          <span
            key={i}
            className={expected[i] !== actual[i] ? "text-red-600 bg-red-100 rounded" : ""}
            style={expected[i] === actual[i] ? { color: "var(--kami-text-muted)" } : undefined}
          >
            {expected[i] || " "}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap">
        <span className="text-green-400 w-14 shrink-0">Need:</span>
        {Array.from({ length: maxLen }).map((_, i) => (
          <span
            key={i}
            className={expected[i] !== actual[i] ? "text-green-600 bg-green-100 rounded" : ""}
            style={expected[i] === actual[i] ? { color: "var(--kami-text-muted)" } : undefined}
          >
            {actual[i] || " "}
          </span>
        ))}
      </div>
    </div>
  );
}

// --- Inline SVG icons ---

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
