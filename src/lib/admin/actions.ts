"use server";

// ─────────────────────────────────────────────────────────────
// Admin data + mutations. Every figure the admin dashboard shows
// comes from a SQL aggregate here — no invented totals. Demo mode
// (no DATABASE_URL) returns the seeded demo numbers and every write
// no-ops gracefully so the zero-env demo keeps working.
//
// Role is re-checked inside every function: the page guard is a UX
// gate, not a security boundary (a server action is a POST endpoint
// reachable without the UI).
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/lib/db/client";
import { hasDatabase, isLiveMode } from "@/lib/env";
import { getSessionProfile, type SessionProfile } from "@/lib/auth/session";
import { MONTHLY_APPLICATIONS, SCHOLARSHIPS, generateApplicants } from "@/lib/data";

export type Role = "student" | "institution" | "admin";

export type AdminActionResult =
  | { ok: true; message?: string }
  | { ok: false; error: string };

export interface PlatformStats {
  mode: "demo" | "live";
  usersByRole: Record<Role, number>;
  totalUsers: number;
  disabledUsers: number;
  scholarshipsByStatus: { draft: number; active: number; closed: number };
  totalScholarships: number;
  applicationsByStatus: {
    draft: number;
    submitted: number;
    under_review: number;
    approved: number;
    rejected: number;
  };
  totalApplications: number;
  decidedApplications: number;
  /** approved / (approved + rejected), null when nothing is decided yet. */
  approvalRate: number | null;
  monthly: { month: string; applications: number; approvals: number }[];
}

export interface AuditEntry {
  id: number;
  actorEmail: string | null;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabled: boolean;
  createdAt: string;
}

const ROLES = ["student", "institution", "admin"] as const;

/** Never trust the caller's claim — read the role from the session row. */
async function adminOnly(): Promise<SessionProfile | null> {
  const me = await getSessionProfile();
  if (!me) return null;
  // Pure demo mode (zero env) has no real identity and no database: the
  // seeded persona may read the demo aggregates, and every write below
  // still no-ops. As soon as Supabase is configured, roles come from the
  // profiles row and only a real admin passes.
  if (!isLiveMode() && !hasDatabase()) return me;
  return me.role === "admin" ? me : null;
}

function emptyStats(mode: "demo" | "live"): PlatformStats {
  return {
    mode,
    usersByRole: { student: 0, institution: 0, admin: 0 },
    totalUsers: 0,
    disabledUsers: 0,
    scholarshipsByStatus: { draft: 0, active: 0, closed: 0 },
    totalScholarships: 0,
    applicationsByStatus: {
      draft: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
    },
    totalApplications: 0,
    decidedApplications: 0,
    approvalRate: null,
    monthly: [],
  };
}

/** Demo mode keeps the seeded figures the demo has always shown. */
function demoStats(): PlatformStats {
  const seededApplications = generateApplicants(60).length * 210;
  const approvals = MONTHLY_APPLICATIONS.reduce((a, m) => a + m.approvals, 0);
  return {
    mode: "demo",
    usersByRole: { student: 120_483, institution: 42, admin: 3 },
    totalUsers: 120_528,
    disabledUsers: 0,
    scholarshipsByStatus: { draft: 0, active: SCHOLARSHIPS.length, closed: 0 },
    totalScholarships: SCHOLARSHIPS.length,
    applicationsByStatus: {
      draft: 0,
      submitted: seededApplications - approvals,
      under_review: 0,
      approved: approvals,
      rejected: 0,
    },
    totalApplications: seededApplications,
    decidedApplications: approvals,
    approvalRate: 100,
    monthly: MONTHLY_APPLICATIONS.map((m) => ({
      month: m.month,
      applications: m.applications,
      approvals: m.approvals,
    })),
  };
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  const me = await adminOnly();
  if (!me) return null;
  if (!hasDatabase()) return demoStats();

  const monthExpr = sql`date_trunc('month', ${schema.applications.createdAt})`;

  const [users, scholarshipRows, applicationRows, monthly] = await Promise.all([
    // total users by role (+ how many are disabled)
    db()
      .select({
        role: schema.profiles.role,
        total: count(),
        disabled:
          sql<number>`count(*) filter (where ${schema.profiles.disabled})`.mapWith(
            Number
          ),
      })
      .from(schema.profiles)
      .groupBy(schema.profiles.role),
    // total scholarships by status
    db()
      .select({ status: schema.scholarships.status, total: count() })
      .from(schema.scholarships)
      .groupBy(schema.scholarships.status),
    // applications by status — the approval rate's basis
    db()
      .select({ status: schema.applications.status, total: count() })
      .from(schema.applications)
      .groupBy(schema.applications.status),
    // monthly volume for the activity chart
    db()
      .select({
        month: sql<string>`to_char(${monthExpr}, 'Mon')`,
        applications: count(),
        approvals:
          sql<number>`count(*) filter (where ${schema.applications.status} = 'approved')`.mapWith(
            Number
          ),
      })
      .from(schema.applications)
      .groupBy(monthExpr)
      .orderBy(monthExpr)
      .limit(12),
  ]);

  const stats = emptyStats("live");
  for (const r of users) {
    stats.usersByRole[r.role] = Number(r.total);
    stats.totalUsers += Number(r.total);
    stats.disabledUsers += r.disabled;
  }
  for (const r of scholarshipRows) {
    stats.scholarshipsByStatus[r.status] = Number(r.total);
    stats.totalScholarships += Number(r.total);
  }
  for (const r of applicationRows) {
    stats.applicationsByStatus[r.status] = Number(r.total);
    stats.totalApplications += Number(r.total);
  }

  const approved = stats.applicationsByStatus.approved;
  const decided = approved + stats.applicationsByStatus.rejected;
  stats.decidedApplications = decided;
  stats.approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : null;
  stats.monthly = monthly.map((m) => ({
    month: m.month,
    applications: Number(m.applications),
    approvals: m.approvals,
  }));

  return stats;
}

// ---------- audit log ----------

/** The demo's long-standing sample trail, dated today so it reads live. */
const DEMO_AUDIT: { time: string; actor: string; action: string; entity: string }[] = [
  { time: "14:32", actor: "admin@scholarai.io", action: "model.weight_changed", entity: "scholarship" },
  { time: "13:58", actor: "system", action: "documents.batch_verified", entity: "document" },
  { time: "13:10", actor: "dean@stateuni.edu", action: "report.exported", entity: "scholarship" },
  { time: "11:47", actor: "system", action: "fraud.flagged", entity: "application" },
  { time: "10:15", actor: "admin@scholarai.io", action: "scholarship.created", entity: "scholarship" },
  { time: "09:03", actor: "system", action: "engine.rescored", entity: "profile" },
];

function demoAudit(): AuditEntry[] {
  const day = new Date().toISOString().slice(0, 10);
  return DEMO_AUDIT.map((e, i) => ({
    id: DEMO_AUDIT.length - i,
    actorEmail: e.actor,
    action: e.action,
    entity: e.entity,
    entityId: `demo-${i + 1}`,
    createdAt: `${day}T${e.time}:00.000Z`,
  }));
}

/** Recent entries for the dashboard card. */
export async function getRecentAudit(limit = 6): Promise<AuditEntry[]> {
  const me = await adminOnly();
  if (!me) return [];
  if (!hasDatabase()) return demoAudit().slice(0, limit);

  const rows = await db()
    .select({
      id: schema.auditLog.id,
      actorEmail: schema.profiles.email,
      action: schema.auditLog.action,
      entity: schema.auditLog.entity,
      entityId: schema.auditLog.entityId,
      createdAt: schema.auditLog.createdAt,
    })
    .from(schema.auditLog)
    .leftJoin(schema.profiles, eq(schema.profiles.id, schema.auditLog.actorId))
    .orderBy(desc(schema.auditLog.id))
    .limit(limit);

  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export interface AuditPage {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  /** Distinct actions present in the log — the filter's option list. */
  actions: string[];
  mode: "demo" | "live";
}

const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  action: z.string().trim().max(120).optional(),
});

export async function getAuditPage(input: unknown): Promise<AuditPage | null> {
  const me = await adminOnly();
  if (!me) return null;

  const parsed = auditQuerySchema.safeParse(input ?? {});
  if (!parsed.success) return null;
  const { page } = parsed.data;
  const action = parsed.data.action && parsed.data.action.length ? parsed.data.action : undefined;
  const pageSize = 25;

  if (!hasDatabase()) {
    const all = demoAudit();
    const actions = [...new Set(all.map((e) => e.action))].sort();
    const filtered = action ? all.filter((e) => e.action === action) : all;
    return {
      entries: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
      actions,
      mode: "demo",
    };
  }

  const where = action ? eq(schema.auditLog.action, action) : undefined;

  const [entries, totals, actions] = await Promise.all([
    db()
      .select({
        id: schema.auditLog.id,
        actorEmail: schema.profiles.email,
        action: schema.auditLog.action,
        entity: schema.auditLog.entity,
        entityId: schema.auditLog.entityId,
        createdAt: schema.auditLog.createdAt,
      })
      .from(schema.auditLog)
      .leftJoin(schema.profiles, eq(schema.profiles.id, schema.auditLog.actorId))
      .where(where)
      .orderBy(desc(schema.auditLog.id))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db().select({ total: count() }).from(schema.auditLog).where(where),
    db()
      .selectDistinct({ action: schema.auditLog.action })
      .from(schema.auditLog)
      .orderBy(schema.auditLog.action),
  ]);

  return {
    entries: entries.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    total: Number(totals[0]?.total ?? 0),
    page,
    pageSize,
    actions: actions.map((a) => a.action),
    mode: "live",
  };
}

// ---------- user management ----------

/** Demo roster — mirrors the three seeded demo personas. */
function demoUsers(): AdminUser[] {
  const day = new Date(2026, 0, 12).toISOString();
  return [
    { id: "stu-aarya", name: "Aarya Sharma", email: "student@demo.scholarai.app", role: "student", disabled: false, createdAt: day },
    { id: "ins-statuni", name: "State University", email: "institution@demo.scholarai.app", role: "institution", disabled: false, createdAt: day },
    { id: "adm-root", name: "Platform Admin", email: "admin@demo.scholarai.app", role: "admin", disabled: false, createdAt: day },
  ];
}

export async function listUsers(): Promise<{ users: AdminUser[]; mode: "demo" | "live" } | null> {
  const me = await adminOnly();
  if (!me) return null;
  if (!hasDatabase()) return { users: demoUsers(), mode: "demo" };

  const rows = await db()
    .select({
      id: schema.profiles.id,
      name: schema.profiles.name,
      email: schema.profiles.email,
      role: schema.profiles.role,
      disabled: schema.profiles.disabled,
      createdAt: schema.profiles.createdAt,
    })
    .from(schema.profiles)
    .orderBy(desc(schema.profiles.createdAt))
    .limit(500);

  return {
    users: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    mode: "live",
  };
}

// Live rows are keyed by auth.users.id (a uuid); the demo roster uses
// readable slugs. Validate shape always, uuid only where it must be one.
const userIdSchema = z.string().trim().min(1, "User id is required").max(128);

function badUserId(userId: string): string | null {
  if (!hasDatabase()) return null;
  return z.uuid().safeParse(userId).success ? null : "Invalid user id";
}

const setDisabledSchema = z.object({
  userId: userIdSchema,
  disabled: z.boolean(),
});

export async function setUserDisabledAction(input: unknown): Promise<AdminActionResult> {
  const me = await adminOnly();
  if (!me) return { ok: false, error: "Admin access required" };

  const parsed = setDisabledSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { userId, disabled } = parsed.data;

  // Disabling yourself locks you out of the only account that can undo it.
  if (disabled && userId === me.id) {
    return { ok: false, error: "You cannot disable your own admin account" };
  }

  if (!hasDatabase()) {
    return { ok: true, message: "Demo mode — account state is not persisted" };
  }

  const invalid = badUserId(userId);
  if (invalid) return { ok: false, error: invalid };

  const [before] = await db()
    .select({ disabled: schema.profiles.disabled, email: schema.profiles.email })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);
  if (!before) return { ok: false, error: "User not found" };

  await db()
    .update(schema.profiles)
    .set({ disabled })
    .where(eq(schema.profiles.id, userId));

  await db().insert(schema.auditLog).values({
    actorId: me.id,
    action: disabled ? "user.disabled" : "user.enabled",
    entity: "profile",
    entityId: userId,
    before: { disabled: before.disabled },
    after: { disabled },
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/audit");
  revalidatePath("/dashboard/admin");
  return {
    ok: true,
    message: `${before.email} ${disabled ? "disabled" : "enabled"}`,
  };
}

const setRoleSchema = z.object({
  userId: userIdSchema,
  role: z.enum(ROLES),
});

export async function setUserRoleAction(input: unknown): Promise<AdminActionResult> {
  const me = await adminOnly();
  if (!me) return { ok: false, error: "Admin access required" };

  const parsed = setRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { userId, role } = parsed.data;

  // Same lock-out reasoning as disabling: demoting yourself is irreversible.
  if (userId === me.id && role !== "admin") {
    return { ok: false, error: "You cannot remove your own admin role" };
  }

  if (!hasDatabase()) {
    return { ok: true, message: "Demo mode — role changes are not persisted" };
  }

  const invalid = badUserId(userId);
  if (invalid) return { ok: false, error: invalid };

  const [before] = await db()
    .select({ role: schema.profiles.role, email: schema.profiles.email })
    .from(schema.profiles)
    .where(eq(schema.profiles.id, userId))
    .limit(1);
  if (!before) return { ok: false, error: "User not found" };
  if (before.role === role) return { ok: true, message: `${before.email} already ${role}` };

  await db().update(schema.profiles).set({ role }).where(eq(schema.profiles.id, userId));

  await db().insert(schema.auditLog).values({
    actorId: me.id,
    action: "user.role_changed",
    entity: "profile",
    entityId: userId,
    before: { role: before.role },
    after: { role },
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/audit");
  revalidatePath("/dashboard/admin");
  return { ok: true, message: `${before.email} is now ${role}` };
}
