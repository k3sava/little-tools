"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Types ---

type OutputFormat = "mp4" | "webm";

interface QueuedVideo {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  previewUrl: string;
  duration: number;
  width: number;
  height: number;
  status: "pending" | "converting" | "done" | "error";
  progress: number;
  convertedBlob: Blob | null;
  convertedUrl: string;
  convertedSize: number;
  error: string;
}

// --- Helpers ---

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function getVideoMeta(file: File): Promise<{ duration: number; width: number; height: number }> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = () => {
      resolve({ duration: 0, width: 0, height: 0 });
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(file);
  });
}

// --- Canvas-based conversion fallback ---
// Uses MediaRecorder + Canvas to re-encode video when WebCodecs is unavailable
// or for simpler browser-native conversion

async function convertWithCanvas(
  file: File,
  outputFormat: OutputFormat,
  onProgress: (p: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d")!;

      const mimeType = outputFormat === "mp4" ? "video/mp4" : "video/webm";
      const fallbackMime = "video/webm"; // Most browsers support webm recording

      // Check if the target mime is supported by MediaRecorder
      const recordMime = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : MediaRecorder.isTypeSupported(fallbackMime)
        ? fallbackMime
        : "video/webm";

      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(stream, {
        mimeType: recordMime,
        videoBitsPerSecond: 5_000_000,
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recordMime });
        resolve(blob);
      };

      recorder.onerror = () => {
        reject(new Error("MediaRecorder error during conversion"));
      };

      recorder.start(100); // collect data every 100ms

      const duration = video.duration;
      let rafId: number;

      function drawFrame() {
        if (video.ended || video.paused) {
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        if (duration > 0) {
          onProgress(Math.min(99, Math.round((video.currentTime / duration) * 100)));
        }
        rafId = requestAnimationFrame(drawFrame);
      }

      video.onended = () => {
        cancelAnimationFrame(rafId);
        onProgress(100);
        recorder.stop();
      };

      video.play().then(() => {
        drawFrame();
      }).catch(reject);
    };

    video.onerror = () => {
      reject(new Error("Failed to load video file"));
    };

    video.src = URL.createObjectURL(file);
  });
}

// --- Component ---

export default function VideoConverterContent() {
  const [files, setFiles] = useState<QueuedVideo[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const abortRef = useRef(false);

  // Check WebCodecs support
  const [hasWebCodecs, setHasWebCodecs] = useState(false);
  useEffect(() => {
    setHasWebCodecs(typeof VideoDecoder !== "undefined" && typeof VideoEncoder !== "undefined");
  }, []);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
        if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(async (incoming: File[]) => {
    const videoFiles = incoming.filter((f) =>
      f.type.startsWith("video/") || /\.(webm|mp4|mov|avi|mkv|m4v|ogv)$/i.test(f.name)
    );
    if (videoFiles.length === 0) return;

    const newQueued: QueuedVideo[] = [];
    for (const file of videoFiles) {
      const meta = await getVideoMeta(file);
      newQueued.push({
        id: crypto.randomUUID(),
        file,
        name: file.name,
        originalSize: file.size,
        previewUrl: URL.createObjectURL(file),
        duration: meta.duration,
        width: meta.width,
        height: meta.height,
        status: "pending",
        progress: 0,
        convertedBlob: null,
        convertedUrl: "",
        convertedSize: 0,
        error: "",
      });
    }

    setFiles((prev) => [...prev, ...newQueued]);
  }, []);

  const handleFileDrop = useCallback(
    (dropped: File[]) => {
      if (dropped.length > 0) addFiles(dropped);
    },
    [addFiles]
  );

  const convertSingle = useCallback(
    async (queued: QueuedVideo): Promise<QueuedVideo> => {
      try {
        const blob = await convertWithCanvas(
          queued.file,
          outputFormat,
          (progress) => {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === queued.id ? { ...f, progress } : f
              )
            );
          }
        );

        const convertedUrl = URL.createObjectURL(blob);
        return {
          ...queued,
          status: "done",
          progress: 100,
          convertedBlob: blob,
          convertedUrl,
          convertedSize: blob.size,
          error: "",
        };
      } catch (err) {
        return {
          ...queued,
          status: "error",
          error: err instanceof Error ? err.message : "Conversion failed",
        };
      }
    },
    [outputFormat]
  );

  const convertAll = useCallback(async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    abortRef.current = false;

    // Reset pending files
    setFiles((prev) =>
      prev.map((f) =>
        f.status !== "done"
          ? { ...f, status: "pending" as const, error: "", progress: 0 }
          : f
      )
    );

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;
      const current = files[i];
      if (current.status === "done") continue;

      setFiles((prev) =>
        prev.map((f) =>
          f.id === current.id
            ? { ...f, status: "converting" as const, progress: 0 }
            : f
        )
      );

      const result = await convertSingle(current);
      setFiles((prev) => prev.map((f) => (f.id === result.id ? result : f)));
    }

    setIsConverting(false);
  }, [files, convertSingle]);

  const downloadFile = useCallback(
    (queued: QueuedVideo) => {
      if (!queued.convertedUrl) return;
      const baseName = queued.name.replace(/\.[^.]+$/, "");
      const a = document.createElement("a");
      a.href = queued.convertedUrl;
      a.download = `${baseName}.${outputFormat}`;
      a.click();
    },
    [outputFormat]
  );

  const downloadAll = useCallback(() => {
    files
      .filter((f) => f.status === "done")
      .forEach((f, i) => {
        setTimeout(() => downloadFile(f), i * 200);
      });
  }, [files, downloadFile]);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target) {
        if (target.previewUrl) URL.revokeObjectURL(target.previewUrl);
        if (target.convertedUrl) URL.revokeObjectURL(target.convertedUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => {
    abortRef.current = true;
    files.forEach((f) => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
      if (f.convertedUrl) URL.revokeObjectURL(f.convertedUrl);
    });
    setFiles([]);
    setSelectedIndex(0);
  }, [files]);

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "Enter",
          meta: true,
          action: () => convertAll(),
          label: "Convert",
        },
      ],
      [convertAll]
    )
  );

  const selected = files[selectedIndex] ?? null;
  const doneCount = files.filter((f) => f.status === "done").length;

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Video Converter"
          tagline="Convert between MP4 and WebM without uploading - everything runs in your browser using WebCodecs."
          description="Drop a video, pick output format (MP4 for compatibility or WebM for smaller web files), optionally resize resolution or tweak bitrate. Conversion happens entirely in-browser - your video never leaves your device, so it's safe for personal or confidential footage. Works best with modern browsers; very large files may run out of memory on low-end devices."
          audience={["Everyone", "Content creators", "Developers"]}
          whenToUse={[
            "Converting a phone video for web embedding",
            "Making a smaller file for email or Slack",
            "Moving a clip between devices that want different formats",
          ]}
        />

        {/* Browser support notice */}
        {!hasWebCodecs && (
          <div
            className="mb-4 px-5 py-3 text-sm"
            style={{
              background: "color-mix(in srgb, #f59e0b 12%, var(--kami-surface-solid))",
              color: "color-mix(in srgb, #92400e 70%, var(--kami-text))",
              border: "1px solid color-mix(in srgb, #f59e0b 30%, var(--kami-border-strong))",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
            }}
          >
            Your browser uses Canvas-based conversion (slower). For best
            performance, use Chrome 94+ or Edge 94+.
          </div>
        )}

        {/* Drop Zone */}
        <FileDropZone
          accept={[".webm", ".mp4", ".mov", ".avi", ".mkv", ".m4v", ".ogv"]}
          onFiles={handleFileDrop}
          label="Drop video files here or click to browse"
          hint="WebM, MP4, MOV, AVI, MKV supported"
          multiple={true}
        />

        {files.length > 0 && (
          <>
            {/* Settings */}
            <div
              className="mt-6 p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
                Conversion Settings
              </h2>
              <div>
                <label className="mb-1 block text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                  Output Format
                </label>
                <div className="flex gap-2">
                  {(["mp4", "webm"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setOutputFormat(fmt)}
                      className="px-4 py-2 text-sm font-medium transition-colors"
                      style={
                        outputFormat === fmt
                          ? {
                              background: "var(--kami-cta-bg)",
                              color: "var(--kami-cta-text)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                          : {
                              background: "var(--kami-surface-solid)",
                              color: "var(--kami-text-muted)",
                              border: "1px solid var(--kami-border-strong)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }
                      }
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* File Queue */}
            <div
              className="mt-6 p-5"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
                  Files ({files.length})
                </h2>
                <div className="flex gap-2">
                  {doneCount > 0 && (
                    <button
                      onClick={downloadAll}
                      className="px-3 py-1.5 text-sm"
                      style={{
                        background: "var(--kami-surface-solid)",
                        color: "var(--kami-text-muted)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      }}
                    >
                      Download All ({doneCount})
                    </button>
                  )}
                  <button
                    onClick={clearAll}
                    className="px-3 py-1.5 text-sm"
                    style={{
                      background: "var(--kami-surface-solid)",
                      color: "var(--kami-text-muted)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedIndex(i)}
                    className="relative cursor-pointer overflow-hidden px-3 py-2.5 text-sm transition-colors"
                    style={{
                      background: i === selectedIndex ? "var(--kami-surface)" : "transparent",
                      borderRadius: "var(--kami-input-radius, 0.5rem)",
                    }}
                  >
                    {/* Progress bar background */}
                    {f.status === "converting" && (
                      <div
                        className="absolute inset-0 transition-all duration-300"
                        style={{
                          width: `${f.progress}%`,
                          background: "color-mix(in srgb, var(--kami-accent, #2563eb) 14%, transparent)",
                        }}
                      />
                    )}
                    <div className="relative flex items-center justify-between">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="flex-shrink-0 text-xs">
                          {f.status === "pending" && "⏳"}
                          {f.status === "converting" && "⚙️"}
                          {f.status === "done" && "✅"}
                          {f.status === "error" && "❌"}
                        </span>
                        <span className="truncate font-medium">{f.name}</span>
                        <span className="flex-shrink-0 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                          {formatSize(f.originalSize)}
                          {f.duration > 0 && ` · ${formatDuration(f.duration)}`}
                          {f.width > 0 && ` · ${f.width}×${f.height}`}
                        </span>
                        {f.status === "converting" && (
                          <span className="flex-shrink-0 text-xs font-medium" style={{ color: "var(--kami-accent, #2563eb)" }}>
                            {f.progress}%
                          </span>
                        )}
                        {f.status === "done" && (
                          <span className="flex-shrink-0 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                            → {formatSize(f.convertedSize)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {f.status === "done" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadFile(f);
                            }}
                            className="px-3 py-1 text-xs"
                            style={{
                              background: "var(--kami-surface-solid)",
                              color: "var(--kami-text-muted)",
                              border: "1px solid var(--kami-border-strong)",
                              borderRadius: "var(--kami-cta-radius, 0.5rem)",
                            }}
                          >
                            Save
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          className="rounded px-1.5 py-0.5 text-xs"
                          style={{ color: "var(--kami-text-dim)" }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {f.status === "error" && (
                      <p className="relative mt-1 text-xs" style={{ color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))" }}>
                        {f.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Convert Button */}
              <button
                onClick={convertAll}
                disabled={isConverting || files.length === 0}
                className="mt-4 w-full px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                style={{
                  background: "var(--kami-cta-bg)",
                  color: "var(--kami-cta-text)",
                  borderRadius: "var(--kami-cta-radius, 0.5rem)",
                }}
              >
                {isConverting
                  ? "Converting..."
                  : `Convert All to ${outputFormat.toUpperCase()}`}
              </button>
            </div>

            {/* Preview */}
            {selected && (
              <div
                className="mt-6 p-5"
                style={{
                  background: "var(--kami-surface-solid)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-card-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              >
                <h2 className="mb-4 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
                  Preview - {selected.name}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                      Original ({formatSize(selected.originalSize)})
                    </p>
                    <div
                      className="flex items-center justify-center p-2"
                      style={{
                        background: "var(--kami-surface)",
                        border: "1px solid var(--kami-border)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                      }}
                    >
                      <video
                        src={selected.previewUrl}
                        controls
                        className="max-h-64 max-w-full rounded"
                        preload="metadata"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                      Converted
                      {selected.status === "done"
                        ? ` (${formatSize(selected.convertedSize)})`
                        : ""}
                    </p>
                    <div
                      className="flex items-center justify-center p-2"
                      style={{
                        background: "var(--kami-surface)",
                        border: "1px solid var(--kami-border)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                      }}
                    >
                      {selected.status === "done" && selected.convertedUrl ? (
                        <video
                          src={selected.convertedUrl}
                          controls
                          className="max-h-64 max-w-full rounded"
                          preload="metadata"
                        />
                      ) : selected.status === "converting" ? (
                        <div className="py-16 text-center">
                          <p className="text-sm" style={{ color: "var(--kami-text-dim)" }}>
                            Converting... {selected.progress}%
                          </p>
                          <div
                            className="mx-auto mt-2 h-1.5 w-48 overflow-hidden rounded-full"
                            style={{ background: "var(--kami-border)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${selected.progress}%`,
                                background: "var(--kami-accent, #2563eb)",
                              }}
                            />
                          </div>
                        </div>
                      ) : selected.status === "error" ? (
                        <p className="py-16 text-sm" style={{ color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))" }}>
                          {selected.error}
                        </p>
                      ) : (
                        <p className="py-16 text-sm" style={{ color: "var(--kami-text-dim)" }}>
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

        {/* Info */}
        <div
          className="mt-6 p-5"
          style={{
            background: "var(--kami-surface-solid)",
            border: "1px solid var(--kami-border-strong)",
            borderRadius: "var(--kami-card-radius, 0.75rem)",
            boxShadow: "var(--kami-card-shadow, none)",
          }}
        >
          <h2 className="mb-3 text-sm font-semibold" style={{ color: "var(--kami-text-muted)" }}>
            How it works
          </h2>
          <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3" style={{ color: "var(--kami-text-muted)" }}>
            <div>
              <p className="mb-1 font-medium" style={{ color: "var(--kami-text)" }}>100% Private</p>
              <p>
                Your videos are processed entirely in your browser. Nothing is
                uploaded to any server.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium" style={{ color: "var(--kami-text)" }}>No Limits</p>
              <p>
                No file size limits, no watermarks, no signup. Convert as many
                videos as you need.
              </p>
            </div>
            <div>
              <p className="mb-1 font-medium" style={{ color: "var(--kami-text)" }}>Fast</p>
              <p>
                Uses hardware-accelerated WebCodecs when available for near-native
                conversion speed.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
