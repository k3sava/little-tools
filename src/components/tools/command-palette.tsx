"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { allTools, getPrimaryCollection, type Tool } from "@/data/tools";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleCustom = () => setOpen(true);

    window.addEventListener("keydown", handleKey);
    window.addEventListener("open-command-palette", handleCustom);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("open-command-palette", handleCustom);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return allTools;

    return allTools
      .map((tool) => {
        let score = 0;
        const name = tool.name.toLowerCase();
        if (name === q) score = 100;
        else if (name.startsWith(q)) score = 80;
        else if (name.includes(q)) score = 60;
        else if (tool.description.toLowerCase().includes(q)) score = 40;
        else if (tool.keywords?.some((k) => k.includes(q))) score = 30;
        else score = 0;
        return { tool, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.tool);
  }, [query]);

  const navigate = useCallback(
    (tool: Tool) => {
      setOpen(false);
      router.push(tool.href);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        navigate(results[selectedIndex]);
      }
    },
    [results, selectedIndex, navigate]
  );

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[selectedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* palette */}
      <div
        className="command-palette relative w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "cmdPaletteIn 0.15s ease-out" }}
      >
        {/* search input */}
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-40">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search tools..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:opacity-40"
          />
          <kbd className="hidden sm:inline rounded border px-1.5 py-0.5 text-[10px] font-mono opacity-30">
            ESC
          </kbd>
        </div>

        {/* results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <div className="px-3 py-8 text-center text-sm opacity-40">
              No tools found
            </div>
          )}
          {results.map((tool, i) => {
            const collection = getPrimaryCollection(tool);
            return (
              <button
                key={tool.href}
                onClick={() => navigate(tool)}
                onMouseEnter={() => setSelectedIndex(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  i === selectedIndex ? "command-palette-selected" : ""
                }`}
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold"
                  style={{
                    backgroundColor: collection.accentHex + "18",
                    color: collection.accentHex,
                  }}
                >
                  {tool.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{tool.name}</div>
                  <div className="text-xs opacity-50 truncate">
                    {collection.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* footer hint */}
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[11px] opacity-30">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
