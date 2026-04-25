"use client";

import { useState, useCallback, useMemo } from "react";
import { PDFDocument } from "pdf-lib";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { formatBytes } from "@/lib/format-bytes";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import { ToolIntro } from "@/components/tools/tool-intro";

type Status = "idle" | "loading" | "extracting" | "done" | "error";

/** Parse a range string like "1-3, 5, 8-10" into a Set of 0-based page indices */
function parseRanges(input: string, totalPages: number): Set<number> {
  const result = new Set<number>();
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    const rangeParts = part.split("-").map((s) => s.trim());
    if (rangeParts.length === 1) {
      const n = parseInt(rangeParts[0], 10);
      if (!isNaN(n) && n >= 1 && n <= totalPages) {
        result.add(n - 1);
      }
    } else if (rangeParts.length === 2) {
      const start = parseInt(rangeParts[0], 10);
      const end = parseInt(rangeParts[1], 10);
      if (!isNaN(start) && !isNaN(end)) {
        const lo = Math.max(1, Math.min(start, end));
        const hi = Math.min(totalPages, Math.max(start, end));
        for (let i = lo; i <= hi; i++) {
          result.add(i - 1);
        }
      }
    }
  }

  return result;
}

export default function PdfSplitContent() {
  const [file, setFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [rangeInput, setRangeInput] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [sourceBytes, setSourceBytes] = useState<ArrayBuffer | null>(null);
  const [resultSize, setResultSize] = useState(0);
  const [resultPageCount, setResultPageCount] = useState(0);

  const handleFileLoad = useCallback(async (fileObj: File, buffer: ArrayBuffer) => {
    setStatus("loading");
    setErrorMessage("");
    setResultSize(0);
    setResultPageCount(0);

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
      // Select all pages by default
      const all = new Set<number>();
      for (let i = 0; i < pages; i++) all.add(i);
      setSelectedPages(all);
      setRangeInput("");
      setStatus("idle");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to read PDF.";
      const isEncrypted =
        message.toLowerCase().includes("encrypt") ||
        message.toLowerCase().includes("password");
      setErrorMessage(
        isEncrypted
          ? "This PDF is encrypted or password-protected and cannot be processed."
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

  const togglePage = useCallback((index: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
    setRangeInput("");
  }, []);

  const selectAll = useCallback(() => {
    const all = new Set<number>();
    for (let i = 0; i < pageCount; i++) all.add(i);
    setSelectedPages(all);
    setRangeInput("");
  }, [pageCount]);

  const selectNone = useCallback(() => {
    setSelectedPages(new Set());
    setRangeInput("");
  }, []);

  const selectOdd = useCallback(() => {
    const odd = new Set<number>();
    for (let i = 0; i < pageCount; i += 2) odd.add(i); // page 1, 3, 5...
    setSelectedPages(odd);
    setRangeInput("");
  }, [pageCount]);

  const selectEven = useCallback(() => {
    const even = new Set<number>();
    for (let i = 1; i < pageCount; i += 2) even.add(i); // page 2, 4, 6...
    setSelectedPages(even);
    setRangeInput("");
  }, [pageCount]);

  const invertSelection = useCallback(() => {
    setSelectedPages((prev) => {
      const inverted = new Set<number>();
      for (let i = 0; i < pageCount; i++) {
        if (!prev.has(i)) inverted.add(i);
      }
      return inverted;
    });
    setRangeInput("");
  }, [pageCount]);

  const applyRange = useCallback(() => {
    if (!rangeInput.trim()) return;
    const parsed = parseRanges(rangeInput, pageCount);
    setSelectedPages(parsed);
  }, [rangeInput, pageCount]);

  const extract = useCallback(async () => {
    if (!sourceBytes || !file || selectedPages.size === 0) return;

    setStatus("extracting");
    setErrorMessage("");
    setResultSize(0);
    setResultPageCount(0);

    try {
      const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();

      const sortedIndices = Array.from(selectedPages).sort((a, b) => a - b);
      const copiedPages = await newDoc.copyPages(srcDoc, sortedIndices);
      for (const page of copiedPages) {
        newDoc.addPage(page);
      }

      const pdfBytes = await newDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });

      setResultSize(pdfBytes.byteLength);
      setResultPageCount(sortedIndices.length);
      setStatus("done");

      // Auto-download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const baseName = file.name.replace(/\.pdf$/i, "");
      a.href = url;
      a.download = `${baseName}-extracted.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [sourceBytes, file, selectedPages]);

  const reset = useCallback(() => {
    setFile(null);
    setOriginalSize(0);
    setPageCount(0);
    setSelectedPages(new Set());
    setRangeInput("");
    setStatus("idle");
    setErrorMessage("");
    setSourceBytes(null);
    setResultSize(0);
    setResultPageCount(0);
  }, []);

  const shortcuts = useMemo(
    () => [
      {
        key: "Enter",
        meta: true,
        action: () => {
          if (file && selectedPages.size > 0 && status !== "extracting") extract();
        },
        label: "Extract",
      },
    ],
    [file, selectedPages.size, status, extract]
  );

  useKeyboardShortcuts(shortcuts);

  const selectedCount = selectedPages.size;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <ToolIntro
        title="Split PDF"
        tagline="Extract specific pages from a PDF — pick ranges, individual pages, or every-N-pages splits."
        description="Drop a PDF, click to select pages, or type a range (1-5, 8, 10-12). Split modes: extract selected pages as a new PDF, split every page into its own file, or split at fixed intervals. Everything runs locally in your browser — safe for sensitive documents."
        audience={["Everyone"]}
        whenToUse={[
          "Pulling one chapter out of an ebook",
          "Extracting a signature page from a contract",
          "Splitting a scanned multi-page document into individual PDFs",
        ]}
      />

      {/* Drop zone (shown when no file loaded) */}
      {!file && status !== "error" && (
        <div className="mb-6">
          <FileDropZone
            accept={[".pdf"]}
            onFiles={handleFiles}
            label="Drop a PDF here or click to browse"
            multiple={false}
            icon={<>&#9986;</>}
            hint=".pdf only"
          />
        </div>
      )}

      {/* Error state (no file) */}
      {status === "error" && !file && (
        <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-4 py-6 text-center dark:border-red-800 dark:bg-red-950/30">
          <p className="text-sm font-medium text-red-700 dark:text-red-400">{errorMessage}</p>
          <button
            onClick={reset}
            className="mt-4 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
            style={{ background: "#f43f5e" }}
          >
            Try another file
          </button>
        </div>
      )}

      {/* File loaded */}
      {file && status !== "done" && (
        <div className="space-y-5">
          {/* File info card */}
          <div
            className="rounded-xl border px-4 py-3 shadow-sm"
            style={{ background: "var(--kami-surface)", borderColor: "var(--kami-border)" }}
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: "var(--kami-text)" }}>
                  {file.name}
                </p>
                <p className="mt-0.5 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {formatBytes(originalSize)} &middot; {pageCount}{" "}
                  {pageCount === 1 ? "page" : "pages"}
                </p>
              </div>
              <button
                onClick={reset}
                className="ml-4 shrink-0 text-xs transition-opacity hover:opacity-70"
                style={{ color: "var(--kami-text-muted)" }}
              >
                Remove
              </button>
            </div>
          </div>

          {/* Range input */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--kami-text)" }}>
              Page range
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyRange();
                  }
                }}
                placeholder="e.g. 1-3, 5, 8-10"
                className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-rose-400"
                style={{
                  background: "var(--kami-input-bg)",
                  borderColor: "var(--kami-border)",
                  color: "var(--kami-text)",
                }}
              />
              <button
                onClick={applyRange}
                disabled={!rangeInput.trim()}
                className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:opacity-80 disabled:opacity-40"
                style={{
                  borderColor: "var(--kami-border)",
                  color: "var(--kami-text)",
                }}
              >
                Apply
              </button>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Select All", action: selectAll },
              { label: "Select Odd", action: selectOdd },
              { label: "Select Even", action: selectEven },
              { label: "Invert", action: invertSelection },
              { label: "Clear", action: selectNone },
            ].map(({ label, action }) => (
              <button
                key={label}
                onClick={action}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:opacity-80"
                style={{
                  borderColor: "var(--kami-border)",
                  color: "var(--kami-text-muted)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Visual page grid */}
          <div
            className="grid gap-2 rounded-xl border p-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(56px, 1fr))",
              background: "var(--kami-surface)",
              borderColor: "var(--kami-border)",
            }}
          >
            {Array.from({ length: pageCount }, (_, i) => {
              const isSelected = selectedPages.has(i);
              return (
                <button
                  key={i}
                  onClick={() => togglePage(i)}
                  className={`flex h-14 w-full items-center justify-center rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                      : "hover:border-gray-400 dark:hover:border-gray-500"
                  }`}
                  style={
                    isSelected
                      ? undefined
                      : {
                          borderColor: "var(--kami-border)",
                          color: "var(--kami-text-muted)",
                        }
                  }
                  title={`Page ${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Selection summary */}
          <div
            className="flex items-center justify-between rounded-lg px-4 py-2 text-xs"
            style={{ color: "var(--kami-text-muted)", background: "var(--kami-input-bg)" }}
          >
            <span>
              {selectedCount} of {pageCount} {pageCount === 1 ? "page" : "pages"} selected
            </span>
          </div>

          {/* Error during extraction */}
          {status === "error" && errorMessage && (
            <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          {/* Extract button */}
          <button
            onClick={extract}
            disabled={selectedCount === 0 || status === "extracting"}
            className="w-full rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "#f43f5e" }}
          >
            {status === "extracting"
              ? "Extracting..."
              : `Extract ${selectedCount} ${selectedCount === 1 ? "page" : "pages"}`}
          </button>
        </div>
      )}

      {/* Results */}
      {status === "done" && file && (
        <div className="space-y-5">
          <div
            className="rounded-xl border p-5 shadow-sm"
            style={{ background: "var(--kami-surface)", borderColor: "var(--kami-border)" }}
          >
            <p className="mb-3 text-sm font-medium" style={{ color: "var(--kami-text)" }}>
              Extraction complete
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
                  Original
                </p>
                <p className="mt-1 text-lg font-semibold" style={{ color: "var(--kami-text)" }}>
                  {pageCount} {pageCount === 1 ? "page" : "pages"}
                </p>
                <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {formatBytes(originalSize)}
                </p>
              </div>
              <div className="pb-2" style={{ color: "var(--kami-text-muted)" }}>
                &rarr;
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
                  Extracted
                </p>
                <p className="mt-1 text-lg font-semibold" style={{ color: "var(--kami-text)" }}>
                  {resultPageCount} {resultPageCount === 1 ? "page" : "pages"}
                </p>
                <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {formatBytes(resultSize)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={reset}
              className="flex-1 rounded-xl border px-6 py-3 text-sm font-medium shadow-sm transition-colors hover:opacity-80"
              style={{
                borderColor: "var(--kami-border)",
                color: "var(--kami-text)",
              }}
            >
              Split another file
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!file && status === "idle" && (
        <div
          className="rounded-xl border px-6 py-8 text-center text-sm"
          style={{
            background: "var(--kami-surface)",
            borderColor: "var(--kami-border)",
            color: "var(--kami-text-muted)",
          }}
        >
          <p className="mb-2 font-medium">No file loaded</p>
          <p className="opacity-70">
            Drop a PDF above or click to browse. Select pages to extract, then download the result.
          </p>
        </div>
      )}
    </div>
  );
}
