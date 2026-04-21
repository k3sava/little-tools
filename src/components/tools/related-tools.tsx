"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppCard } from "@/components/app-card";
import { allTools, getRelatedTools, getPrimaryCollection } from "@/data/tools";

interface RelatedToolsProps {
  currentHref: string;
  count?: number;
}

export function RelatedTools({ currentHref, count = 4 }: RelatedToolsProps) {
  const related = useMemo(() => {
    return getRelatedTools(currentHref, count);
  }, [currentHref, count]);

  if (related.length === 0) return null;

  const currentTool = allTools.find((t) => t.href === currentHref);
  const collection = currentTool ? getPrimaryCollection(currentTool) : null;

  return (
    <div
      className="mt-12 pt-8"
      style={{ borderTop: "1px solid var(--kami-border-strong)" }}
    >
      <h3
        className="mb-4 text-sm font-medium"
        style={{ color: "var(--kami-text-dim)" }}
      >
        Related tools
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {related.map((tool) => (
          <AppCard
            key={tool.href}
            title={tool.name}
            description={tool.description}
            href={tool.href}
            badge={tool.icon}
            minHeight={128}
          />
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link
          href={collection?.href ?? "/tools"}
          className="text-sm transition-colors"
          style={{ color: "var(--kami-text-muted)" }}
        >
          View all {collection?.title.toLowerCase() ?? "tools"} →
        </Link>
      </div>
    </div>
  );
}
