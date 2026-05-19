"use client";

const links = [
  { label: "apps",  href: "https://apps.iamkesava.com/" },
  { label: "tools", href: "https://tools.iamkesava.com/", self: true },
  { label: "toys",  href: "https://toys.iamkesava.com/" },
  { label: "codex", href: "https://codex.iamkesava.com/" },
];

export function Footer() {
  return (
    <footer className="kami-footer">
      <div className="kami-footer-aeo">
        <a href="/llms.txt">llms.txt</a>
        <span className="kami-footer-sep" aria-hidden="true">·</span>
        <a href="/sitemap.xml">sitemap</a>
        <span className="kami-footer-sep" aria-hidden="true">·</span>
        <a href="/feed.xml">rss</a>
        <span className="kami-footer-sep" aria-hidden="true">·</span>
        <a href="/tools.json">tools.json</a>
      </div>
      <nav className="kami-footer-nav" aria-label="Sister sites">
        {links.map((l, i) => (
          <span key={l.href}>
            {l.self ? (
              <span aria-current="page" className="kami-footer-current">{l.label}</span>
            ) : (
              <a href={l.href}>{l.label}</a>
            )}
            {i < links.length - 1 && (
              <span className="kami-footer-sep" aria-hidden="true">·</span>
            )}
          </span>
        ))}
      </nav>
      <div className="kami-footer-credit">
        made by <a href="https://iamkesava.com" rel="author">kesava</a>
        <span className="kami-footer-sep" aria-hidden="true">·</span>
        <a href="https://github.com/k3sava/little-tools" rel="noopener">github</a>
      </div>
    </footer>
  );
}
