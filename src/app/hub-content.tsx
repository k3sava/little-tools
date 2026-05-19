"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/app-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { Footer } from "@/components/footer";
import { allTools, collections, getToolsByCollection } from "@/data/tools";
import type { Collection } from "@/data/tools";

const RECENT_KEY = "tools-recent";

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

// ── Search input shared across themes ────────────────────────────────────────
function HubSearch({
  value,
  onChange,
  inputRef,
  placeholder = "Search tools…",
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef: React.Ref<HTMLInputElement>;
  placeholder?: string;
}) {
  return (
    <div className="tools-hub-search">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ opacity: 0.55 }}>
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        ref={inputRef}
        id="tools-search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="tools-hub-search-input"
        aria-label="Search tools"
      />
      {value && (
        <button type="button" onClick={() => onChange("")} className="tools-hub-search-clear" aria-label="Clear search">×</button>
      )}
      <kbd className="tools-hub-search-kbd" aria-hidden="true">/</kbd>
    </div>
  );
}

export function ToolsHubContent() {
  const [query, setQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setRecent(readRecent());
  }, []);

  useEffect(() => {
    function readTheme() {
      return document.documentElement.getAttribute("data-theme") || "default";
    }
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (e.key === "/" && !inField) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = useMemo(() => {
    let tools = activeCollection ? getToolsByCollection(activeCollection) : allTools;
    const q = query.trim().toLowerCase();
    if (q) {
      tools = tools.filter((tool) =>
        [tool.name, tool.description, ...(tool.keywords ?? [])].join(" ").toLowerCase().includes(q)
      );
    }
    return tools;
  }, [query, activeCollection]);

  const recentTools = useMemo(() => {
    if (recent.length === 0 || query || activeCollection) return [];
    return recent.map((h) => allTools.find((t) => t.href === h)).filter(Boolean).slice(0, 4) as typeof allTools;
  }, [recent, query, activeCollection]);

  const isGlass    = currentTheme === "glass";
  const isMaterial = currentTheme === "material";
  const isMetro    = currentTheme === "metro";

  return (
    <div className={`kami-scope min-h-screen tools-hub theme-${currentTheme}`} style={{ color: "var(--kami-text)" }}>
      <Breadcrumb
        items={[
          { label: "home", href: "https://apps.iamkesava.com" },
          { label: "tools" },
        ]}
      />

      {/* ── Glass: full-width frosted hero with centered search ── */}
      {isGlass && (
        <div className="hub-glass-hero">
          <div className="hub-glass-hero-inner">
            <p className="hub-glass-hero-eyebrow">little tools</p>
            <h1 className="hub-glass-hero-title">{allTools.length} tools</h1>
            <p className="hub-glass-hero-sub">Ad-free · Privacy-first · Runs locally</p>
            <div className="hub-glass-hero-search">
              <HubSearch value={query} onChange={setQuery} inputRef={searchRef} placeholder="Search 60 tools…" />
            </div>
          </div>
        </div>
      )}

      {/* ── Material: top-app-bar–style heading row ── */}
      {isMaterial && (
        <div className="hub-material-appbar">
          <div className="hub-material-appbar-inner">
            <div>
              <p className="hub-material-appbar-label">little tools</p>
              <h1 className="hub-material-appbar-title">{allTools.length} tools</h1>
            </div>
            <div className="hub-material-appbar-search">
              <HubSearch value={query} onChange={setQuery} inputRef={searchRef} placeholder="Search…" />
            </div>
          </div>
        </div>
      )}

      {/* ── Metro: Pivot tabs for collection navigation ── */}
      {isMetro && (
        <div className="hub-metro-header">
          <div className="hub-metro-header-top">
            <h1 className="hub-metro-title">tools</h1>
            <div className="hub-metro-search">
              <HubSearch value={query} onChange={setQuery} inputRef={searchRef} placeholder="Search…" />
            </div>
          </div>
          <nav className="metro-pivot hub-metro-pivot" role="tablist" aria-label="Collections">
            <button
              role="tab"
              aria-selected={activeCollection === null}
              className={`metro-pivot-item${activeCollection === null ? " is-active" : ""}`}
              onClick={() => setActiveCollection(null)}
            >
              All ({allTools.length})
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={activeCollection === c.id}
                className={`metro-pivot-item${activeCollection === c.id ? " is-active" : ""}`}
                onClick={() => setActiveCollection(activeCollection === c.id ? null : c.id)}
              >
                {c.title}
              </button>
            ))}
          </nav>
        </div>
      )}

      <main
        id="main"
        className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-6 sm:px-6 sm:pt-8"
      >
        {/* Default + non-glass heading block */}
        {!isGlass && !isMaterial && !isMetro && (
          <div className="mb-5 sm:mb-7">
            <h1 className="text-2xl font-semibold leading-tight sm:text-3xl" style={{ color: "var(--kami-text)" }}>
              {allTools.length} little tools
            </h1>
            <p className="mt-1 text-sm sm:text-base" style={{ color: "var(--kami-text-muted)" }}>
              Ad-free, privacy-first browser utilities. Everything runs locally.
            </p>
          </div>
        )}

        {/* Search + chips — hidden for Glass (uses hero search) and Metro (uses pivot) */}
        {!isGlass && !isMetro && (
          <div className="tools-hub-search-wrap">
            {!isMaterial && (
              <HubSearch value={query} onChange={setQuery} inputRef={searchRef} />
            )}

            <div className="tools-hub-chips" role="tablist" aria-label="Tool collections">
              <button
                role="tab"
                aria-selected={activeCollection === null}
                onClick={() => setActiveCollection(null)}
                data-active={activeCollection === null}
                className="tools-hub-chip"
              >
                All <span className="tools-hub-chip-count">{allTools.length}</span>
              </button>
              {collections.map((c) => {
                const count = getToolsByCollection(c.id).length;
                const isActive = activeCollection === c.id;
                return (
                  <button
                    key={c.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCollection(isActive ? null : c.id)}
                    data-active={isActive}
                    className="tools-hub-chip"
                    style={
                      isActive
                        ? { background: c.accentHex, color: "#fff", borderColor: c.accentHex }
                        : undefined
                    }
                  >
                    <span aria-hidden="true" className="tools-hub-chip-dot" style={{ background: c.accentHex }} />
                    {c.title} <span className="tools-hub-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {recentTools.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>
              Recent
            </h2>
            <div className="tools-hub-grid">
              {recentTools.map((tool) => (
                <AppCard key={tool.href} title={tool.name} description={tool.description} href={tool.href} badge={tool.icon} />
              ))}
            </div>
          </section>
        )}

        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: "var(--kami-text-dim)" }}>
            {activeCollection
              ? collections.find((c) => c.id === activeCollection)?.title
              : "All tools"}
          </h2>
          <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
            {filtered.length} tool{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div
            className="px-5 py-10 text-center text-sm"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px dashed var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius)",
              color: "var(--kami-text-muted)",
            }}
          >
            No tools match &ldquo;{query}&rdquo;. Try a different word.
          </div>
        ) : (
          <div className="tools-hub-grid">
            {filtered.map((tool) => (
              <AppCard key={tool.href} title={tool.name} description={tool.description} href={tool.href} badge={tool.icon} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
