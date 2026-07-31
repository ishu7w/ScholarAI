import type { ReactNode } from "react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { requireRole } from "@/lib/auth/guard";

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["student"], "/dashboard/student");
  return <SessionProvider user={user}>{children}</SessionProvider>;
}
