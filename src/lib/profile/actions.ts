"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/lib/db/client";
import { hasDatabase } from "@/lib/env";
import { getSessionProfile } from "@/lib/auth/session";

// Every field here is an input the published weights actually read —
// keep in sync with WEIGHTS in src/lib/ai-engine.ts.
const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is too short"),
  field: z.string().trim().min(2, "Field of study is required"),
  degree: z.string().trim().default(""),
  year: z.coerce.number().int().min(1).max(8),
  location: z.string().trim().default(""),
  cgpa: z.coerce.number().min(0, "CGPA cannot be negative").max(10, "CGPA is out of 10"),
  attendance: z.coerce.number().min(0).max(100),
  familyIncome: z.coerce.number().min(0),
  gender: z.enum(["female", "male", "other"]),
  minority: z.coerce.boolean(),
  disability: z.coerce.boolean(),
  firstGeneration: z.coerce.boolean(),
  achievements: z.coerce.number().int().min(0).max(99),
  researchPapers: z.coerce.number().int().min(0).max(99),
  hackathons: z.coerce.number().int().min(0).max(99),
  sportsLevel: z.coerce.number().int().min(0).max(3),
  certifications: z.coerce.number().int().min(0).max(99),
  leadershipRoles: z.coerce.number().int().min(0).max(99),
  volunteerHours: z.coerce.number().int().min(0).max(9999),
  projects: z.coerce.number().int().min(0).max(99),
  skills: z.string().trim().default(""),
  previousScholarships: z.coerce.number().int().min(0).max(99),
  sopQuality: z.coerce.number().int().min(0).max(100),
  recommendationStrength: z.coerce.number().int().min(0).max(100),
});

export type ProfileResult = { ok: true } | { ok: false; error: string };

/** Completion = share of the engine's inputs the student has actually filled. */
function completion(d: z.infer<typeof profileSchema>): number {
  const signals = [
    d.field.length > 1,
    d.degree.length > 1,
    d.location.length > 1,
    d.cgpa > 0,
    d.attendance > 0,
    d.familyIncome > 0,
    d.achievements > 0 || d.hackathons > 0,
    d.researchPapers > 0 || d.projects > 0,
    d.leadershipRoles > 0 || d.volunteerHours > 0,
    d.skills.length > 1,
    d.sopQuality > 0,
    d.recommendationStrength > 0,
  ];
  return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}

export async function saveProfileAction(input: unknown): Promise<ProfileResult> {
  const me = await getSessionProfile();
  if (!me) return { ok: false, error: "Sign in to edit your profile" };
  if (me.role !== "student") {
    return { ok: false, error: "Only student accounts have an academic profile" };
  }

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  if (!hasDatabase()) {
    // Demo mode: nothing to persist; the seeded profile stays authoritative.
    return { ok: true };
  }

  const skills = d.skills
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  await db()
    .update(schema.profiles)
    .set({ name: d.name })
    .where(eq(schema.profiles.id, me.id));

  await db()
    .insert(schema.studentProfiles)
    .values({
      profileId: me.id,
      field: d.field,
      degree: d.degree,
      year: d.year,
      location: d.location,
      cgpa: d.cgpa,
      attendance: d.attendance,
      familyIncome: d.familyIncome,
      gender: d.gender,
      minority: d.minority,
      disability: d.disability,
      firstGeneration: d.firstGeneration,
      achievements: d.achievements,
      researchPapers: d.researchPapers,
      hackathons: d.hackathons,
      sportsLevel: d.sportsLevel,
      certifications: d.certifications,
      leadershipRoles: d.leadershipRoles,
      volunteerHours: d.volunteerHours,
      projects: d.projects,
      skills,
      previousScholarships: d.previousScholarships,
      sopQuality: d.sopQuality,
      recommendationStrength: d.recommendationStrength,
      profileCompletion: completion(d),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: schema.studentProfiles.profileId,
      set: {
        field: d.field,
        degree: d.degree,
        year: d.year,
        location: d.location,
        cgpa: d.cgpa,
        attendance: d.attendance,
        familyIncome: d.familyIncome,
        gender: d.gender,
        minority: d.minority,
        disability: d.disability,
        firstGeneration: d.firstGeneration,
        achievements: d.achievements,
        researchPapers: d.researchPapers,
        hackathons: d.hackathons,
        sportsLevel: d.sportsLevel,
        certifications: d.certifications,
        leadershipRoles: d.leadershipRoles,
        volunteerHours: d.volunteerHours,
        projects: d.projects,
        skills,
        previousScholarships: d.previousScholarships,
        sopQuality: d.sopQuality,
        recommendationStrength: d.recommendationStrength,
        profileCompletion: completion(d),
        updatedAt: new Date(),
      },
    });

  // Score, matches and eligibility all derive from this row.
  revalidatePath("/dashboard/student");
  revalidatePath("/dashboard/student/profile");
  revalidatePath("/scholarships");
  return { ok: true };
}
