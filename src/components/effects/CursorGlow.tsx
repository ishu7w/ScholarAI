"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Small vermilion square marker that trails the cursor. Inert on touch devices. */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.set(el, { xPercent: -50, yPercent: -50 });
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      gsap.set(el, { autoAlpha: 0.9 });
      xTo(e.clientX);
      yTo(e.clientY);
    };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none invisible fixed left-0 top-0 z-[90] h-2 w-2 bg-primary opacity-0 mix-blend-normal"
    />
  );
}
