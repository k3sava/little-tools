"use client";

import { useState, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks: { label: string; href: string }[] = [
  { label: "Products", href: "https://justcall.io/products" },
  { label: "Solutions", href: "https://justcall.io/solutions" },
  { label: "Migrate", href: "https://justcall.io/migrate" },
  { label: "Resources", href: "https://justcall.io/resources" },
  { label: "Pricing", href: "https://justcall.io/pricing" },
];

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ease-out ${
        scrolled
          ? "bg-white/95 backdrop-blur-sm border-b border-[var(--border)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between h-16 lg:h-20">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2" aria-label="JustCall home">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#004ce6"/>
            <path d="M10.5 8.5h4v11a3.5 3.5 0 01-7 0v-1.5h3v1.5a.5.5 0 001 0V8.5z" fill="#fff"/>
            <circle cx="21" cy="12.5" r="3.5" stroke="#fff" strokeWidth="2.5" fill="none"/>
          </svg>
          <span className="font-bold text-xl tracking-tight text-[var(--text-primary)]">
            JustCall
          </span>
        </a>

        {/* Desktop menu */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[var(--text-body)] text-[15px] font-medium hover:text-[var(--primary)] transition-colors duration-150"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div className="hidden lg:flex items-center gap-3">
          <a
            href="https://app.justcall.io"
            className="text-[var(--text-body)] text-[15px] font-medium hover:text-[var(--primary)] transition-colors duration-150"
          >
            Login
          </a>
          <a
            href="https://justcall.io/booking"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-full text-[15px] font-semibold tracking-[0.01em]")}
          >
            Book a Demo
          </a>
          <a
            href="https://justcall.io/signup"
            className={cn(buttonVariants(), "rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-[15px] font-semibold tracking-[0.01em]")}
          >
            Start Free Trial
          </a>
        </div>

        {/* Mobile hamburger */}
        <div className="flex lg:hidden items-center gap-3">
          <a
            href="https://justcall.io/signup"
            className={cn(buttonVariants({ size: "sm" }), "rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-sm font-semibold")}
          >
            Start Free Trial
          </a>
          <Sheet>
            <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 hover:bg-gray-100 transition-colors">
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 mt-8">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-[var(--text-body)] text-lg font-medium py-2"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-2" />
                <a href="https://app.justcall.io" className="text-[var(--text-body)] text-lg font-medium py-2">
                  Login
                </a>
                <a
                  href="https://justcall.io/booking"
                  className={cn(buttonVariants({ variant: "outline" }), "rounded-full mt-2")}
                >
                  Book a Demo
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
