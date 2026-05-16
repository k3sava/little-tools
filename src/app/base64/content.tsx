"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle } from "@/components/tools/controls";

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

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

// --- UI ---

type Variant = "standard" | "urlsafe";
type Wrap = "0" | "64" | "76";

export default function Base64Content() {
  const [{ q: plainText }, setToolState] = useToolState({ q: "" });
  const setPlainText = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [base64Text, setBase64Text] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileMime, setFileMime] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number>(0);
  const [variant, setVariant] = useState<Variant>("standard");
  const [lineWrap, setLineWrap] = useState<Wrap>("0");
  const [showImagePreviewTab, setShowImagePreviewTab] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lineWrapNum = useMemo(() => parseInt(lineWrap, 10), [lineWrap]);

  const b64Output = useMemo(() => {
    let b64 = base64Text;
    if (variant === "urlsafe") b64 = toUrlSafe(b64);
    if (lineWrapNum > 0) b64 = wrapLines(b64, lineWrapNum);
    return b64;
  }, [base64Text, variant, lineWrapNum]);

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

  const inputByteSize = useMemo(() => {
    if (fileName) return fileSize;
    return new TextEncoder().encode(plainText).length;
  }, [fileName, fileSize, plainText]);

  const handlePlainChange = useCallback((text: string) => {
    setPlainText(text);
    setFileName(null);
    setFileMime(null);
    setFileSize(0);
    if (text) {
      setBase64Text(encode(text));
    } else {
      setBase64Text("");
    }
  }, [setPlainText]);

  const handleBase64Change = useCallback((text: string) => {
    let normalized = text;
    if (variant === "urlsafe") normalized = fromUrlSafe(text.replace(/\s/g, ""));
    else normalized = text.replace(/\s/g, "");

    setBase64Text(normalized);
    setFileName(null);
    setFileMime(null);
    setFileSize(0);
    if (normalized && isBase64(normalized)) {
      setPlainText(decode(normalized));
    }
  }, [variant, setPlainText]);

  const handleCopy = useCallback(async (text: string, which: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const b64 = await fileToBase64(file);
    setBase64Text(b64);
    setFileName(file.name);
    setFileMime(file.type || null);
    setFileSize(file.size);
    setPlainText("");
  }, [setPlainText]);

  const handleClear = useCallback(() => {
    setPlainText("");
    setBase64Text("");
    setFileName(null);
    setFileMime(null);
    setFileSize(0);
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
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  } as const;

  return (
    <ToolShell
      title="Base64 Encode / Decode"
      tagline="Text · files · data URLs · image preview"
      accent="#10b981"
      actions={
        <>
          {(plainText || base64Text) && (
            <ToolActionButton onClick={handleClear} variant="ghost">Clear</ToolActionButton>
          )}
          {b64Output && (
            <ToolActionButton onClick={() => handleCopy(b64Output, "base64")} variant="solid">
              {copied === "base64" ? "Copied" : "Copy Base64"}
            </ToolActionButton>
          )}
        </>
      }
      controls={
        <>
          <ControlGroup label="Variant">
            <Segment<Variant>
              value={variant}
              onChange={setVariant}
              options={[
                { value: "standard", label: "Standard" },
                { value: "urlsafe", label: "URL-safe" },
              ]}
              full
            />
          </ControlGroup>
          <ControlGroup label="Line wrap">
            <Segment<Wrap>
              value={lineWrap}
              onChange={setLineWrap}
              options={[
                { value: "0", label: "None" },
                { value: "64", label: "PEM 64" },
                { value: "76", label: "MIME 76" },
              ]}
              full
            />
          </ControlGroup>
          <Toggle
            label="Image preview"
            hint="Show inline preview for image MIME types"
            checked={showImagePreviewTab}
            onChange={setShowImagePreviewTab}
          />
          <ControlGroup label="Size">
            <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
              <span>In: {formatSize(inputByteSize)}</span>
              <span>Base64: {formatSize(base64Text.length)}</span>
              {byteSize > 0 && <span>Decoded: {formatSize(byteSize)}</span>}
            </div>
          </ControlGroup>
        </>
      }
    >
      <div
        className="flex flex-col gap-3"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {/* Dual editor */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Plain text side */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Plain text
              </span>
              {plainText && (
                <ToolActionButton onClick={() => handleCopy(plainText, "plain")} variant="ghost">
                  {copied === "plain" ? "Copied" : "Copy"}
                </ToolActionButton>
              )}
            </div>
            <textarea
              value={plainText}
              onChange={(e) => handlePlainChange(e.target.value)}
              placeholder="Type or paste plain text..."
              className="w-full px-4 py-3 text-base font-mono focus:outline-none"
              style={{ ...inputStyle, minHeight: 220 }}
              rows={10}
              autoFocus
              spellCheck={false}
            />
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
              <span>{plainText.length} chars · {new TextEncoder().encode(plainText).length} bytes</span>
            </div>
          </div>

          {/* Base64 side */}
          <div className="flex-1 min-w-0 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Base64{variant === "urlsafe" ? " (URL-safe)" : ""}
                {fileName && (
                  <span className="font-normal ml-1" style={{ color: "var(--kami-text-dim)" }}>
                    · {fileName}
                  </span>
                )}
              </span>
              {b64Output && (
                <ToolActionButton onClick={() => handleCopy(b64Output, "base64")} variant="ghost">
                  {copied === "base64" ? "Copied" : "Copy"}
                </ToolActionButton>
              )}
            </div>
            <textarea
              value={b64Output}
              onChange={(e) => handleBase64Change(e.target.value)}
              placeholder="Type or paste Base64..."
              className="w-full px-4 py-3 text-base font-mono focus:outline-none"
              style={{ ...inputStyle, minHeight: 220 }}
              rows={10}
              spellCheck={false}
            />
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
              <span>
                {base64Text.length} base64 chars
                {byteSize > 0 && ` · ${formatSize(byteSize)} decoded`}
              </span>
            </div>
          </div>
        </div>

        {/* Drop zone integrated into canvas */}
        <div
          className="flex flex-col items-center justify-center text-center px-4 py-6 transition-colors"
          style={{
            background: dragOver ? "color-mix(in srgb, #10b981 8%, var(--kami-surface))" : "var(--kami-surface)",
            border: `2px dashed ${dragOver ? "#10b981" : "var(--kami-border-strong)"}`,
            borderRadius: "var(--kami-card-radius, 0.75rem)",
          }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>
            {dragOver ? "Drop the file" : "Drag a file here, or"}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <ToolActionButton
              onClick={() => fileInputRef.current?.click()}
              variant="solid"
            >
              Encode file
            </ToolActionButton>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
            Any file type — converts to Base64 with auto-detected MIME
          </p>
        </div>

        {/* Data URL + Image preview */}
        {base64Text && dataUrl && (
          <div className="flex flex-col gap-3">
            <div className="p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                  Data URL
                  {detectedMime && (
                    <span className="font-normal ml-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                      {detectedMime}
                    </span>
                  )}
                </span>
                <ToolActionButton onClick={() => handleCopy(dataUrl, "dataurl")} variant="outline">
                  {copied === "dataurl" ? "Copied" : "Copy data URL"}
                </ToolActionButton>
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

            {showImagePreview && showImagePreviewTab && (
              <div className="p-4" style={cardStyle}>
                <span className="text-sm font-medium mb-2 block" style={{ color: "var(--kami-text-muted)" }}>
                  Preview
                </span>
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
      </div>
    </ToolShell>
  );
}
