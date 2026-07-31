"use client";

import "../editions.css";
import Link from "next/link";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Check, Eye, EyeOff, Loader2 } from "lucide-react";
import { signUpAction } from "@/lib/auth/actions";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    n: "01",
    title: "ACCOUNT IDENTITY",
    desc: "credentials & access level",
    heading: ["CREATE", "ACCOUNT"],
  },
  {
    n: "02",
    title: "ACADEMIC PROFILE",
    desc: "signals the engine scores",
    heading: ["ACADEMIC", "DETAILS"],
  },
  {
    n: "03",
    title: "REVIEW & COMMIT",
    desc: "confirm the record",
    heading: ["FINAL", "REVIEW"],
  },
] as const;

const FIELDS = [
  "Computer Science",
  "Engineering",
  "Mathematics",
  "Physics",
  "Biology",
  "Chemistry",
  "Liberal Arts",
  "Other",
];

const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? 40 : -40,
    opacity: 0,
    filter: "blur(6px)",
  }),
  center: { x: 0, opacity: 1, filter: "blur(0px)" },
  exit: (dir: number) => ({
    x: dir >= 0 ? -40 : 40,
    opacity: 0,
    filter: "blur(6px)",
  }),
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [role, setRole] = useState<"student" | "institution">("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    gpa: "",
    year: "",
    field: FIELDS[0],
    achievements: "",
  });
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const goTo = (next: number) => {
    setDirection(next > step ? 1 : -1);
    setError(null);
    setStep(next);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      goTo(step + 1);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await signUpAction({
      role,
      name: form.name,
      email: form.email,
      password: form.password,
      cgpa: form.gpa || undefined,
      year: form.year || undefined,
      field: form.field,
      achievementsText: form.achievements || undefined,
    });
    if (result.ok) {
      router.push(role === "student" ? "/dashboard/student" : "/dashboard/institution");
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  const meta = STEPS[step - 1];

  return (
    <div className="ed flex min-h-screen w-full flex-col lg:flex-row">
      {/* Left panel — step rail */}
      <aside className="relative hidden w-[40%] flex-col border-r border-[var(--ed-hairline)] bg-[var(--ed-ground-2)] p-12 lg:flex">
        <Link href="/" className="ed-display mb-20 text-2xl">
          SCHOLAR<span className="font-medium">AI</span>
        </Link>

        <nav className="flex-1" aria-label="Registration steps">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const state =
              step > idx ? "complete" : step === idx ? "active" : "upcoming";
            return (
              <div key={s.n} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <StepSquare state={state} n={s.n} />
                  {idx < STEPS.length && (
                    <div className="relative my-1 h-14 w-px bg-[var(--ed-hairline)]">
                      <motion.div
                        className="absolute inset-x-0 top-0 origin-top bg-[var(--ed-vermilion)]"
                        initial={false}
                        animate={{ height: step > idx ? "100%" : "0%" }}
                        transition={{ duration: 0.4, ease: [0.33, 1, 0.68, 1] }}
                      />
                    </div>
                  )}
                </div>
                <div className="pt-1.5">
                  <div
                    className={cn(
                      "ed-display text-lg transition-colors",
                      state === "upcoming" && "text-[var(--ed-muted)]"
                    )}
                  >
                    {s.title}
                  </div>
                  <div className="ed-mono mt-1 font-normal lowercase tracking-[0.06em] text-[var(--ed-muted)]">
                    {s.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </nav>

        {/* Specimen note */}
        <div className="ed-hairline p-6">
          <div className="flex items-center justify-between border-b border-[var(--ed-hairline)] pb-3">
            <span className="ed-mono opacity-40">PROFILE SCORE</span>
            <span className="ed-mono">COMPUTED AFTER SETUP</span>
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="ed-mono opacity-40">MODEL</span>
            <span className="ed-mono">EXPLAINABLE — 10 WEIGHTS</span>
          </div>
        </div>

        <div
          className="ed-mono absolute bottom-12 left-4 opacity-50"
          style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
          aria-hidden
        >
          REGISTRATION — EDITION 2026
        </div>
      </aside>

      {/* Right panel — step content */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 md:px-12 lg:px-20">
        <div className="w-full max-w-xl">
          {/* Mobile header + mini rail */}
          <div className="mb-10 flex items-center justify-between lg:hidden">
            <Link href="/" className="ed-display text-xl">
              SCHOLAR<span className="font-medium">AI</span>
            </Link>
            <div className="flex items-center gap-2">
              {STEPS.map((s, i) => (
                <span
                  key={s.n}
                  className={cn(
                    "h-2 w-2",
                    step > i + 1
                      ? "bg-[var(--ed-ink)]"
                      : step === i + 1
                        ? "bg-[var(--ed-vermilion)]"
                        : "border border-[var(--ed-hairline)]"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="ed-mono mb-8 text-[var(--ed-muted)]" aria-live="polite">
            STEP {meta.n} / 03
          </div>

          <form onSubmit={onSubmit}>
            <HeightTransition dep={step}>
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                    filter: { duration: 0.25 },
                  }}
                >
                  <h1 className="ed-display mb-10 text-5xl md:text-6xl">
                    {meta.heading[0]}{" "}
                    <span className="ed-outline">{meta.heading[1]}</span>
                  </h1>

                  {step === 1 && (
                    <div className="space-y-8">
                      <div className="flex gap-4" role="group" aria-label="Account type">
                        {(["student", "institution"] as const).map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            aria-pressed={role === r}
                            className={cn(
                              "ed-mono flex-1 border py-4 transition-colors",
                              role === r
                                ? "border-[var(--ed-ink)] bg-[var(--ed-ink)] text-[var(--ed-ground)]"
                                : "border-[var(--ed-hairline)] hover:border-[var(--ed-ink)]"
                            )}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                      <Field label={role === "student" ? "FULL NAME" : "INSTITUTION NAME"}>
                        <input
                          className="ed-input"
                          name="name"
                          required
                          placeholder={role === "student" ? "Aarya Sharma" : "State University"}
                          autoComplete="name"
                          value={form.name}
                          onChange={(e) => set("name")(e.target.value)}
                        />
                      </Field>
                      <Field label="EMAIL">
                        <input
                          className="ed-input"
                          name="email"
                          type="email"
                          required
                          placeholder="you@university.edu"
                          autoComplete="email"
                          value={form.email}
                          onChange={(e) => set("email")(e.target.value)}
                        />
                      </Field>
                      <Field label="PASSWORD">
                        <EditionsPassword
                          value={form.password}
                          onChange={set("password")}
                        />
                      </Field>
                    </div>
                  )}

                  {step === 2 && (
                    <div className="space-y-8">
                      <div className="grid grid-cols-2 gap-6">
                        <Field label="CGPA (0–10)">
                          <input
                            className="ed-input"
                            name="gpa"
                            inputMode="decimal"
                            placeholder="8.50"
                            value={form.gpa}
                            onChange={(e) => set("gpa")(e.target.value)}
                          />
                        </Field>
                        <Field label="GRADUATION YEAR">
                          <input
                            className="ed-input"
                            name="year"
                            inputMode="numeric"
                            placeholder="2027"
                            value={form.year}
                            onChange={(e) => set("year")(e.target.value)}
                          />
                        </Field>
                      </div>
                      <Field label="FIELD OF STUDY">
                        <select
                          className="ed-input appearance-none"
                          name="field"
                          value={form.field}
                          onChange={(e) => set("field")(e.target.value)}
                        >
                          {FIELDS.map((f) => (
                            <option key={f}>{f}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="ACHIEVEMENTS (OPTIONAL)">
                        <textarea
                          className="ed-input resize-none"
                          name="achievements"
                          rows={4}
                          placeholder="Research, awards, distinctions…"
                          value={form.achievements}
                          onChange={(e) => set("achievements")(e.target.value)}
                        />
                      </Field>
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-8">
                      <dl className="ed-hairline">
                        {(
                          [
                            ["ROLE", role.toUpperCase()],
                            ["NAME", form.name || "—"],
                            ["EMAIL", form.email || "—"],
                            ["CGPA", form.gpa || "—"],
                            ["GRADUATION", form.year || "—"],
                            ["FIELD", form.field],
                          ] as const
                        ).map(([k, v], i) => (
                          <div
                            key={k}
                            className={cn(
                              "flex items-center justify-between px-5 py-4",
                              i > 0 && "border-t border-[var(--ed-hairline)]"
                            )}
                          >
                            <dt className="ed-mono opacity-40">{k}</dt>
                            <dd className="ed-mono">{v}</dd>
                          </div>
                        ))}
                      </dl>
                      <p className="ed-mono-body text-[10px] leading-relaxed opacity-50">
                        BY PROCEEDING YOU ACKNOWLEDGE FAIR USE OF THE AI
                        EVALUATION SYSTEM. SCORES ARE DETERMINISTIC AND
                        AUDITABLE. DEMO BUILD — NO REAL DATA IS STORED.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </HeightTransition>

            {/* Footer actions */}
            {error && (
              <div
                role="alert"
                className="mt-8 flex items-center gap-3 border border-[var(--ed-vermilion)] px-4 py-3"
              >
                <span className="ed-marker" aria-hidden />
                <span className="ed-mono text-[var(--ed-vermilion)]">{error}</span>
              </div>
            )}
            <div className="mt-14 flex items-center justify-between border-t border-[var(--ed-hairline)] pt-8">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="ed-mono cursor-pointer transition-colors hover:text-[var(--ed-vermilion)]"
                >
                  [ BACK ]
                </button>
              ) : (
                <span />
              )}
              <button type="submit" disabled={loading} className="ed-btn-ink px-10 py-4">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> CREATING…
                  </>
                ) : step < 3 ? (
                  "CONTINUE"
                ) : (
                  `CREATE ${role.toUpperCase()} ACCOUNT`
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 text-center">
            <span className="ed-mono font-normal text-[var(--ed-muted)]">
              ALREADY REGISTERED?
            </span>{" "}
            <Link href="/login" className="ed-mono ed-vermilion ml-2 hover:underline">
              SIGN IN
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

function StepSquare({
  state,
  n,
}: {
  state: "complete" | "active" | "upcoming";
  n: string;
}) {
  return (
    <div
      className={cn(
        "flex h-9 w-9 items-center justify-center border transition-colors",
        state === "complete" && "border-[var(--ed-ink)] bg-[var(--ed-ink)]",
        state === "active" && "border-2 border-[var(--ed-ink)]",
        state === "upcoming" && "border-[var(--ed-hairline)]"
      )}
    >
      {state === "complete" ? (
        <Check className="h-4 w-4 text-[var(--ed-ground)]" />
      ) : state === "active" ? (
        <span className="ed-marker" aria-hidden />
      ) : (
        <span className="ed-mono text-[var(--ed-muted)]">{n}</span>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="ed-mono mb-2 block">{label}</span>
      {children}
    </label>
  );
}

function EditionsPassword({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        className="ed-input pr-12"
        name="password"
        type={show ? "text" : "password"}
        required
        minLength={8}
        placeholder="8+ characters"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--ed-muted)] transition-colors hover:text-[var(--ed-ink)]"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

/** Animates container height to fit the current step (AnimatedStepper's
 *  dynamic-height behavior), while keeping the slide overflow hidden. */
function HeightTransition({ dep, children }: { dep: number; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | "auto">("auto");

  useLayoutEffect(() => {
    if (!innerRef.current) return;
    const el = innerRef.current;
    const observer = new ResizeObserver(() => setHeight(el.offsetHeight));
    observer.observe(el);
    setHeight(el.offsetHeight);
    return () => observer.disconnect();
  }, [dep]);

  return (
    <motion.div
      style={{ position: "relative", overflow: "hidden" }}
      animate={{ height }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
    >
      <div ref={innerRef}>{children}</div>
    </motion.div>
  );
}
