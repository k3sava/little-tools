"use client";

import { useMemo, useState, useEffect } from "react";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";
import { Segment } from "@/components/tools/controls";

const ACCENT = "#3b82f6";

interface Scored {
  i: number;
  text: string;
  chars: number;
  sizeScore: number;
  entityScore: number;
  numberScore: number;
  score: number;
}

type Filter = "all" | "weak";

function audit(input: string): { passages: Scored[]; total: number; mean: number } {
  const stripped = input
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "\n");

  const raw = stripped
    .split(/\n(?=#{1,6}\s|\n)/)
    .map((p) => p.trim())
    .filter((p) => p.length > 80);

  let total = 0;
  const passages: Scored[] = raw.map((p, i) => {
    const chars = p.length;
    const sizeScore =
      chars >= 200 && chars <= 1200 ? 1.0 : chars < 200 ? chars / 200 : 1200 / chars;
    const entityScore = /^[A-Z][A-Za-z0-9 ]{2,40}\b/.test(p) ? 0.2 : 0;
    const numberScore = /(\d+%|\$\d+|\d{2,})/.test(p) ? 0.2 : 0;
    const score = +(sizeScore + entityScore + numberScore).toFixed(2);
    total += score;
    return {
      i,
      text: p,
      chars,
      sizeScore: +sizeScore.toFixed(2),
      entityScore,
      numberScore,
      score,
    };
  });

  const mean = passages.length ? +(total / passages.length).toFixed(2) : 0;
  return { passages, total, mean };
}

const SAMPLE = `<h1>Sales software that closes faster</h1>
<p>Talk to leads in under 60 seconds.</p>
<h2>Why teams switch</h2>
<p>Most sales teams lose half their inbound leads to slow follow-up. We surveyed 412 reps in 2025 and found 73% of deals went to the first vendor that responded. Our software auto-routes incoming chats, calls, and emails to the rep most likely to close, then logs every interaction back to your CRM without manual entry.</p>
<h2>How it works</h2>
<p>Connect your inbox.</p>
<h3>Try free</h3>
<p>14 days, no credit card.</p>`;

function ratingColor(score: number): string {
  if (score >= 1.0) return "#10b981"; // emerald
  if (score >= 0.6) return "#f59e0b"; // amber
  return "#ef4444"; // rose
}

function csvEscape(s: string): string {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function PassageAuditContent() {
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState<Filter>("all");


  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");


  const result = useMemo(() => (input.trim() ? audit(input) : null), [input]);
  const weakest = useMemo(
    () => (result ? [...result.passages].sort((a, b) => a.score - b.score).slice(0, 3) : []),
    [result]
  );

  const visible = useMemo(() => {
    if (!result) return [];
    return filter === "weak" ? result.passages.filter((p) => p.score < 0.6) : result.passages;
  }, [result, filter]);

  const exportCsv = () => {
    if (!result) return;
    const header = ["#", "chars", "size", "entity", "number", "score", "preview"].join(",");
    const rows = result.passages.map((p) =>
      [
        p.i + 1,
        p.chars,
        p.sizeScore,
        p.entityScore ? 0.2 : 0,
        p.numberScore ? 0.2 : 0,
        p.score,
        csvEscape(p.text.slice(0, 200)),
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "passage-audit.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const actions = (
    <>
      <ToolActionButton variant="ghost" onClick={() => setInput(SAMPLE)}>
        Load sample
      </ToolActionButton>
      {result && result.passages.length > 0 && (
        <ToolActionButton variant="solid" onClick={exportCsv}>
          Export CSV
        </ToolActionButton>
      )}
    </>
  );

  const controls = (
    <>
      {result && result.passages.length > 0 && (
        <>
          <ControlGroup label="Stats">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Total" value={String(result.passages.length)} />
              <Stat label="Mean" value={result.mean.toFixed(2)} />
              <Stat
                label="< 0.6"
                value={String(result.passages.filter((p) => p.score < 0.6).length)}
                tone="warn"
              />
            </div>
          </ControlGroup>

          <ControlGroup label="Filter">
            <Segment<Filter>
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All" },
                { value: "weak", label: "Weak" },
              ]}
              full
            />
          </ControlGroup>
        </>
      )}

      <ControlGroup label="How scoring works">
        <ul
          className="list-disc space-y-1 pl-4 text-xs kami-text-muted"
        >
          <li>
            <strong className="kami-text">Size (0-1):</strong> 200-1200 chars is the
            sweet spot.
          </li>
          <li>
            <strong className="kami-text">Entity (+0.2):</strong> starts with a
            named entity.
          </li>
          <li>
            <strong className="kami-text">Number (+0.2):</strong> a percentage,
            $amount, or large number.
          </li>
        </ul>
        <p className="text-xs kami-text-muted">
          Max 1.4. Anything &lt; 0.6 should be rewritten.
        </p>
      </ControlGroup>
    </>
  );

  return (
    <ToolShell
      title="Passage Audit"
      tagline="See which passages on your page disappear when AI chunks it."
      accent={ACCENT}
      materialFab={{ label: "Export CSV", onClick: exportCsv }}
      actions={actions}
      controls={controls}
      controlsLabel="Insights"
    >
      <div className="flex flex-col gap-4">
        <nav className="canvas-metro-pivot" role="tablist" aria-label="View">
          <button role="tab" aria-selected={metroCPivot === "input"}
            className={`metro-pivot-item${metroCPivot === "input" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("input")}>Passage</button>
          <button role="tab" aria-selected={metroCPivot === "output"}
            className={`metro-pivot-item${metroCPivot === "output" ? " is-active" : ""}`}
            onClick={() => setMetroCPivot("output")}>Output</button>
        </nav>

        <div className="canvas-section glass-canvas-section" data-panel="input">
          <label
            htmlFor="input"
            className="mb-2 block text-sm font-medium kami-text"
          >
            Paste HTML or Markdown
          </label>
          <textarea
            id="input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="<h1>Your page</h1><p>...</p>"
            className="min-h-[180px] w-full rounded-lg border p-3 font-mono text-sm"
            style={{
              background: "var(--kami-input-bg, var(--kami-surface-solid))",
              borderColor: "var(--kami-border-strong)",
              color: "var(--kami-text)",
            }}
          />
        </div>

        {result && result.passages.length === 0 && (
          <p className="text-sm kami-text-muted">
            Nothing scored. Paste at least one passage longer than 80 characters.
          </p>
        )}

        {result && result.passages.length > 0 && (
          <div className="glass-canvas-section">
          <>
            <section>
              <h2 className="text-base font-semibold">Weakest passages</h2>
              <p className="mt-1 text-xs kami-text-muted">
                Rewrite these first.
              </p>
              <div className="mt-3 grid gap-2">
                {weakest.map((p) => (
                  <div
                    key={p.i}
                    className="rounded-lg border p-3"
                    style={{
                      background: "var(--kami-surface-solid)",
                      borderColor: "var(--kami-border-strong)",
                    }}
                  >
                    <div className="flex items-baseline justify-between gap-4">
                      <div
                        className="text-sm font-semibold"
                        style={{ color: ratingColor(p.score) }}
                      >
                        Score {p.score.toFixed(2)}
                      </div>
                      <div className="text-xs kami-text-muted">
                        {p.chars} chars
                      </div>
                    </div>
                    <p className="mt-2 text-sm kami-text">
                      {p.text.length > 220 ? p.text.slice(0, 220) + "…" : p.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-base font-semibold">
                {filter === "weak" ? "Weak passages" : "All passages"}
              </h2>
              <div className="mt-3 grid gap-2">
                {visible.map((p) => (
                  <div
                    key={p.i}
                    className="rounded-lg border p-3"
                    style={{
                      background: "var(--kami-surface-solid)",
                      borderColor: "var(--kami-border-strong)",
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs kami-text-muted">
                        #{p.i + 1} · {p.chars} chars
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: ratingColor(p.score) }}
                      >
                        {p.score.toFixed(2)}
                      </span>
                    </div>
                    <div
                      className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
                      style={{ background: "var(--kami-surface)" }}
                    >
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${Math.min(100, (p.score / 1.4) * 100)}%`,
                          background: ratingColor(p.score),
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs kami-text-muted">
                      {p.text.slice(0, 120)}
                      {p.text.length > 120 ? "…" : ""}
                    </p>
                    <div
                      className="mt-2 flex gap-2 text-[10px] kami-text-muted"
                    >
                      <span>size {p.sizeScore.toFixed(2)}</span>
                      <span>{p.entityScore ? "+entity" : "—entity"}</span>
                      <span>{p.numberScore ? "+number" : "—number"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </>
          </div>
        )}
      </div>
    </ToolShell>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div
      className="rounded-md border p-2 text-center"
      style={{
        background: "var(--kami-input-bg)",
        borderColor: "var(--kami-border)",
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wide kami-text-muted"
      >
        {label}
      </div>
      <div
        className="mt-1 text-lg font-semibold"
        style={{ color: tone === "warn" ? "#f59e0b" : "var(--kami-text)" }}
      >
        {value}
      </div>
    </div>
  );
}
