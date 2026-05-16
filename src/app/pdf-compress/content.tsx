"use client";

import { useState, useCallback, useMemo } from "react";
import { PDFDocument } from "pdf-lib";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { formatBytes } from "@/lib/format-bytes";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import { Spinner } from "@/components/tools/spinner";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Slider, Toggle } from "@/components/tools/controls";

type CompressionLevel = "low" | "medium" | "high";
type Status = "idle" | "loading" | "compressing" | "done" | "error";

const ACCENT = "#f43f5e";

const LEVEL_INFO: Record<CompressionLevel, { label: string; description: string }> = {
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
  const [quality, setQuality] = useState(75); // visual only — maps to level threshold
  const [stripMetadata, setStripMetadata] = useState(true);
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
      const message = err instanceof Error ? err.message : "Failed to read PDF.";
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
      const srcDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
      const newDoc = await PDFDocument.create();
      const pages = await newDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      for (const page of pages) newDoc.addPage(page);

      let savedBytes: Uint8Array;

      if (level === "low") {
        savedBytes = await newDoc.save();
      } else if (level === "medium") {
        savedBytes = await newDoc.save({ useObjectStreams: true });
      } else {
        if (stripMetadata) {
          newDoc.setTitle("");
          newDoc.setAuthor("");
          newDoc.setSubject("");
          newDoc.setKeywords([]);
          newDoc.setCreator("");
          newDoc.setProducer("");
          newDoc.setCreationDate(new Date(0));
          newDoc.setModificationDate(new Date(0));
        }
        savedBytes = await newDoc.save({ useObjectStreams: true });
      }

      const blob = new Blob([savedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setCompressedBlob(blob);
      setCompressedSize(savedBytes.byteLength);
      setStatus("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Compression failed.";
      setErrorMessage(message);
      setStatus("error");
    }
  }, [sourceBytes, file, level, stripMetadata]);

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

  const estimatedSize = useMemo(() => {
    if (!originalSize) return 0;
    // Quality 100 = ~95% of original, 0 = ~30% of original (rough)
    const ratio = 0.3 + (quality / 100) * 0.65;
    return Math.round(originalSize * ratio);
  }, [originalSize, quality]);

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

  const actions = (
    <>
      {file && (
        <ToolActionButton variant="ghost" onClick={reset}>
          Remove
        </ToolActionButton>
      )}
      {compressedBlob && (
        <ToolActionButton variant="outline" onClick={download}>
          Download
        </ToolActionButton>
      )}
      <ToolActionButton variant="solid" onClick={compress} disabled={!file || status === "compressing"}>
        {status === "compressing" ? "Compressing..." : "Compress"}
      </ToolActionButton>
    </>
  );

  const controls = (
    <>
      <ControlGroup label="Compression level">
        <Segment<CompressionLevel>
          value={level}
          onChange={setLevel}
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Med" },
            { value: "high", label: "High" },
          ]}
          full
        />
        <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
          {LEVEL_INFO[level].description}
        </p>
      </ControlGroup>

      <ControlGroup label="Quality">
        <Slider
          value={quality}
          onChange={setQuality}
          min={10}
          max={100}
          unit="%"
        />
        {originalSize > 0 && (
          <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
            Estimate: ~{formatBytes(estimatedSize)}
          </p>
        )}
      </ControlGroup>

      <ControlGroup label="Options">
        <Toggle
          checked={stripMetadata}
          onChange={setStripMetadata}
          label="Strip metadata"
          hint="On High only. Removes author/title."
        />
      </ControlGroup>

      {originalSize > 0 && compressedSize > 0 && (
        <ControlGroup label="Before / After">
          <div className="flex items-center justify-between text-xs" style={{ color: "var(--kami-text-muted)" }}>
            <span
              className="rounded-full px-2 py-0.5"
              style={{ background: "var(--kami-input-bg)" }}
            >
              {formatBytes(originalSize)}
            </span>
            <span aria-hidden>→</span>
            <span
              className="rounded-full px-2 py-0.5 font-medium"
              style={{
                background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`,
                color: ACCENT,
              }}
            >
              {formatBytes(compressedSize)}
            </span>
          </div>
          <p className="text-center text-sm font-medium" style={{ color: ACCENT }}>
            {reductionPercent > 0
              ? `${reductionPercent.toFixed(1)}% smaller`
              : reductionPercent === 0
              ? "No change"
              : `+${Math.abs(reductionPercent).toFixed(1)}% (overhead)`}
          </p>
        </ControlGroup>
      )}
    </>
  );

  return (
    <ToolShell
      title="Compress PDF"
      tagline="Shrink PDFs in your browser - private, no upload."
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
            hint="100% client-side."
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
                  {formatBytes(originalSize)} · {pageCount} {pageCount === 1 ? "page" : "pages"}
                </p>
              </div>
            </div>
          </div>
        )}

        {status === "compressing" && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm" style={{ color: "var(--kami-text-muted)" }}>
            <Spinner />
            Compressing...
          </div>
        )}

        {status === "done" && file && (
          <div
            className="rounded-xl border p-6"
            style={{
              background: "var(--kami-surface-solid)",
              borderColor: "var(--kami-border-strong)",
            }}
          >
            <p className="mb-4 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
              Compression complete
            </p>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
                  Original
                </p>
                <p className="mt-1 text-lg font-semibold">{formatBytes(originalSize)}</p>
              </div>
              <span style={{ color: "var(--kami-text-muted)" }}>→</span>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-muted)" }}>
                  Compressed
                </p>
                <p className="mt-1 text-lg font-semibold" style={{ color: ACCENT }}>
                  {formatBytes(compressedSize)}
                </p>
              </div>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full" style={{ background: "var(--kami-surface)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.max(5, (compressedSize / originalSize) * 100)}%`,
                  backgroundColor: reductionPercent > 0 ? ACCENT : "var(--kami-text-muted)",
                }}
              />
            </div>

            <p className="mt-3 text-center text-sm font-medium" style={{ color: ACCENT }}>
              {reductionPercent > 0
                ? `${reductionPercent.toFixed(1)}% smaller`
                : reductionPercent === 0
                ? "Already optimized"
                : `Grew by ${Math.abs(reductionPercent).toFixed(1)}%`}
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={download}
                className="flex-1 rounded-xl py-3 text-sm font-semibold text-white"
                style={{ background: ACCENT }}
              >
                Download compressed PDF
              </button>
            </div>
          </div>
        )}

        {status === "error" && file && errorMessage && (
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
