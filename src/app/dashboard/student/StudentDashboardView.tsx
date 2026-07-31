"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  FileCheck2,
  Lightbulb,
  Target,
} from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import ChatAssistant from "@/components/chat/ChatAssistant";
import { useSession } from "@/components/providers/SessionProvider";
import ScoreRing from "@/components/ui/ScoreRing";
import { Badge, GlassCard, ProgressBar, StatPill } from "@/components/ui/primitives";
import { useRealtime } from "@/hooks/useRealtime";
import { computeAIScore, generateRoadmap, rankScholarships } from "@/lib/ai-engine";
import type { ApplicationRecord } from "@/lib/datasource";
import type { Scholarship, StudentProfile } from "@/lib/types";
import { daysUntil, formatCurrency, formatDate } from "@/lib/utils";

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

const DOCUMENTS = [
  { name: "Income Certificate", status: "verified" },
  { name: "Semester 5 Marksheet", status: "verified" },
  { name: "Aadhar Card", status: "verified" },
  { name: "Bonafide Certificate", status: "processing" },
  { name: "Recommendation Letter", status: "missing" },
] as const;

export default function StudentDashboardView({
  student,
  scholarships,
  applications,
}: {
  student: StudentProfile;
  scholarships: Scholarship[];
  applications: ApplicationRecord[];
}) {
  const appliedIds = applications.map((a) => a.scholarshipId);
  const user = useSession();

  // A decision made by an institution lands here without a refresh: the
  // status badge under "Your applications" updates as soon as the row does.
  // Filtered to this student's rows so the socket carries nothing else —
  // the "student reads own apps" RLS policy enforces the same server-side.
  // Default reaction is router.refresh(), so the statuses still come from
  // the server component's query rather than a client-side guess.
  // No-ops in demo mode, where there is no Supabase client.
  useRealtime(
    "applications",
    user ? `student_id=eq.${user.id}` : null,
    undefined,
    { enabled: Boolean(user) }
  );

  const ai = computeAIScore(student);
  const ranked = rankScholarships(student, scholarships);
  const topMatches = ranked.filter((r) => r.eligible).slice(0, 3);
  const roadmap = generateRoadmap(student).slice(0, 4);
  const deadlines = [...scholarships]
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, 4);

  return (
    <DashboardShell
      title={`Welcome back, ${student.name.split(" ")[0]}`}
      subtitle={
        appliedIds.length
          ? `${appliedIds.length} active application${appliedIds.length === 1 ? "" : "s"} · profile ${student.profileCompletion}% complete`
          : `Profile ${student.profileCompletion}% complete`
      }
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 xl:grid-cols-3"
      >
        {/* ---- AI Profile Score ---- */}
        <motion.div variants={item} className="xl:col-span-1">
          <GlassCard className="flex h-full flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">AI Profile Score</h2>
              <Badge tone="accent">{ai.confidence}% confidence</Badge>
            </div>
            <div className="mt-4 flex items-center justify-center">
              <ScoreRing value={ai.total} size={160} strokeWidth={10} label="of 100" />
            </div>
            <div className="mt-6 space-y-3">
              {ai.components.slice(0, 5).map((c) => (
                <div key={c.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {c.label}{" "}
                      <span className="text-foreground/40">· {Math.round(c.weight * 100)}%</span>
                    </span>
                    <span className="font-medium">{c.raw}</span>
                  </div>
                  <ProgressBar value={c.raw} />
                </div>
              ))}
            </div>
            <Link
              href="/scholarships"
              className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-primary-bright hover:underline"
            >
              Full explainability report <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </GlassCard>
        </motion.div>

        {/* ---- Middle column ---- */}
        <motion.div variants={item} className="space-y-6 xl:col-span-2">
          {/* quick stats */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatPill
              label="Eligible matches"
              value={ranked.filter((r) => r.eligible).length}
              tone="primary"
            />
            <StatPill label="Applications" value={appliedIds.length} tone="default" />
            <StatPill
              label="Scholarships open"
              value={scholarships.length}
              tone="warning"
            />
            <StatPill label="Profile complete" value={`${student.profileCompletion}%`} tone="success" />
          </div>

          {/* top recommendations */}
          <GlassCard>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Top AI recommendations</h2>
              <Link
                href="/scholarships"
                className="text-sm text-primary-bright hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {topMatches.map((m) => (
                <Link
                  key={m.scholarship.id}
                  href={`/scholarships/${m.scholarship.id}`}
                  className="card-hover glass flex flex-wrap items-center gap-4 rounded-xl border border-[rgba(21,21,21,0.16)] p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate font-medium">{m.scholarship.name}</span>
                      <Badge tone="neutral" className="!text-[10px]">
                        {m.scholarship.category}
                      </Badge>
                      {appliedIds.includes(m.scholarship.id) && (
                        <Badge tone="success" className="!text-[10px]">
                          Applied
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {formatCurrency(m.scholarship.amount)} ·{" "}
                      {m.reasons[0] ?? "Strong overall profile fit"}
                    </p>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-success">
                        {m.matchScore}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted">match</div>
                    </div>
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-space-grotesk)] text-lg font-bold text-accent">
                        {m.winProbability}%
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted">win prob</div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted" />
                  </div>
                </Link>
              ))}
            </div>
          </GlassCard>

          {/* two-up: deadlines + documents */}
          <div className="grid gap-6 md:grid-cols-2">
            <GlassCard>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary-bright" />
                <h2 className="font-semibold">Upcoming deadlines</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {deadlines.map((s) => {
                  const d = daysUntil(s.deadline);
                  return (
                    <li key={s.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{s.name}</div>
                        <div className="text-xs text-muted">{formatDate(s.deadline)}</div>
                      </div>
                      <Badge tone={d < 30 ? "danger" : d < 60 ? "warning" : "neutral"}>
                        <Clock className="h-3 w-3" /> {d}d
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2">
                <FileCheck2 className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Your applications</h2>
              </div>
              {applications.length === 0 ? (
                <div className="mt-4">
                  <p className="text-sm text-muted">
                    No applications yet. Open a match to see its explainability
                    report and apply.
                  </p>
                  <Link
                    href="/scholarships"
                    className="mono-label mt-4 inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Browse scholarships <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {applications.map((a) => {
                    const sch = scholarships.find((s) => s.id === a.scholarshipId);
                    return (
                      <li key={a.id} className="flex items-center justify-between gap-3">
                        <Link
                          href={`/scholarships/${a.scholarshipId}`}
                          className="min-w-0 flex-1 truncate text-sm hover:underline"
                        >
                          {sch?.name ?? a.scholarshipId}
                        </Link>
                        <Badge
                          tone={
                            a.status === "approved"
                              ? "success"
                              : a.status === "rejected"
                                ? "danger"
                                : a.status === "under_review"
                                  ? "warning"
                                  : "neutral"
                          }
                        >
                          {a.status === "under_review"
                            ? "Under review"
                            : a.status[0].toUpperCase() + a.status.slice(1)}
                        </Badge>
                      </li>
                    );
                  })}
                </ul>
              )}
            </GlassCard>
          </div>
        </motion.div>

        {/* ---- Roadmap ---- */}
        <motion.div variants={item} className="xl:col-span-3">
          <GlassCard>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary-bright" />
                <h2 className="font-semibold">Your AI improvement roadmap</h2>
              </div>
              <Badge tone="primary">
                <Lightbulb className="h-3 w-3" /> +
                {roadmap.reduce((a, r) => a + r.impact, 0)} pts projected
              </Badge>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roadmap.map((r, i) => (
                <div key={i} className="glass rounded-xl border border-[rgba(21,21,21,0.16)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-[family-name:var(--font-geist-mono)] text-xs text-accent">
                      {r.quarter}
                    </span>
                    <Badge tone="success" className="!text-[10px]">
                      +{r.impact} pts
                    </Badge>
                  </div>
                  <h3 className="mt-3 text-sm font-semibold leading-snug">{r.title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted">{r.detail}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      <ChatAssistant />
    </DashboardShell>
  );
}
