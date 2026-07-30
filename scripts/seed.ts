// ─────────────────────────────────────────────────────────────
// Seed: ports the deterministic demo data into Postgres.
//   npm run db:seed
// Requires DATABASE_URL. If SUPABASE service-role env is also set,
// creates the three demo auth accounts (idempotent).
// ─────────────────────────────────────────────────────────────

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { createClient } from "@supabase/supabase-js";
import * as schema from "../src/lib/db/schema";
import { DEMO_STUDENT, SCHOLARSHIPS } from "../src/lib/data";

const DEMO_ACCOUNTS = [
  { email: "student@demo.scholarai.app", role: "student" as const, name: DEMO_STUDENT.name },
  { email: "institution@demo.scholarai.app", role: "institution" as const, name: "State University" },
  { email: "admin@demo.scholarai.app", role: "admin" as const, name: "Platform Admin" },
];
const DEMO_PASSWORD = "scholarai-demo";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set — nothing to seed. (Demo mode needs no seeding.)");
    process.exit(1);
  }

  const client = postgres(url, { prepare: false, max: 1 });
  const db = drizzle(client, { schema });

  // 1. Scholarships (upsert by slug id)
  for (const s of SCHOLARSHIPS) {
    await db
      .insert(schema.scholarships)
      .values({
        id: s.id,
        name: s.name,
        provider: s.provider,
        category: s.category,
        amount: s.amount,
        currency: s.currency,
        deadline: s.deadline,
        seats: s.seats,
        applicants: s.applicants,
        description: s.description,
        criteria: s.criteria,
        tags: s.tags,
        status: "active",
      })
      .onConflictDoUpdate({
        target: schema.scholarships.id,
        set: {
          name: s.name,
          provider: s.provider,
          category: s.category,
          amount: s.amount,
          currency: s.currency,
          deadline: s.deadline,
          seats: s.seats,
          applicants: s.applicants,
          description: s.description,
          criteria: s.criteria,
          tags: s.tags,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`✓ ${SCHOLARSHIPS.length} scholarships seeded`);

  // 2. Demo auth accounts (only when service role available)
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceKey) {
    console.log("· Skipping demo auth accounts (SUPABASE service-role env not set)");
  } else {
    const admin = createClient(supaUrl, serviceKey, { auth: { persistSession: false } });

    for (const acct of DEMO_ACCOUNTS) {
      // Idempotent: find existing user by email, else create.
      const { data: list } = await admin.auth.admin.listUsers();
      let user = list?.users.find((u) => u.email === acct.email);
      if (!user) {
        const { data, error } = await admin.auth.admin.createUser({
          email: acct.email,
          password: DEMO_PASSWORD,
          email_confirm: true,
        });
        if (error) throw error;
        user = data.user!;
      }

      await db
        .insert(schema.profiles)
        .values({ id: user.id, role: acct.role, name: acct.name, email: acct.email })
        .onConflictDoNothing();

      if (acct.role === "student") {
        const d = DEMO_STUDENT;
        await db
          .insert(schema.studentProfiles)
          .values({
            profileId: user.id,
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
            skills: d.skills,
            previousScholarships: d.previousScholarships,
            behaviourScore: d.behaviourScore,
            sopQuality: d.sopQuality,
            recommendationStrength: d.recommendationStrength,
            profileCompletion: d.profileCompletion,
          })
          .onConflictDoNothing();
      }
      if (acct.role === "institution") {
        const existing = await db
          .select()
          .from(schema.institutions)
          .limit(1);
        if (existing.length === 0) {
          await db.insert(schema.institutions).values({
            profileId: user.id,
            orgName: acct.name,
            verified: true,
          });
        }
      }
      console.log(`✓ ${acct.role}: ${acct.email} (password: ${DEMO_PASSWORD})`);
    }
  }

  await client.end();
  console.log("Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
