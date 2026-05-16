"use client";

import { useState, useCallback, useMemo } from "react";
import { PDFDocument } from "pdf-lib";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { formatBytes } from "@/lib/format-bytes";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle } from "@/components/tools/controls";

type Status = "idle" | "loading" | "extracting" | "done" | "error";
type Mode = "select" | "every";

const ACCENT = "#f43f5e";

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

/** Compress an ordered list of 0-based indices into "1-3, 5, 7-10" */
function indicesToRanges(indices: number[]): string {
  if (indices.length === 0) return "";
  const sorted = [...indices].sort((a, b) => a - b);
  const chunks: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) {
      prev = sorted[i];
    } else {
      chunks.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
      start = sorted[i];
      prev = sorted[i];
    }
  }
  chunks.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`);
  return chunks.join(", ");
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
  const [mode, setMode] = useState<Mode>("select");
  const [namePattern, setNamePattern] = useState("{name}-extracted");

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
    if (!sourceBytes || !file) return;

    setStatus("extracting");
    setErrorMessage("");
    setResultSize(0);
    setResultPageCount(0);

    try {
      const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const baseName = file.name.replace(/\.pdf$/i, "");
      const fmt = (n: number) =>
        (namePattern || "{name}-extracted")
          .replace(/\{name\}/g, baseName)
          .replace(/\{page\}/g, String(n));

      if (mode === "every") {
        // One PDF per page (auto-downloads each)
        const indices = srcDoc.getPageIndices();
        let totalBytes = 0;
        for (const idx of indices) {
          const newDoc = await PDFDocument.create();
          const [p] = await newDoc.copyPages(srcDoc, [idx]);
          newDoc.addPage(p);
          const bytes = await newDoc.save();
          totalBytes += bytes.byteLength;
          const blob = new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${fmt(idx + 1)}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise((r) => setTimeout(r, 60));
          URL.revokeObjectURL(url);
        }
        setResultSize(totalBytes);
        setResultPageCount(indices.length);
        setStatus("done");
        return;
      }

      if (selectedPages.size === 0) {
        setStatus("idle");
        return;
      }

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

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fmt(sortedIndices[0] + 1)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Extraction failed.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [sourceBytes, file, selectedPages, mode, namePattern]);

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
          if (file && status !== "extracting" && (mode === "every" || selectedPages.size > 0))
            extract();
        },
        label: "Extract",
      },
    ],
    [file, selectedPages.size, status, extract, mode]
  );

  useKeyboardShortcuts(shortcuts);

  const selectedCount = selectedPages.size;
  const rangeChips = useMemo(() => indicesToRanges(Array.from(selectedPages)), [selectedPages]);

  const actions = (
    <>
      {file && (
        <ToolActionButton variant="ghost" onClick={reset}>
          Remove file
        </ToolActionButton>
      )}
      <ToolActionButton
        variant="solid"
        onClick={extract}
        disabled={!file || status === "extracting" || (mode === "select" && selectedCount === 0)}
      >
        {status === "extracting"
          ? "Extracting..."
          : mode === "every"
          ? `Extract every page`
          : `Extract ${selectedCount}`}
      </ToolActionButton>
    </>
  );

  const controls = (
    <>
      <ControlGroup label="Mode">
        <Segment<Mode>
          value={mode}
          onChange={setMode}
          options={[
            { value: "select", label: "Selected" },
            { value: "every", label: "Every page" },
          ]}
          full
        />
      </ControlGroup>

      {mode === "select" && file && (
        <>
          <ControlGroup label="Page range" hint="e.g. 1-3, 5">
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
                placeholder="1-3, 5, 8-10"
                className="kc-stepper-input"
                style={{
                  flex: 1,
                  minHeight: 40,
                  padding: "0 12px",
                  borderRadius: 10,
                  border: "1px solid var(--kami-border-strong)",
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                }}
              />
              <button
                type="button"
                onClick={applyRange}
                className="tool-action-btn"
                data-variant="outline"
                disabled={!rangeInput.trim()}
              >
                Apply
              </button>
            </div>
          </ControlGroup>

          <ControlGroup label="Quick select">
            <div className="flex flex-wrap gap-2">
              <button onClick={selectAll} className="tool-action-btn" data-variant="ghost">
                All
              </button>
              <button onClick={selectOdd} className="tool-action-btn" data-variant="ghost">
                Odd
              </button>
              <button onClick={selectEven} className="tool-action-btn" data-variant="ghost">
                Even
              </button>
              <button onClick={invertSelection} className="tool-action-btn" data-variant="ghost">
                Invert
              </button>
              <button onClick={selectNone} className="tool-action-btn" data-variant="ghost">
                Clear
              </button>
            </div>
          </ControlGroup>

          {selectedCount > 0 && (
            <ControlGroup label="Selection">
              <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                {selectedCount} / {pageCount} pages
              </p>
              <p
                className="rounded-md px-3 py-2 font-mono text-xs"
                style={{
                  background: "var(--kami-input-bg)",
                  color: "var(--kami-text)",
                  overflowWrap: "anywhere",
                }}
              >
                {rangeChips || "(none)"}
              </p>
            </ControlGroup>
          )}
        </>
      )}

      <ControlGroup label="Filename pattern" hint="{name}, {page}">
        <input
          type="text"
          value={namePattern}
          onChange={(e) => setNamePattern(e.target.value)}
          placeholder="{name}-extracted"
          className="kc-stepper-input"
          style={{
            width: "100%",
            minHeight: 40,
            padding: "0 12px",
            borderRadius: 10,
            border: "1px solid var(--kami-border-strong)",
            background: "var(--kami-input-bg, var(--kami-surface-solid))",
            color: "var(--kami-text)",
          }}
        />
      </ControlGroup>

      {status === "done" && (
        <ControlGroup label="Result">
          <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
            {resultPageCount} {resultPageCount === 1 ? "page" : "pages"} ·{" "}
            {formatBytes(resultSize)}
          </p>
        </ControlGroup>
      )}

      <ControlGroup>
        <Toggle
          checked={false}
          onChange={() => {}}
          label="Files processed in browser"
          hint="Nothing is uploaded."
        />
      </ControlGroup>
    </>
  );

  return (
    <ToolShell
      title="Split PDF"
      tagline="Extract pages from a PDF - select visually or by range."
      accent={ACCENT}
      actions={actions}
      controls={controls}
      controlsLabel="Settings"
    >
      <div className="flex flex-col gap-4">
        {!file && status !== "error" && (
          <FileDropZone
            accept={[".pdf"]}
            onFiles={handleFiles}
            label="Drop a PDF here or click to browse"
            multiple={false}
            icon={<>&#9986;</>}
            hint=".pdf only"
          />
        )}

        {status === "error" && !file && (
          <div
            className="rounded-xl border px-4 py-6 text-center"
            style={{
              borderColor: "color-mix(in srgb, #ef4444 30%, transparent)",
              background: "color-mix(in srgb, #ef4444 10%, transparent)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>
              {errorMessage}
            </p>
            <button
              onClick={reset}
              className="mt-3 rounded-lg px-4 py-2 text-sm font-medium text-white"
              style={{ background: ACCENT }}
            >
              Try another file
            </button>
          </div>
        )}

        {file && (
          <div
            className="rounded-xl border px-4 py-3"
            style={{
              background: "var(--kami-surface-solid)",
              borderColor: "var(--kami-border-strong)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: "var(--kami-text)" }}>
                  {file.name}
                </p>
                <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {formatBytes(originalSize)} · {pageCount}{" "}
                  {pageCount === 1 ? "page" : "pages"}
                </p>
              </div>
            </div>
          </div>
        )}

        {file && mode === "select" && (
          <div
            className="grid gap-2 rounded-xl border p-3"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))",
              background: "var(--kami-surface-solid)",
              borderColor: "var(--kami-border-strong)",
            }}
          >
            {Array.from({ length: pageCount }, (_, i) => {
              const isSelected = selectedPages.has(i);
              return (
                <button
                  key={i}
                  onClick={() => togglePage(i)}
                  className="flex aspect-[3/4] w-full flex-col items-center justify-center rounded-lg border text-sm font-medium transition-all"
                  style={
                    isSelected
                      ? {
                          background: `color-mix(in srgb, ${ACCENT} 15%, var(--kami-surface))`,
                          borderColor: ACCENT,
                          color: ACCENT,
                        }
                      : {
                          background: "var(--kami-surface)",
                          borderColor: "var(--kami-border)",
                          color: "var(--kami-text-muted)",
                        }
                  }
                  title={`Page ${i + 1}`}
                >
                  <span className="text-[10px] opacity-60">PG</span>
                  <span className="text-base">{i + 1}</span>
                </button>
              );
            })}
          </div>
        )}

        {status === "error" && errorMessage && file && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "color-mix(in srgb, #ef4444 30%, transparent)",
              background: "color-mix(in srgb, #ef4444 10%, transparent)",
              color: "var(--kami-text)",
            }}
          >
            {errorMessage}
          </div>
        )}
      </div>
    </ToolShell>
  );
}
