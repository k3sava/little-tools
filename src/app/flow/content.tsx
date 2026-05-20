"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

type Branch = { type: "node"; id: string } | { type: "solution"; text: string };

interface TreeNode {
  id: string;
  question: string;
  yes: Branch;
  no: Branch;
}

interface Tree {
  title: string;
  nodes: TreeNode[];
  startId: string;
}

function newId() {
  return Math.random().toString(36).slice(2, 8);
}

function emptyTree(): Tree {
  const id = newId();
  return {
    title: "Troubleshooter",
    nodes: [
      {
        id,
        question: "Is the thing plugged in?",
        yes: { type: "solution", text: "Great. Try restarting it." },
        no: { type: "solution", text: "Plug it in first, then try again." },
      },
    ],
    startId: id,
  };
}

// ---------------------------------------------------------------------------
// URL serialisation
// ---------------------------------------------------------------------------

function encodeTree(tree: Tree): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(tree)));
  } catch {
    return "";
  }
}

function decodeTree(s: string): Tree | null {
  try {
    return JSON.parse(decodeURIComponent(atob(s)));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ACCENT = "#10b981";

type Mode = "build" | "preview";

export default function FlowContent() {

  const [tree, setTree] = useState<Tree>(emptyTree);
  const [selectedId, setSelectedId] = useState<string>("");
  const [mode, setMode] = useState<Mode>("build");
  const [previewNodeId, setPreviewNodeId] = useState<string>("");
  const [previewDone, setPreviewDone] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load from URL on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("t");
    if (encoded) {
      const decoded = decodeTree(encoded);
      if (decoded) {
        setTree(decoded);
        setSelectedId(decoded.startId);
        // If there's a tree in the URL, start in preview mode
        setMode("preview");
        setPreviewNodeId(decoded.startId);
        return;
      }
    }
    setSelectedId(tree.startId);
    setPreviewNodeId(tree.startId);
  }, []);

  const selectedNode = useMemo(
    () => tree.nodes.find((n) => n.id === selectedId) ?? tree.nodes[0],
    [tree, selectedId]
  );

  // ---------------------------------------------------------------------------
  // Tree mutations
  // ---------------------------------------------------------------------------

  const updateNode = useCallback((id: string, patch: Partial<TreeNode>) => {
    setTree((prev) => ({
      ...prev,
      nodes: prev.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)),
    }));
  }, []);

  const addNode = useCallback(() => {
    const id = newId();
    const newNode: TreeNode = {
      id,
      question: "New question",
      yes: { type: "solution", text: "Resolution for yes." },
      no: { type: "solution", text: "Resolution for no." },
    };
    setTree((prev) => ({ ...prev, nodes: [...prev.nodes, newNode] }));
    setSelectedId(id);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setTree((prev) => {
      const nodes = prev.nodes.filter((n) => n.id !== id);
      // Remove references to deleted node
      const cleaned = nodes.map((n) => ({
        ...n,
        yes: n.yes.type === "node" && n.yes.id === id
          ? { type: "solution" as const, text: "Node was deleted." }
          : n.yes,
        no: n.no.type === "node" && n.no.id === id
          ? { type: "solution" as const, text: "Node was deleted." }
          : n.no,
      }));
      const newStart = prev.startId === id ? (cleaned[0]?.id ?? "") : prev.startId;
      return { ...prev, nodes: cleaned, startId: newStart };
    });
    setSelectedId((prev) => (prev === id ? tree.nodes[0]?.id ?? "" : prev));
  }, [tree.nodes]);

  const setBranch = useCallback(
    (nodeId: string, dir: "yes" | "no", branch: Branch) => {
      setTree((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === nodeId ? { ...n, [dir]: branch } : n
        ),
      }));
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Share
  // ---------------------------------------------------------------------------

  const copyLink = useCallback(async () => {
    const encoded = encodeTree(tree);
    const url = `${window.location.origin}${window.location.pathname}?t=${encoded}`;
    window.history.replaceState({}, "", `?t=${encoded}`);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [tree]);

  // ---------------------------------------------------------------------------
  // Preview navigation
  // ---------------------------------------------------------------------------

  const previewNode = useMemo(
    () => tree.nodes.find((n) => n.id === previewNodeId) ?? tree.nodes[0],
    [tree, previewNodeId]
  );

  const handleAnswer = useCallback(
    (branch: Branch) => {
      if (branch.type === "solution") {
        setPreviewDone(branch.text);
      } else {
        setPreviewDone(null);
        setPreviewNodeId(branch.id);
      }
    },
    []
  );

  const resetPreview = useCallback(() => {
    setPreviewDone(null);
    setPreviewNodeId(tree.startId);
  }, [tree.startId]);

  const switchMode = useCallback(
    (m: Mode) => {
      setMode(m);
      if (m === "preview") {
        setPreviewNodeId(tree.startId);
        setPreviewDone(null);
      }
    },
    [tree.startId]
  );

  // ---------------------------------------------------------------------------
  // Styles
  // ---------------------------------------------------------------------------

  const cardStyle = {
    background: "var(--kami-surface-solid)",
    border: "1px solid var(--kami-border-strong)",
    borderRadius: "var(--kami-card-radius, 0.75rem)",
  } as const;

  // ---------------------------------------------------------------------------
  // Branch editor sub-component
  // ---------------------------------------------------------------------------

  function BranchEditor({ nodeId, dir, branch }: { nodeId: string; dir: "yes" | "no"; branch: Branch }) {
    const otherNodes = tree.nodes.filter((n) => n.id !== nodeId);
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium kami-text-dim">
            {dir === "yes" ? "✓ Yes →" : "✗ No →"}
          </span>
          <select
            value={branch.type === "node" ? `node:${branch.id}` : "solution"}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "solution") {
                setBranch(nodeId, dir, { type: "solution", text: branch.type === "solution" ? branch.text : "Resolution text." });
              } else {
                setBranch(nodeId, dir, { type: "node", id: v.replace("node:", "") });
              }
            }}
            className="text-xs px-2 py-1 rounded border flex-1"
            style={{
              background: "var(--kami-input-bg, var(--kami-surface))",
              border: "1px solid var(--kami-border-strong)",
              color: "var(--kami-text)",
            }}
          >
            <option value="solution">Solution (end)</option>
            {otherNodes.map((n) => (
              <option key={n.id} value={`node:${n.id}`}>
                → {n.question.slice(0, 40)}{n.question.length > 40 ? "…" : ""}
              </option>
            ))}
          </select>
        </div>
        {branch.type === "solution" && (
          <textarea
            value={branch.text}
            onChange={(e) => setBranch(nodeId, dir, { type: "solution", text: e.target.value })}
            rows={2}
            className="w-full text-xs px-3 py-2 rounded-lg border resize-none"
            style={{
              background: "var(--kami-input-bg, var(--kami-surface))",
              border: "1px solid var(--kami-border-strong)",
              color: "var(--kami-text)",
            }}
            placeholder="What should the user do?"
          />
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ToolShell
      title="Decision Flow"
      tagline="Build a troubleshooting tree. Share it as a link."
      accent={ACCENT}
      materialFab={{ label: "Copy Link", onClick: copyLink }}
      actions={
        <>
          <ToolActionButton onClick={() => switchMode(mode === "build" ? "preview" : "build")}>
            {mode === "build" ? "Preview" : "Edit"}
          </ToolActionButton>
          <ToolActionButton onClick={copyLink}>
            {copied ? "Copied!" : "Copy link"}
          </ToolActionButton>
        </>
      }
      controls={
        mode === "build" ? (
          <>
            <ControlGroup label="Flow title">
              <input
                type="text"
                value={tree.title}
                onChange={(e) => setTree((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm border"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface))",
                  border: "1px solid var(--kami-border-strong)",
                  color: "var(--kami-text)",
                }}
              />
            </ControlGroup>

            <ControlGroup label={`Questions (${tree.nodes.length})`}>
              <div className="flex flex-col gap-1">
                {tree.nodes.map((n) => (
                  <div
                    key={n.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedId(n.id)}
                    onKeyDown={(e) => e.key === "Enter" && setSelectedId(n.id)}
                    className="text-left px-3 py-2 rounded-lg text-xs leading-snug truncate cursor-pointer select-none"
                    style={{
                      background: n.id === selectedId ? ACCENT : "var(--kami-surface)",
                      color: n.id === selectedId ? "#fff" : "var(--kami-text)",
                      border: `1px solid ${n.id === selectedId ? ACCENT : "var(--kami-border-strong)"}`,
                    }}
                  >
                    {n.id === tree.startId && (
                      <span className="opacity-60 mr-1">[start]</span>
                    )}
                    {n.question.slice(0, 50)}{n.question.length > 50 ? "…" : ""}
                  </div>
                ))}
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={addNode}
                onKeyDown={(e) => e.key === "Enter" && addNode()}
                className="mt-2 w-full py-2 rounded-lg text-xs font-medium text-center cursor-pointer select-none"
                style={{
                  border: `1px dashed ${ACCENT}`,
                  color: ACCENT,
                  background: "transparent",
                }}
              >
                + Add question
              </div>
            </ControlGroup>

            {selectedNode && (
              <ControlGroup label="Start node">
                <div
                  role="button"
                  tabIndex={tree.startId === selectedNode.id ? -1 : 0}
                  onClick={() => tree.startId !== selectedNode.id && setTree((p) => ({ ...p, startId: selectedNode.id }))}
                  onKeyDown={(e) => e.key === "Enter" && tree.startId !== selectedNode.id && setTree((p) => ({ ...p, startId: selectedNode.id }))}
                  className="w-full py-2 rounded-lg text-xs font-medium text-center select-none"
                  style={{
                    background: tree.startId === selectedNode.id ? "var(--kami-border-strong)" : ACCENT,
                    color: tree.startId === selectedNode.id ? "var(--kami-text-dim)" : "#fff",
                    cursor: tree.startId === selectedNode.id ? "default" : "pointer",
                  }}
                >
                  {tree.startId === selectedNode.id ? "This is the start" : "Set as start"}
                </div>
              </ControlGroup>
            )}
          </>
        ) : (
          <ControlGroup label="Preview">
            <div
              role="button"
              tabIndex={0}
              onClick={resetPreview}
              onKeyDown={(e) => e.key === "Enter" && resetPreview()}
              className="w-full py-2 rounded-lg text-xs font-medium text-center cursor-pointer select-none"
              style={{ background: ACCENT, color: "#fff" }}
            >
              Restart flow
            </div>
          </ControlGroup>
        )
      }
    >
      <div className="glass-canvas-section">
      {mode === "build" && selectedNode ? (
        <div className="flex flex-col gap-4 w-full">
          <div className="p-5 flex flex-col gap-4" style={cardStyle}>
            <div>
              <p className="text-xs uppercase tracking-widest mb-2 kami-text-dim">
                Question
              </p>
              <textarea
                value={selectedNode.question}
                onChange={(e) => updateNode(selectedNode.id, { question: e.target.value })}
                rows={2}
                className="w-full text-sm px-3 py-2 rounded-lg border resize-none"
                style={{
                  background: "var(--kami-input-bg, var(--kami-surface))",
                  border: "1px solid var(--kami-border-strong)",
                  color: "var(--kami-text)",
                }}
              />
            </div>
            <div className="flex flex-col gap-3">
              <BranchEditor nodeId={selectedNode.id} dir="yes" branch={selectedNode.yes} />
              <BranchEditor nodeId={selectedNode.id} dir="no" branch={selectedNode.no} />
            </div>
            {tree.nodes.length > 1 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => deleteNode(selectedNode.id)}
                onKeyDown={(e) => e.key === "Enter" && deleteNode(selectedNode.id)}
                className="self-start text-xs px-3 py-1.5 rounded-lg cursor-pointer select-none"
                style={{ color: "var(--kami-error)", background: "var(--kami-error-bg)", border: "1px solid var(--kami-error-border)" }}
              >
                Delete this question
              </div>
            )}
          </div>

          <div className="p-4 rounded-lg text-xs" style={{ background: "var(--kami-surface)", border: "1px solid var(--kami-border-strong)", color: "var(--kami-text-dim)" }}>
            <strong className="kami-text">How it works:</strong> Build your questions above. Each question branches to either another question or a final resolution. When ready, click <em>Preview</em> to test it, then <em>Copy link</em> to share — no backend needed.
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 w-full">
          {/* Title */}
          <p className="text-xs uppercase tracking-widest kami-text-dim">
            {tree.title}
          </p>

          {previewDone !== null ? (
            <div className="p-6 flex flex-col gap-4" style={cardStyle}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <p className="text-sm font-medium mb-1 kami-text">
                    Resolution
                  </p>
                  <p className="text-sm leading-relaxed kami-text-dim">
                    {previewDone}
                  </p>
                </div>
              </div>
              <div
                role="button"
                tabIndex={0}
                onClick={resetPreview}
                onKeyDown={(e) => e.key === "Enter" && resetPreview()}
                className="self-start text-sm px-4 py-2 rounded-lg font-medium cursor-pointer select-none"
                style={{ background: ACCENT, color: "#fff" }}
              >
                Start over
              </div>
            </div>
          ) : previewNode ? (
            <div className="p-6 flex flex-col gap-5" style={cardStyle}>
              <p className="text-base font-medium leading-snug kami-text">
                {previewNode.question}
              </p>
              <div className="flex gap-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleAnswer(previewNode.yes)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnswer(previewNode.yes)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-center cursor-pointer select-none"
                  style={{ background: ACCENT, color: "#fff" }}
                >
                  Yes
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleAnswer(previewNode.no)}
                  onKeyDown={(e) => e.key === "Enter" && handleAnswer(previewNode.no)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-center cursor-pointer select-none"
                  style={{
                    border: "1px solid var(--kami-border-strong)",
                    color: "var(--kami-text)",
                    background: "var(--kami-surface)",
                  }}
                >
                  No
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm kami-text-dim">
              No questions yet. Switch to Edit mode to add some.
            </p>
          )}
        </div>
      )}
      </div>
    </ToolShell>
  );
}
