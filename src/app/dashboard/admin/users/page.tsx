import DashboardShell from "@/components/layout/DashboardShell";
import { requireRole } from "@/lib/auth/guard";
import { listUsers } from "@/lib/admin/actions";
import UsersView from "./UsersView";

export default async function AdminUsersPage() {
  const me = await requireRole(["admin"], "/dashboard/admin/users");

  // listUsers re-verifies the role server-side; the guard above is UX only.
  const result = await listUsers();

  return (
    <DashboardShell
      title="User management"
      subtitle="Roles and account access across the platform"
    >
      <UsersView
        users={result?.users ?? []}
        mode={result?.mode ?? "live"}
        currentUserId={me.id}
      />
    </DashboardShell>
  );
}
