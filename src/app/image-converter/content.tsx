"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Slider, Toggle, NumberStepper } from "@/components/tools/controls";

type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

interface QueuedFile {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  previewUrl: string;
  status: "pending" | "converting" | "done" | "error";
  convertedBlob: Blob | null;
  convertedUrl: string;
  convertedSize: number;
  error: string;
}

const ACCENT = "#f43f5e";

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLabel(mime: OutputFormat): string {
  switch (mime) {
    case "image/png":
      return "PNG";
    case "image/jpeg":
      return "JPG";
    case "image/webp":
      return "WebP";
  }
}

export default function ImageConverterContent() {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const [metroCPivot, setMetroCPivot] = useState<string>("input");

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  const isMetro = currentTheme === "metro";
  const isGlass    = currentTheme === "glass";

  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(85);
  const [resizeWidth, setResizeWidth] = useState(0);
  const [resizeHeight, setResizeHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [stripMeta, setStripMeta] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  const aspectRatioRef = useRef<number | null>(null);
  const suppressRef = useRef(false);

  const supportsQuality = outputFormat !== "image/png";

  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const imageFiles = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) return;

    const newQueued: QueuedFile[] = imageFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      originalSize: file.size,
      previewUrl: URL.createObjectURL(file),
      status: "pending" as const,
      convertedBlob: null,
      convertedUrl: "",
      convertedSize: 0,
      error: "",
    }));

    setFiles((prev) => [...prev, ...newQueued]);

    if (imageFiles.length > 0) {
      const img = new Image();
      img.onload = () => {
        aspectRatioRef.current = img.naturalWidth / img.naturalHeight;
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(imageFiles[0]);
    }
  }, []);

  const handleFileDrop = useCallback(
    (files: File[]) => {
      if (files.length > 0) addFiles(files);
    },
    [addFiles]
  );

  const handleWidthChange = (val: number) => {
    setResizeWidth(val);
    if (lockAspect && aspectRatioRef.current && val && !suppressRef.current) {
      suppressRef.current = true;
      setResizeHeight(Math.round(val / aspectRatioRef.current));
      requestAnimationFrame(() => {
        suppressRef.current = false;
      });
    }
  };

  const handleHeightChange = (val: number) => {
    setResizeHeight(val);
    if (lockAspect && aspectRatioRef.current && val && !suppressRef.current) {
      suppressRef.current = true;
      setResizeWidth(Math.round(val * aspectRatioRef.current));
      requestAnimationFrame(() => {
        suppressRef.current = false;
      });
    }
  };

  const convertSingle = useCallback(
    (queued: QueuedFile): Promise<QueuedFile> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          let targetW = img.naturalWidth;
          let targetH = img.naturalHeight;

          const rw = resizeWidth;
          const rh = resizeHeight;

          if (rw > 0 && rh > 0) {
            targetW = rw;
            targetH = rh;
          } else if (rw > 0) {
            const ratio = img.naturalHeight / img.naturalWidth;
            targetW = rw;
            targetH = Math.round(rw * ratio);
          } else if (rh > 0) {
            const ratio = img.naturalWidth / img.naturalHeight;
            targetH = rh;
            targetW = Math.round(rh * ratio);
          }

          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve({ ...queued, status: "error", error: "Canvas context unavailable" });
            return;
          }

          if (outputFormat === "image/jpeg") {
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, targetW, targetH);
          }

          ctx.drawImage(img, 0, 0, targetW, targetH);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                resolve({ ...queued, status: "error", error: "Conversion failed" });
                return;
              }
              const convertedUrl = URL.createObjectURL(blob);
              resolve({
                ...queued,
                status: "done",
                convertedBlob: blob,
                convertedUrl,
                convertedSize: blob.size,
                error: "",
              });
            },
            outputFormat,
            supportsQuality ? quality / 100 : undefined
          );
        };

        img.onerror = () => {
          resolve({ ...queued, status: "error", error: "Failed to load image" });
        };

        img.src = queued.previewUrl;
      });
    },
    [outputFormat, quality, resizeWidth, resizeHeight, supportsQuality]
  );

  const convertAll = useCallback(async () => {
    if (files.length === 0) return;
    setIsConverting(true);

    setFiles((prev) =>
      prev.map((f) => (f.status !== "done" ? { ...f, status: "pending" as const, error: "" } : f))
    );

    for (let i = 0; i < files.length; i++) {
      const current = files[i];
      if (current.status === "done") continue;

      setFiles((prev) =>
        prev.map((f) => (f.id === current.id ? { ...f, status: "converting" as const } : f))
      );

      const result = await convertSingle(current);
      setFiles((prev) => prev.map((f) => (f.id === result.id ? result : f)));
    }

    setIsConverting(false);
  }, [files, convertSingle]);

  const downloadFile = (queued: QueuedFile) => {
    if (!queued.convertedUrl) return;
    const ext = outputFormat.split("/")[1] === "jpeg" ? "jpg" : outputFormat.split("/")[1];
    const baseName = queued.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = queued.convertedUrl;
    a.download = `${baseName}.${ext}`;
    a.click();
  };

  const downloadAll = () => {
    files
      .filter((f) => f.status === "done")
      .forEach((f, i) => {
        setTimeout(() => downloadFile(f), i * 200);
      });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
        if (target.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
    setSelectedIndex((prev) => Math.min(prev, Math.max(0, files.length - 2)));
  };

  const clearAll = () => {
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
    });
    setFiles([]);
    setSelectedIndex(0);
    aspectRatioRef.current = null;
    setResizeWidth(0);
    setResizeHeight(0);
  };

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => convertAll(), label: "Convert" }],
      [convertAll]
    )
  );

  // stripMeta is currently a UI/logic toggle (metadata isn't preserved by canvas anyway —
  // canvas reencode already strips EXIF); we keep the toggle so the user sees the choice.
  void stripMeta;

  const selected = files[selectedIndex] ?? null;
  const doneCount = files.filter((f) => f.status === "done").length;

  const actions = (
    <>
      {files.length > 0 && (
        <ToolActionButton variant="ghost" onClick={clearAll}>
          Clear
        </ToolActionButton>
      )}
      {doneCount > 0 && (
        <ToolActionButton variant="outline" onClick={downloadAll}>
          Download all
        </ToolActionButton>
      )}
      <ToolActionButton
        variant="solid"
        onClick={convertAll}
        disabled={isConverting || files.length === 0}
      >
        {isConverting ? "Converting..." : `Convert ${files.length || ""}`.trim()}
      </ToolActionButton>
    </>
  );

  const controls = (
    <>
      <ControlGroup label="Format">
        <Segment<OutputFormat>
          value={outputFormat}
          onChange={setOutputFormat}
          options={[
            { value: "image/png", label: "PNG" },
            { value: "image/jpeg", label: "JPG" },
            { value: "image/webp", label: "WebP" },
          ]}
          full
        />
      </ControlGroup>

      <ControlGroup label={supportsQuality ? "Quality" : "Quality (PNG: lossless)"}>
        <Slider
          value={quality}
          onChange={setQuality}
          min={10}
          max={100}
          unit="%"
        />
      </ControlGroup>

      <ControlGroup label="Resize" hint={lockAspect ? "Aspect locked" : "Free"}>
        <div className="flex items-end gap-2">
          <div style={{ flex: 1 }}>
            <NumberStepper
              value={resizeWidth}
              onChange={handleWidthChange}
              min={0}
              step={10}
              label="W"
              unit="px"
            />
          </div>
          <span className="pb-2 text-xs" style={{ color: "var(--kami-text-muted)" }}>
            ×
          </span>
          <div style={{ flex: 1 }}>
            <NumberStepper
              value={resizeHeight}
              onChange={handleHeightChange}
              min={0}
              step={10}
              label="H"
              unit="px"
            />
          </div>
        </div>
        <Toggle
          checked={lockAspect}
          onChange={setLockAspect}
          label="Lock aspect ratio"
        />
      </ControlGroup>

      <ControlGroup>
        <Toggle
          checked={stripMeta}
          onChange={setStripMeta}
          label="Strip metadata"
          hint="EXIF, location, camera info."
        />
      </ControlGroup>

      {files.length > 0 && (
        <ControlGroup label="Queue" hint={`${doneCount}/${files.length} done`}>
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto">
            {files.map((f, i) => (
              <button
                key={f.id}
                onClick={() => setSelectedIndex(i)}
                className="flex items-center justify-between rounded-md px-2 py-2 text-left text-xs"
                style={{
                  background:
                    i === selectedIndex ? "var(--kami-surface)" : "transparent",
                  color: "var(--kami-text)",
                  border: "1px solid transparent",
                }}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden>
                    {f.status === "pending" && "⏳"}
                    {f.status === "converting" && "⚙️"}
                    {f.status === "done" && "✓"}
                    {f.status === "error" && "✕"}
                  </span>
                  <span className="truncate">{f.name}</span>
                </span>
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(f.id);
                  }}
                  role="button"
                  className="ml-2 cursor-pointer"
                  style={{ color: "var(--kami-text-muted)" }}
                >
                  ✕
                </span>
              </button>
            ))}
          </div>
        </ControlGroup>
      )}
    </>
  );

  return (
    <ToolShell
      title="Image Converter"
      tagline="Convert and batch-optimize images - PNG, JPG, WebP."
      accent={ACCENT}
      materialFab={{ label: "Download", onClick: downloadAll }}
      actions={actions}
      controls={controls}
      controlsLabel="Settings"
    >
      {isMetro && (
        <nav className="metro-pivot" role="tablist" aria-label="View" style={{ borderBottom: "1px solid var(--kami-border)", padding: "0 16px" }}>
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Upload</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Convert</button>
        </nav>
      )}
      <div className="flex flex-col gap-4">
        {(!isMetro || metroCPivot === "input") && (
          <div className={isGlass ? "glass-canvas-section" : ""}>
            <FileDropZone
              accept={[".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"]}
              onFiles={handleFileDrop}
              label="Drop images here or click to browse"
              hint="PNG, JPG, WebP, GIF, BMP, SVG"
              multiple={true}
            />
          </div>
        )}

        {(!isMetro || metroCPivot === "output") && selected && (
          <div className={isGlass ? "glass-canvas-section" : ""}><div
            className="rounded-xl border p-4"
            style={{
              background: "var(--kami-surface-solid)",
              borderColor: "var(--kami-border-strong)",
            }}
          >
            <p className="mb-3 text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
              {selected.name}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  Original ({formatSize(selected.originalSize)})
                </p>
                <div
                  className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg"
                  style={{ border: "1px solid var(--kami-border)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selected.previewUrl}
                    alt="Original"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                  {selected.status === "done"
                    ? `${formatLabel(outputFormat)} (${formatSize(selected.convertedSize)})`
                    : formatLabel(outputFormat)}
                </p>
                <div
                  className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg"
                  style={{ border: "1px solid var(--kami-border)" }}
                >
                  {selected.status === "done" && selected.convertedUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={selected.convertedUrl}
                      alt="Converted"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : selected.status === "converting" ? (
                    <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                      Converting...
                    </p>
                  ) : selected.status === "error" ? (
                    <p className="text-xs" style={{ color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))" }}>
                      {selected.error}
                    </p>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
                      Click Convert
                    </p>
                  )}
                </div>
              </div>
            </div>
            {selected.status === "done" && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => downloadFile(selected)}
                  className="tool-action-btn"
                  data-variant="outline"
                >
                  Download {formatLabel(outputFormat)}
                </button>
              </div>
            )}
          </div></div>
        )}
      </div>
    </ToolShell>
  );
}
