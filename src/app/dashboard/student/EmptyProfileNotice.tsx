import Link from "next/link";
import { ArrowRight } from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";
import { GlassCard } from "@/components/ui/primitives";

export default function EmptyProfileNotice({ name }: { name: string }) {
  return (
    <DashboardShell
      title={`Welcome, ${name.split(" ")[0]}`}
      subtitle="One step left before the engine can score you"
    >
      <GlassCard className="max-w-2xl">
        <h2 className="font-semibold">Complete your academic profile</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The scoring engine reads ten published signals — CGPA, attendance,
          financial need, achievements, research, leadership, projects,
          community service, statement of purpose and recommendations. Fill
          them in and your score, matches and eligibility are computed
          immediately.
        </p>
        <Link href="/dashboard/student/profile" className="btn-primary mt-6 inline-flex">
          Complete profile <ArrowRight className="h-4 w-4" />
        </Link>
      </GlassCard>
    </DashboardShell>
  );
}
