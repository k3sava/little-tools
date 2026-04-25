"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- JSON parsing ---

interface ParseResult {
  valid: boolean;
  parsed: unknown;
  error: string | null;
  errorLine: number | null;
  errorColumn: number | null;
}

function parseJson(input: string): ParseResult {
  if (!input.trim()) {
    return { valid: true, parsed: null, error: null, errorLine: null, errorColumn: null };
  }
  try {
    const parsed = JSON.parse(input);
    return { valid: true, parsed, error: null, errorLine: null, errorColumn: null };
  } catch (e) {
    const msg = (e as Error).message;
    const posMatch = msg.match(/position\s+(\d+)/i);
    let errorLine: number | null = null;
    let errorColumn: number | null = null;
    if (posMatch) {
      const pos = parseInt(posMatch[1], 10);
      const before = input.slice(0, pos);
      const lines = before.split("\n");
      errorLine = lines.length;
      errorColumn = (lines[lines.length - 1]?.length ?? 0) + 1;
    }
    return { valid: false, parsed: null, error: msg, errorLine, errorColumn };
  }
}

function formatJson(parsed: unknown, indent: string): string {
  return JSON.stringify(parsed, null, indent === "tab" ? "\t" : parseInt(indent, 10));
}

function minifyJson(parsed: unknown): string {
  return JSON.stringify(parsed);
}

// --- JSON stats ---

interface JsonStats {
  objects: number;
  arrays: number;
  strings: number;
  numbers: number;
  booleans: number;
  nulls: number;
  totalKeys: number;
  maxDepth: number;
  totalSize: number;
}

function computeStats(value: unknown, depth = 0): JsonStats {
  const stats: JsonStats = {
    objects: 0, arrays: 0, strings: 0, numbers: 0,
    booleans: 0, nulls: 0, totalKeys: 0, maxDepth: depth, totalSize: 0,
  };

  if (value === null) { stats.nulls = 1; return stats; }
  if (typeof value === "string") { stats.strings = 1; stats.totalSize = value.length; return stats; }
  if (typeof value === "number") { stats.numbers = 1; return stats; }
  if (typeof value === "boolean") { stats.booleans = 1; return stats; }

  if (Array.isArray(value)) {
    stats.arrays = 1;
    for (const item of value) {
      const child = computeStats(item, depth + 1);
      merge(stats, child);
    }
    return stats;
  }

  if (typeof value === "object") {
    stats.objects = 1;
    const entries = Object.entries(value as Record<string, unknown>);
    stats.totalKeys = entries.length;
    for (const [, val] of entries) {
      const child = computeStats(val, depth + 1);
      merge(stats, child);
    }
    return stats;
  }

  return stats;
}

function merge(target: JsonStats, source: JsonStats) {
  target.objects += source.objects;
  target.arrays += source.arrays;
  target.strings += source.strings;
  target.numbers += source.numbers;
  target.booleans += source.booleans;
  target.nulls += source.nulls;
  target.totalKeys += source.totalKeys;
  target.maxDepth = Math.max(target.maxDepth, source.maxDepth);
  target.totalSize += source.totalSize;
}

// --- JSON path query ---

function queryJsonPath(data: unknown, path: string): unknown[] {
  if (!path.trim()) return [];
  const parts = path.replace(/^\$\.?/, "").split(/\.|\[(\d+)\]/).filter(Boolean);
  if (parts.length === 0) return [data];

  function walk(current: unknown, idx: number): unknown[] {
    if (idx >= parts.length) return [current];
    const part = parts[idx];
    if (part === "*") {
      if (Array.isArray(current)) return current.flatMap((item) => walk(item, idx + 1));
      if (current && typeof current === "object") {
        return Object.values(current as Record<string, unknown>).flatMap((v) => walk(v, idx + 1));
      }
      return [];
    }
    if (Array.isArray(current)) {
      const i = parseInt(part, 10);
      if (!isNaN(i) && i >= 0 && i < current.length) return walk(current[i], idx + 1);
      return [];
    }
    if (current && typeof current === "object") {
      const obj = current as Record<string, unknown>;
      if (part in obj) return walk(obj[part], idx + 1);
      return [];
    }
    return [];
  }

  return walk(data, 0);
}

// --- Transforms ---

function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(sortKeys);
  const sorted = Object.keys(value as Record<string, unknown>).sort();
  const result: Record<string, unknown> = {};
  for (const key of sorted) result[key] = sortKeys((value as Record<string, unknown>)[key]);
  return result;
}

function removeNulls(value: unknown): unknown {
  if (value === null) return undefined;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(removeNulls).filter((v) => v !== undefined);
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const cleaned = removeNulls(v);
    if (cleaned !== undefined) result[k] = cleaned;
  }
  return result;
}

function flattenJson(value: unknown, prefix = ""): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (value === null || typeof value !== "object") {
    result[prefix || "$"] = value;
    return result;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => {
      Object.assign(result, flattenJson(item, `${prefix}[${i}]`));
    });
    return result;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object") {
      Object.assign(result, flattenJson(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

// --- Search ---

interface SearchMatch {
  path: string;
  key?: string;
  value: unknown;
}

function searchJson(data: unknown, query: string, path = "$"): SearchMatch[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const matches: SearchMatch[] = [];

  if (data === null || typeof data !== "object") {
    if (String(data).toLowerCase().includes(q)) {
      matches.push({ path, value: data });
    }
    return matches;
  }

  if (Array.isArray(data)) {
    data.forEach((item, i) => {
      matches.push(...searchJson(item, query, `${path}[${i}]`));
    });
    return matches;
  }

  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    const childPath = `${path}.${k}`;
    if (k.toLowerCase().includes(q)) {
      matches.push({ path: childPath, key: k, value: v });
    }
    matches.push(...searchJson(v, query, childPath));
  }
  return matches;
}

// --- TypeScript type generation ---

function generateTsType(value: unknown, name = "Root", depth = 0): string {
  const indent = "  ".repeat(depth);
  const inner = "  ".repeat(depth + 1);

  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";

  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const itemType = generateTsType(value[0], name + "Item", depth);
    return itemType.includes("\n") ? `Array<${itemType}>` : `${itemType}[]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "Record<string, unknown>";
    const fields = entries.map(([k, v]) => {
      const safe = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
      const type = generateTsType(v, k.charAt(0).toUpperCase() + k.slice(1), depth + 1);
      return `${inner}${safe}: ${type};`;
    });
    return `{\n${fields.join("\n")}\n${indent}}`;
  }

  return "unknown";
}

// --- Tree view with path copying ---

function TreeNode({
  name, value, depth, path, onCopyPath, searchQuery,
}: {
  name: string | null;
  value: unknown;
  depth: number;
  path: string;
  onCopyPath: (path: string) => void;
  searchQuery: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isMatch = searchQuery && (
    (name && name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (typeof value === "string" && value.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (typeof value === "number" && String(value).includes(searchQuery))
  );

  const highlight = isMatch ? "bg-yellow-100 rounded px-0.5 -mx-0.5" : "";

  const pathBtn = (
    <button
      onClick={(e) => { e.stopPropagation(); onCopyPath(path); }}
      className="ml-1 opacity-0 group-hover/node:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity"
      title={`Copy path: ${path}`}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    </button>
  );

  if (value === null) {
    return (
      <div style={{ paddingLeft: depth * 16 }} className={`group/node flex items-center gap-1 py-0.5 font-mono text-sm ${highlight}`}>
        {name !== null && <span className="text-gray-500">{name}:</span>}
        <span className="text-orange-500">null</span>
        {pathBtn}
      </div>
    );
  }

  if (typeof value === "boolean") {
    return (
      <div style={{ paddingLeft: depth * 16 }} className={`group/node flex items-center gap-1 py-0.5 font-mono text-sm ${highlight}`}>
        {name !== null && <span className="text-gray-500">{name}:</span>}
        <span className="text-purple-600">{String(value)}</span>
        {pathBtn}
      </div>
    );
  }

  if (typeof value === "number") {
    return (
      <div style={{ paddingLeft: depth * 16 }} className={`group/node flex items-center gap-1 py-0.5 font-mono text-sm ${highlight}`}>
        {name !== null && <span className="text-gray-500">{name}:</span>}
        <span className="text-blue-600">{String(value)}</span>
        {pathBtn}
      </div>
    );
  }

  if (typeof value === "string") {
    const truncated = value.length > 120 ? value.slice(0, 120) + "..." : value;
    return (
      <div style={{ paddingLeft: depth * 16 }} className={`group/node flex items-center gap-1 py-0.5 font-mono text-sm ${highlight}`}>
        {name !== null && <span className="text-gray-500">{name}:</span>}
        <span className="text-green-700" title={value.length > 120 ? value : undefined}>&quot;{truncated}&quot;</span>
        {value.length > 120 && <span className="text-gray-400 text-xs">({value.length})</span>}
        {pathBtn}
      </div>
    );
  }

  if (Array.isArray(value)) {
    return (
      <div style={{ paddingLeft: depth * 16 }} className="py-0.5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`case-preserve group/node flex items-center gap-1 font-mono text-sm hover:bg-gray-100 rounded px-1 -ml-1 ${highlight}`}
        >
          <span className="text-gray-400 w-3 text-center">{expanded ? "\u25BE" : "\u25B8"}</span>
          {name !== null && <span className="text-gray-500">{name}:</span>}
          <span className="text-gray-400">[{value.length}]</span>
          {pathBtn}
        </button>
        {expanded && value.map((item, i) => (
          <TreeNode key={i} name={String(i)} value={item} depth={depth + 1} path={`${path}[${i}]`} onCopyPath={onCopyPath} searchQuery={searchQuery} />
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    return (
      <div style={{ paddingLeft: depth * 16 }} className="py-0.5">
        <button
          onClick={() => setExpanded((v) => !v)}
          className={`case-preserve group/node flex items-center gap-1 font-mono text-sm hover:bg-gray-100 rounded px-1 -ml-1 ${highlight}`}
        >
          <span className="text-gray-400 w-3 text-center">{expanded ? "\u25BE" : "\u25B8"}</span>
          {name !== null && <span className="text-gray-500">{name}:</span>}
          <span className="text-gray-400">{`{${entries.length}}`}</span>
          {pathBtn}
        </button>
        {expanded && entries.map(([key, val]) => (
          <TreeNode key={key} name={key} value={val} depth={depth + 1} path={`${path}.${key}`} onCopyPath={onCopyPath} searchQuery={searchQuery} />
        ))}
      </div>
    );
  }

  return null;
}

// --- UI ---

type ViewMode = "text" | "tree";
type Tab = "format" | "query" | "transform" | "types";

export default function JsonFormatterContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [indent, setIndent] = useState("2");
  const [viewMode, setViewMode] = useState<ViewMode>("text");
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("format");
  const [searchQuery, setSearchQuery] = useState("");
  const [jsonPathQuery, setJsonPathQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const result = useMemo(() => parseJson(input), [input]);

  const formatted = useMemo(() => {
    if (!result.valid || result.parsed == null) return "";
    return formatJson(result.parsed, indent);
  }, [result, indent]);

  const minified = useMemo(() => {
    if (!result.valid || result.parsed == null) return "";
    return minifyJson(result.parsed);
  }, [result]);

  const stats = useMemo(() => {
    if (!result.valid || result.parsed == null) return null;
    return computeStats(result.parsed);
  }, [result]);

  const searchResults = useMemo(() => {
    if (!result.valid || result.parsed == null || !searchQuery) return [];
    return searchJson(result.parsed, searchQuery).slice(0, 50);
  }, [result, searchQuery]);

  const pathResults = useMemo(() => {
    if (!result.valid || result.parsed == null || !jsonPathQuery) return [];
    try {
      return queryJsonPath(result.parsed, jsonPathQuery);
    } catch {
      return [];
    }
  }, [result, jsonPathQuery]);

  const tsType = useMemo(() => {
    if (!result.valid || result.parsed == null) return "";
    return `interface Root ${generateTsType(result.parsed, "Root")}`;
  }, [result]);

  const handleCopy = useCallback(async (text: string, label = "output") => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleCopyPath = useCallback((path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 1500);
  }, []);

  const handleFormat = useCallback(() => {
    if (formatted) setInput(formatted);
  }, [formatted, setInput]);

  const handleMinify = useCallback(() => {
    if (minified) setInput(minified);
  }, [minified, setInput]);

  const handleTransform = useCallback((fn: (v: unknown) => unknown) => {
    if (!result.valid || result.parsed == null) return;
    try {
      const transformed = fn(result.parsed);
      setInput(JSON.stringify(transformed, null, indent === "tab" ? "\t" : parseInt(indent, 10)));
    } catch { /* ignore */ }
  }, [result, indent, setInput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => handleFormat(), label: "Format" },
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
    { key: "f", meta: true, shift: true, action: () => { setActiveTab("format"); }, label: "Search" },
  ], [handleFormat, setInput]));

  const hasData = result.valid && result.parsed != null;

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="JSON Formatter"
          tagline="Format, validate, query with JSONPath, and explore a JSON tree - with inline syntax errors and size stats."
          description="Paste any JSON and we validate it, pretty-print with the indentation you pick, and show the structure as a collapsible tree. Errors show the exact line and column. Use JSONPath expressions ($.data.items[*].id) to pull values out of large documents without a script."
          audience={["Developers", "API testers", "Data engineers"]}
          whenToUse={[
            "Pretty-printing an API response to read it",
            "Finding a specific value inside a large JSON payload",
            "Catching a subtle syntax error (trailing comma, unquoted key)",
          ]}
        />

        {/* Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Paste your JSON here... e.g. {"key": "value"}'
          className={`w-full rounded-xl border bg-white px-4 py-3 text-base font-mono shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
            input && !result.valid
              ? "border-red-300 focus:border-red-300 focus:ring-red-100"
              : "border-gray-200 focus:border-gray-300 focus:ring-gray-200"
          }`}
          rows={8}
          autoFocus
          spellCheck={false}
        />

        {/* Status bar */}
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            {input.trim() && (
              <span className={result.valid ? "text-green-600" : "text-red-500"}>
                {result.valid ? "\u2713 Valid JSON" : "\u2717 Invalid JSON"}
              </span>
            )}
            {result.error && (
              <span className="text-red-400">
                {result.errorLine && result.errorColumn
                  ? `Line ${result.errorLine}, Col ${result.errorColumn}: `
                  : ""}
                {result.error}
              </span>
            )}
            {hasData && (
              <span className="text-gray-400">
                {input.length.toLocaleString()} chars
              </span>
            )}
          </div>
          {input && (
            <button
              onClick={() => setInput("")}
              className="text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {[
              ["Objects", stats.objects, "text-amber-600 bg-amber-50"],
              ["Arrays", stats.arrays, "text-blue-600 bg-blue-50"],
              ["Strings", stats.strings, "text-green-600 bg-green-50"],
              ["Numbers", stats.numbers, "text-indigo-600 bg-indigo-50"],
              ["Booleans", stats.booleans, "text-purple-600 bg-purple-50"],
              ["Nulls", stats.nulls, "text-orange-600 bg-orange-50"],
              ["Total Keys", stats.totalKeys, "text-gray-600 bg-gray-100"],
              [`Depth ${stats.maxDepth}`, null, "text-gray-500 bg-gray-100"],
            ].filter(([, count]) => count === null || (count as number) > 0).map(([label, count, cls]) => (
              <span key={label as string} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
                {count !== null ? `${count} ` : ""}{label}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        {hasData && (
          <div className="mt-6 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-0.5 w-fit">
            {([
              ["format", "Format"],
              ["query", "Query"],
              ["transform", "Transform"],
              ["types", "Types"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* --- Format Tab --- */}
        {hasData && activeTab === "format" && (
          <div className="mt-4">
            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1">
                <span className="text-xs text-gray-500">Indent:</span>
                {["2", "4", "tab"].map((v) => (
                  <button
                    key={v}
                    onClick={() => setIndent(v)}
                    className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                      indent === v
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {v === "tab" ? "Tab" : `${v}sp`}
                  </button>
                ))}
              </div>

              <button onClick={handleFormat} className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800">
                Format
              </button>
              <button onClick={handleMinify} className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 hover:border-gray-300">
                Minify
              </button>

              {/* Search */}
              <div className="ml-auto flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search keys/values..."
                    className="w-48 rounded-lg border border-gray-200 bg-white px-3 py-1.5 pr-8 text-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
                  />
                  {searchQuery && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                      {searchResults.length}
                    </span>
                  )}
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-0.5">
                  <button
                    onClick={() => setViewMode("text")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      viewMode === "text" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setViewMode("tree")}
                    className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                      viewMode === "tree" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Tree
                  </button>
                </div>
              </div>
            </div>

            {/* Search results */}
            {searchQuery && searchResults.length > 0 && viewMode === "text" && (
              <div className="mt-3 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                <div className="text-xs font-medium text-yellow-700 mb-2">
                  {searchResults.length} match{searchResults.length !== 1 ? "es" : ""} found
                </div>
                <div className="max-h-40 overflow-auto space-y-1">
                  {searchResults.slice(0, 20).map((m, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs font-mono">
                      <button
                        onClick={() => handleCopyPath(m.path)}
                        className="case-preserve text-yellow-600 hover:text-yellow-800 truncate max-w-xs"
                        title={m.path}
                      >
                        {m.path}
                      </button>
                      <span className="text-gray-400 truncate max-w-xs">
                        {JSON.stringify(m.value)?.slice(0, 60)}
                      </span>
                    </div>
                  ))}
                  {searchResults.length > 20 && (
                    <div className="text-xs text-yellow-600">...and {searchResults.length - 20} more</div>
                  )}
                </div>
              </div>
            )}

            {/* Copied path notification */}
            {copiedPath && (
              <div className="mt-2 text-xs text-green-600">
                Copied: {copiedPath}
              </div>
            )}

            {/* Output */}
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Output</span>
                <button
                  onClick={() => handleCopy(formatted, "output")}
                  className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
                >
                  {copied === "output" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
                </button>
              </div>

              {viewMode === "text" ? (
                <pre className="overflow-auto whitespace-pre rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-mono shadow-sm max-h-[500px]">
                  {formatted}
                </pre>
              ) : (
                <div className="overflow-auto rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm max-h-[500px]">
                  <TreeNode name={null} value={result.parsed} depth={0} path="$" onCopyPath={handleCopyPath} searchQuery={searchQuery} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Query Tab --- */}
        {hasData && activeTab === "query" && (
          <div className="mt-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-medium text-gray-700 mb-3">JSON Path Query</h3>
              <input
                type="text"
                value={jsonPathQuery}
                onChange={(e) => setJsonPathQuery(e.target.value)}
                placeholder="$.users[*].name  or  data.items[0]"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-mono placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {["$", "$..*", "$[0]", "$[*]"].map((example) => (
                  <button
                    key={example}
                    onClick={() => setJsonPathQuery(example)}
                    className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-mono text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                  >
                    {example}
                  </button>
                ))}
              </div>
              {jsonPathQuery && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      {pathResults.length} result{pathResults.length !== 1 ? "s" : ""}
                    </span>
                    {pathResults.length > 0 && (
                      <button
                        onClick={() => handleCopy(JSON.stringify(pathResults.length === 1 ? pathResults[0] : pathResults, null, 2), "query")}
                        className="text-xs text-gray-400 hover:text-gray-600"
                      >
                        {copied === "query" ? "Copied!" : "Copy result"}
                      </button>
                    )}
                  </div>
                  <pre className="overflow-auto whitespace-pre rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-mono max-h-64">
                    {pathResults.length === 0
                      ? "No results"
                      : JSON.stringify(pathResults.length === 1 ? pathResults[0] : pathResults, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- Transform Tab --- */}
        {hasData && activeTab === "transform" && (
          <div className="mt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  label: "Sort Keys",
                  desc: "Alphabetically sort all object keys",
                  action: () => handleTransform(sortKeys),
                },
                {
                  label: "Remove Nulls",
                  desc: "Strip all null values from the JSON",
                  action: () => handleTransform(removeNulls),
                },
                {
                  label: "Flatten",
                  desc: "Convert nested structure to dot-notation keys",
                  action: () => handleTransform((v) => flattenJson(v)),
                },
                {
                  label: "Escape Strings",
                  desc: "Escape special characters in string values",
                  action: () => handleCopy(JSON.stringify(input), "escaped"),
                },
                {
                  label: "Unescape",
                  desc: "Parse escaped JSON string",
                  action: () => {
                    try {
                      const unescaped = JSON.parse(input);
                      if (typeof unescaped === "string") setInput(unescaped);
                    } catch { /* ignore */ }
                  },
                },
                {
                  label: "Wrap in Array",
                  desc: "Wrap the current JSON in an array",
                  action: () => handleTransform((v) => [v]),
                },
              ].map((t) => (
                <button
                  key={t.label}
                  onClick={t.action}
                  className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="text-sm font-medium text-gray-900">{t.label}</div>
                  <div className="mt-0.5 text-xs text-gray-500">{t.desc}</div>
                </button>
              ))}
            </div>
            {copied === "escaped" && (
              <div className="mt-2 text-xs text-green-600">Escaped JSON copied to clipboard</div>
            )}
          </div>
        )}

        {/* --- Types Tab --- */}
        {hasData && activeTab === "types" && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">TypeScript Interface</span>
              <button
                onClick={() => handleCopy(tsType, "types")}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {copied === "types" ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy</>}
              </button>
            </div>
            <pre className="overflow-auto whitespace-pre rounded-xl border border-gray-200 bg-gray-900 px-4 py-3 text-sm font-mono text-gray-100 shadow-sm max-h-[500px]">
              {tsType}
            </pre>
          </div>
        )}

        {/* Footer */}
      </div>
    </div>
  );
}

// Inline SVG icons

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
