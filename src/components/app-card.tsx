import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

interface AppCardProps {
  title: string;
  description: string;
  href: string;
  /** Optional short label pill rendered in the top-right corner. */
  badge?: ReactNode;
  /** Optional small dim line rendered under the title. */
  subtitle?: string;
  /** Treat href as an external URL. Opens in a new tab. */
  external?: boolean;
  /** CTA text shown on hover. Defaults to "Open". */
  ctaLabel?: string;
  /** Minimum card height in px. Defaults to 172. */
  minHeight?: number;
}

export function AppCard({
  title,
  description,
  href,
  badge,
  subtitle,
  external = false,
  ctaLabel = "Open",
  minHeight = 172,
}: AppCardProps) {
  const body = (
    <>
      {/* Base face */}
      <div className="transition-opacity duration-250 group-hover:opacity-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-semibold" style={{ color: "var(--kami-text)" }}>
              {title}
            </h3>
            {subtitle && (
              <p className="mt-0.5 text-xs" style={{ color: "var(--kami-text-dim)" }}>
                {subtitle}
              </p>
            )}
            <p className="mt-1 text-sm leading-6" style={{ color: "var(--kami-text-muted)" }}>
              {description}
            </p>
          </div>
          {badge && (
            <span
              className="shrink-0 px-2 py-1 text-xs font-medium"
              style={{
                background: "var(--kami-surface)",
                color: "var(--kami-text-muted)",
                border: "1px solid var(--kami-border-strong)",
                borderRadius: "var(--kami-card-radius)",
              }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>

      {/* Hover face */}
      <div
        className="kami-tile-overlay pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 px-5 text-center opacity-0 transition-opacity duration-250 group-hover:opacity-100"
        style={{ background: "var(--kami-overlay-bg)", color: "var(--kami-overlay-text)" }}
      >
        <div>
          <p className="text-base font-semibold" style={{ color: "var(--kami-overlay-text)" }}>
            {title}
          </p>
          <p className="mt-1 text-sm" style={{ color: "var(--kami-overlay-text-dim)" }}>
            {description}
          </p>
        </div>
        <span
          className="kami-overlay-btn-primary inline-flex items-center px-3 py-2 text-xs font-semibold"
          style={{
            background: "var(--kami-overlay-text)",
            color: "var(--kami-overlay-bg)",
            borderRadius: "var(--kami-card-radius)",
          }}
        >
          {ctaLabel} →
        </span>
      </div>
    </>
  );

  const className =
    "group kami-tile relative block overflow-hidden px-6 py-4 transition-all duration-250";
  const style: CSSProperties = {
    background: "var(--kami-surface-solid)",
    border: "var(--kami-card-border)",
    borderRadius: "var(--kami-card-radius)",
    boxShadow: "var(--kami-card-shadow)",
    minHeight: `${minHeight}px`,
  };

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}>
        {body}
      </a>
    );
  }
  return (
    <Link href={href} className={className} style={style}>
      {body}
    </Link>
  );
}
