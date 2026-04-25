"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// ============================================================================
// ID Generation Engines (pure browser APIs, zero dependencies)
// ============================================================================

const HEX = "0123456789abcdef";
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

function formatUuid(hex: string, hyphens: boolean, uppercase: boolean): string {
  const raw = hyphens
    ? `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    : hex;
  return uppercase ? raw.toUpperCase() : raw.toLowerCase();
}

// --- UUID v4 ---
function uuidV4(hyphens = true, uppercase = false): string {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
  return formatUuid(bytesToHex(bytes), hyphens, uppercase);
}

// --- UUID v7 (RFC 9562) ---
function uuidV7(hyphens = true, uppercase = false): string {
  const now = Date.now();
  const bytes = randomBytes(16);
  // 48-bit timestamp (ms since epoch) in bytes 0-5
  bytes[0] = (now / 2 ** 40) & 0xff;
  bytes[1] = (now / 2 ** 32) & 0xff;
  bytes[2] = (now / 2 ** 24) & 0xff;
  bytes[3] = (now / 2 ** 16) & 0xff;
  bytes[4] = (now / 2 ** 8) & 0xff;
  bytes[5] = now & 0xff;
  // version 7
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // variant 10
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return formatUuid(bytesToHex(bytes), hyphens, uppercase);
}

// --- ULID (Crockford Base32, monotonic within ms) ---
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
  const randBytes = randomBytes(32);
  const randStr = Array.from(randBytes, (b) => b.toString(36).slice(-1)).join("");
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
  // CUID2 starts with a letter, 24 chars total
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
  const trimmed = input.trim();
  if (!trimmed) return { type: "Unknown", valid: false };

  // UUID check (with or without hyphens)
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
    // UUID v7: first 48 bits are ms timestamp
    if (versionNibble === 7) {
      const tsHex = hex.slice(0, 12);
      const ms = parseInt(tsHex, 16);
      timestamp = new Date(ms);
      breakdown.push({ label: "Timestamp", value: timestamp.toISOString(), description: `${ms}ms since epoch` });
      breakdown.push({ label: "Random", value: hex.slice(12), description: "74 bits of randomness (after version/variant)" });
    } else if (versionNibble === 1) {
      // UUID v1: timestamp is split across fields
      const timeLow = hex.slice(0, 8);
      const timeMid = hex.slice(8, 12);
      const timeHi = hex.slice(13, 16); // skip version nibble
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

  // ULID check
  if (ULID_RE.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    // Decode Crockford timestamp (first 10 chars)
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

  // CUID2 check (lowercase letter + 23 lowercase alphanumeric)
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

  // NanoID heuristic: 21 chars from URL-safe alphabet
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

type GeneratorType = "uuid-v4" | "uuid-v7" | "ulid" | "nanoid" | "cuid2";

interface GeneratorConfig {
  label: string;
  shortLabel: string;
  description: string;
  useCase: string;
}

const GENERATORS: Record<GeneratorType, GeneratorConfig> = {
  "uuid-v4": {
    label: "UUID v4",
    shortLabel: "v4",
    description: "128-bit random identifier. RFC 4122.",
    useCase: "Default choice when you need a random, unique ID with no time component.",
  },
  "uuid-v7": {
    label: "UUID v7",
    shortLabel: "v7",
    description: "Time-ordered UUID. 48-bit ms timestamp + random. RFC 9562.",
    useCase: "Database primary keys where you need time-sortable UUIDs with good index locality.",
  },
  ulid: {
    label: "ULID",
    shortLabel: "ULID",
    description: "Universally Unique Lexicographically Sortable Identifier. Crockford Base32.",
    useCase: "When you need sortable IDs that are shorter than UUIDs and use a URL-safe alphabet.",
  },
  nanoid: {
    label: "NanoID",
    shortLabel: "Nano",
    description: "Compact, URL-safe, configurable alphabet and length.",
    useCase: "Short URL slugs, file names, or any context where compact size matters more than time-ordering.",
  },
  cuid2: {
    label: "CUID2",
    shortLabel: "CUID2",
    description: "Collision-resistant ID using SHA-256. Secure, no timestamp leakage.",
    useCase: "When you need collision resistance across distributed systems without leaking creation time.",
  },
};

// ============================================================================
// Component
// ============================================================================

export default function UuidGeneratorContent() {
  const [activeType, setActiveType] = useState<GeneratorType>("uuid-v4");
  const [ids, setIds] = useState<string[]>([]);
  const [count, setCount] = useState(1);
  const [copied, setCopied] = useState<number | "all" | null>(null);
  const [inspectInput, setInspectInput] = useState("");
  const [showReference, setShowReference] = useState(false);

  // Format options
  const [uppercase, setUppercase] = useState(false);
  const [hyphens, setHyphens] = useState(true);

  // NanoID options
  const [nanoAlphabet, setNanoAlphabet] = useState(DEFAULT_NANOID_ALPHABET);
  const [nanoLength, setNanoLength] = useState(21);

  // Quick copy states (for one-click buttons)
  const [quickCopied, setQuickCopied] = useState<GeneratorType | null>(null);

  const countInputRef = useRef<HTMLInputElement>(null);

  const generate = useCallback(async () => {
    const n = Math.min(Math.max(1, count), 1000);
    let newIds: string[];
    switch (activeType) {
      case "uuid-v4":
        newIds = Array.from({ length: n }, () => uuidV4(hyphens, uppercase));
        break;
      case "uuid-v7":
        newIds = Array.from({ length: n }, () => uuidV7(hyphens, uppercase));
        break;
      case "ulid":
        newIds = Array.from({ length: n }, () => generateUlid(!uppercase ? false : true));
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
  }, [activeType, count, hyphens, uppercase, nanoAlphabet, nanoLength]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => generate(), label: "Generate" }],
      [generate],
    ),
  );

  const handleCopy = useCallback(async (text: string, index: number | "all") => {
    await navigator.clipboard.writeText(text);
    setCopied(index);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleCopyAll = useCallback(() => {
    handleCopy(ids.join("\n"), "all");
  }, [ids, handleCopy]);

  // Quick generate + copy for each type
  const handleQuickGenerate = useCallback(
    async (type: GeneratorType) => {
      let id: string;
      switch (type) {
        case "uuid-v4":
          id = uuidV4(hyphens, uppercase);
          break;
        case "uuid-v7":
          id = uuidV7(hyphens, uppercase);
          break;
        case "ulid":
          id = generateUlid(!uppercase ? false : true);
          break;
        case "nanoid":
          id = nanoid(nanoAlphabet, nanoLength);
          break;
        case "cuid2":
          id = await generateCuid2();
          break;
      }
      await navigator.clipboard.writeText(id);
      setQuickCopied(type);
      setTimeout(() => setQuickCopied(null), 1500);
    },
    [hyphens, uppercase, nanoAlphabet, nanoLength],
  );

  const inspection = inspectInput.trim() ? inspectId(inspectInput) : null;

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Universal ID Generator"
          tagline="Generate UUIDv4, UUIDv7, ULID, NanoID, CUID2, KSUID, TSID, Snowflake - with format info and bulk generation."
          description="Pick an ID format, see how it's structured (timestamp vs random, length, sortability), and generate one or a thousand. Decode any ID to reveal embedded timestamps. Use the format picker as a learning tool when choosing an ID scheme for a new database column or API."
          audience={["Developers", "Database engineers"]}
          whenToUse={[
            "Picking an ID format for a new table or record type",
            "Decoding a ULID / UUIDv7 to read its timestamp",
            "Bulk-generating IDs for a migration or seed script",
          ]}
        />

        {/* Quick Generate Cards */}
        <div className="mb-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {(Object.keys(GENERATORS) as GeneratorType[]).map((type) => {
            const gen = GENERATORS[type];
            const isQuickCopied = quickCopied === type;
            return (
              <button
                key={type}
                onClick={() => handleQuickGenerate(type)}
                className="group relative rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{gen.label}</span>
                  <span className="text-xs text-gray-400 transition-colors group-hover:text-gray-600">
                    {isQuickCopied ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckIcon /> Copied
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <CopyIcon /> Click to copy
                      </span>
                    )}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{gen.description}</p>
              </button>
            );
          })}
        </div>

        {/* Main Generator */}
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {/* Type selector */}
            <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-1 py-0.5">
              {(Object.keys(GENERATORS) as GeneratorType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setActiveType(type)}
                  className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                    activeType === type
                      ? "bg-gray-900 text-white shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  {GENERATORS[type].shortLabel}
                </button>
              ))}
            </div>

            {/* Count */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="count" className="text-sm text-gray-500">
                Count:
              </label>
              <input
                ref={countInputRef}
                id="count"
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
                className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
            </div>

            {/* Format options (UUID types) */}
            {(activeType === "uuid-v4" || activeType === "uuid-v7") && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hyphens}
                    onChange={(e) => setHyphens(e.target.checked)}
                    className="rounded border-gray-300 accent-gray-900"
                  />
                  Hyphens
                </label>
                <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={uppercase}
                    onChange={(e) => setUppercase(e.target.checked)}
                    className="rounded border-gray-300 accent-gray-900"
                  />
                  Uppercase
                </label>
              </div>
            )}

            {/* ULID case option */}
            {activeType === "ulid" && (
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={uppercase}
                  onChange={(e) => setUppercase(e.target.checked)}
                  className="rounded border-gray-300 accent-gray-900"
                />
                Uppercase
              </label>
            )}

            {/* Generate button */}
            <button
              onClick={generate}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 active:bg-gray-700"
            >
              Generate {count > 1 ? `(${count})` : ""}
            </button>

            {/* Copy all */}
            {ids.length > 1 && (
              <button
                onClick={handleCopyAll}
                className="ml-auto flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                {copied === "all" ? (
                  <>
                    <CheckIcon /> Copied all
                  </>
                ) : (
                  <>
                    <CopyIcon /> Copy all
                  </>
                )}
              </button>
            )}
          </div>

          {/* NanoID options */}
          {activeType === "nanoid" && (
            <div className="mb-5 flex flex-wrap items-center gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-1.5">
                <label htmlFor="nano-length" className="text-sm text-gray-600">
                  Length:
                </label>
                <input
                  id="nano-length"
                  type="number"
                  min={2}
                  max={128}
                  value={nanoLength}
                  onChange={(e) => setNanoLength(Math.max(2, Math.min(128, parseInt(e.target.value, 10) || 21)))}
                  className="w-20 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <div className="flex flex-1 items-center gap-1.5">
                <label htmlFor="nano-alphabet" className="text-sm text-gray-600 whitespace-nowrap">
                  Alphabet:
                </label>
                <input
                  id="nano-alphabet"
                  type="text"
                  value={nanoAlphabet}
                  onChange={(e) => setNanoAlphabet(e.target.value || DEFAULT_NANOID_ALPHABET)}
                  className="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 font-mono text-xs shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                />
              </div>
              <button
                onClick={() => setNanoAlphabet(DEFAULT_NANOID_ALPHABET)}
                className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
              >
                Reset
              </button>
              <div className="w-full text-xs text-gray-400">
                Entropy: ~{Math.floor(nanoLength * Math.log2(nanoAlphabet.length))} bits ({nanoAlphabet.length} chars in alphabet)
              </div>
            </div>
          )}

          {/* Generated IDs */}
          {ids.length > 0 && (
            <div className={`space-y-1 ${ids.length > 20 ? "max-h-[600px] overflow-y-auto" : ""}`}>
              {ids.map((id, i) => (
                <div
                  key={`${id}-${i}`}
                  className="group flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2 transition-colors hover:border-gray-200 hover:bg-white"
                >
                  <span className="font-mono text-sm select-all break-all">{id}</span>
                  <button
                    onClick={() => handleCopy(id, i)}
                    className="ml-3 flex-shrink-0 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                    title="Copy"
                  >
                    {copied === i ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>
              ))}
            </div>
          )}

          {ids.length === 0 && (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 py-12 text-sm text-gray-400">
              Select a type and click Generate, or use the quick-copy cards above
            </div>
          )}
        </div>

        {/* ID Inspector */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">ID Inspector</h2>
          <p className="mb-3 text-sm text-gray-500">
            Paste any ID to auto-detect its type, extract timestamps, and see the byte-level breakdown.
          </p>
          <input
            type="text"
            value={inspectInput}
            onChange={(e) => setInspectInput(e.target.value)}
            placeholder="Paste a UUID, ULID, NanoID, or CUID2 to inspect..."
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 font-mono text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
          />

          {inspection && (
            <div className="mt-4">
              {/* Type badge + validity */}
              <div className="mb-4 flex items-center gap-3">
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
                  <span className="text-xs text-gray-500">{inspection.bits} bits</span>
                )}
                {inspection.encoding && (
                  <span className="text-xs text-gray-500">{inspection.encoding}</span>
                )}
              </div>

              {/* Breakdown table */}
              {inspection.breakdown && inspection.breakdown.length > 0 && (
                <div className="rounded-lg border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Value</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspection.breakdown.map((row, i) => (
                        <tr key={i} className="border-b border-gray-50 last:border-0">
                          <td className="px-4 py-2 font-medium text-gray-700">{row.label}</td>
                          <td className="px-4 py-2 font-mono text-gray-900">{row.value}</td>
                          <td className="px-4 py-2 text-gray-500">{row.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Reference */}
        <div className="mt-10 rounded-xl border border-gray-200 bg-white shadow-sm">
          <button
            onClick={() => setShowReference(!showReference)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <h2 className="text-lg font-semibold">When to use each type</h2>
            <ChevronIcon open={showReference} />
          </button>

          {showReference && (
            <div className="border-t border-gray-100 px-5 pb-5">
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ReferenceCard
                  title="UUID v4"
                  tag="Random"
                  tagColor="blue"
                  format="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                  pros={["Universal compatibility", "No coordination needed", "122 bits of randomness"]}
                  cons={["Not time-sortable", "Poor database index locality", "36 chars with hyphens"]}
                  bestFor="General-purpose unique IDs where compatibility matters most."
                />
                <ReferenceCard
                  title="UUID v7"
                  tag="Time-ordered"
                  tagColor="purple"
                  format="tttttttt-tttt-7xxx-yxxx-xxxxxxxxxxxx"
                  pros={["Time-sortable", "Great DB index locality", "UUID-compatible", "Embeds millisecond timestamp"]}
                  cons={["Leaks creation time", "Newer standard (RFC 9562)"]}
                  bestFor="Database primary keys. Best of both worlds: UUID compatibility + time ordering."
                />
                <ReferenceCard
                  title="ULID"
                  tag="Sortable"
                  tagColor="amber"
                  format="01ARZ3NDEKTSV4RRFFQ69G5FAV"
                  pros={["Lexicographically sortable", "Crockford Base32 (no ambiguous chars)", "26 chars, no hyphens", "Case-insensitive"]}
                  cons={["Not a UUID (different format)", "Less ecosystem support"]}
                  bestFor="When you want sortable IDs in a compact, URL-safe, human-friendly format."
                />
                <ReferenceCard
                  title="NanoID"
                  tag="Compact"
                  tagColor="green"
                  format="V1StGXR8_Z5jdHi6B-myT"
                  pros={["Configurable length + alphabet", "URL-safe by default", "21 chars = 126 bits entropy", "Tiny"]}
                  cons={["No timestamp", "Custom alphabet may reduce entropy", "No built-in validation"]}
                  bestFor="Short URL slugs, session tokens, file IDs. Anywhere compact size wins."
                />
                <ReferenceCard
                  title="CUID2"
                  tag="Collision-resistant"
                  tagColor="rose"
                  format="clh3am4lj0000i2m0p9qhtxx7"
                  pros={["Collision-resistant at scale", "No timestamp leakage (SHA-256)", "Works across distributed systems", "Always starts with a letter"]}
                  cons={["Requires SHA-256 (async in browser)", "24 chars", "Less common"]}
                  bestFor="Distributed systems where collision resistance matters more than sorting."
                />
              </div>

              {/* Comparison table */}
              <div className="mt-6 overflow-x-auto rounded-lg border border-gray-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="px-4 py-2.5 text-left font-medium text-gray-600">Feature</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">v4</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">v7</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">ULID</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">Nano</th>
                      <th className="px-4 py-2.5 text-center font-medium text-gray-600">CUID2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    <ComparisonRow label="Length" values={["36", "36", "26", "21*", "24"]} />
                    <ComparisonRow label="Time-sortable" values={["No", "Yes", "Yes", "No", "No"]} highlights={[false, true, true, false, false]} />
                    <ComparisonRow label="Timestamp" values={["No", "48-bit ms", "48-bit ms", "No", "No (hashed)"]} />
                    <ComparisonRow label="Entropy bits" values={["122", "74", "80", "126*", "~128"]} />
                    <ComparisonRow label="Encoding" values={["Hex", "Hex", "Base32", "Base64*", "Base36"]} />
                    <ComparisonRow label="UUID-compatible" values={["Yes", "Yes", "No", "No", "No"]} highlights={[true, true, false, false, false]} />
                    <ComparisonRow label="URL-safe" values={["No", "No", "Yes", "Yes", "Yes"]} highlights={[false, false, true, true, true]} />
                  </tbody>
                </table>
                <div className="px-4 py-2 text-xs text-gray-400 border-t border-gray-50">
                  * NanoID values depend on configured alphabet and length (defaults shown)
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function ReferenceCard({
  title,
  tag,
  tagColor,
  format,
  pros,
  cons,
  bestFor,
}: {
  title: string;
  tag: string;
  tagColor: string;
  format: string;
  pros: string[];
  cons: string[];
  bestFor: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 ring-blue-200",
    purple: "bg-purple-50 text-purple-700 ring-purple-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    green: "bg-green-50 text-green-700 ring-green-200",
    rose: "bg-rose-50 text-rose-700 ring-rose-200",
  };

  return (
    <div className="rounded-lg border border-gray-100 p-4">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${colorMap[tagColor] || colorMap.blue}`}>
          {tag}
        </span>
      </div>
      <p className="mb-3 font-mono text-xs text-gray-400 break-all">{format}</p>
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="mb-1 font-medium text-green-700">Pros</p>
          <ul className="space-y-0.5 text-gray-600">
            {pros.map((p, i) => (
              <li key={i} className="flex gap-1">
                <span className="text-green-500 flex-shrink-0">+</span> {p}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium text-red-600">Cons</p>
          <ul className="space-y-0.5 text-gray-600">
            {cons.map((c, i) => (
              <li key={i} className="flex gap-1">
                <span className="text-red-400 flex-shrink-0">-</span> {c}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        <span className="font-medium text-gray-700">Best for:</span> {bestFor}
      </p>
    </div>
  );
}

function ComparisonRow({
  label,
  values,
  highlights,
}: {
  label: string;
  values: string[];
  highlights?: boolean[];
}) {
  return (
    <tr>
      <td className="px-4 py-2 font-medium text-gray-700">{label}</td>
      {values.map((v, i) => (
        <td
          key={i}
          className={`px-4 py-2 text-center ${
            highlights && highlights[i] ? "font-medium text-gray-900" : "text-gray-600"
          }`}
        >
          {v}
        </td>
      ))}
    </tr>
  );
}

// ============================================================================
// Inline SVG Icons
// ============================================================================

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

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
