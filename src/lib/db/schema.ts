// ─────────────────────────────────────────────────────────────
// ScholarAI — Drizzle schema (Postgres / Supabase)
// profiles.id mirrors auth.users.id; RLS policies live in
// supabase/rls.sql and must be applied alongside migrations.
// ─────────────────────────────────────────────────────────────

import {
  bigserial,
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["student", "institution", "admin"]);

export const applicationStatusEnum = pgEnum("application_status", [
  "draft",
  "submitted",
  "under_review",
  "approved",
  "rejected",
]);

export const scholarshipStatusEnum = pgEnum("scholarship_status", [
  "draft",
  "active",
  "closed",
]);

export const documentKindEnum = pgEnum("document_kind", [
  "resume",
  "income_cert",
  "marksheet",
  "id",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "verified",
  "flagged",
]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // = auth.users.id
  role: roleEnum("role").notNull().default("student"),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarHue: integer("avatar_hue").notNull().default(258),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentProfiles = pgTable("student_profiles", {
  profileId: uuid("profile_id")
    .primaryKey()
    .references(() => profiles.id, { onDelete: "cascade" }),
  field: text("field").notNull().default(""),
  degree: text("degree").notNull().default(""),
  year: integer("year").notNull().default(1),
  location: text("location").notNull().default(""),
  cgpa: real("cgpa").notNull().default(0),
  attendance: integer("attendance").notNull().default(0),
  familyIncome: integer("family_income").notNull().default(0),
  gender: text("gender").notNull().default("other"),
  minority: boolean("minority").notNull().default(false),
  disability: boolean("disability").notNull().default(false),
  firstGeneration: boolean("first_generation").notNull().default(false),
  achievements: integer("achievements").notNull().default(0),
  researchPapers: integer("research_papers").notNull().default(0),
  hackathons: integer("hackathons").notNull().default(0),
  sportsLevel: integer("sports_level").notNull().default(0),
  certifications: integer("certifications").notNull().default(0),
  leadershipRoles: integer("leadership_roles").notNull().default(0),
  volunteerHours: integer("volunteer_hours").notNull().default(0),
  projects: integer("projects").notNull().default(0),
  skills: text("skills").array().notNull().default([]),
  previousScholarships: integer("previous_scholarships").notNull().default(0),
  behaviourScore: integer("behaviour_score").notNull().default(70),
  sopQuality: integer("sop_quality").notNull().default(50),
  recommendationStrength: integer("recommendation_strength").notNull().default(50),
  profileCompletion: integer("profile_completion").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  orgName: text("org_name").notNull(),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const scholarships = pgTable("scholarships", {
  // Keep human-readable slug ids ("sch-merit-excellence") so existing
  // routes /scholarships/[id] and seed data carry over unchanged.
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  category: text("category").notNull(),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  deadline: text("deadline").notNull(), // ISO date string, matches domain type
  seats: integer("seats").notNull(),
  applicants: integer("applicants").notNull().default(0),
  description: text("description").notNull(),
  criteria: jsonb("criteria").notNull(), // Scholarship["criteria"]
  tags: text("tags").array().notNull().default([]),
  institutionId: uuid("institution_id").references(() => institutions.id, {
    onDelete: "set null",
  }),
  status: scholarshipStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  scholarshipId: text("scholarship_id")
    .notNull()
    .references(() => scholarships.id, { onDelete: "cascade" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  status: applicationStatusEnum("status").notNull().default("draft"),
  // Engine outputs frozen at submit time — the audit trail that keeps
  // "every figure shown twice agrees" true even after profile edits.
  aiSnapshot: jsonb("ai_snapshot"),
  rejectionReasons: text("rejection_reasons").array().notNull().default([]),
  submittedAt: timestamp("submitted_at", { withTimezone: true }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  decidedBy: uuid("decided_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  applicationId: uuid("application_id").references(() => applications.id, {
    onDelete: "set null",
  }),
  storagePath: text("storage_path").notNull(),
  kind: documentKindEnum("kind").notNull(),
  verificationStatus: verificationStatusEnum("verification_status")
    .notNull()
    .default("pending"),
  extractedFields: jsonb("extracted_fields"),
  flags: text("flags").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLog = pgTable("audit_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  actorId: uuid("actor_id").references(() => profiles.id),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  before: jsonb("before"),
  after: jsonb("after"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const savedScholarships = pgTable(
  "saved_scholarships",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    scholarshipId: text("scholarship_id")
      .notNull()
      .references(() => scholarships.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.studentId, t.scholarshipId] })]
);
