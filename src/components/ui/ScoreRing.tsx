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
  // Progress/active state — the one place vermilion is allowed to draw a line.
  const resolved = color ?? "#C4442C";

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
          stroke="rgba(21,21,21,0.16)"
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
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
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
