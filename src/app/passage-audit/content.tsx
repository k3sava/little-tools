"use client";

import { useMemo, useState } from "react";
import { ToolIntro } from "@/components/tools/tool-intro";

interface Scored {
  i: number;
  text: string;
  chars: number;
  sizeScore: number;
  entityScore: number;
  numberScore: number;
  score: number;
}

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

function scoreColor(score: number): string {
  if (score >= 1.0) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 0.6) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export default function PassageAuditContent() {
  const [input, setInput] = useState("");

  const result = useMemo(() => (input.trim() ? audit(input) : null), [input]);
  const weakest = useMemo(
    () => (result ? [...result.passages].sort((a, b) => a.score - b.score).slice(0, 3) : []),
    [result]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <ToolIntro
        title="Passage Audit"
        tagline="See which passages on your page disappear when AI chunks it."
        description="Paste a page (HTML or Markdown). The tool splits it into passages by heading, then scores each on length, entity shape, and number/citation density. The lowest-scoring passages are the ones AI search will skip when deciding what to cite. Inspired by Mike King's relevance engineering work."
        audience={["SEO", "PMM", "Marketers", "Writers"]}
        whenToUse={[
          "Auditing landing pages before launch.",
          "Comparing two pages to see which is more chunker-friendly.",
          "Catching hero lines and button labels that look fine to humans but vanish for AI.",
        ]}
      />

      <div className="mt-8 grid gap-4">
        <div className="flex items-center justify-between">
          <label htmlFor="input" className="text-sm font-medium">
            Paste HTML or Markdown
          </label>
          <button
            type="button"
            onClick={() => setInput(SAMPLE)}
            className="text-xs text-zinc-500 underline hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Load sample
          </button>
        </div>
        <textarea
          id="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="<h1>Your page</h1><p>...</p>"
          className="min-h-[200px] w-full rounded-md border border-zinc-200 bg-white p-3 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-950"
        />
      </div>

      {result && result.passages.length === 0 && (
        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Nothing scored. The tool needs at least one passage longer than 80 characters between
          headings.
        </p>
      )}

      {result && result.passages.length > 0 && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Passages" value={result.passages.length.toString()} />
            <Stat label="Mean score" value={result.mean.toFixed(2)} />
            <Stat
              label="Below 0.6"
              value={result.passages.filter((p) => p.score < 0.6).length.toString()}
            />
          </div>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Weakest passages</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Bottom three by score. These are the candidates to rewrite first.
            </p>
            <div className="mt-4 space-y-3">
              {weakest.map((p) => (
                <div
                  key={p.i}
                  className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <div className={`text-sm font-medium ${scoreColor(p.score)}`}>
                      Score {p.score.toFixed(2)}
                    </div>
                    <div className="text-xs text-zinc-500">{p.chars} chars</div>
                  </div>
                  <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {p.text.length > 220 ? p.text.slice(0, 220) + "…" : p.text}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">All passages</h2>
            <div className="mt-4 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-900">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">#</th>
                    <th className="px-3 py-2 text-left font-medium">Chars</th>
                    <th className="px-3 py-2 text-left font-medium">Size</th>
                    <th className="px-3 py-2 text-left font-medium">Entity</th>
                    <th className="px-3 py-2 text-left font-medium">Number</th>
                    <th className="px-3 py-2 text-left font-medium">Score</th>
                    <th className="px-3 py-2 text-left font-medium">Preview</th>
                  </tr>
                </thead>
                <tbody>
                  {result.passages.map((p) => (
                    <tr key={p.i} className="border-t border-zinc-200 dark:border-zinc-800">
                      <td className="px-3 py-2 text-zinc-500">{p.i + 1}</td>
                      <td className="px-3 py-2">{p.chars}</td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {p.sizeScore.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {p.entityScore ? "+0.2" : "—"}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {p.numberScore ? "+0.2" : "—"}
                      </td>
                      <td className={`px-3 py-2 font-medium ${scoreColor(p.score)}`}>
                        {p.score.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                        {p.text.slice(0, 60)}
                        {p.text.length > 60 ? "…" : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <section className="mt-10 text-sm text-zinc-600 dark:text-zinc-400">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">How scoring works</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong>Size (0–1):</strong> 200–1200 characters is the sweet spot for AI chunkers.
            Shorter passages get a fractional score; longer ones taper off.
          </li>
          <li>
            <strong>Entity (+0.2):</strong> passages that start with a capitalized noun phrase
            (a person, place, product, or concept) are easier to retrieve.
          </li>
          <li>
            <strong>Number (+0.2):</strong> passages with a percentage, dollar amount, or large
            number are easier to cite.
          </li>
        </ul>
        <p className="mt-3">
          Maximum score is 1.4. Anything below 0.6 is a candidate to rewrite or merge with an
          adjacent passage.
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
