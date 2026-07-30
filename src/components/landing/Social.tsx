"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, GraduationCap, Quote } from "lucide-react";
import Reveal from "@/components/effects/Reveal";
import TextReveal from "@/components/effects/TextReveal";
import MagneticButton from "@/components/effects/MagneticButton";
import { Avatar, Badge, GlassCard } from "@/components/ui/primitives";

// ---------- Testimonials ----------

const TESTIMONIALS = [
  {
    quote:
      "We replaced a three-week manual shortlisting cycle with a two-hour review of ScholarAI's ranked list. The explainability panel is what won over our committee — every score has a paper trail.",
    name: "Dr. Kavita Rao",
    role: "Dean of Student Aid, State University",
    hue: 180,
  },
  {
    quote:
      "I had no idea I qualified for a research grant. ScholarAI flagged it, told me exactly which two documents I was missing, and I was funded within a month.",
    name: "Rohan Iyer",
    role: "M.Tech student, funded ₹4.2L",
    hue: 260,
  },
  {
    quote:
      "The fraud signals alone paid for the platform. We caught four inconsistent income declarations in the first cycle — cases we would previously never have noticed.",
    name: "Emily Chen",
    role: "Program Director, Futura Foundation",
    hue: 30,
  },
];

export function Testimonials() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <TextReveal
          text="Trusted on both sides of the decision"
          className="font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight sm:text-5xl"
        />
        <Reveal stagger={0.12} className="mt-14 grid gap-6 lg:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <GlassCard key={t.name} className="flex h-full flex-col">
              <Quote className="h-6 w-6 text-primary-bright/60" />
              <p className="mt-4 flex-1 text-[15px] leading-relaxed text-foreground/90">
                {t.quote}
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Avatar name={t.name} hue={t.hue} />
                <div>
                  <div className="text-sm font-semibold">{t.name}</div>
                  <div className="text-xs text-muted">{t.role}</div>
                </div>
              </div>
            </GlassCard>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ---------- FAQ ----------

const FAQS = [
  {
    q: "How is the AI score calculated?",
    a: "A published weighted model: Academic Performance 22%, Financial Need 18%, Achievements 12%, Research 10%, Leadership 8%, Projects & Skills 8%, SOP 8%, Community Service 7%, Recommendations 4%, Behaviour 3%. Every sub-score shows the exact inputs used — you can audit your own number.",
  },
  {
    q: "Is demographic data used against applicants?",
    a: "Never. Gender, community, and disability fields are used exclusively for inclusion preferences on scholarships that explicitly target those groups (e.g. women-in-STEM). They are never used as penalties, and the fairness note on every match documents this.",
  },
  {
    q: "How does document verification work?",
    a: "Uploaded documents run through an OCR pipeline: text extraction, field validation against your profile, cross-document consistency checks (declared income vs. certificate), and anomaly flags. Institutions see the verification result — not your raw documents — until you apply.",
  },
  {
    q: "What happens when I'm rejected?",
    a: "You get the actual reason: which criteria failed, by how much, and the shortest path to eligibility. Rejection without explanation is the exact problem this platform exists to fix.",
  },
  {
    q: "Can institutions customize the scoring weights?",
    a: "Yes. Institutions can define custom criteria and re-weight the model per scholarship — but every change is versioned in the audit log, so rankings remain reproducible after the fact.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24">
      <div className="mx-auto max-w-3xl px-6">
        <TextReveal
          text="Questions, answered plainly"
          className="text-center font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight sm:text-5xl"
        />
        <Reveal className="mt-12 space-y-3">
          {FAQS.map((f, i) => (
            <div key={f.q} className="glass overflow-hidden rounded-2xl">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left"
                aria-expanded={open === i}
              >
                <span className="font-medium">{f.q}</span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-muted transition-transform duration-300 ${
                    open === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <p className="px-6 pb-5 text-[15px] leading-relaxed text-muted">
                      {f.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ---------- Pricing ----------

const PLANS = [
  {
    name: "Students",
    price: "Free",
    period: "forever",
    tagline: "Matching should never cost the people who need funding.",
    features: [
      "Unlimited scholarship matching",
      "Full explainable score breakdown",
      "Resume analyzer + ATS score",
      "Personal improvement roadmap",
      "AI copilot & deadline tracking",
    ],
    cta: "Create free account",
    href: "/register",
    featured: false,
  },
  {
    name: "Institution",
    price: "$499",
    period: "/month",
    tagline: "For universities and foundations running selection at scale.",
    features: [
      "Everything in Students",
      "AI applicant ranking + heatmaps",
      "OCR document verification pipeline",
      "Fraud detection signals",
      "Custom criteria & weight editor",
      "Exportable committee reports",
      "Full audit log",
    ],
    cta: "Start 30-day pilot",
    href: "/register",
    featured: true,
  },
  {
    name: "Government",
    price: "Custom",
    period: "",
    tagline: "National-scale programs with compliance requirements.",
    features: [
      "Everything in Institution",
      "Dedicated deployment & SLA",
      "GDPR / FERPA compliance pack",
      "SSO, RBAC & data residency",
      "Priority model tuning",
    ],
    cta: "Talk to us",
    href: "/register",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <TextReveal
          text="Free for students. Fair for everyone."
          className="text-center font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight sm:text-5xl"
        />
        <Reveal stagger={0.12} className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`glass relative flex h-full flex-col rounded-2xl p-8 ${
                p.featured
                  ? "border-foreground lg:-my-3 lg:py-11"
                  : ""
              }`}
            >
              {p.featured && (
                <Badge tone="primary" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most popular
                </Badge>
              )}
              <h3 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold">
                {p.name}
              </h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-[family-name:var(--font-space-grotesk)] text-4xl font-bold">
                  {p.price}
                </span>
                <span className="text-sm text-muted">{p.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted">{p.tagline}</p>
              <ul className="mt-6 flex-1 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-foreground/85">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={p.href} className="mt-8">
                <span
                  className={`${p.featured ? "btn-primary" : "btn-ghost"} w-full text-sm`}
                >
                  {p.cta}
                </span>
              </Link>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

// ---------- CTA + Footer ----------

export function FinalCTA() {
  return (
    <section className="relative py-24">
      <div className="mx-auto max-w-4xl px-6">
        <Reveal>
          <div className="glass-strong relative overflow-hidden rounded-3xl p-10 text-center sm:p-16">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-30"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 0%, rgba(109,92,255,0.5) 0%, transparent 60%)",
              }}
            />
            <h2 className="relative font-[family-name:var(--font-space-grotesk)] text-3xl font-bold tracking-tight sm:text-5xl">
              Your scholarship is out there.
              <br />
              <span className="text-gradient">Let the AI find it.</span>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-muted">
              Two minutes to build a profile. A lifetime of not missing
              deadlines you never knew existed.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link href="/register">
                <MagneticButton className="btn-primary px-8 py-4 text-base">
                  Get matched now
                </MagneticButton>
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-[rgba(21,21,21,0.16)] py-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center bg-foreground">
              <GraduationCap className="h-4 w-4 text-background" />
            </span>
            <span className="font-[family-name:var(--font-space-grotesk)] font-bold">
              Scholar<span className="text-gradient">AI</span>
            </span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Fair, explainable, AI-driven scholarship matching for students and
            institutions.
          </p>
        </div>
        {[
          {
            title: "Product",
            links: [
              ["Scholarships", "/scholarships"],
              ["Catalogue", "/catalogue"],
              ["Resume Analyzer", "/resume-analyzer"],
              ["AI Insights", "/dashboard/student"],
              ["Analytics", "/dashboard/institution"],
            ],
          },
          {
            title: "Dashboards",
            links: [
              ["Student", "/dashboard/student"],
              ["Institution", "/dashboard/institution"],
              ["Admin", "/dashboard/admin"],
            ],
          },
          {
            title: "Company",
            links: [
              ["About", "/#how"],
              ["Pricing", "/#pricing"],
              ["FAQ", "/#faq"],
              ["Sign in", "/login"],
            ],
          },
        ].map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-muted">
              {col.title}
            </h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([label, href]) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="text-sm text-foreground/70 transition-colors hover:text-foreground"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-12 flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-[rgba(21,21,21,0.16)] px-6 pt-6 text-xs text-muted">
        <span>© 2026 ScholarAI. Built for fair access to education.</span>
        <span>GDPR ready · FERPA ready · SOC 2 in progress</span>
      </div>
    </footer>
  );
}
