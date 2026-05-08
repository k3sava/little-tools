"use client";

import { ToolIntro } from "@/components/tools/tool-intro";

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

export default function AeoReadinessScorerContent() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <ToolIntro
        title="AEO Readiness Scorer"
        tagline="Score any page on the structural signals AI search uses."
        description="A small offline Python script that scores any saved HTML page or URL on twelve structural and semantic signals AI engines use to decide what to cite. Inspired by Aleyda Solis's Readiness framework. Browser version coming. Today, run it from the command line."
        audience={["SEO", "PMM", "Marketers"]}
        whenToUse={[
          "Auditing pages before launch for AI-search visibility.",
          "Comparing two pages to see which is more citation-ready.",
          "Catching missing structured data or thin first paragraphs.",
        ]}
        quickLinks={[
          { label: "How to run it", href: "#run" },
          { label: "What it scores", href: "#signals" },
          { label: "Credits", href: "#credits" },
        ]}
      />

      <section className="mt-8 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Download the script</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              152 lines. Pure Python 3 standard library. No dependencies, no API keys.
            </p>
          </div>
          <a
            href="/aeo-readiness-scorer.py"
            download
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Download .py
          </a>
        </div>
      </section>

      <section id="run" className="mt-8">
        <h2 className="text-lg font-semibold">How to run it</h2>
        <pre className="mt-3 overflow-x-auto rounded-md bg-zinc-900 p-4 text-sm text-zinc-100">
{`# Score a saved HTML file
python aeo-readiness-scorer.py page.html

# Or fetch and score a URL directly
python aeo-readiness-scorer.py https://example.com/blog-post`}
        </pre>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Output is JSON with a per-signal verdict and a prioritized fix list.
        </p>
      </section>

      <section id="signals" className="mt-8">
        <h2 className="text-lg font-semibold">What it scores</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Twelve signals, each weighted 2–5 by impact on citation likelihood.
        </p>
        <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Signal</th>
                <th className="px-3 py-2 text-left font-medium">Weight</th>
                <th className="px-3 py-2 text-left font-medium">What it checks</th>
              </tr>
            </thead>
            <tbody>
              {SIGNALS.map((s) => (
                <tr key={s.name} className="border-t border-zinc-200 dark:border-zinc-800">
                  <td className="px-3 py-2 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{s.weight}</td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">{s.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section id="credits" className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Credits</h2>
        <p className="mt-2">
          The Readiness layer concept is from{" "}
          <a
            className="underline"
            href="https://www.aleydasolis.com/"
            target="_blank"
            rel="noreferrer"
          >
            Aleyda Solis
          </a>
          ’s three-layer AEO framework (Presence / Readiness / Impact). This tool implements the
          Readiness scoring as a simple, runnable script.
        </p>
      </section>
    </div>
  );
}
