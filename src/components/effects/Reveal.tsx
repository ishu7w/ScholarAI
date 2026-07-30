"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/** Fades + slides children in when scrolled into view. */
export default function Reveal({
  children,
  className,
  delay = 0,
  y = 40,
  stagger,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  /** when set, animates direct children with this stagger instead of the wrapper */
  stagger?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const targets = stagger !== undefined ? Array.from(el.children) : el;
    const tween = gsap.from(targets, {
      autoAlpha: 0,
      y,
      duration: 0.9,
      delay,
      ease: "power3.out",
      stagger: stagger ?? 0,
      scrollTrigger: { trigger: el, start: "top 85%", once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [delay, y, stagger]);

  return (
    <div ref={ref} className={cn(className)}>
      {children}
    </div>
  );
}
