import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { Footer } from "@/components/footer";

export default function NotFound() {
  return (
    <div className="kami-scope min-h-screen" style={{ color: "var(--kami-text)" }}>
      <Breadcrumb
        items={[
          { label: "home", href: "https://iamkesava.com" },
          { label: "apps", href: "https://apps.iamkesava.com" },
          { label: "tools", href: "/" },
          { label: "404" },
        ]}
      />
      <div className="mx-auto flex min-h-[70vh] w-[92%] max-w-[760px] flex-col items-center justify-center text-center">
        <p className="text-xs uppercase tracking-wide" style={{ color: "var(--kami-text-dim)" }}>
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl" style={{ color: "var(--kami-text)" }}>
          Tool not found
        </h1>
        <p className="mt-3 max-w-[52ch] text-sm sm:text-base" style={{ color: "var(--kami-text-muted)" }}>
          The tool you were looking for has either moved or was never built. Head back to the index and pick another one.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium uppercase"
            style={{
              background: "var(--kami-cta-bg)",
              color: "var(--kami-cta-text)",
              borderRadius: "var(--kami-cta-radius, 0.5rem)",
            }}
          >
            All tools
          </Link>
          <a
            href="https://apps.iamkesava.com"
            className="px-4 py-2 text-sm font-medium uppercase"
            style={{
              background: "var(--kami-surface-solid)",
              color: "var(--kami-text)",
              border: "1px solid var(--kami-border-strong)",
              borderRadius: "var(--kami-cta-radius, 0.5rem)",
            }}
          >
            Apps home
          </a>
        </div>
      </div>
      <Footer />
    </div>
  );
}
