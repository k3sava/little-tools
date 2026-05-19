"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Toggle } from "@/components/tools/controls";

// --- Types ---

interface UtmParams {
  url: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

interface HistoryEntry {
  url: string;
  campaign: string;
  date: string;
  params: UtmParams;
}

interface Preset {
  label: string;
  source: string;
  medium: string;
}

// --- Constants ---

const PRESETS: Preset[] = [
  { label: "Google Ads", source: "google", medium: "cpc" },
  { label: "Meta / FB Ads", source: "facebook", medium: "paid_social" },
  { label: "LinkedIn Ads", source: "linkedin", medium: "paid_social" },
  { label: "Twitter / X Ads", source: "twitter", medium: "paid_social" },
  { label: "Newsletter", source: "newsletter", medium: "email" },
  { label: "Email", source: "email", medium: "email" },
  { label: "Instagram", source: "instagram", medium: "social" },
  { label: "YouTube", source: "youtube", medium: "video" },
  { label: "Custom", source: "", medium: "" },
];

const STORAGE_KEY = "kami-utm-builder-history";
const MAX_HISTORY = 20;
const ACCENT = "#3b82f6";

// --- Helpers ---

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidUrl(input: string): boolean {
  try {
    new URL(normalizeUrl(input));
    return true;
  } catch {
    return false;
  }
}

function buildUtmUrl(params: UtmParams): string {
  const { url, source, medium, campaign, term, content } = params;
  if (!url || !source || !medium || !campaign) return "";

  try {
    const parsed = new URL(normalizeUrl(url));
    if (source) parsed.searchParams.set("utm_source", source);
    if (medium) parsed.searchParams.set("utm_medium", medium);
    if (campaign) parsed.searchParams.set("utm_campaign", campaign);
    if (term) parsed.searchParams.set("utm_term", term);
    if (content) parsed.searchParams.set("utm_content", content);
    return parsed.toString();
  } catch {
    return "";
  }
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // localStorage full or unavailable
  }
}

function toMarkdownTable(rows: { generated: string; base: string }[]): string {
  const valid = rows.filter((r) => r.generated);
  if (!valid.length) return "";
  const head = "| Base URL | Tagged URL |\n| --- | --- |";
  const body = valid.map((r) => `| ${r.base} | ${r.generated} |`).join("\n");
  return `${head}\n${body}`;
}

// --- Component ---

export default function UtmBuilderContent() {
  const [params, setParams] = useState<UtmParams>({
    url: "",
    source: "",
    medium: "",
    campaign: "",
    term: "",
    content: "",
  });
  const [activePreset, setActivePreset] = useState<string>("Custom");
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const urlWarning = params.url.length > 0 && !isValidUrl(params.url);

  const generatedUrl = useMemo(() => buildUtmUrl(params), [params]);

  const bulkGenerated = useMemo(() => {
    if (!bulkMode || !bulkUrls.trim()) return [];
    const lines = bulkUrls.split("\n").map((l) => l.trim()).filter(Boolean);
    return lines.map((line) => {
      const built = buildUtmUrl({ ...params, url: line });
      return { base: line, generated: built, valid: isValidUrl(line) };
    });
  }, [bulkMode, bulkUrls, params]);

  const shortPreview = useMemo(() => {
    if (!generatedUrl) return "";
    try {
      const u = new URL(generatedUrl);
      const host = u.hostname.replace(/^www\./, "");
      const path = u.pathname === "/" ? "" : u.pathname;
      return `bit.ly/${host.split(".")[0]}-${(params.campaign || "go").slice(0, 8)}${path ? "?" : ""}`;
    } catch {
      return "";
    }
  }, [generatedUrl, params.campaign]);

  const updateParam = useCallback(
    (key: keyof UtmParams, value: string) => {
      setParams((prev) => ({ ...prev, [key]: value }));
      if (key === "source" || key === "medium") {
        setActivePreset("Custom");
      }
    },
    [],
  );

  const selectPreset = useCallback((preset: Preset) => {
    setActivePreset(preset.label);
    setParams((prev) => ({
      ...prev,
      source: preset.source,
      medium: preset.medium,
    }));
  }, []);

  const addToHistory = useCallback(() => {
    if (!generatedUrl) return;
    const entry: HistoryEntry = {
      url: generatedUrl,
      campaign: params.campaign,
      date: new Date().toISOString(),
      params: { ...params },
    };
    setHistory((prev) => {
      const next = [entry, ...prev.filter((h) => h.url !== generatedUrl)].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, [generatedUrl, params]);

  const handleCopy = useCallback(async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToHistory();
  }, [addToHistory]);

  const handleCopyBulkItem = useCallback(async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }, []);

  const handleCopyAll = useCallback(async () => {
    const all = bulkGenerated
      .filter((b) => b.generated)
      .map((b) => b.generated)
      .join("\n");
    await navigator.clipboard.writeText(all);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }, [bulkGenerated]);

  const handleCopyMarkdown = useCallback(async () => {
    const md = bulkMode
      ? toMarkdownTable(bulkGenerated)
      : generatedUrl
      ? `| Campaign | URL |\n| --- | --- |\n| ${params.campaign} | ${generatedUrl} |`
      : "";
    if (!md) return;
    await navigator.clipboard.writeText(md);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  }, [bulkMode, bulkGenerated, generatedUrl, params.campaign]);

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setParams(entry.params);
    const match = PRESETS.find(
      (p) => p.source === entry.params.source && p.medium === entry.params.medium,
    );
    setActivePreset(match?.label ?? "Custom");
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  const clearForm = useCallback(() => {
    setParams({ url: "", source: "", medium: "", campaign: "", term: "", content: "" });
    setActivePreset("Custom");
    setBulkUrls("");
  }, []);

  useKeyboardShortcuts(
    useMemo(
      () => [
        {
          key: "Enter",
          meta: true,
          action: () => {
            if (generatedUrl) handleCopy(generatedUrl);
          },
          label: "Copy URL",
        },
        { key: "k", meta: true, action: clearForm, label: "Clear" },
      ],
      [generatedUrl, handleCopy, clearForm],
    ),
  );

  // ---- Render helpers ----
  const inputStyle: React.CSSProperties = {
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-input-radius, 0.5rem)",
  };

  const controls = (
    <>
      <ControlGroup label="Platform preset">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => selectPreset(preset)}
              data-active={activePreset === preset.label}
              className="kc-segment-btn"
              style={{ minHeight: 40 }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </ControlGroup>
      <ControlGroup label="Bulk mode" hint="Generate variants from a list of URLs">
        <Toggle checked={bulkMode} onChange={setBulkMode} label={bulkMode ? "Bulk on" : "Single URL"} />
      </ControlGroup>
      {history.length > 0 && (
        <ControlGroup label={`Recent (${history.length})`}>
          <div className="flex flex-col gap-2 max-h-64 overflow-auto">
            {history.map((entry, i) => (
              <button
                key={i}
                onClick={() => loadFromHistory(entry)}
                className="flex flex-col gap-0.5 px-3 py-2 text-left text-xs"
                style={{
                  border: "1px solid var(--kami-border)",
                  borderRadius: 8,
                  background: "var(--kami-surface-solid)",
                  minHeight: 40,
                }}
              >
                <span className="truncate font-medium" style={{ color: "var(--kami-text)" }}>
                  {entry.campaign || "(no campaign)"}
                </span>
                <span className="truncate" style={{ color: "var(--kami-text-dim)" }}>
                  {entry.url}
                </span>
              </button>
            ))}
            <button onClick={clearHistory} className="text-xs underline" style={{ color: "var(--kami-text-dim)" }}>
              Clear history
            </button>
          </div>
        </ControlGroup>
      )}
    </>
  );

  const actions = (
    <>
      <ToolActionButton variant="outline" onClick={clearForm}>
        Reset
      </ToolActionButton>
      <ToolActionButton variant="outline" onClick={handleCopyMarkdown}>
        {copiedMd ? "Copied" : "Copy MD"}
      </ToolActionButton>
      <ToolActionButton
        variant="solid"
        onClick={() => (bulkMode ? handleCopyAll() : generatedUrl && handleCopy(generatedUrl))}
        disabled={bulkMode ? bulkGenerated.filter((b) => b.generated).length === 0 : !generatedUrl}
      >
        {bulkMode
          ? copiedAll
            ? "Copied all"
            : "Copy all"
          : copied
          ? "Copied"
          : "Copy URL"}
      </ToolActionButton>
    </>
  );

  const info = (
    <div className="space-y-3 text-xs" style={{ color: "var(--kami-text-muted)" }}>
      <p>Build UTM-tagged campaign URLs that show up correctly in Google Analytics. Switch on bulk mode to tag a list of URLs at once.</p>
      <div>
        <p className="font-semibold mb-1" style={{ color: "var(--kami-text)" }}>The five params</p>
        <ul className="space-y-1">
          <li><code>utm_source</code> — where the traffic came from (google, newsletter)</li>
          <li><code>utm_medium</code> — the &quot;how&quot; (cpc, email, social)</li>
          <li><code>utm_campaign</code> — campaign / initiative name</li>
          <li><code>utm_term</code> — paid-search keyword (optional)</li>
          <li><code>utm_content</code> — variant tag for A/B tests (optional)</li>
        </ul>
      </div>
      <p><strong>Tip:</strong> always lowercase, no spaces, keep mediums to a small set.</p>
    </div>
  );

  return (
    <ToolShell
      title="UTM Builder"
      tagline="Tagged campaign URLs · presets · bulk · history"
      accent={ACCENT}
      materialFab={{ label: "Copy URL", onClick: () => generatedUrl && handleCopy(generatedUrl) }}
      actions={actions}
      controls={controls}
      info={info}
    >
      <div className="flex flex-col gap-5 p-4 md:p-6">
        {/* URL input(s) */}
        {!bulkMode ? (
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
              Website URL <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <input
              type="text"
              value={params.url}
              onChange={(e) => updateParam("url", e.target.value)}
              placeholder="https://example.com/page"
              className="w-full px-4 py-3 text-base font-mono focus:outline-none"
              style={{
                ...inputStyle,
                borderColor: urlWarning ? "#ef4444" : "var(--kami-border-strong)",
              }}
              autoFocus
            />
            {urlWarning && (
              <p className="mt-1 text-xs" style={{ color: "#ef4444" }}>
                Enter a valid URL (e.g. example.com/page or https://example.com)
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
              Base URLs <span style={{ color: "var(--kami-text-dim)" }}>(one per line)</span>
            </label>
            <textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder={"https://example.com/page-1\nhttps://example.com/page-2"}
              className="w-full px-4 py-3 text-sm font-mono focus:outline-none"
              style={inputStyle}
              rows={4}
            />
          </div>
        )}

        {/* UTM Fields */}
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { key: "source", label: "utm_source", required: true, placeholder: "google", span: false },
              { key: "medium", label: "utm_medium", required: true, placeholder: "cpc", span: false },
              { key: "campaign", label: "utm_campaign", required: true, placeholder: "spring_sale", span: true },
              { key: "term", label: "utm_term", required: false, placeholder: "paid keywords", span: false },
              { key: "content", label: "utm_content", required: false, placeholder: "ad variant", span: false },
            ] as { key: keyof UtmParams; label: string; required: boolean; placeholder: string; span: boolean }[]
          ).map((field) => (
            <div key={field.key} className={field.span ? "sm:col-span-2" : ""}>
              <label className="mb-1 block text-xs font-medium" style={{ color: "var(--kami-text-muted)" }}>
                {field.label}
                {field.required && <span style={{ color: "#ef4444" }}> *</span>}
              </label>
              <input
                type="text"
                value={params[field.key]}
                onChange={(e) => updateParam(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* Generated URL (single) */}
        {!bulkMode && generatedUrl && (
          <div
            className="p-4 rounded-xl"
            style={{
              background: "var(--kami-surface)",
              border: `1px solid ${ACCENT}55`,
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <div className="text-xs uppercase tracking-wide mb-1" style={{ color: ACCENT }}>
              Generated URL
            </div>
            <div className="break-all font-mono text-sm" style={{ color: "var(--kami-text)" }}>
              {generatedUrl}
            </div>
            {shortPreview && (
              <div className="mt-2 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                Short-URL preview: <code>{shortPreview}</code>
              </div>
            )}
          </div>
        )}

        {/* Bulk results */}
        {bulkMode && bulkGenerated.length > 0 && (
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide" style={{ color: ACCENT }}>
              {bulkGenerated.filter((b) => b.generated).length} tagged URLs
            </div>
            <div
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
              }}
            >
              {bulkGenerated.map((item, i) => (
                <div
                  key={i}
                  className="px-4 py-3"
                  style={i > 0 ? { borderTop: "1px solid var(--kami-border)" } : undefined}
                >
                  {!item.valid ? (
                    <p className="text-sm" style={{ color: "#ef4444" }}>
                      Invalid URL: {item.base}
                    </p>
                  ) : item.generated ? (
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 break-all font-mono text-xs" style={{ color: "var(--kami-text-muted)" }}>
                        {item.generated}
                      </p>
                      <button
                        onClick={() => handleCopyBulkItem(item.generated, i)}
                        className="kc-segment-btn shrink-0"
                        style={{ minHeight: 32, padding: "0 10px" }}
                      >
                        {copiedIndex === i ? "Copied" : "Copy"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm" style={{ color: "var(--kami-text-dim)" }}>
                      Fill required UTM fields to generate
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
