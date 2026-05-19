"use client";

import { useState, useCallback, useMemo } from "react";
import { PDFDocument, degrees } from "pdf-lib";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { formatBytes } from "@/lib/format-bytes";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

interface PdfEntry {
  id: string;
  file: File;
  name: string;
  pageCount: number;
  size: number;
  rotation: number; // 0/90/180/270 — recorded for UI; applied during merge
  range: string; // e.g. "1-3,5"
}

const ACCENT = "#f43f5e";

/** Parse a range like "1-3,5" into 0-indexed page list within bounds. */
function parsePageList(input: string, total: number): number[] {
  const trimmed = input.trim();
  if (!trimmed) {
    const all: number[] = [];
    for (let i = 0; i < total; i++) all.push(i);
    return all;
  }
  const out: number[] = [];
  const seen = new Set<number>();
  const parts = trimmed.split(",").map((p) => p.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.split("-").map((s) => s.trim());
    if (m.length === 1) {
      const n = parseInt(m[0], 10);
      if (!isNaN(n) && n >= 1 && n <= total) {
        const idx = n - 1;
        if (!seen.has(idx)) {
          out.push(idx);
          seen.add(idx);
        }
      }
    } else if (m.length === 2) {
      const lo = Math.max(1, parseInt(m[0], 10));
      const hi = Math.min(total, parseInt(m[1], 10));
      if (!isNaN(lo) && !isNaN(hi) && lo <= hi) {
        for (let i = lo; i <= hi; i++) {
          if (!seen.has(i - 1)) {
            out.push(i - 1);
            seen.add(i - 1);
          }
        }
      }
    }
  }
  return out;
}

export default function PdfMergeContent() {
  const [entries, setEntries] = useState<PdfEntry[]>([]);
  const [merging, setMerging] = useState(false);
  const [mergedUrl, setMergedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [outputName, setOutputName] = useState("merged");
  const [progress, setProgress] = useState(0);
  const [dragId, setDragId] = useState<string | null>(null);

  const totalPages = useMemo(
    () =>
      entries.reduce((s, e) => {
        const list = parsePageList(e.range, e.pageCount);
        return s + list.length;
      }, 0),
    [entries],
  );
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
          rotation: 0,
          range: "",
        });
      } catch {
        setError(`Could not load "${file.name}" - it may be corrupted or password-protected.`);
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

  const rotateEntry = useCallback((id: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, rotation: (e.rotation + 90) % 360 } : e)),
    );
    setMergedUrl(null);
  }, []);

  const setRange = useCallback((id: string, range: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, range } : e)));
    setMergedUrl(null);
  }, []);

  const onDragStart = (id: string) => setDragId(id);
  const onDragOver = (e: React.DragEvent) => e.preventDefault();
  const onDropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) {
      setDragId(null);
      return;
    }
    setEntries((prev) => {
      const from = prev.findIndex((p) => p.id === dragId);
      const to = prev.findIndex((p) => p.id === targetId);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDragId(null);
    setMergedUrl(null);
  };

  const merge = useCallback(async () => {
    if (entries.length < 2) return;
    setMerging(true);
    setError(null);
    setMergedUrl(null);
    setProgress(0);

    try {
      const merged = await PDFDocument.create();

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const buf = await entry.file.arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true });
        const indices = parsePageList(entry.range, entry.pageCount);
        const pages = await merged.copyPages(src, indices);
        for (const page of pages) {
          if (entry.rotation) {
            page.setRotation(degrees(entry.rotation));
          }
          merged.addPage(page);
        }
        setProgress(Math.round(((i + 1) / entries.length) * 100));
      }

      const pdfBytes = await merged.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setMergedUrl(url);

      const safe = (outputName.trim() || "merged").replace(/[^a-zA-Z0-9._-]+/g, "_");
      const a = document.createElement("a");
      a.href = url;
      a.download = `${safe}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      setError("Failed to merge PDFs. One or more files may be corrupted.");
    } finally {
      setMerging(false);
    }
  }, [entries, outputName]);

  const shortcuts = useMemo(
    () => [{ key: "Enter", meta: true, action: merge, label: "Merge" }],
    [merge],
  );
  useKeyboardShortcuts(shortcuts);

  const actions = (
    <>
      {entries.length > 0 && (
        <ToolActionButton
          variant="ghost"
          onClick={() => {
            setEntries([]);
            setMergedUrl(null);
          }}
        >
          Clear
        </ToolActionButton>
      )}
      <ToolActionButton
        variant="solid"
        onClick={merge}
        disabled={merging || entries.length < 2}
      >
        {merging ? `Merging ${progress}%` : `Merge ${entries.length || ""}`.trim()}
      </ToolActionButton>
    </>
  );

  const controls = (
    <>
      <ControlGroup label="Output filename">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={outputName}
            onChange={(e) => setOutputName(e.target.value)}
            placeholder="merged"
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
          <span className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
            .pdf
          </span>
        </div>
      </ControlGroup>

      <ControlGroup
        label="Files"
        hint={`${entries.length} · ${totalPages} pages · ${formatBytes(totalSize)}`}
      >
        {entries.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
            Drop PDFs in the canvas to add them.
          </p>
        ) : (
          <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
            Drag tiles in the canvas to reorder. Use ↻ to rotate. Set a range
            (e.g. <code>1-3,5</code>) to include only certain pages.
          </p>
        )}
      </ControlGroup>

      {merging && (
        <ControlGroup label="Progress" hint={`${progress}%`}>
          <div
            className="h-2 w-full overflow-hidden rounded-full"
            style={{ background: "var(--kami-surface)" }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: ACCENT }}
            />
          </div>
        </ControlGroup>
      )}

      {mergedUrl && (
        <ControlGroup label="Result">
          <a
            href={mergedUrl}
            download={`${(outputName || "merged").replace(/[^a-zA-Z0-9._-]+/g, "_")}.pdf`}
            className="tool-action-btn"
            data-variant="outline"
            style={{ justifyContent: "center" }}
          >
            Download {outputName || "merged"}.pdf
          </a>
        </ControlGroup>
      )}
    </>
  );

  return (
    <ToolShell
      title="Merge PDF"
      tagline="Combine PDFs - drag to reorder, rotate, filter pages, export."
      accent={ACCENT}
      materialFab={{ label: "Merge & Download", onClick: merge }}
      actions={actions}
      controls={controls}
      controlsLabel="Settings"
    >
      <div className="flex flex-col gap-4">
        <FileDropZone
          accept={[".pdf"]}
          onFiles={addFiles}
          label="Drop PDFs here or click to browse"
          multiple
          icon={<>📄</>}
          hint=".pdf only · drag tiles below to reorder"
        />

        {error && (
          <div
            className="rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "color-mix(in srgb, #ef4444 30%, transparent)",
              background: "color-mix(in srgb, #ef4444 10%, transparent)",
              color: "var(--kami-text)",
            }}
          >
            {error}
          </div>
        )}

        {entries.length > 0 && (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
            {entries.map((entry, i) => (
              <div
                key={entry.id}
                draggable
                onDragStart={() => onDragStart(entry.id)}
                onDragOver={onDragOver}
                onDrop={() => onDropOn(entry.id)}
                className="group relative flex flex-col gap-2 rounded-xl border p-3"
                style={{
                  background: "var(--kami-surface-solid)",
                  borderColor: dragId === entry.id ? ACCENT : "var(--kami-border-strong)",
                  boxShadow: "var(--kami-card-shadow, none)",
                  cursor: "grab",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                      style={{ background: ACCENT }}
                    >
                      {i + 1}
                    </span>
                    <span
                      className="text-[20px]"
                      style={{
                        transform: `rotate(${entry.rotation}deg)`,
                        transition: "transform 150ms",
                        display: "inline-block",
                      }}
                    >
                      📄
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => rotateEntry(entry.id)}
                      title={`Rotate (${entry.rotation}°)`}
                      className="tool-shell-icon-btn"
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      onClick={() => removeEntry(entry.id)}
                      title="Remove"
                      className="tool-shell-icon-btn"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <p
                  className="truncate text-sm font-medium"
                  style={{ color: "var(--kami-text)" }}
                  title={entry.name}
                >
                  {entry.name}
                </p>
                <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {entry.pageCount} {entry.pageCount === 1 ? "page" : "pages"} ·{" "}
                  {formatBytes(entry.size)}
                </p>

                <label
                  className="text-[10px] uppercase tracking-wide"
                  style={{ color: "var(--kami-text-muted)" }}
                >
                  Pages
                </label>
                <input
                  type="text"
                  value={entry.range}
                  onChange={(e) => setRange(entry.id, e.target.value)}
                  placeholder={`1-${entry.pageCount}`}
                  className="w-full rounded-md border px-2 py-1 text-xs"
                  style={{
                    background: "var(--kami-input-bg, var(--kami-surface-solid))",
                    borderColor: "var(--kami-border)",
                    color: "var(--kami-text)",
                  }}
                />

                <div className="flex items-center justify-between text-[10px]" style={{ color: "var(--kami-text-muted)" }}>
                  <span>
                    {parsePageList(entry.range, entry.pageCount).length} included
                  </span>
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveEntry(i, -1)}
                      disabled={i === 0}
                      className="tool-shell-icon-btn"
                      title="Move left"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => moveEntry(i, 1)}
                      disabled={i === entries.length - 1}
                      className="tool-shell-icon-btn"
                      title="Move right"
                    >
                      →
                    </button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {entries.length === 1 && (
          <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
            Add at least one more PDF to merge.
          </p>
        )}
      </div>
    </ToolShell>
  );
}
