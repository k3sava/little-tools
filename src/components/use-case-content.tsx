"use client";

import { useRef, useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal, StaggerReveal } from "@/components/scroll-reveal";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";
import { Navigation } from "@/components/sections/navigation";
import { CheckCircle2, Zap, Shield, Clock, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { UseCaseData } from "@/data/use-cases/types";

gsap.registerPlugin(ScrollTrigger);

const painIcons = [Zap, Clock, Shield, BarChart3];

function HeroSection({ data }: { data: UseCaseData["hero"] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const shapeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;

    if (headlineRef.current) {
      const words = headlineRef.current.querySelectorAll(".hero-word");
      gsap.set(words, { opacity: 0, y: 80 });
      gsap.to(words, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power2.out",
        delay: 0.3,
      });
    }

    if (contentRef.current) {
      const els = contentRef.current.children;
      gsap.set(els, { opacity: 0, y: 40 });
      gsap.to(els, {
        opacity: 1,
        y: 0,
        duration: 0.7,
        stagger: 0.12,
        ease: "power2.out",
        delay: 0.9,
      });
    }

    if (shapeRef.current) {
      gsap.to(shapeRef.current, {
        y: 20,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    }

    return () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, []);

  const line1Words = data.h1Line1.split(" ");
  const line2Words = data.h1Line2.split(" ");

  return (
    <section
      ref={sectionRef}
      className="bg-[var(--bg-warm)] min-h-[80vh] flex items-center pt-20 relative overflow-hidden"
    >
      <div
        ref={shapeRef}
        className="absolute top-[-10%] right-[-15%] w-[800px] h-[800px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 40% 50%, rgba(0,76,230,0.08) 0%, rgba(0,76,230,0.03) 40%, transparent 70%)",
          borderRadius: "40% 60% 55% 45% / 50% 40% 60% 50%",
        }}
      />
      <div
        className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(0,76,230,0.05) 0%, transparent 60%)",
          borderRadius: "55% 45% 40% 60% / 45% 55% 45% 55%",
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 py-24 lg:py-32 relative">
        <div className="max-w-3xl mx-auto text-center space-y-8 lg:space-y-10">
          <h1
            ref={headlineRef}
            className="text-[48px] sm:text-[56px] lg:text-[72px] font-bold text-[var(--text-primary)] leading-[1.05] tracking-[-0.04em]"
          >
            {line1Words.map((word, i) => (
              <span key={i} className="hero-word inline-block">
                {word}
                {i < line1Words.length - 1 ? "\u00A0" : ""}
              </span>
            ))}
            <br />
            {line2Words.map((word, i) => (
              <span key={i} className="hero-word inline-block">
                {word}
                {i < line2Words.length - 1 ? "\u00A0" : ""}
              </span>
            ))}
          </h1>

          <div ref={contentRef} className="space-y-6">
            <p className="text-[18px] lg:text-[20px] text-[var(--text-body)] leading-[1.6] max-w-2xl mx-auto">
              {data.bodyLines.join(" ")}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://justcall.io/signup"
                className={cn(
                  buttonVariants(),
                  "rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white h-14 px-10 text-[16px] font-semibold tracking-[0.01em] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-sm transition-all duration-200"
                )}
                data-track="cta-start-free-trial"
                data-section="hero"
              >
                {data.primaryCta}
              </a>
              <a
                href="https://justcall.io/booking"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "rounded-full h-14 px-10 text-[16px] font-semibold tracking-[0.01em] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200 border-[var(--text-primary)]/20"
                )}
                data-track="cta-book-a-demo"
                data-section="hero"
              >
                {data.secondaryCta}
              </a>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {["SOC 2 Type II", "ISO 27001", "GDPR", "HIPAA"].map(
                (badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-[var(--text-muted)] bg-white/80 rounded-full px-4 py-2 border border-[var(--border)] shadow-sm"
                  >
                    {badge}
                  </span>
                )
              )}
              <span className="text-[13px] text-[var(--text-muted)]">
                Trusted by 6,000+ customers
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ProblemSection({ data }: { data: UseCaseData["problem"] }) {
  return (
    <section className="bg-[var(--bg-white)] py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-[var(--primary)]/[0.02] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative">
        <div className="max-w-2xl mx-auto text-center space-y-6 lg:space-y-8">
          <ScrollReveal>
            <h2 className="text-[28px] lg:text-[40px] font-bold text-[var(--text-primary)] leading-[1.15] tracking-[-0.025em]">
              {data.headline}
            </h2>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <div className="space-y-4 text-[18px] text-[var(--text-body)] leading-[1.65]">
              {data.paragraphs.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === data.paragraphs.length - 1 ? "font-medium" : ""
                  }
                >
                  {p}
                </p>
              ))}
            </div>
          </ScrollReveal>
        </div>

        <StaggerReveal
          delay={0.2}
          stagger={0.075}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto mt-12"
        >
          {data.painTiles.map((tile, i) => {
            const Icon = painIcons[i % painIcons.length];
            return (
              <div key={i}>
                <div className="bg-[var(--bg-muted)] rounded-xl p-5 border border-[var(--border)] hover:shadow-sm transition-shadow duration-200">
                  <div className="flex items-start gap-3">
                    <Icon className="w-5 h-5 text-[var(--text-muted)] mt-0.5 shrink-0" />
                    <p className="text-[16px] text-[var(--text-body)] leading-[1.5]">
                      {tile}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </StaggerReveal>
      </div>
    </section>
  );
}

function SocialProofSection({
  data,
}: {
  data: UseCaseData["socialProof"];
}) {
  return (
    <section className="bg-[var(--bg-muted)] py-24 lg:py-32 relative overflow-hidden">
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-[var(--primary)]/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative">
        {/* Lead quote */}
        <ScrollReveal>
          <div className="max-w-3xl mx-auto text-center mb-14">
            <div className="text-7xl text-[var(--primary)]/10 font-serif leading-none select-none">
              &ldquo;
            </div>
            <blockquote className="text-[18px] lg:text-[24px] font-normal italic text-[var(--text-primary)] leading-relaxed -mt-6">
              {data.quotes[0].quote}&rdquo;
            </blockquote>
            <p className="text-[14px] text-[var(--text-muted)] mt-4 font-medium">
              &mdash; {data.quotes[0].name}, {data.quotes[0].title}
            </p>
          </div>
        </ScrollReveal>

        {/* Stat cards from quotes with stats */}
        {data.quotes.some((q) => q.stats && q.stats.length > 0) && (
          <StaggerReveal
            delay={0.2}
            stagger={0.1}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto"
          >
            {data.quotes
              .filter((q) => q.stats && q.stats.length > 0)
              .map((q) => (
                <div key={q.name}>
                  <div className="bg-white rounded-xl border border-[var(--border)] p-6 text-center shadow-sm hover:shadow-md transition-shadow duration-300">
                    {q.stats!.map((stat, j) => (
                      <p
                        key={j}
                        className="text-[15px] font-semibold text-[var(--primary)] leading-[1.4]"
                      >
                        {stat}
                      </p>
                    ))}
                    <p className="text-[12px] text-[var(--text-muted)] mt-3 pt-3 border-t border-[var(--border)]">
                      &mdash; {q.name}, {q.title}
                    </p>
                  </div>
                </div>
              ))}
          </StaggerReveal>
        )}
      </div>
    </section>
  );
}

function SolutionSection({ data }: { data: UseCaseData["solution"] }) {
  return (
    <section
      id="solution"
      className="bg-[var(--bg-white)] py-24 lg:py-32 xl:py-40"
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="text-center max-w-2xl mx-auto space-y-4 mb-16">
          <ScrollReveal>
            <h2 className="text-[28px] lg:text-[40px] font-bold text-[var(--text-primary)] leading-[1.15] tracking-[-0.025em]">
              {data.headline}
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={0.075}>
            <p className="text-[18px] lg:text-[20px] text-[var(--text-body)] leading-[1.6]">
              {data.deckSentence}
            </p>
          </ScrollReveal>
        </div>

        <div className="space-y-24">
          {data.features.map((feature, i) => (
            <ScrollReveal key={i} delay={0.1}>
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  i % 2 === 1 ? "lg:direction-rtl" : ""
                }`}
              >
                <div
                  className={`space-y-6 ${i % 2 === 1 ? "lg:order-2" : ""}`}
                >
                  <h3 className="text-[20px] lg:text-[28px] font-semibold text-[var(--text-primary)] leading-[1.3] tracking-[-0.02em]">
                    {feature.h3Line1}
                    <br />
                    {feature.h3Line2}
                  </h3>

                  <p className="text-[18px] text-[var(--text-body)] leading-[1.65]">
                    {feature.intro}
                  </p>

                  <ul className="space-y-3">
                    {feature.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <CheckCircle2 className="w-[18px] h-[18px] text-[var(--success)] mt-1 shrink-0" />
                        <span className="text-[16px] text-[var(--text-body)] leading-[1.5]">
                          {bullet}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <p className="text-[16px] font-medium text-[var(--text-body)] italic">
                    {feature.kicker}
                  </p>

                  {feature.ctaLink && (
                    <a
                      href={feature.ctaLink.href}
                      className="inline-flex items-center text-[var(--primary)] text-[15px] font-semibold hover:underline"
                    >
                      {feature.ctaLink.label}
                    </a>
                  )}
                </div>

                {/* Visual placeholder — gradient card */}
                <div
                  className={`${i % 2 === 1 ? "lg:order-1" : ""}`}
                >
                  <div className="rounded-2xl bg-gradient-to-br from-[var(--primary-light)] to-[var(--bg-muted)] border border-[var(--border)] p-8 lg:p-12 min-h-[280px] flex items-center justify-center">
                    <div className="text-center space-y-3">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm">
                        <CheckCircle2 className="w-8 h-8 text-[var(--primary)]" />
                      </div>
                      <p className="text-[14px] font-medium text-[var(--text-muted)]">
                        {feature.h3Line1} {feature.h3Line2}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function IntegrationsSection({
  data,
}: {
  data: UseCaseData["integrations"];
}) {
  const integrationNames = [
    "HubSpot",
    "Salesforce",
    "Apollo",
    "Slack",
    "Close",
    "Intercom",
    "Salesloft",
    "Copper",
  ];

  return (
    <section className="bg-[var(--bg-warm-alt)] py-24 lg:py-32 relative overflow-hidden">
      <div
        className="absolute top-1/2 -left-32 w-[500px] h-[500px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(0,76,230,0.04) 0%, transparent 60%)",
          borderRadius: "45% 55% 50% 50% / 55% 45% 55% 45%",
        }}
      />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 relative">
        <ScrollReveal>
          <h2 className="text-[32px] lg:text-[48px] font-bold text-[var(--text-primary)] leading-[1.1] tracking-[-0.04em] text-center mb-4">
            {data.headline}
          </h2>
          <p className="text-[18px] text-[var(--text-body)] leading-[1.6] text-center max-w-2xl mx-auto mb-10">
            {data.body}
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.075}>
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {["SOC 2 Type II", "HIPAA Available", "10DLC Support", "100+ Integrations"].map(
              (badge) => (
                <Badge
                  key={badge}
                  variant="outline"
                  className="text-[13px] font-medium px-4 py-1.5 bg-white/60 border-[var(--border)]/50 rounded-full"
                >
                  {badge}
                </Badge>
              )
            )}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.15}>
          <div className="bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-6 sm:p-8 max-w-4xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {integrationNames.map((name) => (
                <div
                  key={name}
                  className="bg-[var(--bg-warm)] rounded-xl p-4 flex items-center justify-center h-20 hover:shadow-md hover:bg-[var(--bg-warm-alt)] transition-all duration-200"
                >
                  <span className="text-[14px] font-medium text-[var(--text-body)]">
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="text-center mt-8">
            <a
              href="https://justcall.io/integrations"
              className="text-[var(--primary)] text-[15px] font-semibold hover:underline"
            >
              View All Integrations &rarr;
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

function ClosingCtaSection({
  data,
}: {
  data: UseCaseData["closingCta"];
}) {
  return (
    <section className="bg-[var(--footer-bg)] py-32 lg:py-40 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[var(--primary)]/[0.08] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 text-center relative">
        <ScrollReveal>
          <h2 className="text-[28px] lg:text-[40px] font-bold text-white leading-[1.15] tracking-[-0.025em]">
            {data.headline}
          </h2>
        </ScrollReveal>

        <ScrollReveal delay={0.1}>
          <div className="mt-6 space-y-2 max-w-2xl mx-auto">
            {data.bodyLines.map((line, i) => (
              <p
                key={i}
                className="text-[18px] text-[var(--footer-text)] leading-[1.65]"
              >
                {line}
              </p>
            ))}
          </div>
        </ScrollReveal>

        <ScrollReveal delay={0.2}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <a
              href="https://justcall.io/signup"
              className={cn(
                buttonVariants(),
                "rounded-full bg-white text-[var(--primary)] hover:bg-gray-100 h-12 px-8 text-[15px] font-semibold tracking-[0.01em] hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:shadow-sm transition-all duration-200"
              )}
              data-track="cta-start-free-trial"
              data-section="closing-cta"
            >
              {data.primaryCta}
            </a>
            <a
              href="https://justcall.io/booking"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-full border-white/30 text-white hover:bg-white/10 h-12 px-8 text-[15px] font-semibold tracking-[0.01em] hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm transition-all duration-200"
              )}
              data-track="cta-book-a-demo"
              data-section="closing-cta"
            >
              {data.secondaryCta}
            </a>
          </div>
        </ScrollReveal>

        {data.endorsement && (
          <ScrollReveal delay={0.3}>
            <div className="mt-12 max-w-lg mx-auto">
              <p className="text-[14px] italic text-white/60 leading-relaxed">
                &ldquo;{data.endorsement.quote}&rdquo;
              </p>
              <p className="text-[14px] text-white/40 mt-2">
                &mdash; {data.endorsement.attribution}
              </p>
            </div>
          </ScrollReveal>
        )}
      </div>
    </section>
  );
}

export function UseCaseContent({ data }: { data: UseCaseData }) {
  return (
    <SmoothScrollProvider>
      <Navigation />
      <main>
        <HeroSection data={data.hero} />
        <ProblemSection data={data.problem} />
        <SocialProofSection data={data.socialProof} />
        <SolutionSection data={data.solution} />
        <IntegrationsSection data={data.integrations} />
        <ClosingCtaSection data={data.closingCta} />
      </main>
    </SmoothScrollProvider>
  );
}
