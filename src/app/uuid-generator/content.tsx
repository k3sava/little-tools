"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import {
  Segment,
  Slider,
  NumberStepper,
  Toggle,
} from "@/components/tools/controls";

// ============================================================================
// ID Generation Engines (pure browser APIs, zero dependencies)
// ============================================================================

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CROCKFORD_LOWER = "0123456789abcdefghjkmnpqrstvwxyz";
const DEFAULT_NANOID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";

function randomBytes(n: number): Uint8Array {
  const bytes = new Uint8Array(n);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function formatUuid(hex: string, hyphens: boolean, uppercase: boolean, braces: boolean): string {
  const raw = hyphens
    ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    : hex;
  const cased = uppercase ? raw.toUpperCase() : raw.toLowerCase();
  return braces ? `{${cased}}` : cased;
}

// --- UUID v1 (time-based) ---
function uuidV1(hyphens = true, uppercase = false, braces = false): string {
  // 100-ns intervals since UUID epoch (1582-10-15)
  const UUID_EPOCH_DIFF = 122192928000000000n;
  const nowMs = BigInt(Date.now());
  const intervals = nowMs * 10000n + UUID_EPOCH_DIFF;
  const intervalsHex = intervals.toString(16).padStart(15, "0");
  const timeLow = intervalsHex.slice(-8);
  const timeMid = intervalsHex.slice(-12, -8);
  const timeHi = intervalsHex.slice(-15, -12); // 12 bits
  // version 1 nibble + timeHi
  const versionAndTimeHi = "1" + timeHi;
  const clockSeq = randomBytes(2);
  clockSeq[0] = (clockSeq[0] & 0x3f) | 0x80; // variant 10
  const clockSeqHex = bytesToHex(clockSeq);
  const node = randomBytes(6);
  // Set multicast bit on node so we don't accidentally claim a real MAC
  node[0] |= 0x01;
  const nodeHex = bytesToHex(node);
  const hex = `${timeLow}${timeMid}${versionAndTimeHi}${clockSeqHex}${nodeHex}`;
  return formatUuid(hex, hyphens, uppercase, braces);
}

// --- UUID v4 ---
function uuidV4(hyphens = true, uppercase = false, braces = false): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  return formatUuid(bytesToHex(bytes), hyphens, uppercase, braces);
}

// --- UUID v7 (RFC 9562) ---
function uuidV7(hyphens = true, uppercase = false, braces = false): string {
  const now = Date.now();
  const bytes = randomBytes(16);
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytesToHex(bytes), hyphens, uppercase, braces);
}

// --- ULID ---
function generateUlid(uppercase = true): string {
  const now = Date.now();
  let ts = "";
  let t = now;
  for (let i = 0; i < 10; i++) {
    ts = (uppercase ? CROCKFORD : CROCKFORD_LOWER)[t % 32] + ts;
    t = Math.floor(t / 32);
  }
  const bytes = randomBytes(10);
  const alphabet = uppercase ? CROCKFORD : CROCKFORD_LOWER;
  let rand = "";
  for (let i = 0; i < 10; i++) {
    rand += alphabet[bytes[i] >> 3] + alphabet[bytes[i] & 0x1f];
    if (rand.length >= 16) break;
  }
  return ts + rand.slice(0, 16);
}

// --- NanoID ---
function nanoid(alphabet: string, length: number): string {
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * length) / alphabet.length);
  let id = "";
  while (id.length < length) {
    const bytes = randomBytes(step);
    for (let i = 0; i < step && id.length < length; i++) {
      const idx = bytes[i] & mask;
      if (idx < alphabet.length) {
        id += alphabet[idx];
      }
    }
  }
  return id;
}

// --- CUID2 ---
let cuid2Counter = Math.floor(Math.random() * 2147483647);

async function generateCuid2(): Promise<string> {
  const timestamp = Date.now().toString(36);
  const count = (cuid2Counter++).toString(36);
  const randBytesArr = randomBytes(32);
  const randStr = Array.from(randBytesArr, (b) => b.toString(36).slice(-1)).join("");
  const fingerprint = (typeof navigator !== "undefined" ? navigator.userAgent : "node").slice(0, 16);
  const input = `${timestamp}${count}${randStr}${fingerprint}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  let hash = "";
  for (let i = 0; i < hashArray.length; i++) {
    hash += hashArray[i].toString(36);
  }
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const firstChar = letters[hashArray[0] % 26];
  return firstChar + hash.slice(0, 23);
}

// ============================================================================
// ID Inspector Engine
// ============================================================================

type IdType = "UUID v4" | "UUID v7" | "UUID v1" | "UUID v3" | "UUID v5" | "UUID v6" | "UUID v8" | "UUID (unknown version)" | "ULID" | "NanoID" | "CUID2" | "Unknown";

interface InspectionResult {
  type: IdType;
  valid: boolean;
  timestamp?: Date;
  version?: number;
  variant?: string;
  bits?: number;
  encoding?: string;
  breakdown?: { label: string; value: string; description: string }[];
}

const UUID_RE = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
const CUID2_RE = /^[a-z][a-z0-9]{23}$/;

function inspectId(input: string): InspectionResult {
  const trimmed = input.trim().replace(/^\{|\}$/g, "");
  if (!trimmed) return { type: "Unknown", valid: false };

  if (UUID_RE.test(trimmed)) {
    const hex = trimmed.replace(/-/g, "").toLowerCase();
    const versionNibble = parseInt(hex[12], 16);
    const variantByte = parseInt(hex[16], 16);
    let variant = "Unknown";
    if ((variantByte & 0x8) === 0) variant = "NCS (reserved)";
    else if ((variantByte & 0xc) === 0x8) variant = "RFC 4122 / RFC 9562";
    else if ((variantByte & 0xe) === 0xc) variant = "Microsoft (reserved)";
    else if ((variantByte & 0xe) === 0xe) variant = "Future (reserved)";

    const versionMap: Record<number, IdType> = {
      1: "UUID v1",
      3: "UUID v3",
      4: "UUID v4",
      5: "UUID v5",
      6: "UUID v6",
      7: "UUID v7",
      8: "UUID v8",
    };
    const type = versionMap[versionNibble] || "UUID (unknown version)";

    const breakdown: InspectionResult["breakdown"] = [
      { label: "Version", value: String(versionNibble), description: versionMap[versionNibble] || "Unknown" },
      { label: "Variant", value: `0x${variantByte.toString(16)}`, description: variant },
    ];

    let timestamp: Date | undefined;
    if (versionNibble === 7) {
      const tsHex = hex.slice(0, 12);
      const ms = parseInt(tsHex, 16);
      timestamp = new Date(ms);
      breakdown.push({ label: "Timestamp", value: timestamp.toISOString(), description: `${ms}ms since epoch` });
      breakdown.push({ label: "Random", value: hex.slice(12), description: "74 bits of randomness (after version/variant)" });
    } else if (versionNibble === 1) {
      const timeLow = hex.slice(0, 8);
      const timeMid = hex.slice(8, 12);
      const timeHi = hex.slice(13, 16);
      const ts100ns = parseInt(timeHi + timeMid + timeLow, 16);
      const unixMs = (ts100ns - 122192928000000000) / 10000;
      if (unixMs > 0 && unixMs < 4102444800000) {
        timestamp = new Date(unixMs);
        breakdown.push({ label: "Timestamp", value: timestamp.toISOString(), description: "60-bit 100ns intervals since Oct 15, 1582" });
      }
    } else if (versionNibble === 4) {
      breakdown.push({ label: "Random bits", value: "122", description: "Fully random (no embedded data)" });
    }

    return {
      type,
      valid: true,
      version: versionNibble,
      variant,
      timestamp,
      bits: 128,
      encoding: "Hexadecimal",
      breakdown,
    };
  }

  if (ULID_RE.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    let ts = 0;
    for (let i = 0; i < 10; i++) {
      ts = ts * 32 + CROCKFORD.indexOf(upper[i]);
    }
    const timestamp = new Date(ts);

    return {
      type: "ULID",
      valid: true,
      timestamp,
      bits: 128,
      encoding: "Crockford Base32",
      breakdown: [
        { label: "Timestamp", value: timestamp.toISOString(), description: `${ts}ms since epoch (first 10 chars, 48 bits)` },
        { label: "Randomness", value: upper.slice(10), description: "80 bits of randomness (last 16 chars)" },
        { label: "Sortable", value: "Yes", description: "Lexicographically sortable by creation time" },
      ],
    };
  }

  if (CUID2_RE.test(trimmed)) {
    return {
      type: "CUID2",
      valid: true,
      bits: 128,
      encoding: "Base36 (SHA-256 derived)",
      breakdown: [
        { label: "Prefix", value: trimmed[0], description: "Always a lowercase letter" },
        { label: "Hash body", value: trimmed.slice(1), description: "23 chars from SHA-256 of timestamp + counter + random + fingerprint" },
        { label: "Collision resistant", value: "Yes", description: "Designed for horizontal scaling without coordination" },
      ],
    };
  }

  const NANOID_RE = /^[A-Za-z0-9_-]{10,64}$/;
  if (NANOID_RE.test(trimmed) && trimmed.length >= 10 && trimmed.length <= 64) {
    const hasLetters = /[a-zA-Z]/.test(trimmed);
    const hasDigits = /[0-9]/.test(trimmed);
    const hasSpecial = /[_-]/.test(trimmed);
    if (hasLetters && (hasDigits || hasSpecial)) {
      const entropy = Math.floor(trimmed.length * Math.log2(64));
      return {
        type: "NanoID",
        valid: true,
        bits: entropy,
        encoding: "URL-safe Base64",
        breakdown: [
          { label: "Length", value: String(trimmed.length), description: `${trimmed.length} characters` },
          { label: "Alphabet", value: "A-Za-z0-9_-", description: "64-character URL-safe alphabet" },
          { label: "Entropy", value: `~${entropy} bits`, description: `${trimmed.length} chars * 6 bits each` },
        ],
      };
    }
  }

  return { type: "Unknown", valid: false };
}

// ============================================================================
// Types
// ============================================================================

type GeneratorType = "uuid-v1" | "uuid-v4" | "uuid-v7" | "ulid" | "nanoid" | "cuid2";

interface GeneratorConfig {
  label: string;
  shortLabel: string;
  description: string;
}

const GENERATORS: Record<GeneratorType, GeneratorConfig> = {
  "uuid-v1": {
    label: "UUID v1",
    shortLabel: "v1",
    description: "Time-based (1582 epoch, 100-ns intervals) with random node + clock seq.",
  },
  "uuid-v4": {
    label: "UUID v4",
    shortLabel: "v4",
    description: "128-bit random identifier. RFC 4122.",
  },
  "uuid-v7": {
    label: "UUID v7",
    shortLabel: "v7",
    description: "Time-ordered UUID. 48-bit ms timestamp + random. RFC 9562.",
  },
  ulid: {
    label: "ULID",
    shortLabel: "ULID",
    description: "Universally Unique Lexicographically Sortable Identifier.",
  },
  nanoid: {
    label: "NanoID",
    shortLabel: "Nano",
    description: "Compact, URL-safe, configurable alphabet and length.",
  },
  cuid2: {
    label: "CUID2",
    shortLabel: "CUID2",
    description: "Collision-resistant ID using SHA-256. Secure, no timestamp leakage.",
  },
};

// ============================================================================
// Component
// ============================================================================

export default function UuidGeneratorContent() {
  const [activeType, setActiveType] = useState<GeneratorType>("uuid-v4");
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [copied, setCopied] = useState<number | "all" | "array" | null>(null);
  const [inspectInput, setInspectInput] = useState("");

  // Format options
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);
  const [braces, setBraces] = useState(false);

  // NanoID options
  const [nanoAlphabet, setNanoAlphabet] = useState(DEFAULT_NANOID_ALPHABET);
  const [nanoLength, setNanoLength] = useState(21);

  const countInputRef = useRef<HTMLInputElement>(null);

  const generate = useCallback(async () => {
    const n = Math.min(Math.max(1, count), 500);
    let newIds: string[];
    switch (activeType) {
      case "uuid-v1":
        newIds = Array.from({ length: n }, () => uuidV1(hyphens, uppercase, braces));
        break;
      case "uuid-v4":
        newIds = Array.from({ length: n }, () => uuidV4(hyphens, uppercase, braces));
        break;
      case "uuid-v7":
        newIds = Array.from({ length: n }, () => uuidV7(hyphens, uppercase, braces));
        break;
      case "ulid":
        newIds = Array.from({ length: n }, () => generateUlid(uppercase));
        break;
      case "nanoid":
        newIds = Array.from({ length: n }, () => nanoid(nanoAlphabet, nanoLength));
        break;
      case "cuid2":
        newIds = await Promise.all(Array.from({ length: n }, () => generateCuid2()));
        break;
      default:
        newIds = [];
    }
    setIds(newIds);
  }, [activeType, count, hyphens, uppercase, braces, nanoAlphabet, nanoLength]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => generate(), label: "Generate" }],
      [generate],
    ),
  );

  const handleCopy = useCallback(async (text: string, index: number | "all" | "array") => {
    await navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleCopyAll = useCallback(() => {
    handleCopy(ids.join("\n"), "all");
  }, [ids, handleCopy]);

  const handleCopyArray = useCallback(() => {
    handleCopy(JSON.stringify(ids, null, 2), "array");
  }, [ids, handleCopy]);

  const inspection = inspectInput.trim() ? inspectId(inspectInput) : null;

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
      title="Universal ID Generator"
      tagline="UUID v1/v4/v7 · ULID · NanoID · CUID2 — bulk + inspect"
      accent="#10b981"
      materialFab={{ label: "Copy", onClick: handleCopyAll }}
      actions={
        <>
          <ToolActionButton onClick={generate} variant="solid">
            Generate {count > 1 ? `(${count})` : ""}
          </ToolActionButton>
          {ids.length > 0 && (
            <ToolActionButton onClick={handleCopyAll} variant="outline">
              {copied === "all" ? "Copied" : "Copy all"}
            </ToolActionButton>
          )}
        </>
      }
      controls={
        <>
          <ControlGroup label="ID type">
            <Segment<GeneratorType>
              value={activeType}
              onChange={setActiveType}
              options={(Object.keys(GENERATORS) as GeneratorType[]).map((t) => ({
                value: t,
                label: GENERATORS[t].shortLabel,
              }))}
              full
              size="sm"
            />
            <p className="mt-2 text-xs" style={{ color: "var(--kami-text-muted)" }}>
              {GENERATORS[activeType].description}
            </p>
          </ControlGroup>

          <ControlGroup label={`Bulk count (${count})`}>
            <Slider
              value={count}
              onChange={(v) => setCount(Math.round(v))}
              min={1}
              max={500}
              step={1}
              ariaLabel="Bulk count"
            />
            <NumberStepper
              value={count}
              onChange={(v) => setCount(Math.max(1, Math.min(500, v)))}
              min={1}
              max={500}
            />
          </ControlGroup>

          {(activeType === "uuid-v1" || activeType === "uuid-v4" || activeType === "uuid-v7") && (
            <ControlGroup label="UUID format">
              <Toggle label="Hyphens" checked={hyphens} onChange={setHyphens} />
              <Toggle label="Uppercase" checked={uppercase} onChange={setUppercase} />
              <Toggle label="Braces { }" checked={braces} onChange={setBraces} />
            </ControlGroup>
          )}

          {activeType === "ulid" && (
            <ControlGroup label="ULID format">
              <Toggle label="Uppercase" checked={uppercase} onChange={setUppercase} />
            </ControlGroup>
          )}

          {activeType === "nanoid" && (
            <ControlGroup label="NanoID">
              <NumberStepper
                label="Length"
                value={nanoLength}
                onChange={(v) => setNanoLength(Math.max(2, Math.min(128, v)))}
                min={2}
                max={128}
              />
              <label className="kc-label">Alphabet</label>
              <input
                value={nanoAlphabet}
                onChange={(e) => setNanoAlphabet(e.target.value || DEFAULT_NANOID_ALPHABET)}
                className="w-full px-3 py-2 font-mono text-xs focus:outline-none"
                style={{ ...inputStyle, minHeight: 40 }}
              />
              <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
                Entropy ~{Math.floor(nanoLength * Math.log2(Math.max(2, nanoAlphabet.length)))} bits
                · {nanoAlphabet.length} chars
              </p>
              <ToolActionButton onClick={() => setNanoAlphabet(DEFAULT_NANOID_ALPHABET)} variant="ghost">
                Reset alphabet
              </ToolActionButton>
            </ControlGroup>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Quick copy strip */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {(Object.keys(GENERATORS) as GeneratorType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setActiveType(type);
                setCount(1);
                setTimeout(() => generate(), 0);
              }}
              className="px-3 py-2 text-sm font-semibold transition-colors"
              style={{
                background: activeType === type ? "var(--kami-cta-bg)" : "var(--kami-surface-solid)",
                color: activeType === type ? "var(--kami-cta-text)" : "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-cta-radius, 0.5rem)",
                minHeight: 44,
              }}
            >
              {GENERATORS[type].shortLabel}
            </button>
          ))}
        </div>

        {/* Generated IDs */}
        <div style={cardStyle} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: "var(--kami-text)" }}>
              {ids.length === 0 ? "No IDs yet" : `${ids.length} × ${GENERATORS[activeType].label}`}
            </span>
            {ids.length > 0 && (
              <div className="flex items-center gap-1">
                <ToolActionButton onClick={handleCopyArray} variant="outline">
                  {copied === "array" ? "Copied" : "Copy as array"}
                </ToolActionButton>
                <ToolActionButton onClick={handleCopyAll} variant="outline">
                  {copied === "all" ? "Copied" : "Copy all"}
                </ToolActionButton>
              </div>
            )}
          </div>

          {ids.length === 0 ? (
            <div
              className="flex items-center justify-center py-12 text-sm"
              style={{
                border: "1px dashed var(--kami-border-strong)",
                borderRadius: "var(--kami-input-radius, 0.5rem)",
                color: "var(--kami-text-dim)",
              }}
            >
              Tap Generate to create {count} {GENERATORS[activeType].shortLabel} ID{count > 1 ? "s" : ""}.
            </div>
          ) : (
            <div className={`flex flex-col gap-1 ${ids.length > 20 ? "max-h-[600px] overflow-y-auto" : ""}`}>
              {ids.map((id, i) => (
                <div
                  key={`${id}-${i}`}
                  className="flex items-center justify-between gap-2 px-3 py-2"
                  style={{
                    background: "var(--kami-surface)",
                    border: "1px solid var(--kami-border)",
                    borderRadius: "var(--kami-input-radius, 0.5rem)",
                    color: "var(--kami-text)",
                  }}
                >
                  <span className="font-mono text-sm select-all break-all min-w-0 flex-1">{id}</span>
                  <ToolActionButton onClick={() => handleCopy(id, i)} variant="ghost">
                    {copied === i ? "✓" : "Copy"}
                  </ToolActionButton>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inspector */}
        <div style={cardStyle} className="p-4">
          <h2 className="text-sm font-semibold mb-2" style={{ color: "var(--kami-text)" }}>ID Inspector</h2>
          <p className="text-xs mb-2" style={{ color: "var(--kami-text-muted)" }}>
            Paste any ID to auto-detect its type and decode embedded timestamps.
          </p>
          <input
            ref={countInputRef}
            type="text"
            value={inspectInput}
            onChange={(e) => setInspectInput(e.target.value)}
            placeholder="Paste a UUID, ULID, NanoID, or CUID2..."
            className="w-full px-4 py-3 font-mono text-sm focus:outline-none"
            style={{ ...inputStyle, minHeight: 44 }}
          />

          {inspection && (
            <div className="mt-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold ${
                    inspection.valid
                      ? "bg-green-50 text-green-700 ring-1 ring-green-200"
                      : "bg-red-50 text-red-600 ring-1 ring-red-200"
                  }`}
                >
                  {inspection.valid ? inspection.type : "Invalid / Unknown"}
                </span>
                {inspection.bits && (
                  <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{inspection.bits} bits</span>
                )}
                {inspection.encoding && (
                  <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>{inspection.encoding}</span>
                )}
              </div>

              {inspection.breakdown && inspection.breakdown.length > 0 && (
                <div
                  className="overflow-x-auto"
                  style={{ border: "1px solid var(--kami-border)", borderRadius: "var(--kami-input-radius, 0.5rem)" }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "var(--kami-surface)", borderBottom: "1px solid var(--kami-border)" }}>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>Field</th>
                        <th className="px-3 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>Value</th>
                        <th className="px-3 py-2 text-left font-medium hidden md:table-cell" style={{ color: "var(--kami-text-muted)" }}>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspection.breakdown.map((row, i) => (
                        <tr
                          key={i}
                          style={
                            i < inspection.breakdown!.length - 1
                              ? { borderBottom: "1px solid var(--kami-border)" }
                              : undefined
                          }
                        >
                          <td className="px-3 py-2 font-medium" style={{ color: "var(--kami-text)" }}>{row.label}</td>
                          <td className="px-3 py-2 font-mono break-all" style={{ color: "var(--kami-text)" }}>{row.value}</td>
                          <td className="px-3 py-2 hidden md:table-cell" style={{ color: "var(--kami-text-muted)" }}>{row.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ToolShell>
  );
}
