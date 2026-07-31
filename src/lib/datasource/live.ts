import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import type { Scholarship, StudentProfile } from "@/lib/types";
import { db, schema } from "@/lib/db/client";
import type {
  ApplicationRecord,
  DataSource,
  DocumentSummary,
  InstitutionAggregates,
  InstitutionApplicant,
  InstitutionRecord,
  InstitutionScholarship,
} from "./index";

type ScholarshipRow = typeof schema.scholarships.$inferSelect;
type ApplicationRow = typeof schema.applications.$inferSelect;

function rowToApplication(row: ApplicationRow): ApplicationRecord {
  return {
    id: row.id,
    scholarshipId: row.scholarshipId,
    studentId: row.studentId,
    status: row.status,
    aiSnapshot: (row.aiSnapshot as ApplicationRecord["aiSnapshot"]) ?? null,
    rejectionReasons: row.rejectionReasons,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

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

function rowsToStudentProfile(
  p: typeof schema.profiles.$inferSelect,
  s: typeof schema.studentProfiles.$inferSelect
): StudentProfile {
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
    return rowsToStudentProfile(row.profiles, row.student_profiles);
  }

  async getApplications(studentId: string): Promise<ApplicationRecord[]> {
    const rows = await db()
      .select()
      .from(schema.applications)
      .where(eq(schema.applications.studentId, studentId));
    return rows.map(rowToApplication);
  }

  async getApplication(
    studentId: string,
    scholarshipId: string
  ): Promise<ApplicationRecord | null> {
    const rows = await db()
      .select()
      .from(schema.applications)
      .where(
        and(
          eq(schema.applications.studentId, studentId),
          eq(schema.applications.scholarshipId, scholarshipId)
        )
      )
      .limit(1);
    return rows[0] ? rowToApplication(rows[0]) : null;
  }

  async getSavedScholarshipIds(studentId: string): Promise<string[]> {
    const rows = await db()
      .select({ id: schema.savedScholarships.scholarshipId })
      .from(schema.savedScholarships)
      .where(eq(schema.savedScholarships.studentId, studentId));
    return rows.map((r) => r.id);
  }

  // ── institution surface (Phase 4) ─────────────────────────────

  async getInstitutionForProfile(profileId: string): Promise<InstitutionRecord | null> {
    const rows = await db()
      .select()
      .from(schema.institutions)
      .where(eq(schema.institutions.profileId, profileId))
      .limit(1);
    const r = rows[0];
    return r
      ? { id: r.id, profileId: r.profileId, orgName: r.orgName, verified: r.verified }
      : null;
  }

  /**
   * Ranked applicant queue. Real applications to scholarships this
   * institution owns, joined with the applicant's profile row and a
   * per-application document tally. Drafts are excluded — an unsubmitted
   * application is not an applicant.
   */
  async getInstitutionApplicants(institutionId: string): Promise<InstitutionApplicant[]> {
    const docs = db()
      .select({
        applicationId: schema.documents.applicationId,
        total: sql<number>`count(*)::int`.as("doc_total"),
        verified: sql<number>`count(*) filter (where ${schema.documents.verificationStatus} = 'verified')::int`.as(
          "doc_verified"
        ),
      })
      .from(schema.documents)
      .where(isNotNull(schema.documents.applicationId))
      .groupBy(schema.documents.applicationId)
      .as("doc_counts");

    const rows = await db()
      .select({
        app: schema.applications,
        scholarshipName: schema.scholarships.name,
        scholarshipCategory: schema.scholarships.category,
        profile: schema.profiles,
        student: schema.studentProfiles,
        docTotal: docs.total,
        docVerified: docs.verified,
      })
      .from(schema.applications)
      .innerJoin(
        schema.scholarships,
        eq(schema.scholarships.id, schema.applications.scholarshipId)
      )
      .innerJoin(schema.profiles, eq(schema.profiles.id, schema.applications.studentId))
      .innerJoin(
        schema.studentProfiles,
        eq(schema.studentProfiles.profileId, schema.applications.studentId)
      )
      .leftJoin(docs, eq(docs.applicationId, schema.applications.id))
      .where(
        and(
          eq(schema.scholarships.institutionId, institutionId),
          sql`${schema.applications.status} <> 'draft'`
        )
      )
      .orderBy(desc(schema.applications.submittedAt));

    return rows.map((r) => ({
      applicationId: r.app.id,
      scholarshipId: r.app.scholarshipId,
      scholarshipName: r.scholarshipName,
      scholarshipCategory: r.scholarshipCategory,
      status: r.app.status,
      aiSnapshot: (r.app.aiSnapshot as ApplicationRecord["aiSnapshot"]) ?? null,
      rejectionReasons: r.app.rejectionReasons,
      submittedAt: r.app.submittedAt?.toISOString() ?? null,
      decidedAt: r.app.decidedAt?.toISOString() ?? null,
      student: rowsToStudentProfile(r.profile, r.student),
      documentsVerified: r.docVerified ?? 0,
      documentsTotal: r.docTotal ?? 0,
    }));
  }

  async getInstitutionScholarships(
    institutionId: string
  ): Promise<InstitutionScholarship[]> {
    const rows = await db()
      .select()
      .from(schema.scholarships)
      .where(eq(schema.scholarships.institutionId, institutionId))
      .orderBy(asc(schema.scholarships.deadline));
    return rows.map((r) => ({ ...rowToScholarship(r), status: r.status }));
  }

  async getInstitutionScholarship(
    institutionId: string,
    scholarshipId: string
  ): Promise<InstitutionScholarship | null> {
    const rows = await db()
      .select()
      .from(schema.scholarships)
      .where(
        and(
          eq(schema.scholarships.id, scholarshipId),
          eq(schema.scholarships.institutionId, institutionId)
        )
      )
      .limit(1);
    const r = rows[0];
    return r ? { ...rowToScholarship(r), status: r.status } : null;
  }

  /**
   * Three SQL aggregates over this institution's applications. No
   * synthetic padding: a month/category/region with no rows simply is
   * not in the result, and an empty result renders an empty state.
   */
  async getInstitutionAggregates(institutionId: string): Promise<InstitutionAggregates> {
    const owned = eq(schema.scholarships.institutionId, institutionId);

    // 1. monthly: group by month of submitted_at, last 12 buckets
    const monthlyRows = await db()
      .select({
        label: sql<string>`to_char(date_trunc('month', ${schema.applications.submittedAt}), 'Mon YY')`.as(
          "label"
        ),
        applications: sql<number>`count(*)::int`.as("applications"),
        approvals: sql<number>`count(*) filter (where ${schema.applications.status} = 'approved')::int`.as(
          "approvals"
        ),
      })
      .from(schema.applications)
      .innerJoin(
        schema.scholarships,
        eq(schema.scholarships.id, schema.applications.scholarshipId)
      )
      .where(
        and(
          owned,
          isNotNull(schema.applications.submittedAt),
          // Drafts are excluded here exactly as in the queue and the other
          // two aggregates, so no two figures can disagree.
          sql`${schema.applications.status} <> 'draft'`
        )
      )
      .groupBy(sql`date_trunc('month', ${schema.applications.submittedAt})`)
      .orderBy(sql`date_trunc('month', ${schema.applications.submittedAt}) asc`);

    // 2. category distribution: group by the applied-to scholarship's category
    const categoryRows = await db()
      .select({
        name: schema.scholarships.category,
        value: sql<number>`count(*)::int`.as("value"),
      })
      .from(schema.applications)
      .innerJoin(
        schema.scholarships,
        eq(schema.scholarships.id, schema.applications.scholarshipId)
      )
      .where(and(owned, sql`${schema.applications.status} <> 'draft'`))
      .groupBy(schema.scholarships.category)
      .orderBy(sql`count(*) desc`);

    // 3. regions: group by the applicant's declared location
    const regionRows = await db()
      .select({
        region: schema.studentProfiles.location,
        students: sql<number>`count(*)::int`.as("students"),
        funded: sql<number>`count(*) filter (where ${schema.applications.status} = 'approved')::int`.as(
          "funded"
        ),
      })
      .from(schema.applications)
      .innerJoin(
        schema.scholarships,
        eq(schema.scholarships.id, schema.applications.scholarshipId)
      )
      .innerJoin(
        schema.studentProfiles,
        eq(schema.studentProfiles.profileId, schema.applications.studentId)
      )
      .where(
        and(
          owned,
          sql`${schema.applications.status} <> 'draft'`,
          sql`${schema.studentProfiles.location} <> ''`
        )
      )
      .groupBy(schema.studentProfiles.location)
      .orderBy(sql`count(*) desc`);

    return {
      monthly: monthlyRows.slice(-12).map((r) => ({
        month: r.label.trim(),
        applications: r.applications,
        approvals: r.approvals,
      })),
      categories: categoryRows.map((r) => ({ name: r.name, value: r.value })),
      regions: regionRows.map((r) => ({
        region: r.region,
        students: r.students,
        funded: r.funded,
      })),
    };
  }

  // ── documents surface (Phase 3) ───────────────────────────────

  // Verification results for a student's own documents. Selects explicit
  // columns so a storage path can never leak through this seam.
  async getDocuments(studentId: string): Promise<DocumentSummary[]> {
    const rows = await db()
      .select({
        id: schema.documents.id,
        kind: schema.documents.kind,
        verificationStatus: schema.documents.verificationStatus,
        flags: schema.documents.flags,
        extractedFields: schema.documents.extractedFields,
        createdAt: schema.documents.createdAt,
      })
      .from(schema.documents)
      .where(eq(schema.documents.studentId, studentId))
      .orderBy(desc(schema.documents.createdAt));

    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      verificationStatus: r.verificationStatus,
      flags: r.flags,
      extractedFields: (r.extractedFields as Record<string, unknown> | null) ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
