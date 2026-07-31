"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Settings2,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardShell from "@/components/layout/DashboardShell";
import { Avatar, Badge, GlassCard, ProgressBar, StatPill } from "@/components/ui/primitives";
import { useRealtime, type RealtimeEvent } from "@/hooks/useRealtime";
import type { ApplicationStatus, InstitutionAggregates } from "@/lib/datasource";
import { decideApplicationAction } from "@/lib/institution/actions";
import type { FraudReport, StudentProfile } from "@/lib/types";

// New submissions arrive as INSERTs; withdrawal/decision races arrive as
// UPDATEs. Module scope keeps the reference stable across re-renders so the
// channel is created exactly once.
const QUEUE_EVENTS: readonly RealtimeEvent[] = ["INSERT", "UPDATE"];

const PIE_COLORS = ["#151515", "#c4442c", "#75736c", "#494844", "#96762a", "#4a6741", "#a8a49a"];

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

export interface RankedApplicant {
  applicationId: string;
  scholarshipId: string;
  scholarshipName: string;
  status: ApplicationStatus;
  student: StudentProfile;
  /** Frozen snapshot total when the application carries one. */
  aiTotal: number;
  matchScore: number;
  frozen: boolean;
  fraud: FraudReport;
  documentsVerified: number;
  documentsTotal: number;
  rejectionReasons: string[];
  submittedAt: string | null;
}

/** Institution accounts with no institutions row can't own programs yet. */
export function NoInstitutionNotice({ name }: { name: string }) {
  return (
    <DashboardShell
      title="Institution Command Center"
      subtitle="No organisation is linked to this account"
    >
      <div className="hairline max-w-2xl p-8">
        <p className="mono-label text-primary">Setup required</p>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          {name}, this account is not yet linked to an institution record, so
          there are no programs to administer and no applicant queue to show.
          An administrator has to create the organisation before this dashboard
          has anything real to report.
        </p>
      </div>
    </DashboardShell>
  );
}

export default function InstitutionDashboardView({
  orgName,
  applicants,
  aggregates,
  readOnly,
}: {
  orgName: string;
  applicants: RankedApplicant[];
  aggregates: InstitutionAggregates;
  readOnly: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live queue. No filter is passed: an institution cares about every
  // application to any of its programs, and the owning scholarship is not a
  // column on `applications`, so it cannot be expressed as a Realtime
  // filter. The RLS policy "institution reads apps" already restricts the
  // stream to applications against this institution's scholarships, so the
  // socket carries nothing this account could not read anyway.
  //
  // The default reaction (router.refresh()) re-runs the server component
  // that ranks the queue through ai-engine.ts — the ranking is never
  // recomputed client-side, so a live row is scored the same way a
  // refreshed one is. No-ops in demo mode.
  useRealtime("applications", null, undefined, { events: QUEUE_EVENTS });

  const fraudFlagged = applicants.filter((r) => r.fraud.level !== "clear");
  const pendingQueue = applicants.filter(
    (r) => r.status === "submitted" || r.status === "under_review"
  );
  const approved = applicants.filter((r) => r.status === "approved").length;
  const rejected = applicants.filter((r) => r.status === "rejected").length;
  const avgScore = applicants.length
    ? Math.round(applicants.reduce((a, r) => a + r.aiTotal, 0) / applicants.length)
    : 0;
  const strongShare = applicants.length
    ? Math.round((applicants.filter((r) => r.aiTotal >= 60).length / applicants.length) * 100)
    : 0;

  const decide = (r: RankedApplicant, decision: "approve" | "reject") => {
    setError(null);
    setBusyId(r.applicationId);
    startTransition(async () => {
      const result = await decideApplicationAction({
        applicationId: r.applicationId,
        decision,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
      setBusyId(null);
    });
  };

  return (
    <DashboardShell
      title="Institution Command Center"
      subtitle={`${orgName} · ${applicants.length} application${applicants.length === 1 ? "" : "s"} received`}
    >
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {readOnly && (
          <motion.div variants={item} className="hairline flex items-center gap-3 px-4 py-3">
            <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
            <span className="mono-label text-muted">
              Demo mode — decisions are not persisted. Connect a database to record them.
            </span>
          </motion.div>
        )}

        {/* KPI row */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatPill label="Total applicants" value={applicants.length} tone="primary" />
          <StatPill label="Avg AI score" value={avgScore} tone="default" />
          <StatPill label="Fraud flags" value={fraudFlagged.length} tone="danger" />
          <StatPill label="Scoring 60+" value={`${strongShare}%`} tone="success" />
        </motion.div>

        {/* charts row */}
        <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Application volume vs. approvals</h2>
              <Link
                href="/dashboard/institution/scholarships"
                className="btn-ghost !px-3 !py-1.5 text-xs"
                aria-label="Manage your programs"
              >
                <Settings2 className="h-3.5 w-3.5" /> Programs
              </Link>
            </div>
            <div className="mt-4 h-64">
              {aggregates.monthly.length === 0 ? (
                <EmptyChart label="No applications submitted yet — nothing to plot." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={aggregates.monthly}>
                    <defs>
                      <linearGradient id="gApps" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#151515" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#151515" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAI" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#c4442c" stopOpacity={0.08} />
                        <stop offset="100%" stopColor="#c4442c" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(21,21,21,0.16)" vertical={false} />
                    <XAxis dataKey="month" stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} />
                    <Area type="monotone" dataKey="applications" stroke="#151515" fill="url(#gApps)" strokeWidth={2} name="Applications" />
                    <Area type="monotone" dataKey="approvals" stroke="#c4442c" fill="url(#gAI)" strokeWidth={2} name="Approvals" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="font-semibold">Category distribution</h2>
            <div className="mt-2 h-52">
              {aggregates.categories.length === 0 ? (
                <EmptyChart label="No applications to categorise yet." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={aggregates.categories}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      strokeWidth={0}
                    >
                      {aggregates.categories.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={chartTooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {aggregates.categories.map((c, i) => (
                <span key={c.name} className="flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {c.name} {c.value}
                </span>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* geo distribution + fraud alerts */}
        <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2">
            <h2 className="font-semibold">Geographic distribution</h2>
            <div className="mt-4 h-64">
              {aggregates.regions.length === 0 ? (
                <EmptyChart label="No applicant locations on record yet." />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={aggregates.regions}>
                    <CartesianGrid stroke="rgba(21,21,21,0.16)" vertical={false} />
                    <XAxis dataKey="region" stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(21,21,21,0.04)" }} />
                    <Bar dataKey="students" fill="#151515" radius={[6, 6, 0, 0]} name="Applicants" />
                    <Bar dataKey="funded" fill="#4a6741" radius={[6, 6, 0, 0]} name="Approved" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-danger" />
              <h2 className="font-semibold">Fraud alerts</h2>
              <Badge tone="danger" className="ml-auto">{fraudFlagged.length}</Badge>
            </div>
            {fraudFlagged.length === 0 ? (
              <p className="mt-4 text-xs leading-relaxed text-muted">
                No applicant profile trips a fraud heuristic.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {fraudFlagged.slice(0, 5).map((r) => (
                  <li key={r.applicationId} className="glass rounded-xl border border-danger/20 p-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.student.name} hue={r.student.avatarHue} size={30} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{r.student.name}</div>
                        <div className="text-xs text-muted">Risk score {r.fraud.riskScore}/100</div>
                      </div>
                      <Badge tone={r.fraud.level === "flagged" ? "danger" : "warning"} className="!text-[10px]">
                        {r.fraud.level}
                      </Badge>
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-warning" />
                      {r.fraud.signals[0]?.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        </motion.div>

        {/* AI ranking + approval queue */}
        <motion.div variants={item}>
          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary-bright" />
                <h2 className="font-semibold">AI applicant ranking — approval queue</h2>
              </div>
              <p className="text-xs text-muted">
                Ranked by the match score frozen at submission — the basis each
                applicant was judged on
              </p>
            </div>

            {error && (
              <div role="alert" className="hairline mt-4 flex items-center gap-3 border-primary px-4 py-3">
                <span className="h-2 w-2 shrink-0 bg-primary" aria-hidden />
                <span className="mono-label text-primary">{error}</span>
              </div>
            )}

            {pendingQueue.length === 0 ? (
              <p className="mt-5 text-sm leading-relaxed text-muted">
                {applicants.length === 0
                  ? "No applications have been submitted to your programs yet."
                  : "Every application received has been decided — the queue is clear."}
              </p>
            ) : (
              <div className="mt-5 space-y-2.5">
                {pendingQueue.map((r, i) => {
                  const busy = pending && busyId === r.applicationId;
                  return (
                    <div
                      key={r.applicationId}
                      className="glass flex flex-wrap items-center gap-4 rounded-xl border border-[rgba(21,21,21,0.16)] p-4 transition-colors"
                    >
                      <span className="w-6 text-center font-[family-name:var(--font-geist-mono)] text-sm text-muted">
                        {i + 1}
                      </span>
                      <Avatar name={r.student.name} hue={r.student.avatarHue} size={38} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{r.student.name}</span>
                          <span className="text-xs text-muted">
                            {r.student.field} · Yr {r.student.year} · {r.student.location}
                          </span>
                          <span className="text-xs text-muted">→ {r.scholarshipName}</span>
                          {r.fraud.level !== "clear" && (
                            <Badge tone="warning" className="!text-[10px]">
                              <AlertTriangle className="h-3 w-3" /> review
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <ProgressBar value={r.aiTotal} className="max-w-[220px]" />
                          <span className="text-xs text-muted">
                            docs {r.documentsVerified}/{r.documentsTotal}
                          </span>
                          <span className="text-xs text-muted">
                            match {r.matchScore}
                            {r.frozen ? " (frozen at submission)" : " — computed live, no snapshot"}
                          </span>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-primary-bright">
                          {r.aiTotal}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted">AI score</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => decide(r, "approve")}
                          disabled={busy || readOnly}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-success/30 text-success transition-colors hover:bg-success/15 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Approve ${r.student.name}`}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => decide(r, "reject")}
                          disabled={busy || readOnly}
                          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-danger/30 text-danger transition-colors hover:bg-danger/15 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Reject ${r.student.name}`}
                        >
                          {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(21,21,21,0.16)] pt-4">
              <span className="flex items-center gap-2 text-sm text-muted">
                <UserCheck className="h-4 w-4 text-success" />
                {approved} approved · {rejected} rejected to date
              </span>
              <Link
                href="/dashboard/institution/scholarships"
                className="btn-primary !px-4 !py-2 text-sm"
              >
                <Settings2 className="h-4 w-4" /> Manage programs
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </DashboardShell>
  );
}

/** Honest placeholder — an empty dataset never becomes a fake series. */
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="hairline flex h-full items-center justify-center px-6">
      <span className="mono-label text-center text-muted">{label}</span>
    </div>
  );
}
