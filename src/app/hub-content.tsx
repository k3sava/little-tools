"use client";

import { useMemo, useState } from "react";
import { AppCard } from "@/components/app-card";
import { Breadcrumb } from "@/components/breadcrumb";
import { Footer } from "@/components/footer";
import { allTools, collections, getToolsByCollection } from "@/data/tools";
import type { Collection } from "@/data/tools";

export function ToolsHubContent() {
  const [query, setQuery] = useState("");
  const [activeCollection, setActiveCollection] = useState<Collection | null>(null);

  const filtered = useMemo(() => {
    let tools = activeCollection
      ? getToolsByCollection(activeCollection)
      : allTools;

    const q = query.trim().toLowerCase();
    if (q) {
      tools = tools.filter((tool) =>
        [tool.name, tool.description, ...(tool.keywords ?? [])]
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }

    return tools;
  }, [query, activeCollection]);

  return (
    <div className="kami-scope min-h-screen" style={{ color: "var(--kami-text)" }}>
      <Breadcrumb
        items={[
          { label: "home", href: "https://iamkesava.com" },
          { label: "apps", href: "https://apps.iamkesava.com" },
          { label: "tools" },
        ]}
      />

      <div className="mx-auto w-[92%] max-w-[1600px] py-12 sm:py-16">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl" style={{ color: "var(--kami-text)" }}>
            Tools
          </h1>
          <p className="mt-3" style={{ color: "var(--kami-text-muted)" }}>
            {allTools.length} ad-free, privacy-first utilities. All processing happens in your browser.
          </p>
        </div>

        {/* Search */}
        <div
          className="mb-6 p-4 sm:p-5"
          style={{
            background: "var(--kami-surface-solid)",
            border: "var(--kami-card-border)",
            borderRadius: "var(--kami-card-radius)",
            boxShadow: "var(--kami-card-shadow)",
          }}
        >
          <label htmlFor="tools-search" className="mb-2 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
            Find a tool
          </label>
          <input
            id="tools-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or task (e.g. color, hash, markdown, utm)"
            className="w-full px-4 py-3 text-sm focus:outline-none"
            style={{
              color: "var(--kami-text)",
              background: "var(--kami-input-bg)",
              border: "var(--kami-input-border)",
              borderRadius: "var(--kami-input-radius)",
              caretColor: "var(--kami-caret)",
            }}
          />
        </div>

        {/* Collection filters */}
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCollection(null)}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
            style={{
              background: activeCollection === null ? "var(--kami-text)" : "var(--kami-surface-solid)",
              color: activeCollection === null ? "var(--kami-surface-solid)" : "var(--kami-text-muted)",
              border: `1px solid ${activeCollection === null ? "var(--kami-text)" : "var(--kami-border-strong)"}`,
            }}
          >
            All {allTools.length}
          </button>
          {collections.map((c) => {
            const count = getToolsByCollection(c.id).length;
            const isActive = activeCollection === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setActiveCollection(isActive ? null : c.id)}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-all"
                style={{
                  background: isActive ? c.accentHex : "var(--kami-surface-solid)",
                  color: isActive ? "#fff" : "var(--kami-text-muted)",
                  border: `1px solid ${isActive ? c.accentHex : "var(--kami-border-strong)"}`,
                }}
              >
                {c.title} {count}
              </button>
            );
          })}
        </div>

        {/* Results */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold" style={{ color: "var(--kami-text)" }}>
            {activeCollection ? collections.find((c) => c.id === activeCollection)?.title : "All tools"}
          </h2>
          <p className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
            {filtered.length} tool{filtered.length === 1 ? "" : "s"}
          </p>
        </div>

        {filtered.length === 0 ? (
          <div
            className="px-5 py-8 text-sm"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px dashed var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius)",
              color: "var(--kami-text-muted)",
            }}
          >
            No tools match your search.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {filtered.map((tool) => (
              <AppCard
                key={tool.href}
                title={tool.name}
                description={tool.description}
                href={tool.href}
                badge={tool.icon}
              />
            ))}
          </div>
        )}

        <Footer />
      </div>
    </div>
  );
}
