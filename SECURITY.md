# Security

Threat model and enforcement for ScholarAI specifically. Generic advice is omitted; everything below refers to code in this repository.

---

## What is worth protecting

ScholarAI holds the kind of data a student would not want a classmate, a stranger, or an institution they never applied to reading.

**Financial data.** `student_profiles.family_income` is a declared annual household income, and it is not incidental — it drives 18% of the score through the Financial Need weight. `documents` of kind `income_cert` are income certificates naming real figures, and `documents.extracted_fields` holds parsed amounts read out of them.

**Academic records.** `cgpa`, `attendance`, `behaviour_score` (an institutional conduct score), `sop_quality`, `recommendation_strength`. Uploaded marksheets carry the underlying transcript.

**Demographic and protected-class data.** `gender`, `minority`, `disability`, `first_generation`. These exist because inclusion-targeted scholarships require them, but they are exactly the fields that make a leak harmful rather than embarrassing. The engine uses them only as inclusion preferences on programs that explicitly target those groups, never as penalties (`fairnessNote` on every `MatchResult`), but that is a fairness property, not a confidentiality one.

**Uploaded documents.** Marksheets, income certificates and identity documents in a private Supabase Storage bucket, namespaced `${userId}/…`.

**Decision records.** `applications.ai_snapshot` (the frozen score a decision was based on), `rejection_reasons`, and `audit_log` — who did what to whom and when.

### Adversaries

1. **A curious or malicious student** — the most likely one. Wants to see a competitor's score, income or documents, or to change their own record after applying. Authenticated, holds a valid session, can call server actions directly without the UI.
2. **An institution reaching beyond its own programs** — wants applicants who applied elsewhere, or wants to decide an application that is not theirs. Also authenticated, with a legitimately broader role.
3. **An unauthenticated internet client** — holds the publishable key, because it ships to every browser. Can talk to Supabase's REST API directly, bypassing the app entirely.
4. **Someone who obtains the service-role key** — total compromise. Every control below is bypassed. See [The service-role key](#the-service-role-key).

---

## Enforcement layers

Four layers, described in full in `ARCHITECTURE.md`. Their security-relevant properties:

**`src/proxy.ts`** — refreshes the session cookie, redirects unauthenticated `/dashboard/*` and `/resume-analyzer` requests to `/login`. Checks session presence, not role. **Not a security boundary** — it runs before a route is reached and cannot be the only thing between a user and someone else's data.

**Segment layouts** — `requireRole()` in `src/lib/auth/guard.ts` gates rendering per segment. Also not sufficient alone: a server action is a POST endpoint reachable without rendering the page that would have called it.

**Server-side checks in every action** — the real application-layer boundary. Properties that matter against adversaries 1 and 2:

- The acting identity always comes from `getSessionProfile()`. No client-supplied user id is ever trusted. `applyAction` uses `me.id` as the owner; the upload route passes `userId: me.id` with the comment that the client cannot choose an owner; `buildCopilotContext(me)` grounds the copilot in the caller's own rows so one student can never ask the assistant about another.
- Ownership is re-derived, never accepted. `requireOwnInstitution()` resolves session → the caller's `institutions` row and refuses to take an institution id as input.
- Ownership is enforced *inside the query*, not after it, so there is no check-then-use window:
  ```ts
  // src/lib/institution/actions.ts
  .where(and(
    eq(schema.applications.id, applicationId),
    eq(schema.scholarships.institutionId, auth.institutionId)
  ))
  ```
  A foreign application id returns no row.
- Role is re-read per call, not cached from the page. `adminOnly()` in `src/lib/admin/actions.ts` reads it from the session's profile row every time, noting that the page guard is a UX gate.
- Input is Zod-parsed at every action and route boundary. `decideApplicationAction` additionally checks `UUID_RE` before an id reaches a uuid column.
- State transitions are guarded: an already-decided application cannot be re-decided or withdrawn; a passed deadline is refused server-side; a disabled account is signed out at login.
- Uploads validate size and MIME server-side against the bytes actually received, not the declared size or the client's `accept` attribute.

**Row Level Security** — `supabase/rls.sql`, the only layer that constrains adversary 3, who can skip the application entirely and query Supabase's API with the publishable key. Enabled on all nine tables, keyed on `auth.uid()`. Institutions reach an applicant's academic row only through an `exists` join proving that student applied to one of their scholarships with `status <> 'draft'`, so drafts are invisible to everyone but their author. `scholarships` with `status = 'active'` is the one deliberately public read.

Realtime inherits this: adding a table to the `supabase_realtime` publication makes changes *available*, not authorised. Realtime evaluates the SELECT policies per row against the subscriber's JWT. The client-side `filter:` strings are bandwidth optimisation, not the boundary — which also means **loosening an RLS SELECT policy widens what realtime broadcasts.**

`supabase/rls-test.sql` asserts these boundaries by impersonating `anon` and `authenticated`, and tests both directions — that a student reads their own rows *and* cannot read another's — so a green run is never an artifact of reading nothing at all. It includes positive controls for the same reason.

**Documents get a fifth control.** The `DocumentSummary` type in `src/lib/datasource/index.ts` has no `storagePath` and no URL field. Institutions read verification *results*; the file location is not in the shape they can request, so no route can leak it by accident. Files sit in a private bucket created with `public: false`.

---

## The service-role key

`SUPABASE_SERVICE_ROLE_KEY` **bypasses every RLS policy in this repository.** It is the highest-value secret the system has.

Obtained through `getSupabaseAdmin()` in `src/lib/supabase/server.ts`, whose comment reads: *NEVER import from client components.* Used in exactly four places:

| Where | What it does |
|---|---|
| `src/lib/documents/actions.ts` | creates the private `documents` bucket, uploads and deletes objects — bucket creation is not an anon-key operation |
| `src/lib/auth/actions.ts` | creates users pre-confirmed at sign-up, so registration flows into a session without an email round trip |
| `scripts/seed.ts` | creates the three demo auth accounts |
| profile-row creation during sign-up | inserts `profiles`/`student_profiles`/`institutions` at a moment when the client has no confirmed session and RLS would block it |

Because it ignores RLS, **every function using it must do its own authorization first.** They do: the upload route checks session and role before reaching storage, and the storage path is derived from the session id. But the property is maintained by hand, and it is the thing to check first in review.

Operationally: server-only, never a `NEXT_PUBLIC_` prefix, never in a client component, never committed (`.env*` is gitignored). Rotate it immediately if exposed. `npm run verify:deploy` reports which variables are server-only, but it cannot detect a mis-prefixed one on a hosting provider.

`DATABASE_URL` deserves the same handling — a direct Postgres connection is not subject to RLS either, and the app's own queries run through it.

---

## Known limitations

Honest list. None of these is hypothetical.

**Rate limiting exists on auth only, and it is per-instance.** `src/lib/rate-limit.ts` is an in-memory sliding-window limiter wired into the three auth actions in `src/lib/auth/actions.ts`: sign-in 8 attempts / 15 min, sign-up 5 / hour, password reset 3 / hour — all keyed on the normalized email and checked before the live-mode branch, so demo and live enforce the same ceiling. The shared throttle message names only the cooldown, never whether the account exists.

Two real gaps remain. **The API routes are unlimited**: `/api/chat` forwards to the Anthropic API as fast as an authenticated caller sends requests (a billing exposure as well as an availability one), and `/api/documents/upload` and `/api/resume/analyze` run PDF text extraction per request, making them the most expensive endpoints to hammer. All three require a session, which raises the cost of abuse without bounding it — one authenticated account suffices.

**And the limiter is not distributed.** Vercel runs each serverless invocation in its own isolate, so a per-process `Map` gives every instance its own counter and the effective limit becomes *N × configured*, silently. The auth limits above are therefore a speed bump against casual credential stuffing, not a guarantee. Distributed state (Upstash Redis, Supabase, or Vercel edge config) is required for a limit that means anything under load — and for covering the API routes.

**No OCR — scanned documents stay `pending` forever.** `extractDocumentText` in `src/lib/documents/verify.ts` reads a PDF text layer and decodes plain text; PNG and JPEG uploads are accepted but yield no text. The pipeline then marks the document `pending` with a flag saying nothing could be extracted. This is the right failure — a document that could not be read is never reported as verified — but it means a student who photographs their marksheet, as many will, is stuck with no in-app path forward. There is no manual review queue.

**Verification is heuristic even when text is present.** Income and CGPA are regex-parsed and compared to declared values within tolerances (20% for income, 0.2 CGPA points). A well-formed forged PDF passes. `verified` means "the numbers in this file are consistent with what was declared", not "this document is authentic".

**Fraud detection is heuristic and visible to institutions.** `detectFraud` flags statistical oddities (high CGPA with low attendance, low income with many paid certifications). These are review prompts, not findings, and they are trivially avoidable by anyone who reads `src/lib/ai-engine.ts` — which is open source.

**Demo mode admits a seeded persona at zero env.** With no environment variables, `getSessionProfile()` returns `DEMO_SESSION` unconditionally: everyone is signed in as "Aarya Sharma" with role `student`, no credentials required, and `signInAction` returns success for any input. This is deliberate — the product must be demonstrable with zero setup — and the blast radius is bounded: demo data is entirely synthetic (`src/lib/data.ts`), applications live in module memory, institution and admin writes no-op, uploads are unavailable, and the role guard keeps the persona out of `/dashboard/institution` and `/dashboard/admin`.

The risk is a **partial** configuration. `isLiveMode()` requires both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`; if either is missing or empty at build time, the app silently serves demo mode with no error. A deployment that appears to have a database but fails that check bypasses authentication for every visitor. Set all four variables or none, and confirm with `npm run verify:deploy` — plus the `/login` smoke check in `DEPLOYMENT.md`, which distinguishes real auth from simulated.

One more demo-mode note: `adminOnly()` returns the demo persona when neither Supabase nor a database is configured, so demo aggregates are readable. Every write it guards still no-ops, and as soon as Supabase is configured only a real admin passes.

**Seeded demo credentials are publicly documented.** `student@demo.scholarai.app` / `institution@demo.scholarai.app` / `admin@demo.scholarai.app`, password `scholarai-demo`, created by `npm run db:seed` — including a live **admin** account. Delete or re-password them before any deployment real users can reach.

**Documents are stored unencrypted at rest beyond Supabase's own disk encryption.** No application-level encryption of income certificates or identity documents. There is no retention policy and no automatic deletion; a document persists until the owning student deletes it or the profile cascade removes it.

**No CSRF token beyond framework defaults.** Server actions rely on Next.js's built-in protections. No additional origin checks were added.

**Audit coverage is partial.** `audit_log` records application submits/withdrawals, decisions, scholarship creation and criteria changes, and admin role/disable actions. It does **not** record reads. There is no way to tell after the fact whether an institution viewed an applicant's income.

**Not assessed.** No penetration test, no dependency audit in CI, no automated security scanning, no formal WCAG conformance review. Test coverage is one Vitest suite (`src/lib/documents/__tests__/probe.test.ts`); `supabase/rls-test.sql` is the only authorization test and it is run manually.

---

## Reporting a vulnerability

Please report privately rather than opening a public issue.

**Contact:** `security@example.com` *(placeholder — replace before this project accepts real users, along with a PGP key or a private reporting channel such as GitHub Security Advisories)*

Include reproduction steps, affected files or endpoints, and impact. We aim to acknowledge within 72 hours. Please do not test against a deployment holding other people's data — stand up your own Supabase project per `DEPLOYMENT.md`, or use demo mode.
