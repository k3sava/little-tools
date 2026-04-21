"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { searchArticles, type HelpArticle } from "@/data/help/articles";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HelpArticle[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (query.length >= 2) {
      setResults(searchArticles(query).slice(0, 8));
      setSelectedIndex(0);
    } else {
      setResults([]);
    }
  }, [query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  const navigateToResult = useCallback(
    (article: HelpArticle) => {
      onOpenChange(false);
      router.push(`/help/articles/${article.slug}`);
    },
    [onOpenChange, router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      navigateToResult(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onOpenChange(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-black/50"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2 rounded-xl border bg-white shadow-xl">
        <div className="flex items-center border-b px-4">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="shrink-0 text-[var(--text-secondary,#737373)]"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search help articles..."
            className="flex-1 border-0 bg-transparent px-3 py-4 text-sm outline-none placeholder:text-[var(--text-secondary,#737373)]"
          />
          <button
            onClick={() => onOpenChange(false)}
            className="rounded border px-1.5 py-0.5 text-xs text-[var(--text-secondary,#737373)]"
          >
            ESC
          </button>
        </div>
        {results.length > 0 && (
          <ul className="max-h-80 overflow-y-auto p-2">
            {results.map((article, i) => (
              <li key={article.slug}>
                <button
                  onClick={() => navigateToResult(article)}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full flex-col items-start rounded-lg px-3 py-2.5 text-left transition-colors ${
                    i === selectedIndex ? "bg-[var(--bg-muted)]" : ""
                  }`}
                >
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {article.title}
                  </span>
                  <span className="mt-0.5 text-xs text-[var(--text-secondary,#737373)] line-clamp-1">
                    {article.excerpt}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {query.length >= 2 && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-secondary,#737373)]">
            No articles found for &ldquo;{query}&rdquo;
          </div>
        )}
        {query.length < 2 && (
          <div className="px-4 py-6 text-center text-sm text-[var(--text-secondary,#737373)]">
            Type at least 2 characters to search
          </div>
        )}
      </div>
    </div>
  );
}
