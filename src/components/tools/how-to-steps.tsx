"use client";

/**
 * Lightweight numbered-steps block. Drop below the intro on tools
 * where the flow isn't self-evident (builders, multi-step forms).
 */
export function HowToSteps({
  title = "How to use it",
  steps,
}: {
  title?: string;
  steps: { title: string; body?: React.ReactNode }[];
}) {
  return (
    <div
      className="kami-how-to-steps mb-6 p-5"
      style={{
        background: "var(--kami-surface)",
        border: "1px solid var(--kami-border-strong)",
        borderRadius: "var(--kami-card-radius, 1rem)",
      }}
    >
      <div className="mb-3 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
        {title}
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <div
              className="flex h-6 w-6 shrink-0 items-center justify-center text-xs font-semibold"
              style={{
                background: "var(--kami-cta-bg)",
                color: "var(--kami-cta-text)",
                borderRadius: "var(--kami-cta-radius, 999px)",
              }}
            >
              {i + 1}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium" style={{ color: "var(--kami-text)" }}>{s.title}</div>
              {s.body && (
                <div className="mt-0.5" style={{ color: "var(--kami-text-muted)" }}>{s.body}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
