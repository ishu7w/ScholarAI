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
        "glass p-6",
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
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    primary: "text-primary",
  };
  return (
    <div className={cn("hairline bg-transparent px-4 py-3", className)}>
      <div
        className={cn(
          "text-lg font-semibold font-[family-name:var(--font-space-grotesk)]",
          tones[tone]
        )}
      >
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
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
    primary: "bg-transparent text-primary",
    success: "bg-transparent text-success",
    warning: "bg-transparent text-warning",
    danger: "bg-transparent text-danger",
    neutral: "bg-transparent text-muted",
    accent: "bg-transparent text-accent",
  };
  return <span className={cn("badge", tones[tone], className)}>{children}</span>;
}

export function ProgressBar({
  value,
  className,
  color = "#151515",
}: {
  value: number;
  className?: string;
  color?: string;
}) {
  return (
    <div
      className={cn("h-0.5 w-full overflow-hidden bg-[rgba(21,21,21,0.16)]", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full transition-[width] duration-700 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

export function Avatar({
  name,
  size = 40,
  className,
}: {
  name: string;
  hue: number; // kept for API compatibility — the editorial avatar is ink-on-paper
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
        "flex shrink-0 items-center justify-center border border-[rgba(21,21,21,0.16)] bg-background font-[family-name:var(--font-spline-mono)] font-semibold text-foreground",
        className
      )}
      style={{
        width: size,
        height: size,
        fontSize: size / 2.9,
        letterSpacing: "0.05em",
      }}
      aria-hidden
    >
      {initials}
    </div>
  );
}
