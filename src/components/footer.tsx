"use client";

// Cross-domain footer. Every site links to the other two so authority
// triangulates and a stranger landing on one finds the others.

const links = [
  { label: "apps", href: "https://apps.iamkesava.com/" },
  { label: "tools", href: "https://tools.iamkesava.com/", self: true },
  { label: "toys", href: "https://toys.iamkesava.com/" },
  { label: "codex", href: "https://codex.iamkesava.com/" },
];

export function Footer() {
  return (
    <footer
      className="kami-footer"
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: ".8rem",
        padding: "3rem 0 2rem",
        textAlign: "center",
      }}
    >
      <nav
        aria-label="Sister sites"
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: ".72rem",
          display: "flex",
          gap: "0.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
          color: "var(--kami-text-muted, #4a4a4a)",
          marginBottom: "0.6rem",
        }}
      >
        {links.map((l, i) => (
          <span key={l.href}>
            {l.self ? (
              <span aria-current="page" style={{ fontWeight: 600, color: "var(--kami-text, #0a0a0a)" }}>{l.label}</span>
            ) : (
              <a href={l.href} style={{ color: "inherit" }}>{l.label}</a>
            )}
            {i < links.length - 1 && (
              <span aria-hidden="true" style={{ marginLeft: "0.5rem" }}>·</span>
            )}
          </span>
        ))}
      </nav>
      <div>
        Made by <a href="https://iamkesava.com" rel="author">Kesava</a>
      </div>
    </footer>
  );
}
