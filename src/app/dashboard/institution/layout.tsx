import type { ReactNode } from "react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { requireRole } from "@/lib/auth/guard";

export default async function InstitutionLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["institution"], "/dashboard/institution");
  return <SessionProvider user={user}>{children}</SessionProvider>;
}
