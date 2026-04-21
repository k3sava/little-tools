"use client";

import { useCallback, useRef, useState } from "react";

type ReadAs = "text" | "arrayBuffer" | "dataURL";

interface FileDropResult {
  file: File;
  content: string | ArrayBuffer;
}

interface UseFileDropZoneOptions {
  accept?: string[];
  onDrop: (files: FileDropResult[]) => void;
  readAs?: ReadAs;
}

/**
 * Adds drag-and-drop file support to any element.
 *
 * Usage:
 *   const { isDragging, ref } = useFileDropZone({
 *     accept: [".json", ".txt"],
 *     onDrop: (files) => handleFiles(files),
 *     readAs: "text",
 *   });
 *   <div ref={ref} className={isDragging ? "ring-2" : ""}>Drop here</div>
 */
export function useFileDropZone<T extends HTMLElement = HTMLDivElement>({
  accept,
  onDrop,
  readAs = "text",
}: UseFileDropZoneOptions) {
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  const matchesExtension = useCallback(
    (file: File) => {
      if (!accept || accept.length === 0) return true;
      const name = file.name.toLowerCase();
      return accept.some((ext) => name.endsWith(ext.toLowerCase()));
    },
    [accept],
  );

  const readFile = useCallback(
    (file: File): Promise<FileDropResult> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve({ file, content: reader.result as string | ArrayBuffer });
        };
        reader.onerror = () => reject(reader.error);

        switch (readAs) {
          case "arrayBuffer":
            reader.readAsArrayBuffer(file);
            break;
          case "dataURL":
            reader.readAsDataURL(file);
            break;
          default:
            reader.readAsText(file);
        }
      });
    },
    [readAs],
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer?.files ?? []);
      const accepted = files.filter(matchesExtension);
      if (accepted.length === 0) return;

      const results = await Promise.all(accepted.map(readFile));
      onDrop(results);
    },
    [matchesExtension, readFile, onDrop],
  );

  // Attach/detach listeners via ref callback
  const prevEl = useRef<T | null>(null);

  const setRef = useCallback(
    (el: T | null) => {
      // Detach from previous element
      if (prevEl.current) {
        prevEl.current.removeEventListener("dragenter", handleDragEnter as EventListener);
        prevEl.current.removeEventListener("dragleave", handleDragLeave as EventListener);
        prevEl.current.removeEventListener("dragover", handleDragOver as EventListener);
        prevEl.current.removeEventListener("drop", handleDrop as unknown as EventListener);
      }

      // Attach to new element
      if (el) {
        el.addEventListener("dragenter", handleDragEnter as EventListener);
        el.addEventListener("dragleave", handleDragLeave as EventListener);
        el.addEventListener("dragover", handleDragOver as EventListener);
        el.addEventListener("drop", handleDrop as unknown as EventListener);
      }

      prevEl.current = el;
      (ref as React.MutableRefObject<T | null>).current = el;
    },
    [handleDragEnter, handleDragLeave, handleDragOver, handleDrop],
  );

  return { isDragging, ref: setRef };
}
