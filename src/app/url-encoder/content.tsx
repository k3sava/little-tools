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

  const inputBg = "var(--kami-input-bg, var(--kami-surface-solid))";
  const inputBorder = "1px solid var(--kami-border-strong)";
  const inputRadius = "var(--kami-input-radius, 0.75rem)";
  const cardBg = "var(--kami-surface-solid)";
  const cardRadius = "var(--kami-card-radius, 0.75rem)";

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
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
        <div
          className="mb-4 flex items-center gap-1 px-1 py-0.5 w-fit"
          style={{
            background: cardBg,
            border: inputBorder,
            borderRadius: "var(--kami-cta-radius, 0.5rem)",
          }}
        >
          <button
            onClick={() => setMode("encode")}
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: mode === "encode" ? "var(--kami-cta-bg)" : "transparent",
              color: mode === "encode" ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
              borderRadius: "var(--kami-cta-radius, 0.25rem)",
            }}
          >
            Encode
          </button>
          <button
            onClick={() => setMode("decode")}
            className="px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              background: mode === "decode" ? "var(--kami-cta-bg)" : "transparent",
              color: mode === "decode" ? "var(--kami-cta-text)" : "var(--kami-text-muted)",
              borderRadius: "var(--kami-cta-radius, 0.25rem)",
            }}
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
          className="w-full px-4 py-3 text-base font-mono focus:outline-none"
          style={{
            background: inputBg,
            color: "var(--kami-text)",
            border: inputBorder,
            borderRadius: inputRadius,
            boxShadow: "var(--kami-card-shadow, none)",
          }}
          rows={4}
          autoFocus
        />
        <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: "var(--kami-text-dim)" }}>
          <span>{input.length} chars</span>
          {input && (
            <button onClick={() => setInput("")}>
              Clear
            </button>
          )}
        </div>

        {/* Output */}
        {input && output && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                {mode === "encode" ? "Encoded" : "Decoded"} Output
              </span>
              <button
                onClick={() => handleCopy(output)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors"
                style={{
                  background: "var(--kami-cta-bg)",
                  color: "var(--kami-cta-text)",
                  borderRadius: "var(--kami-cta-radius, 0.5rem)",
                }}
              >
                {copied ? (
                  <><CheckIcon /> Copied</>
                ) : (
                  <><CopyIcon /> Copy</>
                )}
              </button>
            </div>
            <div
              className="whitespace-pre-wrap break-all px-4 py-3 text-base font-mono"
              style={{
                background: cardBg,
                color: "var(--kami-text)",
                border: inputBorder,
                borderRadius: cardRadius,
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              {output}
            </div>
          </div>
        )}

        {/* URL Parser */}
        {urlParts && (
          <div className="mt-6">
            <h2 className="text-sm font-medium mb-2" style={{ color: "var(--kami-text-muted)" }}>
              URL Components
            </h2>
            <div
              className="overflow-hidden"
              style={{
                background: cardBg,
                border: inputBorder,
                borderRadius: cardRadius,
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ["Protocol", urlParts.protocol],
                    ["Host", urlParts.host],
                    ["Path", urlParts.pathname],
                    ["Search", urlParts.search || "(none)"],
                    ["Hash", urlParts.hash || "(none)"],
                  ].map(([label, value]) => (
                    <tr key={label} style={{ borderBottom: "1px solid var(--kami-border)" }}>
                      <td className="px-4 py-2 font-medium w-28" style={{ color: "var(--kami-text-muted)" }}>
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
                <h3 className="text-sm font-medium mb-2" style={{ color: "var(--kami-text-muted)" }}>
                  Query Parameters
                </h3>
                <div
                  className="overflow-hidden"
                  style={{
                    background: cardBg,
                    border: inputBorder,
                    borderRadius: cardRadius,
                    boxShadow: "var(--kami-card-shadow, none)",
                  }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: "1px solid var(--kami-border)" }}>
                        <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>
                          Key
                        </th>
                        <th className="px-4 py-2 text-left font-medium" style={{ color: "var(--kami-text-muted)" }}>
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {urlParts.params.map(([key, value], i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--kami-border)" }}>
                          <td className="px-4 py-2 font-mono" style={{ color: "var(--kami-text-muted)" }}>
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
