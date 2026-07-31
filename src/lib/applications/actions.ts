"use server";

// ─────────────────────────────────────────────────────────────
// Application actions. The engine runs server-side on the real
// profile row and its output is FROZEN into ai_snapshot at submit
// time — so a later profile edit can never rewrite the basis on
// which a decision was made ("every figure agrees" / auditability).
// ─────────────────────────────────────────────────────────────

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { computeAIScore, matchScholarship } from "@/lib/ai-engine";
import { getDataSource } from "@/lib/datasource";
import { db, schema } from "@/lib/db/client";
import { hasDatabase } from "@/lib/env";
import { getSessionProfile } from "@/lib/auth/session";
import {
  demoDeleteApplication,
  demoUpsertApplication,
} from "@/lib/datasource/demo";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function applyAction(scholarshipId: string): Promise<ActionResult> {
  const me = await getSessionProfile();
  if (!me) return { ok: false, error: "Sign in to apply" };
  if (me.role !== "student") {
    return { ok: false, error: "Only student accounts can apply" };
  }

  const ds = await getDataSource();
  const [scholarship, profile, existing] = await Promise.all([
    ds.getScholarship(scholarshipId),
    ds.getStudentProfile(me.id),
    ds.getApplication(me.id, scholarshipId),
  ]);

  if (!scholarship) return { ok: false, error: "Scholarship not found" };
  if (!profile) return { ok: false, error: "Complete your profile before applying" };
  if (existing && existing.status !== "draft") {
    return { ok: false, error: "You have already applied to this scholarship" };
  }

  // Deadline gate — server-side truth, not a client check.
  if (new Date(scholarship.deadline).getTime() < Date.now()) {
    return { ok: false, error: "This scholarship's deadline has passed" };
  }

  // Freeze the engine's verdict at submit time.
  const score = computeAIScore(profile);
  const match = matchScholarship(profile, scholarship);
  const snapshot = {
    total: score.total,
    confidence: score.confidence,
    matchScore: match.matchScore,
    winProbability: match.winProbability,
    components: score.components,
    reasons: match.reasons,
  };

  if (!hasDatabase()) {
    demoUpsertApplication({
      id: `demo-${scholarshipId}`,
      scholarshipId,
      studentId: me.id,
      status: "submitted",
      aiSnapshot: snapshot,
      rejectionReasons: match.eligible ? [] : match.missingCriteria,
      submittedAt: new Date().toISOString(),
      decidedAt: null,
    });
  } else {
    await db()
      .insert(schema.applications)
      .values({
        scholarshipId,
        studentId: me.id,
        status: "submitted",
        aiSnapshot: snapshot,
        rejectionReasons: match.eligible ? [] : match.missingCriteria,
        submittedAt: new Date(),
      })
      .onConflictDoNothing();

    // Keep the public applicant counter honest.
    await db()
      .update(schema.scholarships)
      .set({ applicants: sql`${schema.scholarships.applicants} + 1` })
      .where(eq(schema.scholarships.id, scholarshipId));

    await db().insert(schema.auditLog).values({
      actorId: me.id,
      action: "application.submitted",
      entity: "application",
      entityId: scholarshipId,
      after: { status: "submitted", matchScore: snapshot.matchScore },
    });
  }

  revalidatePath("/dashboard/student");
  revalidatePath("/scholarships");
  revalidatePath(`/scholarships/${scholarshipId}`);
  return { ok: true };
}

export async function withdrawAction(scholarshipId: string): Promise<ActionResult> {
  const me = await getSessionProfile();
  if (!me) return { ok: false, error: "Sign in to manage applications" };

  const ds = await getDataSource();
  const existing = await ds.getApplication(me.id, scholarshipId);
  if (!existing) return { ok: false, error: "No application found" };
  if (existing.status === "approved" || existing.status === "rejected") {
    return { ok: false, error: "A decided application cannot be withdrawn" };
  }

  if (!hasDatabase()) {
    demoDeleteApplication(me.id, scholarshipId);
  } else {
    await db()
      .delete(schema.applications)
      .where(
        and(
          eq(schema.applications.studentId, me.id),
          eq(schema.applications.scholarshipId, scholarshipId)
        )
      );
    await db()
      .update(schema.scholarships)
      .set({ applicants: sql`greatest(${schema.scholarships.applicants} - 1, 0)` })
      .where(eq(schema.scholarships.id, scholarshipId));
    await db().insert(schema.auditLog).values({
      actorId: me.id,
      action: "application.withdrawn",
      entity: "application",
      entityId: scholarshipId,
      before: { status: existing.status },
    });
  }

  revalidatePath("/dashboard/student");
  revalidatePath(`/scholarships/${scholarshipId}`);
  return { ok: true };
}

export async function toggleSaveAction(
  scholarshipId: string
): Promise<{ ok: true; saved: boolean } | { ok: false; error: string }> {
  const me = await getSessionProfile();
  if (!me) return { ok: false, error: "Sign in to save scholarships" };
  if (!hasDatabase()) return { ok: true, saved: false };

  const existing = await db()
    .select()
    .from(schema.savedScholarships)
    .where(
      and(
        eq(schema.savedScholarships.studentId, me.id),
        eq(schema.savedScholarships.scholarshipId, scholarshipId)
      )
    )
    .limit(1);

  if (existing.length) {
    await db()
      .delete(schema.savedScholarships)
      .where(
        and(
          eq(schema.savedScholarships.studentId, me.id),
          eq(schema.savedScholarships.scholarshipId, scholarshipId)
        )
      );
    revalidatePath("/scholarships");
    return { ok: true, saved: false };
  }

  await db()
    .insert(schema.savedScholarships)
    .values({ studentId: me.id, scholarshipId })
    .onConflictDoNothing();
  revalidatePath("/scholarships");
  return { ok: true, saved: true };
}
