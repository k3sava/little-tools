"use client";

import { useState, useCallback, useMemo } from "react";
import { useToolState } from "@/hooks/use-tool-state";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle } from "@/components/tools/controls";

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

function buildUrl(parts: UrlParts): string {
  try {
    const params = new URLSearchParams();
    for (const [k, v] of parts.params) {
      if (k) params.append(k, v);
    }
    const qs = params.toString();
    return `${parts.protocol}//${parts.host}${parts.pathname}${qs ? "?" + qs : ""}${parts.hash}`;
  } catch {
    return "";
  }
}

// --- UI ---

type Mode = "encode" | "decode" | "parse";

export default function UrlEncoderContent() {
  const [{ q: input }, setToolState] = useToolState({ q: "" });
  const setInput = useCallback((v: string) => setToolState({ q: v }), [setToolState]);
  const [mode, setMode] = useState<Mode>("encode");
  const [copied, setCopied] = useState<string | null>(null);
  const [plusEncode, setPlusEncode] = useState(false);
  const [paramRows, setParamRows] = useState<[string, string][]>([]);

  const output = useMemo(() => {
    if (!input) return "";
    try {
      if (mode === "encode") {
        const encoded = encodeURIComponent(input);
        return plusEncode ? encoded.replace(/%20/g, "+") : encoded;
      }
      if (mode === "decode") {
        const normalized = plusEncode ? input.replace(/\+/g, "%20") : input;
        return decodeURIComponent(normalized);
      }
      return "";
    } catch {
      return mode === "encode" ? input : "Invalid encoded string";
    }
  }, [input, mode, plusEncode]);

  const urlParts = useMemo(() => parseUrl(input), [input]);

  // Sync param rows when URL parts change
  useMemo(() => {
    if (urlParts) setParamRows(urlParts.params);
  }, [urlParts]);

  const handleCopy = useCallback(async (text: string, key = "out") => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleRebuildUrl = useCallback(() => {
    if (!urlParts) return;
    const rebuilt = buildUrl({ ...urlParts, params: paramRows });
    setInput(rebuilt);
  }, [urlParts, paramRows, setInput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => { if (output) handleCopy(output); }, label: "Copy" },
    { key: "k", meta: true, action: () => setInput(""), label: "Clear" },
  ], [output, handleCopy, setInput]));

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
    boxShadow: "var(--kami-card-shadow, none)",
  } as const;
  const inputStyle = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  } as const;

  return (
    <ToolShell
      title="URL Encode / Decode"
      tagline="Encode, decode, and dissect URLs"
      accent="#10b981"
      actions={
        <>
          {input && (
            <ToolActionButton onClick={() => setInput("")} variant="ghost">
              Clear
            </ToolActionButton>
          )}
          {output && (
            <ToolActionButton onClick={() => handleCopy(output)} variant="solid">
              {copied === "out" ? "Copied" : "Copy"}
            </ToolActionButton>
          )}
        </>
      }
      controls={
        <>
          <ControlGroup label="Mode">
            <Segment<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: "encode", label: "Encode" },
                { value: "decode", label: "Decode" },
                { value: "parse", label: "Parse" },
              ]}
              full
            />
          </ControlGroup>
          <ControlGroup label="Options">
            <Toggle
              checked={plusEncode}
              onChange={setPlusEncode}
              label="Form-style (+) encoding"
              hint="Use + for spaces (application/x-www-form-urlencoded)"
            />
          </ControlGroup>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            mode === "encode"
              ? "Type or paste text to encode..."
              : mode === "decode"
              ? "Paste URL-encoded text to decode..."
              : "Paste a full URL to parse..."
          }
          className="w-full px-4 py-3 text-base font-mono focus:outline-none"
          style={{
            ...inputStyle,
            minHeight: "160px",
          }}
          rows={5}
          autoFocus
          spellCheck={false}
        />
        <div className="text-xs flex items-center justify-between" style={{ color: "var(--kami-text-dim)" }}>
          <span>{input.length} chars</span>
          {mode !== "parse" && output && (
            <span>{output.length} chars out</span>
          )}
        </div>

        {/* Encode/decode output */}
        {(mode === "encode" || mode === "decode") && input && output && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                {mode === "encode" ? "Encoded" : "Decoded"} output
              </span>
              <ToolActionButton onClick={() => handleCopy(output)} variant="outline">
                {copied === "out" ? "Copied" : "Copy"}
              </ToolActionButton>
            </div>
            <div
              className="whitespace-pre-wrap break-all px-4 py-3 text-base font-mono"
              style={cardStyle}
            >
              {output}
            </div>
          </div>
        )}

        {/* Parse view */}
        {mode === "parse" && urlParts && (
          <div className="flex flex-col gap-4">
            <div style={cardStyle}>
              <div className="px-4 py-2 border-b" style={{ borderColor: "var(--kami-border)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                  URL Components
                </span>
              </div>
              <div className="flex flex-col">
                {([
                  ["protocol", urlParts.protocol],
                  ["host", urlParts.host],
                  ["path", urlParts.pathname],
                  ["query", urlParts.search || "(none)"],
                  ["hash", urlParts.hash || "(none)"],
                ] as const).map(([label, value], i, arr) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                    style={i < arr.length - 1 ? { borderBottom: "1px solid var(--kami-border)" } : undefined}
                  >
                    <span className="text-xs font-medium uppercase tracking-wide shrink-0 w-20" style={{ color: "var(--kami-text-muted)" }}>
                      {label}
                    </span>
                    <span className="font-mono text-sm break-all flex-1 min-w-0">{value}</span>
                    <ToolActionButton onClick={() => handleCopy(String(value), `part-${label}`)} variant="ghost">
                      {copied === `part-${label}` ? "✓" : "Copy"}
                    </ToolActionButton>
                  </div>
                ))}
              </div>
            </div>

            {/* Query param editor */}
            <div style={cardStyle}>
              <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: "var(--kami-border)" }}>
                <span className="text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                  Query Parameters ({paramRows.length})
                </span>
                <div className="flex items-center gap-2">
                  <ToolActionButton onClick={() => setParamRows((r) => [...r, ["", ""]])} variant="ghost">
                    + Row
                  </ToolActionButton>
                  <ToolActionButton onClick={handleRebuildUrl} variant="solid">
                    Rebuild URL
                  </ToolActionButton>
                </div>
              </div>
              <div className="flex flex-col">
                {paramRows.length === 0 ? (
                  <div className="px-4 py-6 text-sm text-center" style={{ color: "var(--kami-text-dim)" }}>
                    No query parameters
                  </div>
                ) : (
                  paramRows.map(([key, value], i) => (
                    <div
                      key={i}
                      className="flex flex-col md:flex-row gap-2 items-stretch md:items-center px-4 py-2"
                      style={i > 0 ? { borderTop: "1px solid var(--kami-border)" } : undefined}
                    >
                      <input
                        value={key}
                        onChange={(e) => {
                          const next = paramRows.slice();
                          next[i] = [e.target.value, value];
                          setParamRows(next);
                        }}
                        placeholder="key"
                        className="flex-1 min-w-0 px-3 py-2 text-sm font-mono focus:outline-none"
                        style={inputStyle}
                      />
                      <input
                        value={value}
                        onChange={(e) => {
                          const next = paramRows.slice();
                          next[i] = [key, e.target.value];
                          setParamRows(next);
                        }}
                        placeholder="value"
                        className="flex-1 min-w-0 px-3 py-2 text-sm font-mono focus:outline-none"
                        style={inputStyle}
                      />
                      <button
                        onClick={() => setParamRows((r) => r.filter((_, idx) => idx !== i))}
                        className="px-3 py-2 text-sm font-medium"
                        style={{
                          background: "var(--kami-surface)",
                          color: "var(--kami-text-muted)",
                          border: "1px solid var(--kami-border)",
                          borderRadius: "var(--kami-cta-radius, 0.5rem)",
                          minHeight: 40,
                        }}
                        aria-label="Remove row"
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "parse" && input && !urlParts && (
          <div className="px-4 py-3 text-sm" style={{ ...cardStyle, color: "var(--kami-text-muted)" }}>
            Not a valid URL — needs protocol (e.g. <code>https://</code>) and host.
          </div>
        )}
      </div>
    </ToolShell>
  );
}
