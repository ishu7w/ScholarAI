import "server-only";
import { redirect } from "next/navigation";
import { getSessionProfile, type SessionProfile } from "@/lib/auth/session";

type Role = SessionProfile["role"];

/**
 * Server-side gate for a protected segment. Redirects to /login when
 * signed out, or to the caller's own dashboard when their role isn't
 * allowed. Admins may view every segment.
 */
export async function requireRole(
  allowed: Role[],
  path: string
): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  if (profile.role !== "admin" && !allowed.includes(profile.role)) {
    redirect(homeFor(profile.role));
  }
  return profile;
}

/** Any signed-in user (no role restriction). */
export async function requireUser(path: string): Promise<SessionProfile> {
  const profile = await getSessionProfile();
  if (!profile) {
    redirect(`/login?next=${encodeURIComponent(path)}`);
  }
  return profile;
}

export function homeFor(role: Role): string {
  return role === "admin"
    ? "/dashboard/admin"
    : role === "institution"
      ? "/dashboard/institution"
      : "/dashboard/student";
}
