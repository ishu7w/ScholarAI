"use server";

// ─────────────────────────────────────────────────────────────
// Institution actions — decisions and scholarship CRUD.
//
// Ownership is always re-derived server-side: the caller's session →
// their institutions row → the scholarship's institution_id. No client
// value participates in that chain. Rejection reasons are the engine's
// own missingCriteria (frozen at submit when present) — never prose
// invented at decision time.
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { matchScholarship } from "@/lib/ai-engine";
import { getSessionProfile } from "@/lib/auth/session";
import { getDataSource } from "@/lib/datasource";
import { db, schema } from "@/lib/db/client";
import { hasDatabase } from "@/lib/env";
import type { ScholarshipCategory } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

const CATEGORIES = [
  "Government",
  "Private",
  "NGO",
  "University",
  "International",
  "Corporate",
  "Research Grant",
  "Need-based",
  "Merit",
  "Women",
  "Minority",
  "Sports",
] as const satisfies readonly ScholarshipCategory[];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const decisionSchema = z.object({
  applicationId: z.string().trim().min(1).max(64),
  decision: z.enum(["approve", "reject"]),
});

/** Every criteria field the engine's eligibility gates actually read. */
const criteriaSchema = z.object({
  minCgpa: z.coerce.number().min(0).max(10),
  // Blank means "no cap" (null) — distinct from a cap of 0. z.coerce would
  // turn "" into 0, so the empty case is resolved before coercion.
  maxIncome: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    z.union([z.coerce.number().min(0).max(100_000_000), z.null()])
  ),
  minAttendance: z.coerce.number().min(0).max(100),
  requiresResearch: z.coerce.boolean(),
  requiresLeadership: z.coerce.boolean(),
  womenOnly: z.coerce.boolean(),
  minorityOnly: z.coerce.boolean(),
  sportsRequired: z.coerce.boolean(),
  disabilityPreferred: z.coerce.boolean(),
  locations: z.string().trim().default(""),
  fields: z.string().trim().default(""),
});

const scholarshipSchema = z
  .object({
    name: z.string().trim().min(3, "Name is too short").max(140),
    provider: z.string().trim().min(2, "Provider is required").max(140),
    category: z.enum(CATEGORIES),
    amount: z.coerce.number().int().min(0, "Amount cannot be negative").max(100_000_000),
    currency: z.string().trim().length(3).default("USD"),
    deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Deadline must be a date"),
    seats: z.coerce.number().int().min(1, "At least one seat is required").max(1_000_000),
    description: z.string().trim().min(20, "Describe the program in a sentence or two"),
    tags: z.string().trim().default(""),
    status: z.enum(["draft", "active", "closed"]).default("active"),
  })
  .and(criteriaSchema);

type ScholarshipInput = z.infer<typeof scholarshipSchema>;

const idSchema = z.object({ id: z.string().trim().min(1).max(120) });

function splitList(raw: string): string[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toCriteria(d: ScholarshipInput) {
  return {
    minCgpa: d.minCgpa,
    maxIncome: d.maxIncome,
    minAttendance: d.minAttendance,
    requiresResearch: d.requiresResearch,
    requiresLeadership: d.requiresLeadership,
    womenOnly: d.womenOnly,
    minorityOnly: d.minorityOnly,
    sportsRequired: d.sportsRequired,
    disabilityPreferred: d.disabilityPreferred,
    locations: splitList(d.locations),
    fields: splitList(d.fields),
  };
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `sch-${base || "program"}-${Date.now().toString(36)}`;
}

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}

/** The caller's own institution row, or an error. Never accepts an id. */
async function requireOwnInstitution(): Promise<
  | { ok: true; profileId: string; institutionId: string }
  | { ok: false; error: string }
> {
  const me = await getSessionProfile();
  if (!me) return { ok: false, error: "Sign in to manage this program" };
  if (me.role !== "institution" && me.role !== "admin") {
    return { ok: false, error: "Only institution accounts can do this" };
  }
  const ds = await getDataSource();
  const inst = await ds.getInstitutionForProfile(me.id);
  if (!inst) return { ok: false, error: "No institution is linked to this account" };
  return { ok: true, profileId: me.id, institutionId: inst.id };
}

function revalidateInstitution(scholarshipId?: string) {
  revalidatePath("/dashboard/institution");
  revalidatePath("/dashboard/institution/scholarships");
  revalidatePath("/scholarships");
  if (scholarshipId) revalidatePath(`/scholarships/${scholarshipId}`);
}

// ── decisions ─────────────────────────────────────────────────

export async function decideApplicationAction(input: unknown): Promise<ActionResult> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const { applicationId, decision } = parsed.data;

  const auth = await requireOwnInstitution();
  if (!auth.ok) return auth;

  // Demo mode has no writable store — the action no-ops rather than
  // pretending a decision was recorded.
  if (!hasDatabase()) return { ok: true };
  // Only past this point does the id reach a uuid column.
  if (!UUID_RE.test(applicationId)) {
    return { ok: false, error: "Invalid application reference" };
  }

  // Ownership check in the query itself: the application must belong to a
  // scholarship whose institution_id is the caller's own.
  const rows = await db()
    .select({ app: schema.applications, scholarship: schema.scholarships })
    .from(schema.applications)
    .innerJoin(
      schema.scholarships,
      eq(schema.scholarships.id, schema.applications.scholarshipId)
    )
    .where(
      and(
        eq(schema.applications.id, applicationId),
        eq(schema.scholarships.institutionId, auth.institutionId)
      )
    )
    .limit(1);

  const row = rows[0];
  if (!row) return { ok: false, error: "Application not found for your programs" };
  if (row.app.status === "approved" || row.app.status === "rejected") {
    return { ok: false, error: "This application has already been decided" };
  }

  const status = decision === "approve" ? "approved" : "rejected";

  // Rejection reasons come from the engine. Prefer the gates frozen at
  // submit time; recompute only when nothing was frozen.
  let reasons: string[] = [];
  if (decision === "reject") {
    if (row.app.rejectionReasons.length > 0) {
      reasons = row.app.rejectionReasons;
    } else {
      const ds = await getDataSource();
      const [profile, scholarship] = await Promise.all([
        ds.getStudentProfile(row.app.studentId),
        ds.getScholarship(row.app.scholarshipId),
      ]);
      // No engine gate failed → the list stays empty rather than gaining
      // an invented reason. A discretionary rejection records none.
      reasons =
        profile && scholarship
          ? matchScholarship(profile, scholarship).missingCriteria
          : [];
    }
  }

  const decidedAt = new Date();
  await db()
    .update(schema.applications)
    .set({
      status,
      decidedAt,
      decidedBy: auth.profileId,
      rejectionReasons: decision === "reject" ? reasons : [],
    })
    .where(eq(schema.applications.id, applicationId));

  await db().insert(schema.auditLog).values({
    actorId: auth.profileId,
    action: `application.${status}`,
    entity: "application",
    entityId: applicationId,
    before: { status: row.app.status },
    after: {
      status,
      decidedAt: decidedAt.toISOString(),
      rejectionReasons: decision === "reject" ? reasons : [],
    },
  });

  await db().insert(schema.notifications).values({
    profileId: row.app.studentId,
    type: "application.decided",
    payload: {
      applicationId,
      scholarshipId: row.app.scholarshipId,
      scholarshipName: row.scholarship.name,
      status,
      reasons,
    },
  });

  revalidateInstitution(row.app.scholarshipId);
  revalidatePath("/dashboard/student");
  return { ok: true };
}

// ── scholarship CRUD ──────────────────────────────────────────

export async function createScholarshipAction(input: unknown): Promise<CreateResult> {
  const parsed = scholarshipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;

  const auth = await requireOwnInstitution();
  if (!auth.ok) return auth;
  if (!hasDatabase()) return { ok: true, id: "" };

  const id = slugify(d.name);
  const criteria = toCriteria(d);

  await db().insert(schema.scholarships).values({
    id,
    name: d.name,
    provider: d.provider,
    category: d.category,
    amount: d.amount,
    currency: d.currency,
    deadline: d.deadline,
    seats: d.seats,
    applicants: 0,
    description: d.description,
    criteria,
    tags: splitList(d.tags),
    institutionId: auth.institutionId,
    status: d.status,
  });

  // Criteria are the eligibility gates the engine enforces — their
  // initial value is as audit-worthy as any later edit.
  await db().insert(schema.auditLog).values({
    actorId: auth.profileId,
    action: "scholarship.created",
    entity: "scholarship",
    entityId: id,
    after: { name: d.name, status: d.status, criteria },
  });

  revalidateInstitution(id);
  return { ok: true, id };
}

export async function updateScholarshipAction(input: unknown): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(input);
  if (!parsedId.success) return { ok: false, error: "Missing scholarship reference" };
  const parsed = scholarshipSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const d = parsed.data;
  const { id } = parsedId.data;

  const auth = await requireOwnInstitution();
  if (!auth.ok) return auth;
  if (!hasDatabase()) return { ok: true };

  const existing = await db()
    .select()
    .from(schema.scholarships)
    .where(
      and(
        eq(schema.scholarships.id, id),
        eq(schema.scholarships.institutionId, auth.institutionId)
      )
    )
    .limit(1);

  const before = existing[0];
  if (!before) return { ok: false, error: "Program not found for your institution" };

  const criteria = toCriteria(d);

  await db()
    .update(schema.scholarships)
    .set({
      name: d.name,
      provider: d.provider,
      category: d.category,
      amount: d.amount,
      currency: d.currency,
      deadline: d.deadline,
      seats: d.seats,
      description: d.description,
      criteria,
      tags: splitList(d.tags),
      status: d.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.scholarships.id, id));

  await db().insert(schema.auditLog).values({
    actorId: auth.profileId,
    action: "scholarship.updated",
    entity: "scholarship",
    entityId: id,
    before: { name: before.name, status: before.status, criteria: before.criteria },
    after: { name: d.name, status: d.status, criteria },
  });

  // A criteria change moves the eligibility line for real applicants —
  // it gets its own row so the audit viewer can single it out.
  if (JSON.stringify(before.criteria) !== JSON.stringify(criteria)) {
    await db().insert(schema.auditLog).values({
      actorId: auth.profileId,
      action: "scholarship.criteria_changed",
      entity: "scholarship",
      entityId: id,
      before: before.criteria,
      after: criteria,
    });
  }

  revalidateInstitution(id);
  return { ok: true };
}
