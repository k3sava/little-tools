"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Select } from "@/components/tools/controls";

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
const ACCENT = "#f43f5e";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadClips(): Clip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((c: Clip) => ({ ...c, tags: c.tags || [] }));
  } catch {
    return [];
  }
}

function saveClips(clips: Clip[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clips));
  } catch {
    /* */
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
    /* */
  }
}

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

  const [templateName, setTemplateName] = useState("");
  const [templateBody, setTemplateBody] = useState("");

  const [fillingTemplate, setFillingTemplate] = useState<Template | null>(null);
  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [templateCopied, setTemplateCopied] = useState(false);

  useEffect(() => {
    setClips(loadClips());
    setTemplates(loadTemplates());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) saveClips(clips);
  }, [clips, mounted]);

  useEffect(() => {
    if (mounted) saveTemplates(templates);
  }, [templates, mounted]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const clip of clips) for (const tag of clip.tags) set.add(tag);
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
        { id: generateId(), text, pinned: false, createdAt: Date.now(), tags },
        ...prev,
      ];
    });
    setInput("");
    setTagsInput("");
    inputRef.current?.focus();
  }, [input, tagsInput]);

  useKeyboardShortcuts(
    useMemo(
      () => [{ key: "Enter", meta: true, action: () => addClip(), label: "Save clip" }],
      [addClip]
    )
  );

  const deleteClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const togglePin = useCallback((id: string) => {
    setClips((prev) => prev.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)));
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

  const pasteImport = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.trim()) {
        setInput(text);
        inputRef.current?.focus();
      }
    } catch {
      /* */
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

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const importedClips: Clip[] = Array.isArray(parsed) ? parsed : parsed.clips || [];
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
              .filter((t: Template) => t.name && !existingNames.has(t.name))
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
        /* */
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const addTemplate = useCallback(() => {
    const name = templateName.trim();
    const body = templateBody.trim();
    if (!name || !body) return;
    setTemplates((prev) => [
      { id: generateId(), name, body, createdAt: Date.now() },
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

  const filteredClips = useMemo(() => {
    const q = search.toLowerCase().trim();
    let filtered = clips;
    if (q) {
      filtered = filtered.filter(
        (c) => c.text.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: 40,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid var(--kami-border-strong)",
    background: "var(--kami-input-bg, var(--kami-surface-solid))",
    color: "var(--kami-text)",
    outline: "none",
    fontSize: 14,
  };

  const actions = (
    <>
      <ToolActionButton variant="ghost" onClick={pasteImport}>
        Paste
      </ToolActionButton>
      <ToolActionButton variant="ghost" onClick={() => fileInputRef.current?.click()}>
        Import
      </ToolActionButton>
      <ToolActionButton variant="outline" onClick={handleExportAll}>
        Export JSON
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={addClip} disabled={!input.trim()}>
        Save
      </ToolActionButton>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </>
  );

  const controls = (
    <>
      <ControlGroup label="View">
        <Segment<ActiveTab>
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: "clips", label: `Clips (${clips.length})` },
            { value: "templates", label: `Templates (${templates.length})` },
          ]}
          full
        />
      </ControlGroup>

      {activeTab === "clips" && (
        <>
          <ControlGroup label="Search">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search clips..."
              style={inputStyle}
            />
          </ControlGroup>

          {allTags.length > 0 && (
            <ControlGroup label="Filter by tag">
              <Select
                value={tagFilter}
                onChange={setTagFilter}
                options={[
                  { value: "", label: "All tags" },
                  ...allTags.map((t) => ({ value: t, label: t })),
                ]}
              />
            </ControlGroup>
          )}

          <ControlGroup label="New clip">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste or type text…"
              style={{ ...inputStyle, minHeight: 100, paddingTop: 8 }}
              rows={4}
            />
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tags (comma-separated)"
              style={inputStyle}
            />
            <p className="text-xs" style={{ color: "var(--kami-text-muted)" }}>
              {input.trim() ? `${input.trim().length} chars · ⌘↵ to save` : "⌘↵ to save"}
            </p>
          </ControlGroup>

          <ControlGroup>
            <button onClick={clearAll} className="tool-action-btn" data-variant="outline">
              Clear unpinned
            </button>
          </ControlGroup>
        </>
      )}

      {activeTab === "templates" && (
        <ControlGroup label="New template">
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="Template name"
            style={inputStyle}
          />
          <textarea
            value={templateBody}
            onChange={(e) => setTemplateBody(e.target.value)}
            placeholder="Body. Use {{var}} placeholders."
            style={{ ...inputStyle, minHeight: 100, paddingTop: 8 }}
            rows={4}
          />
          <button
            onClick={addTemplate}
            disabled={!templateName.trim() || !templateBody.trim()}
            className="tool-action-btn"
            data-variant="solid"
          >
            Save template
          </button>
        </ControlGroup>
      )}
    </>
  );

  return (
    <ToolShell
      title="Clipboard Manager"
      tagline="Local-only clipboard history with templates."
      accent={ACCENT}
      actions={actions}
      controls={controls}
      controlsLabel="Tools"
    >
      <div className="flex flex-col gap-2">
        {activeTab === "clips" && mounted && (
          <>
            {filteredClips.length === 0 && clips.length > 0 && (search || tagFilter) && (
              <p className="py-8 text-center text-sm" style={{ color: "var(--kami-text-muted)" }}>
                No clips match your search
              </p>
            )}
            {filteredClips.length === 0 && clips.length === 0 && (
              <p className="py-8 text-center text-sm" style={{ color: "var(--kami-text-muted)" }}>
                No clips yet. Use the panel to save your first clip.
              </p>
            )}
            {filteredClips.map((clip) => (
              <div
                key={clip.id}
                className="group flex items-start gap-3 rounded-xl border p-3"
                style={
                  clip.pinned
                    ? {
                        background: "color-mix(in srgb, #f59e0b 10%, var(--kami-surface-solid))",
                        borderColor: "color-mix(in srgb, #f59e0b 35%, var(--kami-border-strong))",
                      }
                    : {
                        background: "var(--kami-surface-solid)",
                        borderColor: "var(--kami-border-strong)",
                      }
                }
              >
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap break-words text-sm">
                    {truncate(clip.text, 500)}
                  </p>
                  {clip.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {clip.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setTagFilter(tag)}
                          className="inline-flex rounded-full border px-2 py-0.5 text-[10px]"
                          style={{
                            background: "var(--kami-surface)",
                            color: "var(--kami-text-muted)",
                            borderColor: "var(--kami-border)",
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  <p className="mt-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                    {timeAgo(clip.createdAt)}
                    {clip.text.length > 500 && ` · ${clip.text.length} chars`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => togglePin(clip.id)}
                    title={clip.pinned ? "Unpin" : "Pin"}
                    className="tool-shell-icon-btn"
                    style={{ color: clip.pinned ? "#f59e0b" : undefined }}
                  >
                    {clip.pinned ? "★" : "☆"}
                  </button>
                  <button
                    onClick={() => copyToClipboard(clip.text, clip.id)}
                    title="Copy"
                    className="tool-shell-icon-btn"
                  >
                    {copiedId === clip.id ? "✓" : "⎘"}
                  </button>
                  <button
                    onClick={() => deleteClip(clip.id)}
                    title="Delete"
                    className="tool-shell-icon-btn"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {activeTab === "templates" && mounted && (
          <>
            {templates.length === 0 && (
              <p className="py-8 text-center text-sm" style={{ color: "var(--kami-text-muted)" }}>
                No templates yet. Use the panel to add one.
              </p>
            )}
            {templates.map((tmpl) => {
              const vars = extractVariables(tmpl.body);
              return (
                <div
                  key={tmpl.id}
                  className="rounded-xl border p-3"
                  style={{
                    background: "var(--kami-surface-solid)",
                    borderColor: "var(--kami-border-strong)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium">{tmpl.name}</h3>
                      <p
                        className="mt-1 whitespace-pre-wrap break-words text-sm"
                        style={{ color: "var(--kami-text-muted)" }}
                      >
                        {truncate(tmpl.body, 300)}
                      </p>
                      {vars.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {vars.map((v) => (
                            <span
                              key={v}
                              className="inline-flex rounded-full px-2 py-0.5 text-[10px]"
                              style={{
                                background:
                                  "color-mix(in srgb, #3b82f6 12%, var(--kami-surface-solid))",
                                color: "color-mix(in srgb, #3b82f6 65%, var(--kami-text))",
                              }}
                            >
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="mt-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                        {timeAgo(tmpl.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => openFillModal(tmpl)}
                        title="Use"
                        className="tool-shell-icon-btn"
                      >
                        →
                      </button>
                      <button
                        onClick={() => deleteTemplate(tmpl.id)}
                        title="Delete"
                        className="tool-shell-icon-btn"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}

        {fillingTemplate && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setFillingTemplate(null)}
          >
            <div
              className="w-full max-w-md rounded-2xl p-6"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold">{fillingTemplate.name}</h3>
              <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Fill in variables.
              </p>
              <div className="mt-4 space-y-3">
                {extractVariables(fillingTemplate.body).map((varName) => (
                  <div key={varName}>
                    <label
                      className="block text-sm font-medium"
                      style={{ color: "var(--kami-text-muted)" }}
                    >
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
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
              <div
                className="mt-4 rounded-md p-3"
                style={{ background: "var(--kami-surface)", border: "1px solid var(--kami-border)" }}
              >
                <p
                  className="mb-1 text-xs font-medium"
                  style={{ color: "var(--kami-text-muted)" }}
                >
                  Preview
                </p>
                <p
                  className="whitespace-pre-wrap break-words text-sm"
                  style={{ color: "var(--kami-text-muted)" }}
                >
                  {fillTemplate(fillingTemplate.body, templateValues)}
                </p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setFillingTemplate(null)}
                  className="tool-action-btn"
                  data-variant="outline"
                >
                  Cancel
                </button>
                <button onClick={handleFillAndCopy} className="tool-action-btn" data-variant="solid">
                  {templateCopied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
