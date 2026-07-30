"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ShieldAlert,
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
import { computeAIScore, detectFraud } from "@/lib/ai-engine";
import {
  CATEGORY_DISTRIBUTION,
  MONTHLY_APPLICATIONS,
  REGION_HEAT,
  generateApplicants,
} from "@/lib/data";
import { cn } from "@/lib/utils";

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

type Decision = "approve" | "reject" | null;

export default function InstitutionDashboard() {
  const applicants = useMemo(() => generateApplicants(60), []);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});

  // AI ranking: score every applicant, sort desc
  const ranked = useMemo(
    () =>
      applicants
        .map((a) => ({
          ...a,
          ai: computeAIScore(a.student),
          fraud: detectFraud(a.student),
        }))
        .sort((a, b) => b.ai.total - a.ai.total),
    [applicants]
  );

  const fraudFlagged = ranked.filter((r) => r.fraud.level !== "clear");
  const pendingQueue = ranked.filter((r) => r.status === "pending").slice(0, 8);

  const decide = (id: string, d: Decision) =>
    setDecisions((prev) => ({ ...prev, [id]: prev[id] === d ? null : d }));

  return (
    <DashboardShell
      title="Institution Command Center"
      subtitle="State University · Fall 2026 cycle · 60 active applicants"
    >
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        {/* KPI row */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatPill label="Total applicants" value={applicants.length} tone="primary" />
          <StatPill
            label="Avg AI score"
            value={Math.round(ranked.reduce((a, r) => a + r.ai.total, 0) / ranked.length)}
            tone="default"
          />
          <StatPill label="Fraud flags" value={fraudFlagged.length} tone="danger" />
          <StatPill
            label="Predicted success rate"
            value={`${Math.round((ranked.filter((r) => r.ai.total >= 60).length / ranked.length) * 100)}%`}
            tone="success"
          />
        </motion.div>

        {/* charts row */}
        <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Application volume vs. AI-assisted decisions</h2>
              <button className="btn-ghost !px-3 !py-1.5 text-xs" aria-label="Export report">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={MONTHLY_APPLICATIONS}>
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
                  <YAxis stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Area type="monotone" dataKey="applications" stroke="#151515" fill="url(#gApps)" strokeWidth={2} name="Applications" />
                  <Area type="monotone" dataKey="ai" stroke="#c4442c" fill="url(#gAI)" strokeWidth={2} name="AI-ranked" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard>
            <h2 className="font-semibold">Category distribution</h2>
            <div className="mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={CATEGORY_DISTRIBUTION}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {CATEGORY_DISTRIBUTION.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
              {CATEGORY_DISTRIBUTION.map((c, i) => (
                <span key={c.name} className="flex items-center gap-1.5 text-xs text-muted">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                  />
                  {c.name} {c.value}%
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={REGION_HEAT}>
                  <CartesianGrid stroke="rgba(21,21,21,0.16)" vertical={false} />
                  <XAxis dataKey="region" stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(21,21,21,0.04)" }} />
                  <Bar dataKey="students" fill="#151515" radius={[6, 6, 0, 0]} name="Applicants" />
                  <Bar dataKey="funded" fill="#4a6741" radius={[6, 6, 0, 0]} name="Funded" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-danger" />
              <h2 className="font-semibold">Fraud alerts</h2>
              <Badge tone="danger" className="ml-auto">{fraudFlagged.length}</Badge>
            </div>
            <ul className="mt-4 space-y-3">
              {fraudFlagged.slice(0, 5).map((r) => (
                <li key={r.student.id} className="glass rounded-xl border border-danger/20 p-3">
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
                Ranked by explainable weighted score · click score bars for breakdown
              </p>
            </div>

            <div className="mt-5 space-y-2.5">
              {pendingQueue.map((r, i) => {
                const decision = decisions[r.student.id] ?? null;
                return (
                  <div
                    key={r.student.id}
                    className={cn(
                      "glass flex flex-wrap items-center gap-4 rounded-xl border p-4 transition-colors",
                      decision === "approve"
                        ? "border-success/40 bg-success/5"
                        : decision === "reject"
                          ? "border-danger/40 bg-danger/5"
                          : "border-[rgba(21,21,21,0.16)]"
                    )}
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
                        {r.fraud.level !== "clear" && (
                          <Badge tone="warning" className="!text-[10px]">
                            <AlertTriangle className="h-3 w-3" /> review
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <ProgressBar value={r.ai.total} className="max-w-[220px]" />
                        <span className="text-xs text-muted">
                          docs {r.documentsVerified}/{r.documentsTotal}
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-[family-name:var(--font-space-grotesk)] text-xl font-bold text-primary-bright">
                        {r.ai.total}
                      </div>
                      <div className="text-[10px] uppercase tracking-wide text-muted">AI score</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(r.student.id, "approve")}
                        className={cn(
                          "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors",
                          decision === "approve"
                            ? "border-success bg-success text-black"
                            : "border-success/30 text-success hover:bg-success/15"
                        )}
                        aria-label={`Approve ${r.student.name}`}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => decide(r.student.id, "reject")}
                        className={cn(
                          "flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border transition-colors",
                          decision === "reject"
                            ? "border-danger bg-danger text-black"
                            : "border-danger/30 text-danger hover:bg-danger/15"
                        )}
                        aria-label={`Reject ${r.student.name}`}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[rgba(21,21,21,0.16)] pt-4">
              <span className="flex items-center gap-2 text-sm text-muted">
                <UserCheck className="h-4 w-4 text-success" />
                {Object.values(decisions).filter((d) => d === "approve").length} approved ·{" "}
                {Object.values(decisions).filter((d) => d === "reject").length} rejected this session
              </span>
              <button className="btn-primary !px-4 !py-2 text-sm">
                <Download className="h-4 w-4" /> Export committee report
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </DashboardShell>
  );
}
