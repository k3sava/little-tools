"use client";

import { useCallback, useRef, useState, useEffect } from "react";

type StringRecord = Record<string, string>;

// Reads URL search params lazily via window.location so static export doesn't
// need a Suspense boundary around useSearchParams. State hydrates from defaults
// on first render; a useEffect pass overrides with URL values on mount.
export function useToolState<T extends StringRecord>(defaults: T): [T, (patch: Partial<T>) => void] {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setStateRaw] = useState<T>(defaults);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const next = { ...defaults };
    let changed = false;
    for (const key of Object.keys(defaults)) {
      const val = params.get(key);
      if (val !== null) {
        (next as StringRecord)[key] = decodeURIComponent(val);
        changed = true;
      }
    }
    if (changed) setStateRaw(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncToUrl = useCallback((nextState: T) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(nextState)) {
        if (value !== "") {
          params.set(key, encodeURIComponent(value));
        }
      }
      const qs = params.toString();
      const url = window.location.pathname + (qs ? `?${qs}` : "");
      window.history.replaceState(null, "", url);
    }, 300);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const setState = useCallback(
    (patch: Partial<T>) => {
      setStateRaw((prev) => {
        const next = { ...prev, ...patch } as T;
        syncToUrl(next);
        return next;
      });
    },
    [syncToUrl],
  );

  return [state, setState];
}
