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
    <div className="mb-4">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
        {title}
      </div>
      <div className="flex flex-wrap gap-2">
        {examples.map((ex, i) => (
          <button
            key={i}
            onClick={() => onPick(ex.value)}
            className="group rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-left text-xs shadow-sm transition-all hover:border-gray-400 hover:shadow"
          >
            <span className="font-medium text-gray-800 group-hover:text-gray-900">
              {ex.label}
            </span>
            {ex.hint && (
              <span className="ml-1.5 text-gray-400 group-hover:text-gray-600">
                · {ex.hint}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
