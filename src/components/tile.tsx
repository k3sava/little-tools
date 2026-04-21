import Link from "next/link";

interface TileProps {
  title: string;
  badge?: string;
  description: string;
  href: string;
  height?: number;
}

export function Tile({ title, badge, description, href, height = 220 }: TileProps) {
  return (
    <Link
      href={href}
      className="group kami-tile relative block overflow-hidden"
      style={{
        height: `${height}px`,
        background: "var(--kami-surface)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--kami-border)",
        borderRadius: "4px",
      }}
    >
      <div className="flex h-full flex-col items-center justify-center text-center px-8 transition-opacity duration-300 group-hover:opacity-0">
        <h2 className="text-xl font-semibold" style={{ color: "var(--kami-text)" }}>
          {title}
        </h2>
        {badge && (
          <p className="mt-1 text-sm" style={{ color: "var(--kami-text-dim)" }}>
            {badge}
          </p>
        )}
      </div>
      <div
        className="kami-tile-overlay absolute inset-0 flex flex-col items-center justify-center px-6 text-center opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: "var(--kami-overlay-bg)",
          color: "var(--kami-overlay-text)",
          lineHeight: "1.6",
        }}
      >
        <p className="mb-2 text-base font-semibold">{title}</p>
        <p style={{ fontSize: ".95rem", color: "var(--kami-overlay-text)" }}>{description}</p>
      </div>
    </Link>
  );
}
