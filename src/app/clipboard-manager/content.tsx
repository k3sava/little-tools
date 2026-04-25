"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { ToolIntro } from "@/components/tools/tool-intro";

// --- Types ---

interface Clip {
  id: string;
  text: string;
  pinned: boolean;
  createdAt: number;
  tags: string[];
}

interface Template {
  id: string;
  name: string;
  body: string;
  createdAt: number;
}

const STORAGE_KEY = "kami-clipboard-clips";
const TEMPLATES_STORAGE_KEY = "kami-clipboard-templates";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// --- Persistence ---

function loadClips(): Clip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Migrate old clips without tags
    return parsed.map((c: Clip) => ({ ...c, tags: c.tags || [] }));
  } catch {
    return [];
  }
}

function saveClips(clips: Clip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  } catch {
    // localStorage full or unavailable
  }
}

function loadTemplates(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function saveTemplates(templates: Template[]) {
  try {
    localStorage.setItem(TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // localStorage full or unavailable
  }
}

// --- Helpers ---

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function extractVariables(body: string): string[] {
  const matches = body.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  const unique = new Set(matches.map((m) => m.slice(2, -2)));
  return Array.from(unique);
}

function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (_, name) => values[name] || "");
}

// --- Component ---

type ActiveTab = "clips" | "templates";

export default function ClipboardManagerContent() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [input, setInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("clips");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Template form state
  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  // Template fill modal state
  const [fillingTemplate, setFillingTemplate] = useState<Template | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>(
    {}
  );
  const [templateCopied, setTemplateCopied] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setClips(loadClips());
    setTemplates(loadTemplates());
    setMounted(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (mounted) saveClips(clips);
  }, [clips, mounted]);

  useEffect(() => {
    if (mounted) saveTemplates(templates);
  }, [templates, mounted]);

  // All unique tags across clips
  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const clip of clips) {
      for (const tag of clip.tags) {
        set.add(tag);
      }
    }
    return Array.from(set).sort();
  }, [clips]);

  const addClip = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    setClips((prev) => {
      if (prev.some((c) => c.text === text)) return prev;
      return [
        {
          id: generateId(),
          text,
          pinned: false,
          createdAt: Date.now(),
          tags,
        },
        ...prev,
      ];
    });
    setInput("");
    setTagsInput("");
    inputRef.current?.focus();
  }, [input, tagsInput]);

  useKeyboardShortcuts(useMemo(() => [
    { key: "Enter", meta: true, action: () => addClip(), label: "Save clip" },
  ], [addClip]));

  const deleteClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setClips((prev) =>
      prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c))
    );
  }, []);

  const copyToClipboard = useCallback(async (text: string, id?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 1500);
      }
    }
  }, []);

  const clearAll = useCallback(() => {
    setClips((prev) => prev.filter((c) => c.pinned));
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        addClip();
      }
    },
    [addClip]
  );

  // Export all clips as JSON
  const handleExportAll = useCallback(() => {
    const data = JSON.stringify({ clips, templates }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "clipboard-manager-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }, [clips, templates]);

  // Import clips from JSON
  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          // Support both { clips, templates } and raw array formats
          const importedClips: Clip[] = Array.isArray(parsed)
            ? parsed
            : parsed.clips || [];
          const importedTemplates: Template[] = parsed.templates || [];

          if (importedClips.length > 0) {
            setClips((prev) => {
              const existingTexts = new Set(prev.map((c) => c.text));
              const newClips = importedClips
                .filter((c: Clip) => c.text && !existingTexts.has(c.text))
                .map((c: Clip) => ({
                  id: c.id || generateId(),
                  text: c.text,
                  pinned: c.pinned || false,
                  createdAt: c.createdAt || Date.now(),
                  tags: c.tags || [],
                }));
              return [...prev, ...newClips];
            });
          }

          if (importedTemplates.length > 0) {
            setTemplates((prev) => {
              const existingNames = new Set(prev.map((t) => t.name));
              const newTemplates = importedTemplates
                .filter(
                  (t: Template) => t.name && !existingNames.has(t.name)
                )
                .map((t: Template) => ({
                  id: t.id || generateId(),
                  name: t.name,
                  body: t.body,
                  createdAt: t.createdAt || Date.now(),
                }));
              return [...prev, ...newTemplates];
            });
          }
        } catch {
          // Invalid JSON - silently ignore
        }
      };
      reader.readAsText(file);
      // Reset file input
      e.target.value = "";
    },
    []
  );

  // Template actions
  const addTemplate = useCallback(() => {
    const name = templateName.trim();
    const body = templateBody.trim();
    if (!name || !body) return;
    setTemplates((prev) => [
      {
        id: generateId(),
        name,
        body,
        createdAt: Date.now(),
      },
      ...prev,
    ]);
    setTemplateName("");
    setTemplateBody("");
  }, [templateName, templateBody]);

  const deleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const openFillModal = useCallback((template: Template) => {
    const vars = extractVariables(template.body);
    const initial: Record<string, string> = {};
    for (const v of vars) initial[v] = "";
    setTemplateValues(initial);
    setFillingTemplate(template);
    setTemplateCopied(false);
  }, []);

  const handleFillAndCopy = useCallback(async () => {
    if (!fillingTemplate) return;
    const result = fillTemplate(fillingTemplate.body, templateValues);
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = result;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setTemplateCopied(true);
    setTimeout(() => {
      setFillingTemplate(null);
      setTemplateCopied(false);
    }, 1200);
  }, [fillingTemplate, templateValues]);

  // Sort: pinned first, then by creation time (newest first)
  const filteredClips = useMemo(() => {
    const q = search.toLowerCase().trim();
    let filtered = clips;
    if (q) {
      filtered = filtered.filter(
        (c) =>
          c.text.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (tagFilter) {
      filtered = filtered.filter((c) => c.tags.includes(tagFilter));
    }
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.createdAt - a.createdAt;
    });
  }, [clips, search, tagFilter]);

  return (
    <div className="min-h-screen" style={{ color: "var(--kami-text)" }}>
      <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <ToolIntro
          title="Clipboard Manager"
          tagline="A local-only clipboard history - paste once, come back to it anytime. Search, pin, and reuse common snippets."
          description="Paste anything into the input to save it as a clip. Your history lives in your browser (nothing uploaded). Pin frequently-used snippets to the top, search across all saved clips, and one-click copy back into the system clipboard. Great for email templates, common support replies, or code snippets you keep typing."
          audience={["Support", "Writers", "Developers", "Sales"]}
          whenToUse={[
            "Managing a set of reply templates",
            "Stashing the last few things you copied",
            "Building a scratchpad of snippets for a single task",
          ]}
        />

        {/* Tab switcher */}
        <div
          className="mb-6 flex gap-1 p-1"
          style={{
            background: "var(--kami-surface)",
            border: "1px solid var(--kami-border)",
            borderRadius: "var(--kami-cta-radius, 0.5rem)",
          }}
        >
          <button
            onClick={() => setActiveTab("clips")}
            className="flex-1 px-3 py-1.5 text-sm font-medium transition-colors"
            style={
              activeTab === "clips"
                ? {
                    background: "var(--kami-surface-solid)",
                    color: "var(--kami-text)",
                    boxShadow: "var(--kami-card-shadow, none)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                  }
                : { color: "var(--kami-text-muted)", borderRadius: "var(--kami-cta-radius, 0.375rem)" }
            }
          >
            Clips
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className="flex-1 px-3 py-1.5 text-sm font-medium transition-colors"
            style={
              activeTab === "templates"
                ? {
                    background: "var(--kami-surface-solid)",
                    color: "var(--kami-text)",
                    boxShadow: "var(--kami-card-shadow, none)",
                    borderRadius: "var(--kami-cta-radius, 0.375rem)",
                  }
                : { color: "var(--kami-text-muted)", borderRadius: "var(--kami-cta-radius, 0.375rem)" }
            }
          >
            Templates
          </button>
        </div>

        {/* ===== CLIPS TAB ===== */}
        {activeTab === "clips" && (
          <>
            {/* Input area */}
            <div className="relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Paste or type text to save..."
                className="w-full px-4 py-3 text-base focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.75rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
                rows={3}
                autoFocus
              />
              <div className="mt-2 flex items-center gap-3">
                <input
                  type="text"
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="Tags (comma-separated)"
                  className="flex-1 px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: "var(--kami-input-bg, var(--kami-surface-solid))",
                    color: "var(--kami-text)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-input-radius, 0.5rem)",
                    boxShadow: "var(--kami-card-shadow, none)",
                  }}
                />
                <button
                  onClick={addClip}
                  disabled={!input.trim()}
                  className="px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: "var(--kami-cta-bg)",
                    color: "var(--kami-cta-text)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  }}
                >
                  Save Clip
                </button>
              </div>
              <div className="mt-1">
                <span className="text-xs" style={{ color: "var(--kami-text-dim)" }}>
                  {input.trim() ? `${input.trim().length} chars` : ""}
                </span>
              </div>
            </div>

            {/* Search + tag filter + actions */}
            {clips.length > 0 && (
              <div className="mt-8 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--kami-text-dim)" }}
                    >
                      <SearchIcon />
                    </span>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search clips..."
                      className="w-full py-2 pl-9 pr-3 text-sm focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                        boxShadow: "var(--kami-card-shadow, none)",
                      }}
                    />
                  </div>
                  {allTags.length > 0 && (
                    <select
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      className="px-3 py-2 text-sm focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                        boxShadow: "var(--kami-card-shadow, none)",
                      }}
                    >
                      <option value="">All tags</option>
                      {allTags.map((tag) => (
                        <option key={tag} value={tag}>
                          {tag}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={clearAll}
                    className="whitespace-nowrap px-3 py-2 text-sm transition-colors"
                    style={{
                      background: "var(--kami-surface-solid)",
                      color: "var(--kami-text-muted)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      boxShadow: "var(--kami-card-shadow, none)",
                    }}
                  >
                    Clear Unpinned
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportAll}
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={{
                      background: "var(--kami-surface-solid)",
                      color: "var(--kami-text-muted)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      boxShadow: "var(--kami-card-shadow, none)",
                    }}
                  >
                    Export All
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={{
                      background: "var(--kami-surface-solid)",
                      color: "var(--kami-text-muted)",
                      border: "1px solid var(--kami-border-strong)",
                      borderRadius: "var(--kami-cta-radius, 0.5rem)",
                      boxShadow: "var(--kami-card-shadow, none)",
                    }}
                  >
                    Import
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                </div>
              </div>
            )}

            {/* Clips list */}
            {mounted && (
              <div className="mt-6 space-y-2">
                {filteredClips.length === 0 && clips.length > 0 && (search || tagFilter) && (
                  <p className="py-8 text-center text-sm" style={{ color: "var(--kami-text-dim)" }}>
                    No clips match your search
                  </p>
                )}
                {filteredClips.length === 0 && clips.length === 0 && (
                  <p className="py-8 text-center text-sm" style={{ color: "var(--kami-text-dim)" }}>
                    No clips yet. Paste or type text above to save your first
                    clip.
                  </p>
                )}
                {filteredClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="group flex items-start gap-3 px-4 py-3 transition-colors"
                    style={
                      clip.pinned
                        ? {
                            background: "color-mix(in srgb, #f59e0b 10%, var(--kami-surface-solid))",
                            border: "1px solid color-mix(in srgb, #f59e0b 35%, var(--kami-border-strong))",
                            borderRadius: "var(--kami-card-radius, 0.75rem)",
                            boxShadow: "var(--kami-card-shadow, none)",
                          }
                        : {
                            background: "var(--kami-surface-solid)",
                            border: "1px solid var(--kami-border-strong)",
                            borderRadius: "var(--kami-card-radius, 0.75rem)",
                            boxShadow: "var(--kami-card-shadow, none)",
                          }
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words text-sm" style={{ color: "var(--kami-text)" }}>
                        {truncate(clip.text, 500)}
                      </p>
                      {clip.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {clip.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex px-2 py-0.5 text-[10px] font-medium"
                              style={{
                                background: "var(--kami-surface)",
                                color: "var(--kami-text-muted)",
                                border: "1px solid var(--kami-border)",
                                borderRadius: "999px",
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                        {timeAgo(clip.createdAt)}
                        {clip.text.length > 500 &&
                          ` · ${clip.text.length} chars`}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() => togglePin(clip.id)}
                        title={clip.pinned ? "Unpin" : "Pin"}
                        className="p-1.5 transition-colors"
                        style={{
                          color: clip.pinned ? "#f59e0b" : "var(--kami-text-dim)",
                          borderRadius: "var(--kami-cta-radius, 0.375rem)",
                        }}
                      >
                        <PinIcon filled={clip.pinned} />
                      </button>
                      <button
                        onClick={() => copyToClipboard(clip.text, clip.id)}
                        title="Copy"
                        className="p-1.5 transition-colors"
                        style={{
                          color: "var(--kami-text-dim)",
                          borderRadius: "var(--kami-cta-radius, 0.375rem)",
                        }}
                      >
                        {copiedId === clip.id ? (
                          <CheckIcon />
                        ) : (
                          <CopyIcon />
                        )}
                      </button>
                      <button
                        onClick={() => deleteClip(clip.id)}
                        title="Delete"
                        className="p-1.5 transition-colors"
                        style={{
                          color: "var(--kami-text-dim)",
                          borderRadius: "var(--kami-cta-radius, 0.375rem)",
                        }}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Keyboard shortcut hint */}
            {clips.length > 0 && (
              <p className="mt-4 text-center text-xs" style={{ color: "var(--kami-text-dim)" }}>
                Tip: Press{" "}
                <kbd
                  className="px-1 py-0.5 font-mono text-[10px]"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                  }}
                >
                  Cmd
                </kbd>
                +
                <kbd
                  className="px-1 py-0.5 font-mono text-[10px]"
                  style={{
                    background: "var(--kami-surface)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.25rem)",
                  }}
                >
                  Enter
                </kbd>{" "}
                to save quickly
              </p>
            )}
          </>
        )}

        {/* ===== TEMPLATES TAB ===== */}
        {activeTab === "templates" && (
          <>
            {/* Template creation form */}
            <div
              className="p-4"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 0.75rem)",
                boxShadow: "var(--kami-card-shadow, none)",
              }}
            >
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name"
                className="w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
              />
              <textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                placeholder={"Template body. Use {{variableName}} for placeholders.\n\nExample: Hi {{name}}, your order #{{orderId}} is ready."}
                className="mt-2 w-full px-3 py-2 text-sm focus:outline-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface-solid))",
                  color: "var(--kami-text)",
                  border: "1px solid var(--kami-border-strong)",
                  borderRadius: "var(--kami-input-radius, 0.5rem)",
                  boxShadow: "var(--kami-card-shadow, none)",
                }}
                rows={4}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={addTemplate}
                  disabled={!templateName.trim() || !templateBody.trim()}
                  className="px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    background: "var(--kami-cta-bg)",
                    color: "var(--kami-cta-text)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  }}
                >
                  Save Template
                </button>
              </div>
            </div>

            {/* Templates list */}
            {mounted && (
              <div className="mt-6 space-y-2">
                {templates.length === 0 && (
                  <p className="py-8 text-center text-sm" style={{ color: "var(--kami-text-dim)" }}>
                    No templates yet. Create one above with {"{{variables}}"} to
                    get started.
                  </p>
                )}
                {templates.map((tmpl) => {
                  const vars = extractVariables(tmpl.body);
                  return (
                    <div
                      key={tmpl.id}
                      className="group px-4 py-3"
                      style={{
                        background: "var(--kami-surface-solid)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-card-radius, 0.75rem)",
                        boxShadow: "var(--kami-card-shadow, none)",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-medium" style={{ color: "var(--kami-text)" }}>
                            {tmpl.name}
                          </h3>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm" style={{ color: "var(--kami-text-muted)" }}>
                            {truncate(tmpl.body, 300)}
                          </p>
                          {vars.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                              {vars.map((v) => (
                                <span
                                  key={v}
                                  className="inline-flex px-2 py-0.5 text-[10px] font-medium"
                                  style={{
                                    background: "color-mix(in srgb, #3b82f6 12%, var(--kami-surface-solid))",
                                    color: "color-mix(in srgb, #3b82f6 65%, var(--kami-text))",
                                    borderRadius: "999px",
                                  }}
                                >
                                  {`{{${v}}}`}
                                </span>
                              ))}
                            </div>
                          )}
                          <p className="mt-1 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                            {timeAgo(tmpl.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => openFillModal(tmpl)}
                            title="Use template"
                            className="p-1.5 transition-colors"
                            style={{
                              color: "var(--kami-text-dim)",
                              borderRadius: "var(--kami-cta-radius, 0.375rem)",
                            }}
                          >
                            <CopyIcon />
                          </button>
                          <button
                            onClick={() => deleteTemplate(tmpl.id)}
                            title="Delete"
                            className="p-1.5 transition-colors"
                            style={{
                              color: "var(--kami-text-dim)",
                              borderRadius: "var(--kami-cta-radius, 0.375rem)",
                            }}
                          >
                            <TrashIcon />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Template fill modal */}
        {fillingTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div
              className="w-full max-w-md p-6"
              style={{
                background: "var(--kami-surface-solid)",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius, 1rem)",
                boxShadow: "var(--kami-card-shadow, 0 10px 25px rgba(0,0,0,0.15))",
              }}
            >
              <h3 className="text-lg font-semibold" style={{ color: "var(--kami-text)" }}>
                {fillingTemplate.name}
              </h3>
              <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Fill in the variables below, then copy.
              </p>
              <div className="mt-4 space-y-3">
                {extractVariables(fillingTemplate.body).map((varName) => (
                  <div key={varName}>
                    <label className="block text-sm font-medium" style={{ color: "var(--kami-text-muted)" }}>
                      {varName}
                    </label>
                    <input
                      type="text"
                      value={templateValues[varName] || ""}
                      onChange={(e) =>
                        setTemplateValues((prev) => ({
                          ...prev,
                          [varName]: e.target.value,
                        }))
                      }
                      className="mt-1 w-full px-3 py-2 text-sm focus:outline-none"
                      style={{
                        background: "var(--kami-input-bg, var(--kami-surface-solid))",
                        color: "var(--kami-text)",
                        border: "1px solid var(--kami-border-strong)",
                        borderRadius: "var(--kami-input-radius, 0.5rem)",
                      }}
                      placeholder={`Enter ${varName}...`}
                    />
                  </div>
                ))}
              </div>
              {/* Preview */}
              <div
                className="mt-4 p-3"
                style={{
                  background: "var(--kami-surface)",
                  border: "1px solid var(--kami-border)",
                  borderRadius: "var(--kami-cta-radius, 0.5rem)",
                }}
              >
                <p className="text-xs font-medium mb-1" style={{ color: "var(--kami-text-muted)" }}>
                  Preview
                </p>
                <p className="whitespace-pre-wrap break-words text-sm" style={{ color: "var(--kami-text-muted)" }}>
                  {fillTemplate(fillingTemplate.body, templateValues)}
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setFillingTemplate(null)}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: "var(--kami-surface-solid)",
                    color: "var(--kami-text-muted)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleFillAndCopy}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{
                    background: "var(--kami-cta-bg)",
                    color: "var(--kami-cta-text)",
                    borderRadius: "var(--kami-cta-radius, 0.5rem)",
                  }}
                >
                  {templateCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
      </div>
    </div>
  );
}

// --- Inline SVG Icons ---

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

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

function PinIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V5a2 2 0 0 0 .8-1.6c0-.56-.31-1.06-.8-1.4H9c-.49.34-.8.84-.8 1.4A2 2 0 0 0 9 5z" />
    </svg>
  );
}

function TrashIcon() {
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
