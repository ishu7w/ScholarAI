import DashboardShell from "@/components/layout/DashboardShell";
import { requireRole } from "@/lib/auth/guard";
import { getPlatformStats, getRecentAudit } from "@/lib/admin/actions";
import AdminDashboardView from "./AdminDashboardView";

export default async function AdminDashboardPage() {
  await requireRole(["admin"], "/dashboard/admin");

  const [stats, audit] = await Promise.all([getPlatformStats(), getRecentAudit(6)]);

  // getPlatformStats re-checks the role server-side; a null here means the
  // guard above and the action disagree, so show nothing rather than guess.
  if (!stats) {
    return (
      <DashboardShell title="Platform Administration" subtitle="Admin access required">
        <div className="hairline max-w-2xl p-6">
          <h2 className="font-semibold">Unavailable</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Platform aggregates could not be read for this account.
          </p>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Platform Administration"
      subtitle="Real aggregates, user management, and the audit trail"
    >
      <AdminDashboardView stats={stats} audit={audit} />
    </DashboardShell>
  );
}
