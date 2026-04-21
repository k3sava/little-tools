import Link from "next/link";

const footerLinks = [
  {
    title: "Product",
    links: [
      { label: "Phone System", href: "https://justcall.io/phone-system" },
      { label: "SMS", href: "https://justcall.io/sms" },
      { label: "AI Voice Agent", href: "https://justcall.io/ai-voice-agent" },
      { label: "Sales Dialer", href: "https://justcall.io/sales-dialer" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Help Center", href: "/help" },
      { label: "Blog", href: "https://justcall.io/blog" },
      { label: "API Docs", href: "https://developer.justcall.io" },
      { label: "Status", href: "https://status.justcall.io" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "https://justcall.io/about" },
      { label: "Careers", href: "https://justcall.io/careers" },
      { label: "Contact", href: "https://justcall.io/contact" },
      { label: "Partners", href: "https://justcall.io/partners" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "https://justcall.io/privacy" },
      { label: "Terms", href: "https://justcall.io/terms" },
      { label: "GDPR", href: "https://justcall.io/gdpr" },
      { label: "Security", href: "https://justcall.io/security" },
    ],
  },
];

export function HelpFooter() {
  return (
    <footer className="border-t bg-[rgb(0,18,51)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-semibold text-white/90">
                {group.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/60 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-12 border-t border-white/10 pt-8 text-center text-sm text-white/40">
          &copy; {new Date().getFullYear()} JustCall. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
