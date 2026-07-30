# Shared UI Components — ScholarAI

Stack: Next.js 16.2.12 (App Router, Turbopack) · React 19.2.4 · TypeScript · Tailwind CSS v4 · GSAP 3.15 (+ScrollTrigger, SplitText) · Lenis · Framer Motion 12 · lucide-react · recharts 3. No third-party component library — all primitives are custom, dark glassmorphism style. Global CSS utility classes (`.glass`, `.glass-strong`, `.btn-primary`, `.btn-ghost`, `.input-premium`, `.badge`, `.text-gradient`, `.card-hover`) live in `src/app/globals.css` (see theme.md).

## Utility: cn
- Path: `src/lib/utils.ts`
- clsx + tailwind-merge class combiner, plus formatting helpers used across pages.

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
```

## Primitives (GlassCard, StatPill, Badge, ProgressBar, Avatar)
- Path: `src/components/ui/primitives.tsx`
- Core visual primitives: glass card, stat pill, tonal badge, gradient progress bar, initials avatar.
- Props: GlassCard `{children, className?, hover?}` · StatPill `{label, value, tone?}` · Badge `{children, tone?}` · ProgressBar `{value, color?}` · Avatar `{name, hue, size?}`

```tsx
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function GlassCard({
  children,
  className,
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass rounded-2xl p-6",
        hover && "card-hover cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

export function StatPill({
  label,
  value,
  tone = "default",
  className,
}: {
  label: string;
  value: string | number;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  className?: string;
}) {
  const tones: Record<string, string> = {
    default: "bg-white/5 text-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
    primary: "bg-primary/15 text-primary-bright",
  };
  return (
    <div className={cn("rounded-xl px-4 py-3", tones[tone], className)}>
      <div className="text-lg font-semibold font-[family-name:var(--font-space-grotesk)]">
        {value}
      </div>
      <div className="text-xs text-muted">{label}</div>
    </div>
  );
}

export function Badge({
  children,
  tone = "primary",
  className,
}: {
  children: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral" | "accent";
  className?: string;
}) {
  const tones: Record<string, string> = {
    primary: "bg-primary/15 text-primary-bright border border-primary/25",
    success: "bg-success/10 text-success border border-success/25",
    warning: "bg-warning/10 text-warning border border-warning/25",
    danger: "bg-danger/10 text-danger border border-danger/25",
    neutral: "bg-white/5 text-muted border border-white/10",
    accent: "bg-accent/10 text-accent border border-accent/25",
  };
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

export function ProgressBar({
  value,
  className,
  color = "linear-gradient(90deg, #6d5cff, #22d3ee)",
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/8", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

export function Avatar({
  name,
  hue,
  size = 40,
  className,
}: {
  name: string;
  hue: number;
  size?: number;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size / 2.6,
        background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 50) % 360} 70% 45%))`,
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
```

## ScoreRing
- Path: `src/components/ui/ScoreRing.tsx`
- Animated circular SVG score gauge (GSAP stroke-draw + count-up on scroll into view). Auto color: >=75 green, >=50 violet, else amber.
- Props: `{value, size?, strokeWidth?, label?, color?}`

```tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

/** Animated circular score gauge (SVG stroke draw). */
export default function ScoreRing({
  value,
  size = 120,
  strokeWidth = 8,
  label,
  className,
  color,
}: {
  value: number; // 0–100
  size?: number;
  strokeWidth?: number;
  label?: string;
  className?: string;
  color?: string;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const resolved =
    color ?? (value >= 75 ? "#34d399" : value >= 50 ? "#8b7cff" : "#fbbf24");

  useEffect(() => {
    const circle = circleRef.current;
    const num = numRef.current;
    if (!circle || !num) return;

    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: value,
      duration: 1.6,
      ease: "power2.out",
      onUpdate: () => {
        num.textContent = String(Math.round(obj.v));
        circle.style.strokeDashoffset = String(
          circumference * (1 - obj.v / 100)
        );
      },
      scrollTrigger: { trigger: circle, start: "top 92%", once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [value, circumference]);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label ?? "Score"}: ${value} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={resolved}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{ filter: `drop-shadow(0 0 8px ${resolved}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          ref={numRef}
          className="font-[family-name:var(--font-space-grotesk)] font-bold"
          style={{ fontSize: size / 4 }}
        >
          0
        </span>
        {label && (
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
```

## Effect Components (`src/components/effects/`)

### Reveal
- Path: `src/components/effects/Reveal.tsx`
- GSAP fade+slide-in on scroll; optional child stagger. Props: `{children, delay?, y?, stagger?}`

```tsx
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
```

### TextReveal
- Path: `src/components/effects/TextReveal.tsx`
- Line-masked heading reveal via GSAP SplitText. Props: `{text, as?, delay?}`

```tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Line-masked text reveal using SplitText. */
export default function TextReveal({
  text,
  className,
  as: Tag = "h2",
  delay = 0,
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "p";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current?.firstElementChild as HTMLElement | null;
    if (!el) return;

    let split: SplitText | undefined;
    const ctx = gsap.context(() => {
      split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, {
            yPercent: 110,
            duration: 0.9,
            delay,
            stagger: 0.08,
            ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        },
      });
    }, ref);

    return () => {
      ctx.revert();
      split?.revert();
    };
  }, [delay, text]);

  return (
    <div ref={ref}>
      <Tag className={cn(className)}>{text}</Tag>
    </div>
  );
}
```

### MagneticButton
- Path: `src/components/effects/MagneticButton.tsx`
- Button magnetically pulls toward cursor (gsap.quickTo). Disabled on touch. Props: `{children, strength?, onClick?}`

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/** Button that magnetically pulls toward the cursor on hover. */
export default function MagneticButton({
  children,
  className,
  strength = 0.35,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      xTo((e.clientX - (rect.left + rect.width / 2)) * strength);
      yTo((e.clientY - (rect.top + rect.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [strength]);

  return (
    <button ref={ref} onClick={onClick} className={cn("cursor-pointer", className)}>
      {children}
    </button>
  );
}
```

### TiltCard
- Path: `src/components/effects/TiltCard.tsx`
- Subtle 3D tilt following cursor. Props: `{children, max?}`

```tsx
"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { cn } from "@/lib/utils";

/** Card with a subtle 3D tilt following the cursor. */
export default function TiltCard({
  children,
  className,
  max = 8,
}: {
  children: ReactNode;
  className?: string;
  max?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const rxTo = gsap.quickTo(el, "rotationX", { duration: 0.5, ease: "power2.out" });
    const ryTo = gsap.quickTo(el, "rotationY", { duration: 0.5, ease: "power2.out" });

    gsap.set(el, { transformPerspective: 900 });

    const move = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      ryTo(px * max);
      rxTo(-py * max);
    };
    const leave = () => {
      rxTo(0);
      ryTo(0);
    };

    el.addEventListener("mousemove", move);
    el.addEventListener("mouseleave", leave);
    return () => {
      el.removeEventListener("mousemove", move);
      el.removeEventListener("mouseleave", leave);
    };
  }, [max]);

  return (
    <div ref={ref} className={cn("will-change-transform", className)}>
      {children}
    </div>
  );
}
```

### AnimatedCounter
- Path: `src/components/effects/AnimatedCounter.tsx`
- Counts 0 → value on scroll into view. Props: `{value, suffix?, prefix?, decimals?, duration?}`

```tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Counts from 0 to `value` when scrolled into view. */
export default function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
  duration = 1.8,
}: {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const obj = { v: 0 };
    const render = () => {
      el.textContent = `${prefix}${obj.v.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`;
    };
    render();

    const tween = gsap.to(obj, {
      v: value,
      duration,
      ease: "power2.out",
      onUpdate: render,
      scrollTrigger: { trigger: el, start: "top 90%", once: true },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, [value, suffix, prefix, decimals, duration]);

  return <span ref={ref} className={className} />;
}
```

### ScrollProgress
- Path: `src/components/effects/ScrollProgress.tsx`
- Fixed 2px gradient bar tracking page scroll (scrub). No props.

```tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Thin gradient bar at the top of the page tracking scroll progress. */
export default function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const tween = gsap.to(el, {
      scaleX: 1,
      ease: "none",
      scrollTrigger: {
        trigger: document.documentElement,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.3,
      },
    });

    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[2px]">
      <div
        ref={ref}
        className="h-full w-full origin-left scale-x-0"
        style={{
          background: "linear-gradient(90deg, #6d5cff, #22d3ee, #34d399)",
        }}
      />
    </div>
  );
}
```

### CursorGlow
- Path: `src/components/effects/CursorGlow.tsx`
- 600px radial violet/cyan glow following cursor; skipped on touch / reduced motion. No props.

```tsx
"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Soft radial glow that follows the cursor. Renders nothing on touch devices. */
export default function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });

    const move = (e: MouseEvent) => {
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
      className="pointer-events-none fixed left-0 top-0 z-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
      style={{
        background:
          "radial-gradient(circle, rgba(109,92,255,0.14) 0%, rgba(34,211,238,0.05) 40%, transparent 70%)",
      }}
    />
  );
}
```

### LoadingScreen
- Path: `src/components/effects/LoadingScreen.tsx`
- One-shot brand loader: staggered "ScholarAI" letters + gradient bar, then slides up. No props.

```tsx
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
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-[#05060a]"
      aria-hidden
    >
      <div className="flex overflow-hidden font-[family-name:var(--font-space-grotesk)] text-4xl font-bold tracking-tight sm:text-6xl">
        {"ScholarAI".split("").map((ch, i) => (
          <span key={i} data-loader-letter className="inline-block">
            <span className={i >= 7 ? "text-gradient" : "text-white"}>{ch}</span>
          </span>
        ))}
      </div>
      <div className="h-[2px] w-48 overflow-hidden rounded bg-white/10">
        <div
          data-loader-bar
          className="h-full w-full origin-left scale-x-0"
          style={{ background: "linear-gradient(90deg, #6d5cff, #22d3ee)" }}
        />
      </div>
    </div>
  );
}
```

## Other shared components (source elsewhere)
- `src/components/chat/ChatAssistant.tsx` — floating AI chat widget (Framer Motion popover, rule-based replies from `lib/ai-engine`), rendered on landing + most dashboard pages. Default export, no props.
- `src/components/auth/AuthShell.tsx` — auth card shell + `PasswordInput` + `useFakeAuth` hook (full source in layouts.md).
