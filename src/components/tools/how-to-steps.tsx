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
    <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-semibold text-white">
              {i + 1}
            </div>
            <div className="flex-1 text-sm">
              <div className="font-medium text-gray-900">{s.title}</div>
              {s.body && (
                <div className="mt-0.5 text-gray-600">{s.body}</div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
