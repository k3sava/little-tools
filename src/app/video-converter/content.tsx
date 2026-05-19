"use client";

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { FileDropZone } from "@/components/tools/file-drop-zone";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Slider, Toggle } from "@/components/tools/controls";

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

const ACCENT = "#f43f5e";

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

async function convertWithCanvas(
  file: File,
  outputFormat: OutputFormat,
  options: { bitrate: number; fps: number; muteAudio: boolean; resolutionScale: number },
  onProgress: (p: number) => void
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = options.muteAudio;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(2, Math.floor(video.videoWidth * options.resolutionScale));
      canvas.height = Math.max(2, Math.floor(video.videoHeight * options.resolutionScale));
      const ctx = canvas.getContext("2d")!;

      const mimeType = outputFormat === "mp4" ? "video/mp4" : "video/webm";
      const fallbackMime = "video/webm";

      const recordMime = MediaRecorder.isTypeSupported(mimeType)
        ? mimeType
        : MediaRecorder.isTypeSupported(fallbackMime)
        ? fallbackMime
        : "video/webm";

      const stream = canvas.captureStream(options.fps);
      const recorder = new MediaRecorder(stream, {
        mimeType: recordMime,
        videoBitsPerSecond: options.bitrate,
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

      recorder.start(100);

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

export default function VideoConverterContent() {

  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  const [files, setFiles] = useState<QueuedVideo[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("mp4");
  const [bitrate, setBitrate] = useState(5); // Mbps
  const [fps, setFps] = useState(30);
  const [resolutionScale, setResolutionScale] = useState(100); // %
  const [muteAudio, setMuteAudio] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const abortRef = useRef(false);

  const [hasWebCodecs, setHasWebCodecs] = useState(false);
  useEffect(() => {
    setHasWebCodecs(typeof VideoDecoder !== "undefined" && typeof VideoEncoder !== "undefined");
  }, []);

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
    const videoFiles = incoming.filter(
      (f) => f.type.startsWith("video/") || /\.(webm|mp4|mov|avi|mkv|m4v|ogv)$/i.test(f.name)
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
          {
            bitrate: bitrate * 1_000_000,
            fps,
            muteAudio,
            resolutionScale: resolutionScale / 100,
          },
          (progress) => {
            setFiles((prev) => prev.map((f) => (f.id === queued.id ? { ...f, progress } : f)));
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
    [outputFormat, bitrate, fps, muteAudio, resolutionScale]
  );

  const convertAll = useCallback(async () => {
    if (files.length === 0) return;
    setIsConverting(true);
    abortRef.current = false;

    setFiles((prev) =>
      prev.map((f) =>
        f.status !== "done" ? { ...f, status: "pending" as const, error: "", progress: 0 } : f
      )
    );

    for (let i = 0; i < files.length; i++) {
      if (abortRef.current) break;
      const current = files[i];
      if (current.status === "done") continue;

      setFiles((prev) =>
        prev.map((f) => (f.id === current.id ? { ...f, status: "converting" as const, progress: 0 } : f))
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
      () => [{ key: "Enter", meta: true, action: () => convertAll(), label: "Convert" }],
      [convertAll]
    )
  );

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
            { value: "mp4", label: "MP4" },
            { value: "webm", label: "WebM" },
          ]}
          full
        />
      </ControlGroup>

      <ControlGroup label="Bitrate">
        <Slider value={bitrate} onChange={setBitrate} min={1} max={20} step={1} unit=" Mbps" />
      </ControlGroup>

      <ControlGroup label="Resolution scale">
        <Slider value={resolutionScale} onChange={setResolutionScale} min={25} max={100} step={5} unit="%" />
      </ControlGroup>

      <ControlGroup label="Frame rate">
        <Slider value={fps} onChange={setFps} min={15} max={60} step={1} unit=" fps" />
      </ControlGroup>

      <ControlGroup>
        <Toggle checked={muteAudio} onChange={setMuteAudio} label="Mute audio" hint="Smaller output" />
      </ControlGroup>

      {!hasWebCodecs && (
        <ControlGroup>
          <p className="text-xs kami-text-muted">
            Canvas-based conversion. Use Chrome 94+ for hardware acceleration.
          </p>
        </ControlGroup>
      )}
    </>
  );

  return (
    <ToolShell
      title="Video Converter"
      tagline="Convert MP4 ↔ WebM in your browser - private, no upload."
      accent={ACCENT}
      actions={actions}
      controls={controls}
      controlsLabel="Settings"
    >
      <div className="flex flex-col gap-4">
        <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Upload</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>

        <div className="canvas-section glass-canvas-section" data-panel="input">
            <FileDropZone
              accept={[".webm", ".mp4", ".mov", ".avi", ".mkv", ".m4v", ".ogv"]}
              onFiles={handleFileDrop}
              label="Drop video files here or click to browse"
              hint="WebM, MP4, MOV, AVI, MKV"
              multiple={true}
            />

            {files.length > 0 && (
              <div className="flex flex-col gap-2 mt-4">
                {files.map((f, i) => (
                  <div
                    key={f.id}
                    onClick={() => setSelectedIndex(i)}
                    className="relative cursor-pointer overflow-hidden rounded-lg border px-3 py-2.5"
                    style={{
                      background:
                        i === selectedIndex ? "var(--kami-surface)" : "var(--kami-surface-solid)",
                      borderColor: i === selectedIndex ? ACCENT : "var(--kami-border-strong)",
                    }}
                  >
                    {f.status === "converting" && (
                      <div
                        className="absolute inset-0 transition-all duration-300"
                        style={{
                          width: `${f.progress}%`,
                          background: `color-mix(in srgb, ${ACCENT} 14%, transparent)`,
                        }}
                      />
                    )}
                    <div className="relative flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span aria-hidden className="text-xs">
                          {f.status === "pending" && "⏳"}
                          {f.status === "converting" && "⚙️"}
                          {f.status === "done" && "✓"}
                          {f.status === "error" && "✕"}
                        </span>
                        <span className="truncate text-sm font-medium">{f.name}</span>
                        <span className="text-xs kami-text-muted">
                          {formatSize(f.originalSize)}
                          {f.duration > 0 && ` · ${formatDuration(f.duration)}`}
                          {f.width > 0 && ` · ${f.width}×${f.height}`}
                        </span>
                        {f.status === "converting" && (
                          <span className="text-xs font-medium" style={{ color: ACCENT }}>
                            {f.progress}%
                          </span>
                        )}
                        {f.status === "done" && (
                          <span className="text-xs kami-text-muted">
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
                            className="tool-action-btn"
                            data-variant="outline"
                          >
                            Save
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(f.id);
                          }}
                          className="tool-shell-icon-btn"
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {f.status === "error" && (
                      <p
                        className="relative mt-1 text-xs"
                        style={{ color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))" }}
                      >
                        {f.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        <div className="canvas-section glass-canvas-section" data-panel="output">
            {selected && (
              <div
                className="rounded-xl border p-4"
                style={{
                  background: "var(--kami-surface-solid)",
                  borderColor: "var(--kami-border-strong)",
                }}
              >
                <p className="mb-3 text-sm font-medium kami-text-muted">
                  {selected.name}
                </p>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs kami-text-muted">
                      Original ({formatSize(selected.originalSize)})
                    </p>
                    <div
                      className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg"
                      style={{ background: "var(--kami-surface)", border: "1px solid var(--kami-border)" }}
                    >
                      <video
                        src={selected.previewUrl}
                        controls
                        className="max-h-full max-w-full"
                        preload="metadata"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs kami-text-muted">
                      Converted
                      {selected.status === "done" ? ` (${formatSize(selected.convertedSize)})` : ""}
                    </p>
                    <div
                      className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg"
                      style={{ background: "var(--kami-surface)", border: "1px solid var(--kami-border)" }}
                    >
                      {selected.status === "done" && selected.convertedUrl ? (
                        <video
                          src={selected.convertedUrl}
                          controls
                          className="max-h-full max-w-full"
                          preload="metadata"
                        />
                      ) : selected.status === "converting" ? (
                        <div className="text-center">
                          <p className="text-sm kami-text-muted">
                            Converting... {selected.progress}%
                          </p>
                          <div
                            className="mx-auto mt-2 h-1.5 w-48 overflow-hidden rounded-full"
                            style={{ background: "var(--kami-border)" }}
                          >
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ width: `${selected.progress}%`, background: ACCENT }}
                            />
                          </div>
                        </div>
                      ) : selected.status === "error" ? (
                        <p className="text-sm" style={{ color: "color-mix(in srgb, #ef4444 70%, var(--kami-text))" }}>
                          {selected.error}
                        </p>
                      ) : (
                        <p className="text-sm kami-text-muted">
                          Click Convert
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
    </ToolShell>
  );
}
