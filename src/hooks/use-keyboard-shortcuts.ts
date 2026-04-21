"use client";

import { useEffect, useContext, useRef } from "react";
import { ShortcutContext } from "@/contexts/shortcut-context";

export interface Shortcut {
  key: string;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  action: () => void;
  label?: string;
}

/**
 * Registers keyboard shortcuts on mount and cleans up on unmount.
 * Auto-registers with ShortcutContext when available (for hint bar display).
 *
 * - Cmd/Ctrl combos fire even when focused in inputs/textareas.
 * - Bare letter keys (no meta) are suppressed when typing in an input/textarea.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const ctx = useContext(ShortcutContext);
  // Keep a stable ref to shortcuts so the keydown listener always sees the latest
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  // Register labeled shortcuts with context for hint bar display (once on mount)
  const registeredRef = useRef<Shortcut[] | null>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    const c = ctxRef.current;
    if (!c) return;
    const labeled = shortcutsRef.current.filter((s) => s.label);
    if (labeled.length === 0) return;

    registeredRef.current = labeled;
    c.register(labeled);

    return () => {
      if (registeredRef.current && ctxRef.current) {
        ctxRef.current.unregister(registeredRef.current);
        registeredRef.current = null;
      }
    };
    // Mount/unmount only — ctx and shortcuts accessed via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Attach keydown listener (once on mount, reads from ref)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tagName = target.tagName;
      const isEditable = target.isContentEditable;
      const isInput = tagName === "INPUT" || tagName === "TEXTAREA" || isEditable;

      for (const shortcut of shortcutsRef.current) {
        // Check modifier match
        const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : (!e.metaKey && !e.ctrlKey);
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (e.key.toLowerCase() !== shortcut.key.toLowerCase()) continue;
        if (!metaMatch || !shiftMatch || !altMatch) continue;

        // Skip bare letter keys (no meta) when in input/textarea
        if (isInput && !shortcut.meta && !shortcut.alt) continue;

        e.preventDefault();
        shortcut.action();
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
}
