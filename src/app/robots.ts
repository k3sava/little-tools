import type { MetadataRoute } from "next";

// Explicit allow for every search and AI agent. The corpus exists to be cited.
// Default-allow rule covers regular crawlers; per-agent rules make the
// permission unambiguous so Cloudflare/CDN policies and AI agents that read
// robots.txt before fetching see a clean signal.
const aiAgents = [
  "Googlebot",
  "Bingbot",
  "Applebot",
  "Claude-SearchBot",
  "Claude-User",
  "ChatGPT-User",
  "OAI-SearchBot",
  "Perplexity-User",
  "PerplexityBot",
  "DuckAssistBot",
  "MistralAI-User",
  "Google-CloudVertexBot",
  "GPTBot",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
  "anthropic-ai",
  "CCBot",
  "Amazonbot",
  "Bytespider",
  "FacebookBot",
  "meta-externalagent",
  "PetalBot",
  "archive.org_bot",
  "ia_archiver",
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
