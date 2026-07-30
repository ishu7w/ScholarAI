"use client";

import { createBrowserClient } from "@supabase/ssr";
import { isLiveMode } from "@/lib/env";

// Browser Supabase client (anon key, RLS enforced).
// Returns null in demo mode — callers must handle that branch.
export function getSupabaseBrowser() {
  if (!isLiveMode()) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
