"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { Breadcrumb } from "@/components/breadcrumb";
import { Footer } from "@/components/footer";
import { RelatedTools } from "./related-tools";
import { allTools, getPrimaryCollection } from "@/data/tools";
import { usePathname } from "next/navigation";
import { ShortcutContext, ShortcutProvider } from "@/contexts/shortcut-context";

function formatKey(key: string, meta?: boolean, shift?: boolean, alt?: boolean): string {
  const parts: string[] = [];
  if (meta) parts.push("\u2318");
  if (alt) parts.push("\u2325");
  if (shift) parts.push("\u21E7");

  const keyMap: Record<string, string> = {
    enter: "\u21B5",
    return: "\u21B5",
    escape: "Esc",
    backspace: "\u232B",
    delete: "\u2326",
    tab: "\u21E5",
    arrowup: "\u2191",
    arrowdown: "\u2193",
    arrowleft: "\u2190",
    arrowright: "\u2192",
    " ": "Space",
  };

  const display = keyMap[key.toLowerCase()] ?? key.toUpperCase();
  parts.push(display);
  return parts.join("");
}

function ShortcutHintBar() {
  const ctx = useContext(ShortcutContext);
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const labeled = ctx?.shortcuts.filter((s) => s.label) ?? [];

  useEffect(() => {
    function resetTimer() {
      setVisible(true);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), 5000);
    }

    resetTimer();
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("mousemove", resetTimer);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("mousemove", resetTimer);
    };
  }, []);

  if (labeled.length === 0) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center gap-4 px-4 py-2 text-xs transition-opacity duration-300"
      style={{
        opacity: visible ? 0.7 : 0,
        pointerEvents: visible ? "auto" : "none",
        background: "var(--kami-surface-solid, rgba(0,0,0,0.8))",
        color: "var(--kami-text-muted, #999)",
        borderTop: "1px solid var(--kami-border, rgba(255,255,255,0.08))",
      }}
    >
      {labeled.map((s, i) => (
        <span key={i} className="flex items-center gap-1">
          <kbd
            className="inline-block rounded px-1.5 py-0.5 font-mono text-[10px]"
            style={{
              background: "var(--kami-input-bg, rgba(255,255,255,0.06))",
              border: "1px solid var(--kami-border, rgba(255,255,255,0.1))",
            }}
          >
            {formatKey(s.key, s.meta, s.shift, s.alt)}
          </kbd>
          <span>{s.label}</span>
        </span>
      ))}
    </div>
  );
}

function ToolPageInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const tool = allTools.find((t) => t.href === pathname);
  const collection = tool ? getPrimaryCollection(tool) : null;

  const breadcrumbItems = [
    { label: "home", href: "https://iamkesava.com" },
    { label: "apps", href: "https://apps.iamkesava.com" },
    { label: "tools", href: "/tools" },
    ...(collection ? [{ label: collection.title.toLowerCase(), href: collection.href }] : []),
    { label: tool?.name.toLowerCase() ?? "tool" },
  ];

  return (
    <div className="kami-scope min-h-screen" style={{ color: "var(--kami-text)" }}>
      <Breadcrumb items={breadcrumbItems} />
      <div>{children}</div>
      {tool && (
        <div className="mx-auto max-w-3xl px-4 pb-12">
          <RelatedTools currentHref={tool.href} />
        </div>
      )}
      <ShortcutHintBar />
      <Footer />
    </div>
  );
}

export function ToolPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutProvider>
      <ToolPageInner>{children}</ToolPageInner>
    </ShortcutProvider>
  );
}
