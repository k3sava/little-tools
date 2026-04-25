import type { MetadataRoute } from "next";
import { allTools } from "@/data/tools";

const BASE = "https://tools.iamkesava.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticRoutes = ["", "/textkit", "/designkit", "/devkit", "/pdfkit"];
  return [
    ...staticRoutes.map((route) => ({
      url: `${BASE}${route}/`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: route === "" ? 1.0 : 0.7,
    })),
    ...allTools.map((tool) => ({
      url: `${BASE}${tool.href}/`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
  ];
}
