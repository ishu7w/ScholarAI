"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Building2,
  Cpu,
  Database,
  FileText,
  HardDrive,
  ScrollText,
  Server,
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
import DashboardShell from "@/components/layout/DashboardShell";
import { Badge, GlassCard, ProgressBar, StatPill } from "@/components/ui/primitives";
import { MONTHLY_APPLICATIONS, SCHOLARSHIPS, generateApplicants } from "@/lib/data";

const chartTooltipStyle = {
  background: "#e8e6df",
  border: "1px solid rgba(21,21,21,0.16)",
  borderRadius: 0,
  color: "#151515",
  fontSize: 11, fontFamily: "var(--font-spline-mono)",
};

const AUDIT_LOG = [
  { time: "14:32", actor: "admin@scholarai.io", action: "Re-weighted 'Research' 10% → 12% for Emerging Researcher Grant", type: "model" },
  { time: "13:58", actor: "system", action: "OCR pipeline batch #4821 completed — 214 documents verified", type: "system" },
  { time: "13:10", actor: "dean@stateuni.edu", action: "Exported committee report for Dean's Distinction Scholarship", type: "export" },
  { time: "11:47", actor: "system", action: "Fraud model flagged 3 applications for manual review", type: "fraud" },
  { time: "10:15", actor: "admin@scholarai.io", action: "Added scholarship: Bright Path STEM Minority Award", type: "create" },
  { time: "09:03", actor: "system", action: "Nightly re-scoring of 12,480 student profiles finished in 3.1s avg", type: "system" },
];

const MODELS = [
  { name: "Eligibility Predictor", version: "v4.2.1", accuracy: 94, status: "healthy" },
  { name: "Match Ranker", version: "v3.8.0", accuracy: 92, status: "healthy" },
  { name: "Fraud Detector", version: "v2.5.3", accuracy: 88, status: "healthy" },
  { name: "OCR Document Parser", version: "v5.1.0", accuracy: 97, status: "healthy" },
  { name: "SOP Quality Scorer", version: "v1.9.2", accuracy: 84, status: "degraded" },
];

const SYSTEM = [
  { name: "API Gateway", icon: Server, load: 34 },
  { name: "AI Inference", icon: Cpu, load: 61 },
  { name: "PostgreSQL", icon: Database, load: 42 },
  { name: "Vector Store", icon: HardDrive, load: 27 },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function AdminDashboard() {
  const applicants = useMemo(() => generateApplicants(60), []);

  return (
    <DashboardShell
      title="Platform Administration"
      subtitle="System health, AI models, and audit trail"
    >
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
        <motion.div variants={item} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatPill label="Students" value="120,483" tone="primary" />
          <StatPill label="Institutions" value={42} tone="default" />
          <StatPill label="Active scholarships" value={SCHOLARSHIPS.length} tone="success" />
          <StatPill label="Applications (cycle)" value={applicants.length * 210} tone="warning" />
        </motion.div>

        <motion.div variants={item} className="grid gap-6 lg:grid-cols-3">
          {/* platform growth */}
          <GlassCard className="lg:col-span-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary-bright" />
              <h2 className="font-semibold">Platform activity</h2>
            </div>
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MONTHLY_APPLICATIONS}>
                  <CartesianGrid stroke="rgba(21,21,21,0.16)" vertical={false} />
                  <XAxis dataKey="month" stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#5b6172" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="applications" stroke="#151515" strokeWidth={2} dot={false} name="Applications" />
                  <Line type="monotone" dataKey="approvals" stroke="#4a6741" strokeWidth={2} dot={false} name="Approvals" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* system health */}
          <GlassCard>
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">System health</h2>
              <Badge tone="success" className="ml-auto">All operational</Badge>
            </div>
            <ul className="mt-5 space-y-4">
              {SYSTEM.map((s) => (
                <li key={s.name}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground/85">
                      <s.icon className="h-4 w-4 text-muted" /> {s.name}
                    </span>
                    <span className="text-xs text-muted">{s.load}% load</span>
                  </div>
                  <ProgressBar
                    value={s.load}
                    color={s.load > 75 ? "#c4442c" : s.load > 50 ? "#96762a" : "#4a6741"}
                  />
                </li>
              ))}
            </ul>
            <div className="mt-5 rounded-xl bg-[rgba(21,21,21,0.04)] p-3 text-xs leading-relaxed text-muted">
              Uptime 99.98% · p95 latency 142ms · last incident 43 days ago
            </div>
          </GlassCard>
        </motion.div>

        <motion.div variants={item} className="grid gap-6 lg:grid-cols-2">
          {/* AI models */}
          <GlassCard>
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary-bright" />
              <h2 className="font-semibold">AI model registry</h2>
            </div>
            <div className="mt-4 space-y-3">
              {MODELS.map((m) => (
                <div key={m.name} className="glass flex items-center gap-4 rounded-xl border border-[rgba(21,21,21,0.16)] p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{m.name}</span>
                      <span className="font-[family-name:var(--font-geist-mono)] text-xs text-muted">
                        {m.version}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <ProgressBar value={m.accuracy} className="max-w-[160px]" />
                      <span className="text-xs text-muted">{m.accuracy}% val. accuracy</span>
                    </div>
                  </div>
                  <Badge tone={m.status === "healthy" ? "success" : "warning"} className="!text-[10px]">
                    {m.status}
                  </Badge>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* audit log */}
          <GlassCard>
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-accent" />
              <h2 className="font-semibold">Audit log</h2>
              <span className="ml-auto text-xs text-muted">today</span>
            </div>
            <ul className="mt-4 space-y-3">
              {AUDIT_LOG.map((entry, i) => (
                <li key={i} className="flex gap-3 border-b border-[rgba(21,21,21,0.16)] pb-3 last:border-0">
                  <span className="font-[family-name:var(--font-geist-mono)] text-xs text-muted">
                    {entry.time}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm leading-snug">{entry.action}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {entry.actor} ·{" "}
                      <Badge
                        tone={
                          entry.type === "fraud"
                            ? "danger"
                            : entry.type === "model"
                              ? "primary"
                              : "neutral"
                        }
                        className="!px-2 !py-0 !text-[10px]"
                      >
                        {entry.type}
                      </Badge>
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>

        {/* management shortcuts */}
        <motion.div variants={item} className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: Users, label: "Manage students", sub: "120,483 profiles" },
            { icon: Building2, label: "Manage institutions", sub: "42 organizations" },
            { icon: Trophy, label: "Manage scholarships", sub: `${SCHOLARSHIPS.length} active programs` },
            { icon: FileText, label: "Document center", sub: "8,204 pending OCR" },
          ].map((c) => (
            <button
              key={c.label}
              className="glass card-hover cursor-pointer rounded-2xl p-5 text-left"
            >
              <c.icon className="h-5 w-5 text-primary-bright" />
              <div className="mt-3 text-sm font-semibold">{c.label}</div>
              <div className="mt-0.5 text-xs text-muted">{c.sub}</div>
            </button>
          ))}
        </motion.div>
      </motion.div>
    </DashboardShell>
  );
}
