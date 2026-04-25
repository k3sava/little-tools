"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { marked } from "marked";
import Link from "next/link";

// --- Configure marked for GFM ---
marked.setOptions({
  gfm: true,
  breaks: true,
});

const TABS_STORAGE_KEY = "kami_markpad_tabs";
const THEME_KEY = "kami_markpad_theme";
const SYNC_SCROLL_KEY = "kami_markpad_sync_scroll";

const DEFAULT_CONTENT = `# Welcome to Markdown Editor

A clean, **ad-free** Markdown editor with live preview.

## Features

- **GitHub-Flavored Markdown** - tables, task lists, code blocks
- **Live preview** - see changes as you type
- **Auto-save** - your work is saved in the browser
- **Export** - download as HTML or PDF
- **Dark mode** - easy on the eyes

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
| Code Blocks | ✓ |
| Auto-save | ✓ |

### Blockquote

> Markdown is intended to be as easy-to-read and easy-to-write as is feasible.
> - John Gruber

---

Start editing on the left to see your changes here!
`;

type Theme = "light" | "dark";

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

// --- Preview styles (injected into preview area) ---
function getPreviewStyles(theme: Theme): string {
  const bg = theme === "dark" ? "#1e1e1e" : "#ffffff";
  const text = theme === "dark" ? "#d4d4d4" : "#1f2937";
  const muted = theme === "dark" ? "#9ca3af" : "#6b7280";
  const border = theme === "dark" ? "#374151" : "#e5e7eb";
  const codeBg = theme === "dark" ? "#2d2d2d" : "#f3f4f6";
  const link = theme === "dark" ? "#60a5fa" : "#2563eb";
  const tableBg = theme === "dark" ? "#262626" : "#f9fafb";

  return `
    .preview-content { color: ${text}; background: ${bg}; font-family: Inter, system-ui, sans-serif; line-height: 1.7; }
    .preview-content h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0 0.4em; border-bottom: 1px solid ${border}; padding-bottom: 0.3em; }
    .preview-content h2 { font-size: 1.5em; font-weight: 600; margin: 1em 0 0.4em; border-bottom: 1px solid ${border}; padding-bottom: 0.2em; }
    .preview-content h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0 0.3em; }
    .preview-content h4 { font-size: 1em; font-weight: 600; margin: 1em 0 0.3em; }
    .preview-content p { margin: 0.8em 0; }
    .preview-content a { color: ${link}; text-decoration: underline; }
    .preview-content code { background: ${codeBg}; padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .preview-content pre { background: ${codeBg}; padding: 1em; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
    .preview-content pre code { background: none; padding: 0; font-size: 0.875em; }
    .preview-content blockquote { border-left: 4px solid ${border}; padding-left: 1em; color: ${muted}; margin: 1em 0; }
    .preview-content ul, .preview-content ol { padding-left: 1.5em; margin: 0.5em 0; }
    .preview-content li { margin: 0.25em 0; }
    .preview-content li input[type="checkbox"] { margin-right: 0.5em; }
    .preview-content hr { border: none; border-top: 1px solid ${border}; margin: 1.5em 0; }
    .preview-content table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    .preview-content th, .preview-content td { border: 1px solid ${border}; padding: 0.5em 0.75em; text-align: left; }
    .preview-content th { background: ${tableBg}; font-weight: 600; }
    .preview-content img { max-width: 100%; border-radius: 8px; margin: 1em 0; }
  `;
}

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

// --- Table Grid Selector Component ---
function TableGridSelector({
  isDark,
  onSelect,
  onClose,
}: {
  isDark: boolean;
  onSelect: (rows: number, cols: number) => void;
  onClose: () => void;
}) {
  const [hoverRow, setHoverRow] = useState(0);
  const [hoverCol, setHoverCol] = useState(0);
  const maxRows = 6;
  const maxCols = 6;

  const bg = isDark ? "bg-gray-800" : "bg-white";
  const border = isDark ? "border-gray-600" : "border-gray-200";
  const text = isDark ? "text-gray-300" : "text-gray-600";

  return (
    <div
      className={`absolute left-0 top-full mt-1 z-50 rounded-lg border ${border} ${bg} shadow-xl p-3`}
      onMouseLeave={() => {
        setHoverRow(0);
        setHoverCol(0);
      }}
    >
      <div className={`text-xs ${text} mb-2 text-center`}>
        {hoverRow > 0 && hoverCol > 0
          ? `${hoverRow} x ${hoverCol}`
          : "Select size"}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${maxCols}, 1fr)` }}>
        {Array.from({ length: maxRows * maxCols }, (_, i) => {
          const r = Math.floor(i / maxCols) + 1;
          const c = (i % maxCols) + 1;
          const isActive = r <= hoverRow && c <= hoverCol;
          return (
            <div
              key={i}
              className={`w-5 h-5 border rounded-sm cursor-pointer transition-colors ${
                isActive
                  ? isDark
                    ? "bg-blue-500 border-blue-400"
                    : "bg-blue-500 border-blue-400"
                  : isDark
                    ? "bg-gray-700 border-gray-600"
                    : "bg-gray-100 border-gray-300"
              }`}
              onMouseEnter={() => {
                setHoverRow(r);
                setHoverCol(c);
              }}
              onClick={() => {
                onSelect(r, c);
                onClose();
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function MarkdownEditorContent() {
  // --- Tabs state ---
  const [tabs, setTabs] = useState<DocTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");
  const [tabsLoaded, setTabsLoaded] = useState(false);

  const [theme, setTheme] = useState<Theme>("light");
  const [showPreview, setShowPreview] = useState(true);
  const [syncScroll, setSyncScroll] = useState(true);
  const [wordCount, setWordCount] = useState({ words: 0, chars: 0, lines: 0 });
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headingMenuRef = useRef<HTMLDivElement>(null);
  const tableGridRef = useRef<HTMLDivElement>(null);
  const isScrollingSynced = useRef(false);

  // Get current content from active tab
  const content = useMemo(() => {
    const tab = tabs.find((t) => t.id === activeTabId);
    return tab?.content ?? "";
  }, [tabs, activeTabId]);

  // Set content for active tab
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

  // Load saved tabs and theme
  useEffect(() => {
    // Migrate from old single-doc storage
    const oldContent = localStorage.getItem("kami_markpad_content");
    const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);

    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs) as {
          tabs: DocTab[];
          activeId: string;
        };
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

    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
    }

    const savedSync = localStorage.getItem(SYNC_SCROLL_KEY);
    if (savedSync !== null) {
      setSyncScroll(savedSync === "true");
    }

  }, []);

  // Auto-save tabs
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

  // Save theme
  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  // Save sync scroll preference
  useEffect(() => {
    localStorage.setItem(SYNC_SCROLL_KEY, String(syncScroll));
  }, [syncScroll]);

  // Word count
  useEffect(() => {
    const text = content.trim();
    const words = text ? text.split(/\s+/).length : 0;
    const chars = content.length;
    const lines = content.split("\n").length;
    setWordCount({ words, chars, lines });
  }, [content]);

  // Close heading menu and table grid on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        headingMenuRef.current &&
        !headingMenuRef.current.contains(e.target as Node)
      ) {
        setShowHeadingMenu(false);
      }
      if (
        tableGridRef.current &&
        !tableGridRef.current.contains(e.target as Node)
      ) {
        setShowTableGrid(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  // --- Insert markdown at cursor ---
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

  // Insert at line start (for headings, blockquotes, lists)
  const insertAtLineStart = useCallback(
    (prefix: string) => {
      const ta = editorRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      // Find the start of the current line
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

  // Insert block (for code blocks, tables, etc. -- adds newlines if needed)
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

  // Generate table markdown
  const generateTable = useCallback(
    (rows: number, cols: number) => {
      const header = "| " + Array.from({ length: cols }, (_, i) => `Header ${i + 1}`).join(" | ") + " |";
      const separator = "| " + Array.from({ length: cols }, () => "---").join(" | ") + " |";
      const bodyRows = Array.from(
        { length: rows - 1 },
        () => "| " + Array.from({ length: cols }, () => "   ").join(" | ") + " |"
      );
      const table = [header, separator, ...bodyRows].join("\n");
      insertBlock(table);
    },
    [insertBlock]
  );

  // Tab key inserts spaces + keyboard shortcuts
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

      // Ctrl/Cmd + B = Bold
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        insertAtCursor("**", "**", "bold text");
      }

      // Ctrl/Cmd + I = Italic
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        insertAtCursor("*", "*", "italic text");
      }

      // Ctrl/Cmd + K = Link
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const selected = content.slice(start, end);
        if (selected) {
          insertAtCursor("[", "](url)", "");
        } else {
          insertAtCursor("[", "](url)", "link text");
        }
      }
    },
    [content, setContent, insertAtCursor]
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

  // --- Scroll sync ---
  const handleEditorScroll = useCallback(() => {
    if (!syncScroll || !showPreview || isScrollingSynced.current) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    isScrollingSynced.current = true;
    const scrollRatio =
      editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
    preview.scrollTop =
      scrollRatio * (preview.scrollHeight - preview.clientHeight);
    requestAnimationFrame(() => {
      isScrollingSynced.current = false;
    });
  }, [syncScroll, showPreview]);

  const handlePreviewScroll = useCallback(() => {
    if (!syncScroll || isScrollingSynced.current) return;
    const editor = editorRef.current;
    const preview = previewRef.current;
    if (!editor || !preview) return;

    isScrollingSynced.current = true;
    const scrollRatio =
      preview.scrollTop / (preview.scrollHeight - preview.clientHeight || 1);
    editor.scrollTop =
      scrollRatio * (editor.scrollHeight - editor.clientHeight);
    requestAnimationFrame(() => {
      isScrollingSynced.current = false;
    });
  }, [syncScroll]);

  // Export HTML
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

  // Export PDF (via print)
  const exportPdf = useCallback(() => {
    const firstLine = content.split("\n").find((l) => l.trim()) ?? "document";
    const title = firstLine.replace(/^#+\s*/, "").trim() || "document";
    const html = getExportHtml(content, title);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
    }, 300);
  }, [content]);

  // Copy as rich text
  const copyRichText = useCallback(async () => {
    const html = marked.parse(content) as string;
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([content], { type: "text/plain" }),
        }),
      ]);
    } catch {
      // Fallback: copy plain text
      await navigator.clipboard.writeText(content);
    }
  }, [content]);

  // Import .md file
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

  // Clear editor
  const clearEditor = useCallback(() => {
    if (content.trim() && !window.confirm("Clear all content?")) return;
    setContent("");
  }, [content, setContent]);

  // --- Tab management ---
  const addTab = useCallback(() => {
    const id = generateId();
    setTabs((prev) => [...prev, { id, content: "" }]);
    setActiveTabId(id);
    requestAnimationFrame(() => editorRef.current?.focus());
  }, []);

  const closeTab = useCallback(
    (tabId: string) => {
      setTabs((prev) => {
        if (prev.length <= 1) return prev; // Don't close last tab
        const tab = prev.find((t) => t.id === tabId);
        if (tab && tab.content.trim()) {
          if (!window.confirm("Close this document? Unsaved changes will be lost."))
            return prev;
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

  const isDark = theme === "dark";
  // Kami-bound styles for light mode; dark mode keeps editor-internal palette
  const bgStyle: React.CSSProperties = isDark
    ? { background: "#1e1e1e" }
    : { background: "var(--kami-surface-solid)" };
  const editorBgStyle: React.CSSProperties = isDark
    ? { background: "#1e1e1e" }
    : { background: "var(--kami-input-bg, var(--kami-surface-solid))" };
  const pageBgStyle: React.CSSProperties = isDark
    ? { background: "#161616", color: "#e5e7eb" }
    : { color: "var(--kami-text)" };
  const textStyle: React.CSSProperties = isDark
    ? { color: "#e5e7eb" }
    : { color: "var(--kami-text)" };
  const mutedStyle: React.CSSProperties = isDark
    ? { color: "#9ca3af" }
    : { color: "var(--kami-text-muted)" };
  const borderStyle: React.CSSProperties = isDark
    ? { borderColor: "#374151" }
    : { borderColor: "var(--kami-border-strong)" };
  const btnStyle: React.CSSProperties = isDark
    ? {
        background: "#1f2937",
        color: "#e5e7eb",
        border: "1px solid #374151",
        borderRadius: "var(--kami-cta-radius, 0.5rem)",
      }
    : {
        background: "var(--kami-cta2-bg, var(--kami-surface-solid))",
        color: "var(--kami-cta2-text, var(--kami-text-muted))",
        border: "1px solid var(--kami-cta2-border, var(--kami-border-strong))",
        borderRadius: "var(--kami-cta-radius, 0.5rem)",
      };
  const toolbarBtnClass = isDark
    ? "text-gray-300 hover:bg-gray-700 hover:text-gray-100"
    : "hover:bg-gray-100";
  const toolbarBtnStyle: React.CSSProperties = isDark
    ? { color: "#d1d5db" }
    : { color: "var(--kami-text-muted)" };
  const toolbarBtnActive = isDark
    ? "bg-gray-700 text-gray-100"
    : "bg-gray-200 text-gray-900";

  const syncActiveStyle: React.CSSProperties = isDark
    ? { background: "#1e3a8a", borderColor: "#1e40af", color: "#bfdbfe" }
    : {
        background: "color-mix(in srgb, #2563eb 12%, var(--kami-surface))",
        border: "1px solid color-mix(in srgb, #2563eb 30%, transparent)",
        color: "color-mix(in srgb, #2563eb 70%, var(--kami-text))",
      };

  return (
    <div className="min-h-screen" style={pageBgStyle}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        className="hidden"
        onChange={handleFileImport}
      />

      {/* Toolbar */}
      <div
        className="sticky top-0 z-10 border-b px-4 py-2"
        style={{ ...bgStyle, ...borderStyle }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link
              href="/tools"
              className="text-sm"
              style={mutedStyle}
            >
              ← Tools
            </Link>
            <span className="text-sm font-semibold" style={textStyle}>
              Markdown Editor
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1.5 text-xs font-medium transition"
              style={btnStyle}
            >
              {showPreview ? "Editor Only" : "Split View"}
            </button>

            {/* Sync scroll toggle */}
            <button
              onClick={() => setSyncScroll(!syncScroll)}
              className="px-3 py-1.5 text-xs font-medium transition"
              style={syncScroll ? syncActiveStyle : btnStyle}
              title={syncScroll ? "Sync scroll: ON" : "Sync scroll: OFF"}
            >
              {syncScroll ? "Sync ↕ On" : "Sync ↕ Off"}
            </button>

            {/* Import */}
            <button
              onClick={importFile}
              className="px-3 py-1.5 text-xs font-medium transition"
              style={btnStyle}
            >
              Import
            </button>

            {/* Export dropdown */}
            <div className="relative group">
              <button
                className="px-3 py-1.5 text-xs font-medium transition"
                style={btnStyle}
              >
                Export ▾
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover:block">
                <div
                  className="border shadow-lg py-1 min-w-[140px]"
                  style={{
                    ...bgStyle,
                    ...borderStyle,
                    borderRadius: "var(--kami-card-radius, 0.5rem)",
                    boxShadow: "var(--kami-card-shadow, 0 4px 12px rgba(0,0,0,0.1))",
                  }}
                >
                  <button
                    onClick={exportHtml}
                    className="block w-full text-left px-3 py-1.5 text-xs"
                    style={mutedStyle}
                  >
                    Download HTML
                  </button>
                  <button
                    onClick={exportPdf}
                    className="block w-full text-left px-3 py-1.5 text-xs"
                    style={mutedStyle}
                  >
                    Print / Save PDF
                  </button>
                  <button
                    onClick={copyRichText}
                    className="block w-full text-left px-3 py-1.5 text-xs"
                    style={mutedStyle}
                  >
                    Copy Rich Text
                  </button>
                </div>
              </div>
            </div>

            {/* Clear */}
            <button
              onClick={clearEditor}
              className="px-3 py-1.5 text-xs font-medium transition"
              style={btnStyle}
            >
              Clear
            </button>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(isDark ? "light" : "dark")}
              className="px-3 py-1.5 text-xs font-medium transition"
              style={btnStyle}
            >
              {isDark ? "☀ Light" : "● Dark"}
            </button>
          </div>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div
        className="sticky top-[41px] z-10 border-b px-4 py-1"
        style={{ ...bgStyle, ...borderStyle }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-0.5 flex-wrap">
          {/* Bold */}
          <button
            onClick={() => insertAtCursor("**", "**", "bold text")}
            className={`rounded px-2 py-1 text-xs font-bold transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Bold (Ctrl+B)"
          >
            B
          </button>

          {/* Italic */}
          <button
            onClick={() => insertAtCursor("*", "*", "italic text")}
            className={`rounded px-2 py-1 text-xs italic transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Italic (Ctrl+I)"
          >
            I
          </button>

          <div
            className="mx-1 h-4 w-px"
            style={{ background: isDark ? "#4b5563" : "var(--kami-border-strong)" }}
          />

          {/* Heading dropdown */}
          <div className="relative" ref={headingMenuRef}>
            <button
              onClick={() => setShowHeadingMenu(!showHeadingMenu)}
              className={`rounded px-2 py-1 text-xs font-semibold transition ${toolbarBtnClass} ${showHeadingMenu ? toolbarBtnActive : ""}`}
              style={toolbarBtnStyle}
              title="Heading"
            >
              H ▾
            </button>
            {showHeadingMenu && (
              <div
                className="absolute left-0 top-full mt-1 z-50 border shadow-lg py-1 min-w-[100px]"
                style={{
                  ...bgStyle,
                  ...borderStyle,
                  borderRadius: "var(--kami-card-radius, 0.5rem)",
                  boxShadow: "var(--kami-card-shadow, 0 4px 12px rgba(0,0,0,0.1))",
                }}
              >
                {[1, 2, 3].map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      insertAtLineStart("#".repeat(level) + " ");
                      setShowHeadingMenu(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs transition ${toolbarBtnClass}`}
                    style={toolbarBtnStyle}
                  >
                    <span
                      style={{
                        fontSize: `${1.1 - level * 0.15}em`,
                        fontWeight: 600,
                      }}
                    >
                      Heading {level}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className="mx-1 h-4 w-px"
            style={{ background: isDark ? "#4b5563" : "var(--kami-border-strong)" }}
          />

          {/* Link */}
          <button
            onClick={() => insertAtCursor("[", "](url)", "link text")}
            className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Link (Ctrl+K)"
          >
            🔗
          </button>

          {/* Image */}
          <button
            onClick={() => insertAtCursor("![", "](image-url)", "alt text")}
            className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Image"
          >
            🖼
          </button>

          <div
            className="mx-1 h-4 w-px"
            style={{ background: isDark ? "#4b5563" : "var(--kami-border-strong)" }}
          />

          {/* Inline Code */}
          <button
            onClick={() => insertAtCursor("`", "`", "code")}
            className={`rounded px-2 py-1 text-xs font-mono transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Inline Code"
          >
            {"<>"}
          </button>

          {/* Code Block */}
          <button
            onClick={() =>
              insertBlock("```\n" + (content.slice(
                editorRef.current?.selectionStart ?? 0,
                editorRef.current?.selectionEnd ?? 0
              ) || "code here") + "\n```")
            }
            className={`rounded px-2 py-1 text-xs font-mono transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Code Block"
          >
            {"{ }"}
          </button>

          <div
            className="mx-1 h-4 w-px"
            style={{ background: isDark ? "#4b5563" : "var(--kami-border-strong)" }}
          />

          {/* Blockquote */}
          <button
            onClick={() => insertAtLineStart("> ")}
            className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Blockquote"
          >
            ❝
          </button>

          {/* Unordered List */}
          <button
            onClick={() => insertAtLineStart("- ")}
            className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Unordered List"
          >
            • List
          </button>

          {/* Ordered List */}
          <button
            onClick={() => insertAtLineStart("1. ")}
            className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Ordered List"
          >
            1. List
          </button>

          {/* Task List */}
          <button
            onClick={() => insertAtLineStart("- [ ] ")}
            className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Task List"
          >
            ☑ Task
          </button>

          <div
            className="mx-1 h-4 w-px"
            style={{ background: isDark ? "#4b5563" : "var(--kami-border-strong)" }}
          />

          {/* Table */}
          <div className="relative" ref={tableGridRef}>
            <button
              onClick={() => setShowTableGrid(!showTableGrid)}
              className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass} ${showTableGrid ? toolbarBtnActive : ""}`}
              style={toolbarBtnStyle}
              title="Insert Table"
            >
              ⊞ Table
            </button>
            {showTableGrid && (
              <TableGridSelector
                isDark={isDark}
                onSelect={generateTable}
                onClose={() => setShowTableGrid(false)}
              />
            )}
          </div>

          {/* Horizontal Rule */}
          <button
            onClick={() => insertBlock("---")}
            className={`rounded px-2 py-1 text-xs transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="Horizontal Rule"
          >
            --
          </button>
        </div>
      </div>

      {/* Document Tabs */}
      <div
        className="sticky top-[73px] z-10 border-b px-4"
        style={{ ...bgStyle, ...borderStyle }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center gap-0 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            const title = getTabTitle(tab.content);
            const tabBg = isActive
              ? bgStyle.background
              : isDark
                ? "#161616"
                : "transparent";
            const tabColor = isActive
              ? isDark
                ? "#e5e7eb"
                : "var(--kami-text)"
              : isDark
                ? "#9ca3af"
                : "var(--kami-text-muted)";
            return (
              <div
                key={tab.id}
                className="group relative flex items-center gap-1 border-r px-3 py-1.5 text-xs cursor-pointer select-none transition-colors"
                style={{
                  borderRightColor: isDark ? "#374151" : "var(--kami-border-strong)",
                  background: tabBg,
                  color: tabColor,
                  borderBottom: isActive ? "2px solid #3b82f6" : "none",
                }}
                onClick={() => setActiveTabId(tab.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  if (tabs.length > 1) closeTab(tab.id);
                }}
              >
                <span className="max-w-[120px] truncate">{title}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    className="ml-1 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: isDark ? "#9ca3af" : "var(--kami-text-dim)" }}
                    title="Close tab"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path d="M3 3l6 6M9 3l-6 6" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
          {/* Add tab button */}
          <button
            onClick={addTab}
            className={`px-3 py-1.5 text-xs font-medium transition ${toolbarBtnClass}`}
            style={toolbarBtnStyle}
            title="New document"
          >
            +
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div
        className="mx-auto max-w-[1600px]"
        style={{ height: "calc(100vh - 118px)" }}
      >
        <div className="flex h-full">
          {/* Editor pane */}
          <div
            className={`${showPreview ? "w-1/2" : "w-full"} flex flex-col border-r`}
            style={borderStyle}
          >
            <div
              className="px-4 py-1.5 text-xs border-b flex justify-between"
              style={{ ...mutedStyle, ...bgStyle, borderColor: borderStyle.borderColor }}
            >
              <span>Markdown</span>
              <span suppressHydrationWarning>
                {wordCount.words} words · {wordCount.chars} chars ·{" "}
                {wordCount.lines} lines
              </span>
            </div>
            <textarea
              ref={editorRef}
              value={content}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onScroll={handleEditorScroll}
              spellCheck={false}
              className="flex-1 resize-none p-4 font-mono text-sm leading-relaxed outline-none"
              style={{ ...editorBgStyle, ...textStyle }}
              placeholder="Start writing Markdown..."
            />
          </div>

          {/* Preview pane */}
          {showPreview && (
            <div className="w-1/2 flex flex-col">
              <div
                className="px-4 py-1.5 text-xs border-b"
                style={{ ...mutedStyle, ...bgStyle, borderColor: borderStyle.borderColor }}
              >
                Preview
              </div>
              <div
                ref={previewRef}
                onScroll={handlePreviewScroll}
                className="flex-1 overflow-auto p-6"
                style={bgStyle}
              >
                <style suppressHydrationWarning>{getPreviewStyles(theme)}</style>
                <div
                  className="preview-content max-w-none"
                  dangerouslySetInnerHTML={{ __html: rendered }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
