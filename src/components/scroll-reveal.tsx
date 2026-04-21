"use client";

import { useScrollReveal, useStaggerReveal } from "@/hooks/use-scroll-reveal";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  yOffset?: number;
  duration?: number;
  className?: string;
}

export function ScrollReveal({
  children,
  delay = 0,
  yOffset = 24,
  duration = 0.6,
  className,
}: ScrollRevealProps) {
  const ref = useScrollReveal<HTMLDivElement>({ delay, yOffset, duration });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

interface StaggerRevealProps {
  children: React.ReactNode;
  delay?: number;
  yOffset?: number;
  duration?: number;
  stagger?: number;
  className?: string;
}

export function StaggerReveal({
  children,
  delay = 0,
  yOffset = 24,
  duration = 0.5,
  stagger = 0.075,
  className,
}: StaggerRevealProps) {
  const ref = useStaggerReveal<HTMLDivElement>({ delay, yOffset, duration, stagger });

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
