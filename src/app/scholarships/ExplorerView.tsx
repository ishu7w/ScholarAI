"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowUpRight, Filter, Search, Users } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import ChatAssistant from "@/components/chat/ChatAssistant";
import { Badge, GlassCard, ProgressBar } from "@/components/ui/primitives";
import { rankScholarships } from "@/lib/ai-engine";
import { cn, daysUntil, formatCurrency } from "@/lib/utils";
import type { Scholarship, ScholarshipCategory, StudentProfile } from "@/lib/types";

const FILTERS: ("All" | ScholarshipCategory)[] = [
  "All", "Government", "Merit", "Need-based", "Women", "Minority",
  "Research Grant", "Corporate", "Sports", "International", "University", "NGO", "Private",
];

export default function ExplorerView({
  student,
  scholarships,
  appliedIds,
}: {
  /** null when signed out or profile incomplete — ranking is skipped. */
  student: StudentProfile | null;
  scholarships: Scholarship[];
  appliedIds: string[];
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [eligibleOnly, setEligibleOnly] = useState(false);

  const ranked = useMemo(
    () =>
      student
        ? rankScholarships(student, scholarships)
        : // No profile: show the catalogue unranked rather than inventing scores.
          scholarships.map((s) => ({
            scholarship: s,
            eligible: true,
            matchScore: 0,
            winProbability: 0,
            missingCriteria: [],
            reasons: [],
            improvements: [],
            fairnessNote: "",
          })),
    [student, scholarships]
  );

  const results = ranked.filter((r) => {
    if (filter !== "All" && r.scholarship.category !== filter) return false;
    if (eligibleOnly && !r.eligible) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        r.scholarship.name.toLowerCase().includes(q) ||
        r.scholarship.provider.toLowerCase().includes(q) ||
        r.scholarship.tags.some((t) => t.includes(q))
      );
    }
    return true;
  });

  return (
    <DashboardShell
      title="Scholarship Explorer"
      subtitle={`${results.length} programs · AI-ranked for your profile`}
    >
      {/* search + filters */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, provider, or tag…"
              className="input-premium !pl-11"
              aria-label="Search scholarships"
            />
          </div>
          <button
            onClick={() => setEligibleOnly((v) => !v)}
            className={cn(
              "mono-label flex cursor-pointer items-center gap-2 border px-4 transition-colors",
              eligibleOnly
                ? "border-foreground bg-foreground text-background"
                : "border-[rgba(21,21,21,0.16)] text-muted hover:border-foreground hover:text-foreground"
            )}
            aria-pressed={eligibleOnly}
          >
            <Filter className="h-4 w-4" /> Eligible only
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "mono-label cursor-pointer border px-4 py-1.5 transition-colors",
                filter === f
                  ? "border-foreground bg-foreground text-background"
                  : "border-[rgba(21,21,21,0.16)] text-muted hover:border-foreground hover:text-foreground"
              )}
              aria-pressed={filter === f}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* results grid */}
      <motion.div layout className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {results.map((r, i) => {
          const d = daysUntil(r.scholarship.deadline);
          return (
            <motion.div
              key={r.scholarship.id}
              layout
              initial={{ opacity: 0, y: 26, filter: "blur(9px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1],
                delay: Math.min(i * 0.09, 0.54),
              }}
            >
              <Link href={`/scholarships/${r.scholarship.id}`}>
                <GlassCard hover className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <Badge tone="neutral" className="!text-[10px]">
                      {r.scholarship.category}
                    </Badge>
                    <Badge tone={d < 30 ? "danger" : "neutral"} className="!text-[10px]">
                      {d}d left
                    </Badge>
                  </div>
                  <h3 className="mt-3 font-semibold leading-snug">{r.scholarship.name}</h3>
                  <p className="mt-1 text-xs text-muted">{r.scholarship.provider}</p>
                  {appliedIds.includes(r.scholarship.id) && (
                    <Badge tone="success" className="mt-2 self-start !text-[10px]">
                      Applied
                    </Badge>
                  )}
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                    {r.scholarship.description.slice(0, 110)}…
                  </p>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-[family-name:var(--font-space-grotesk)] text-2xl font-bold text-foreground">
                      {formatCurrency(r.scholarship.amount)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <Users className="h-3 w-3" />
                      {r.scholarship.applicants.toLocaleString()} applied
                    </span>
                  </div>

                  <div className="mt-4 border-t border-[rgba(21,21,21,0.16)] pt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="mono-label text-[10px] text-muted">AI match</span>
                      <span
                        className={cn(
                          "mono-label text-[10px]",
                          r.eligible ? "text-success" : "text-warning"
                        )}
                      >
                        {r.eligible ? `${r.matchScore}% match` : "Not yet eligible"}
                      </span>
                    </div>
                    <ProgressBar
                      value={r.matchScore}
                      color={r.eligible ? "#151515" : "#96762a"}
                    />
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-muted">
                        {r.eligible
                          ? `~${r.winProbability}% winning probability`
                          : `${r.missingCriteria.length} criteria missing`}
                      </span>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {results.length === 0 && (
        <GlassCard className="py-16 text-center">
          <p className="font-medium">No scholarships match your filters</p>
          <p className="mt-1 text-sm text-muted">Try clearing the search or switching category.</p>
        </GlassCard>
      )}

      <ChatAssistant />
    </DashboardShell>
  );
}
