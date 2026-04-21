"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface ScrollRevealOptions {
  delay?: number;
  yOffset?: number;
  duration?: number;
  stagger?: number;
}

/**
 * Returns a ref to attach to a container element. All direct children
 * (or the element itself if no children) will animate in on scroll.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  delay = 0,
  yOffset = 24,
  duration = 0.6,
  stagger = 0,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(el, { opacity: 0, y: yOffset });

    const tween = gsap.to(el, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });

    return () => {
      tween.kill();
      tween.scrollTrigger?.kill();
    };
  }, [delay, yOffset, duration, stagger]);

  return ref;
}

/**
 * Stagger-reveal children of a container on scroll.
 */
export function useStaggerReveal<T extends HTMLElement = HTMLDivElement>({
  delay = 0,
  yOffset = 24,
  duration = 0.5,
  stagger = 0.075,
}: ScrollRevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const children = el.children;

    if (prefersReduced) {
      gsap.set(children, { opacity: 1, y: 0 });
      return;
    }

    gsap.set(children, { opacity: 0, y: yOffset });

    const tween = gsap.to(children, {
      opacity: 1,
      y: 0,
      duration,
      delay,
      stagger,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
      },
    });

    return () => {
      tween.kill();
      tween.scrollTrigger?.kill();
    };
  }, [delay, yOffset, duration, stagger]);

  return ref;
}
