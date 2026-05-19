"use client";

import { useState, useEffect } from "react";
import {
  ToolShell,
  ControlGroup,
  ToolActionButton,
} from "@/components/tools/tool-shell";

const ACCENT = "#3b82f6";

const SIGNALS: { name: string; weight: number; what: string }[] = [
  { name: "llms.txt presence", weight: 5, what: "Root file that tells AI crawlers what to index." },
  { name: "JSON-LD structured data", weight: 5, what: "Schema.org blocks the page exposes." },
  { name: "Schema @types", weight: 4, what: "Article, Product, FAQPage, Organization, etc." },
  { name: "Canonical link", weight: 4, what: "<link rel=\"canonical\"> pointing to the right URL." },
  { name: "FAQ structure", weight: 4, what: "FAQPage schema or definition list pattern." },
  { name: "Title length", weight: 3, what: "Between 30 and 65 characters." },
  { name: "H1 uniqueness", weight: 3, what: "Exactly one h1 on the page." },
  { name: "Meta description length", weight: 3, what: "Between 120 and 160 characters." },
  { name: "Paragraph length", weight: 3, what: "Median paragraph under ~600 characters." },
  { name: "First-paragraph entity density", weight: 4, what: "Named entities packed into the lede." },
  { name: "External citations", weight: 3, what: "Links to authoritative sources." },
  { name: "Heading depth", weight: 2, what: "Reasonable h2/h3 structure." },
];

const MAX_SCORE = SIGNALS.reduce((s, x) => s + x.weight, 0);

export default function AeoReadinessScorerContent() {
  const [currentTheme, setCurrentTheme] = useState<string>("default");
  useEffect(() => {
    const readTheme = () => document.documentElement.getAttribute("data-theme") ?? "default";
    setCurrentTheme(readTheme());
    const obs = new MutationObserver(() => setCurrentTheme(readTheme()));
    obs.observe(document.documentElement, { attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);
  const isMaterial = currentTheme === "material";
  const isMetro    = currentTheme === "metro";
  const isGlass    = currentTheme === "glass";

  const [metroCPivot, setMetroCPivot] = useState<"input" | "output">("input");

  const actions = (
    <a href="/aeo-readiness-scorer.py" download>
      <ToolActionButton variant="solid">Download .py</ToolActionButton>
    </a>
  );

  const controls = (
    <>
      <ControlGroup label="Score circle" hint={`Max ${MAX_SCORE}`}>
        <div className="flex items-center justify-center py-4">
          <div
            className="relative flex h-32 w-32 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(${ACCENT} 0% 75%, var(--kami-surface) 75% 100%)`,
            }}
          >
            <div
              className="flex h-24 w-24 flex-col items-center justify-center rounded-full text-center"
              style={{
                background: "var(--kami-surface-solid)",
                border: "1px solid var(--kami-border-strong)",
              }}
            >
              <span className="text-2xl font-bold" style={{ color: ACCENT }}>
                A
              </span>
              <span className="text-[10px]" style={{ color: "var(--kami-text-muted)" }}>
                target
              </span>
            </div>
          </div>
        </div>
        <p className="text-center text-xs" style={{ color: "var(--kami-text-muted)" }}>
          12 weighted signals. Run the script for your real score.
        </p>
      </ControlGroup>

      <ControlGroup label="What to fix next">
        <ol className="list-decimal pl-4 text-xs" style={{ color: "var(--kami-text-muted)" }}>
          <li>Add llms.txt to the site root.</li>
          <li>Inject JSON-LD with Article or Product type.</li>
          <li>Tighten meta description to 120-160 chars.</li>
        </ol>
      </ControlGroup>
    </>
  );

  return (
    <ToolShell
      title="AEO Readiness Scorer"
      tagline="Score any page on the structural signals AI search uses."
      accent={ACCENT}
      actions={actions}
      controls={controls}
      controlsLabel="Insights"
    >
      <div className="flex flex-col gap-6">
        {isMetro && (
          <nav style={{ display: "flex", borderBottom: "1px solid #d1d1d1", marginBottom: 12 }}>
            {(["input", "output"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMetroCPivot(tab)}
                style={{
                  padding: "8px 16px", fontSize: 14,
                  fontWeight: metroCPivot === tab ? 600 : 400,
                  color: metroCPivot === tab ? "#0078d4" : "#605e5c",
                  background: "none", border: "none",
                  borderBottom: metroCPivot === tab ? "2px solid #0078d4" : "2px solid transparent",
                  cursor: "pointer",
                  fontFamily: "’Segoe UI’, system-ui, sans-serif",
                  textTransform: "capitalize",
                }}
              >{tab === "input" ? "Content" : "Score"}</button>
            ))}
          </nav>
        )}

        {(!isMetro || metroCPivot === "input") && (
          <div className={isGlass ? "glass-canvas-section" : ""}>
            <section
              className="rounded-xl border p-6"
              style={{ background: "var(--kami-surface-solid)", borderColor: "var(--kami-border-strong)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">Download the script</h2>
                  <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                    152 lines. Pure Python 3 standard library. No dependencies, no API keys.
                  </p>
                </div>
                <a
                  href="/aeo-readiness-scorer.py"
                  download
                  className="rounded-md px-4 py-2 text-sm font-medium text-white"
                  style={{ background: ACCENT }}
                >
                  Download .py
                </a>
              </div>
            </section>

            <section id="run" className="mt-6">
              <h2 className="text-lg font-semibold">How to run it</h2>
              <pre
                className="mt-3 overflow-x-auto rounded-md p-4 text-sm"
                style={{ background: "var(--kami-overlay-bg)", color: "var(--kami-overlay-text)" }}
              >
{`# Score a saved HTML file
python aeo-readiness-scorer.py page.html

# Or fetch and score a URL directly
python aeo-readiness-scorer.py https://example.com/blog-post`}
              </pre>
              <p className="mt-3 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Output is JSON with a per-signal verdict and a prioritized fix list.
              </p>
            </section>
          </div>
        )}

        {(!isMetro || metroCPivot === "output") && (
          <div className={isGlass ? "glass-canvas-section" : ""}>
            <section id="signals">
              <h2 className="text-lg font-semibold">Per-signal checks</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--kami-text-muted)" }}>
                Twelve signals, each weighted 2–5 by impact on citation likelihood.
              </p>
              <div className="mt-4 grid gap-2">
                {SIGNALS.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                    style={{
                      background: "var(--kami-surface-solid)",
                      borderColor: "var(--kami-border-strong)",
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold"
                          style={{
                            background: `color-mix(in srgb, ${ACCENT} 15%, transparent)`,
                            color: ACCENT,
                          }}
                        >
                          w{s.weight}
                        </span>
                        <p className="text-sm font-medium">{s.name}</p>
                      </div>
                      <p className="mt-1 text-xs" style={{ color: "var(--kami-text-muted)" }}>
                        {s.what}
                      </p>
                    </div>
                    <span
                      className="text-xs"
                      style={{ color: "var(--kami-text-muted)" }}
                      aria-label="Status pending"
                    >
                      ○
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section
              id="credits"
              className="rounded-xl border p-4 text-sm mt-6"
              style={{
                background: "var(--kami-surface-solid)",
                borderColor: "var(--kami-border-strong)",
                color: "var(--kami-text-muted)",
              }}
            >
              <h2 className="text-base font-semibold" style={{ color: "var(--kami-text)" }}>
                Credits
              </h2>
              <p className="mt-2">
                The Readiness layer concept is from{" "}
                <a className="underline" href="https://www.aleydasolis.com/" target="_blank" rel="noreferrer">
                  Aleyda Solis
                </a>
                ‘s three-layer AEO framework (Presence / Readiness / Impact). This tool implements the
                Readiness scoring as a runnable script.
              </p>
            </section>
          </div>
        )}
      </div>
    </ToolShell>
  );
}
