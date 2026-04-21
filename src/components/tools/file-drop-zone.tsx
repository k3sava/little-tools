"use client";

import { useCallback, useRef } from "react";
import { useFileDropZone } from "@/hooks/use-file-drop";

interface FileDropZoneProps {
  /** File extensions to accept, e.g. [".pdf"] */
  accept: string[];
  /** Called with the selected/dropped files */
  onFiles: (files: File[]) => void;
  /** Label shown in the drop area. Defaults to "Drop files here or click to browse" */
  label?: string;
  /** Allow multiple files. Defaults to true */
  multiple?: boolean;
  /** Emoji or icon shown above the label */
  icon?: React.ReactNode;
  /** Extra hint text below the label, e.g. ".pdf only" */
  hint?: string;
}

/**
 * Reusable drag-and-drop file picker with click-to-browse fallback.
 * Wraps the useFileDropZone hook and a hidden file input.
 */
export function FileDropZone({
  accept,
  onFiles,
  label = "Drop files here or click to browse",
  multiple = true,
  icon,
  hint,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const { isDragging, ref: dropRef } = useFileDropZone<HTMLDivElement>({
    accept,
    readAs: "arrayBuffer",
    onDrop: (results) => {
      onFiles(results.map((r) => r.file));
    },
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList || fileList.length === 0) return;
      onFiles(Array.from(fileList));
      // Reset so the same files can be re-selected
      e.target.value = "";
    },
    [onFiles],
  );

  const triggerPicker = useCallback(() => {
    inputRef.current?.click();
  }, []);

  // Build the accept string for the file input (e.g. ".pdf,application/pdf")
  const inputAccept = accept.join(",");

  return (
    <>
      <div
        ref={dropRef}
        onClick={triggerPicker}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-colors ${
          isDragging
            ? "border-rose-400 bg-rose-50/10"
            : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
        }`}
        style={{ background: isDragging ? undefined : "var(--kami-input-bg)" }}
      >
        {icon && <span className="mb-2 text-3xl opacity-40">{icon}</span>}
        <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
          {label}
        </span>
        {hint && (
          <span
            className="mt-1 text-xs"
            style={{ color: "var(--kami-text-muted)", opacity: 0.6 }}
          >
            {hint}
          </span>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={inputAccept}
        className="hidden"
        onChange={handleInputChange}
      />
    </>
  );
}
