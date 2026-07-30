# ScholarAI — Full-Stack Production Plan

Goal: convert the current demo (all data from `src/lib/data.ts`, fake auth, deterministic `src/lib/ai-engine.ts`) into a fully functional, deployable product with a real database, real auth, real-time updates, and every feature actually working — while keeping the Editions paper UI and the explainable scoring engine exactly as they are.

## Stack decision (chosen for 1-person build + free-tier deployability)

| Concern | Choice | Why |
|---|---|---|
| Hosting | **Vercel** | Native Next.js 16 App Router support, zero-config deploy |
| Database | **Supabase (Postgres)** | DB + Auth + Realtime + file Storage in one free-tier service — removes 4 integrations |
| ORM | **Drizzle** | Type-safe schema colocated with `src/lib/types.ts` domain types, SQL migrations checked into repo |
| Auth | **Supabase Auth** (email/password) | Sessions via `@supabase/ssr` cookies; roles in a `profiles` table enforced by RLS + Next middleware |
| Real-time | **Supabase Realtime** | Postgres CDC → live application queue, notifications, dashboard counters |
| File storage | **Supabase Storage** | Resume PDFs + verification documents, private buckets, signed URLs |
| Scoring | **Keep `ai-engine.ts` verbatim** | The explainable 10-weight deterministic engine IS the product; it runs server-side on real profile rows |
| Copilot & resume suggestions | **Claude API** (`claude-sonnet-5`), optional | Grounded on the engine's real outputs; falls back to the current deterministic answers if `ANTHROPIC_API_KEY` unset |
| Validation | **Zod** (already a dep) | Shared schemas between forms (`react-hook-form`) and route handlers |

Principle: the app must still run in **demo mode** with zero env vars (current behavior) — production mode activates when Supabase env vars exist. This keeps the project presentable anywhere and deployable for real.

## Database schema (Drizzle → Postgres)

- `profiles` — id (auth.uid FK), role (`student|institution|admin`), name, email, avatar_hue, created_at
- `student_profiles` — profile_id FK, cgpa, attendance, income, field, graduation_year, gender, community, disability, sports, achievements[], research_count, leadership_roles, volunteer_hours, sop_quality, skills[], location
- `institutions` — id, profile_id FK, org_name, verified
- `scholarships` — everything in the current `Scholarship` type (criteria as jsonb), plus `institution_id` owner, `status` (`draft|active|closed`), timestamps. Seeded from `data.ts`.
- `applications` — id, scholarship_id, student_id, status (`draft|submitted|under_review|approved|rejected`), submitted_at, decided_at, decided_by, ai_snapshot jsonb (score components at submit time — the audit trail), rejection_reasons[]
- `documents` — id, application_id/student_id, storage_path, kind (`resume|income_cert|marksheet|id`), verification_status (`pending|verified|flagged`), extracted_fields jsonb, flags[]
- `notifications` — id, profile_id, type, payload jsonb, read_at
- `audit_log` — id, actor_id, action, entity, entity_id, before jsonb, after jsonb, created_at (append-only; institution weight edits, decisions, admin actions)
- `saved_scholarships` — student_id, scholarship_id
- RLS: students see own rows; institutions see applications to their scholarships (verification results, not raw documents); admin sees all. Every policy written + tested.

## Phases (each ends green: `npm run build` + its acceptance checks)

**Phase 0 — Foundation.** Install `@supabase/supabase-js @supabase/ssr drizzle-orm drizzle-kit postgres`; `src/lib/db/` (schema, client, migrations); `src/lib/supabase/` (server/client/middleware helpers); `.env.example`; seed script `npm run db:seed` porting `data.ts` (12 scholarships, demo student, generated applicants as demo rows); a `DataSource` abstraction so every feature reads through one interface with a `demo` (in-memory, current behavior) and `live` (DB) implementation.
✓ Seeded DB queryable; demo mode still works with no env.

**Phase 1 — Auth.** Wire the 3-step register wizard to real sign-up (role → profiles row + student_profiles/institutions row from step-2 fields); login/forgot-password real; middleware protecting `/dashboard/*` by role; header/user chips show the real logged-in user (kill hardcoded "Aarya Sharma"); sign-out.
✓ Register → e-mail login → correct dashboard; wrong-role URL redirects.

**Phase 2 — Student features on real data.** Profile editor page (all engine inputs, zod-validated); dashboard scores computed server-side from the real row via `ai-engine.ts`; scholarships explorer + catalogue read from DB (eligible-only filter uses real profile); **Apply flow**: application row with `ai_snapshot`, statuses, withdraw; deadlines from real data; saved scholarships.
✓ Editing CGPA changes score + matches; submitted application appears in institution queue.

**Phase 3 — Documents & resume analyzer.** Upload to private Storage bucket (type/size validated); resume text extraction (`pdf-parse` or `unpdf`) in a route handler → existing `analyzeResume` for ATS/sections scoring (+ Claude suggestions when key present); verification pipeline for documents: extract fields → compare against profile (income vs declared, name match) → `verified|flagged` with reasons; status streams to the UI.
✓ Real PDF gets a real score; mismatched income cert flags with a stated reason.

**Phase 4 — Institution features.** Ranked applicant queue = real applications joined with student profiles, ranked by the engine; approve/reject persists (status, decided_by, audit_log row, notification to student, rejection_reasons from engine gates); fraud panel = `detectFraud` over real rows + document flags; charts aggregate real SQL (monthly applications, category distribution, region); CSV export; scholarship CRUD for the institution's own programs (criteria editor validated by zod, weight changes audit-logged).
✓ Decision updates the student's dashboard in <2s (realtime); audit row exists.

**Phase 5 — Admin.** User management (list/disable/promote), all-scholarship moderation, platform analytics from real aggregates, audit log viewer, engine registry showing actual `WEIGHTS`.
✓ All admin numbers reconcile with SQL truth.

**Phase 6 — Real-time + notifications.** Supabase Realtime channels: institution queue (new submissions appear live), student application status, notification bell (unread count, mark-read), dashboard counters. One `useRealtime` hook; subscriptions cleaned up; polling fallback in demo mode.
✓ Two browsers: submit in A as student → appears in B's institution queue without refresh; approve in B → A's bell rings.

**Phase 7 — Copilot on real data.** Chat route handler grounding answers in the caller's real rows (score, matches, application statuses, deadlines); Claude tool-use with the engine's outputs when key present, current deterministic intent-matching as fallback; auth-scoped (no cross-user leakage).
✓ "Why was I rejected?" quotes the real application's stored reasons.

**Phase 8 — Hardening.** Loading/empty/error states everywhere (skeleton class exists); zod on every route handler; rate limiting on auth + upload + chat; RLS policy tests; Vitest for engine + critical route handlers; Playwright happy-path (register → apply → approve → notify); a11y pass kept intact.
✓ Test suite green; no route trusts client-supplied identity.

**Phase 9 — Deploy.** Vercel project + envs (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, optional `ANTHROPIC_API_KEY`); migrations via `drizzle-kit` in CI; seed prod with the 12 scholarships + demo accounts (`student@demo.scholarai.app` / `institution@…` / `admin@…`); GitHub Actions: typecheck + test + build on PR; README rewritten with setup + architecture; smoke-test the live URL end-to-end.
✓ Public URL where a stranger can register and complete the full loop.

**Next 16 gotcha (verified in bundled docs):** middleware is renamed — the file is `proxy.ts` at the project root (or `src/proxy.ts`) exporting `function proxy(request: NextRequest)`; `cookies()` from `next/headers` is async (`await cookies()`). Phase 1 must use these conventions, not `middleware.ts`.

**Ordering note:** phases 0–2 are strictly sequential; 3, 4, 5 can interleave after 2; 6 needs 4; 7 needs 2; 8–9 last. Git: repo currently has no proper root — `git init` inside `scholarai/` (or fix the accidental home-dir repo) in Phase 0, commit per phase.

## Env contract

```
NEXT_PUBLIC_SUPABASE_URL=      # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # public anon key (RLS enforced)
SUPABASE_SERVICE_ROLE_KEY=     # server-only: seeds, admin ops
DATABASE_URL=                  # Postgres pooled URL for Drizzle
ANTHROPIC_API_KEY=             # optional: copilot + resume suggestions
```
No vars → demo mode (in-memory seed, fake auth) — must keep working.
