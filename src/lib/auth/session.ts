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

/** Current persisted user profile; null when auth or profile storage is
 *  unavailable, or when no valid user session exists. Cached per request. */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
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
