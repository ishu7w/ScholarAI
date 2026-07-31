# Architecture

ScholarAI is a Next.js 16 App Router application. Data access, authorization and scoring all run on the server; the client renders and animates. Three design decisions shape everything else:

1. **One data seam.** Every page reads through a `DataSource` interface, so demo mode and live mode are the same application, not two branches.
2. **Authorization is layered and re-derived.** Four independent checks, none of which trusts the one above it.
3. **The engine's verdict is frozen.** Scores that a decision was based on are written to `applications.ai_snapshot` at submit time and never recomputed.

---

## 1. The DataSource abstraction

**Contract:** `src/lib/datasource/index.ts`
**Implementations:** `src/lib/datasource/demo.ts`, `src/lib/datasource/live.ts`

`getDataSource()` returns a `DataSource` chosen at runtime from the environment:

```ts
// src/lib/datasource/index.ts
if (hasDatabase()) {
  const { LiveDataSource } = await import("./live");
  _ds = new LiveDataSource();
} else {
  const { DemoDataSource } = await import("./demo");
  _ds = new DemoDataSource();
}
```

`DemoDataSource` wraps the deterministic seed data in `src/lib/data.ts`, holding applications in a module-level `Map`. `LiveDataSource` queries Postgres through Drizzle. Pages and route handlers call `getDataSource()` and never import `data.ts` or `db/client.ts` directly.

### Why the seam exists

**Demo/live parity.** The product must be judgeable on a laptop with no keys and no network, and it must also run against real Postgres with real users. Without a seam those are two codebases that drift: the demo grows fake behaviour the real app does not have, and the real app grows paths the demo never exercises. With the seam there is exactly one set of pages, one set of components, and one engine. Swapping the implementation swaps where rows come from and nothing else.

**The interface is the honest one.** The contract was written for the live case and demo mode conforms to it, not the reverse. Two consequences visible in the type:

- `InstitutionAggregates` returns empty arrays, not placeholder series. An empty chart means "no rows yet" in both modes.
- `DocumentSummary` deliberately carries no storage path and no URL. Institutions read verification *results*; the file location is not in the shape they can request, so no route can accidentally hand it over.

**Dynamic import.** Both implementations are lazily imported, so demo mode never loads the Drizzle client and cannot crash on a missing `DATABASE_URL`.

### Where demo mode diverges honestly

Writes are the one place the modes cannot match, and they fail loudly rather than pretending:

- `decideApplicationAction` returns `{ ok: true }` and no-ops in demo mode rather than reporting a decision it did not record.
- Uploads return `STORAGE_UNAVAILABLE` with a message naming the missing env vars.
- Institution and admin dashboards are unreachable in demo mode because the demo persona's role is `student` (`src/lib/auth/session.ts`) and the role guard enforces that.

---

## 2. Three (really four) auth layers

Each layer assumes the ones before it may have been bypassed.

### Layer 1 — `src/proxy.ts` (optimistic gate)

Next.js 16 renamed middleware to **proxy**; the file is `src/proxy.ts` exporting `proxy(request)`. It refreshes the Supabase session cookie on every matched request — required, because an expired access token must be exchanged somewhere that can write cookies — then redirects unauthenticated requests for `/dashboard/*` and `/resume-analyzer` to `/login?next=…`.

It checks **presence of a session, not role**. It is a UX gate: it keeps signed-out users from watching a dashboard flash before a redirect. In demo mode (no Supabase env) it returns `NextResponse.next()` immediately.

Deliberately not a security boundary. Proxy runs before the request reaches a route, so it cannot be the only thing standing between a user and someone else's data.

### Layer 2 — segment layouts (role gate)

Each protected segment has a layout that awaits a guard from `src/lib/auth/guard.ts`:

| Layout | Guard |
|---|---|
| `src/app/dashboard/student/layout.tsx` | `requireRole(["student"], …)` |
| `src/app/dashboard/institution/layout.tsx` | `requireRole(["institution"], …)` |
| `src/app/dashboard/admin/layout.tsx` | `requireRole(["admin"], …)` |
| `src/app/resume-analyzer/layout.tsx` | `requireUser(…)` |
| `src/app/scholarships/layout.tsx` | none — public browsing |

`requireRole` reads the session from `getSessionProfile()`, redirects to `/login` when absent, and redirects to the caller's own dashboard when the role is not allowed. Admins may view every segment. The resolved profile is passed into `SessionProvider` so client components read one server-derived identity rather than fetching their own.

This gates *rendering*. It does nothing for a server action, which is a POST endpoint reachable without ever rendering the page.

### Layer 3 — server-side role checks inside every action

Every mutation re-derives the caller's identity and authority from the session. No client-supplied id participates.

`src/lib/applications/actions.ts` — `applyAction` re-reads the session, requires `role === "student"`, and uses `me.id` as the owner. The client names a scholarship, never a student.

`src/lib/institution/actions.ts` — `requireOwnInstitution()` resolves session → the caller's `institutions` row, and never accepts an institution id. `decideApplicationAction` then puts ownership *into the query*:

```ts
.where(and(
  eq(schema.applications.id, applicationId),
  eq(schema.scholarships.institutionId, auth.institutionId)
))
```

A foreign application id returns no row and the action fails. There is no window between "found it" and "checked it".

`src/lib/admin/actions.ts` — `adminOnly()` reads the role from the session's profile row on every call. Its header comment states the reasoning: the page guard is a UX gate, not a security boundary.

`src/lib/documents/actions.ts` and the `/api/documents/upload` route — the owning `userId` always comes from the session, and storage paths are namespaced `${userId}/…`. Size and MIME type are validated server-side against the bytes actually received, not the declared size.

Also at this layer: server-side business truth the client cannot argue with, such as `applyAction` rejecting a passed deadline.

### Layer 4 — Row Level Security

`supabase/rls.sql` enables RLS on all nine tables and adds policies keyed on `auth.uid()`. This is the layer that holds even if application code is wrong, and the only one that constrains a client holding the publishable key directly.

Policies of note:

- `student_profiles` — students read their own row; an institution reads an applicant's row only via an `exists` join proving that student applied to one of its scholarships with `status <> 'draft'`.
- `applications` — `student reads own apps` (`student_id = auth.uid()`), `institution reads apps` (scoped through `my_institution_ids()`, drafts excluded), `admin reads apps`.
- `scholarships` — `anyone reads active` is the one deliberately public read; owners and admins see the rest.
- Helpers `auth_role()` and `my_institution_ids()` are `security definer` so a policy can read `profiles`/`institutions` without recursing into their own policies.

`supabase/rls-test.sql` proves these boundaries by impersonating `anon` and `authenticated` and asserting both directions — that a student reads their own rows *and* cannot read another's — so a pass is never an artifact of reading nothing.

**The service role bypasses all of it,** by design. See `SECURITY.md`.

---

## 3. Where the engine runs, and why verdicts are frozen

`src/lib/ai-engine.ts` is pure, synchronous and dependency-free: `computeAIScore`, `matchScholarship`, `rankScholarships`, `detectFraud`, `generateRoadmap`, `analyzeResume`. No I/O, no randomness, no clock. The same profile always produces the same score, which is what makes it auditable and testable.

Because it is pure it runs wherever the data already is:

- **Server components** — `src/app/dashboard/institution/page.tsx` ranks the queue; `src/app/scholarships/page.tsx` ranks the catalogue.
- **Client components** — `StudentDashboardView` calls `computeAIScore` on the profile the server passed it, so the score ring and its breakdown come from one computation.
- **Server actions** — `applyAction` computes the snapshot at submit time.
- **Route handlers** — `/api/resume/analyze` calls `analyzeResume`; `/api/chat` grounds the copilot in engine output via `buildCopilotContext`.
- **Admin registry** — `AdminDashboardView` imports `WEIGHTS` itself rather than restating the numbers, so the published registry cannot drift from the engine.

### Why `applications.ai_snapshot` exists

The engine reads live profile fields. Students edit their profiles. If institutions ranked on a live recomputation, then a student raising their CGPA after applying would silently rewrite the basis on which their pending application was judged — and an already-decided application would display a score that was never the one anyone acted on.

So at submit time `applyAction` freezes the verdict into the `ai_snapshot` jsonb column: `total`, `confidence`, `matchScore`, `winProbability`, the full weighted `components` array, and `reasons`.

Downstream everything reads the snapshot when one exists:

```ts
// src/app/dashboard/institution/page.tsx
const live = snapshot ? null : computeAIScore(a.student);
// ...
aiTotal: snapshot ? snapshot.total : live!.total,
frozen: snapshot !== null,
```

`computeAIScore` is the fallback only for rows carrying no snapshot — which in practice means demo mode, where `aiSnapshot` is `null`. The UI surfaces `frozen` so a viewer knows which they are looking at.

Rejection reasons follow the same rule. `decideApplicationAction` prefers the `missingCriteria` frozen at submit, recomputing only when nothing was frozen, and records an empty list rather than inventing prose when no gate actually failed.

---

## Module map

```
src/
├─ proxy.ts                      Next 16 proxy: session refresh + optimistic /dashboard gate
├─ app/
│  ├─ page.tsx, layout.tsx       landing
│  ├─ login/, register/, forgot-password/
│  ├─ scholarships/              explorer (public) + /[id] explainability detail
│  ├─ catalogue/                 flat catalogue view
│  ├─ resume-analyzer/           upload/paste → ATS + resume score
│  ├─ dashboard/
│  │  ├─ student/                dashboard, profile/, documents/
│  │  ├─ institution/            queue, scholarships/ (new, [id])
│  │  └─ admin/                  stats, users/, audit/
│  └─ api/
│     ├─ chat/route.ts           copilot (Anthropic, deterministic fallback)
│     ├─ resume/analyze/route.ts
│     └─ documents/upload/route.ts
├─ lib/
│  ├─ ai-engine.ts               WEIGHTS + scoring, matching, fraud, roadmap, resume
│  ├─ data.ts                    12 scholarships, DEMO_STUDENT, generators
│  ├─ types.ts                   domain types
│  ├─ env.ts                     isLiveMode() / hasDatabase() / hasAnthropic()
│  ├─ datasource/                index.ts (contract) · demo.ts · live.ts
│  ├─ db/                        schema.ts (Drizzle) · client.ts (prepare:false)
│  ├─ supabase/                  server.ts (SSR + service role) · client.ts (browser)
│  ├─ auth/                      session.ts · guard.ts · actions.ts
│  ├─ applications/actions.ts    apply, withdraw, save
│  ├─ institution/actions.ts     decisions + scholarship CRUD
│  ├─ admin/actions.ts           aggregates, audit, user management
│  ├─ profile/actions.ts         student profile save
│  ├─ documents/                 actions.ts (storage) · verify.ts (parse + compare)
│  ├─ notifications/actions.ts
│  └─ chat/                      context.ts (grounding) · deterministic.ts (fallback)
├─ hooks/useRealtime.ts          one Supabase Realtime primitive → router.refresh()
└─ components/                   ui/ · layout/ · landing/ · effects/ · chat/ · providers/

drizzle/                         generated migrations
supabase/                        rls.sql · realtime.sql · rls-test.sql
scripts/                         seed.ts · verify-deploy.ts
```

**Nine tables** (`src/lib/db/schema.ts`): `profiles` (id mirrors `auth.users.id`), `student_profiles`, `institutions`, `scholarships` (human-readable slug ids), `applications`, `documents`, `notifications`, `audit_log`, `saved_scholarships`.

`src/lib/db/client.ts` is a lazy singleton passing `prepare: false` — required by Supabase's transaction-mode pooler, explained in `DEPLOYMENT.md`. Lazy so importing the module never crashes in demo mode.

---

## Traced request lifecycle

One loop end to end: a student applies, an institution decides, the student is notified.

### A. Student applies

1. **`POST /scholarships/sch-merit-excellence`** — the detail page's apply control invokes the `applyAction` server action with only a scholarship id.
2. **`src/proxy.ts`** refreshes the session cookie. The path is not under `/dashboard`, so no redirect.
3. **`applyAction`** (`src/lib/applications/actions.ts`) calls `getSessionProfile()`, which reads the Supabase user and joins `profiles` for the role. Not a student → refused. The caller is `me.id`; the client never named a student.
4. **`getDataSource()`** → `LiveDataSource`. Three reads in parallel: the scholarship, the student's own profile, any existing application.
5. **Business gates:** unknown scholarship, missing profile, an existing non-draft application, or a passed deadline each return `{ ok: false, error }`.
6. **Engine, server-side:** `computeAIScore(profile)` and `matchScholarship(profile, scholarship)` build the snapshot — totals, components, reasons.
7. **Writes,** RLS-checked (`student creates own app` requires `student_id = auth.uid()`):
   - insert `applications` with `status: "submitted"`, `ai_snapshot`, and `rejection_reasons` set to `missingCriteria` when the student was ineligible;
   - increment `scholarships.applicants` so the public counter stays honest;
   - insert `audit_log` `application.submitted`.
8. **`revalidatePath`** for `/dashboard/student`, `/scholarships` and the detail route.

### B. Institution decides

9. **`GET /dashboard/institution`** — `src/app/dashboard/institution/layout.tsx` runs `requireRole(["institution"], …)`. A student here is redirected to their own dashboard.
10. **`page.tsx`** resolves session → `getInstitutionForProfile(me.id)` → `getInstitutionApplicants(institution.id)`. No institution row → `NoInstitutionNotice`.
11. **Ranking** uses `a.aiSnapshot` — the frozen basis. `computeAIScore` runs only for snapshot-less rows. `detectFraud(a.student)` adds signals; `frozen` is passed to the UI.
12. **`useRealtime("applications", …)`** in `InstitutionDashboardView` subscribes to CDC and reacts with `router.refresh()`, so new submissions appear without a client-side re-query. No-ops in demo mode.
13. **`decideApplicationAction`** on approve/reject: Zod-parse the input → `requireOwnInstitution()` → validate the id is a UUID before it reaches a uuid column → the ownership-joined query above. A foreign id yields no row.
14. **Already decided** → refused, so a decision cannot be overwritten.
15. **Reasons** come from the frozen `rejectionReasons`, recomputed only if empty, left empty rather than invented for a discretionary rejection.
16. **Writes:** update `applications` (`status`, `decided_at`, `decided_by`, `rejection_reasons`); insert `audit_log` `application.approved`/`application.rejected` with before/after; insert `notifications` for `row.app.studentId`.
17. **`revalidatePath`** for the institution surface and `/dashboard/student`.

### C. Student is notified

18. **Realtime:** the `notifications` insert is published to `supabase_realtime` (once `supabase/realtime.sql` is applied) and delivered only to that student — Realtime authorises each row against the subscriber's JWT using the `own notifications` policy (`profile_id = auth.uid()`). The client-side `filter:` string is bandwidth optimisation, not the boundary.
19. **`NotificationBell`** also polls `getMyNotifications()` every 30s, which scopes to the session profile server-side. So the loop closes even without realtime, just slower.
20. **Student dashboard:** `useRealtime("applications", "student_id=eq.<id>")` triggers `router.refresh()`, and the server component re-reads the status. The badge comes from the server's query, never a client-side guess.
21. **Displayed score** is still the snapshot from step 6 — the number the institution actually acted on, unchanged even if the student has since edited their profile.
