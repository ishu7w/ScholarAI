import type { ReactNode } from "react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { requireRole } from "@/lib/auth/guard";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["admin"], "/dashboard/admin");
  return <SessionProvider user={user}>{children}</SessionProvider>;
}
