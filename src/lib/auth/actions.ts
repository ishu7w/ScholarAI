"use server";

// ─────────────────────────────────────────────────────────────
// Auth server actions. Demo mode is intentionally read-only for accounts:
// never report that a user was created unless persistent auth and profile
// storage are available.
// ─────────────────────────────────────────────────────────────

import { z } from "zod";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import { isLiveMode, hasDatabase } from "@/lib/env";
import { db, schema } from "@/lib/db/client";
import { checkRateLimit, formatRetryAfter } from "@/lib/rate-limit";

export type AuthResult =
  | { ok: true; redirectTo?: string; message?: string }
  | { ok: false; error: string };

// Per-email throttles on the credential endpoints. Keyed on the submitted
// email so one account's lockout never affects another's — and deliberately
// NOT on whether that email exists, which would leak account existence.
const LIMITS = {
  signIn: { limit: 8, windowMs: 15 * 60 * 1000 },
  signUp: { limit: 5, windowMs: 60 * 60 * 1000 },
  reset: { limit: 3, windowMs: 60 * 60 * 1000 },
} as const;

/** Uniform throttle copy. Says nothing about whether the email is registered. */
function throttled(retryAfterMs: number): string {
  return `Too many attempts. Try again in ${formatRetryAfter(retryAfterMs)}.`;
}

/** Normalized bucket key — case/whitespace variants must share one bucket. */
function emailKey(action: keyof typeof LIMITS, email: string): string {
  return `${action}:${email.trim().toLowerCase()}`;
}

const signUpSchema = z.object({
  role: z.enum(["student", "institution"]),
  name: z.string().trim().min(2, "Name is too short"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  // Step-2 academic fields (students; optional for institutions)
  cgpa: z.coerce.number().min(0).max(10).optional(),
  year: z.coerce.number().int().min(2020).max(2040).optional(),
  field: z.string().trim().optional(),
  achievementsText: z.string().trim().optional(),
});

export async function signUpAction(input: unknown): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // Throttled before any mode branch, so demo and live enforce the same
  // ceiling and the limit is never silently absent on a misconfigured deploy.
  const gate = checkRateLimit(
    emailKey("signUp", data.email),
    LIMITS.signUp.limit,
    LIMITS.signUp.windowMs
  );
  if (!gate.allowed) return { ok: false, error: throttled(gate.retryAfterMs) };

  if (!isLiveMode() || !hasDatabase()) {
    return {
      ok: false,
      error:
        "Account creation is unavailable in demo mode. Configure Supabase Auth and DATABASE_URL to create a persistent account.",
    };
  }

  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: "Auth service unavailable" };

  // Create the user pre-confirmed (service role) so registration flows
  // straight into a session — no email round-trip for this product.
  const admin = getSupabaseAdmin();
  let userId: string;
  let hasSession = false;
  if (admin) {
    const { data: created, error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) {
      const msg = /already registered/i.test(error.message)
        ? "An account with this email already exists — sign in instead"
        : error.message;
      return { ok: false, error: msg };
    }
    userId = created.user!.id;
    // Establish the session cookie for the new account.
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });
    if (signInErr) return { ok: false, error: signInErr.message };
    hasSession = true;
  } else {
    const { data: signUp, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    if (error) return { ok: false, error: error.message };
    if (!signUp.user) return { ok: false, error: "Sign-up did not return a user" };
    userId = signUp.user.id;
    hasSession = Boolean(signUp.session);
  }

  // Profile rows are created with the service role: at this point the
  // client may not yet have a confirmed session, and RLS would block it.
  if (hasDatabase()) {
    try {
      await db()
        .insert(schema.profiles)
        .values({
          id: userId,
          role: data.role,
          name: data.name,
          email: data.email,
          avatarHue: Math.abs(hash(data.email)) % 360,
        })
        .onConflictDoNothing();

      if (data.role === "student") {
        await db()
          .insert(schema.studentProfiles)
          .values({
            profileId: userId,
            cgpa: data.cgpa ?? 0,
            year: data.year ?? new Date().getFullYear() + 1,
            field: data.field ?? "",
            profileCompletion: computeInitialCompletion(data),
          })
          .onConflictDoNothing();
      } else {
        await db()
          .insert(schema.institutions)
          .values({ profileId: userId, orgName: data.name })
          .onConflictDoNothing();
      }
    } catch (e) {
      console.error("profile row creation failed:", e);
      return { ok: false, error: "Account created but profile setup failed — contact support" };
    }
  }
  const redirectTo =
    data.role === "institution" ? "/dashboard/institution" : "/dashboard/student";
  return hasSession
    ? { ok: true, redirectTo }
    : {
        ok: true,
        message: "Account created. Check your email to confirm it, then sign in.",
      };
}

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password required"),
});

export type SignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function signInAction(input: unknown): Promise<SignInResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Throttled on the submitted email before any credential check, so the
  // response timing and text are identical for registered and unknown
  // addresses — this must not become an account-existence oracle.
  const gate = checkRateLimit(
    emailKey("signIn", parsed.data.email),
    LIMITS.signIn.limit,
    LIMITS.signIn.windowMs
  );
  if (!gate.allowed) return { ok: false, error: throttled(gate.retryAfterMs) };

  if (!isLiveMode() || !hasDatabase()) {
    return {
      ok: false,
      error:
        "Sign-in is unavailable because persistent authentication is not configured. Set up Supabase Auth and DATABASE_URL, then try again.",
    };
  }

  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: "Auth service unavailable" };

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: error.message };

  // A valid Auth identity without a provisioned application profile must
  // never silently become a student. Sign it back out and fail closed.
  let rows;
  try {
    rows = await db()
      .select({ role: schema.profiles.role, disabled: schema.profiles.disabled })
      .from(schema.profiles)
      .where(eqId(data.user.id))
      .limit(1);
  } catch (cause) {
    console.error("profile lookup failed during sign-in:", cause);
    await supabase.auth.signOut();
    return { ok: false, error: "We could not load your account. Please try again." };
  }
  if (!rows[0]) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account is not set up yet. Contact your administrator." };
  }
  if (rows[0].disabled) {
    await supabase.auth.signOut();
    return { ok: false, error: "This account has been disabled" };
  }
  const role = rows[0].role;
  const redirectTo =
    role === "admin"
      ? "/dashboard/admin"
      : role === "institution"
        ? "/dashboard/institution"
        : "/dashboard/student";
  return { ok: true, redirectTo };
}

export async function signOutAction(): Promise<void> {
  if (isLiveMode()) {
    const supabase = await getSupabaseServer();
    await supabase?.auth.signOut();
  }
  redirect("/");
}

export async function resetPasswordAction(email: string): Promise<AuthResult> {
  const check = z.string().trim().email().safeParse(email);
  if (!check.success) return { ok: false, error: "Enter a valid email" };

  // Same uniform throttle message whether or not the address is registered;
  // the reset endpoint already answers identically for both cases and the
  // limit must not be the thing that distinguishes them.
  const gate = checkRateLimit(
    emailKey("reset", check.data),
    LIMITS.reset.limit,
    LIMITS.reset.windowMs
  );
  if (!gate.allowed) return { ok: false, error: throttled(gate.retryAfterMs) };

  if (!isLiveMode() || !hasDatabase()) {
    return {
      ok: false,
      error:
        "Password reset is unavailable until Supabase Auth and DATABASE_URL are configured.",
    };
  }

  const supabase = await getSupabaseServer();
  if (!supabase) return { ok: false, error: "Auth service unavailable" };
  const { error } = await supabase.auth.resetPasswordForEmail(check.data);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── helpers ─────────────────────────────────────────────────

function eqId(id: string) {
  return eq(schema.profiles.id, id);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function computeInitialCompletion(d: z.infer<typeof signUpSchema>): number {
  let filled = 2; // name + email
  if (d.cgpa) filled++;
  if (d.year) filled++;
  if (d.field) filled++;
  if (d.achievementsText) filled++;
  return Math.round((filled / 10) * 100);
}
