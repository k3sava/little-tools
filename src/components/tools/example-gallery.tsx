"use client";

/**
 * A row of pre-filled example snippets users can click to populate a tool.
 * This turns a scary blank textarea into a "click to try it" moment.
 */

export interface Example<T = string> {
  label: string;
  /** Short description shown under the label. Optional. */
  hint?: string;
  value: T;
}

export function ExampleGallery<T = string>({
  title = "Try an example",
  examples,
  onPick,
}: {
  title?: string;
  examples: Example<T>[];
  onPick: (value: T) => void;
}) {
  if (!examples.length) return null;

  return (
    <div className="kami-example-gallery mb-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => onPick(ex.value)}
            className="kami-example-chip group px-3 py-1.5 text-left text-xs"
            style={{
              background: "var(--kami-cta2-bg, var(--kami-surface))",
              color: "var(--kami-cta2-text, var(--kami-text-muted))",
              border: "1px solid var(--kami-cta2-border, var(--kami-border-strong))",
              borderRadius: "var(--kami-cta-radius, 0.5rem)",
              boxShadow: "var(--kami-card-shadow, none)",
            }}
          >
            <span className="font-medium">{ex.label}</span>
            {ex.hint && (
              <span className="ml-1.5" style={{ color: "var(--kami-text-dim)" }}>
                · {ex.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
