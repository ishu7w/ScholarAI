import { eq } from "drizzle-orm";
import type { Scholarship, StudentProfile } from "@/lib/types";
import { db, schema } from "@/lib/db/client";
import type { DataSource } from "./index";

type ScholarshipRow = typeof schema.scholarships.$inferSelect;

function rowToScholarship(row: ScholarshipRow): Scholarship {
  return {
    id: row.id,
    name: row.name,
    provider: row.provider,
    category: row.category as Scholarship["category"],
    amount: row.amount,
    currency: row.currency,
    deadline: row.deadline,
    seats: row.seats,
    applicants: row.applicants,
    description: row.description,
    criteria: row.criteria as Scholarship["criteria"],
    tags: row.tags,
  };
}

export class LiveDataSource implements DataSource {
  readonly mode = "live" as const;

  async getScholarships(): Promise<Scholarship[]> {
    const rows = await db()
      .select()
      .from(schema.scholarships)
      .where(eq(schema.scholarships.status, "active"));
    return rows.map(rowToScholarship);
  }

  async getScholarship(id: string): Promise<Scholarship | null> {
    const rows = await db()
      .select()
      .from(schema.scholarships)
      .where(eq(schema.scholarships.id, id))
      .limit(1);
    return rows[0] ? rowToScholarship(rows[0]) : null;
  }

  async getStudentProfile(profileId?: string): Promise<StudentProfile | null> {
    if (!profileId) return null;
    const rows = await db()
      .select()
      .from(schema.profiles)
      .innerJoin(
        schema.studentProfiles,
        eq(schema.studentProfiles.profileId, schema.profiles.id)
      )
      .where(eq(schema.profiles.id, profileId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    const p = row.profiles;
    const s = row.student_profiles;
    return {
      id: p.id,
      name: p.name,
      email: p.email,
      avatarHue: p.avatarHue,
      field: s.field,
      degree: s.degree,
      year: s.year,
      location: s.location,
      cgpa: s.cgpa,
      attendance: s.attendance,
      familyIncome: s.familyIncome,
      gender: s.gender as StudentProfile["gender"],
      minority: s.minority,
      disability: s.disability,
      firstGeneration: s.firstGeneration,
      achievements: s.achievements,
      researchPapers: s.researchPapers,
      hackathons: s.hackathons,
      sportsLevel: s.sportsLevel as StudentProfile["sportsLevel"],
      certifications: s.certifications,
      leadershipRoles: s.leadershipRoles,
      volunteerHours: s.volunteerHours,
      projects: s.projects,
      skills: s.skills,
      previousScholarships: s.previousScholarships,
      behaviourScore: s.behaviourScore,
      sopQuality: s.sopQuality,
      recommendationStrength: s.recommendationStrength,
      profileCompletion: s.profileCompletion,
    };
  }
}
