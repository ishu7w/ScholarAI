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
import ScoreRing from "@/components/ui/ScoreRing";
import { Badge, GlassCard, ProgressBar, StatPill } from "@/components/ui/primitives";
import { computeAIScore, generateRoadmap, rankScholarships } from "@/lib/ai-engine";
import { DEMO_STUDENT, SCHOLARSHIPS } from "@/lib/data";
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

export default function StudentDashboard() {
  const student = DEMO_STUDENT;
  const ai = computeAIScore(student);
  const ranked = rankScholarships(student, SCHOLARSHIPS);
  const topMatches = ranked.filter((r) => r.eligible).slice(0, 3);
  const roadmap = generateRoadmap(student).slice(0, 4);
  const deadlines = [...SCHOLARSHIPS]
    .sort((a, b) => +new Date(a.deadline) - +new Date(b.deadline))
    .slice(0, 4);

  return (
    <DashboardShell
      title={`Welcome back, ${student.name.split(" ")[0]}`}
      subtitle="Your AI profile was re-evaluated 2 hours ago"
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
            <StatPill label="Applications" value={4} tone="default" />
            <StatPill label="Docs verified" value="3/5" tone="warning" />
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
                <FileCheck2 className="h-4 w-4 text-primary-bright" />
                <h2 className="font-semibold">Document status</h2>
              </div>
              <ul className="mt-4 space-y-3">
                {DOCUMENTS.map((doc) => (
                  <li key={doc.name} className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm">{doc.name}</span>
                    {doc.status === "verified" ? (
                      <Badge tone="success">
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </Badge>
                    ) : doc.status === "processing" ? (
                      <Badge tone="warning">OCR processing</Badge>
                    ) : (
                      <Badge tone="danger">Missing</Badge>
                    )}
                  </li>
                ))}
              </ul>
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
