"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  Cpu,
  ScrollText,
  ShieldAlert,
  Trophy,
  Users,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge, GlassCard, ProgressBar, StatPill } from "@/components/ui/primitives";
import { WEIGHTS } from "@/lib/ai-engine";
import type { AuditEntry, PlatformStats } from "@/lib/admin/actions";

const chartTooltipStyle = {
  background: "#e8e6df",
  border: "1px solid rgba(21,21,21,0.16)",
  borderRadius: 0,
  color: "#151515",
  fontSize: 11, fontFamily: "var(--font-spline-mono)",
};

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

// The registry is the engine itself — imported, never transcribed, so the
// page cannot drift from the weights that actually score students.
const WEIGHT_SUM = Math.round(WEIGHTS.reduce((a, w) => a + w.weight, 0) * 100);
const WEIGHT_MAX = Math.max(...WEIGHTS.map((w) => w.weight));

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toneFor(action: string): "danger" | "primary" | "neutral" {
  if (action.includes("fraud") || action.includes("flagged") || action.includes("disabled")) {
    return "danger";
  }
  if (action.includes("role") || action.includes("weight") || action.includes("model")) {
    return "primary";
  }
  return "neutral";
}

export default function AdminDashboardView({
  stats,
  audit,
}: {
  stats: PlatformStats;
  audit: AuditEntry[];
}) {
  const a = stats.applicationsByStatus;
  const pipeline = [
    { label: "Draft", value: a.draft },
    { label: "Submitted", value: a.submitted },
    { label: "Under review", value: a.under_review },
    { label: "Approved", value: a.approved },
    { label: "Rejected", value: a.rejected },
  ];
  const pipelineMax = Math.max(...pipeline.map((p) => p.value), 1);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {stats.mode === "demo" && (
        <motion.div variants={item} className="hairline flex items-center gap-3 px-4 py-3">
          <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
          <span className="mono-label text-muted">
            Demo mode — seeded figures. Connect a database for live platform aggregates.
          </span>
        </motion.div>
      )}

      <motion.div variants={item} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatPill
          label="Students"
          value={stats.usersByRole.student.toLocaleString()}
          tone="primary"
        />
        <StatPill label="Institutions" value={stats.usersByRole.institution.toLocaleString()} />
        <StatPill
          label="Active scholarships"
          value={stats.scholarshipsByStatus.active.toLocaleString()}
          tone="success"
        />
        <StatPill
          label="Applications"
          value={stats.totalApplications.toLocaleString()}
          tone="warning"
        />
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
        {/* platform activity — monthly application volume from SQL */}
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary-bright" />
            <h2 className="font-semibold">Platform activity</h2>
            <span className="ml-auto text-xs text-muted">by month created</span>
          </div>
          {stats.monthly.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              No applications recorded yet. This chart plots real submission and
              approval volume per month as soon as students apply.
            </p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.monthly}>
                  <CartesianGrid stroke="rgba(21,21,21,0.16)" vertical={false} />
                  <XAxis dataKey="month" stroke="#75736c" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#75736c" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="applications" stroke="#151515" strokeWidth={2} dot={false} name="Applications" />
                  <Line type="monotone" dataKey="approvals" stroke="#4a6741" strokeWidth={2} dot={false} name="Approvals" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        {/* decision pipeline — applications by status */}
        <GlassCard>
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-accent" />
            <h2 className="font-semibold">Decision pipeline</h2>
          </div>
          {stats.totalApplications === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              No applications in the pipeline.
            </p>
          ) : (
            <ul className="mt-5 space-y-4">
              {pipeline.map((p) => (
                <li key={p.label}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-foreground/85">{p.label}</span>
                    <span className="text-xs text-muted">{p.value.toLocaleString()}</span>
                  </div>
                  <ProgressBar value={(p.value / pipelineMax) * 100} />
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 bg-[rgba(21,21,21,0.04)] p-3 text-xs leading-relaxed text-muted">
            {stats.approvalRate === null ? (
              <>Approval rate unavailable — no application has been decided yet.</>
            ) : (
              <>
                Approval rate {stats.approvalRate}% · {stats.decidedApplications.toLocaleString()}{" "}
                decided of {stats.totalApplications.toLocaleString()}
              </>
            )}
          </div>
        </GlassCard>
      </motion.div>

      <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
        {/* engine registry — the actual published WEIGHTS */}
        <GlassCard>
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary-bright" />
            <h2 className="font-semibold">Scoring model registry</h2>
            <Badge tone="neutral" className="ml-auto !text-[10px]">
              {WEIGHTS.length} weights
            </Badge>
          </div>
          <ul className="mt-4 space-y-3">
            {WEIGHTS.map((w) => {
              const pct = Math.round(w.weight * 1000) / 10;
              return (
                <li key={w.key} className="hairline p-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium">{w.label}</span>
                    <span className="font-[family-name:var(--font-spline-mono)] text-xs text-muted">
                      {pct}%
                    </span>
                  </div>
                  <div className="mt-2">
                    {/* scaled against the largest weight so the bars stay readable */}
                    <ProgressBar value={(w.weight / WEIGHT_MAX) * 100} />
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Published weights sum to {WEIGHT_SUM}% — read directly from{" "}
            <span className="font-[family-name:var(--font-spline-mono)]">
              src/lib/ai-engine.ts
            </span>
            , the same array that scores every profile.
          </p>
        </GlassCard>

        {/* audit log — real rows */}
        <GlassCard>
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-accent" />
            <h2 className="font-semibold">Audit log</h2>
            <Link href="/dashboard/admin/audit" className="mono-label ml-auto text-primary">
              View all
            </Link>
          </div>
          {audit.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">
              No audit entries yet. Decisions, weight edits and admin actions are
              appended here as they happen.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {audit.map((entry) => (
                <li
                  key={entry.id}
                  className="flex gap-3 border-b border-[rgba(21,21,21,0.16)] pb-3 last:border-0"
                >
                  <span className="font-[family-name:var(--font-spline-mono)] text-xs text-muted">
                    {timeOf(entry.createdAt)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">
                      {entry.action}{" "}
                      <span className="text-muted">
                        → {entry.entity} {entry.entityId.slice(0, 8)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {entry.actorEmail ?? "system"} ·{" "}
                      <Badge tone={toneFor(entry.action)} className="!px-2 !py-0 !text-[10px]">
                        {entry.entity}
                      </Badge>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </motion.div>

      {/* management shortcuts */}
      <motion.div variants={item} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ShortcutLink
          href="/dashboard/admin/users"
          icon={Users}
          label="Manage users"
          sub={`${stats.totalUsers.toLocaleString()} profiles${
            stats.disabledUsers > 0 ? ` · ${stats.disabledUsers} disabled` : ""
          }`}
        />
        <ShortcutLink
          href="/dashboard/admin/audit"
          icon={ScrollText}
          label="Audit log"
          sub="Append-only trail"
        />
        <ShortcutLink
          href="/scholarships"
          icon={Trophy}
          label="Scholarships"
          sub={`${stats.totalScholarships.toLocaleString()} total · ${stats.scholarshipsByStatus.draft.toLocaleString()} draft`}
        />
        <ShortcutLink
          href="/dashboard/institution"
          icon={Building2}
          label="Institution view"
          sub={`${stats.usersByRole.institution.toLocaleString()} organizations`}
        />
      </motion.div>
    </motion.div>
  );
}

function ShortcutLink({
  href,
  icon: Icon,
  label,
  sub,
}: {
  href: string;
  icon: typeof Users;
  label: string;
  sub: string;
}) {
  return (
    <Link href={href} className="glass card-hover block p-5 text-left">
      <Icon className="h-5 w-5 text-primary-bright" />
      <div className="mt-3 text-sm font-semibold">{label}</div>
      <div className="mt-0.5 text-xs text-muted">{sub}</div>
    </Link>
  );
}
