"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Base64 helpers ---

function isBase64(str: string): boolean {
  if (!str.trim()) return false;
  try {
    return btoa(atob(str)) === str.replace(/\s/g, "");
  } catch {
    return false;
  }
}

function encode(text: string): string {
  try {
    return btoa(
      encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  } catch {
    return "";
  }
}

function decode(b64: string): string {
  try {
    return decodeURIComponent(
      Array.from(atob(b64.replace(/\s/g, "")), (c) =>
        "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
      ).join("")
    );
  } catch {
    return "";
  }
}

function toUrlSafe(b64: string): string {
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromUrlSafe(urlSafe: string): string {
  let b64 = urlSafe.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) b64 += "=";
  return b64;
}

function wrapLines(b64: string, lineLength: number): string {
  if (!lineLength || lineLength <= 0) return b64;
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += lineLength) {
    lines.push(b64.slice(i, i + lineLength));
  }
  return lines.join("\n");
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getDataUrl(b64: string, mimeType: string): string {
  return `data:${mimeType};base64,${b64}`;
}

function detectMimeFromB64(b64: string): string | null {
  const prefix = b64.slice(0, 8);
  if (prefix.startsWith("/9j/")) return "image/jpeg";
  if (prefix.startsWith("iVBOR")) return "image/png";
  if (prefix.startsWith("R0lGO")) return "image/gif";
  if (prefix.startsWith("UklGR")) return "image/webp";
  if (prefix.startsWith("AAABA")) return "image/x-icon";
  if (prefix.startsWith("JVBERi")) return "application/pdf";
  if (prefix.startsWith("UEsDB")) return "application/zip";
  return null;
}

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

// --- UI ---

type Variant = "standard" | "urlsafe";

export default function Base64Content() {
  const [{ q: plainText }, setToolState] = useToolState({ q: "" });
  const setPlainText = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [base64Text, setBase64Text] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [variant, setVariant] = useState<Variant>("standard");
  const [lineWrap, setLineWrap] = useState<number>(0); // 0 = no wrap, 76 = MIME, 64 = PEM
  const fileInputRef = useRef<HTMLInputElement>(null);

  const b64Output = useMemo(() => {
    let b64 = base64Text;
    if (variant === "urlsafe") b64 = toUrlSafe(b64);
    if (lineWrap > 0) b64 = wrapLines(b64, lineWrap);
    return b64;
  }, [base64Text, variant, lineWrap]);

  const detectedMime = useMemo(() => {
    if (fileMime) return fileMime;
    return detectMimeFromB64(base64Text);
  }, [base64Text, fileMime]);

  const dataUrl = useMemo(() => {
    if (!base64Text || !detectedMime) return null;
    return getDataUrl(base64Text, detectedMime);
  }, [base64Text, detectedMime]);

  const showImagePreview = detectedMime && isImageMime(detectedMime) && base64Text;

  const byteSize = useMemo(() => {
    if (!base64Text) return 0;
    try {
      return atob(base64Text.replace(/\s/g, "")).length;
    } catch {
      return 0;
    }
  }, [base64Text]);

  const handlePlainChange = useCallback((text: string) => {
    setPlainText(text);
    setFileName(null);
    setFileMime(null);
    if (text) {
      setBase64Text(encode(text));
    } else {
      setBase64Text("");
    }
  }, [setPlainText]);

  const handleBase64Change = useCallback((text: string) => {
    // If URL-safe, convert back for internal storage
    let normalized = text;
    if (variant === "urlsafe") normalized = fromUrlSafe(text.replace(/\s/g, ""));
    else normalized = text.replace(/\s/g, "");

    setBase64Text(normalized);
    setFileName(null);
    setFileMime(null);
    if (normalized && isBase64(normalized)) {
      setPlainText(decode(normalized));
    }
  }, [variant, setPlainText]);

  const handleCopy = useCallback(async (text: string, which: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleFileSelect = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setBase64Text(b64);
    setFileName(file.name);
    setFileMime(file.type || null);
    setPlainText("");
  }, [setPlainText]);

  const handleClear = useCallback(() => {
    setPlainText("");
    setBase64Text("");
    setFileName(null);
    setFileMime(null);
  }, [setPlainText]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { if (b64Output) handleCopy(b64Output, "base64"); }, label: "Copy" },
    { key: "k", meta: true, action: handleClear, label: "Clear" },
  ], [b64Output, handleCopy, handleClear]));

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
    borderRadius: "var(--kami-input-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const segActive = (active: boolean) => ({
    background: active ? "var(--kami-cta-bg)" : "transparent",
    color: active ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
    borderRadius: "var(--kami-cta-radius, 0.25rem)",
  });
  const ctaStyle = {
    background: "var(--kami-cta-bg)",
    color: "var(--kami-cta-text)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  };

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Base64 Encode / Decode"
          tagline="Encode or decode text and files with Standard, URL-safe, or Data URL variants - with drag-and-drop file support."
          description="Paste text (or drop a file) and toggle encode/decode. Supports three Base64 flavors: Standard (RFC 4648), URL-safe (replaces + and / with - and _), and Data URL (ready to embed in HTML or CSS). Handles binary files up to tens of megabytes - entirely in your browser."
          audience={["Developers", "API integrators", "Support engineers"]}
          whenToUse={[
            "Embedding a small image as a data URL",
            "Decoding a Base64 token from logs",
            "Encoding credentials for an Authorization header",
          ]}
        />

        {/* Options bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div
            className="flex items-center gap-1 px-1 py-0.5"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-cta-radius, 0.5rem)",
            }}
          >
            <button
              onClick={() => setVariant("standard")}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={segActive(variant === "standard")}
            >
              Standard
            </button>
            <button
              onClick={() => setVariant("urlsafe")}
              className="px-3 py-1.5 text-sm font-medium transition-colors"
              style={segActive(variant === "urlsafe")}
            >
              URL-safe
            </button>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <span style={{ color: "var(--kami-text-muted)" }}>Wrap:</span>
            {[
              { label: "None", value: 0 },
              { label: "64 (PEM)", value: 64 },
              { label: "76 (MIME)", value: 76 },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setLineWrap(opt.value)}
                className="px-2 py-0.5 text-xs font-medium transition-colors"
                style={{
                  background: lineWrap === opt.value ? "var(--kami-surface)" : "transparent",
                  color: lineWrap === opt.value ? "var(--kami-text)" : "var(--kami-text-muted)",
                  borderRadius: "var(--kami-cta-radius, 0.25rem)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Plain text side */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>Plain Text</span>
              {plainText && (
                <button
                  onClick={() => handleCopy(plainText, "plain")}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
                  style={ctaStyle}
                >
                  {copied === "plain" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                </button>
              )}
            </div>
            <textarea
              value={plainText}
              onChange={(e) => handlePlainChange(e.target.value)}
              placeholder="Type or paste plain text..."
              className="w-full px-4 py-3 text-base font-mono focus:outline-none"
              style={inputStyle}
              rows={10}
              autoFocus
            />
            <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
              <span>{plainText.length} chars / {new TextEncoder().encode(plainText).length} bytes</span>
              {plainText && (
                <button onClick={handleClear}>Clear</button>
              )}
            </div>
          </div>

          {/* Base64 side */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Base64{variant === "urlsafe" ? " (URL-safe)" : ""}
                {fileName && <span className="font-normal" style={{ color: "var(--kami-text-dim)" }}> - {fileName}</span>}
              </span>
              {b64Output && (
                <button
                  onClick={() => handleCopy(b64Output, "base64")}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
                  style={ctaStyle}
                >
                  {copied === "base64" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                </button>
              )}
            </div>
            <textarea
              value={b64Output}
              onChange={(e) => handleBase64Change(e.target.value)}
              placeholder="Type or paste Base64..."
              className="w-full px-4 py-3 text-base font-mono focus:outline-none"
              style={inputStyle}
              rows={10}
            />
            <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
              <span>
                {base64Text.length} base64 chars
                {byteSize > 0 && ` / ${byteSize.toLocaleString()} decoded bytes`}
              </span>
              {base64Text && (
                <button onClick={handleClear}>Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Data URL + Image preview */}
        {base64Text && (
          <div className="mt-4 space-y-3">
            {/* Data URL */}
            {dataUrl && (
              <div className="p-4" style={cardStyle}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                    Data URL
                    {detectedMime && <span className="font-normal ml-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>{detectedMime}</span>}
                  </span>
                  <button
                    onClick={() => handleCopy(dataUrl, "dataurl")}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors"
                    style={ctaStyle}
                  >
                    {copied === "dataurl" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy Data URL</>}
                  </button>
                </div>
                <div
                  className="font-mono text-xs break-all max-h-20 overflow-auto p-2"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  }}
                >
                  {dataUrl.slice(0, 200)}{dataUrl.length > 200 ? "..." : ""}
                </div>
              </div>
            )}

            {/* Image preview */}
            {showImagePreview && dataUrl && (
              <div className="p-4" style={cardStyle}>
                <span className="text-sm font-medium mb-2 block" style={{ color: "var(--kami-text-muted)" }}>Preview</span>
                <div
                  className="flex items-center justify-center p-4"
                  style={{
                    background: "var(--kami-surface)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    backgroundImage:
                      "url('data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2220%22%20height%3D%2220%22%3E%3Crect%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f0f0f0%22%2F%3E%3Crect%20x%3D%2210%22%20y%3D%2210%22%20width%3D%2210%22%20height%3D%2210%22%20fill%3D%22%23f0f0f0%22%2F%3E%3C%2Fsvg%3E')",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dataUrl} alt="Preview" className="max-w-full max-h-64 rounded" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* File drop zone */}
        <div className="mt-6">
          <FileDropZone
            accept={[]}
            onFiles={handleFileSelect}
            label="Drop a file here or click to browse"
            hint="Any file type - converts to Base64 with auto-detected MIME type"
            multiple={false}
          />
        </div>

        {/* Quick reference */}
        <details className="mt-6">
          <summary className="cursor-pointer text-sm" style={{ color: "var(--kami-text-dim)" }}>
            Base64 reference
          </summary>
          <div
            className="mt-2 p-4 text-xs space-y-2"
            style={{ ...cardStyle, color: "var(--kami-text-muted)" }}
          >
            <p><strong>Standard Base64</strong> uses A-Z, a-z, 0-9, +, / and = for padding. Used in emails (MIME), PEM certificates, and data URIs.</p>
            <p><strong>URL-safe Base64</strong> replaces + with - and / with _, strips = padding. Used in JWTs, URL parameters, and file names.</p>
            <p><strong>Line wrapping</strong>: PEM (64 chars/line) for certificates, MIME (76 chars/line) for email attachments.</p>
            <p><strong>Size overhead</strong>: Base64 encoding increases size by ~33% (3 bytes become 4 characters).</p>
          </div>
        </details>
      </div>
    </div>
  );
}

// Inline SVG icons

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
