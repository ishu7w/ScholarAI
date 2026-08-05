"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ArrowRight, ShieldCheck } from "lucide-react";
import MagneticButton from "@/components/effects/MagneticButton";

/** Orbiting-nodes AI visualization — ink hairline strokes + square markers. */
function AIVisualization() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;

    const ctx = gsap.context(() => {
      gsap.to("[data-orbit='1']", { rotation: 360, transformOrigin: "50% 50%", duration: 28, repeat: -1, ease: "none" });
      gsap.to("[data-orbit='2']", { rotation: -360, transformOrigin: "50% 50%", duration: 40, repeat: -1, ease: "none" });
      gsap.to("[data-orbit='3']", { rotation: 360, transformOrigin: "50% 50%", duration: 55, repeat: -1, ease: "none" });
      gsap.to("[data-core]", { scale: 1.06, transformOrigin: "50% 50%", duration: 2.4, repeat: -1, yoyo: true, ease: "sine.inOut" });
      gsap.fromTo(
        "[data-pulse]",
        { scale: 0.85, opacity: 0.55, transformOrigin: "50% 50%" },
        { scale: 1.5, opacity: 0, duration: 2.4, repeat: -1, ease: "power1.out", stagger: 0.8 }
      );
    }, svg);

    return () => ctx.revert();
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 500 500"
      className="h-full w-full"
      aria-label="Animated visualization of an AI matching engine"
      role="img"
    >
      {[0, 1, 2].map((i) => (
        <rect key={i} data-pulse x="202" y="202" width="96" height="96" fill="none" stroke="rgba(21,21,21,0.35)" strokeWidth="1" />
      ))}

      <circle cx="250" cy="250" r="90" fill="none" stroke="rgba(21,21,21,0.16)" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx="250" cy="250" r="150" fill="none" stroke="rgba(21,21,21,0.16)" strokeWidth="1" strokeDasharray="3 6" />
      <circle cx="250" cy="250" r="210" fill="none" stroke="rgba(21,21,21,0.16)" strokeWidth="1" strokeDasharray="3 6" />

      <g data-orbit="1">
        <rect x="244" y="154" width="12" height="12" fill="#C4442C" />
        <rect x="335" y="245" width="10" height="10" fill="#151515" />
        <rect x="244" y="334" width="12" height="12" fill="#151515" />
      </g>
      <g data-orbit="2">
        <rect x="244" y="94" width="12" height="12" fill="#151515" />
        <rect x="112" y="319" width="12" height="12" fill="#C4442C" />
        <rect x="377" y="320" width="10" height="10" fill="#151515" />
      </g>
      <g data-orbit="3">
        <rect x="245" y="35" width="10" height="10" fill="#151515" />
        <rect x="63" y="350" width="10" height="10" fill="#151515" />
        <rect x="426" y="349" width="12" height="12" fill="#C4442C" />
      </g>

      <rect data-core x="202" y="202" width="96" height="96" fill="#151515" />
      <text
        x="250"
        y="258"
        textAnchor="middle"
        fill="#E8E6DF"
        fontSize="22"
        fontWeight="700"
        fontFamily="var(--font-familjen)"
      >
        AI
      </text>
    </svg>
  );
}

export default function Hero() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 2.1, defaults: { ease: "power4.out" } });
      tl.from("[data-hero-badge]", { autoAlpha: 0, y: 26, filter: "blur(9px)", duration: 0.8 })
        .from("[data-hero-line]", { yPercent: 110, duration: 0.9, stagger: 0.12 }, "-=0.4")
        .from("[data-hero-sub]", { autoAlpha: 0, y: 26, filter: "blur(9px)", duration: 0.8 }, "-=0.5")
        .from("[data-hero-cta]", { autoAlpha: 0, y: 26, filter: "blur(9px)", duration: 0.8, stagger: 0.09 }, "-=0.5")
        .from("[data-hero-viz]", { autoAlpha: 0, filter: "blur(9px)", duration: 1.2, ease: "power3.out" }, "-=0.9")
        .from("[data-hero-float]", { autoAlpha: 0, y: 26, filter: "blur(9px)", duration: 0.8, stagger: 0.09 }, "-=0.8");
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={ref}
      className="relative flex min-h-screen items-center overflow-hidden pt-28 pb-16"
    >
      {/* Grid sits on its own layer: .grid-bg carries a mask-image, and a CSS
          mask applies to the whole subtree — on the section it faded out the
          sub-headline, CTAs, stats row and visualization along with the grid. */}
      <div className="grid-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
        <div>
          <div data-hero-badge className="mono-label mb-6 text-primary">
            Explainable AI — Trusted by 40+ institutions
          </div>

          {/* Each line is clipped by its own wrapper for the slide-up reveal.
              The wrappers need bottom room or they crop descenders and the
              outlined line's stroke; the negative margin keeps the visual
              spacing between lines unchanged. */}
          <h1 className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="block overflow-hidden pb-[0.12em] mb-[-0.12em]">
              <span data-hero-line className="block">Every deserving student,</span>
            </span>
            <span className="block overflow-hidden pb-[0.12em] mb-[-0.12em]">
              <span data-hero-line className="block">
                <span className="text-outline">matched by AI.</span>
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.12em] mb-[-0.12em]">
              <span data-hero-line className="block">Every decision, explained.</span>
            </span>
          </h1>

          <p data-hero-sub className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
            ScholarAI evaluates 25+ signals — academics, need, achievements,
            research — to match students with the right scholarships and give
            institutions a fair, auditable ranking of every applicant.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <span data-hero-cta>
              <Link href="/register">
                <MagneticButton className="btn-primary text-base">
                  Find my scholarships <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </Link>
            </span>
            <span data-hero-cta>
              <Link href="/dashboard/institution">
                <MagneticButton className="btn-ghost text-base">
                  <ShieldCheck className="h-4 w-4" /> For institutions
                </MagneticButton>
              </Link>
            </span>
          </div>

          <div data-hero-sub className="mt-10 flex items-center gap-6 text-sm text-muted">
            <div>
              <span className="font-semibold text-foreground">$48M+</span> awarded
            </div>
            <div className="h-4 w-px bg-[rgba(21,21,21,0.16)]" />
            <div>
              <span className="font-semibold text-foreground">92%</span> match accuracy
            </div>
            <div className="h-4 w-px bg-[rgba(21,21,21,0.16)]" />
            <div>
              <span className="font-semibold text-foreground">120k</span> students
            </div>
          </div>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[480px]" data-hero-viz>
          <AIVisualization />

          {/* floating UI chips */}
          <div
            data-hero-float
            className="glass-strong animate-float absolute left-0 top-16 px-4 py-3"
            style={{ animationDelay: "0s" }}
          >
            <div className="text-xs text-muted">Match score</div>
            <div className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-success">
              94%
            </div>
          </div>
          <div
            data-hero-float
            className="glass-strong animate-float absolute -right-2 top-32 px-4 py-3"
            style={{ animationDelay: "1.5s" }}
          >
            <div className="text-xs text-muted">Fraud risk</div>
            <div className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-accent">
              Clear
            </div>
          </div>
          <div
            data-hero-float
            className="glass-strong animate-float absolute bottom-16 left-6 px-4 py-3"
            style={{ animationDelay: "3s" }}
          >
            <div className="text-xs text-muted">Eligibility</div>
            <div className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-primary-bright">
              8 of 12
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
