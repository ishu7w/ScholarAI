import type { ReactNode } from "react";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { requireUser } from "@/lib/auth/guard";

export default async function ResumeAnalyzerLayout({ children }: { children: ReactNode }) {
  const user = await requireUser("/resume-analyzer");
  return <SessionProvider user={user}>{children}</SessionProvider>;
}
