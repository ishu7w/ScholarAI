"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Scale,
  Sparkles,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import ChatAssistant from "@/components/chat/ChatAssistant";
import ScoreRing from "@/components/ui/ScoreRing";
import { Badge, GlassCard, ProgressBar } from "@/components/ui/primitives";
import { computeAIScore, matchScholarship } from "@/lib/ai-engine";
import { applyAction, withdrawAction } from "@/lib/applications/actions";
import type { ApplicationRecord } from "@/lib/datasource";
import type { Scholarship, StudentProfile } from "@/lib/types";
import { daysUntil, formatCurrency, formatDate } from "@/lib/utils";

export default function ScholarshipDetail({
  scholarship,
  student,
  application,
  canApply,
}: {
  scholarship: Scholarship;
  /** null when signed out or profile incomplete. */
  student: StudentProfile | null;
  application: ApplicationRecord | null;
  canApply: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // No profile → no invented numbers. Show the program, not a fake score.
  const match = student ? matchScholarship(student, scholarship) : null;
  const ai = student ? computeAIScore(student) : null;
  const applied = Boolean(application && application.status !== "draft");

  const onApply = () => {
    setError(null);
    startTransition(async () => {
      const result = applied
        ? await withdrawAction(scholarship.id)
        : await applyAction(scholarship.id);
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <DashboardShell title={scholarship.name} subtitle={scholarship.provider}>
      <Link
        href="/scholarships"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to explorer
      </Link>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* main column */}
        <div className="space-y-6 xl:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassCard>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{scholarship.category}</Badge>
                {scholarship.tags.slice(0, 4).map((t) => (
                  <Badge key={t} tone="neutral" className="!text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <p className="mt-4 leading-relaxed text-foreground/90">
                {scholarship.description}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <div className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-foreground">
                    {formatCurrency(scholarship.amount)}
                  </div>
                  <div className="text-xs text-muted">Award value</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
                    <CalendarDays className="h-5 w-5 text-warning" />
                    {daysUntil(scholarship.deadline)}d
                  </div>
                  <div className="text-xs text-muted">Until {formatDate(scholarship.deadline)}</div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-[family-name:var(--font-space-grotesk)] text-2xl font-bold">
                    <Users className="h-5 w-5 text-accent" />
                    {(scholarship.applicants / 1000).toFixed(1)}k
                  </div>
                  <div className="text-xs text-muted">{scholarship.seats} seats available</div>
                </div>
                <div>
                  <div className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-foreground">
                    1:{Math.round(scholarship.applicants / scholarship.seats)}
                  </div>
                  <div className="text-xs text-muted">Selection ratio</div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* explainability */}
          {match && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <GlassCard>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary-bright" />
                <h2 className="font-semibold">Why the AI {match.eligible ? "recommends" : "doesn't recommend"} this for you</h2>
              </div>

              {match.reasons.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-success">
                    Working in your favor
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {match.reasons.map((r) => (
                      <li key={r} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <span className="text-foreground/90">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {match.missingCriteria.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-danger">
                    Blocking criteria
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {match.missingCriteria.map((m) => (
                      <li key={m} className="flex items-start gap-2.5 text-sm">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                        <span className="text-foreground/90">{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {match.improvements.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-accent">
                    How to improve your odds
                  </h3>
                  <ul className="mt-3 space-y-2.5">
                    {match.improvements.map((imp) => (
                      <li key={imp} className="flex items-start gap-2.5 text-sm">
                        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        <span className="text-foreground/90">{imp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 flex items-start gap-2.5 rounded-xl bg-[rgba(21,21,21,0.04)] p-4 text-xs leading-relaxed text-muted">
                <Scale className="mt-0.5 h-4 w-4 shrink-0 text-primary-bright" />
                {match.fairnessNote}
              </div>
            </GlassCard>
          </motion.div>
          )}

          {/* score breakdown */}
          {ai && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <GlassCard>
              <h2 className="font-semibold">Your score breakdown against this program</h2>
              <div className="mt-5 space-y-4">
                {ai.components.map((c) => (
                  <div key={c.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>
                        {c.label}{" "}
                        <span className="text-xs text-muted">
                          weight {Math.round(c.weight * 100)}%
                        </span>
                      </span>
                      <span className="font-medium">
                        {c.raw}
                        <span className="text-xs text-muted"> → {c.weighted} pts</span>
                      </span>
                    </div>
                    <ProgressBar value={c.raw} />
                    <p className="mt-1 text-xs text-muted">{c.detail}</p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
          )}
        </div>

        {/* sidebar */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <GlassCard className="text-center">
              <h2 className="font-semibold">AI match verdict</h2>
              {match ? (
                <>
                  <div className="mt-4 flex justify-center gap-6">
                    <ScoreRing value={match.matchScore} size={110} label="match" />
                    <ScoreRing
                      value={match.winProbability}
                      size={110}
                      label="win prob"
                      color="#c4442c"
                    />
                  </div>
                  <Badge tone={match.eligible ? "success" : "warning"} className="mt-5">
                    {match.eligible ? "You are eligible" : "Not yet eligible"}
                  </Badge>
                </>
              ) : (
                <p className="mt-4 text-sm leading-relaxed text-muted">
                  Sign in and complete your academic profile to see your match
                  score, win probability and a full explainability report for
                  this program.
                </p>
              )}

              {canApply && match ? (
                <button
                  onClick={onApply}
                  disabled={pending || (!applied && !match.eligible)}
                  className={applied ? "btn-ghost mt-5 w-full" : "btn-primary mt-5 w-full"}
                >
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {applied ? "Withdrawing…" : "Submitting…"}
                    </>
                  ) : applied ? (
                    "Withdraw application"
                  ) : match.eligible ? (
                    <>
                      Apply now <ChevronRight className="h-4 w-4" />
                    </>
                  ) : (
                    "Fix criteria to apply"
                  )}
                </button>
              ) : (
                <Link href="/login" className="btn-primary mt-5 w-full">
                  Sign in to apply <ChevronRight className="h-4 w-4" />
                </Link>
              )}

              {error && (
                <p role="alert" className="mono-label mt-3 text-primary">
                  {error}
                </p>
              )}

              {applied && application && (
                <div className="mt-4 border-t border-[rgba(21,21,21,0.16)] pt-4 text-left">
                  <div className="mono-label mb-2 text-muted">
                    Submitted {application.submittedAt ? formatDate(application.submittedAt) : ""}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="mono-label text-muted">Status</span>
                    <Badge
                      tone={
                        application.status === "approved"
                          ? "success"
                          : application.status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
                      {application.status === "under_review"
                        ? "Under review"
                        : application.status[0].toUpperCase() + application.status.slice(1)}
                    </Badge>
                  </div>
                  {application.aiSnapshot && (
                    <div className="mt-2 flex items-center justify-between">
                      <span className="mono-label text-muted">Score at submit</span>
                      <span className="mono-label">
                        {application.aiSnapshot.matchScore}% match
                      </span>
                    </div>
                  )}
                  {application.rejectionReasons.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {application.rejectionReasons.map((r) => (
                        <li key={r} className="flex items-start gap-2 text-xs text-muted">
                          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            <GlassCard>
              <h2 className="font-semibold">Requirements</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li className="flex justify-between">
                  <span className="text-muted">Minimum CGPA</span>
                  <span className="font-medium">{scholarship.criteria.minCgpa.toFixed(1)}</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">Income cap</span>
                  <span className="font-medium">
                    {scholarship.criteria.maxIncome
                      ? formatCurrency(scholarship.criteria.maxIncome)
                      : "None"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">Attendance</span>
                  <span className="font-medium">{scholarship.criteria.minAttendance}%+</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">Research required</span>
                  <span className="font-medium">
                    {scholarship.criteria.requiresResearch ? "Yes" : "No"}
                  </span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted">Leadership required</span>
                  <span className="font-medium">
                    {scholarship.criteria.requiresLeadership ? "Yes" : "No"}
                  </span>
                </li>
                {scholarship.criteria.fields.length > 0 && (
                  <li>
                    <span className="text-muted">Eligible fields</span>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {scholarship.criteria.fields.map((f) => (
                        <Badge key={f} tone="neutral" className="!text-[10px]">
                          {f}
                        </Badge>
                      ))}
                    </div>
                  </li>
                )}
              </ul>
            </GlassCard>
          </motion.div>
        </div>
      </div>

      <ChatAssistant />
    </DashboardShell>
  );
}
