# ScholarAI — Explainable Scholarship Matching

ScholarAI matches students to scholarships with a scoring model you can read. Every number the UI shows — a profile score, a match percentage, a rejection reason — traces back to a published weight in `src/lib/ai-engine.ts`, so a student can see exactly why they placed where they did and an institution gets a ranking it can defend.

Three roles share one platform:

- **Students** complete an academic profile, browse a ranked catalogue with per-program eligibility explanations, upload supporting documents for automated verification, apply, and get notified when a decision lands.
- **Institutions** publish scholarship programs with machine-enforced eligibility criteria, work an AI-ranked applicant queue with fraud signals, and approve or reject with the engine's own reasons attached.
- **Admins** see platform aggregates, the live scoring-weight registry, a filterable audit log, and user role/disable controls.

## Two modes

The app runs in one of two modes, chosen at runtime by which environment variables are present. There is no build flag and no code change between them.

| | Demo mode | Live mode |
|---|---|---|
| **Trigger** | no env vars set | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set (auth), `DATABASE_URL` set (data) |
| **Data** | deterministic seed data from `src/lib/data.ts`, in module memory | Postgres via Drizzle |
| **Auth** | a single seeded student persona is shown; sign-in is demo-only and new accounts are not stored | real Supabase Auth, three roles, RLS-enforced |
| **Writes** | applications persist in memory for the session; institution/admin writes no-op | persisted, audit-logged |
| **Uploads** | unavailable (no storage backend) | private Supabase Storage bucket + verification pipeline |
| **Realtime** | no socket; the notification bell polls | Postgres CDC on `notifications` and `applications` |

The switch lives in `src/lib/env.ts` (`isLiveMode()`, `hasDatabase()`) and is honoured by `getDataSource()` in `src/lib/datasource/index.ts`, which returns either `DemoDataSource` or `LiveDataSource` behind one interface. Delete or comment out your `.env.local` and you are back in demo mode.

Demo mode exists so the product can be judged or demonstrated on any machine with zero setup, keys, or network. It is not a security posture — see `SECURITY.md`.

### Quickstart — demo mode

```bash
npm install
npm run dev
```

Open http://localhost:3000. No env file, no database, no API keys.

You are signed in as the seeded student persona "Aarya Sharma" (`src/lib/auth/session.ts`). Because that persona's role is `student`, the role guard confines demo mode to the student surface: the student dashboard, profile, documents, scholarship explorer, catalogue and resume analyzer. `/dashboard/institution` and `/dashboard/admin` redirect back to the student dashboard, and the sidebar hides them. Seeing those two dashboards requires live mode and the corresponding demo account.

### Quickstart — live mode

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
npm run db:generate            # only if you changed src/lib/db/schema.ts
npm run db:migrate             # apply drizzle/ migrations
psql "$DATABASE_URL" -f supabase/rls.sql        # row level security
psql "$DATABASE_URL" -f supabase/realtime.sql   # optional: live updates
npm run db:seed                # 12 scholarships + 3 demo accounts
npm run verify:deploy          # confirm the target is actually ready
npm run dev
```

`DEPLOYMENT.md` has the full walkthrough, including the Vercel steps and the problems worth knowing about before you hit them.

### Demo accounts (live mode, created by `npm run db:seed`)

| Email | Role |
|---|---|
| `student@demo.scholarai.app` | student |
| `institution@demo.scholarai.app` | institution |
| `admin@demo.scholarai.app` | admin |

Password for all three: `scholarai-demo`

Seeding these accounts requires `SUPABASE_SERVICE_ROLE_KEY`; without it the script seeds scholarships only and says so. Change or delete these accounts before exposing a deployment publicly.

## The scoring model

Ten weighted signals, defined in the `WEIGHTS` array in `src/lib/ai-engine.ts`. The admin dashboard imports that same array rather than restating it, so the registry cannot drift from the engine.

| Signal | Weight | Input |
|---|---|---|
| Academic Performance | 22% | CGPA (80%) + attendance (20%) |
| Financial Need | 18% | family income on a log-need curve |
| Achievements | 12% | awards, hackathons, sports level |
| Research Output | 10% | peer-reviewed publications |
| Leadership | 8% | verified leadership roles |
| Projects & Skills | 8% | projects, certifications, skill count |
| Statement of Purpose | 8% | SOP quality score |
| Community Service | 7% | volunteer hours |
| Recommendations | 4% | aggregate recommender strength |
| Behaviour & Integrity | 3% | institution conduct score |

Weights sum to 1.00. On top of the base score the engine applies hard eligibility gates (CGPA floor, income cap, attendance, research/leadership/sports requirements, location and field restrictions), a category affinity adjustment, and a win-probability estimate that factors in applicants-per-seat.

Gender, minority status and disability are used **only** where a scholarship explicitly targets or prefers those groups — never as a penalty. Every match result carries a `fairnessNote` stating this.

Scores are frozen. When a student submits, the engine's verdict is written into `applications.ai_snapshot` and institutions rank on that snapshot, so a later profile edit cannot retroactively change the basis for a decision.

## Stack

Next.js 16 (App Router, Server Components, server actions) · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres, Storage, Realtime) · Drizzle ORM + drizzle-kit · Zod · GSAP + Lenis + Framer Motion · Recharts · Lucide · Vitest · optional Anthropic SDK for the copilot

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server |
| `npm run build` | production build |
| `npm start` | serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest, single run |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:coverage` | Vitest with v8 coverage |
| `npm run db:generate` | generate a migration from `src/lib/db/schema.ts` |
| `npm run db:migrate` | apply migrations in `drizzle/` |
| `npm run db:seed` | seed 12 scholarships and the 3 demo accounts |
| `npm run verify:deploy` | pass/fail readiness check against a live target |

Tests are pure-logic suites under `src/**/__tests__/` — no DOM, no network, no database (`vitest.config.ts`).

## Environment variables

See `.env.example` for the full contract. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the browser by design; `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` and `ANTHROPIC_API_KEY` are server-only and must never be given a `NEXT_PUBLIC_` prefix.

Without `ANTHROPIC_API_KEY` the copilot and resume suggestions fall back to the deterministic engine — a supported configuration, not a degraded one.

## Accessibility

`prefers-reduced-motion` is respected across the loader, smooth scroll, tilt and cursor effects. Controls are keyboard-navigable and labelled, with ARIA on gauges and dialogs. Animations stay on transform and opacity. Full WCAG conformance would need manual testing with assistive technology and an expert review, which has not been done.

## Further reading

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Vercel + Supabase step by step, and the real problems hit while building this
- [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the DataSource seam, the auth layers, and a traced request lifecycle
- [`SECURITY.md`](./SECURITY.md) — threat model, enforcement layers, and honest limitations
- [`supabase/rls-test.sql`](./supabase/rls-test.sql) — runnable proof that the RLS boundaries hold
