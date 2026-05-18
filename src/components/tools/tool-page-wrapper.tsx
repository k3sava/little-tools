"use client";

import { useEffect } from "react";
import { Footer } from "@/components/footer";
import { RelatedTools } from "./related-tools";
import { allTools, getPrimaryCollection } from "@/data/tools";
import { usePathname } from "next/navigation";
import { ShortcutProvider } from "@/contexts/shortcut-context";
import { BreadcrumbContext, BreadcrumbItem } from "@/contexts/breadcrumb-context";

const RECENT_KEY = "tools-recent";
const RECENT_MAX = 6;

function recordRecent(href: string) {
  if (typeof window === "undefined") return;
  try {
    const list: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    const next = [href, ...list.filter((h) => h !== href)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function ToolPageInner({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = rawPathname?.replace(/\/$/, "") || rawPathname;
  const tool = allTools.find((t) => t.href === pathname);
  const collection = tool ? getPrimaryCollection(tool) : null;

  useEffect(() => {
    if (tool) recordRecent(tool.href);
  }, [tool]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "home", href: "https://iamkesava.com" },
    { label: "apps", href: "https://apps.iamkesava.com" },
    { label: "tools", href: "/" },
    ...(collection ? [{ label: collection.title.toLowerCase(), href: collection.href }] : []),
    { label: tool?.name.toLowerCase() ?? "tool" },
  ];

  return (
    <BreadcrumbContext.Provider value={breadcrumbItems}>
      <div className="kami-scope min-h-screen" style={{ color: "var(--kami-text)" }}>
        <div>{children}</div>
        {tool && (
          <div className="mx-auto max-w-3xl px-4 pb-12">
            <RelatedTools currentHref={tool.href} />
          </div>
        )}
        <Footer />
      </div>
    </BreadcrumbContext.Provider>
  );
}

export function ToolPageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ShortcutProvider>
      <ToolPageInner>{children}</ToolPageInner>
    </ShortcutProvider>
  );
}
