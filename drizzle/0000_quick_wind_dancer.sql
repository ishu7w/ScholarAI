CREATE TYPE "public"."application_status" AS ENUM('draft', 'submitted', 'under_review', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('resume', 'income_cert', 'marksheet', 'id');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('student', 'institution', 'admin');--> statement-breakpoint
CREATE TYPE "public"."scholarship_status" AS ENUM('draft', 'active', 'closed');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('pending', 'verified', 'flagged');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scholarship_id" text NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'draft' NOT NULL,
	"ai_snapshot" jsonb,
	"rejection_reasons" text[] DEFAULT '{}' NOT NULL,
	"submitted_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"actor_id" uuid,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"application_id" uuid,
	"storage_path" text NOT NULL,
	"kind" "document_kind" NOT NULL,
	"verification_status" "verification_status" DEFAULT 'pending' NOT NULL,
	"extracted_fields" jsonb,
	"flags" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"org_name" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "role" DEFAULT 'student' NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"avatar_hue" integer DEFAULT 258 NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "saved_scholarships" (
	"student_id" uuid NOT NULL,
	"scholarship_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "saved_scholarships_student_id_scholarship_id_pk" PRIMARY KEY("student_id","scholarship_id")
);
--> statement-breakpoint
CREATE TABLE "scholarships" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"provider" text NOT NULL,
	"category" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"deadline" text NOT NULL,
	"seats" integer NOT NULL,
	"applicants" integer DEFAULT 0 NOT NULL,
	"description" text NOT NULL,
	"criteria" jsonb NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"institution_id" uuid,
	"status" "scholarship_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"profile_id" uuid PRIMARY KEY NOT NULL,
	"field" text DEFAULT '' NOT NULL,
	"degree" text DEFAULT '' NOT NULL,
	"year" integer DEFAULT 1 NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"cgpa" real DEFAULT 0 NOT NULL,
	"attendance" integer DEFAULT 0 NOT NULL,
	"family_income" integer DEFAULT 0 NOT NULL,
	"gender" text DEFAULT 'other' NOT NULL,
	"minority" boolean DEFAULT false NOT NULL,
	"disability" boolean DEFAULT false NOT NULL,
	"first_generation" boolean DEFAULT false NOT NULL,
	"achievements" integer DEFAULT 0 NOT NULL,
	"research_papers" integer DEFAULT 0 NOT NULL,
	"hackathons" integer DEFAULT 0 NOT NULL,
	"sports_level" integer DEFAULT 0 NOT NULL,
	"certifications" integer DEFAULT 0 NOT NULL,
	"leadership_roles" integer DEFAULT 0 NOT NULL,
	"volunteer_hours" integer DEFAULT 0 NOT NULL,
	"projects" integer DEFAULT 0 NOT NULL,
	"skills" text[] DEFAULT '{}' NOT NULL,
	"previous_scholarships" integer DEFAULT 0 NOT NULL,
	"behaviour_score" integer DEFAULT 70 NOT NULL,
	"sop_quality" integer DEFAULT 50 NOT NULL,
	"recommendation_strength" integer DEFAULT 50 NOT NULL,
	"profile_completion" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_decided_by_profiles_id_fk" FOREIGN KEY ("decided_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutions" ADD CONSTRAINT "institutions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_scholarships" ADD CONSTRAINT "saved_scholarships_student_id_profiles_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_scholarships" ADD CONSTRAINT "saved_scholarships_scholarship_id_scholarships_id_fk" FOREIGN KEY ("scholarship_id") REFERENCES "public"."scholarships"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;