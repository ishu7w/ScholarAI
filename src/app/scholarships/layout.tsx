import type { ReactNode } from "react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { getSessionProfile } from "@/lib/auth/session";

// Browsing scholarships stays open to signed-out visitors; the shell
// simply renders without a user in that case.
export default async function ScholarshipsLayout({ children }: { children: ReactNode }) {
  const user = await getSessionProfile();
  return <SessionProvider user={user}>{children}</SessionProvider>;
}
