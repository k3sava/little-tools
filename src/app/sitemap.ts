import type { MetadataRoute } from "next";
import { allTools, collections } from "@/data/tools";

const BASE = "https://tools.iamkesava.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: `${BASE}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 1.0,
    },
    ...collections.map((c) => ({
      url: `${BASE}${c.href}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...allTools.map((tool) => ({
      url: `${BASE}${tool.href}/`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
