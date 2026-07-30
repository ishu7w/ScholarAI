import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { isLiveMode } from "@/lib/env";

// Server-side Supabase client bound to the request's cookies.
// Returns null in demo mode — callers must handle that branch.
export async function getSupabaseServer() {
  if (!isLiveMode()) return null;

  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // set() throws in Server Components — safe to ignore when the
            // proxy (middleware) refreshes sessions.
          }
        },
      },
    }
  );
}

// Service-role client for trusted server-side operations (seeding,
// admin actions, notifications). NEVER import from client components.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
