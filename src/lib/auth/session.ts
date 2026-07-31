import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
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

// Demo persona — mirrors the original hardcoded UI identity.
const DEMO_SESSION: SessionProfile = {
  id: "stu-aarya",
  role: "student",
  name: "Aarya Sharma",
  email: "aarya@university.edu",
  avatarHue: 258,
};

/** Current signed-in profile; demo persona in demo mode; null when
 *  live and signed out. Cached per request. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  if (!isLiveMode()) return DEMO_SESSION;

  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  if (hasDatabase()) {
    const rows = await db()
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, data.user.id))
      .limit(1);
    const p = rows[0];
    if (p && !p.disabled) {
      return { id: p.id, role: p.role, name: p.name, email: p.email, avatarHue: p.avatarHue };
    }
    return null;
  }
  return {
    id: data.user.id,
    role: "student",
    name: data.user.email ?? "User",
    email: data.user.email ?? "",
    avatarHue: 258,
  };
});
