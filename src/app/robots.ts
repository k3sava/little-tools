import type { MetadataRoute } from "next";

// Explicit allow for every AI search agent. The corpus exists to be cited.
// Default-allow rule covers regular crawlers; per-agent rules make the
// permission unambiguous so Cloudflare/CDN policies and AI agents that read
// robots.txt before fetching see a clean signal.
const aiAgents = [
  "GPTBot",
  "Google-Extended",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "CCBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Applebot-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      ...aiAgents.map((userAgent) => ({ userAgent, allow: "/" })),
    ],
    sitemap: "https://tools.iamkesava.com/sitemap.xml",
    host: "https://tools.iamkesava.com",
  };
}
