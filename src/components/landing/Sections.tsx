"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  BarChart3,
  Brain,
  FileSearch,
  Fingerprint,
  MessageSquareText,
  Route,
  ScanLine,
  Trophy,
} from "lucide-react";
import AnimatedCounter from "@/components/effects/AnimatedCounter";
import Reveal from "@/components/effects/Reveal";
import TextReveal from "@/components/effects/TextReveal";
import TiltCard from "@/components/effects/TiltCard";
import { GlassCard } from "@/components/ui/primitives";

gsap.registerPlugin(ScrollTrigger);

// ---------- Stats ----------

const STATS = [
  { value: 48, prefix: "$", suffix: "M+", label: "Scholarships awarded through the platform" },
  { value: 120000, suffix: "+", label: "Student profiles evaluated by the AI engine" },
  { value: 92, suffix: "%", label: "Match accuracy validated against committee outcomes" },
  { value: 3.2, suffix: "s", label: "Average time to a full explainable ranking", decimals: 1 },
];

export function Stats() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal stagger={0.12} className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map((s) => (
            <GlassCard key={s.label} className="text-center">
              <div className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold text-gradient sm:text-5xl">
                <AnimatedCounter
                  value={s.value}
                  prefix={s.prefix ?? ""}
                  suffix={s.suffix ?? ""}
                  decimals={s.decimals ?? 0}
                />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.label}</p>
            </GlassCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ---------- How it works (scroll storytelling) ----------

const STEPS = [
  {
    n: "01",
    title: "Build your profile once",
    body: "Academics, income, achievements, research, documents — 25+ signals, entered once, verified by the OCR pipeline, reused for every application.",
  },
  {
    n: "02",
    title: "AI scores every dimension",
    body: "A transparent weighted model scores each area — Academic 22%, Financial Need 18%, Achievements 12% — nothing hidden, every weight published.",
  },
  {
    n: "03",
    title: "Matches ranked with reasons",
    body: "Each scholarship gets a match score, a winning probability, and a plain-language explanation of why it fits — or exactly what's missing.",
  },
  {
    n: "04",
    title: "Institutions decide fairly",
    body: "Committees see the same explainable ranking, fraud signals, and verification status — decisions become auditable instead of arbitrary.",
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-step]").forEach((step) => {
        gsap.from(step, {
          autoAlpha: 0,
          x: -50,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: { trigger: step, start: "top 80%", once: true },
        });
      });
      gsap.from("[data-step-line]", {
        scaleY: 0,
        transformOrigin: "top",
        ease: "none",
        scrollTrigger: {
          trigger: el,
          start: "top 65%",
          end: "bottom 75%",
          scrub: 0.5,
        },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <section id="how" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <TextReveal
          text="How the AI decides"
          className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight sm:text-5xl"
        />
        <p className="mt-4 max-w-xl text-muted">
          No black boxes. Every score traces back to a published weight and a
          verifiable input.
        </p>

        <div ref={ref} className="relative mt-16 pl-8">
          <div
            data-step-line
            className="absolute left-[7px] top-2 h-[calc(100%-2rem)] w-px"
            style={{ background: "#c4442c" }}
          />
          <div className="space-y-16">
            {STEPS.map((s) => (
              <div key={s.n} data-step className="relative">
                <span className="absolute -left-8 top-1 h-4 w-4 rounded-full border-2 border-primary bg-background" />
                <div className="font-[family-name:var(--font-geist-mono)] text-sm text-primary-bright">
                  {s.n}
                </div>
                <h3 className="mt-2 font-[family-name:var(--font-space-grotesk)] text-2xl font-semibold">
                  {s.title}
                </h3>
                <p className="mt-3 max-w-2xl leading-relaxed text-muted">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------- Features grid ----------

const FEATURES = [
  {
    icon: Brain,
    title: "Explainable scoring",
    body: "A weighted model across 25+ signals. Every recommendation ships with its full score breakdown.",
  },
  {
    icon: Trophy,
    title: "Smart matching",
    body: "Eligibility prediction, match scores, and win probability across 12 scholarship categories.",
  },
  {
    icon: ScanLine,
    title: "OCR verification",
    body: "Income certificates, marksheets, and IDs verified with cross-document consistency checks.",
  },
  {
    icon: Fingerprint,
    title: "Fraud detection",
    body: "Statistical anomaly signals — mismatched claims get flagged before committees see them.",
  },
  {
    icon: FileSearch,
    title: "Resume intelligence",
    body: "ATS scoring, skill extraction, and targeted suggestions tuned for scholarship review.",
  },
  {
    icon: Route,
    title: "Personal roadmap",
    body: "Quarter-by-quarter improvement plan with projected score impact for each action.",
  },
  {
    icon: BarChart3,
    title: "Committee analytics",
    body: "Ranking heatmaps, demographics, geographic distribution, and exportable reports.",
  },
  {
    icon: MessageSquareText,
    title: "AI copilot",
    body: "Ask why you matched, why you didn't, and what single change raises your odds the most.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <TextReveal
          text="One platform. Both sides of the table."
          className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight sm:text-5xl"
        />
        <p className="mt-4 max-w-xl text-muted">
          Students get matched. Institutions get fairness. Everyone gets
          receipts.
        </p>

        <Reveal stagger={0.08} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <TiltCard key={f.title}>
              <GlassCard hover className="h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
                  <f.icon className="h-5 w-5 text-primary-bright" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </GlassCard>
            </TiltCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
