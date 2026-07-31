"use client";

import "../editions.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Scholarship } from "@/lib/types";
import { WEIGHTS } from "@/lib/ai-engine";
import { cn, formatCurrency } from "@/lib/utils";

// The four featured "editions" with their headline treatments
const EDITIONS = [
  {
    id: "sch-merit-excellence",
    label: "01 MERIT",
    lines: [
      { text: "NATIONAL MERIT" },
      { text: "EXCELLENCE", outline: true },
      { text: "AWARD" },
    ],
  },
  {
    id: "sch-stem-women",
    label: "02 STEM WOMEN",
    lines: [
      { text: "WOMEN IN STEM" },
      { text: "LEADERSHIP", outline: true },
      { text: "GRANT" },
    ],
  },
  {
    id: "sch-need-first",
    label: "03 NEED FIRST",
    lines: [
      { text: "FIRST HORIZON" },
      { text: "NEED-BASED", outline: true },
      { text: "FUND" },
    ],
  },
  {
    id: "sch-research-grant",
    label: "04 RESEARCH",
    lines: [
      { text: "EMERGING" },
      { text: "RESEARCHER", outline: true },
      { text: "GRANT" },
    ],
  },
] as const;

const PROCESS = [
  {
    n: "01",
    title: "ELIGIBILITY GATES",
    body: "Hard criteria are checked first — CGPA floors, income ceilings, attendance, field and location. A gate failure is reported as a plain-language reason, never a silent rejection.",
  },
  {
    n: "02",
    title: "WEIGHTED SCORING",
    body: "Ten published weights score every profile identically. The same inputs always produce the same score — deterministic, reproducible, comparable.",
  },
  {
    n: "03",
    title: "PLAIN-LANGUAGE EXPLANATION",
    body: "Every score is translated into readable reasoning: why selected, why rejected, and what to improve before the next window.",
  },
  {
    n: "04",
    title: "FAIRNESS NOTE",
    body: "Demographic fields are used only for inclusion preferences on programs that explicitly target those groups — never as penalties. Each match documents this.",
  },
];

function shortDate(iso: string) {
  return new Date(iso)
    .toLocaleDateString("en-US", { month: "short", day: "numeric" })
    .toUpperCase();
}

export default function CatalogueView({
  scholarships,
}: {
  scholarships: Scholarship[];
}) {
  const [active, setActive] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const subjectRef = useRef<HTMLDivElement>(null);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Featured editions resolve against live rows; any that are missing
  // (closed, renamed) are dropped rather than rendered as blanks.
  const featured = useMemo(
    () =>
      EDITIONS.map((e) => ({
        ...e,
        sch: scholarships.find((s) => s.id === e.id),
      })).filter((e): e is (typeof EDITIONS)[number] & { sch: Scholarship } =>
        Boolean(e.sch)
      ),
    [scholarships]
  );
  const current = featured[Math.min(active, Math.max(featured.length - 1, 0))];

  const totals = useMemo(() => {
    const seats = scholarships.reduce((sum, s) => sum + s.seats, 0);
    return { editions: scholarships.length, seats };
  }, [scholarships]);

  // Motion: blur reveals + spine + ghost parallax. All start states are
  // scoped to .ed-motion so reduced-motion / no-JS get the finished page.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      if (spineRef.current) {
        spineRef.current.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;
      }
      if (!reduced) {
        // Ghost counter-travels while the subject lifts and recedes
        if (ghostRef.current) {
          ghostRef.current.style.transform = `translateX(${-y * 0.18}px)`;
        }
        if (subjectRef.current) {
          subjectRef.current.style.transform = `translateY(${-y * 0.06}px)`;
        }
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    let observer: IntersectionObserver | undefined;
    if (!reduced) {
      root.classList.add("ed-motion");
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const items = entry.target.querySelectorAll(
              "[data-reveal], [data-reveal-subject]"
            );
            items.forEach((el, i) => {
              (el as HTMLElement).style.animationDelay = `${i * 0.09}s`;
              el.classList.add("ed-revealed");
            });
            observer?.unobserve(entry.target);
          }
        },
        { threshold: 0.15 }
      );
      root
        .querySelectorAll("[data-reveal-group]")
        .forEach((g) => observer!.observe(g));
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, []);

  // Inspect controls: swap every figure at once so the page always agrees
  const inspect = (i: number) => {
    if (i === active) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setActive(i);
      return;
    }
    setSwapping(true);
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(() => {
      setActive(i);
      setSwapping(false);
    }, 350);
  };

  return (
    <div ref={rootRef} className="ed min-h-screen md:pl-[34px]">
      {/* Fixed progress spine */}
      <div ref={spineRef} className="ed-spine" aria-hidden />

      {/* Fixed vertical rail */}
      <aside className="ed-rail hidden md:flex" aria-hidden>
        <span className="ed-mono py-8 opacity-40">
          SCHOLARAI — CATALOGUE OF FUNDED FUTURES — 2026
        </span>
      </aside>

      {/* Inspect controls (desktop) */}
      <nav className="ed-inspect hidden lg:flex" aria-label="Inspect edition">
        {featured.map((e, i) => (
          <button
            key={e.id}
            type="button"
            className="ed-inspect-btn ed-mono"
            aria-pressed={i === active}
            onClick={() => inspect(i)}
          >
            {e.label}
          </button>
        ))}
      </nav>

      {/* Top bar */}
      <header className="ed-hairline-t flex items-center justify-between border-t-0 border-b border-[var(--ed-hairline)] px-6 py-4 md:px-12">
        <Link href="/" className="ed-display text-xl">
          SCHOLAR<span className="font-medium">AI</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link href="/scholarships" className="ed-mono opacity-60 transition-opacity hover:opacity-100">
            Explorer
          </Link>
          <Link href="/register" className="ed-mono ed-vermilion">
            Register
          </Link>
        </div>
      </header>

      {/* HERO — broadsheet spread */}
      <section
        className="relative flex min-h-[calc(100vh-57px)] flex-col overflow-hidden bg-[var(--ed-ground-2)]"
        data-reveal-group
      >
        <div ref={ghostRef} className="ed-ghost" aria-hidden>
          {String(active + 1).padStart(2, "0")}
        </div>

        <div className="z-10 flex flex-1 flex-col gap-12 px-6 py-14 md:px-12 lg:flex-row lg:gap-0 lg:px-20 lg:py-20">
          {/* Copy column */}
          <div
            className={cn(
              "flex flex-col justify-center lg:w-[58%] lg:pr-16",
              swapping && "ed-swapping"
            )}
          >
            <div className="ed-mono ed-vermilion ed-swap mb-8" data-reveal>
              EDITION {String(active + 1).padStart(2, "0")} —{" "}
              {current.sch.category.toUpperCase()}
            </div>
            <h1
              className="ed-display ed-swap mb-10 text-[clamp(38px,6.4vw,104px)]"
              data-reveal
            >
              {current.lines.map((l) => (
                <span
                  key={l.text}
                  className={cn("block", "outline" in l && l.outline && "ed-outline")}
                >
                  {l.text}
                </span>
              ))}
            </h1>
            <p className="ed-mono-body ed-swap mb-12 max-w-lg opacity-80" data-reveal>
              {current.sch.description} — {formatCurrency(current.sch.amount)}{" "}
              award. Provider: {current.sch.provider}. Fully explainable AI
              selection.
            </p>
            <div className="flex flex-wrap gap-4" data-reveal>
              <Link href={`/scholarships/${current.sch.id}`} className="ed-btn-ink">
                View Criteria
              </Link>
              <a href="#ledger" className="ed-btn-outline">
                How Matching Works
              </a>
            </div>
          </div>

          {/* Specimen card */}
          <div className="flex flex-col lg:w-[42%]">
            <div
              ref={subjectRef}
              className={cn("ed-hairline flex flex-1 flex-col bg-[var(--ed-ground)]", swapping && "ed-swapping")}
              aria-label={`Specimen card — ${current.sch.name}`}
            >
              <div
                className="ed-plate flex h-[280px] items-center justify-center border-0 border-b border-[var(--ed-hairline)] md:h-[380px]"
                data-reveal-subject
              >
                <span className="ed-display ed-swap text-[80px] opacity-10 md:text-[120px]">
                  {String(active + 1).padStart(2, "0")}
                </span>
              </div>
              <dl className="ed-swap">
                {(
                  [
                    ["EDITION", `${String(active + 1).padStart(2, "0")}-2026`],
                    ["AWARD", formatCurrency(current.sch.amount)],
                    ["DEADLINE", shortDate(current.sch.deadline)],
                    ["SEATS", String(current.sch.seats)],
                    ["APPLICANTS", current.sch.applicants.toLocaleString("en-US")],
                  ] as const
                ).map(([k, v]) => (
                  <div
                    key={k}
                    className="ed-hairline-t flex items-center justify-between px-6 py-3.5"
                  >
                    <dt className="ed-mono opacity-40">{k}</dt>
                    <dd className="ed-mono">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Inspect controls (mobile/tablet) */}
            <div className="mt-6 flex flex-wrap gap-2 lg:hidden">
              {featured.map((e, i) => (
                <button
                  key={e.id}
                  type="button"
                  className={cn(
                    "ed-mono border px-4 py-3 transition-colors",
                    i === active
                      ? "border-[var(--ed-ink)] text-[var(--ed-ink)]"
                      : "border-[var(--ed-hairline)] text-[var(--ed-muted)]"
                  )}
                  aria-pressed={i === active}
                  onClick={() => inspect(i)}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom rail */}
        <div className="ed-hairline-t z-10 flex items-center justify-between bg-[var(--ed-ground-2)] px-6 py-6 md:px-12 lg:px-20">
          <div className="ed-mono opacity-60">SCROLL TO INSPECT THE COLLECTION</div>
          <div className="mx-8 hidden h-px flex-1 bg-[var(--ed-hairline)] sm:block" />
          <div className={cn("ed-mono ed-swap", swapping && "ed-swapping")}>
            {String(active + 1).padStart(2, "0")} / 04
          </div>
        </div>
      </section>

      {/* SELECTION LEDGER — published weights + data grid */}
      <section id="ledger" className="px-6 py-24 md:px-12 lg:px-20 lg:py-32" data-reveal-group>
        <div className="mx-auto max-w-6xl">
          <div className="ed-mono ed-vermilion mb-4" data-reveal>
            INDEX 02 — SELECTION LEDGER
          </div>
          <div className="mb-12 h-px w-full bg-[var(--ed-hairline)]" />

          <div className="mb-16 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
            <h2 className="ed-display text-5xl md:text-6xl lg:col-span-5" data-reveal>
              HOW THE AI
              <span className="ed-outline block">DECIDES</span>
            </h2>
            <p className="ed-mono-body self-end opacity-80 lg:col-span-7" data-reveal>
              A deterministic scoring engine weighs ten published signals. Same
              inputs, same score, every time — no black boxes, no hidden
              criteria. The full weight table is printed below.
            </p>
          </div>

          <div className="mb-20" data-reveal>
            {WEIGHTS.map((w) => (
              <div
                key={w.key}
                className="ed-hairline-t grid grid-cols-2 items-center gap-4 py-5 md:grid-cols-12 md:gap-8"
              >
                <div className="ed-mono ed-vermilion md:col-span-4">
                  {w.label.toUpperCase()}
                </div>
                <div className="ed-mono text-right md:order-3 md:col-span-2">
                  {Math.round(w.weight * 100)} / 100
                </div>
                <div className="col-span-2 md:order-2 md:col-span-6">
                  <div className="h-px w-full bg-[var(--ed-hairline)]">
                    <div
                      className="h-px bg-[var(--ed-ink)]"
                      style={{ width: `${w.weight * 100 * 4}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between border-t-2 border-[var(--ed-ink)] py-5">
              <span className="ed-mono">WEIGHTS SUM TO 100% — FULLY EXPLAINABLE</span>
              <span className="ed-mono hidden opacity-40 sm:block">
                DETERMINISTIC ENGINE
              </span>
            </div>
          </div>

          <div
            className="ed-hairline grid grid-cols-1 gap-px bg-[var(--ed-hairline)] md:grid-cols-3"
            data-reveal
          >
            {(
              [
                [String(totals.editions), "EDITIONS IN THE COLLECTION"],
                [totals.seats.toLocaleString("en-US"), "FUNDED SEATS"],
                ["100%", "EXPLAINABLE DECISIONS"],
              ] as const
            ).map(([n, label]) => (
              <div key={label} className="bg-[var(--ed-ground)] p-10 md:p-12">
                <div className="ed-display mb-4 text-6xl md:text-7xl">{n}</div>
                <div className="ed-mono opacity-60">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EDITIONS TABLE */}
      <section className="px-6 py-24 md:px-12 lg:px-20 lg:py-32" data-reveal-group>
        <div className="mx-auto max-w-6xl">
          <div className="ed-mono ed-vermilion mb-4" data-reveal>
            INDEX 03 — ACTIVE COLLECTION
          </div>
          <div className="mb-8 h-px w-full bg-[var(--ed-hairline)]" />

          <div
            className="ed-mono mb-4 hidden grid-cols-12 gap-4 pb-4 opacity-40 md:grid"
            data-reveal
          >
            <div className="col-span-5">EDITION</div>
            <div className="col-span-2">CATEGORY</div>
            <div className="col-span-2">AWARD</div>
            <div className="col-span-2 text-right">DEADLINE</div>
            <div className="col-span-1 text-right">SEATS</div>
          </div>

          <div data-reveal>
            {scholarships.map((s, i) => (
              <Link
                key={s.id}
                href={`/scholarships/${s.id}`}
                className="ed-hairline-t group grid grid-cols-2 items-center gap-x-4 gap-y-2 py-6 md:grid-cols-12"
              >
                <div className="col-span-2 flex items-center gap-4 md:col-span-5">
                  <span
                    className={cn(
                      "ed-marker transition-opacity",
                      "opacity-0 group-hover:opacity-100",
                      i === active && "opacity-100"
                    )}
                  />
                  <span className="ed-display text-xl transition-colors group-hover:text-[var(--ed-ink-2)] md:text-2xl">
                    {s.name.toUpperCase()}
                  </span>
                </div>
                <div className="ed-mono opacity-70 md:col-span-2">
                  {s.category.toUpperCase()}
                </div>
                <div className="ed-mono md:col-span-2">{formatCurrency(s.amount)}</div>
                <div className="ed-mono opacity-70 md:col-span-2 md:text-right">
                  {shortDate(s.deadline)}
                </div>
                <div className="ed-mono md:col-span-1 md:text-right">{s.seats}</div>
              </Link>
            ))}
            <div className="h-px w-full bg-[var(--ed-hairline)]" />
          </div>
        </div>
      </section>

      {/* PROTOCOL */}
      <section className="px-6 py-24 md:px-12 lg:px-20 lg:py-32" data-reveal-group>
        <div className="mx-auto max-w-6xl">
          <div className="ed-mono ed-vermilion mb-4" data-reveal>
            INDEX 04 — PROTOCOL
          </div>
          <div className="mb-12 h-px w-full bg-[var(--ed-hairline)]" />

          {PROCESS.map((p) => (
            <div
              key={p.n}
              className="ed-hairline-t flex flex-col gap-4 py-10 md:flex-row md:items-start md:gap-12"
              data-reveal
            >
              <div className="ed-mono ed-vermilion pt-1">{p.n}</div>
              <div>
                <div className="ed-display mb-3 text-3xl md:text-4xl">{p.title}</div>
                <div className="ed-mono-body max-w-xl opacity-60">{p.body}</div>
              </div>
            </div>
          ))}
          <div className="h-px w-full bg-[var(--ed-hairline)]" />
        </div>
      </section>

      {/* CLOSE */}
      <section className="overflow-hidden px-6 pt-24 md:px-12 lg:px-20 lg:pt-32" data-reveal-group>
        <div className="mx-auto max-w-6xl">
          <div className="mb-16 flex flex-col justify-between gap-10 lg:flex-row lg:items-end">
            <div data-reveal>
              <h2 className="ed-display mb-6 text-5xl md:text-7xl">
                EVERY DECISION
                <span className="ed-outline block">ACCOUNTED FOR</span>
              </h2>
              <p className="ed-mono-body opacity-40">
                Demo build — deterministic seed data. Every score on this page is
                reproducible from the published weights.
              </p>
            </div>
            <div className="flex flex-wrap gap-4" data-reveal>
              <Link href="/register" className="ed-btn-ink">
                Start Application
              </Link>
              <Link href="/dashboard/institution" className="ed-btn-outline">
                Institutional Access
              </Link>
            </div>
          </div>
          <div className="h-px w-full bg-[var(--ed-hairline)]" />
        </div>

        {/* Wordmark cropped by the page edge */}
        <div className="w-full overflow-hidden text-center">
          <div className="ed-display translate-y-[0.17em] text-[clamp(70px,19vw,290px)] leading-none opacity-10">
            SCHOLARAI
          </div>
        </div>
      </section>
    </div>
  );
}
