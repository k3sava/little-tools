"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- URL parsing ---

interface UrlParts {
  protocol: string;
  host: string;
  pathname: string;
  search: string;
  hash: string;
  params: [string, string][];
}

function parseUrl(input: string): UrlParts | null {
  try {
    const url = new URL(input);
    return {
      protocol: url.protocol,
      host: url.host,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
      params: Array.from(url.searchParams.entries()),
    };
  } catch {
    return null;
  }
}

// --- UI ---

export default function UrlEncoderContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    if (!input) return "";
    try {
      return mode === "encode"
        ? encodeURIComponent(input)
        : decodeURIComponent(input);
    } catch {
      return mode === "encode" ? input : "Invalid encoded string";
    }
  }, [input, mode]);

  const urlParts = useMemo(() => parseUrl(input), [input]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { if (output) handleCopy(output); }, label: "Copy" },
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [output, handleCopy]));

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="URL Encode / Decode"
          tagline="Encode, decode, and dissect URLs - component-by-component, with per-part encoding for tricky query params."
          description="Encode or decode an entire URL, or just a single component (like a query value with special characters). Parse mode splits a URL into protocol / host / path / query / fragment so you can edit a specific piece. Supports both %-encoding and + encoding for form-style query strings."
          audience={["Developers", "QA testers", "Marketers"]}
          whenToUse={[
            "Debugging a URL with escaped characters in logs",
            "Building a search URL with unusual characters in a query param",
            "Comparing two URLs that look different but decode to the same thing",
          ]}
        />

        {/* Mode toggle */}
        <div className="mb-4 flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-1 py-0.5 w-fit">
          <button
            onClick={() => setMode("encode")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "encode"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Encode
          </button>
          <button
            onClick={() => setMode("decode")}
            className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === "decode"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Decode
          </button>
        </div>

        {/* Input */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "encode"
              ? "Type or paste text to encode..."
              : "Paste URL-encoded text to decode..."
          }
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-mono shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
          rows={4}
          autoFocus
        />
        <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
          <span>{input.length} chars</span>
          {input && (
            <button onClick={() => setInput("")} className="hover:text-gray-600">
              Clear
            </button>
          )}
        </div>

        {/* Output */}
        {input && output && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">
                {mode === "encode" ? "Encoded" : "Decoded"} Output
              </span>
              <button
                onClick={() => handleCopy(output)}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {copied ? (
                  <><CheckIcon /> Copied</>
                ) : (
                  <><CopyIcon /> Copy</>
                )}
              </button>
            </div>
            <div className="whitespace-pre-wrap break-all rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-mono shadow-sm">
              {output}
            </div>
          </div>
        )}

        {/* URL Parser */}
        {urlParts && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-gray-500 mb-2">
              URL Components
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Protocol", urlParts.protocol],
                    ["Host", urlParts.host],
                    ["Path", urlParts.pathname],
                    ["Search", urlParts.search || "(none)"],
                    ["Hash", urlParts.hash || "(none)"],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2 text-gray-500 font-medium w-28">
                        {label}
                      </td>
                      <td className="px-4 py-2 font-mono break-all">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Query params */}
            {urlParts.params.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Query Parameters
                </h3>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 ">
                        <th className="px-4 py-2 text-left font-medium text-gray-500">
                          Key
                        </th>
                        <th className="px-4 py-2 text-left font-medium text-gray-500">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {urlParts.params.map(([key, value], i) => (
                        <tr key={i} className="border-b border-gray-100 last:border-0">
                          <td className="px-4 py-2 font-mono text-gray-700">
                            {key}
                          </td>
                          <td className="px-4 py-2 font-mono break-all">
                            {value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
