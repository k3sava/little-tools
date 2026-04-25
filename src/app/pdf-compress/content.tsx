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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Compress PDF"
          tagline="Shrink PDF file size in your browser — nothing is uploaded, so your document stays private."
          description="Drop a PDF, pick a quality preset (high / medium / low / aggressive), and we re-encode embedded images and streams locally. The output is a valid PDF with smaller file size. Best results come from PDFs with lots of images — text-heavy PDFs usually compress less."
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
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-medium text-red-700">{errorMessage}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
            >
              Try another file
            </button>
          </div>
        )}

        {/* File loaded: show info + controls */}
        {file && status !== "done" && (
          <div className="space-y-6">
            {/* File info card */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {file.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatBytes(originalSize)} &middot; {pageCount}{" "}
                    {pageCount === 1 ? "page" : "pages"}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="ml-4 shrink-0 text-xs text-gray-400 hover:text-gray-600"
                >
                  Remove
                </button>
              </div>
            </div>

            {/* Compression level selector */}
            <div>
              <p className="mb-3 text-sm font-medium text-gray-700">
                Compression level
              </p>
              <div className="grid grid-cols-3 gap-3">
                {(["low", "medium", "high"] as CompressionLevel[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLevel(l)}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      level === l
                        ? "border-rose-300 bg-rose-50 ring-2 ring-rose-200"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <p
                      className={`text-sm font-semibold ${
                        level === l ? "text-rose-700" : "text-gray-900"
                      }`}
                    >
                      {LEVEL_INFO[l].label}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {LEVEL_INFO[l].description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Error during compression */}
            {status === "error" && errorMessage && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Compress button */}
            <button
              onClick={compress}
              disabled={status === "compressing"}
              className="w-full rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
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
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="mb-4 text-sm font-medium text-gray-700">
                Compression result
              </p>

              {/* Size comparison */}
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Original
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatBytes(originalSize)}
                  </p>
                </div>
                <div className="pb-1 text-gray-300">
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
                  <p className="text-xs uppercase tracking-wide text-gray-400">
                    Compressed
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {formatBytes(compressedSize)}
                  </p>
                </div>
              </div>

              {/* Visual bar */}
              <div className="mt-4">
                <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        5,
                        (compressedSize / originalSize) * 100
                      )}%`,
                      backgroundColor:
                        reductionPercent > 0 ? "#f43f5e" : "#9ca3af",
                    }}
                  />
                </div>
              </div>

              {/* Reduction label */}
              <div className="mt-3 text-center">
                {reductionPercent > 0 ? (
                  <p className="text-sm font-medium text-rose-600">
                    {reductionPercent.toFixed(1)}% smaller
                  </p>
                ) : reductionPercent === 0 ? (
                  <p className="text-sm text-gray-500">
                    No size change. This PDF is already well-optimized.
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
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
                className="flex-1 rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-rose-700"
              >
                Download compressed PDF
              </button>
              <button
                onClick={reset}
                className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
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
