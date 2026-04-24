"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";
import { ReferencePanel, RuleRow } from "@/components/tools/reference-panel";

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
  { label: "Facebook Ads", source: "facebook", medium: "paid_social" },
  { label: "LinkedIn Ads", source: "linkedin", medium: "paid_social" },
  { label: "Twitter/X Ads", source: "twitter", medium: "paid_social" },
  { label: "Email Newsletter", source: "newsletter", medium: "email" },
  { label: "Instagram", source: "instagram", medium: "social" },
  { label: "YouTube", source: "youtube", medium: "video" },
  { label: "Custom", source: "", medium: "" },
];

const STORAGE_KEY = "kami-utm-builder-history";
const MAX_HISTORY = 20;

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

  const updateParam = useCallback(
    (key: keyof UtmParams, value: string) => {
      setParams((prev) => ({ ...prev, [key]: value }));
      // If user manually edits source/medium, switch preset to Custom
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


  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    setParams(entry.params);
    // Find matching preset
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

  // Keyboard shortcuts
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

  return (
    <div className="min-h-screen text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="UTM Builder"
          tagline="Generate tagged campaign URLs that show up correctly in Google Analytics, and bulk-build variants for every channel at once."
          description="Fill in your destination URL and campaign details; we assemble a UTM-tagged link you can share. Platform presets (Facebook, LinkedIn, Email, etc.) pre-fill source and medium for you. Switch to Bulk mode to produce a dozen variants (one per channel) in a single click — handy for launch campaigns."
          audience={["Marketers", "Growth", "PMMs", "Ads managers"]}
          whenToUse={[
            "Sharing a blog post across multiple channels",
            "Building a launch spreadsheet of tagged links",
            "Auditing what UTM naming conventions mean",
          ]}
          quickLinks={[
            { label: "UTM parameter guide", href: "#utm-guide" },
            { label: "Naming conventions that don't fall apart", href: "#utm-naming" },
          ]}
        />

        {/* Platform Presets */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-500">
            Platform Preset
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => selectPreset(preset)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  activePreset === preset.label
                    ? "bg-gray-900 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-900"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Mode Toggle */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => setBulkMode(!bulkMode)}
            className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors"
            style={{
              backgroundColor: bulkMode ? "var(--kami-cta-bg)" : "var(--kami-border-strong)",
            }}
            role="switch"
            aria-checked={bulkMode}
          >
            <span
              className="inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform"
              style={{
                transform: bulkMode ? "translateX(18px)" : "translateX(3px)",
              }}
            />
          </button>
          <span className="text-sm text-gray-600">
            Bulk mode {bulkMode ? "on" : "off"}
          </span>
        </div>

        {/* URL Input */}
        {!bulkMode ? (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Website URL <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={params.url}
              onChange={(e) => updateParam("url", e.target.value)}
              placeholder="https://example.com/page"
              className={`w-full rounded-xl border bg-white px-4 py-3 text-base font-mono shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                urlWarning
                  ? "border-red-300 focus:border-red-300 focus:ring-red-200"
                  : "border-gray-200 focus:border-gray-300 focus:ring-gray-200"
              }`}
              autoFocus
            />
            {urlWarning && (
              <p className="mt-1 text-xs text-red-500">
                Enter a valid URL (e.g. example.com/page or https://example.com)
              </p>
            )}
          </div>
        ) : (
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Base URLs <span className="text-gray-400">(one per line)</span>
            </label>
            <textarea
              value={bulkUrls}
              onChange={(e) => setBulkUrls(e.target.value)}
              placeholder={"https://example.com/page-1\nhttps://example.com/page-2\nhttps://example.com/page-3"}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base font-mono shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
              rows={4}
              autoFocus
            />
          </div>
        )}

        {/* UTM Fields */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              utm_source <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={params.source}
              onChange={(e) => updateParam("source", e.target.value)}
              placeholder="google, facebook, newsletter"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              utm_medium <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={params.medium}
              onChange={(e) => updateParam("medium", e.target.value)}
              placeholder="cpc, email, social, banner"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              utm_campaign <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={params.campaign}
              onChange={(e) => updateParam("campaign", e.target.value)}
              placeholder="spring_sale, product_launch"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              utm_term <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={params.term}
              onChange={(e) => updateParam("term", e.target.value)}
              placeholder="paid search keywords"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              utm_content <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={params.content}
              onChange={(e) => updateParam("content", e.target.value)}
              placeholder="ad variation, CTA label"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>
        </div>

        {/* Generated URL (single mode) */}
        {!bulkMode && generatedUrl && (
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Generated URL
              </span>
              <button
                onClick={() => handleCopy(generatedUrl)}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {copied ? (
                  <>
                    <CheckIcon /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon /> Copy
                  </>
                )}
              </button>
            </div>
            <div className="break-all rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm shadow-sm">
              {generatedUrl}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Use a URL shortener like bit.ly for cleaner sharing.
            </p>
          </div>
        )}

        {/* Generated URLs (bulk mode) */}
        {bulkMode && bulkGenerated.length > 0 && (
          <div className="mt-8">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">
                Generated URLs ({bulkGenerated.filter((b) => b.generated).length})
              </span>
              <button
                onClick={handleCopyAll}
                className="flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                {copiedAll ? (
                  <>
                    <CheckIcon /> Copied All
                  </>
                ) : (
                  <>
                    <CopyIcon /> Copy All
                  </>
                )}
              </button>
            </div>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
              {bulkGenerated.map((item, i) => (
                <div key={i} className="px-4 py-3">
                  {!item.valid ? (
                    <p className="text-sm text-red-500">
                      Invalid URL: {item.base}
                    </p>
                  ) : item.generated ? (
                    <div className="group flex items-start gap-2">
                      <p className="min-w-0 flex-1 break-all font-mono text-xs text-gray-700">
                        {item.generated}
                      </p>
                      <button
                        onClick={() => handleCopyBulkItem(item.generated, i)}
                        className="shrink-0 text-gray-400 transition-colors hover:text-gray-700"
                        title="Copy"
                      >
                        {copiedIndex === i ? (
                          <CheckIcon />
                        ) : (
                          <CopyIcon />
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Fill in required UTM fields to generate
                    </p>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Use a URL shortener like bit.ly for cleaner sharing.
            </p>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="mt-12">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-500">
                Recent ({history.length})
              </h2>
              <button
                onClick={clearHistory}
                className="text-xs text-gray-400 transition-colors hover:text-gray-600"
              >
                Clear history
              </button>
            </div>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white shadow-sm">
              {history.map((entry, i) => (
                <div
                  key={i}
                  className="group flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-gray-700">
                      {entry.url}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-400">
                      <span>{entry.campaign}</span>
                      <span>&middot;</span>
                      <span>
                        {new Date(entry.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => loadFromHistory(entry)}
                      className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Load into form"
                    >
                      <LoadIcon />
                    </button>
                    <button
                      onClick={() => handleCopy(entry.url)}
                      className="rounded px-2 py-1 text-xs text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                      title="Copy URL"
                    >
                      <CopyIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <ReferencePanel
          id="utm-guide"
          title="UTM parameters — what each one actually does"
          summary="Five parameters; only three are really essential."
          defaultOpen
        >
          <div className="space-y-1">
            <RuleRow rule="utm_source" explanation="Where the traffic came from. The specific platform or publication." example="google, newsletter, linkedin" />
            <RuleRow rule="utm_medium" explanation="The type of traffic — the 'how'." example="cpc, email, social, referral" />
            <RuleRow rule="utm_campaign" explanation="The marketing campaign or initiative." example="spring-launch, q3-webinar" />
            <RuleRow rule="utm_term" explanation="Paid-search keyword. Optional." example="retargeting+software" />
            <RuleRow rule="utm_content" explanation="Distinguishes variants — use for A/B tests or multiple links on one page." example="cta-top, cta-footer" />
          </div>
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
            <strong>GA4 note:</strong> Google Analytics 4 adds <code>utm_source_platform</code>,
            <code>utm_creative_format</code>, and <code>utm_marketing_tactic</code>. They&apos;re
            optional — most teams stick with the original five.
          </div>
        </ReferencePanel>

        <ReferencePanel
          id="utm-naming"
          title="Naming conventions that don't fall apart at scale"
          summary="The rules that keep your analytics tidy after 200 campaigns."
          defaultOpen={false}
        >
          <ul className="space-y-3 text-xs">
            <li><strong>Always lowercase.</strong> <code>Facebook</code> and <code>facebook</code> become two different sources in most analytics tools. Pick lowercase once and enforce it.</li>
            <li><strong>Never use spaces.</strong> Use hyphens (<code>spring-launch</code>) or underscores (<code>spring_launch</code>) — not both. Pick one.</li>
            <li><strong>Keep mediums to a small set.</strong> <code>cpc</code>, <code>email</code>, <code>social</code>, <code>referral</code>, <code>organic</code>, <code>affiliate</code>. If your team uses 30 different mediums, filtering becomes useless.</li>
            <li><strong>Campaign name = what a human would call it.</strong> <code>q3-launch-webinar</code> beats <code>fb_v2_final_final</code>.</li>
            <li><strong>utm_content is for variants of the same link.</strong> Not a dumping ground for extra notes. Think: which CTA on the page? which button variant?</li>
            <li><strong>Document it.</strong> Keep a short Notion/Sheet with your naming rules. Future-you will thank present-you.</li>
          </ul>
        </ReferencePanel>
      </div>
    </div>
  );
}

// --- Inline SVG Icons ---

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function LoadIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  );
}
