import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isLiveMode, hasDatabase } from "@/lib/env";
import { db, schema } from "@/lib/db/client";

export interface SessionProfile {
  id: string;
  role: "student" | "institution" | "admin";
  name: string;
  email: string;
  avatarHue: number;
}

const DEMO_ROLE_COOKIE = "scholarai-demo-role";
const DEMO_PROFILES: Record<SessionProfile["role"], SessionProfile> = {
  student: {
    id: "stu-aarya",
    role: "student",
    name: "Aarya Sharma",
    email: "student@demo.scholarai.app",
    avatarHue: 258,
  },
  institution: {
    id: "demo-institution-profile",
    role: "institution",
    name: "State University",
    email: "institution@demo.scholarai.app",
    avatarHue: 190,
  },
  admin: {
    id: "demo-admin-profile",
    role: "admin",
    name: "Platform Admin",
    email: "admin@demo.scholarai.app",
    avatarHue: 32,
  },
};

/** Current persisted user profile; null when auth or profile storage is
 *  unavailable, or when no valid user session exists. Cached per request. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  if (!isLiveMode() && !hasDatabase()) {
    const role = (await cookies()).get(DEMO_ROLE_COOKIE)?.value;
    return role && role in DEMO_PROFILES
      ? DEMO_PROFILES[role as SessionProfile["role"]]
      : null;
  }
  if (!isLiveMode() || !hasDatabase()) return null;

  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  try {
    const rows = await db()
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, data.user.id))
      .limit(1);
    const p = rows[0];
    if (p && !p.disabled) {
      return { id: p.id, role: p.role, name: p.name, email: p.email, avatarHue: p.avatarHue };
    }
  } catch (cause) {
    console.error("profile lookup failed while resolving session:", cause);
  }
  return null;
});
