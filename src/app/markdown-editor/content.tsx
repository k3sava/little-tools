"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { marked } from "marked";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment, Toggle } from "@/components/tools/controls";

// --- Configure marked for GFM ---
marked.setOptions({
  gfm: true,
  breaks: true,
});

const TABS_STORAGE_KEY = "kami_markpad_tabs";
const SYNC_SCROLL_KEY = "kami_markpad_sync_scroll";

const DEFAULT_CONTENT = `# Welcome to Markdown Editor

A clean, **ad-free** Markdown editor with live preview.

## Features

- **GitHub-Flavored Markdown** — tables, task lists, code blocks
- **Live preview** — see changes as you type
- **Slash commands** — type \`/\` for a quick insert menu
- **Drag & drop** images — they're inlined as base64
- **Export** — HTML or PDF

## Try it out

### Task List

- [x] Write some Markdown
- [ ] Check the live preview
- [ ] Export your document

### Code Block

\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Table

| Feature | Status |
|---------|--------|
| GFM | ✓ |
| Tables | ✓ |
| Task Lists | ✓ |
`;

interface DocTab {
  id: string;
  content: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getTabTitle(content: string): string {
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^#\s+(.+)/);
    if (match) return match[1].trim().slice(0, 30);
  }
  return "Untitled";
}

const PREVIEW_STYLES = `
  .preview-content { color: var(--kami-text); font-family: Inter, system-ui, sans-serif; line-height: 1.7; }
  .preview-content h1 { font-size: 1.75em; font-weight: 700; margin: 0.67em 0 0.4em; border-bottom: 1px solid var(--kami-border); padding-bottom: 0.3em; }
  .preview-content h2 { font-size: 1.4em; font-weight: 600; margin: 1em 0 0.4em; border-bottom: 1px solid var(--kami-border); padding-bottom: 0.2em; }
  .preview-content h3 { font-size: 1.2em; font-weight: 600; margin: 1em 0 0.3em; }
  .preview-content h4 { font-size: 1em; font-weight: 600; margin: 1em 0 0.3em; }
  .preview-content p { margin: 0.8em 0; }
  .preview-content a { color: #6366f1; text-decoration: underline; }
  .preview-content code { background: var(--kami-surface); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .preview-content pre { background: var(--kami-surface); padding: 1em; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
  .preview-content pre code { background: none; padding: 0; font-size: 0.875em; }
  .preview-content blockquote { border-left: 4px solid var(--kami-border-strong); padding-left: 1em; color: var(--kami-text-muted); margin: 1em 0; }
  .preview-content ul, .preview-content ol { padding-left: 1.5em; margin: 0.5em 0; }
  .preview-content li { margin: 0.25em 0; }
  .preview-content li input[type="checkbox"] { margin-right: 0.5em; }
  .preview-content hr { border: none; border-top: 1px solid var(--kami-border-strong); margin: 1.5em 0; }
  .preview-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
  .preview-content th, .preview-content td { border: 1px solid var(--kami-border-strong); padding: 0.5em 0.75em; text-align: left; }
  .preview-content th { background: var(--kami-surface); font-weight: 600; }
  .preview-content img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
`;

function getExportHtml(content: string, title: string): string {
  const html = marked.parse(content) as string;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
  body { max-width: 800px; margin: 2em auto; padding: 0 1em; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; line-height: 1.6; color: #1f2937; }
  h1 { border-bottom: 1px solid #e5e7eb; padding-bottom: 0.3em; }
  h2 { border-bottom: 1px solid #e5e7eb; padding-bottom: 0.2em; }
  code { background: #f3f4f6; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }
  pre { background: #f3f4f6; padding: 1em; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 4px solid #e5e7eb; padding-left: 1em; color: #6b7280; margin-left: 0; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #e5e7eb; padding: 0.5em 0.75em; }
  th { background: #f9fafb; }
  img { max-width: 100%; }
</style>
</head>
<body>
${html}
</body>
</html>`;
}

// --- Slash command menu ---
interface SlashCommand {
  trigger: string;
  label: string;
  apply: (ctx: { insertBlock: (s: string) => void; insertAtLineStart: (s: string) => void; insertAtCursor: (b: string, a: string, def: string) => void }) => void;
}

const SLASH_COMMANDS: SlashCommand[] = [
  { trigger: "h1", label: "Heading 1", apply: ({ insertAtLineStart }) => insertAtLineStart("# ") },
  { trigger: "h2", label: "Heading 2", apply: ({ insertAtLineStart }) => insertAtLineStart("## ") },
  { trigger: "h3", label: "Heading 3", apply: ({ insertAtLineStart }) => insertAtLineStart("### ") },
  { trigger: "list", label: "Bullet list", apply: ({ insertAtLineStart }) => insertAtLineStart("- ") },
  { trigger: "ordered", label: "Ordered list", apply: ({ insertAtLineStart }) => insertAtLineStart("1. ") },
  { trigger: "task", label: "Task list", apply: ({ insertAtLineStart }) => insertAtLineStart("- [ ] ") },
  { trigger: "code", label: "Code block", apply: ({ insertBlock }) => insertBlock("```\ncode here\n```") },
  { trigger: "quote", label: "Blockquote", apply: ({ insertAtLineStart }) => insertAtLineStart("> ") },
  { trigger: "hr", label: "Horizontal rule", apply: ({ insertBlock }) => insertBlock("---") },
  { trigger: "table", label: "Table", apply: ({ insertBlock }) => insertBlock("| Header 1 | Header 2 |\n| --- | --- |\n|   |   |") },
  { trigger: "link", label: "Link", apply: ({ insertAtCursor }) => insertAtCursor("[", "](url)", "link text") },
  { trigger: "bold", label: "Bold", apply: ({ insertAtCursor }) => insertAtCursor("**", "**", "bold text") },
  { trigger: "italic", label: "Italic", apply: ({ insertAtCursor }) => insertAtCursor("*", "*", "italic text") },
];

export default function MarkdownEditorContent() {
  const [tabs, setTabs] = useState<DocTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [tabsLoaded, setTabsLoaded] = useState(false);

  const [paneView, setPaneView] = useState<"split" | "editor" | "preview">("split");
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const [syncScroll, setSyncScroll] = useState(true);
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0, lines: 0, readMin: 0 });
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFilter, setSlashFilter] = useState("");
  const [showTableDialog, setShowTableDialog] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isScrollingSynced = useRef(false);


  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  const content = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab?.content ?? "";
  }, [tabs, activeTabId]);

  const setContent = useCallback(
    (valOrFn: string | ((prev: string) => string)) => {
      setTabs((prev) =>
        prev.map((t) => {
          if (t.id !== activeTabId) return t;
          const newContent =
            typeof valOrFn === "function" ? valOrFn(t.content) : valOrFn;
          return { ...t, content: newContent };
        })
      );
    },
    [activeTabId]
  );

  useEffect(() => {
    const oldContent = localStorage.getItem("kami_markpad_content");
    const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as { tabs: DocTab[]; activeId: string };
        if (parsed.tabs && parsed.tabs.length > 0) {
          setTabs(parsed.tabs);
          setActiveTabId(
            parsed.tabs.find((t: DocTab) => t.id === parsed.activeId)
              ? parsed.activeId
              : parsed.tabs[0].id
          );
          setTabsLoaded(true);
        } else {
          throw new Error("empty");
        }
      } catch {
        const id = generateId();
        setTabs([{ id, content: oldContent ?? DEFAULT_CONTENT }]);
        setActiveTabId(id);
        setTabsLoaded(true);
      }
    } else {
      const id = generateId();
      setTabs([{ id, content: oldContent ?? DEFAULT_CONTENT }]);
      setActiveTabId(id);
      setTabsLoaded(true);
    }
    const savedSync = localStorage.getItem(SYNC_SCROLL_KEY);
    if (savedSync !== null) setSyncScroll(savedSync === "true");
  }, []);

  useEffect(() => {
    if (!tabsLoaded) return;
    const timeout = setTimeout(() => {
      localStorage.setItem(
        TABS_STORAGE_KEY,
        JSON.stringify({ tabs, activeId: activeTabId })
      );
    }, 500);
    return () => clearTimeout(timeout);
  }, [tabs, activeTabId, tabsLoaded]);

  useEffect(() => {
    localStorage.setItem(SYNC_SCROLL_KEY, String(syncScroll));
  }, [syncScroll]);

  useEffect(() => {
    const text = content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = content.length;
    const lines = content.split("\n").length;
    const readMin = Math.max(1, Math.round(words / 238));
    setWordCount({ words, chars, lines, readMin });
  }, [content]);

  const rendered = useMemo(() => {
    try {
      return marked.parse(content) as string;
    } catch {
      return "<p style='color:red'>Error rendering markdown</p>";
    }
  }, [content]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
    },
    [setContent]
  );

  const insertAtCursor = useCallback(
    (before: string, after: string = "", defaultText: string = "") => {
      const ta = editorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.slice(start, end);
      const text = selected || defaultText;
      const newVal =
        content.slice(0, start) + before + text + after + content.slice(end);
      setContent(newVal);
      requestAnimationFrame(() => {
        ta.focus();
        if (selected) {
          ta.selectionStart = start + before.length;
          ta.selectionEnd = start + before.length + text.length;
        } else {
          ta.selectionStart = start + before.length;
          ta.selectionEnd = start + before.length + defaultText.length;
        }
      });
    },
    [content, setContent]
  );

  const insertAtLineStart = useCallback(
    (prefix: string) => {
      const ta = editorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const lineStart = content.lastIndexOf("\n", start - 1) + 1;
      const newVal =
        content.slice(0, lineStart) + prefix + content.slice(lineStart);
      setContent(newVal);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd = start + prefix.length;
      });
    },
    [content, setContent]
  );

  const insertBlock = useCallback(
    (block: string) => {
      const ta = editorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const beforeChar = start > 0 ? content[start - 1] : "\n";
      const needsNewlineBefore = beforeChar !== "\n";
      const prefix = needsNewlineBefore ? "\n\n" : start === 0 ? "" : "\n";
      const newVal =
        content.slice(0, start) + prefix + block + "\n" + content.slice(start);
      setContent(newVal);
      requestAnimationFrame(() => {
        ta.focus();
        ta.selectionStart = ta.selectionEnd =
          start + prefix.length + block.length + 1;
      });
    },
    [content, setContent]
  );

  const generateTable = useCallback(() => {
    const rows = Math.max(2, tableRows);
    const cols = Math.max(1, tableCols);
    const header = "| " + Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(" | ") + " |";
    const separator = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
    const bodyRows = Array.from(
      { length: rows - 1 },
      () => "| " + Array.from({ length: cols }, () => "   ").join(" | ") + " |"
    );
    insertBlock([header, separator, ...bodyRows].join("\n"));
    setShowTableDialog(false);
  }, [tableRows, tableCols, insertBlock]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const newVal = content.slice(0, start) + "  " + content.slice(end);
        setContent(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + 2;
        });
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        insertAtCursor("**", "**", "bold text");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        insertAtCursor("*", "*", "italic text");
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        insertAtCursor("[", "](url)", "link text");
      }
      // Slash command trigger
      if (e.key === "/") {
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const prevChar = start > 0 ? content[start - 1] : "\n";
        if (prevChar === "\n" || prevChar === " " || start === 0) {
          setSlashOpen(true);
          setSlashFilter("");
        }
      }
      if (slashOpen && e.key === "Escape") {
        setSlashOpen(false);
      }
    },
    [content, setContent, insertAtCursor, slashOpen]
  );

  // Drag-and-drop images
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      const files = e.dataTransfer.files;
      if (!files.length) return;
      const file = files[0];
      if (!file.type.startsWith("image/")) return;
      e.preventDefault();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const ta = editorRef.current;
        if (!ta) return;
        const pos = ta.selectionStart;
        const img = `![${file.name}](${base64})\n`;
        setContent((c) => c.slice(0, pos) + img + c.slice(pos));
      };
      reader.readAsDataURL(file);
    },
    [setContent]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
    },
    []
  );

  const handleEditorScroll = useCallback(() => {
    if (!syncScroll || paneView !== "split" || isScrollingSynced.current) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;
    isScrollingSynced.current = true;
    const scrollRatio =
      editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
    preview.scrollTop = scrollRatio * (preview.scrollHeight - preview.clientHeight);
    requestAnimationFrame(() => {
      isScrollingSynced.current = false;
    });
  }, [syncScroll, paneView]);

  const handlePreviewScroll = useCallback(() => {
    if (!syncScroll || isScrollingSynced.current) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;
    isScrollingSynced.current = true;
    const scrollRatio =
      preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);
    editor.scrollTop = scrollRatio * (editor.scrollHeight - editor.clientHeight);
    requestAnimationFrame(() => {
      isScrollingSynced.current = false;
    });
  }, [syncScroll]);

  const exportHtml = useCallback(() => {
    const firstLine = content.split("\n").find((l) => l.trim()) ?? "document";
    const title = firstLine.replace(/^#+\s*/, "").trim() || "document";
    const html = getExportHtml(content, title);
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  const exportMd = useCallback(() => {
    const firstLine = content.split("\n").find((l) => l.trim()) ?? "document";
    const title = firstLine.replace(/^#+\s*/, "").trim() || "document";
    const blob = new Blob([content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [content]);

  const exportPdf = useCallback(() => {
    const firstLine = content.split("\n").find((l) => l.trim()) ?? "document";
    const title = firstLine.replace(/^#+\s*/, "").trim() || "document";
    const html = getExportHtml(content, title);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 300);
  }, [content]);

  const copyHtml = useCallback(async () => {
    const html = marked.parse(content) as string;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([content], { type: "text/plain" }),
        }),
      ]);
    } catch {
      await navigator.clipboard.writeText(content);
    }
  }, [content]);

  const importFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setContent(reader.result as string);
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [setContent]
  );

  const clearEditor = useCallback(() => {
    if (content.trim() && !window.confirm("Clear all content?")) return;
    setContent("");
  }, [content, setContent]);

  const addTab = useCallback(() => {
    const id = generateId();
    setTabs((prev) => [...prev, { id, content: "" }]);
    setActiveTabId(id);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev;
        const tab = prev.find((t) => t.id === tabId);
        if (tab && tab.content.trim()) {
          if (!window.confirm("Close this document?")) return prev;
        }
        const filtered = prev.filter((t) => t.id !== tabId);
        if (tabId === activeTabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const newActive = filtered[Math.min(idx, filtered.length - 1)];
          setActiveTabId(newActive.id);
        }
        return filtered;
      });
    },
    [activeTabId]
  );

  // Filtered slash commands
  const filteredSlash = useMemo(() => {
    const q = slashFilter.toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (c) => c.trigger.includes(q) || c.label.toLowerCase().includes(q)
    );
  }, [slashFilter]);

  const applySlash = useCallback((cmd: SlashCommand) => {
    // Remove the "/filter" the user typed
    const ta = editorRef.current;
    if (ta) {
      const start = ta.selectionStart;
      // Walk back to the most recent "/"
      let i = start - 1;
      while (i >= 0 && content[i] !== "/" && content[i] !== "\n") i--;
      if (i >= 0 && content[i] === "/") {
        const newVal = content.slice(0, i) + content.slice(start);
        setContent(newVal);
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = i;
          cmd.apply({ insertBlock, insertAtLineStart, insertAtCursor });
        });
        setSlashOpen(false);
        return;
      }
    }
    cmd.apply({ insertBlock, insertAtLineStart, insertAtCursor });
    setSlashOpen(false);
  }, [content, setContent, insertBlock, insertAtLineStart, insertAtCursor]);

  // Editor pane component
  const editorPane = (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs"
        style={{
          background: "var(--kami-surface)",
          borderBottom: "1px solid var(--kami-border)",
          color: "var(--kami-text-muted)",
        }}
      >
        <span>Markdown</span>
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarBtn onClick={() => insertAtCursor("**", "**", "bold text")} title="Bold (⌘B)">
            <b>B</b>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertAtCursor("*", "*", "italic text")} title="Italic (⌘I)">
            <i>I</i>
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertAtLineStart("# ")} title="H1">
            H1
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertAtLineStart("## ")} title="H2">
            H2
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertAtCursor("[", "](url)", "link")} title="Link (⌘K)">
            🔗
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertAtLineStart("- ")} title="List">
            •
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertAtLineStart("- [ ] ")} title="Task">
            ☑
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertBlock("```\ncode here\n```")} title="Code block">
            {"{}"}
          </ToolbarBtn>
          <ToolbarBtn onClick={() => setShowTableDialog(true)} title="Insert table">
            ⊞
          </ToolbarBtn>
          <ToolbarBtn onClick={() => insertBlock("---")} title="Horizontal rule">
            —
          </ToolbarBtn>
        </div>
      </div>
      <div className="relative flex-1 min-h-0">
        <textarea
          ref={editorRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onScroll={handleEditorScroll}
          spellCheck={false}
          className="absolute inset-0 w-full h-full resize-none p-4 font-mono text-sm leading-relaxed outline-none"
          style={{
            background: "var(--kami-input-bg, var(--kami-surface-solid))",
            color: "var(--kami-text)",
          }}
          placeholder='Type "/" for commands · drag images to inline · ⌘B bold · ⌘I italic · ⌘K link'
        />
        {slashOpen && (
          <div
            className="absolute z-20 px-1 py-1 min-w-[180px]"
            style={{
              top: 48,
              left: 16,
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.5rem)",
              boxShadow: "0 6px 24px rgba(0,0,0,0.15)",
            }}
          >
            <input
              autoFocus
              value={slashFilter}
              onChange={(e) => setSlashFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filteredSlash[0]) {
                  e.preventDefault();
                  applySlash(filteredSlash[0]);
                }
                if (e.key === "Escape") setSlashOpen(false);
              }}
              placeholder="Filter…"
              className="w-full px-2 py-1 text-xs mb-1 focus:outline-none"
              style={{
                background: "var(--kami-surface)",
                color: "var(--kami-text)",
                border: "1px solid var(--kami-border)",
                borderRadius: 4,
              }}
            />
            <div className="max-h-48 overflow-auto">
              {filteredSlash.map((cmd) => (
                <button
                  key={cmd.trigger}
                  type="button"
                  onClick={() => applySlash(cmd)}
                  className="w-full px-2 py-1 text-left text-xs flex justify-between"
                  style={{ color: "var(--kami-text)", borderRadius: 4 }}
                >
                  <span>{cmd.label}</span>
                  <span className="kami-text-dim">/{cmd.trigger}</span>
                </button>
              ))}
              {filteredSlash.length === 0 && (
                <div className="px-2 py-2 text-xs kami-text-dim">
                  No match
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const previewPane = (
    <div className="flex flex-col h-full min-h-0">
      <div
        className="px-3 py-1.5 text-xs"
        style={{
          background: "var(--kami-surface)",
          borderBottom: "1px solid var(--kami-border)",
          color: "var(--kami-text-muted)",
        }}
      >
        Preview
      </div>
      <div
        ref={previewRef}
        onScroll={handlePreviewScroll}
        className="flex-1 overflow-auto p-6"
        style={{ background: "var(--kami-surface-solid)" }}
      >
        <style suppressHydrationWarning>{PREVIEW_STYLES}</style>
        <div className="preview-content max-w-none" dangerouslySetInnerHTML={{ __html: rendered }} />
      </div>
    </div>
  );

  const controls = (
    <>
      <ControlGroup label="View">
        <Segment
          value={paneView}
          onChange={setPaneView}
          options={[
            { value: "split", label: "Split" },
            { value: "editor", label: "Editor" },
            { value: "preview", label: "Preview" },
          ]}
          full
        />
      </ControlGroup>
      <ControlGroup label="Options">
        <Toggle checked={syncScroll} onChange={setSyncScroll} label="Sync scroll" hint="Editor ↔ preview" />
      </ControlGroup>
      <ControlGroup label="Documents" hint={`${tabs.length} open`}>
        <div className="flex flex-col gap-1">
          {tabs.map((t) => (
            <div key={t.id} className="flex items-center gap-1">
              <button
                onClick={() => setActiveTabId(t.id)}
                data-active={t.id === activeTabId}
                className="kc-segment-btn flex-1 truncate text-left"
                style={{ minHeight: 44, padding: "6px 10px", justifyContent: "flex-start" }}
              >
                {getTabTitle(t.content)}
              </button>
              {tabs.length > 1 && (
                <button
                  onClick={() => closeTab(t.id)}
                  className="kc-segment-btn"
                  style={{ minHeight: 44, minWidth: 44 }}
                  aria-label="Close tab"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          <button onClick={addTab} className="kc-segment-btn" style={{ minHeight: 40 }}>
            + New document
          </button>
        </div>
      </ControlGroup>
      <ControlGroup label="Import / Export">
        <div className="flex flex-col gap-2">
          <button onClick={importFile} className="kc-segment-btn" style={{ minHeight: 40 }}>
            Import .md
          </button>
          <button onClick={exportMd} className="kc-segment-btn" style={{ minHeight: 40 }}>
            Download .md
          </button>
          <button onClick={exportHtml} className="kc-segment-btn" style={{ minHeight: 40 }}>
            Download HTML
          </button>
          <button onClick={exportPdf} className="kc-segment-btn" style={{ minHeight: 40 }}>
            Print / PDF
          </button>
          <button onClick={clearEditor} className="kc-segment-btn" style={{ minHeight: 40 }}>
            Clear document
          </button>
        </div>
      </ControlGroup>
    </>
  );

  const actions = (
    <>
      <span
        className="hidden md:inline-flex items-center text-xs px-2 kami-text-muted"
      >
        {wordCount.words} words · {wordCount.readMin} min read
      </span>
      <ToolActionButton variant="outline" onClick={copyHtml}>
        Copy HTML
      </ToolActionButton>
      <ToolActionButton variant="solid" onClick={exportMd}>
        Download .md
      </ToolActionButton>
    </>
  );

  return (
    <ToolShell
      title="Markdown Editor"
      tagline="Live preview · GFM · slash commands · drop images · export"
      accent="#6366f1"
      actions={actions}
      controls={controls}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={handleFileImport}
      />

      <div className="flex flex-col h-[calc(100dvh-220px)] min-h-[420px] md:h-[calc(100dvh-160px)]">
        {/* Metro in-canvas pivot */}
        <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Markdown</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>

        {/* Mobile: tab switcher between editor / preview */}
        <div className="md:hidden p-2 kami-border-bottom">
          <Segment
            value={mobileTab}
            onChange={setMobileTab}
            options={[
              { value: "editor", label: "Editor" },
              { value: "preview", label: "Preview" },
            ]}
            full
          />
        </div>

        {/* Mobile single-pane */}
        <div className="md:hidden flex-1 min-h-0">
          <div className="canvas-section glass-canvas-section flex-1 min-h-0" data-panel="input">
            {mobileTab === "editor" && <div className="glass-canvas-section">{editorPane}</div>}
          </div>
          <div className="canvas-section glass-canvas-section flex-1 min-h-0" data-panel="output">
            {mobileTab === "preview" && <div className="glass-canvas-section">{previewPane}</div>}
          </div>
        </div>

        {/* Desktop layout */}
        <div className="hidden md:flex flex-1 min-h-0">
          <div className="canvas-section glass-canvas-section flex-1 min-w-0" data-panel="input">
            {paneView !== "preview" && (
              <div
                className="flex-1 min-w-0 glass-canvas-section"
                style={{
                  borderRight: paneView === "split" ? "1px solid var(--kami-border)" : "none",
                }}
              >
                {editorPane}
              </div>
            )}
          </div>
          <div className="canvas-section glass-canvas-section flex-1 min-w-0" data-panel="output">
            {paneView !== "editor" && (
              <div className="flex-1 min-w-0 glass-canvas-section">{previewPane}</div>
            )}
          </div>
        </div>
      </div>


      {/* Table dialog */}
      {showTableDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowTableDialog(false)}
        >
          <div
            className="p-4 w-[280px]"
            style={{
              background: "var(--kami-surface-solid)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-card-radius, 0.75rem)",
              boxShadow: "0 12px 32px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-semibold mb-3 kami-text">
              Insert table
            </div>
            <div className="flex flex-col gap-3">
              <label className="text-xs flex items-center justify-between kami-text-muted">
                Rows
                <input
                  type="number"
                  value={tableRows}
                  onChange={(e) => setTableRows(Math.max(2, parseInt(e.target.value) || 2))}
                  min={2}
                  max={20}
                  className="w-16 px-2 py-1 text-sm focus:outline-none"
                  style={{
                    background: "var(--kami-input-bg, var(--kami-surface-solid))",
                    color: "var(--kami-text)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: 6,
                  }}
                />
              </label>
              <label className="text-xs flex items-center justify-between kami-text-muted">
                Columns
                <input
                  type="number"
                  value={tableCols}
                  onChange={(e) => setTableCols(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  max={10}
                  className="w-16 px-2 py-1 text-sm focus:outline-none"
                  style={{
                    background: "var(--kami-input-bg, var(--kami-surface-solid))",
                    color: "var(--kami-text)",
                    border: "1px solid var(--kami-border-strong)",
                    borderRadius: 6,
                  }}
                />
              </label>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => setShowTableDialog(false)}
                className="kc-segment-btn"
                style={{ minHeight: 44 }}
              >
                Cancel
              </button>
              <button
                onClick={generateTable}
                className="kc-segment-btn"
                data-active="true"
                style={{ minHeight: 44 }}
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolShell>
  );
}

function ToolbarBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="px-2 py-1 text-xs"
      style={{
        background: "transparent",
        color: "var(--kami-text-muted)",
        borderRadius: 4,
        minWidth: 28,
        minHeight: 28,
      }}
    >
      {children}
    </button>
  );
}
