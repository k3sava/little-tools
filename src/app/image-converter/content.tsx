"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import { ToolIntro } from "@/components/tools/tool-intro";

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
  const [files, setFiles] = useState<QueuedFile[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/png");
  const [quality, setQuality] = useState(0.85);
  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  const aspectRatioRef = useRef<number | null>(null);
  const suppressRef = useRef(false);

  const supportsQuality = outputFormat !== "image/png";

  // Cleanup object URLs on unmount
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
    const imageFiles = Array.from(incoming).filter((f) =>
      f.type.startsWith("image/")
    );
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

    setFiles((prev) => {
      const updated = [...prev, ...newQueued];
      return updated;
    });

    // Load the first image to get aspect ratio for resize
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
      if (files.length > 0) {
        addFiles(files);
      }
    },
    [addFiles]
  );

  const handleWidthChange = (val: string) => {
    setResizeWidth(val);
    if (lockAspect && aspectRatioRef.current && val && !suppressRef.current) {
      suppressRef.current = true;
      setResizeHeight(
        String(Math.round(parseInt(val) / aspectRatioRef.current))
      );
      requestAnimationFrame(() => {
        suppressRef.current = false;
      });
    }
  };

  const handleHeightChange = (val: string) => {
    setResizeHeight(val);
    if (lockAspect && aspectRatioRef.current && val && !suppressRef.current) {
      suppressRef.current = true;
      setResizeWidth(
        String(Math.round(parseInt(val) * aspectRatioRef.current))
      );
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

          const rw = parseInt(resizeWidth);
          const rh = parseInt(resizeHeight);

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
            resolve({
              ...queued,
              status: "error",
              error: "Canvas context unavailable",
            });
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
                resolve({
                  ...queued,
                  status: "error",
                  error: "Conversion failed",
                });
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
            supportsQuality ? quality : undefined
          );
        };

        img.onerror = () => {
          resolve({
            ...queued,
            status: "error",
            error: "Failed to load image",
          });
        };

        img.src = queued.previewUrl;
      });
    },
    [outputFormat, quality, resizeWidth, resizeHeight, supportsQuality]
  );

  const convertAll = useCallback(async () => {
    if (files.length === 0) return;
    setIsConverting(true);

    // Mark all pending
    setFiles((prev) =>
      prev.map((f) =>
        f.status !== "done"
          ? { ...f, status: "pending" as const, error: "" }
          : f
      )
    );

    for (let i = 0; i < files.length; i++) {
      const current = files[i];
      if (current.status === "done") continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === current.id ? { ...f, status: "converting" as const } : f
        )
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
      const updated = prev.filter((f) => f.id !== id);
      return updated;
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
    setResizeWidth("");
    setResizeHeight("");
  };

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => convertAll(), label: "Convert" },
  ], [convertAll]));

  const selected = files[selectedIndex] ?? null;
  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Image Converter"
          tagline="Convert and batch-optimize images — PNG, JPG, WebP, AVIF — with resize and quality controls."
          description="Drop one or many images. Pick output format (including AVIF for the smallest modern-web sizes), optionally resize, and set quality. Runs entirely in your browser — useful for private photos, client work, or anything you don't want to upload."
          audience={["Everyone", "Designers", "Photographers"]}
          whenToUse={[
            "Converting iPhone HEIC photos for sharing",
            "Batch-optimizing hero images for a website",
            "Generating a smaller file for email or chat",
          ]}
        />

        {/* Drop Zone */}
        <FileDropZone
          accept={[".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg"]}
          onFiles={handleFileDrop}
          label="Drop images here or click to browse"
          hint="PNG, JPG, WebP, GIF, BMP, SVG supported"
          multiple={true}
        />

        {files.length > 0 && (
          <>
            {/* Settings */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-semibold text-gray-700">
                Conversion Settings
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Output Format */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Output Format
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(e) =>
                      setOutputFormat(e.target.value as OutputFormat)
                    }
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  >
                    <option value="image/png">PNG</option>
                    <option value="image/jpeg">JPG</option>
                    <option value="image/webp">WebP</option>
                  </select>
                </div>

                {/* Quality */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">
                    Quality{" "}
                    {supportsQuality ? (
                      <span className="text-gray-400">
                        ({Math.round(quality * 100)}%)
                      </span>
                    ) : (
                      <span className="text-gray-400">(N/A for PNG)</span>
                    )}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    disabled={!supportsQuality}
                    className="mt-1 w-full accent-gray-900"
                  />
                </div>
              </div>

              {/* Resize */}
              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-gray-500">
                  Resize (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Width"
                    value={resizeWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <span className="text-xs text-gray-400">×</span>
                  <input
                    type="number"
                    placeholder="Height"
                    value={resizeHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-28 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  <button
                    onClick={() => setLockAspect((prev) => !prev)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      lockAspect
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                    title={
                      lockAspect
                        ? "Aspect ratio locked"
                        : "Aspect ratio unlocked"
                    }
                  >
                    {lockAspect ? "🔒" : "🔓"}
                  </button>
                </div>
              </div>
            </div>

            {/* File Queue */}
            <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-700">
                  Files ({files.length})
                </h2>
                <div className="flex gap-2">
                  {doneCount > 0 && (
                    <button
                      onClick={downloadAll}
                      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300"
                    >
                      Download All ({doneCount})
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-60 space-y-1 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedIndex(i)}
                    className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      i === selectedIndex
                        ? "bg-gray-100"
                        : "hover:"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex-shrink-0 text-xs">
                        {f.status === "pending" && "⏳"}
                        {f.status === "converting" && "⚙️"}
                        {f.status === "done" && "✅"}
                        {f.status === "error" && "❌"}
                      </span>
                      <span className="truncate">{f.name}</span>
                      <span className="flex-shrink-0 text-xs text-gray-400">
                        {formatSize(f.originalSize)}
                        {f.status === "done" &&
                          ` → ${formatSize(f.convertedSize)}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {f.status === "done" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadFile(f);
                          }}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 hover:border-gray-300"
                        >
                          Save
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(f.id);
                        }}
                        className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Convert Button */}
              <button
                onClick={convertAll}
                disabled={isConverting || files.length === 0}
                className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isConverting
                  ? "Converting..."
                  : `Convert All to ${formatLabel(outputFormat)}`}
              </button>
            </div>

            {/* Preview */}
            {selected && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-sm font-semibold text-gray-700">
                  Preview — {selected.name}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      Original ({formatSize(selected.originalSize)})
                    </p>
                    <div className="flex items-center justify-center rounded-lg border border-gray-100  p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={selected.previewUrl}
                        alt="Original"
                        className="max-h-64 max-w-full object-contain"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-gray-500">
                      Converted
                      {selected.status === "done"
                        ? ` (${formatSize(selected.convertedSize)})`
                        : ""}
                    </p>
                    <div className="flex items-center justify-center rounded-lg border border-gray-100  p-2">
                      {selected.status === "done" && selected.convertedUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selected.convertedUrl}
                          alt="Converted"
                          className="max-h-64 max-w-full object-contain"
                        />
                      ) : selected.status === "converting" ? (
                        <p className="py-16 text-sm text-gray-400">
                          Converting...
                        </p>
                      ) : selected.status === "error" ? (
                        <p className="py-16 text-sm text-red-400">
                          {selected.error}
                        </p>
                      ) : (
                        <p className="py-16 text-sm text-gray-400">
                          Click &quot;Convert All&quot; to see result
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
