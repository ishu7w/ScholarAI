"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

/** Premium loading screen shown once on first landing-page visit. */
export default function LoadingScreen() {
  const ref = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tl = gsap.timeline({ onComplete: () => setDone(true) });
    if (reduce) {
      tl.to(el, { autoAlpha: 0, duration: 0.01 });
      return () => {
        tl.kill();
      };
    }

    tl.fromTo(
      "[data-loader-letter]",
      { yPercent: 120, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.55, stagger: 0.045, ease: "power4.out" }
    )
      .to("[data-loader-bar]", { scaleX: 1, duration: 0.7, ease: "power2.inOut" }, "-=0.3")
      .to(el, { yPercent: -100, duration: 0.8, ease: "power4.inOut", delay: 0.15 });

    return () => {
      tl.kill();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-background"
      aria-hidden
    >
      <div className="flex overflow-hidden font-[family-name:var(--font-familjen)] text-4xl font-bold uppercase tracking-tight sm:text-6xl">
        {"SCHOLARAI".split("").map((ch, i) => (
          <span key={i} data-loader-letter className="inline-block">
            <span className={i >= 7 ? "text-gradient" : "text-foreground"}>{ch}</span>
          </span>
        ))}
      </div>
      <div className="h-px w-48 overflow-hidden bg-[rgba(21,21,21,0.16)]">
        <div
          data-loader-bar
          className="h-full w-full origin-left scale-x-0 bg-primary"
        />
      </div>
    </div>
  );
}
