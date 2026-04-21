"use client";

import { useCallback, useEffect, useState } from "react";

interface Toast {
  id: number;
  message: string;
}

let toastId = 0;

// Global event emitter for copy toasts
export function showCopyToast(message = "Copied to clipboard") {
  window.dispatchEvent(
    new CustomEvent("tools-copy-toast", { detail: { message } })
  );
}

export function CopyToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string) => {
    const id = ++toastId;
    setToasts((t) => [...t, { id, message }]);
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id));
    }, 2000);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      addToast(detail?.message || "Copied");
    };
    window.addEventListener("tools-copy-toast", handler);
    return () => window.removeEventListener("tools-copy-toast", handler);
  }, [addToast]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="copy-toast flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm shadow-lg"
          style={{ animation: "toastIn 0.2s ease-out" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="text-emerald-400 shrink-0"
          >
            <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M5 8l2 2 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
