"use client";

import { useState, useCallback, useMemo } from "react";
import { PDFDocument } from "pdf-lib";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { formatBytes } from "@/lib/format-bytes";
import { FileDropZone } from "@/components/tools/file-drop-zone";

interface PdfEntry {
  id: string;
  file: File;
  name: string;
  pageCount: number;
  size: number;
}

export default function PdfMergeContent() {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [merging, setMerging] = useState(false);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPages = useMemo(() => entries.reduce((s, e) => s + e.pageCount, 0), [entries]);
  const totalSize = useMemo(() => entries.reduce((s, e) => s + e.size, 0), [entries]);

  const addFiles = useCallback(async (files: File[]) => {
    setError(null);
    setMergedUrl(null);

    const newEntries: PdfEntry[] = [];
    for (const file of files) {
      try {
        const content = await file.arrayBuffer();
        const pdf = await PDFDocument.load(content, { ignoreEncryption: true });
        newEntries.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          pageCount: pdf.getPageCount(),
          size: file.size,
        });
      } catch {
        setError(`Could not load "${file.name}" — it may be corrupted or password-protected.`);
      }
    }

    if (newEntries.length > 0) {
      setEntries((prev) => [...prev, ...newEntries]);
    }
  }, []);

  const moveEntry = useCallback((index: number, direction: -1 | 1) => {
    setEntries((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setMergedUrl(null);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    setMergedUrl(null);
  }, []);

  const merge = useCallback(async () => {
    if (entries.length < 2) return;
    setMerging(true);
    setError(null);
    setMergedUrl(null);

    try {
      const merged = await PDFDocument.create();

      for (const entry of entries) {
        const buf = await entry.file.arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const indices = src.getPageIndices();
        const pages = await merged.copyPages(src, indices);
        for (const page of pages) {
          merged.addPage(page);
        }
      }

      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setMergedUrl(url);

      // Auto-download
      const a = document.createElement("a");
      a.href = url;
      a.download = "merged.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setError("Failed to merge PDFs. One or more files may be corrupted.");
    } finally {
      setMerging(false);
    }
  }, [entries]);

  const shortcuts = useMemo(
    () => [
      { key: "Enter", meta: true, action: merge, label: "Merge" },
    ],
    [merge],
  );
  useKeyboardShortcuts(shortcuts);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--kami-text)" }}
        >
          Merge PDF
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
          Combine multiple PDF files into one. 100% client-side — your PDFs never leave your
          browser.
        </p>
      </div>

      {/* Drop zone */}
      <div className="mb-6">
        <FileDropZone
          accept={[".pdf"]}
          onFiles={addFiles}
          label="Drop PDF files here or click to browse"
          multiple
          icon={<>📄</>}
          hint=".pdf only"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* File list */}
      {entries.length > 0 && (
        <div className="mb-6 space-y-2">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className="flex items-center gap-3 rounded-xl border px-4 py-3"
              style={{
                background: "var(--kami-surface)",
                borderColor: "var(--kami-border)",
              }}
            >
              <span className="text-lg opacity-40">📄</span>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--kami-text)" }}
                >
                  {entry.name}
                </p>
                <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {entry.pageCount} {entry.pageCount === 1 ? "page" : "pages"} · {formatBytes(entry.size)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveEntry(i, -1)}
                  disabled={i === 0}
                  className="rounded p-1 text-sm transition-colors hover:bg-gray-100 disabled:opacity-25 dark:hover:bg-white/5"
                  style={{ color: "var(--kami-text-muted)" }}
                  title="Move up"
                >
                  ↑
                </button>
                <button
                  onClick={() => moveEntry(i, 1)}
                  disabled={i === entries.length - 1}
                  className="rounded p-1 text-sm transition-colors hover:bg-gray-100 disabled:opacity-25 dark:hover:bg-white/5"
                  style={{ color: "var(--kami-text-muted)" }}
                  title="Move down"
                >
                  ↓
                </button>
                <button
                  onClick={() => removeEntry(entry.id)}
                  className="ml-1 rounded p-1 text-sm transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                  style={{ color: "var(--kami-text-muted)" }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          {/* Summary */}
          <div
            className="flex items-center justify-between rounded-lg px-4 py-2 text-xs"
            style={{ color: "var(--kami-text-muted)", background: "var(--kami-input-bg)" }}
          >
            <span>
              {entries.length} {entries.length === 1 ? "file" : "files"} · {totalPages}{" "}
              {totalPages === 1 ? "page" : "pages"} · {formatBytes(totalSize)}
            </span>
            <button
              onClick={() => {
                setEntries([]);
                setMergedUrl(null);
              }}
              className="text-xs underline transition-opacity hover:opacity-70"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !error && (
        <div
          className="mb-6 rounded-xl border px-6 py-8 text-center text-sm"
          style={{
            background: "var(--kami-surface)",
            borderColor: "var(--kami-border)",
            color: "var(--kami-text-muted)",
          }}
        >
          <p className="mb-2 font-medium">No files added yet</p>
          <p className="opacity-70">
            Drop multiple PDFs above or click to browse. Reorder them, then merge into a single
            file.
          </p>
        </div>
      )}

      {/* Actions */}
      {entries.length >= 2 && (
        <div className="flex items-center gap-3">
          <button
            onClick={merge}
            disabled={merging}
            className="rounded-lg px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ background: "#f43f5e" }}
          >
            {merging
              ? "Merging..."
              : `Merge ${entries.length} files (${totalPages} pages)`}
          </button>

          {mergedUrl && (
            <a
              href={mergedUrl}
              download="merged.pdf"
              className="rounded-lg border px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
              style={{
                borderColor: "var(--kami-border)",
                color: "var(--kami-text)",
              }}
            >
              Download merged.pdf
            </a>
          )}
        </div>
      )}

      {entries.length === 1 && (
        <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
          Add at least one more PDF to merge.
        </p>
      )}
    </div>
  );
}
