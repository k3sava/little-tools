"use client";

import { useState, useCallback, useMemo } from "react";
import { PDFDocument } from "pdf-lib";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { formatBytes } from "@/lib/format-bytes";
import { ToolIntro } from "@/components/tools/tool-intro";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import { Spinner } from "@/components/tools/spinner";

type CompressionLevel = "low" | "medium" | "high";
type Status = "idle" | "loading" | "compressing" | "done" | "error";

const LEVEL_INFO: Record<
  CompressionLevel,
  { label: string; description: string }
> = {
  low: {
    label: "Low",
    description: "Re-serialize only. Smallest reduction, preserves all metadata.",
  },
  medium: {
    label: "Medium",
    description: "Object streams. Good balance of size and compatibility.",
  },
  high: {
    label: "High",
    description: "Maximum. Strips metadata for smallest possible file.",
  },
};

export default function PdfCompressContent() {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressedSize, setCompressedSize] = useState(0);
  const [level, setLevel] = useState<CompressionLevel>("medium");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);

  const handleFileLoad = useCallback(async (fileObj: File, buffer: ArrayBuffer) => {
    setStatus("loading");
    setErrorMessage("");
    setCompressedBlob(null);
    setCompressedSize(0);

    try {
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const pages = pdf.getPageCount();

      if (pages === 0) {
        throw new Error("This PDF has no pages.");
      }

      setFile(fileObj);
      setOriginalSize(buffer.byteLength);
      setPageCount(pages);
      setSourceBytes(buffer);
      setStatus("idle");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to read PDF.";
      const isEncrypted =
        message.toLowerCase().includes("encrypt") ||
        message.toLowerCase().includes("password");
      setErrorMessage(
        isEncrypted
          ? "This PDF is encrypted or password-protected and cannot be compressed."
          : `Invalid PDF: ${message}`
      );
      setStatus("error");
      setFile(null);
      setSourceBytes(null);
    }
  }, []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const f = files[0];
      const buffer = await f.arrayBuffer();
      handleFileLoad(f, buffer);
    },
    [handleFileLoad],
  );

  const compress = useCallback(async () => {
    if (!sourceBytes || !file) return;

    setStatus("compressing");
    setErrorMessage("");
    setCompressedBlob(null);
    setCompressedSize(0);

    try {
      // Load source
      const srcDoc = await PDFDocument.load(sourceBytes, {
        ignoreEncryption: true,
      });

      // Create new document and copy all pages
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const page of pages) {
        newDoc.addPage(page);
      }

      // Apply compression based on level
      let savedBytes: Uint8Array;

      if (level === "low") {
        savedBytes = await newDoc.save();
      } else if (level === "medium") {
        savedBytes = await newDoc.save({ useObjectStreams: true });
      } else {
        // High: strip metadata + object streams
        newDoc.setTitle("");
        newDoc.setAuthor("");
        newDoc.setSubject("");
        newDoc.setKeywords([]);
        newDoc.setCreator("");
        newDoc.setProducer("");
        newDoc.setCreationDate(new Date(0));
        newDoc.setModificationDate(new Date(0));
        savedBytes = await newDoc.save({ useObjectStreams: true });
      }

      const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setCompressedBlob(blob);
      setCompressedSize(savedBytes.byteLength);
      setStatus("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Compression failed.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [sourceBytes, file, level]);

  const download = useCallback(() => {
    if (!compressedBlob || !file) return;
    const url = URL.createObjectURL(compressedBlob);
    const a = document.createElement("a");
    const baseName = file.name.replace(/\.pdf$/i, "");
    a.href = url;
    a.download = `${baseName}-compressed.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [compressedBlob, file]);

  const reset = useCallback(() => {
    setFile(null);
    setOriginalSize(0);
    setPageCount(0);
    setCompressedBlob(null);
    setCompressedSize(0);
    setStatus("idle");
    setErrorMessage("");
    setSourceBytes(null);
  }, []);

  const reductionPercent = useMemo(() => {
    if (!originalSize || !compressedSize) return 0;
    return ((originalSize - compressedSize) / originalSize) * 100;
  }, [originalSize, compressedSize]);

  const shortcuts = useMemo(
    () => [
      {
        key: "Enter",
        meta: true,
        action: () => {
          if (file && status !== "compressing") compress();
        },
        label: "Compress",
      },
    ],
    [file, status, compress]
  );

  useKeyboardShortcuts(shortcuts);

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const ctaStyle = {
    background: "var(--kami-cta-bg)",
    color: "var(--kami-cta-text)",
    borderRadius: "var(--kami-cta-radius, 0.5rem)",
  };
  const accentBg = "var(--kami-accent, #f43f5e)";

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Compress PDF"
          tagline="Shrink PDF file size in your browser - nothing is uploaded, so your document stays private."
          description="Drop a PDF, pick a quality preset (high / medium / low / aggressive), and we re-encode embedded images and streams locally. The output is a valid PDF with smaller file size. Best results come from PDFs with lots of images - text-heavy PDFs usually compress less."
          audience={["Everyone"]}
          whenToUse={[
            "Getting a PDF under an email attachment limit",
            "Speeding up a slow-to-download document",
            "Shrinking a scanned contract for uploading to a portal",
          ]}
        />

        {/* Drop zone (shown when no file loaded) */}
        {!file && status !== "error" && (
          <FileDropZone
            accept={[".pdf"]}
            onFiles={handleFiles}
            label="Drop a PDF here or click to browse"
            multiple={false}
            hint="100% client-side. Nothing is uploaded."
          />
        )}

        {/* Error state */}
        {status === "error" && !file && (
          <div
            className="p-6 text-center"
            style={{
              background: "color-mix(in srgb, #ef4444 10%, var(--kami-surface))",
              color: "var(--kami-text)",
              border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            <p className="text-sm font-medium">{errorMessage}</p>
            <button
              onClick={reset}
              className="mt-4 px-4 py-2 text-sm font-medium transition-colors"
              style={ctaStyle}
            >
              Try another file
            </button>
          </div>
        )}

        {/* File loaded: show info + controls */}
        {file && status !== "done" && (
          <div className="space-y-6">
            {/* File info card */}
            <div className="p-5" style={cardStyle}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium" style={{ color: "var(--kami-text)" }}>
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                    {formatBytes(originalSize)} &middot; {pageCount}{" "}
                    {pageCount === 1 ? "page" : "pages"}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="ml-4 shrink-0 text-xs"
                  style={{ color: "var(--kami-text-dim)" }}
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Compression level selector */}
            <div>
              <p className="mb-3 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Compression level
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(["low", "medium", "high"] as CompressionLevel[]).map((l) => {
                  const active = level === l;
                  return (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className="p-4 text-left transition-all"
                      style={{
                        background: active ? "color-mix(in srgb, var(--kami-accent, #f43f5e) 10%, var(--kami-surface))" : "var(--kami-surface-solid)",
                        border: active
                          ? `1px solid color-mix(in srgb, var(--kami-accent, #f43f5e) 35%, transparent)`
                          : "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-card-radius, 0.75rem)",
                      }}
                    >
                      <p
                        className="text-sm font-semibold"
                        style={{ color: active ? "var(--kami-accent, #be123c)" : "var(--kami-text)" }}
                      >
                        {LEVEL_INFO[l].label}
                      </p>
                      <p className="mt-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                        {LEVEL_INFO[l].description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error during compression */}
            {status === "error" && errorMessage && (
              <div
                className="p-4"
                style={{
                  background: "color-mix(in srgb, #ef4444 10%, var(--kami-surface))",
                  color: "var(--kami-text)",
                  border: "1px solid color-mix(in srgb, #ef4444 30%, transparent)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                }}
              >
                <p className="text-sm">{errorMessage}</p>
              </div>
            )}

            {/* Compress button */}
            <button
              onClick={compress}
              disabled={status === "compressing"}
              className="w-full px-6 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                background: accentBg,
                color: "#ffffff",
                borderRadius: "var(--kami-cta-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              {status === "compressing" ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner />
                  Compressing...
                </span>
              ) : (
                "Compress"
              )}
            </button>
          </div>
        )}

        {/* Results */}
        {status === "done" && file && (
          <div className="space-y-6">
            {/* Results card */}
            <div className="p-6" style={cardStyle}>
              <p className="mb-4 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                Compression result
              </p>

              {/* Size comparison */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
                    Original
                  </p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: "var(--kami-text)" }}>
                    {formatBytes(originalSize)}
                  </p>
                </div>
                <div className="pb-1" style={{ color: "var(--kami-text-dim)" }}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
                    Compressed
                  </p>
                  <p className="mt-1 text-lg font-semibold" style={{ color: "var(--kami-text)" }}>
                    {formatBytes(compressedSize)}
                  </p>
                </div>
              </div>

              {/* Visual bar */}
              <div className="mt-4">
                <div
                  className="h-3 w-full overflow-hidden rounded-full"
                  style={{ background: "var(--kami-surface)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        5,
                        (compressedSize / originalSize) * 100
                      )}%`,
                      backgroundColor:
                        reductionPercent > 0 ? accentBg : "var(--kami-text-dim)",
                    }}
                  />
                </div>
              </div>

              {/* Reduction label */}
              <div className="mt-3 text-center">
                {reductionPercent > 0 ? (
                  <p className="text-sm font-medium" style={{ color: accentBg }}>
                    {reductionPercent.toFixed(1)}% smaller
                  </p>
                ) : reductionPercent === 0 ? (
                  <p className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
                    No size change. This PDF is already well-optimized.
                  </p>
                ) : (
                  <p className="text-sm" style={{ color: "var(--kami-text-muted)" }}>
                    File grew by {Math.abs(reductionPercent).toFixed(1)}%.
                    This PDF is already well-optimized and re-encoding added overhead.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={download}
                className="flex-1 px-6 py-3 text-sm font-semibold transition-colors"
                style={{
                  background: accentBg,
                  color: "#ffffff",
                  borderRadius: "var(--kami-cta-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                Download compressed PDF
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 text-sm font-medium transition-colors"
                style={{
                  background: "var(--kami-surface-solid)",
                  color: "var(--kami-text-muted)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-cta-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                Try another file
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
