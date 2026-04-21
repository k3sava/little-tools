"use client";

import { createContext, useCallback, useMemo, useRef, useState } from "react";
import type { Shortcut } from "@/hooks/use-keyboard-shortcuts";

interface ShortcutContextValue {
  shortcuts: Shortcut[];
  register: (shortcuts: Shortcut[]) => void;
  unregister: (shortcuts: Shortcut[]) => void;
}

export const ShortcutContext = createContext<ShortcutContextValue | null>(null);

export function ShortcutProvider({ children }: { children: React.ReactNode }) {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const registryRef = useRef<Set<Shortcut>>(new Set());

  const register = useCallback((items: Shortcut[]) => {
    for (const s of items) registryRef.current.add(s);
    setShortcuts(Array.from(registryRef.current));
  }, []);

  const unregister = useCallback((items: Shortcut[]) => {
    for (const s of items) registryRef.current.delete(s);
    setShortcuts(Array.from(registryRef.current));
  }, []);

  const value = useMemo(
    () => ({ shortcuts, register, unregister }),
    [shortcuts, register, unregister],
  );

  return (
    <ShortcutContext.Provider value={value}>
      {children}
    </ShortcutContext.Provider>
  );
}
